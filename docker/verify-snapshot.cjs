/**
 * HỌC VNWATCH — docker/verify-snapshot.cjs
 * Đối chiếu dữ liệu sau chuyển database bằng các kiểm tra số lượng và quan hệ.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
const { createRequire } = require("node:module");
const load = createRequire("/app/package.json");
const { Client } = load("pg");
const expected = require(process.argv[2]);
(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("SET TIME ZONE 'UTC'");
    const mismatches = [];
    for (const [name, fingerprint] of Object.entries(expected.fingerprints)) {
      const escaped = '"' + name.replace(/"/g, '""') + '"';
      const actual = (
        await client.query(
          "SELECT count(*)::int AS count, md5(coalesce(string_agg(to_jsonb(t)::text, '' ORDER BY to_jsonb(t)::text), '')) AS digest FROM public." +
            escaped +
            " t",
        )
      ).rows[0];
      if (
        actual.count !== fingerprint.count ||
        actual.digest !== fingerprint.digest
      )
        mismatches.push(name);
    }
    console.log(
      JSON.stringify({
        matchingTables:
          Object.keys(expected.fingerprints).length - mismatches.length,
        mismatches,
      }),
    );
    if (mismatches.length) process.exitCode = 1;
  } finally {
    await client.end();
  }
})().catch(() => {
  console.error("Snapshot verification failed");
  process.exitCode = 1;
});
