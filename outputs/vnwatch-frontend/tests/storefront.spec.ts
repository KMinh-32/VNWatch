/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/tests/storefront.spec.ts
 * Kiểm thử tự động. Kiểm thử cửa hàng trên desktop/mobile, tìm/lọc, thông tin mẫu và trạng thái guest. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/** Mở và thao tác hộp đăng nhập trong kiểm thử trình duyệt. */
async function loginDialog(page: Page, email: string, password: string) {
  const dialog = page.getByRole("dialog", { name: "Chào mừng trở lại" });
  await dialog.getByLabel("Email", { exact: true }).fill(email);
  await dialog.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await dialog.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

test("catalog: live filters, no results, reset and available variant", async ({
  page,
}) => {
  await page.goto("/?catalog=demo");
  await expect(
    page.getByRole("button", { name: "Xem DEMO Everyday", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Khoảng giá").selectOption("0:2000000");
  await expect(page.getByText("1 thiết kế", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Xem DEMO Automatic", exact: true }),
  ).toHaveCount(0);
  await page
    .getByPlaceholder("Tên đồng hồ, thương hiệu…")
    .fill("no-such-watch");
  await expect(page.getByText("Chưa tìm thấy thiết kế phù hợp")).toBeVisible();
  await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
  await expect(page.getByText("2 thiết kế", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Xem DEMO Automatic", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Thêm vào giỏ hàng" }),
  ).toBeEnabled();
  await expect(page.getByRole("dialog").locator(".price.large")).toContainText(
    "4.000.000",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("cart: require login, preserve chosen SKU, gate persisted cart after reload", async ({
  page,
  request,
}) => {
  const email = `cart.e2e.${Date.now()}@example.test`;
  const password = "VNWatch cart login test 2026!";
  expect(
    (
      await request.post("/api/v1/auth/register", {
        data: { email, password, displayName: "Cart Test" },
      })
    ).status(),
  ).toBe(201);
  const readLogin = await request.post("/api/v1/auth/login", {
    data: { email, password },
  });
  expect(readLogin.status()).toBe(200);
  const readToken = (await readLogin.json()).sessionToken as string;
  await page.goto("/?catalog=demo");
  await page
    .getByRole("button", { name: "Xem DEMO Everyday", exact: true })
    .click();
  await page
    .getByLabel("Phiên bản")
    .selectOption("20000000-0000-4000-8000-000000000002");
  await page.getByRole("button", { name: "Thêm vào giỏ hàng" }).click();
  await expect(
    page.getByRole("dialog", { name: "Chào mừng trở lại" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("vnwatch.cart.v1")!),
    ),
  ).toBeNull();
  expect(
    (
      await request.get("/api/v1/shop/cart", {
        headers: { Authorization: `Bearer ${readToken}` },
      })
    ).status(),
  ).toBe(200);
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await expect(page.getByLabel("Phiên bản")).toHaveValue(
    "20000000-0000-4000-8000-000000000002",
  );
  await page.getByRole("button", { name: "Thêm vào giỏ hàng" }).click();
  await loginDialog(page, email, password);
  await expect(page.getByLabel("Phiên bản")).toHaveValue(
    "20000000-0000-4000-8000-000000000002",
  );
  await expect(
    page.getByRole("button", { name: "Mở giỏ hàng, 0 sản phẩm" }),
  ).toBeAttached();
  await page.getByRole("button", { name: "Thêm vào giỏ hàng" }).click();
  await expect(
    page.getByText(
      "Đã thêm vào giỏ hàng. Đóng chi tiết để xem giỏ hàng của bạn.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Mở giỏ hàng, 0 sản phẩm" }).click();
  await expect(page.getByRole("dialog", { name: "Giỏ hàng" })).toHaveCount(0);
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Mở giỏ hàng, 0 sản phẩm" }).click();
  await loginDialog(page, email, password);
  await expect(
    page.getByRole("dialog").getByText("Silver / 38 mm", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".cart-total")).toContainText("3.200.000");
  await page
    .getByRole("button", { name: "Tăng số lượng DEMO Everyday" })
    .click();
  await expect(page.locator(".cart-total")).toContainText("6.400.000");
  await expect(
    page.getByRole("button", { name: "Tiến hành đặt hàng" }),
  ).toBeEnabled();
  const stored = await (
    await request.get("/api/v1/shop/cart", {
      headers: { Authorization: `Bearer ${readToken}` },
    })
  ).json();
  expect(stored[0]).toEqual({
    productId: "10000000-0000-4000-8000-000000000001",
    variantId: "20000000-0000-4000-8000-000000000002",
    quantity: 2,
  });
  await page.getByRole("button", { name: "Xóa", exact: true }).click();
  await expect(page.getByText("Giỏ hàng đang trống")).toBeVisible();
});

test("cart: reject revoked sessions and refuse guest order API calls", async ({
  page,
  request,
}) => {
  const email = `cart.revoked.${Date.now()}@example.test`;
  const password = "VNWatch revoked test 2026!";
  expect(
    (
      await request.post("/api/v1/auth/register", {
        data: { email, password, displayName: "Revoked Cart Test" },
      })
    ).status(),
  ).toBe(201);
  for (const endpoint of ["orders/quote", "orders"]) {
    expect(
      (await request.post(`/api/v1/${endpoint}`, { data: {} })).status(),
    ).toBe(401);
  }
  await page.goto("/?catalog=demo");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/auth/login") && r.request().method() === "POST",
  );
  await loginDialog(page, email, password);
  const token = (await (await response).json()).sessionToken as string;
  await page
    .getByRole("button", { name: "Xem DEMO Everyday", exact: true })
    .click();
  // A failed server session check must leave the cart untouched.
  await page.route("**/api/v1/shop/cart", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Chưa xác nhận được phiên đăng nhập." }),
    }),
  );
  await page.getByRole("button", { name: "Thêm vào giỏ hàng" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Chưa xác nhận được phiên đăng nhập.",
  );
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("vnwatch.cart.v1")!),
    ),
  ).toBeNull();
  await page.unroute("**/api/v1/shop/cart");
  expect(
    await (
      await request.get("/api/v1/shop/cart", {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json(),
  ).toEqual([]);
  expect(
    (
      await request.post("/api/v1/auth/logout-all", {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).status(),
  ).toBe(204);
  await page.getByRole("button", { name: "Thêm vào giỏ hàng" }).click();
  await expect(
    page.getByRole("dialog", { name: "Chào mừng trở lại" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("vnwatch.cart.v1")!),
    ),
  ).toBeNull();
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("button", { name: "Thêm vào giỏ hàng" }).click();
  await expect(
    page.getByRole("dialog", { name: "Chào mừng trở lại" }),
  ).toBeVisible();
});

test("account: register, login, edit profile, view session, logout", async ({
  page,
}) => {
  const email = `frontend.e2e.${Date.now()}@example.test`;
  const password = "VNWatch browser test 2026!";
  await page.goto("/?catalog=demo");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.getByRole("button", { name: "Tạo tài khoản mới" }).click();
  await page.getByLabel("Họ và tên").fill("Frontend Test");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(
    page.getByText("Tạo tài khoản thành công. Bạn có thể đăng nhập ngay."),
  ).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đăng nhập", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Frontend Test", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Quản trị", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((k) => /token|auth|session/i.test(k)),
    ),
  ).toBe(false);
  await page
    .getByRole("button", { name: "Frontend Test", exact: true })
    .click();
  await page.getByLabel("Họ và tên").fill("Frontend Verified");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByText("Đã cập nhật tên hiển thị.")).toBeVisible();
  await page
    .getByRole("button", { name: "Phiên đăng nhập", exact: true })
    .click();
  await expect(page.getByText("Phiên hiện tại", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Mật khẩu", exact: true }).click();
  await page
    .getByLabel("Mật khẩu hiện tại", { exact: true })
    .fill("wrong password");
  await page
    .getByLabel("Mật khẩu mới", { exact: true })
    .fill(password + " changed");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Tài khoản của tôi" }),
  ).toBeVisible();
  await page.getByLabel("Mật khẩu hiện tại", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill(password + " changed");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đăng nhập", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Frontend Verified", exact: true })
    .click();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
});

test("API outage displays error and retry recovers; no fake catalog fallback", async ({
  page,
}) => {
  await page.route("**/api/v1/products?*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Máy chủ đang bảo trì." }),
    }),
  );
  await page.goto("/?catalog=demo");
  await expect(page.getByRole("alert")).toHaveText("Máy chủ đang bảo trì.");
  await expect(page.locator(".product-card")).toHaveCount(0);
  await page.unroute("**/api/v1/products?*");
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(2);
});

test("mobile: no overflow, product dialog and cart login gate work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?catalog=demo");
  await expect(page.locator(".product-card")).toHaveCount(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../../work/frontend-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Xem DEMO Everyday", exact: true })
    .click();
  await expect(page.getByLabel("Phiên bản")).toBeVisible();
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("button", { name: "Mở giỏ hàng, 0 sản phẩm" }).click();
  await expect(
    page.getByRole("dialog", { name: "Chào mừng trở lại" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "../../work/cart-login-mobile.png" });
  expect(errors).toEqual([]);
});

test("desktop: renders storefront without runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?catalog=demo");
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.screenshot({
    path: "../../work/frontend-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
