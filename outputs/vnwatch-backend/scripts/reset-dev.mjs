/**
 * HỌC VNWATCH — outputs/vnwatch-backend/scripts/reset-dev.mjs
 * Script reset database phát triển có điều kiện xác nhận môi trường; thao tác reset sẽ xóa dữ liệu, không dùng để học thử tùy tiện.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const url = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid');
if (
  process.env.NODE_ENV !== 'development' ||
  !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
  url.pathname !== '/vnwatch_dev' ||
  !process.argv.includes('--confirm=vnwatch_dev')
) {
  console.error(
    'Refusing reset. Requires local vnwatch_dev, NODE_ENV=development and --confirm=vnwatch_dev. This removes all data in the selected development schema.',
  );
  process.exit(1);
}
const result = spawnSync(
  process.execPath,
  ['node_modules/prisma/build/index.js', 'migrate', 'reset', '--force'],
  { stdio: 'inherit', env: process.env },
);
process.exit(result.status ?? 1);
