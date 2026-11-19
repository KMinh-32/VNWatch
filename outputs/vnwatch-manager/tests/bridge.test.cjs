/**
 * HỌC VNWATCH — outputs/vnwatch-manager/tests/bridge.test.cjs
 * Kiểm thử tự động. Kiểm thử bridge desktop từ chối URL ngoài, path traversal, header sai, body lớn và key không hợp lệ. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { test } = require("node:test");
const { validateRequest, backendOrigin } = require("../dist/bridge");
const origin = backendOrigin();
/** Helper của bộ kiểm thử; đọc nơi gọi để thấy dữ liệu chuẩn bị và assertions mà helper hỗ trợ. */
const request = (patch = {}) => ({
  id: randomUUID(),
  path: "/management/reports",
  ...patch,
});
test("keeps requests on the fixed API origin and preserves idempotency/body", () => {
  const key = randomUUID();
  const value = validateRequest(
    request({
      path: "/orders/manage?archive=all",
      method: "POST",
      body: JSON.stringify({ items: [] }),
      authorization: "Bearer opaque_session",
      idempotencyKey: key,
    }),
    origin,
  );
  assert.equal(
    value.url,
    "http://127.0.0.1:5180/api/v1/orders/manage?archive=all",
  );
  assert.equal(value.idempotencyKey, key);
  assert.deepEqual(JSON.parse(value.body), { items: [] });
  assert.equal(
    validateRequest(
      request({ path: "/products?q=" + encodeURIComponent("Casio 100% _") }),
      origin,
    ).url,
    "http://127.0.0.1:5180/api/v1/products?q=Casio%20100%25%20_",
  );
});
test("rejects alternate origins, traversal, header injection and unsupported fields", () => {
  for (const path of [
    "https://example.com",
    "//example.com",
    "/../../docs",
    "/products/%2e%2e/%2e%2e/%2e%2e/docs",
    "/products/%2e%2e%2f%2e%2e/docs",
    "/products\\..\\users",
    "/products#admin",
    "/products\nInjected: yes",
  ])
    assert.throws(() => validateRequest(request({ path }), origin), path);
  for (const patch of [
    { headers: { Host: "attacker" } },
    { method: "CONNECT" },
    { id: "bad" },
    { authorization: "Bearer token\r\nHost: example.com" },
    { idempotencyKey: "bad" },
    { body: "{}" },
    { method: "POST", body: "not-json" },
    { method: "POST", body: JSON.stringify("x".repeat(262145)) },
  ])
    assert.throws(() => validateRequest(request(patch), origin));
});
test("test origins remain loopback and default remains the live local backend", () => {
  assert.equal(backendOrigin("http://127.0.0.1:5301"), "http://127.0.0.1:5301");
  for (const value of [
    "https://example.com",
    "http://localhost:5301",
    "http://127.0.0.1:80",
    "http://user:pass@127.0.0.1:5301",
    "http://127.0.0.1:5301/path",
    "http://127.0.0.1:5301?secret=x",
  ])
    assert.throws(() => backendOrigin(value));
});
