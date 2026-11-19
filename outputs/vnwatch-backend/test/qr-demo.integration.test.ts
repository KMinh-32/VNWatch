/**
 * HỌC VNWATCH — outputs/vnwatch-backend/test/qr-demo.integration.test.ts
 * Kiểm thử tự động. Kiểm tra ma trận QR demo, chủ sở hữu, thanh toán lặp và điều kiện chuyển trạng thái. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup.
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
  'QR demo / owned payment and PostgreSQL transactions',
  { concurrency: false },
  () => {
    let context: Awaited<ReturnType<typeof createAuthContext>>;
    const ids = Array.from({ length: 4 }, () => randomUUID()),
      tokens = ids.map(() => randomToken());
    let first: string;
    /** Tạo request test tới NestJS và đọc status/body để kiểm tra. */
    const http = () => request(context.app.getHttpServer());
    /** Gắn danh tính/token fixture cho request test. */
    const as = (n: number, method: 'get' | 'post', path: string) => {
      const client = http();
      return client[method]('/api/v1' + path).set(
        'Authorization',
        'Bearer ' + tokens[n],
      );
    };
    /** Chuẩn bị JSON request phù hợp fixture. */
    const body = (extra: object = {}) => ({
      items: [{ variantId: demoIds.black, quantity: 1 }],
      recipientName: 'Khách QR Demo',
      phone: '0901234567',
      address: '123 Đường Demo, Phường Demo',
      expectedTotalVnd: 1530000,
      paymentMethod: 'QR_DEMO',
      ...extra,
    });
    // Chuẩn bị fixture/kết nối cho bộ kiểm thử; xem URL/schema riêng trước các thao tác ghi.
    before(async () => {
      context = await createAuthContext();
      await seedDemo(context.prisma, 100);
      await context.prisma.user.createMany({
        data: ids.map((id, i) => ({
          id,
          email: 'qr-' + i + '@example.test',
          displayName: 'QR fixture ' + i,
          passwordHash: 'unused',
          role: i === 0 ? 'ADMIN' : 'CUSTOMER',
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
    it('quotes selected method, creates immutable QR amount after coupon and enforces ownership/no client payment injection', async () => {
      await http()
        .get('/api/v1/orders/' + randomUUID() + '/qr-demo')
        .expect(401);
      await as(1, 'post', '/orders/quote')
        .send({ items: body().items, paymentMethod: 'BANK' })
        .expect(400);
      await context.prisma.promotion.create({
        data: {
          code: 'QR50K',
          amountVnd: 50000,
          minSubtotalVnd: 0,
          maxUses: 1,
          perUserLimit: 1,
          startsAt: new Date(Date.now() - 60000),
          endsAt: new Date(Date.now() + 3600000),
        },
      });
      const quote = await as(1, 'post', '/orders/quote')
        .send({
          items: body().items,
          paymentMethod: 'QR_DEMO',
          promotionCode: 'QR50K',
        })
        .expect(201);
      assert.equal(quote.body.paymentMethod, 'QR_DEMO');
      assert.equal(quote.body.totalVnd, 1480000);
      const key = randomUUID(),
        data = body({ expectedTotalVnd: 1480000, promotionCode: 'QR50K' });
      const order = await as(1, 'post', '/orders')
        .set('Idempotency-Key', key)
        .send(data)
        .expect(201);
      first = order.body.id;
      const retry = await as(1, 'post', '/orders')
        .set('Idempotency-Key', key)
        .send(data)
        .expect(201);
      assert.equal(retry.body.id, first);
      await as(1, 'post', '/orders')
        .set('Idempotency-Key', key)
        .send({ ...data, paymentMethod: 'COD' })
        .expect(409);
      assert.equal(await context.prisma.promotionUse.count(), 1);
      const qr = await as(1, 'get', '/orders/' + first + '/qr-demo').expect(
        200,
      );
      assert.equal(qr.body.totalVnd, 1480000);
      assert.equal(qr.body.mode, 'DEMO');
      assert.ok(qr.body.payload.includes('NOT A BANK TRANSFER'));
      assert.ok(qr.body.payload.includes(first));
      assert.ok(qr.body.payload.includes('AMOUNT: 1480000'));
      assert.ok(!qr.body.payload.includes('0901234567'));
      const modules = qr.body.modules as boolean[][];
      assert.ok(modules.length >= 21);
      assert.equal((modules.length - 17) % 4, 0);
      assert.ok(
        modules.every(
          (row) =>
            row.length === modules.length &&
            row.every((bit) => typeof bit === 'boolean'),
        ),
      );
      /** Helper tìm đối tượng trong dữ liệu kiểm thử. */
      const finder = (r: number, c: number) => {
        for (let y = 0; y < 7; y++)
          for (let x = 0; x < 7; x++)
            assert.equal(
              modules[r + y]![c + x],
              y === 0 ||
                y === 6 ||
                x === 0 ||
                x === 6 ||
                (y >= 2 && y <= 4 && x >= 2 && x <= 4),
            );
      };
      finder(0, 0);
      finder(0, modules.length - 7);
      finder(modules.length - 7, 0);
      await as(2, 'get', '/orders/' + first + '/qr-demo').expect(404);
      await as(0, 'get', '/orders/' + first + '/qr-demo').expect(404);
      await as(2, 'post', '/orders/' + first + '/qr-demo/confirm')
        .send({ acknowledgement: 'DEMO_NO_MONEY' })
        .expect(404);
      await as(1, 'post', '/orders/' + first + '/qr-demo/confirm')
        .send({ acknowledgement: 'DEMO_NO_MONEY', totalVnd: 1 })
        .expect(400);
    });
    it('requires explicit demo acknowledgement, serializes duplicate confirmations and only ships paid QR orders', async () => {
      await as(0, 'post', '/orders/' + first + '/actions')
        .send({ action: 'CONFIRM', reason: 'Xác nhận đơn QR demo' })
        .expect(201);
      await as(0, 'post', '/orders/' + first + '/actions')
        .send({ action: 'SHIP', reason: 'Thử giao trước thanh toán' })
        .expect(409);
      await as(1, 'post', '/orders/' + first + '/qr-demo/confirm')
        .send({})
        .expect(400);
      const confirmed = await Promise.all(
        Array.from({ length: 20 }, () =>
          as(1, 'post', '/orders/' + first + '/qr-demo/confirm').send({
            acknowledgement: 'DEMO_NO_MONEY',
          }),
        ),
      );
      assert.ok(
        confirmed.every(
          (r) => r.status === 201 && r.body.paymentStatus === 'PAID',
        ),
      );
      assert.equal(
        await context.prisma.orderEvent.count({
          where: { orderId: first, action: 'PAY_QR_DEMO' },
        }),
        1,
      );
      assert.equal(
        (
          await context.prisma.productVariant.findUniqueOrThrow({
            where: { id: demoIds.black },
          })
        ).stockQuantity,
        99,
      );
      await as(1, 'post', '/orders/' + first + '/cancel')
        .send({ reason: 'Không hoàn tiền demo tự động' })
        .expect(409);
      await as(0, 'post', '/orders/' + first + '/actions')
        .send({ action: 'SHIP', reason: 'Giao đơn đã thanh toán demo' })
        .expect(201);
      const done = await as(0, 'post', '/orders/' + first + '/actions')
        .send({ action: 'COMPLETE', reason: 'Biên nhận giao hàng QR-DEMO-1' })
        .expect(201);
      assert.equal(done.body.status, 'COMPLETED');
      assert.equal(done.body.paymentStatus, 'PAID');
      await as(1, 'post', '/orders/' + first + '/qr-demo/confirm')
        .send({ acknowledgement: 'DEMO_NO_MONEY' })
        .expect(201);
      assert.equal(
        await context.prisma.orderEvent.count({
          where: { orderId: first, action: 'PAY_QR_DEMO' },
        }),
        1,
      );
    });
    it('unpaid cancellation restores stock once and cannot later be marked paid', async () => {
      const order = await as(2, 'post', '/orders')
        .set('Idempotency-Key', randomUUID())
        .send(body())
        .expect(201);
      for (let n = 0; n < 2; n++)
        await as(2, 'post', '/orders/' + order.body.id + '/cancel')
          .send({ reason: 'Hủy QR chưa mô phỏng thanh toán' })
          .expect(201);
      await as(2, 'post', '/orders/' + order.body.id + '/qr-demo/confirm')
        .send({ acknowledgement: 'DEMO_NO_MONEY' })
        .expect(409);
      await as(2, 'get', '/orders/' + order.body.id + '/qr-demo').expect(409);
      assert.equal(
        (
          await context.prisma.productVariant.findUniqueOrThrow({
            where: { id: demoIds.black },
          })
        ).stockQuantity,
        99,
      );
    });
    it('pay racing cancellation produces one consistent outcome without returning paid stock', async () => {
      const order = await as(3, 'post', '/orders')
        .set('Idempotency-Key', randomUUID())
        .send(body())
        .expect(201);
      const results = await Promise.all([
        as(3, 'post', '/orders/' + order.body.id + '/cancel').send({
          reason: 'Hủy đồng thời với thanh toán demo',
        }),
        as(3, 'post', '/orders/' + order.body.id + '/qr-demo/confirm').send({
          acknowledgement: 'DEMO_NO_MONEY',
        }),
      ]);
      assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
      const saved = await context.prisma.order.findUniqueOrThrow({
        where: { id: order.body.id },
      });
      const stock = (
        await context.prisma.productVariant.findUniqueOrThrow({
          where: { id: demoIds.black },
        })
      ).stockQuantity;
      assert.equal(stock, saved.status === 'CANCELLED' ? 99 : 98);
      assert.equal(
        saved.paymentStatus,
        saved.status === 'CANCELLED' ? 'UNPAID' : 'PAID',
      );
    });
    it('database keeps COD paid-before-delivery and unpaid-QR shipping invalid; COD cannot use QR endpoints', async () => {
      const cod = await as(2, 'post', '/orders')
        .set('Idempotency-Key', randomUUID())
        .send(body({ paymentMethod: 'COD' }))
        .expect(201);
      await as(2, 'get', '/orders/' + cod.body.id + '/qr-demo').expect(409);
      await as(2, 'post', '/orders/' + cod.body.id + '/qr-demo/confirm')
        .send({ acknowledgement: 'DEMO_NO_MONEY' })
        .expect(409);
      await assert.rejects(
        context.prisma.order.update({
          where: { id: cod.body.id },
          data: { paymentStatus: 'PAID' },
        }),
      );
      const qr = await as(2, 'post', '/orders')
        .set('Idempotency-Key', randomUUID())
        .send(body())
        .expect(201);
      await assert.rejects(
        context.prisma.order.update({
          where: { id: qr.body.id },
          data: { status: 'CONFIRMED', shippingStatus: 'IN_TRANSIT' },
        }),
      );
    });
  },
);
