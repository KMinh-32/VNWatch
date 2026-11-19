import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
]) {
  test(`cart photos and checkout stay within their containers at ${viewport.width}px`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize(viewport);
    const response = await request.get(
      "/api/v1/products?dataKind=REFERENCE&limit=50",
    );
    const products = (await response.json()).data;
    const watch = products.find((p: { variants: { sku: string }[] }) =>
      p.variants.some((v) => v.sku === "HDB005K1"),
    );
    const second = products.find(
      (p: { brand: string }) => p.brand === "Hamilton",
    );
    expect(watch).toBeTruthy();
    expect(second).toBeTruthy();
    const chosen = [watch, second];
    let items = chosen.map((p) => ({
      productId: p.id,
      variantId: p.variants[0].id,
      quantity: 1,
    }));
    await page.route("**/api/v1/auth/login", (route) =>
      route.fulfill({
        json: {
          sessionToken: "s".repeat(43),
          user: {
            id: "10000000-0000-4000-8000-000000000099",
            email: "layout@example.test",
            displayName: "Khách kiểm thử",
            role: "CUSTOMER",
            status: "ACTIVE",
            createdAt: new Date().toISOString(),
          },
        },
      }),
    );
    await page.route("**/api/v1/shop/favorites", (route) =>
      route.fulfill({ json: [] }),
    );
    await page.route("**/api/v1/shop/addresses", (route) =>
      route.fulfill({ json: [] }),
    );
    await page.route("**/api/v1/shop/cart", async (route) => {
      if (route.request().method() === "PUT") {
        const body = route.request().postDataJSON();
        items = items
          .map((item) =>
            item.variantId === body.variantId
              ? { ...item, quantity: body.quantity }
              : item,
          )
          .filter((item) => item.quantity > 0);
      }
      await route.fulfill({ json: items });
    });
    await page.route("**/api/v1/orders/quote", async (route) => {
      const body = route.request().postDataJSON();
      const lines = body.items.map(
        (item: { variantId: string; quantity: number }) => {
          const product = chosen.find(
            (p) => p.variants[0].id === item.variantId,
          )!;
          const v = product.variants[0];
          return {
            variantId: v.id,
            productName: product.name,
            variantLabel: v.label,
            sku: v.sku,
            quantity: item.quantity,
            unitPriceVnd: v.priceVnd,
            lineTotalVnd: v.priceVnd * item.quantity,
            warrantyMonths: v.warrantyMonths,
          };
        },
      );
      const subtotal = lines.reduce(
        (sum: number, line: { lineTotalVnd: number }) =>
          sum + line.lineTotalVnd,
        0,
      );
      await route.fulfill({
        json: {
          items: lines,
          subtotalVnd: subtotal,
          shippingFeeVnd: 30000,
          discountVnd: 0,
          totalVnd: subtotal + 30000,
          paymentMethod: body.paymentMethod ?? "COD",
          promotionCode: null,
          warrantyPolicy: "Bảo hành theo thông tin sản phẩm",
        },
      });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    const login = page.getByRole("dialog", { name: "Chào mừng trở lại" });
    await login.locator('[name="email"]').fill("layout@example.test");
    await login.locator('[name="password"]').fill("test-password-123456");
    await login.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page
      .getByRole("button", { name: "Mở giỏ hàng, 2 sản phẩm", exact: true })
      .click();
    const cart = page.getByRole("dialog", {
      name: "Giỏ hàng (2)",
      exact: true,
    });
    await expect(cart.locator(".cart-row")).toHaveCount(2);
    await expect
      .poll(() =>
        cart
          .locator(".cart-watch img")
          .evaluateAll((images) =>
            images.every(
              (i) =>
                (i as HTMLImageElement).complete &&
                (i as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    const bounds = await cart.locator(".cart-row").evaluateAll((rows) =>
      rows.map((row) => {
        const box = (el: Element) => {
          const r = el.getBoundingClientRect();
          return {
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            right: r.right,
            bottom: r.bottom,
          };
        };
        return {
          row: box(row),
          thumb: box(row.querySelector(".cart-watch")!),
          image: box(row.querySelector("img")!),
          info: box(row.querySelector(".cart-info")!),
          quantity: box(row.querySelector(".quantity")!),
        };
      }),
    );
    for (const b of bounds) {
      expect(b.thumb.width).toBeLessThanOrEqual(100);
      expect(b.image.right).toBeLessThanOrEqual(b.thumb.right + 1);
      expect(b.image.bottom).toBeLessThanOrEqual(b.thumb.bottom + 1);
      expect(b.thumb.right).toBeLessThanOrEqual(b.info.x + 1);
      expect(b.quantity.right).toBeLessThanOrEqual(b.row.right + 1);
    }
    await expect
      .poll(() => cart.evaluate((el) => el.scrollWidth <= el.clientWidth))
      .toBe(true);
    await page.screenshot({
      path: `../../work/cart-fixed-${viewport.width}.png`,
    });
    await cart
      .getByRole("button", { name: `Tăng số lượng ${watch.name}`, exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Giỏ hàng (3)", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Tiến hành đặt hàng", exact: true })
      .click();
    const checkout = page.getByRole("dialog");
    await expect(checkout.locator(".checkout-grid")).toBeVisible();
    const paymentChoices = await checkout
      .locator('.payment-methods input[type="radio"]')
      .evaluateAll((inputs) =>
        inputs.map((input) => {
          const radio = input.getBoundingClientRect();
          const label = input.parentElement!.getBoundingClientRect();
          return { radioHeight: radio.height, labelHeight: label.height };
        }),
      );
    for (const choice of paymentChoices) {
      expect(choice.radioHeight).toBeLessThanOrEqual(22);
      expect(choice.labelHeight).toBeLessThanOrEqual(60);
    }
    await checkout
      .getByRole("radio", { name: "Mã QR demo trên website", exact: true })
      .check();
    await expect(
      checkout.getByRole("button", {
        name: "Tạo đơn và xem mã QR demo",
        exact: true,
      }),
    ).toBeEnabled();
    await checkout
      .getByRole("radio", {
        name: "Thanh toán khi nhận hàng (COD)",
        exact: true,
      })
      .check();

    await checkout
      .getByLabel("Số điện thoại", { exact: true })
      .fill("0901234567");
    await checkout
      .getByLabel("Địa chỉ nhận hàng", { exact: true })
      .fill("123 Nguyễn Trãi, Phường Bến Thành, Thành phố Hồ Chí Minh");
    await expect(
      checkout.getByRole("button", {
        name: "Xác nhận đặt hàng COD",
        exact: true,
      }),
    ).toBeEnabled();
    await expect
      .poll(() => checkout.evaluate((el) => el.scrollWidth <= el.clientWidth))
      .toBe(true);
    const layout = await checkout.locator(".checkout-grid").evaluate((el) => {
      const [left, right] = [...el.children].map((e) =>
        e.getBoundingClientRect(),
      );
      return {
        leftBottom: left.bottom,
        leftRight: left.right,
        rightTop: right.top,
        rightLeft: right.left,
      };
    });
    if (viewport.width <= 700)
      expect(layout.rightTop).toBeGreaterThanOrEqual(layout.leftBottom - 1);
    else expect(layout.rightLeft).toBeGreaterThanOrEqual(layout.leftRight - 1);
    await checkout.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.screenshot({
      path: `../../work/checkout-fixed-${viewport.width}.png`,
    });
    await checkout
      .getByRole("button", { name: "Xác nhận đặt hàng COD", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `../../work/checkout-summary-fixed-${viewport.width}.png`,
    });
  });
}
