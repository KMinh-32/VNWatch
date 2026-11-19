/**
 * HỌC VNWATCH — outputs/vnwatch-backend/test/catalog.integration.test.ts
 * Kiểm thử tự động. Kiểm tra lọc cùng SKU, mẫu/SKU ACTIVE, phân trang, constraints và rollback. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import 'reflect-metadata';
import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/database/prisma.service';
import { demoIds, seedDemo } from '../src/database/demo-data';
import {
  ProductDto,
  ProductPageDto,
} from '../src/catalog/dto/product-response.dto';
import { setupSwagger } from '../src/openapi';

describe('Catalog / HTTP + real PostgreSQL', { concurrency: false }, () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService;
  let admin: Pool | undefined;
  let sql: Pool | undefined;
  const schema = 'vnwatch_it_' + randomUUID().replaceAll('-', '');
  const originalUrl = process.env.DATABASE_URL;
  const draftId = randomUUID();
  const noActiveSkuId = randomUUID();
  let schemaCreated = false;
  /** Tạo request test tới NestJS và đọc status/body để kiểm tra. */
  const http = () => request(app!.getHttpServer());

  // Chuẩn bị fixture/kết nối cho bộ kiểm thử; xem URL/schema riêng trước các thao tác ghi.
  before(async () => {
    const value = process.env.TEST_DATABASE_URL;
    assert.ok(
      value,
      'TEST_DATABASE_URL is required. These tests never fall back to DATABASE_URL.',
    );
    const url = new URL(value);
    assert.ok(
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname),
      'Tests require a loopback database.',
    );
    assert.ok(
      url.pathname.endsWith('_test'),
      'Test database name must end with _test.',
    );
    assert.match(schema, /^vnwatch_it_[a-f0-9]{32}$/);
    admin = new Pool({
      connectionString: value,
      connectionTimeoutMillis: 3000,
    });
    await admin.query(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    url.searchParams.set('schema', schema);
    process.env.DATABASE_URL = url.toString();
    const migration = spawnSync(
      process.execPath,
      ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
      { env: process.env, encoding: 'utf8', timeout: 60000 },
    );
    assert.equal(migration.status, 0, 'Migration failed: ' + migration.stderr);
    sql = new Pool({
      connectionString: value,
      options: `-c search_path=${schema}`,
      connectionTimeoutMillis: 3000,
    });
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    setupSwagger(app);
    await app.init();
    prisma = app.get(PrismaService);
    await seedDemo(prisma);
    await prisma.product.createMany({
      data: [
        {
          id: draftId,
          slug: 'draft-test',
          name: 'Draft test',
          brand: 'Test',
          category: 'dress',
          description: 'Test fixture',
          status: 'DRAFT',
        },
        {
          id: noActiveSkuId,
          slug: 'empty-test',
          name: 'Empty test',
          brand: 'Test',
          category: 'dress',
          description: 'Test fixture',
          status: 'ACTIVE',
        },
      ],
    });
    // A draft parent must stay hidden even when its SKU is ACTIVE.
    const copy = await prisma.productVariant.findUniqueOrThrow({
      where: { id: demoIds.black },
    });
    await prisma.productVariant.create({
      data: {
        ...copy,
        id: randomUUID(),
        productId: draftId,
        sku: 'TEST-DRAFT-ACTIVE',
      },
    });
  });

  // Cleanup kiểm thử: đóng ứng dụng/kết nối và dọn fixture để ca sau không kế thừa trạng thái.
  after(async () => {
    try {
      await app?.close();
    } finally {
      await sql?.end();
      if (schemaCreated) await admin?.query(`DROP SCHEMA "${schema}" CASCADE`);
      await admin?.end();
      if (originalUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = originalUrl;
    }
  });

  it('reads only active parents and active SKUs; exposes no exact internal stock', async () => {
    const response = await http().get('/api/v1/products').expect(200);
    const body = response.body as ProductPageDto;
    assert.equal(body.meta.total, 2);
    const everyday = body.data.find((p) => p.id === demoIds.everyday)!;
    assert.equal(everyday.variants.length, 2);
    assert.ok(everyday.variants.every((v) => !('stockQuantity' in v)));
    assert.ok(!('status' in everyday));
    assert.match(everyday.createdAt, /Z$/);
    assert.match(response.headers['x-request-id'] as string, /^[a-f0-9-]{36}$/);
  });

  it('keeps sold-out SKUs visible but marks inStock=false', async () => {
    const response = await http()
      .get('/api/v1/products/' + demoIds.automatic)
      .expect(200);
    const body = response.body as ProductDto;
    assert.equal(body.variants[0]!.inStock, false);
    assert.equal(body.variants[0]!.priceVnd, 4000000);
    assert.equal(body.variants[0]!.caseDiameterMm, '38.00');
  });

  it('filters prices on the same SKU and returns only matching SKUs', async () => {
    const response = await http()
      .get('/api/v1/products')
      .query({ minPriceVnd: 1400000, maxPriceVnd: 2000000 })
      .expect(200);
    const body = response.body as ProductPageDto;
    assert.equal(body.meta.total, 1);
    assert.deepEqual(
      body.data[0]!.variants.map((v) => v.sku),
      ['DEMO-EVERYDAY-BLACK'],
    );
    const gap = await http()
      .get('/api/v1/products')
      .query({ minPriceVnd: 2000000, maxPriceVnd: 3000000 })
      .expect(200);
    assert.equal((gap.body as ProductPageDto).meta.total, 0);
  });

  it('searches name/brand case-insensitively and handles literal SQL wildcards', async () => {
    const found = await http()
      .get('/api/v1/products')
      .query({ q: ' EVERYDAY ', category: 'DRESS' })
      .expect(200);
    assert.equal((found.body as ProductPageDto).meta.total, 1);
    for (const q of ['%', '_', '\\', "' OR 1=1 --"]) {
      const response = await http()
        .get('/api/v1/products')
        .query({ q })
        .expect(200);
      assert.equal((response.body as ProductPageDto).meta.total, 0);
    }
  });

  it('paginates deterministically with total metadata and bounded page size', async () => {
    const one = await http()
      .get('/api/v1/products?limit=1&page=1&sort=name_asc')
      .expect(200);
    const two = await http()
      .get('/api/v1/products?limit=1&page=2&sort=name_asc')
      .expect(200);
    const first = one.body as ProductPageDto;
    const second = two.body as ProductPageDto;
    assert.equal(first.meta.totalPages, 2);
    assert.notEqual(first.data[0]!.id, second.data[0]!.id);
    assert.equal(first.data[0]!.name, 'DEMO Automatic');
    const empty = await http()
      .get('/api/v1/products?page=3&limit=1')
      .expect(200);
    assert.deepEqual((empty.body as ProductPageDto).data, []);
  });

  it('sorts by the cheapest matching SKU and filters movement/availability on the same SKU', async () => {
    const ascending = await http()
      .get('/api/v1/products?sort=price_asc')
      .expect(200);
    const descending = await http()
      .get('/api/v1/products?sort=price_desc')
      .expect(200);
    assert.equal(ascending.body.data[0].name, 'DEMO Everyday');
    assert.equal(descending.body.data[0].name, 'DEMO Automatic');
    const automatic = await http()
      .get(
        '/api/v1/products?movementType=AUTOMATIC&inStock=false&sort=price_asc',
      )
      .expect(200);
    assert.equal(automatic.body.meta.total, 1);
    assert.equal(automatic.body.data[0].name, 'DEMO Automatic');
    const available = await http()
      .get('/api/v1/products?movementType=AUTOMATIC&inStock=true')
      .expect(200);
    assert.equal(available.body.meta.total, 0);
  });
  it('rejects invalid, unknown, duplicated and unbounded query parameters', async () => {
    for (const query of [
      'limit=51',
      'page=0',
      'page=1001',
      'page=1.5',
      'limit=1e1',
      'minPriceVnd=-1',
      'maxPriceVnd=2147483648',
      'sort=price_raw_sql',
      'unknown=1',
      'q=',
      'q=' + 'a'.repeat(101),
      'limit=1&limit=2',
      'q=a&q=b',
      'minPriceVnd=',
    ]) {
      const response = await http()
        .get('/api/v1/products?' + query)
        .expect(400);
      assert.equal(response.body.code, 'VALIDATION_ERROR');
      assert.ok(Array.isArray(response.body.details));
      assert.equal(response.body.requestId, response.headers['x-request-id']);
      assert.ok(!('stack' in response.body));
    }
  });

  it('rejects a reversed price range with a business error code', async () => {
    const response = await http()
      .get('/api/v1/products?minPriceVnd=200&maxPriceVnd=100')
      .expect(400);
    assert.equal(response.body.code, 'INVALID_PRICE_RANGE');
  });

  it('returns the same 404 for missing, draft, discontinued and empty products', async () => {
    for (const id of [randomUUID(), draftId, demoIds.archived, noActiveSkuId]) {
      const response = await http()
        .get('/api/v1/products/' + id)
        .expect(404);
      assert.equal(response.body.code, 'PRODUCT_NOT_FOUND');
    }
    await http().get('/api/v1/products/not-a-uuid').expect(400);
  });

  it('does not expose write endpoints before authentication/authorization exists', async () => {
    await http()
      .post('/api/v1/products')
      .send({ role: 'ADMIN', priceVnd: 1 })
      .expect(404);
    await http()
      .patch('/api/v1/products/' + demoIds.everyday)
      .send({ name: 'Changed' })
      .expect(404);
  });

  it('serves health and OpenAPI documenting the implemented API', async () => {
    await http().get('/api/v1/health/live').expect(200, { status: 'ok' });
    await http().get('/api/v1/health/ready').expect(200, { status: 'ok' });
    const doc = await http().get('/docs-json').expect(200);
    assert.ok(doc.body.paths['/api/v1/products']);
    assert.ok(doc.body.components.schemas.ProductDto);
  });

  it('database rejects negative price/stock and invalid specifications', async () => {
    for (const column of [
      'price_vnd',
      'stock_quantity',
      'case_diameter_mm',
      'water_resistance_m',
      'warranty_months',
    ]) {
      await assert.rejects(
        sql!.query(
          `UPDATE product_variants SET "${column}" = -1 WHERE id = $1`,
          [demoIds.black],
        ),
        { code: '23514' },
      );
    }
  });

  it('database enforces unique SKU, unique slug, FK and restricted deletion', async () => {
    await assert.rejects(
      sql!.query('UPDATE product_variants SET sku = $1 WHERE id = $2', [
        'DEMO-EVERYDAY-BLACK',
        demoIds.silver,
      ]),
      { code: '23505' },
    );
    await assert.rejects(
      sql!.query('UPDATE products SET slug = $1 WHERE id = $2', [
        'demo-everyday',
        demoIds.automatic,
      ]),
      { code: '23505' },
    );
    await assert.rejects(
      sql!.query('UPDATE product_variants SET product_id = $1 WHERE id = $2', [
        randomUUID(),
        demoIds.black,
      ]),
      { code: '23503' },
    );
    await assert.rejects(
      sql!.query('DELETE FROM products WHERE id = $1', [demoIds.everyday]),
      { code: '23503' },
    );
  });

  it('PostgreSQL rolls back earlier writes when a later constraint fails', async () => {
    const previous = await prisma.product.findUniqueOrThrow({
      where: { id: demoIds.everyday },
    });
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: demoIds.everyday },
          data: { name: 'Must roll back' },
        });
        await tx.productVariant.update({
          where: { id: demoIds.black },
          data: { stockQuantity: -1 },
        });
      }),
    );
    const next = await prisma.product.findUniqueOrThrow({
      where: { id: demoIds.everyday },
    });
    assert.equal(next.name, previous.name);
  });

  it('seed can run twice without duplicates or resetting changed fixture values', async () => {
    const before = await prisma.productVariant.count();
    await prisma.productVariant.update({
      where: { id: demoIds.black },
      data: { stockQuantity: 7 },
    });
    try {
      await seedDemo(prisma);
      assert.equal(await prisma.productVariant.count(), before);
      assert.equal(
        (
          await prisma.productVariant.findUniqueOrThrow({
            where: { id: demoIds.black },
          })
        ).stockQuantity,
        7,
      );
    } finally {
      await prisma.productVariant.update({
        where: { id: demoIds.black },
        data: { stockQuantity: 10 },
      });
    }
  });
});
