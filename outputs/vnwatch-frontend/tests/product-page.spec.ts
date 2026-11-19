import { expect, test } from "@playwright/test";

test("product links open a separate page, preserve filters and support Back/Forward", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", {name:"Hamilton",exact:true}).click();
  await expect(page.locator(".product-card")).toHaveCount(2);
  const card = page.locator(".product-card").first();
  const name = (await card.locator(".product-name").textContent())!.trim();
  const link = card.locator(".product-image");
  const href = (await link.getAttribute("href"))!;
  expect(href).toMatch(/^\/products\/[0-9a-f-]+$/);
  await link.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.getByRole("heading",{level:1,name,exact:true})).toBeVisible();
  await expect(page.locator(".product-page")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".catalog-hero")).toHaveCount(0);
  await page.goBack();
  await expect(page.locator(".product-card")).toHaveCount(2);
  await expect(page.getByRole("combobox",{name:"Thương hiệu",exact:true})).toHaveValue("Hamilton");
  await page.goForward();
  await expect(page.getByRole("heading",{level:1,name,exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading",{level:1,name,exact:true})).toBeVisible();
  await expect(page).toHaveTitle(`${name} | VNWatch`);
  await page.screenshot({path:"../../work/product-page-desktop.png"});
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:"../../work/product-page-mobile.png"});
  await page.getByRole("button",{name:"Thêm vào giỏ hàng",exact:true}).click();
  await expect(page.getByRole("dialog",{name:"Chào mừng trở lại"})).toBeVisible();
  await expect(page.locator(".product-page")).toBeAttached();
  await page.getByRole("dialog").getByRole("button",{name:"Đóng",exact:true}).click();
  await page.getByRole("link",{name:"← Bộ sưu tập",exact:true}).click();
  await expect(page).toHaveURL(/\/#collection$/);
  await expect(page.locator(".product-card").first()).toBeVisible();
});

test("saved product URLs, new tabs, header navigation and missing products work", async ({ page, context }) => {
  const response = await page.request.get("/api/v1/products?dataKind=REFERENCE&limit=1");
  const product = (await response.json()).data[0];
  await page.goto(`/?product=${product.id}`);
  await expect(page).toHaveURL(new RegExp(`/products/${product.id}$`));
  await expect(page.getByRole("heading",{level:1,name:product.name,exact:true})).toBeVisible();
  const newTab = await context.newPage();
  await newTab.goto(`/products/${product.id}`);
  await expect(newTab.getByRole("heading",{level:1,name:product.name,exact:true})).toBeVisible();
  await newTab.close();
  await page.getByRole("link",{name:"Câu chuyện VNWatch",exact:true}).click();
  await expect(page).toHaveURL(/\/#story$/);
  await expect(page.locator("#story")).toBeVisible();
  await page.goto("/products/00000000-0000-4000-8000-000000000099");
  await expect(page.getByRole("alert")).toContainText("Không tìm thấy sản phẩm");
  await page.getByRole("link",{name:"← Bộ sưu tập",exact:true}).click();
  await expect(page.locator(".product-card").first()).toBeVisible();
});

test("in-app product navigation preserves the signed-in session", async ({ page }) => {
  // Phiên giả lập chỉ phục vụ UI để phát hiện điều hướng gây tải lại toàn bộ ứng dụng.
  await page.route("**/api/v1/auth/login", route=>route.fulfill({json:{sessionToken:"s".repeat(43),user:{id:"10000000-0000-4000-8000-000000000099",email:"page@example.test",displayName:"Khách kiểm thử",role:"CUSTOMER",status:"ACTIVE",createdAt:new Date().toISOString()}}}));
  await page.route("**/api/v1/shop/cart", route=>route.fulfill({json:[]}));
  await page.route("**/api/v1/shop/favorites", route=>route.fulfill({json:[]}));
  await page.goto("/");
  await page.getByRole("button",{name:"Đăng nhập",exact:true}).click();
  const login=page.getByRole("dialog",{name:"Chào mừng trở lại"});
  await login.locator('[name="email"]').fill("page@example.test");
  await login.locator('[name="password"]').fill("test-password-123456");
  await login.getByRole("button",{name:"Đăng nhập",exact:true}).click();
  await expect(page.getByRole("button",{name:"Khách kiểm thử",exact:true})).toBeVisible();
  await page.locator(".product-image").first().click();
  await expect(page.locator(".product-page")).toBeVisible();
  await expect(page.getByRole("button",{name:"Khách kiểm thử",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Thêm vào giỏ hàng",exact:true}).click();
  await expect(page.locator(".product-page")).toContainText("Đã thêm vào giỏ hàng.");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
