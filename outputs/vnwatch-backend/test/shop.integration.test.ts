/**
 * HỌC VNWATCH — outputs/vnwatch-backend/test/shop.integration.test.ts
 * Kiểm thử tự động. Kiểm tra giỏ riêng, yêu thích, địa chỉ, giảm giá, bảo hành, hỗ trợ, đánh giá và optimistic update. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createAuthContext } from './helpers/auth-context';
import { seedDemo, demoIds } from '../src/database/demo-data';
import { randomToken, tokenHash } from '../src/auth/tokens';

describe(
  'Shopping account and management / real PostgreSQL',
  { concurrency: false },
  () => {
    let context: Awaited<ReturnType<typeof createAuthContext>>;
    const ids = Array.from({ length: 24 }, () => randomUUID());
    const tokens = ids.map(() => randomToken());
    /** Tạo request test tới NestJS và đọc status/body để kiểm tra. */
    const http = () => request(context.app.getHttpServer());
    /** Gắn danh tính/token fixture cho request test. */
    const as = (
      n: number,
      method: 'get' | 'put' | 'post' | 'patch' | 'delete',
      path: string,
    ) => {
      const client = http();
      return client[method](`/api/v1${path}`).set(
        'Authorization',
        `Bearer ${tokens[n]}`,
      );
    };
    // Chuẩn bị fixture/kết nối cho bộ kiểm thử; xem URL/schema riêng trước các thao tác ghi.
    before(async () => {
      context = await createAuthContext();
      await seedDemo(context.prisma, 100);
      await context.prisma.user.createMany({
        data: ids.map((id, i) => ({
          id,
          email: `shop-${i}@example.test`,
          displayName: `Shop fixture ${i}`,
          passwordHash: 'unused',
          role: i === 0 ? 'ADMIN' : i === 1 ? 'STAFF' : 'CUSTOMER',
        })),
      });
      await context.prisma.userSession.createMany({
        data: ids.map((id, i) => ({
          userId: id,
          tokenHash: tokenHash(tokens[i]!),
          expiresAt: new Date(Date.now() + 3600000),
        })),
      });
    });
    // Cleanup kiểm thử: đóng ứng dụng/kết nối và dọn fixture để ca sau không kế thừa trạng thái.
    after(async () => {
      await context?.close();
    });
    it('cart requires current session, is account-owned and serializes simultaneous adds', async () => {
      await http()
        .put('/api/v1/shop/cart')
        .send({ variantId: demoIds.black, mode: 'ADD', quantity: 1 })
        .expect(401);
      const result = await Promise.all(
        Array.from({ length: 10 }, () =>
          as(2, 'put', '/shop/cart').send({
            variantId: demoIds.black,
            mode: 'ADD',
            quantity: 1,
          }),
        ),
      );
      assert.ok(result.every((r) => r.status === 200));
      assert.equal((await as(2, 'get', '/shop/cart')).body[0].quantity, 10);
      assert.deepEqual((await as(3, 'get', '/shop/cart')).body, []);
      await as(2, 'put', '/shop/cart')
        .send({
          variantId: demoIds.black,
          mode: 'SET',
          quantity: 99,
          userId: ids[3],
        })
        .expect(400);
      await as(2, 'put', '/shop/cart')
        .send({ variantId: demoIds.black, mode: 'SET', quantity: 0 })
        .expect(200);
      await context.prisma.userSession.updateMany({
        where: { userId: ids[23] },
        data: { revokedAt: new Date() },
      });
      await as(23, 'put', '/shop/cart')
        .send({ variantId: demoIds.black, mode: 'ADD', quantity: 1 })
        .expect(401);
    });
    it('favorites and addresses persist separately and cannot delete another account address', async () => {
      await as(2, 'put', `/shop/favorites/${demoIds.everyday}`).expect(200);
      assert.equal((await as(2, 'get', '/shop/favorites')).body.length, 1);
      assert.deepEqual((await as(3, 'get', '/shop/favorites')).body, []);
      const a = await as(2, 'post', '/shop/addresses')
        .send({
          label: 'Nhà demo',
          recipientName: 'Khách Demo',
          phone: '0901234567',
          address: '123 Đường Demo, Phường Demo',
        })
        .expect(201);
      await as(3, 'delete', `/shop/addresses/${a.body.id}`).expect(404);
      assert.equal((await as(2, 'get', '/shop/addresses')).body.length, 1);
      await as(2, 'delete', `/shop/addresses/${a.body.id}`).expect(200);
    });
    it('only admin edits catalog, writes audit, stale stock corrections cannot overwrite a change', async () => {
      const product = await context.prisma.product.findUniqueOrThrow({
        where: { id: demoIds.everyday },
      });
      const body = {
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        category: product.category,
        description: product.description,
        status: product.status,
        expectedUpdatedAt: product.updatedAt.toISOString(),
        reason: 'Kiểm thử sửa sản phẩm',
      };
      await as(2, 'patch', `/management/products/${product.id}`)
        .send(body)
        .expect(403);
      await as(1, 'patch', `/management/products/${product.id}`)
        .send(body)
        .expect(403);
      await as(0, 'patch', `/management/products/${product.id}`)
        .send(body)
        .expect(200);
      await as(0, 'patch', `/management/products/${product.id}`)
        .send(body)
        .expect(409);
      const v = await context.prisma.productVariant.findUniqueOrThrow({
        where: { id: demoIds.silver },
      });
      const correction = {
        label: v.label,
        priceVnd: v.priceVnd,
        stockQuantity: 100,
        status: v.status,
        movementType: v.movementType,
        caseDiameterMm: Number(v.caseDiameterMm),
        caseMaterial: v.caseMaterial,
        crystalMaterial: v.crystalMaterial,
        strapMaterial: v.strapMaterial,
        waterResistanceM: v.waterResistanceM,
        warrantyMonths: v.warrantyMonths,
        expectedUpdatedAt: v.updatedAt.toISOString(),
        expectedStockQuantity: v.stockQuantity,
        reason: 'Kiểm thử điều chỉnh tồn',
      };
      await context.prisma.productVariant.update({
        where: { id: v.id },
        data: { stockQuantity: { decrement: 1 } },
      });
      await as(0, 'patch', `/management/variants/${v.id}`)
        .send(correction)
        .expect(409);
      assert.equal(
        (
          await context.prisma.productVariant.findUniqueOrThrow({
            where: { id: v.id },
          })
        ).stockQuantity,
        99,
      );
      assert.ok(
        (await context.prisma.businessAudit.count({
          where: { action: 'PRODUCT_UPDATE' },
        })) > 0,
      );
      await as(2, 'get', '/management/reports').expect(403);
      await as(1, 'get', '/management/reports').expect(403);
      const report = await as(0, 'get', '/management/reports').expect(200);
      assert.equal(report.body.paidRevenueVnd, 0);
    });
    it('last promotion use is atomic with stock/order/cart; retry consumes no second use', async () => {
      const promo = await as(0, 'post', '/management/promotions')
        .send({
          code: 'SHOPLAST',
          amountVnd: 100000,
          minSubtotalVnd: 1000000,
          maxUses: 1,
          perUserLimit: 1,
          startsAt: new Date(Date.now() - 60000).toISOString(),
          endsAt: new Date(Date.now() + 3600000).toISOString(),
          reason: 'Kiểm thử cạnh tranh lượt mã',
        })
        .expect(201);
      const results = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          as(i + 2, 'post', '/orders')
            .set('Idempotency-Key', randomUUID())
            .send({
              items: [{ variantId: demoIds.black, quantity: 1 }],
              recipientName: 'Khách Demo',
              phone: '0901234567',
              address: '123 Đường Demo, Phường Demo',
              expectedTotalVnd: 1430000,
              promotionCode: 'SHOPLAST',
            }),
        ),
      );
      assert.equal(results.filter((r) => r.status === 201).length, 1);
      assert.equal(results.filter((r) => r.status === 409).length, 19);
      assert.equal(
        await context.prisma.promotionUse.count({
          where: { promotionId: promo.body.id },
        }),
        1,
      );
      const paid = results.find((r) => r.status === 201)!;
      assert.equal(paid.body.discountVnd, 100000);
      assert.equal(paid.body.totalVnd, 1430000);
      const winner = results.findIndex((r) => r.status === 201) + 2;
      const existing = await context.prisma.order.findUniqueOrThrow({
        where: { id: paid.body.id },
      });
      await as(winner, 'post', '/orders')
        .set('Idempotency-Key', existing.idempotencyKey)
        .send({
          items: [{ variantId: demoIds.black, quantity: 1 }],
          recipientName: 'Khách Demo',
          phone: '0901234567',
          address: '123 Đường Demo, Phường Demo',
          expectedTotalVnd: 1430000,
          promotionCode: 'SHOPLAST',
        })
        .expect(201);
      assert.equal(
        await context.prisma.promotionUse.count({
          where: { promotionId: promo.body.id },
        }),
        1,
      );
      await as(winner, 'post', `/orders/${paid.body.id}/cancel`)
        .send({ reason: 'Hủy đơn kiểm thử khuyến mãi' })
        .expect(201);
      assert.equal(
        await context.prisma.promotionUse.count({
          where: { promotionId: promo.body.id },
        }),
        1,
      );
      assert.equal(
        (
          await context.prisma.productVariant.findUniqueOrThrow({
            where: { id: demoIds.black },
          })
        ).stockQuantity,
        100,
      );
    });
    it('support is owner-scoped and admin reply/status has audit without customer escalation', async () => {
      const ticket = await as(2, 'post', '/shop/tickets')
        .send({
          kind: 'GENERAL',
          subject: 'Hỏi thông tin sản phẩm',
          body: 'Tôi cần tư vấn về kích thước đồng hồ.',
        })
        .expect(201);
      await as(3, 'post', `/shop/tickets/${ticket.body.id}/replies`)
        .send({ body: 'Không có quyền đọc yêu cầu này' })
        .expect(404);
      await as(2, 'post', `/shop/tickets/${ticket.body.id}/replies`)
        .send({ body: 'Khách tự đóng yêu cầu', status: 'RESOLVED' })
        .expect(403);
      await as(1, 'post', `/management/tickets/${ticket.body.id}/replies`)
        .send({ body: 'Nhân viên không có quyền quản trị' })
        .expect(403);
      await as(0, 'post', `/management/tickets/${ticket.body.id}/replies`)
        .send({
          body: 'Đã phản hồi tư vấn kích thước cho khách.',
          status: 'RESOLVED',
        })
        .expect(201);
      assert.equal(
        (await as(2, 'get', '/shop/tickets')).body.data[0].messages.length,
        2,
      );
      assert.deepEqual((await as(3, 'get', '/shop/tickets')).body.data, []);
      await as(2, 'post', `/shop/tickets/${ticket.body.id}/replies`)
        .send({ body: 'Phản hồi vào yêu cầu đã đóng' })
        .expect(409);
    });
    it('dashboard ticket filters include both open states, count before paging and preserve ownership', async () => {
      const fixtureIds: string[] = [];
      for (const status of [
        'OPEN',
        'IN_REVIEW',
        'RESOLVED',
        'REJECTED',
      ] as const) {
        const ticket = await context.prisma.supportTicket.create({
          data: {
            userId: ids[3]!,
            kind: 'GENERAL',
            subject: 'Navigation filter fixture',
            status,
          },
        });
        fixtureIds.push(ticket.id);
      }
      try {
        const open = await as(
          0,
          'get',
          '/management/tickets?state=open&limit=1',
        ).expect(200);
        assert.equal(open.body.meta.total, 2);
        assert.equal(open.body.meta.totalPages, 2);
        assert.equal(open.body.data.length, 1);
        assert.ok(['OPEN', 'IN_REVIEW'].includes(open.body.data[0].status));
        const second = await as(
          0,
          'get',
          '/management/tickets?state=open&limit=1&page=2',
        ).expect(200);
        assert.notEqual(second.body.data[0].id, open.body.data[0].id);
        const closed = await as(
          0,
          'get',
          '/management/tickets?state=closed',
        ).expect(200);
        assert.ok(
          closed.body.data.every((t: { status: string }) =>
            ['RESOLVED', 'REJECTED'].includes(t.status),
          ),
        );
        assert.equal(
          (await as(0, 'get', '/management/reports')).body.openTickets,
          open.body.meta.total,
        );
        assert.equal((await as(2, 'get', '/shop/tickets')).body.data.length, 1);
        await as(2, 'get', '/shop/tickets?state=open').expect(400);
        await as(0, 'get', '/management/tickets?state=invalid').expect(400);
        await as(1, 'get', '/management/tickets?state=open').expect(403);
      } finally {
        await context.prisma.supportTicket.deleteMany({
          where: { id: { in: fixtureIds } },
        });
      }
    });
    it('dashboard stock filter combines product status with search and pages matching products', async () => {
      const product = await context.prisma.product.findUniqueOrThrow({
        where: { id: demoIds.everyday },
      });
      await context.prisma.product.update({
        where: { id: product.id },
        data: { status: 'DRAFT' },
      });
      try {
        const matching = await as(
          0,
          'get',
          '/management/products?q=' + encodeURIComponent(product.name),
        ).expect(200);
        assert.ok(
          matching.body.data.some((p: { id: string }) => p.id === product.id),
        );
        const active = await as(
          0,
          'get',
          '/management/products?status=ACTIVE&q=' +
            encodeURIComponent(product.name),
        ).expect(200);
        assert.equal(active.body.meta.total, 0);
        assert.deepEqual(active.body.data, []);
        const draft = await as(
          0,
          'get',
          '/management/products?status=DRAFT&limit=1',
        ).expect(200);
        assert.equal(draft.body.meta.total, 1);
        assert.equal(draft.body.data[0].id, product.id);
        await as(0, 'get', '/management/products?status=invalid').expect(400);
        await as(1, 'get', '/management/products?status=ACTIVE').expect(403);
      } finally {
        await context.prisma.product.update({
          where: { id: product.id },
          data: { status: product.status },
        });
      }
    });
    it('rejects an oversized subtotal even when a discount would bring the total below the database limit', async () => {
      const variant = await context.prisma.productVariant.findUniqueOrThrow({
        where: { id: demoIds.black },
      });
      await context.prisma.promotion.create({
        data: {
          code: 'SHOPINT',
          amountVnd: 100000000,
          minSubtotalVnd: 0,
          maxUses: 10,
          perUserLimit: 1,
          startsAt: new Date(Date.now() - 60000),
          endsAt: new Date(Date.now() + 3600000),
        },
      });
      const beforeOrders = await context.prisma.order.count();
      await context.prisma.productVariant.update({
        where: { id: demoIds.black },
        data: { priceVnd: 23000000 },
      });
      try {
        const items = [{ variantId: demoIds.black, quantity: 94 }];
        const quote = await as(5, 'post', '/orders/quote')
          .send({ items, promotionCode: 'SHOPINT' })
          .expect(400);
        assert.equal(quote.body.code, 'ORDER_TOTAL_TOO_LARGE');
        await as(5, 'post', '/orders')
          .set('Idempotency-Key', randomUUID())
          .send({
            items,
            promotionCode: 'SHOPINT',
            recipientName: 'Khách Demo',
            phone: '0901234567',
            address: '123 Đường Demo, Phường Demo',
            expectedTotalVnd: 2062030000,
          })
          .expect(400);
        assert.equal(await context.prisma.order.count(), beforeOrders);
        assert.equal(
          await context.prisma.promotionUse.count({
            where: { promotion: { code: 'SHOPINT' } },
          }),
          0,
        );
        assert.equal(
          (
            await context.prisma.productVariant.findUniqueOrThrow({
              where: { id: demoIds.black },
            })
          ).stockQuantity,
          variant.stockQuantity,
        );
      } finally {
        await context.prisma.productVariant.update({
          where: { id: demoIds.black },
          data: { priceVnd: variant.priceVnd },
        });
      }
    });
    it('reviews require completed purchases and warranties activate from the immutable sale snapshot', async () => {
      await as(4, 'put', `/shop/reviews/${demoIds.everyday}`)
        .send({ rating: 5, body: 'Không được đánh giá khi chưa mua.' })
        .expect(409);
      await as(4, 'put', '/shop/cart')
        .send({ variantId: demoIds.black, mode: 'ADD', quantity: 2 })
        .expect(200);
      const order = await as(4, 'post', '/orders')
        .set('Idempotency-Key', randomUUID())
        .send({
          items: [{ variantId: demoIds.black, quantity: 1 }],
          recipientName: 'Khách Demo',
          phone: '0901234567',
          address: '123 Đường Demo, Phường Demo',
          expectedTotalVnd: 1530000,
        })
        .expect(201);
      assert.equal((await as(4, 'get', '/shop/cart')).body[0].quantity, 1);
      assert.deepEqual((await as(4, 'get', '/shop/warranties')).body, []);
      for (const action of ['CONFIRM', 'SHIP', 'COMPLETE'])
        await as(0, 'post', `/orders/${order.body.id}/actions`)
          .send({ action, reason: 'Biên nhận thử nghiệm SH-0001' })
          .expect(201);
      const review = await as(4, 'put', `/shop/reviews/${demoIds.everyday}`)
        .send({ rating: 5, body: 'Đánh giá kiểm thử từ đơn đã nhận hàng.' })
        .expect(200);
      const reviews = await http()
        .get(`/api/v1/shop/reviews/${demoIds.everyday}`)
        .expect(200);
      assert.equal(reviews.body.data[0].verifiedPurchase, true);
      assert.equal(reviews.body.averageRating, 5);
      await as(0, 'patch', `/management/reviews/${review.body.id}`)
        .send({ hidden: true, reason: 'Ẩn đánh giá kiểm thử' })
        .expect(200);
      assert.equal(
        (await http().get(`/api/v1/shop/reviews/${demoIds.everyday}`)).body.data
          .length,
        0,
      );
      const cards = await as(4, 'get', '/shop/warranties').expect(200);
      assert.equal(cards.body.length, 1);
      assert.equal(cards.body[0].serial, null);
      assert.deepEqual((await as(5, 'get', '/shop/warranties')).body, []);
      await as(5, 'post', '/shop/tickets')
        .send({
          kind: 'WARRANTY',
          subject: 'Bảo hành không thuộc quyền',
          body: 'Cố truy cập bảo hành của người khác.',
          orderItemId: cards.body[0].id,
        })
        .expect(409);
      await as(4, 'post', '/shop/tickets')
        .send({
          kind: 'WARRANTY',
          subject: 'Yêu cầu kiểm tra bảo hành',
          body: 'Đồng hồ demo cần được kiểm tra theo bảo hành.',
          orderItemId: cards.body[0].id,
        })
        .expect(201);
      await as(4, 'post', '/shop/tickets')
        .send({
          kind: 'WARRANTY',
          subject: 'Gửi trùng yêu cầu bảo hành',
          body: 'Không tạo thêm yêu cầu khi đang có yêu cầu mở.',
          orderItemId: cards.body[0].id,
        })
        .expect(409);
      const report = await as(0, 'get', '/management/reports').expect(200);
      assert.equal(report.body.paidRevenueVnd, 1530000);
      assert.equal(report.body.completedOrders, 1);
    });
  },
);
