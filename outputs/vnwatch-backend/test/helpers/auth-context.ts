/**
 * HỌC VNWATCH — outputs/vnwatch-backend/test/helpers/auth-context.ts
 * Kiểm thử tự động. Fixture chuẩn bị danh tính/dữ liệu riêng để xác nhận hành vi API. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import 'reflect-metadata';
import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { Controller, Get } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';
import { PrismaService } from '../../src/database/prisma.service';
import { ResetDelivery, ResetMail } from '../../src/auth/reset-delivery';
import { setupSwagger } from '../../src/openapi';

export class MemoryResetDelivery extends ResetDelivery {
  messages: ResetMail[] = [];
  fail = false;
  /** Helper của bộ kiểm thử; đọc nơi gọi để thấy dữ liệu chuẩn bị và assertions mà helper hỗ trợ. */
  async send(message: ResetMail): Promise<void> {
    if (this.fail) throw new Error('Simulated local delivery failure');
    this.messages.push(message);
  }
}

@Controller('test-protected')
class DefaultDenyProbe {
  /** GET /api/v1/test-protected. Helper của bộ kiểm thử; đọc nơi gọi để thấy dữ liệu chuẩn bị và assertions mà helper hỗ trợ. */
  @Get() read() {
    return { ok: true };
  }
}

/** Helper của bộ kiểm thử; đọc nơi gọi để thấy dữ liệu chuẩn bị và assertions mà helper hỗ trợ. */
export async function createAuthContext() {
  const value = process.env.TEST_DATABASE_URL;
  assert.ok(value, 'TEST_DATABASE_URL is required');
  const url = new URL(value);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  assert.ok(url.pathname.endsWith('_test'));
  const schema = 'vnwatch_it_' + randomUUID().replaceAll('-', '');
  assert.match(schema, /^vnwatch_it_[a-f0-9]{32}$/);
  const originalUrl = process.env.DATABASE_URL;
  const admin = new Pool({
    connectionString: value,
    connectionTimeoutMillis: 3000,
  });
  await admin.query(`CREATE SCHEMA "${schema}"`);
  url.searchParams.set('schema', schema);
  process.env.DATABASE_URL = url.toString();
  const delivery = new MemoryResetDelivery();
  try {
    const migration = spawnSync(
      process.execPath,
      ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
      { env: process.env, encoding: 'utf8', timeout: 60000 },
    );
    assert.equal(migration.status, 0, 'Migration failed: ' + migration.stderr);
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [DefaultDenyProbe],
    })
      .overrideProvider(ResetDelivery)
      .useValue(delivery)
      .compile();
    const app = module.createNestApplication({ logger: false });
    configureApp(app);
    setupSwagger(app);
    await app.init();
    const sql = new Pool({
      connectionString: value,
      options: `-c search_path=${schema}`,
      connectionTimeoutMillis: 3000,
    });
    return {
      app,
      delivery,
      sql,
      prisma: app.get(PrismaService),
      close: async () => {
        try {
          await app.close();
        } finally {
          await sql.end();
          await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
          await admin.end();
          if (originalUrl === undefined) delete process.env.DATABASE_URL;
          else process.env.DATABASE_URL = originalUrl;
        }
      },
    };
  } catch (error) {
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    throw error;
  }
}
