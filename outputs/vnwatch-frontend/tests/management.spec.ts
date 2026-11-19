/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/tests/management.spec.ts
 * Kiểm thử tự động. Kiểm thử các màn hình quản trị được dựng bởi fixture; một số test giữ hành vi giao diện lịch sử. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// This UI test uses an isolated PostgreSQL test schema, not a production role override.
test("management: real admin catalog, variants, coupon checkout, reports and support", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
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
  // Migration paths in the test helper are relative to its backend workspace.
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
    const password = "VNWatch isolated admin test 2026!",
      email = "store.admin@example.test";
    await context.prisma.user.create({
      data: {
        email,
        displayName: "Store Admin",
        role: "ADMIN",
        passwordHash: await new PasswordService().hash(password),
      },
    });
    await context.app.listen(0, "127.0.0.1");
    const base = await context.app.getUrl();
    await page.route("**/api/v1/**", async (route) => {
      const url = new URL(route.request().url());
      const response = await route.fetch({
        url: base + url.pathname + url.search,
      });
      await route.fulfill({ response });
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/?catalog=demo");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    const loginResponse = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/v1/auth/login") &&
        r.request().method() === "POST",
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Đăng nhập", exact: true })
      .click();
    const token = (await (await loginResponse).json()).sessionToken as string;
    await page
      .getByRole("button", { name: "Quản trị cửa hàng", exact: true })
      .click();
    await expect(page.locator(".stat-card")).toHaveCount(6);
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Xuất báo cáo CSV", exact: true })
      .click();
    expect((await download).suggestedFilename()).toBe(
      "vnwatch-bao-cao-demo.csv",
    );
    await page
      .getByRole("button", { name: "Sản phẩm & kho", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Thêm sản phẩm demo", exact: true })
      .click();
    await page
      .getByLabel("Tên sản phẩm", { exact: true })
      .fill("DEMO UI Management");
    await page.getByLabel("Slug", { exact: true }).fill("demo-ui-management");
    await page
      .getByLabel("Mô tả", { exact: true })
      .fill("Sản phẩm demo tạo trong schema test riêng, không phải hàng thật.");
    await page
      .getByLabel("SKU phiên bản đầu", { exact: true })
      .fill("DEMO-UI-001");
    await page
      .getByLabel("Lý do thay đổi", { exact: true })
      .fill("Tạo mẫu để kiểm thử quản trị");
    await page
      .getByRole("button", { name: "Lưu sản phẩm", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Chỉnh sửa DEMO UI Management",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Chỉnh sửa DEMO UI Management",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Thêm phiên bản", exact: true })
      .click();
    await page.getByLabel("SKU mới", { exact: true }).fill("DEMO-UI-002");
    await page
      .getByLabel("Lý do thay đổi", { exact: true })
      .fill("Bổ sung phiên bản kiểm thử");
    await page
      .getByRole("button", { name: "Lưu phiên bản", exact: true })
      .click();
    await expect(
      page.getByText("DEMO-UI-002 · Đang kinh doanh", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Mã giảm giá", exact: true })
      .click();
    await page.getByLabel("Mã", { exact: true }).fill("UI100K");
    await page.getByLabel("Giảm VND", { exact: true }).fill("100000");
    await page.getByLabel("Bắt đầu", { exact: true }).fill("2026-01-01T00:00");
    await page.getByLabel("Kết thúc", { exact: true }).fill("2030-01-01T00:00");
    await page
      .getByLabel("Lý do tạo", { exact: true })
      .fill("Mã dành cho kiểm thử giao diện");
    await page.getByRole("button", { name: "Tạo mã", exact: true }).click();
    await expect(page.getByRole("heading", { name: /UI100K/ })).toBeVisible();
    await page.getByRole("button", { name: "Nhật ký", exact: true }).click();
    await expect(page.getByText(/PRODUCT_CREATE · Store Admin/)).toBeVisible();
    await page.screenshot({ path: "../../work/management-desktop.png" });
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
    await page.getByLabel("Mã giảm giá", { exact: true }).fill("UI100K");
    await page.getByRole("button", { name: "Áp dụng mã", exact: true }).click();
    await expect(page.locator(".order-summary .cart-total")).toContainText(
      "1.430.000",
    );
    await page.getByLabel("Số điện thoại", { exact: true }).fill("0901234567");
    await page
      .getByLabel("Địa chỉ nhận hàng", { exact: true })
      .fill("123 Đường Demo, Phường Demo, Thành phố Demo");
    await page
      .getByRole("button", { name: "Xác nhận đặt hàng COD", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Đơn hàng của tôi", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".order-summary")).toContainText("UI100K");
    await page.getByRole("button", { name: "Hủy đơn", exact: true }).click();
    await page
      .getByLabel("Lý do hoặc ghi chú", { exact: true })
      .fill("Hủy đơn giao diện trong schema riêng");
    await page
      .getByRole("button", { name: "Xác nhận thao tác", exact: true })
      .click();
    await expect(page.locator(".status-pill")).toHaveText("Đã hủy");
    await page.getByRole("button", { name: "Đóng", exact: true }).click();
    const ticket = await request.post(base + "/api/v1/shop/tickets", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        kind: "GENERAL",
        subject: "Kiểm thử phản hồi hỗ trợ",
        body: "Nhờ nhân viên tư vấn thông tin đồng hồ trong demo.",
      },
    });
    expect(ticket.status()).toBe(201);
    await page
      .getByRole("button", { name: "Hỗ trợ khách hàng", exact: true })
      .click();
    await page
      .getByRole("button", { name: /Kiểm thử phản hồi hỗ trợ/ })
      .click();
    await page
      .getByLabel("Phản hồi", { exact: true })
      .fill("Đã tiếp nhận và phản hồi yêu cầu tư vấn của bạn.");
    await page
      .getByRole("combobox", { name: "Trạng thái xử lý", exact: true })
      .selectOption("RESOLVED");
    await page
      .getByRole("button", { name: "Gửi phản hồi", exact: true })
      .click();
    await expect(
      page.getByText("Đã tiếp nhận và phản hồi yêu cầu tư vấn của bạn.", {
        exact: true,
      }),
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
