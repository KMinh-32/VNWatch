/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/tests/qr-demo.spec.ts
 * Kiểm thử tự động. Kiểm thử chọn QR demo, hiển thị mã và mô phỏng thanh toán trên giao diện. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
test("QR demo: checkout, local QR, lost confirmation response, idempotent retry and refresh", async ({
  page,
}) => {
  test.setTimeout(90000);
  const backend = fileURLToPath(
    new URL("../../vnwatch-backend/", import.meta.url),
  );
  const requireBackend = createRequire(path.join(backend, "package.json"));
  requireBackend("dotenv").config({
    path: path.join(backend, ".env"),
    quiet: true,
  });
  const { createAuthContext } = requireBackend(
    "./.test-build/test/helpers/auth-context.js",
  );
  const { seedDemo } = requireBackend(
    "./.test-build/src/database/demo-data.js",
  );
  const { PasswordService } = requireBackend(
    "./.test-build/src/auth/password.service.js",
  );
  const cwd = process.cwd();
  process.chdir(backend);
  let context;
  try {
    context = await createAuthContext();
  } finally {
    process.chdir(cwd);
  }
  try {
    await seedDemo(context.prisma, 100);
    const password = "VNWatch QR demo isolated test 2026!",
      email = "qr.ui@example.test";
    await context.prisma.user.create({
      data: {
        email,
        displayName: "Khách QR Demo",
        passwordHash: await new PasswordService().hash(password),
      },
    });
    await context.app.listen(0, "127.0.0.1");
    const base = await context.app.getUrl();
    let dropPaymentResponse = true;
    await page.route("**/api/v1/**", async (route) => {
      const url = new URL(route.request().url());
      const response = await route.fetch({
        url: base + url.pathname + url.search,
      });
      if (url.pathname.endsWith("/qr-demo/confirm") && dropPaymentResponse) {
        dropPaymentResponse = false;
        await route.abort("failed");
        return;
      }
      await route.fulfill({ response });
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/?catalog=demo");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Đăng nhập", exact: true })
      .click();
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
    await page.getByRole("button", { name: /Mở giỏ hàng/ }).click();
    await page
      .getByRole("button", { name: "Tiến hành đặt hàng", exact: true })
      .click();
    await page.getByLabel("Mã QR demo trên website", { exact: true }).check();
    await page.getByLabel("Số điện thoại", { exact: true }).fill("0901234567");
    await page
      .getByLabel("Địa chỉ nhận hàng", { exact: true })
      .fill("123 Đường QR Demo, Phường Demo");
    await page
      .getByRole("button", { name: "Tạo đơn và xem mã QR demo", exact: true })
      .click();
    const qr = page.getByRole("img", {
      name: "Mã QR demo của đơn hàng",
      exact: true,
    });
    await expect(qr).toBeVisible();
    const order = await context.prisma.order.findFirstOrThrow();
    expect(order.paymentMethod).toBe("QR_DEMO");
    expect(order.paymentStatus).toBe("UNPAID");
    await page.getByText("Nội dung mã QR", { exact: true }).click();
    await expect(page.locator(".qr-payload")).toContainText(
      "NOT A BANK TRANSFER",
    );
    await expect(page.locator(".qr-payload")).toContainText(order.id);
    await expect(page.locator(".qr-payload")).toContainText("AMOUNT: 1530000");
    await page.screenshot({ path: "../../work/qr-demo-desktop.png" });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await page.screenshot({ path: "../../work/qr-demo-mobile.png" });
    await page
      .getByRole("button", {
        name: "Mô phỏng thanh toán thành công",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Mô phỏng thanh toán thành công",
        exact: true,
      }),
    ).toBeEnabled();
    expect(
      (
        await context.prisma.order.findUniqueOrThrow({
          where: { id: order.id },
        })
      ).paymentStatus,
    ).toBe("PAID");
    await page
      .getByRole("button", {
        name: "Mô phỏng thanh toán thành công",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", { name: "Đã thanh toán QR demo", exact: true }),
    ).toBeVisible();
    expect(
      await context.prisma.orderEvent.count({
        where: { orderId: order.id, action: "PAY_QR_DEMO" },
      }),
    ).toBe(1);
    expect(await context.prisma.order.count()).toBe(1);
    await expect(
      page.getByRole("button", { name: "Hủy đơn", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Cập nhật trạng thái", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Đã thanh toán QR demo", exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
