/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/database/seed.ts
 * Script khởi tạo catalog demo/tham khảo sau migration; kiểm tra đúng môi trường và luôn đóng kết nối sau khi chạy.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import 'dotenv/config';
import { PrismaService } from './prisma.service';
import { seedReference } from './reference-data';
import { seedDuyAnh } from './duy-anh-data';
import { databaseUrl } from '../config';
import { isDemoDatabase } from './demo-target';

/** Điểm chạy script: Script khởi tạo catalog demo/tham khảo sau migration; kiểm tra đúng môi trường và luôn đóng kết nối sau khi chạy. Đọc finally để thấy cách giải phóng kết nối/tài nguyên. */
async function main(): Promise<void> {
  const url = new URL(databaseUrl());
  if (!isDemoDatabase(url)) {
    throw new Error(
      'Demo seed requires a local development database or the explicitly enabled Compose demo database.',
    );
  }
  const prisma = new PrismaService();
  try {
    // Ngừng kinh doanh các mẫu DEMO cũ, giữ liên kết phục vụ lịch sử đơn hàng.
    await prisma.$transaction([
      prisma.productVariant.updateMany({
        where: { product: { dataKind: 'DEMO' } },
        data: { status: 'DISCONTINUED' },
      }),
      prisma.product.updateMany({
        where: { dataKind: 'DEMO' },
        data: { status: 'DISCONTINUED' },
      }),
    ]);
    await seedReference(prisma, 100);
    await seedDuyAnh(prisma, 100);
    console.log(
      'Catalog sản phẩm thật và sản phẩm Duy Anh đã được nhập. SKU hiện có giữ nguyên. SKU mới có tồn giả lập 100.',
    );
  } finally {
    await prisma.$disconnect();
  }
}
void main().catch(() => {
  console.error(
    'Demo seed failed. Check the development database, configuration and migrations.',
  );
  process.exitCode = 1;
});
