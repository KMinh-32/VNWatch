/**
 * HỌC VNWATCH — outputs/vnwatch-backend/test/reference-catalog.integration.test.ts
 * Kiểm thử tự động. Kiểm tra catalog mẫu thật có nguồn và nguyên tắc nhập lại không ghi đè. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import assert from 'node:assert/strict';
import { before, after, describe, it } from 'node:test';
import request from 'supertest';
import { createAuthContext } from './helpers/auth-context';
import { seedDemo } from '../src/database/demo-data';
import { seedReference } from '../src/database/reference-data';
import { ProductPageDto } from '../src/catalog/dto/product-response.dto';

describe('Reference catalog / PostgreSQL', () => {
  let ctx: Awaited<ReturnType<typeof createAuthContext>>;
  // Chuẩn bị fixture/kết nối cho bộ kiểm thử; xem URL/schema riêng trước các thao tác ghi.
  before(async () => {
    ctx = await createAuthContext();
    await seedDemo(ctx.prisma);
    await seedReference(ctx.prisma);
  });
  // Cleanup kiểm thử: đóng ứng dụng/kết nối và dọn fixture để ca sau không kế thừa trạng thái.
  after(async () => {
    if (ctx) await ctx.close();
  });
  /** Tạo request test tới NestJS và đọc status/body để kiểm tra. */
  const http = () => request(ctx.app.getHttpServer());

  it('isolates real products, returns provenance and filters exact brands with price bounds', async () => {
    const response = await http()
      .get('/api/v1/products?dataKind=REFERENCE')
      .expect(200);
    const page = response.body as ProductPageDto;
    assert.equal(page.meta.total, 10);
    assert.equal(new Set(page.data.map((p) => p.brand)).size, 5);
    for (const p of page.data) {
      assert.equal(p.dataKind, 'REFERENCE');
      assert.ok(p.sourceUrl?.startsWith('https://'));
      assert.ok(p.imageUrls[0]?.startsWith('https://'));
      assert.ok(p.sourceCheckedAt);
      const variant = p.variants[0];
      assert.ok(variant);
      assert.ok(variant.priceSourceUrl);
      assert.equal(variant.inStock, false);
      assert.equal(variant.warrantyMonths, null);
    }
    const casio = await http()
      .get(
        '/api/v1/products?dataKind=REFERENCE&brand=casio&maxPriceVnd=2000000',
      )
      .expect(200);
    assert.equal(casio.body.meta.total, 1);
    assert.equal(casio.body.data[0].variants[0].sku, 'AE-1200WHD-1AV');
    const wildcard = await http()
      .get('/api/v1/products?dataKind=REFERENCE&brand=Cas%25')
      .expect(200);
    assert.equal(wildcard.body.meta.total, 0);
    const demo = await http().get('/api/v1/products?dataKind=DEMO').expect(200);
    assert.equal(demo.body.meta.total, 2);
    await http().get('/api/v1/products?dataKind=OTHER').expect(400);
  });

  it('keeps rectangular dimensions separate from diameter and does not invent warranty', async () => {
    const casio = await http()
      .get('/api/v1/products/40000000-0000-4000-8000-000000000001')
      .expect(200);
    assert.equal(casio.body.variants[0].caseDiameterMm, null);
    assert.match(casio.body.variants[0].caseDimensionsMm, /45 × 42.1 × 12.5/);
    const bambino = await http()
      .get('/api/v1/products/40000000-0000-4000-8000-000000000008')
      .expect(200);
    assert.equal(bambino.body.variants[0].caseDiameterMm, '38.40');
    assert.equal(bambino.body.variants[0].warrantyMonths, null);
  });

  it('reimport preserves configured inventory, selling price and warranty without duplicates', async () => {
    const beforeCount = await ctx.prisma.product.count();
    await ctx.prisma.productVariant.update({
      where: { sku: 'NJ0150-81L' },
      data: { stockQuantity: 3, priceVnd: 7500000, warrantyMonths: 24 },
    });
    await seedReference(ctx.prisma);
    assert.equal(await ctx.prisma.product.count(), beforeCount);
    const variant = await ctx.prisma.productVariant.findUniqueOrThrow({
      where: { sku: 'NJ0150-81L' },
    });
    assert.equal(variant.stockQuantity, 3);
    assert.equal(variant.priceVnd, 7500000);
    assert.equal(variant.warrantyMonths, 24);
  });
});
