/**
 * HỌC VNWATCH — docker/verify-share.cjs
 * Kiểm tra địa chỉ chia sẻ và các giới hạn truy cập khi chế độ chia sẻ được bật có chủ đích.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const { chromium, expect } = require(path.join(root, "outputs/vnwatch-frontend/node_modules/@playwright/test"));
const origin = process.argv[2] || "http://127.0.0.1:5181";
const url = new URL(origin);
if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "127.0.0.1" && url.port === "5181")) throw new Error("Expected the preview origin.");
async function fetchPreview(route, method = "GET") {
  return fetch(origin + route, { method, signal: AbortSignal.timeout(20000), ...(method === "POST" ? { headers: { "Content-Type": "application/json" }, body: "{}" } : {}) });
}
(async () => {
  const htmlResponse = await fetchPreview("/");
  assert.equal(htmlResponse.status, 200);
  const html = await htmlResponse.text();
  assert.ok(html.includes("Bản xem thử công khai"));
  const catalogResponse = await fetchPreview("/api/v1/products?dataKind=REFERENCE&limit=10");
  assert.equal(catalogResponse.status, 200);
  const catalog = await catalogResponse.json();
  assert.ok(catalog.data.length > 0);
  const id = catalog.data[0].id;
  assert.equal((await fetchPreview("/api/v1/products/" + id)).status, 200);
  assert.equal((await fetchPreview("/api/v1/shop/reviews/" + id)).status, 200);
  const blocked = [
    ["GET", "/admin"], ["GET", "/admin/"], ["GET", "/docs"], ["GET", "/docs-json"],
    ["GET", "/api/v1/users"], ["GET", "/api/v1/orders"], ["GET", "/api/v1/management/reports"],
    ["POST", "/api/v1/auth/admin/login"], ["POST", "/api/v1/auth/login"],
    ["POST", "/api/v1/auth/register"], ["POST", "/api/v1/orders"],
    ["POST", "/api/v1/assistant/chat"], ["POST", "/api/v1/products"],
    ["GET", "/api/v1/products/" + id + "/extra"],
    ["GET", "/assets/%2e%2e/api/v1/users"],
    ["GET", "/api/v1/products%2f..%2fmanagement%2freports"],
  ];
  for (const [method, route] of blocked) {
    const response = await fetchPreview(route, method);
    assert.equal(response.status, 403, method + " " + route);
    assert.equal((await response.json()).code, "PREVIEW_READ_ONLY");
  }
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", headless: true,
  });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/VNWATCH · Bản xem thử công khai/)).toBeVisible();
    const product = page.getByRole("button", { name: "Xem Casio AE-1200WHD-1AV", exact: true });
    await expect(product).toBeVisible();
    await product.click();
    await expect(page.getByRole("button", { name: "Thêm vào giỏ hàng", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.screenshot({ path: path.join(root, "docker/verification/share-desktop.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(product).toBeVisible();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(root, "docker/verification/share-mobile.png") });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
  const result = { checkedAt: new Date().toISOString(), origin, catalogAndDetails: true, blockedRoutes: blocked.length, desktopAndMobile: true, runtimeErrors: errors };
  await fs.writeFile(path.join(root, "docker/verification/share.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
})().catch(e => { console.error(e.message); process.exitCode = 1; });
