/**
 * HỌC VNWATCH — docker/verify-manager-installed.cjs
 * Kiểm tra file exe đã cài: React đóng gói, sandbox, đăng nhập admin, xem catalog và đăng xuất.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const { _electron: electron } = require(path.join(root, "outputs/vnwatch-frontend/node_modules/playwright"));
const { expect } = require(path.join(root, "outputs/vnwatch-frontend/node_modules/@playwright/test"));
(async () => {
  const credentials = { email: process.env.VNWATCH_MANAGER_EMAIL, password: process.env.VNWATCH_MANAGER_PASSWORD };
  if (!credentials.email || !credentials.password) throw new Error("Set temporary test credentials in environment variables.");
  const env = { ...process.env };
  delete env.VNWATCH_MANAGER_EMAIL; delete env.VNWATCH_MANAGER_PASSWORD;
  const application = await electron.launch({ executablePath: path.join(root, "apps/VNWatchManager/VNWatch Manager.exe"), args: [], env, timeout: 30000 });
  const errors = [];
  try {
    const page = await application.firstWindow();
    page.on("pageerror", e => errors.push(e.message));
    await expect(page.getByText("Đã kết nối dữ liệu cửa hàng", { exact: true })).toBeVisible({ timeout: 90000 });
    const preferences = await application.evaluate(({ app, BrowserWindow }) => ({
      packaged: app.isPackaged,
      prefs: BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences(),
      devToolsOpened: BrowserWindow.getAllWindows()[0].webContents.isDevToolsOpened(),
    }));
    assert.equal(preferences.packaged, true);
    assert.equal(preferences.prefs.nodeIntegration, false);
    assert.equal(preferences.prefs.contextIsolation, true);
    assert.equal(preferences.prefs.sandbox, true);
    assert.equal(preferences.devToolsOpened, false);
    assert.equal(await page.evaluate(() => typeof window.require), "undefined");
    await page.getByLabel("Email quản trị", { exact: true }).fill(credentials.email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(credentials.password);
    await page.getByRole("button", { name: "Đăng nhập quản trị", exact: true }).click();
    await expect(page.locator(".stat-link")).toHaveCount(6);
    await page.getByRole("button", { name: /^Mẫu sản phẩm / }).click();
    await expect(page.getByRole("heading", { name: "Danh mục sản phẩm", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Chỉnh sửa / }).first()).toBeVisible();
    await page.getByRole("navigation", { name: "Quản trị" }).getByRole("button", { name: /Tổng quan/ }).click();
    await expect(page.locator(".stat-link")).toHaveCount(6);
    await page.screenshot({ path: path.join(root, "docker/verification/manager-installed.png") });
    await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Đăng nhập quản trị", exact: true })).toBeVisible();
    assert.deepEqual(errors, []);
    const result = { checkedAt: new Date().toISOString(), installed: true, packagedUi: page.url().startsWith("vnwatch-admin://app/"), loginAndCatalog: true, sandbox: true, isolated: true, nodeIntegration: false, runtimeErrors: errors };
    await fs.writeFile(path.join(root, "docker/verification/manager-installed.json"), JSON.stringify(result, null, 2) + "\n");
    console.log(JSON.stringify(result));
  } finally { await application.close(); }
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
