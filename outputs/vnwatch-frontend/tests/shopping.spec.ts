/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/tests/shopping.spec.ts
 * Kiểm thử tự động. Kiểm thử thao tác giỏ/yêu thích/địa chỉ và tiện ích mua hàng qua giao diện. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { expect, test } from "@playwright/test";

test("shopping: compare, favorites, account-isolated cart, address book and support", async ({
  page,
  request,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const email = `shopping.e2e.${Date.now()}@example.test`,
    password = "VNWatch shopping test 2026!";
  expect(
    (
      await request.post("/api/v1/auth/register", {
        data: { email, password, displayName: "Shopping Test" },
      })
    ).status(),
  ).toBe(201);
  await page.goto("/?catalog=demo");
  await page
    .getByRole("button", { name: "So sánh DEMO Everyday", exact: true })
    .click();
  await page
    .getByRole("button", { name: "So sánh DEMO Automatic", exact: true })
    .click();
  await page
    .getByRole("button", { name: "⇄ So sánh (2/3)", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "So sánh đồng hồ" }),
  ).toBeVisible();
  await expect(page.locator(".compare-grid .feature-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page
    .getByRole("button", { name: "Yêu thích DEMO Everyday", exact: true })
    .click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đăng nhập", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Sản phẩm yêu thích" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page
    .getByRole("button", { name: "Yêu thích DEMO Everyday", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Bỏ yêu thích DEMO Everyday",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Địa chỉ nhận hàng", exact: true })
    .click();
  await page.getByLabel("Tên địa chỉ", { exact: true }).fill("Nhà demo");
  await page.getByLabel("Người nhận", { exact: true }).fill("Shopping Test");
  await page.getByLabel("Số điện thoại", { exact: true }).fill("0901234567");
  await page
    .getByLabel("Địa chỉ", { exact: true })
    .fill("123 Đường Demo, Phường Demo, Thành phố Demo");
  await page.getByRole("button", { name: "Lưu địa chỉ", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Nhà demo", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page
    .getByRole("button", { name: "Xem DEMO Everyday", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Thêm vào giỏ hàng", exact: true })
    .click();
  await expect(
    page.getByText(
      "Đã thêm vào giỏ hàng. Đóng chi tiết để xem giỏ hàng của bạn.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page
    .getByRole("button", { name: "Mở giỏ hàng, 1 sản phẩm", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Tiến hành đặt hàng", exact: true })
    .click();
  await page
    .getByLabel("Chọn địa chỉ đã lưu")
    .selectOption({ label: "Nhà demo — Shopping Test" });
  await expect(page.getByLabel("Số điện thoại", { exact: true })).toHaveValue(
    "0901234567",
  );
  await page.getByLabel("Mã giảm giá", { exact: true }).fill("NOTVALID");
  await page.getByRole("button", { name: "Áp dụng mã", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Mã giảm giá không khả dụng",
  );
  await page.getByRole("button", { name: "Bỏ mã", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Xác nhận đặt hàng COD", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("button", { name: "Hỗ trợ", exact: true }).click();
  await page
    .getByLabel("Tiêu đề", { exact: true })
    .fill("Hỏi kích thước đồng hồ demo");
  await page
    .getByLabel("Nội dung", { exact: true })
    .fill("Tôi muốn được tư vấn chọn kích thước phù hợp cổ tay.");
  await page.getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Hỏi kích thước đồng hồ demo",
      exact: true,
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "../../work/support-mobile.png" });
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page
    .getByRole("button", { name: "Shopping Test", exact: true })
    .click();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  // Another account on the same browser must receive its own empty cart and favorites.
  const second = `shopping.other.${Date.now()}@example.test`;
  expect(
    (
      await request.post("/api/v1/auth/register", {
        data: { email: second, password, displayName: "Another Shopper" },
      })
    ).status(),
  ).toBe(201);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(second);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đăng nhập", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Mở giỏ hàng, 0 sản phẩm", exact: true })
    .click();
  await expect(page.getByText("Giỏ hàng đang trống")).toBeVisible();
  expect(errors).toEqual([]);
});
