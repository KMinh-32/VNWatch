/**
 * HỌC VNWATCH — outputs/vnwatch-backend/test/orders.integration.test.ts
 * Kiểm thử tự động. Kiểm tra snapshot giá, quyền sở hữu, idempotency, tạo đơn đồng thời, trừ/hoàn tồn và chuyển trạng thái. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import assert from 'node:assert/strict';
import { before, beforeEach, after, describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createAuthContext } from './helpers/auth-context';
import { seedDemo, demoIds } from '../src/database/demo-data';
import { seedReference } from '../src/database/reference-data';
import { OrdersService } from '../src/orders/orders.service';
import { Principal } from '../src/auth/auth.types';
import { randomToken, tokenHash } from '../src/auth/tokens';
import { HttpException } from '@nestjs/common';

describe(
  'COD orders / HTTP + real PostgreSQL transactions',
  { concurrency: false },
  () => {
    let context: Awaited<ReturnType<typeof createAuthContext>>;
    let service: OrdersService;
    const users = Array.from({ length: 100 }, () => randomUUID());
    const tokens = users.map(() => randomToken());
    const principals: Principal[] = users.map((userId, i) => ({
      userId,
      sessionId: randomUUID(),
      role: i === 98 ? 'ADMIN' : i === 99 ? 'STAFF' : 'CUSTOMER',
    }));
    /** Chuẩn bị body đặt hàng với SKU/địa chỉ/tổng mẫu của fixture. */
    const payload = () => ({
      items: [{ variantId: demoIds.black, quantity: 1 }],
      recipientName: 'Khách Demo',
      phone: '0901234567',
      address: '123 Đường Demo, Phường Demo, Thành phố Demo',
      expectedTotalVnd: 1530000,
    });
    /** Tạo request test tới NestJS và đọc status/body để kiểm tra. */
    const http = () => request(context.app.getHttpServer());
    /** Helper tạo dữ liệu/yêu cầu riêng cho ca kiểm thử. */
    const create = (body = payload(), key = randomUUID(), actor = 0) =>
      http()
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${tokens[actor]}`)
        .set('Idempotency-Key', key)
        .send(body);
    // Chuẩn bị fixture/kết nối cho bộ kiểm thử; xem URL/schema riêng trước các thao tác ghi.
    before(async () => {
      context = await createAuthContext();
      service = context.app.get(OrdersService);
      await seedDemo(context.prisma);
      await seedReference(context.prisma, 100);
    });
    // Chuẩn bị fixture/kết nối cho bộ kiểm thử; xem URL/schema riêng trước các thao tác ghi.
    beforeEach(async () => {
      await context.prisma.$transaction([
        context.prisma.orderEvent.deleteMany(),
        context.prisma.orderItem.deleteMany(),
        context.prisma.order.deleteMany(),
        context.prisma.userSession.deleteMany(),
        context.prisma.user.deleteMany(),
        context.prisma.productVariant.update({
          where: { id: demoIds.black },
          data: { stockQuantity: 10, priceVnd: 1500000 },
        }),
        context.prisma.productVariant.update({
          where: { id: demoIds.silver },
          data: { stockQuantity: 5 },
        }),
      ]);
      await context.prisma.user.createMany({
        data: users.map((id, i) => ({
          id,
          email: `order-test-${i}@example.test`,
          displayName: `Order fixture ${i}`,
          passwordHash: 'not-a-login-password-hash',
          role: principals[i]!.role,
        })),
      });
      await context.prisma.userSession.createMany({
        data: principals.map((p, i) => ({
          id: p.sessionId,
          userId: p.userId,
          tokenHash: tokenHash(tokens[i]!),
          expiresAt: new Date(Date.now() + 3600000),
        })),
      });
    });
    // Cleanup kiểm thử: đóng ứng dụng/kết nối và dọn fixture để ca sau không kế thừa trạng thái.
    after(async () => {
      await context?.close();
    });

    it('quotes and creates snapshots; ignores no client totals, enforces authentication and UUID keys', async () => {
      await http().post('/api/v1/orders').send(payload()).expect(401);
      await http()
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${tokens[0]}`)
        .send(payload())
        .expect(400);
      await create({ ...payload(), totalVnd: 1 } as ReturnType<
        typeof payload
      >).expect(400);
      const quote = await http()
        .post('/api/v1/orders/quote')
        .set('Authorization', `Bearer ${tokens[0]}`)
        .send({ items: payload().items })
        .expect(201);
      assert.equal(quote.body.totalVnd, 1530000);
      const created = await create().expect(201);
      assert.equal(created.body.totalVnd, 1530000);
      assert.equal(created.body.paymentStatus, 'UNPAID');
      assert.equal(created.body.items[0].sku, 'DEMO-EVERYDAY-BLACK');
      assert.equal(created.headers['cache-control'], 'no-store');
      assert.equal(created.body.requestHash, undefined);
      await context.prisma.productVariant.update({
        where: { id: demoIds.black },
        data: { priceVnd: 2000000 },
      });
      const saved = await http()
        .get(`/api/v1/orders/${created.body.id}`)
        .set('Authorization', `Bearer ${tokens[0]}`)
        .expect(200);
      assert.equal(saved.body.items[0].unitPriceVnd, 1500000);
      assert.equal(saved.body.totalVnd, 1530000);
    });

    it('lets CUSTOMER, STAFF and ADMIN buy an imported product and restores stock on owner cancellation', async () => {
      await context.prisma.user.update({
        where: { id: users[98]! },
        data: { role: 'ADMIN' },
      });
      const variantId = '50000000-0000-4000-8000-000000000001';
      const body = {
        ...payload(),
        items: [{ variantId, quantity: 1 }],
        expectedTotalVnd: 1531000,
      };
      for (const actor of [0, 99, 98]) {
        const quote = await http()
          .post('/api/v1/orders/quote')
          .set('Authorization', `Bearer ${tokens[actor]}`)
          .send({ items: body.items })
          .expect(201);
        assert.equal(quote.body.totalVnd, body.expectedTotalVnd);
        const order = await create(body, randomUUID(), actor).expect(201);
        assert.equal(order.body.userId, users[actor]);
        assert.equal(order.body.items[0].sku, 'AE-1200WHD-1AV');
        assert.equal(
          (
            await context.prisma.productVariant.findUniqueOrThrow({
              where: { id: variantId },
            })
          ).stockQuantity,
          99,
        );
        await http()
          .post(`/api/v1/orders/${order.body.id}/cancel`)
          .set('Authorization', `Bearer ${tokens[actor]}`)
          .send({
            reason: 'Verify purchase permissions and restore simulated stock.',
          })
          .expect(201);
        assert.equal(
          (
            await context.prisma.productVariant.findUniqueOrThrow({
              where: { id: variantId },
            })
          ).stockQuantity,
          100,
        );
      }
    });

    it('100 concurrent requests across 100 users: exactly 10 orders and stock zero', async () => {
      const results = await Promise.allSettled(
        principals.map((p) => service.create(p, randomUUID(), payload())),
      );
      assert.equal(results.filter((r) => r.status === 'fulfilled').length, 10);
      const rejected = results.filter((r) => r.status === 'rejected');
      assert.equal(rejected.length, 90);
      for (const result of rejected) {
        const reason: unknown = result.reason;
        assert.ok(reason instanceof HttpException);
        assert.equal(reason.getStatus(), 409);
      }
      assert.equal(await context.prisma.order.count(), 10);
      assert.equal(
        (
          await context.prisma.productVariant.findUniqueOrThrow({
            where: { id: demoIds.black },
          })
        ).stockQuantity,
        0,
      );
    });

    it('concurrent duplicate key returns one order, changed body conflicts, users have separate key scopes', async () => {
      const key = randomUUID();
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          service.create(principals[0]!, key, payload()),
        ),
      );
      assert.equal(new Set(results.map((o) => o.id)).size, 1);
      assert.equal(await context.prisma.order.count(), 1);
      assert.equal(
        (
          await context.prisma.productVariant.findUniqueOrThrow({
            where: { id: demoIds.black },
          })
        ).stockQuantity,
        9,
      );
      await create(
        {
          ...payload(),
          address: '456 Đường khác, Phường Demo, Thành phố Demo',
        },
        key,
      ).expect(409);
      await create(payload(), key, 1).expect(201);
      assert.equal(await context.prisma.order.count(), 2);
    });

    it('multi-line failure and changed quote do not consume inventory or create an order', async () => {
      await create({
        ...payload(),
        items: [
          { variantId: demoIds.black, quantity: 2 },
          { variantId: demoIds.automaticSku, quantity: 1 },
        ],
        expectedTotalVnd: 7030000,
      }).expect(409);
      await create({ ...payload(), expectedTotalVnd: 1 }).expect(409);
      assert.equal(await context.prisma.order.count(), 0);
      assert.equal(
        (
          await context.prisma.productVariant.findUniqueOrThrow({
            where: { id: demoIds.black },
          })
        ).stockQuantity,
        10,
      );
    });

    it('rejects duplicate, inactive, unknown SKUs and malformed quantities', async () => {
      await create({
        ...payload(),
        items: [...payload().items, ...payload().items],
      }).expect(400);
      for (const id of [demoIds.archivedSku, demoIds.retired, randomUUID()])
        await create({
          ...payload(),
          items: [{ variantId: id, quantity: 1 }],
        }).expect(409);
      for (const quantity of [0, -1, 100, 1.5])
        await create({
          ...payload(),
          items: [{ variantId: demoIds.black, quantity }],
        }).expect(400);
      assert.equal(await context.prisma.order.count(), 0);
    });

    it('customer isolation and role checks hold on list/read/cancel/actions', async () => {
      const created = await create().expect(201);
      const id = created.body.id as string;
      await http()
        .get(`/api/v1/orders/${id}`)
        .set('Authorization', `Bearer ${tokens[1]}`)
        .expect(404);
      await http()
        .post(`/api/v1/orders/${id}/cancel`)
        .set('Authorization', `Bearer ${tokens[1]}`)
        .send({ reason: 'Không được phép' })
        .expect(404);
      await http()
        .post(`/api/v1/orders/${id}/actions`)
        .set('Authorization', `Bearer ${tokens[0]}`)
        .send({ action: 'CONFIRM', reason: 'Không được phép' })
        .expect(403);
      await http()
        .get('/api/v1/orders/manage')
        .set('Authorization', `Bearer ${tokens[0]}`)
        .expect(403);
      const other = await http()
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${tokens[1]}`)
        .expect(200);
      assert.equal(other.body.meta.total, 0);
    });

    it('concurrent cancel restores stock exactly once and retains idempotency record', async () => {
      const key = randomUUID();
      const created = await service.create(principals[0]!, key, payload());
      await Promise.all(
        Array.from({ length: 10 }, () =>
          service.transition(
            principals[0]!,
            created.id,
            { action: 'CANCEL', reason: 'Khách hủy đơn demo' },
            true,
          ),
        ),
      );
      assert.equal(
        (
          await context.prisma.productVariant.findUniqueOrThrow({
            where: { id: demoIds.black },
          })
        ).stockQuantity,
        10,
      );
      assert.equal(
        await context.prisma.orderEvent.count({ where: { action: 'CANCEL' } }),
        1,
      );
      const replay = await service.create(principals[0]!, key, payload());
      assert.equal(replay.id, created.id);
      assert.equal(replay.status, 'CANCELLED');
    });

    it('admin completes COD only after shipping, records receipt and never decrements stock twice', async () => {
      const created = await create().expect(201);
      const id = created.body.id as string;
      /** Helper gửi hành động thay đổi trạng thái trong ca kiểm thử. */
      const action = (value: string) =>
        http()
          .post(`/api/v1/orders/${id}/actions`)
          .set('Authorization', `Bearer ${tokens[98]}`)
          .send({
            action: value,
            reason: 'Biên nhận COD demo #001, đã giao và thu đủ tiền.',
          });
      await action('COMPLETE').expect(409);
      await action('CONFIRM').expect(201);
      await http()
        .post(`/api/v1/orders/${id}/cancel`)
        .set('Authorization', `Bearer ${tokens[0]}`)
        .send({ reason: 'Khách hủy quá muộn' })
        .expect(409);
      await action('SHIP').expect(201);
      const complete = await action('COMPLETE').expect(201);
      assert.equal(complete.body.paymentStatus, 'PAID');
      assert.equal(complete.body.shippingStatus, 'DELIVERED');
      assert.equal(complete.body.events.length, 4);
      await action('COMPLETE').expect(409);
      await action('CANCEL').expect(409);
      assert.equal(
        (
          await context.prisma.productVariant.findUniqueOrThrow({
            where: { id: demoIds.black },
          })
        ).stockQuantity,
        9,
      );
    });

    it('confirm racing customer cancellation leaves one consistent result', async () => {
      const order = await service.create(
        principals[0]!,
        randomUUID(),
        payload(),
      );
      const results = await Promise.allSettled([
        service.transition(
          principals[0]!,
          order.id,
          { action: 'CANCEL', reason: 'Khách hủy đơn' },
          true,
        ),
        service.transition(principals[98]!, order.id, {
          action: 'CONFIRM',
          reason: 'Nhân viên xác nhận',
        }),
      ]);
      assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
      const saved = await context.prisma.order.findUniqueOrThrow({
        where: { id: order.id },
      });
      const variant = await context.prisma.productVariant.findUniqueOrThrow({
        where: { id: demoIds.black },
      });
      assert.equal(
        variant.stockQuantity,
        saved.status === 'CANCELLED' ? 10 : 9,
      );
    });

    it('failed order insert rolls back prior stock decrement', async () => {
      await assert.rejects(
        service.create(principals[0]!, randomUUID(), {
          ...payload(),
          address: 'x'.repeat(501),
        }),
      );
      assert.equal(await context.prisma.order.count(), 0);
      assert.equal(
        (
          await context.prisma.productVariant.findUniqueOrThrow({
            where: { id: demoIds.black },
          })
        ).stockQuantity,
        10,
      );
    });
  },
);
