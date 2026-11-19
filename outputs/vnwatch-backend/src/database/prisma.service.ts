/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/database/prisma.service.ts
 * Dependency database dùng chung: tạo adapter PostgreSQL, kết nối khi module sẵn sàng và đóng pool khi dừng.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { databaseUrl } from '../config';

/** Service tập trung nghiệp vụ; các dependency được tiêm qua constructor để có thể kiểm thử độc lập. */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // NestJS tiêm các dependency được khai báo; private readonly vừa nhận tham số vừa tạo thuộc tính của lớp.
  constructor() {
    const connectionString = databaseUrl();
    super({
      adapter: new PrismaPg(
        {
          connectionString,
          max: 10,
          connectionTimeoutMillis: 3000,
          statement_timeout: 5000,
        },
        {
          schema:
            new URL(connectionString).searchParams.get('schema') ?? 'public',
        },
      ),
    });
  }

  /** Kết nối Prisma khi NestJS khởi tạo module. */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
  /** Đóng Prisma và pool PostgreSQL để tiến trình dừng sạch. */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
