/**
 * HỌC VNWATCH — outputs/vnwatch-backend/test/demo-target.unit.test.ts
 * Kiểm thử tự động. Kiểm tra whitelist database/schema để script demo không chạy nhầm. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import assert from 'node:assert/strict';
import { it } from 'node:test';
import { isDemoDatabase } from '../src/database/demo-target';

it('demo seeding only allows development loopback or the explicitly enabled Compose target', () => {
  const oldMode = process.env.NODE_ENV;
  const oldFlag = process.env.VNWATCH_DOCKER_DEMO;
  /** Kiểm tra một URL database có thuộc whitelist demo. */
  const allowed = (address: string) => isDemoDatabase(new URL(address));
  try {
    process.env.NODE_ENV = 'development';
    delete process.env.VNWATCH_DOCKER_DEMO;
    assert.equal(allowed('postgresql://localhost:54329/vnwatch_dev'), true);
    assert.equal(allowed('postgresql://localhost:54329/vnwatch_live'), false);
    assert.equal(allowed('postgresql://db:5432/vnwatch_dev'), false);
    process.env.VNWATCH_DOCKER_DEMO = 'true';
    assert.equal(allowed('postgresql://db:5432/vnwatch_dev'), true);
    for (const address of [
      'postgresql://external:5432/vnwatch_dev',
      'postgresql://db:5433/vnwatch_dev',
      'postgresql://db:5432/vnwatch_live',
    ])
      assert.equal(allowed(address), false);
    process.env.NODE_ENV = 'production';
    assert.equal(allowed('postgresql://db:5432/vnwatch_dev'), false);
    assert.equal(allowed('postgresql://localhost:54329/vnwatch_dev'), false);
  } finally {
    if (oldMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldMode;
    if (oldFlag === undefined) delete process.env.VNWATCH_DOCKER_DEMO;
    else process.env.VNWATCH_DOCKER_DEMO = oldFlag;
  }
});
