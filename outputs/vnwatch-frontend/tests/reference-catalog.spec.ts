/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/tests/reference-catalog.spec.ts
 * Kiểm thử tự động. Kiểm thử các mẫu thật và nguồn/ảnh hiển thị ở catalog. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { expect, test } from "@playwright/test";

test("real catalog: photos or explicit fallback, brands, price filter and attributed dimensions", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("10 thiết kế", { exact: true })).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(10);
  await page.locator(".demo-note").scrollIntoViewIfNeeded();
  await expect
    .poll(
      async () =>
        page.locator(".product-card").evaluateAll(
          (images) =>
            images.filter((card) => {
              const photo =
                card.querySelector<HTMLImageElement>(".product-photo");
              return (
                (photo?.complete && photo.naturalWidth > 0) ||
                card.querySelector(".photo-unavailable[aria-label]") !== null
              );
            }).length,
        ),
      { timeout: 20000 },
    )
    .toBe(10);
  await page.screenshot({
    path: "../../work/real-catalog-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Thương hiệu", { exact: true }).selectOption("Casio");
  await expect(page.getByText("2 thiết kế", { exact: true })).toBeVisible();
  await page.getByLabel("Khoảng giá").selectOption("0:2000000");
  await expect(page.getByText("1 thiết kế", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Xem Casio AE-1200WHD-1AV", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("45 × 42.1 × 12.5 mm (dài × rộng × dày)", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "Thông số: Casio ↗" }),
  ).toHaveAttribute(
    "href",
    "https://www.casio.com/vn/watches/casio/product.AE-1200WHD-1AV/",
  );
  await expect(
    dialog.getByText("Chưa thiết lập chính sách", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Thêm vào giỏ hàng" }),
  ).toBeEnabled();
  await page.screenshot({ path: "../../work/real-product-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: "../../work/real-product-mobile.png",
    fullPage: true,
  });
});

test("failed product image shows unavailable message and keeps source visible", async ({
  page,
}) => {
  await page.route("https://casio.anhkhue.com/upload/**", (route) =>
    route.abort(),
  );
  await page.goto("/?product=40000000-0000-4000-8000-000000000001");
  await expect(
    page.getByRole("dialog").getByText("Ảnh chưa tải được"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Nguồn ảnh sản phẩm ↗" }),
  ).toBeVisible();
});
