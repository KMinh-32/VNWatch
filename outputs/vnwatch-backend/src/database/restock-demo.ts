/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/database/restock-demo.ts
 * Script nhập tồn cho môi trường demo và lưu bằng chứng thay đổi. Không chạy script này chỉ để đọc/học mã nguồn.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import 'dotenv/config';
import { PrismaService } from './prisma.service';
import { databaseUrl } from '../config';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Điểm chạy script: Script nhập tồn cho môi trường demo và lưu bằng chứng thay đổi. Không chạy script này chỉ để đọc/học mã nguồn. Đọc finally để thấy cách giải phóng kết nối/tài nguyên. */
async function main(): Promise<void> {
  const url = new URL(databaseUrl());
  if (
    process.env.NODE_ENV !== 'development' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    !url.pathname.endsWith('_dev') ||
    (url.searchParams.get('schema') ?? 'public') !== 'public'
  )
    throw new Error(
      'Restocking requires the local development database, public schema.',
    );
  const prisma = new PrismaService();
  try {
    const inventory = await prisma.$transaction(async (tx) => {
      const before = await tx.productVariant.findMany({
        orderBy: { sku: 'asc' },
        select: { id: true, sku: true, stockQuantity: true },
      });
      await tx.productVariant.updateMany({
        where: { id: { in: before.map((v) => v.id) } },
        data: { stockQuantity: 100 },
      });
      return before.map((v) => ({
        id: v.id,
        sku: v.sku,
        previousQuantity: v.stockQuantity,
        newQuantity: 100,
      }));
    });
    const directory = join(process.cwd(), 'work', 'inventory-updates');
    await mkdir(directory, { recursive: true });
    const checkedAt = new Date().toISOString();
    await writeFile(
      join(directory, `${checkedAt.replaceAll(':', '-')}.json`),
      JSON.stringify(
        {
          action: 'USER_REQUESTED_DEMO_STOCK_100',
          checkedAt,
          inventory,
        },
        null,
        2,
      ),
      { flag: 'wx' },
    );
    console.log(
      `Set ${inventory.length} product variants to 100 units of simulated stock. Existing prices, users and orders preserved.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(() => {
  console.error(
    'Restocking failed. Check local development configuration and database.',
  );
  process.exitCode = 1;
});
