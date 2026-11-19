/**
 * HỌC VNWATCH — docker/test-backend.cjs
 * Chạy bộ kiểm thử backend trong môi trường Docker riêng và thu thập kết quả, không seed/reset database cửa hàng.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
const { spawnSync } = require("node:child_process");
const { Client } = require("/app/node_modules/pg");
(async () => {
  const url = new URL(process.env.DATABASE_URL);
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/vnwatch_dev")
    throw new Error("Requires the database container network namespace.");
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  try {
    if (
      !(
        await client.query(
          "SELECT 1 FROM pg_database WHERE datname='vnwatch_test'",
        )
      ).rowCount
    )
      await client.query("CREATE DATABASE vnwatch_test");
  } finally {
    await client.end();
  }
  url.pathname = "/vnwatch_test";
  const result = spawnSync("npm", ["test"], {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "test",
      TEST_DATABASE_URL: url.toString(),
      DATABASE_URL: url.toString(),
    },
  });
  process.exitCode = result.status ?? 1;
})().catch(() => {
  console.error("Isolated Docker test setup failed");
  process.exitCode = 1;
});
