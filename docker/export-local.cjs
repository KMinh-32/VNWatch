/**
 * HỌC VNWATCH — docker/export-local.cjs
 * Xuất snapshot từ database local và ghi metadata phục vụ chuyển dữ liệu sang Docker.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
// Export a consistent, read-only snapshot of the existing Windows demo.
const fs = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const sourceRoot = process.argv[2] ? path.resolve(process.argv[2]) : root;
const backend = path.join(sourceRoot, "outputs/vnwatch-backend");
const config = require(path.join(backend, "node_modules/dotenv")).parse(
  require("node:fs").readFileSync(path.join(backend, ".env")),
);
const { Client } = require(path.join(backend, "node_modules/pg"));
const url = new URL(config.DATABASE_URL);
if (process.env.VNWATCH_EXPORT_PORT) {
  if (!/^\d{1,5}$/.test(process.env.VNWATCH_EXPORT_PORT))
    throw new Error("Invalid export port");
  url.port = process.env.VNWATCH_EXPORT_PORT;
  config.DATABASE_URL = url.toString();
}
if (
  !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
  url.pathname !== "/vnwatch_dev"
)
  throw new Error("Export is restricted to the local vnwatch_dev database.");
(async () => {
  const folder = path.join(root, "docker/backups");
  await fs.mkdir(folder, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const archive = path.join(folder, "windows-" + stamp + ".dump");
  const client = new Client({ connectionString: config.DATABASE_URL });
  await client.connect();
  try {
    await client.query("SET TIME ZONE 'UTC'");
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const snapshot = (await client.query("SELECT pg_export_snapshot() AS id"))
      .rows[0].id;
    const names = (
      await client.query(
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
      )
    ).rows.map((r) => r.tablename);
    const fingerprints = {};
    for (const name of names) {
      const escaped = '"' + name.replace(/"/g, '""') + '"';
      fingerprints[name] = (
        await client.query(
          "SELECT count(*)::int AS count, md5(coalesce(string_agg(to_jsonb(t)::text, '' ORDER BY to_jsonb(t)::text), '')) AS digest FROM public." +
            escaped +
            " t",
        )
      ).rows[0];
    }
    const exe =
      process.env.PG_DUMP_EXE ||
      "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe";
    await new Promise((resolve, reject) => {
      const proc = spawn(
        exe,
        [
          "--host",
          url.hostname,
          "--port",
          url.port || "5432",
          "--username",
          decodeURIComponent(url.username),
          "--dbname",
          "vnwatch_dev",
          "--format=custom",
          "--schema=public",
          "--no-owner",
          "--no-acl",
          "--snapshot",
          snapshot,
          "--file",
          archive,
        ],
        {
          windowsHide: true,
          env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) },
          stdio: ["ignore", "ignore", "pipe"],
        },
      );
      proc.on("error", reject);
      proc.stderr.resume();
      proc.on("exit", (code) =>
        code === 0 ? resolve() : reject(new Error("Database export failed.")),
      );
    });
    await client.query("COMMIT");
    await fs.writeFile(
      archive + ".json",
      JSON.stringify(
        {
          archive: path.basename(archive),
          createdAt: new Date().toISOString(),
          fingerprints,
        },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify({
        archive,
        tables: names.length,
        users: fingerprints.users.count,
        products: fingerprints.products.count,
        orders: fingerprints.orders.count,
      }),
    );
  } finally {
    await client.end();
  }
})().catch(() => {
  console.error("Local snapshot failed. Original database was not modified.");
  process.exitCode = 1;
});
