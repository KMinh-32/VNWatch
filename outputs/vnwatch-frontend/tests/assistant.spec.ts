/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/tests/assistant.spec.ts
 * Kiểm thử tự động. Kiểm thử chat, sản phẩm gợi ý, nguồn và điều hướng trợ lý. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { expect, test } from "@playwright/test";

test("customer assistant: budget, brand sources, stock, policy and product navigation", async ({
  page,
}) => {
  test.setTimeout(45000);
  await page.goto("/");
  await page.getByRole("button", { name: "Mở trợ lý tư vấn" }).click();
  const dialog = page.getByRole("dialog", { name: "Trợ lý VNWatch" });
  await dialog
    .getByRole("button", { name: "Gợi ý đồng hồ dưới 2 triệu", exact: true })
    .click();
  await expect(dialog.locator(".assistant-mode")).toHaveText(
    "Tư vấn theo dữ liệu",
  );
  await expect(
    dialog.getByText(
      "Chưa bật OpenAI. Trợ lý đang tra cứu theo dữ liệu và mẫu câu có sẵn.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(dialog.locator(".assistant-product")).toHaveCount(1);
  await expect(dialog.locator(".assistant-product h3")).toHaveText(
    "Casio AE-1200WHD-1AV",
  );
  await expect(dialog.locator(".assistant-specs summary")).toContainText(
    "Còn hàng",
  );
  await dialog.locator(".assistant-specs summary").click();
  await expect(
    dialog.getByText("Chưa thiết lập chính sách", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(
      () =>
        dialog
          .locator(".assistant-photo")
          .first()
          .evaluate((el) => {
            const image = el.querySelector("img");
            return (
              !!el.querySelector(".photo-unavailable") ||
              !!(image?.complete && image.naturalWidth > 0)
            );
          }),
      { timeout: 12000 },
    )
    .toBe(true);
  await page.screenshot({ path: "../../work/assistant-desktop.png" });
  await dialog
    .getByRole("button", { name: "Casio của nước nào?", exact: true })
    .click();
  await expect(dialog.locator(".assistant-copy").last()).toContainText(
    "Tokyo, Nhật Bản",
  );
  await dialog.locator(".assistant-sources summary").last().click();
  await expect(
    dialog.getByRole("link", { name: "Casio — Company Data ↗" }),
  ).toHaveAttribute("href", "https://world.casio.com/corporate/profile/");
  await dialog
    .getByRole("button", { name: "Bảo hành tại VNWatch thế nào?", exact: true })
    .click();
  await expect(dialog.locator(".assistant-copy").last()).toContainText(
    "chưa công bố chính sách bảo hành chung",
  );
  await dialog.getByLabel("Câu hỏi cho trợ lý").fill("Giá đồng hồ Rolex?");
  await dialog.getByRole("button", { name: "Gửi câu hỏi" }).click();
  await expect(dialog.locator(".assistant-copy").last()).toContainText(
    "không tìm thấy",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => dialog.evaluate((el) => el.scrollWidth <= el.clientWidth))
    .toBe(true);
  await page.screenshot({ path: "../../work/assistant-mobile.png" });
  // Closing and reopening retains session conversation; viewing a product closes chat.
  await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("button", { name: "Mở trợ lý tư vấn" }).click();
  await expect(dialog.locator(".assistant-turn")).toHaveCount(4);
  await dialog
    .getByRole("button", { name: "Xem chi tiết", exact: false })
    .first()
    .click();
  await expect(
    page.getByRole("dialog", { name: "Trợ lý VNWatch" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 1, name: "Casio AE-1200WHD-1AV", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/products\/[0-9a-f-]+$/);
});

test("chat outage keeps input, allows retry and renders untrusted text safely", async ({
  page,
}) => {
  let calls = 0;
  const requests: { requestId: string; conversationId: string }[] = [];
  await page.route("**/api/v1/assistant/chat", async (route) => {
    requests.push(route.request().postDataJSON());
    calls++;
    await route.fulfill({
      status: calls === 1 ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        calls === 1
          ? { message: "Trợ lý đang tạm ngừng kết nối." }
          : {
              mode: "CATALOG",
              notice: null,
              text: "<script>alert('unsafe')</script>",
              products: [],
              sources: [],
              action: null,
            },
      ),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Mở trợ lý tư vấn" }).click();
  const question = page.getByLabel("Câu hỏi cho trợ lý");
  await question.fill("Tư vấn đồng hồ");
  await page.getByRole("button", { name: "Gửi câu hỏi" }).click();
  await expect(page.getByRole("alert")).toContainText("tạm ngừng kết nối");
  await expect(question).toHaveValue("Tư vấn đồng hồ");
  await page.getByRole("button", { name: "Gửi câu hỏi" }).click();
  await expect(page.locator(".assistant-copy")).toHaveText(
    "<script>alert('unsafe')</script>",
  );
  await expect(page.locator(".assistant-answer script")).toHaveCount(0);
  expect(requests[0].requestId).toBe(requests[1].requestId);
  expect(requests[0].conversationId).toBe(requests[1].conversationId);
  await page
    .getByRole("button", { name: "Hội thoại mới", exact: true })
    .click();
  await expect(page.locator(".assistant-turn")).toHaveCount(0);
});
