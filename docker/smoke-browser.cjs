/**
 * HỌC VNWATCH — docker/smoke-browser.cjs
 * Kiểm tra nhanh cửa hàng trong trình duyệt: catalog, đăng nhập bắt buộc, trợ lý và màn hình nhỏ.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const sourceRoot = process.argv[2] || path.resolve(__dirname, "..");
const { chromium, expect } = require(
  path.join(
    sourceRoot,
    "outputs/vnwatch-frontend/node_modules/@playwright/test",
  ),
);
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:5180/");
    const product = page.getByRole("button", {
      name: "Xem Casio AE-1200WHD-1AV",
      exact: true,
    });
    await expect(product).toBeVisible();
    await product.click();
    await expect(
      page.getByRole("button", { name: "Thêm vào giỏ hàng", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Thêm vào giỏ hàng", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Chào mừng trở lại" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Đóng", exact: true }).click();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Mở trợ lý tư vấn", exact: true })
      .click();
    await page
      .getByPlaceholder("Ví dụ: đồng hồ tự động dưới 10 triệu…")
      .fill("Casio dưới 2 triệu");
    await page
      .getByRole("button", { name: "Gửi câu hỏi", exact: true })
      .click();
    await expect(
      page.getByText("Tư vấn theo dữ liệu", { exact: true }),
    ).toBeVisible();
    const folder = path.join(
      path.resolve(__dirname, ".."),
      "docker/verification",
    );
    await fs.mkdir(folder, { recursive: true });
    await page.screenshot({ path: path.join(folder, "docker-desktop.png") });
    await page.getByRole("button", { name: "Đóng", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://127.0.0.1:5180/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: path.join(folder, "docker-mobile.png"),
      fullPage: false,
    });
    assert.deepEqual(errors, []);
    const result = {
      catalogRendered: true,
      guestCartRequiresLogin: true,
      assistantMode: "CATALOG",
      mobileOverflow: false,
      runtimeErrors: errors,
    };
    await fs.writeFile(
      path.join(folder, "browser.json"),
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
