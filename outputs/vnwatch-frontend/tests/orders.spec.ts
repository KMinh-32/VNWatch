/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/tests/orders.spec.ts
 * Kiểm thử tự động. Kiểm thử đặt hàng, phản hồi và màn hình đơn; không tự tạo đơn từ thao tác xem catalog. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { expect, test } from "@playwright/test";

test("real product COD: live quote, lost response, reload recovery, one saved order, customer cancellation", async ({
  page,
  request,
}) => {
  const email = `checkout.e2e.${Date.now()}@example.test`;
  const password = "Checkout demo password 2026!";
  const registered = await request.post("/api/v1/auth/register", {
    data: { email, password, displayName: "Khách COD Demo" },
  });
  expect(registered.status()).toBe(201);
  const login = await request.post("/api/v1/auth/login", {
    data: { email, password },
  });
  expect(login.status()).toBe(200);
  const token = (await login.json()).sessionToken as string;
  let orderId: string | undefined;
  /** Đăng nhập qua UI fixture trước khi kiểm tra thao tác riêng tư. */
  async function signIn() {
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Đăng nhập", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Khách COD Demo", exact: true }),
    ).toBeVisible();
  }
  try {
    await page.goto("/");
    await signIn();
    await page
      .getByRole("button", { name: "Xem Casio AE-1200WHD-1AV", exact: true })
      .click();
    await page
      .getByLabel("Phiên bản")
      .selectOption("50000000-0000-4000-8000-000000000001");
    await page.getByRole("button", { name: "Thêm vào giỏ hàng" }).click();
    await expect(
      page.getByText(
        "Đã thêm vào giỏ hàng. Đóng chi tiết để xem giỏ hàng của bạn.",
      ),
    ).toBeVisible();
    await page.getByRole("button", { name: "Đóng", exact: true }).click();
    await page.getByRole("button", { name: "Mở giỏ hàng, 1 sản phẩm" }).click();
    await page.getByRole("button", { name: "Tiến hành đặt hàng" }).click();
    await expect(page.locator(".order-summary .cart-total")).toContainText(
      "1.531.000",
    );
    await page.getByLabel("Số điện thoại", { exact: true }).fill("0901234567");
    await page
      .getByLabel("Địa chỉ nhận hàng", { exact: true })
      .fill("123 Đường Demo, Phường Demo, Thành phố Demo");
    await page.screenshot({ path: "../../work/checkout-desktop.png" });
    const keys: string[] = [];
    let loseResponse = true;
    await page.route("**/api/v1/orders", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      keys.push(route.request().headers()["idempotency-key"]);
      if (loseResponse) {
        loseResponse = false;
        const response = await route.fetch();
        const order = await response.json();
        orderId = order.id;
        await route.abort("failed");
      } else await route.continue();
    });
    await page.getByRole("button", { name: "Xác nhận đặt hàng COD" }).click();
    await expect(
      page.getByRole("button", { name: "Thử xác nhận lại" }),
    ).toBeEnabled();
    await expect(page.getByRole("alert")).toContainText("Không kết nối");
    await page.reload();
    await signIn();
    await page
      .getByRole("button", { name: "Đơn hàng của tôi", exact: true })
      .click();
    await page.getByRole("button", { name: "Kiểm tra yêu cầu" }).click();
    await expect(page.getByLabel("Số điện thoại", { exact: true })).toHaveValue(
      "0901234567",
    );
    await page.getByRole("button", { name: "Thử xác nhận lại" }).click();
    await expect(
      page.getByRole("dialog", { name: "Đơn hàng của tôi", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".order-id")).toHaveText(orderId!);
    expect(keys.length).toBe(2);
    expect(keys[0]).toBe(keys[1]);
    const orders = await request.get("/api/v1/orders", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect((await orders.json()).meta.total).toBe(1);
    await expect(
      page.getByText("COD · Chưa thu tiền", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Hủy đơn", exact: true }).click();
    await page
      .getByLabel("Lý do hoặc ghi chú")
      .fill("Hủy đơn kiểm thử giao diện, hoàn lại tồn kho.");
    await page.getByRole("button", { name: "Xác nhận thao tác" }).click();
    await expect(page.locator(".status-pill")).toHaveText("Đã hủy");
    await page.screenshot({ path: "../../work/order-desktop.png" });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page
        .getByRole("dialog")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.screenshot({
      path: "../../work/order-mobile.png",
      fullPage: true,
    });
  } finally {
    // Only cancel the exact order created by this test. Keep its audit history intact.
    if (orderId)
      await request.post(`/api/v1/orders/${orderId}/cancel`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { reason: "Kết thúc kiểm thử COD demo; hoàn tồn kho." },
      });
    await request.post("/api/v1/auth/logout-all", {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
});
