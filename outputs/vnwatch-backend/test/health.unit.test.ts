/**
 * HỌC VNWATCH — outputs/vnwatch-backend/test/health.unit.test.ts
 * Kiểm thử tự động. Kiểm tra liveness/readiness khi database hoạt động hoặc lỗi. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { it } from 'node:test';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from '../src/health/health.controller';
import { PrismaService } from '../src/database/prisma.service';

it('readiness fails when the DB fails while liveness remains healthy', async () => {
  const failingDb = {
    $queryRaw: async () => {
      throw new Error('sensitive connection details');
    },
  };
  const controller = new HealthController(
    failingDb as unknown as PrismaService,
  );
  assert.deepEqual(controller.live(), { status: 'ok' });
  await assert.rejects(controller.ready(), ServiceUnavailableException);
});
