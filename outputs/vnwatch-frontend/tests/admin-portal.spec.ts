/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/tests/admin-portal.spec.ts
 * Kiểm thử tự động. Kiểm thử Electron thật với API fixture riêng: đăng nhập, sáu ô điều hướng, quản lý đơn/user/catalog và logout. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { expect, test } from "@playwright/test";
import { _electron as electron } from "playwright";
import { createServer } from "node:http";
import { once } from "node:events";
import { resolve } from "node:path";
test.use({ actionTimeout: 15000 });
// Start the isolated Compose test-admin-ui service; it never writes the shop database.
test("Windows Manager: isolated renderer, navigation, roles, products, accounts and orders", async ({
  request,
}) => {
  test.setTimeout(120000);
  const base = process.env.VNWATCH_ADMIN_TEST_API ?? "http://127.0.0.1:5301";
  await expect
    .poll(
      async () => {
        try {
          return (await request.get(base + "/api/v1/health/ready")).status();
        } catch {
          return 0;
        }
      },
      { timeout: 60000 },
    )
    .toBe(200);
  const password = "UI isolated fixture password 2026!";
  let loseNextOrder = false;
  const errors: string[] = [];
  const proxy = createServer(async (req, res) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const body = Buffer.concat(chunks);
      const method = req.method ?? "GET";
      const response = await fetch(base + req.url, {
        method,
        headers: {
          ...(typeof req.headers.authorization === "string"
            ? { Authorization: req.headers.authorization }
            : {}),
          ...(typeof req.headers["idempotency-key"] === "string"
            ? { "Idempotency-Key": req.headers["idempotency-key"] }
            : {}),
          ...(body.length ? { "Content-Type": "application/json" } : {}),
        },
        ...(body.length ? { body } : {}),
      });
      const text = await response.text();
      if (
        loseNextOrder &&
        req.url === "/api/v1/orders/manage" &&
        method === "POST"
      ) {
        loseNextOrder = false;
        req.socket.destroy();
        return;
      }
      res.writeHead(response.status, { "Content-Type": "application/json" });
      res.end(text);
    } catch {
      res.writeHead(502);
      res.end("{}");
    }
  });
  proxy.listen(0, "127.0.0.1");
  await once(proxy, "listening");
  const address = proxy.address();
  if (!address || typeof address === "string")
    throw new Error("Test proxy did not bind.");
  const manager = await electron.launch({
    executablePath: resolve(
      "../vnwatch-manager/node_modules/electron/dist/electron.exe",
    ),
    args: [resolve("../vnwatch-manager")],
    env: {
      ...process.env,
      NODE_ENV: "test",
      VNWATCH_DESKTOP_TEST_ORIGIN: "http://127.0.0.1:" + address.port,
    },
  });
  const page = await manager.firstWindow();
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await expect(page).toHaveURL("vnwatch-admin://app/");
    expect(
      await page.evaluate(() => ({
        node: typeof (window as unknown as { require?: unknown }).require,
        bridge: typeof window.vnwatchDesktop?.request,
      })),
    ).toEqual({ node: "undefined", bridge: "function" });
    await expect(
      page.getByText("Đã kết nối dữ liệu cửa hàng", { exact: true }),
    ).toBeVisible();
    /** Đăng nhập bằng tài khoản fixture để lấy phiên phục vụ kịch bản. */
    async function login(email: string) {
      await page.getByLabel("Email quản trị", { exact: true }).fill(email);
      await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
      await page
        .getByRole("button", { name: "Đăng nhập quản trị", exact: true })
        .click();
    }
    /** Click mục quản trị và kiểm tra màn hình được chuyển tới. */
    const nav = (name: string) =>
      page
        .getByRole("navigation", { name: "Quản trị" })
        .getByRole("button", { name: new RegExp(name) });
    await expect(
      page.getByRole("heading", { name: "Đăng nhập quản trị", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: "../../docker/verification/manager-login.png",
      fullPage: true,
    });
    await login("staff.ui@example.test");
    await expect(
      page.getByText("Không thể đăng nhập bằng thông tin đã cung cấp.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".admin-sidebar")).toHaveCount(0);
    await login("admin.ui@example.test");
    await expect(page.locator(".stat-card")).toHaveCount(6);
    await page.screenshot({
      path: "../../docker/verification/manager-desktop.png",
      fullPage: true,
    });
    // Cards open the matching list and filters, and browser history restores them.
    const destinations = [
      {
        label: "Doanh thu đã thu",
        heading: "Đơn hàng",
        hash: /#orders\?status=COMPLETED&paymentStatus=PAID&archive=all$/,
        path: "/orders/manage",
        params: { status: "COMPLETED", paymentStatus: "PAID", archive: "all" },
      },
      {
        label: "Đơn hoàn tất",
        heading: "Đơn hàng",
        hash: /#orders\?status=COMPLETED&paymentStatus=PAID&archive=all$/,
        path: "/orders/manage",
        params: { status: "COMPLETED", paymentStatus: "PAID", archive: "all" },
      },
      {
        label: "Khách hàng",
        heading: "Tài khoản",
        hash: /#users\?role=CUSTOMER$/,
        path: "/users",
        params: { role: "CUSTOMER" },
      },
      {
        label: "Mẫu sản phẩm",
        heading: "Sản phẩm & kho",
        hash: /#products$/,
        path: "/management/products",
        params: {},
      },
      {
        label: "Tồn đang bán",
        heading: "Sản phẩm & kho",
        hash: /#products\?view=stock$/,
        path: "/management/products",
        params: { status: "ACTIVE" },
      },
      {
        label: "Yêu cầu đang mở",
        heading: "Hỗ trợ khách hàng",
        hash: /#support\?state=open$/,
        path: "/management/tickets",
        params: { state: "open" },
      },
    ];
    for (const [index, destination] of destinations.entries()) {
      const card = page.getByRole("button", {
        name: new RegExp("^" + destination.label + " "),
      });
      if (index === 0) {
        await card.focus();
        await page.keyboard.press("Enter");
      } else await card.click();
      await expect(page).toHaveURL(destination.hash);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: destination.heading,
          exact: true,
        }),
      ).toBeVisible();

      if (destination.path === "/orders/manage") {
        await expect(
          page.getByRole("combobox", { name: "Trạng thái", exact: true }),
        ).toHaveValue("COMPLETED");
        await expect(
          page.getByRole("combobox", { name: "Thanh toán", exact: true }),
        ).toHaveValue("PAID");
        await expect(
          page.getByRole("combobox", { name: "Danh sách", exact: true }),
        ).toHaveValue("all");
      } else if (destination.label === "Khách hàng") {
        await expect(
          page.getByRole("combobox", { name: "Lọc vai trò", exact: true }),
        ).toHaveValue("CUSTOMER");
      } else if (destination.label === "Tồn đang bán") {
        await expect(
          page.getByRole("combobox", {
            name: "Danh sách sản phẩm",
            exact: true,
          }),
        ).toHaveValue("stock");
      } else if (destination.path === "/management/tickets") {
        await expect(
          page.getByRole("combobox", {
            name: "Danh sách yêu cầu",
            exact: true,
          }),
        ).toHaveValue("open");
        await page
          .getByRole("combobox", { name: "Danh sách yêu cầu", exact: true })
          .selectOption("all");
      }
      await page.goBack();
      await expect(page.locator(".stat-link")).toHaveCount(6);
    }
    await page.goForward();
    await expect(
      page.getByRole("combobox", { name: "Danh sách yêu cầu", exact: true }),
    ).toHaveValue("open");
    await page.goBack();
    await expect(page.locator(".stat-link")).toHaveCount(6);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: /^Tồn đang bán / }).click();
    await expect(
      page.getByRole("heading", { name: "Tồn kho đang bán", exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator(".admin-topbar")
          .evaluate((e) => e.getBoundingClientRect().top),
      )
      .toBeLessThan(100);
    expect(
      await page
        .locator(".admin-topbar")
        .evaluate((e) => e.getBoundingClientRect().top),
    ).toBeGreaterThanOrEqual(0);
    await nav("Tổng quan").click();
    await page.setViewportSize({ width: 1280, height: 900 });
    console.info(
      "All six dashboard destinations and history verified; opening orders",
    );
    await nav("Đơn hàng").click();
    await page
      .getByRole("button", { name: "Tạo đơn hàng", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Tài khoản đặt hàng", exact: true })
      .selectOption({
        label: "CUSTOMER UI Fixture · customer.ui@example.test",
      });
    console.info("Buyer selected");
    const variants = page.getByRole("combobox", {
      name: "Chọn phiên bản",
      exact: true,
    });
    await expect(variants.locator("option")).not.toHaveCount(1);
    const sku = await variants
      .locator("option")
      .filter({ hasText: "DEMO-EVERYDAY-BLACK" })
      .getAttribute("value");
    expect(sku).toBeTruthy();
    await variants.selectOption(sku!);
    await page
      .getByRole("button", { name: "Thêm vào đơn", exact: true })
      .click();
    console.info("Product added");
    await page.getByLabel("Số điện thoại", { exact: true }).fill("0901234567");
    await page
      .getByLabel("Địa chỉ nhận hàng", { exact: true })
      .fill("123 Đường Demo, Thành phố Demo");
    await page
      .getByLabel("Lý do tạo đơn", { exact: true })
      .fill("Khách yêu cầu tạo đơn kiểm thử giao diện");
    await page
      .getByRole("button", {
        name: "Tính tổng và kiểm tra tồn kho",
        exact: true,
      })
      .click();
    await expect(page.locator(".cart-total")).toContainText("1.530.000");
    loseNextOrder = true;
    await page
      .getByRole("button", { name: "Xác nhận tạo đơn", exact: true })
      .click();
    await expect(
      page.getByText(
        "Không kết nối được máy chủ. Hãy kiểm tra backend và thử lại.",
        { exact: true },
      ),
    ).toBeVisible();
    await page.reload();
    await login("admin.ui@example.test");
    console.info("Admin login verified; opening orders");
    await nav("Đơn hàng").click();
    await page
      .getByRole("button", { name: "Tạo đơn hàng", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Thử tạo lại cùng đơn", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Thử tạo lại cùng đơn", exact: true })
      .click();
    await expect(page.locator(".order-id")).toBeVisible();
    const orderId = (await page.locator(".order-id").textContent())!;
    await page
      .getByRole("button", { name: "Sửa thông tin giao hàng", exact: true })
      .click();
    await page
      .getByLabel("Người nhận", { exact: true })
      .fill("Người nhận cập nhật UI");
    await page
      .getByLabel("Lý do thay đổi", { exact: true })
      .fill("Khách sửa tên người nhận trước khi giao");
    await page
      .getByRole("button", { name: "Lưu thay đổi", exact: true })
      .click();
    await expect(page.locator(".delivery")).toContainText(
      "Người nhận cập nhật UI",
    );
    await page.getByRole("button", { name: "Hủy đơn", exact: true }).click();
    await page
      .getByLabel("Lý do hoặc ghi chú", { exact: true })
      .fill("Khách hủy đơn kiểm thử");
    await page
      .getByRole("button", { name: "Xác nhận thao tác", exact: true })
      .click();
    await expect(page.locator(".order-title .status-pill")).toHaveText(
      "Đã hủy",
    );
    await page
      .getByRole("button", { name: "Xóa khỏi danh sách quản trị", exact: true })
      .click();
    await page
      .getByLabel("Lý do thay đổi", { exact: true })
      .fill("Lưu trữ đơn kiểm thử đã hủy");
    await page
      .getByRole("button", { name: "Lưu thay đổi", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Khôi phục đơn hàng", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Danh sách đơn hàng" }).click();
    await expect(page.locator(".order-card")).toHaveCount(0);
    await page
      .getByRole("combobox", { name: "Danh sách", exact: true })
      .selectOption("archived");
    await expect(page.locator(".order-card")).toHaveCount(1);
    await page.locator(".order-card").click();
    await page
      .getByRole("button", { name: "Khôi phục đơn hàng", exact: true })
      .click();
    await page
      .getByLabel("Lý do thay đổi", { exact: true })
      .fill("Khôi phục để tiếp tục kiểm thử");
    await page
      .getByRole("button", { name: "Lưu thay đổi", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Xóa khỏi danh sách quản trị",
        exact: true,
      }),
    ).toBeVisible();

    console.info("Order lifecycle verified; opening accounts");
    await nav("Tài khoản").click();
    await page
      .getByRole("button", { name: "Thêm tài khoản", exact: true })
      .click();
    await page
      .getByLabel("Tên hiển thị", { exact: true })
      .fill("Khách thêm từ Admin UI");
    await page
      .getByLabel("Email", { exact: true })
      .fill("created.ui@example.test");
    await page.getByLabel("Mật khẩu ban đầu", { exact: true }).fill(password);
    await page
      .getByLabel("Lý do thay đổi", { exact: true })
      .fill("Tạo tài khoản phục vụ kiểm thử UI");
    await page
      .getByRole("button", { name: "Lưu tài khoản", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Quản lý created.ui@example.test",
        exact: true,
      }),
    ).toBeVisible();
    const customerLogin = await request.post(base + "/api/v1/auth/login", {
      data: { email: "created.ui@example.test", password },
    });
    expect(customerLogin.status()).toBe(200);
    const customerToken = (await customerLogin.json()).sessionToken;
    await page
      .getByRole("button", {
        name: "Quản lý created.ui@example.test",
        exact: true,
      })
      .click();
    await page
      .getByRole("combobox", { name: "Trạng thái tài khoản", exact: true })
      .selectOption("BLOCKED");
    await page
      .getByLabel("Lý do thay đổi", { exact: true })
      .fill("Khóa tài khoản kiểm thử thu hồi phiên");
    await page
      .getByRole("button", { name: "Lưu tài khoản", exact: true })
      .click();
    await expect(
      page.getByText("Đã lưu tài khoản và nhật ký.", { exact: true }),
    ).toBeVisible();
    expect(
      (
        await request.get(base + "/api/v1/users/me", {
          headers: { Authorization: "Bearer " + customerToken },
        })
      ).status(),
    ).toBe(401);
    await expect(page.locator(".admin-table tbody tr")).toHaveCount(4);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "../../docker/verification/manager-mobile.png",
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await page.setViewportSize({ width: 1440, height: 1000 });

    await nav("Sản phẩm & kho").click();
    await page
      .getByRole("button", { name: "Thêm sản phẩm demo", exact: true })
      .click();
    await page
      .getByLabel("Tên sản phẩm", { exact: true })
      .fill("DEMO Admin Portal UI");
    await page.getByLabel("Slug", { exact: true }).fill("demo-admin-portal-ui");
    await page
      .getByLabel("Mô tả", { exact: true })
      .fill("Sản phẩm demo trong schema test, không phải hàng thật.");
    await page
      .getByRole("combobox", { name: "Trạng thái", exact: true })
      .selectOption("ACTIVE");
    await page
      .getByLabel("SKU phiên bản đầu", { exact: true })
      .fill("DEMO-ADMIN-UI");
    await page
      .getByLabel("Lý do thay đổi", { exact: true })
      .fill("Tạo sản phẩm bằng trang admin");
    await page
      .getByRole("button", { name: "Lưu sản phẩm", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Chỉnh sửa DEMO Admin Portal UI",
        exact: true,
      })
      .click();
    await page
      .getByLabel("Tên sản phẩm", { exact: true })
      .fill("DEMO Admin Portal đã sửa");
    await page
      .getByLabel("Lý do thay đổi", { exact: true })
      .fill("Sửa tên sản phẩm qua giao diện");
    await page
      .getByRole("button", { name: "Lưu sản phẩm", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "DEMO Admin Portal đã sửa",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByLabel("Lý do thay đổi", { exact: true })
      .fill("Ngừng kinh doanh sản phẩm kiểm thử");
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", {
        name: "Xóa / ngừng kinh doanh sản phẩm",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Chỉnh sửa DEMO Admin Portal đã sửa",
        exact: true,
      }),
    ).toBeVisible();
    for (const section of [
      "Khuyến mãi",
      "Hỗ trợ khách hàng",
      "Đánh giá",
      "Nhật ký hoạt động",
    ]) {
      await nav(section).click();
      await expect(page.locator(".admin-main h1")).toContainText(section);
    }
    await expect(
      page.getByText(/ORDER_CREATE_ADMIN · ADMIN UI Fixture/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Đăng nhập quản trị", exact: true }),
    ).toBeVisible();
    const verify = await request.post(base + "/api/v1/auth/admin/login", {
      data: { email: "admin.ui@example.test", password },
    });
    const adminToken = (await verify.json()).sessionToken;
    const orders = await request.get(
      base + "/api/v1/orders/manage?archive=all",
      {
        headers: { Authorization: "Bearer " + adminToken },
      },
    );
    expect((await orders.json()).data.map((o: { id: string }) => o.id)).toEqual(
      [orderId],
    );
    expect(errors).toEqual([]);
  } finally {
    await manager.close();
    proxy.closeAllConnections();
    await new Promise<void>((resolve) => proxy.close(() => resolve()));
  }
});
