import { expect, test } from "@playwright/test";

test("chat lưu DB: hỏi, tải lại, hội thoại mới, mở lịch sử và kết thúc", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mở trợ lý tư vấn" }).click();
  let dialog = page.getByRole("dialog", { name: "Trợ lý VNWatch" });
  const question = "Casio của nước nào?";
  await dialog.getByRole("button", { name: question, exact: true }).click();
  await expect(dialog.locator(".assistant-copy").last()).toContainText(
    "Nhật Bản",
  );
  await expect(dialog.locator(".assistant-mode")).toHaveText(
    "Tư vấn theo dữ liệu",
  );
  const id = await dialog.getByLabel("Lịch sử hội thoại").inputValue();
  expect(id).toMatch(/^[0-9a-f-]{36}$/);
  await page.reload();
  await page.getByRole("button", { name: "Mở trợ lý tư vấn" }).click();
  dialog = page.getByRole("dialog", { name: "Trợ lý VNWatch" });
  await expect(dialog.getByLabel("Lịch sử hội thoại")).toHaveValue(id);
  await expect(dialog.locator(".assistant-copy").last()).toContainText(
    "Nhật Bản",
  );
  await dialog
    .getByRole("button", { name: "Hội thoại mới", exact: true })
    .click();
  await expect(dialog.locator(".assistant-turn")).toHaveCount(0);
  await dialog
    .getByLabel("Câu hỏi cho trợ lý")
    .fill("Gợi ý đồng hồ dưới 2 triệu");
  await dialog.getByRole("button", { name: "Gửi câu hỏi" }).click();
  await expect(dialog.locator(".assistant-copy")).toHaveCount(1);
  expect(await dialog.getByLabel("Lịch sử hội thoại").inputValue()).not.toBe(
    id,
  );
  await dialog.getByLabel("Lịch sử hội thoại").selectOption(id);
  await expect(dialog.locator(".assistant-copy").last()).toContainText(
    "Nhật Bản",
  );
  await dialog.getByRole("button", { name: "Kết thúc hội thoại" }).click();
  await expect(dialog.getByLabel("Câu hỏi cho trợ lý")).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => dialog.evaluate((el) => el.scrollWidth <= el.clientWidth))
    .toBe(true);
  await page.screenshot({ path: "../../work/chatbot-history-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "../../work/chatbot-history-desktop.png" });
});

test("lịch sử khách vãng lai không xuất hiện ở trình duyệt khác", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mở trợ lý tư vấn" }).click();
  const dialog = page.getByRole("dialog", { name: "Trợ lý VNWatch" });
  await dialog
    .getByRole("button", { name: "Casio của nước nào?", exact: true })
    .click();
  await expect(dialog.locator(".assistant-copy")).toHaveCount(1);
  const id = await dialog.getByLabel("Lịch sử hội thoại").inputValue();
  const other = await browser.newContext();
  try {
    const response = await other.request.get(
      `${new URL(page.url()).origin}/api/v1/assistant/conversations/${id}/messages`,
    );
    expect(response.status()).toBe(404);
  } finally {
    await other.close();
  }
});
