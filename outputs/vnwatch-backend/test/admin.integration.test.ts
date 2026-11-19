/**
 * HỌC VNWATCH — outputs/vnwatch-backend/test/admin.integration.test.ts
 * Kiểm thử tự động. Kiểm tra role ADMIN/STAFF, tài khoản, sản phẩm, đơn thủ công, bảo vệ admin cuối cùng và audit. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createAuthContext } from './helpers/auth-context';
import { demoIds, seedDemo } from '../src/database/demo-data';
import { PasswordService } from '../src/auth/password.service';
import { randomToken, tokenHash } from '../src/auth/tokens';
import { OrdersService } from '../src/orders/orders.service';
import { createFirstAdmin } from '../src/database/first-admin';

describe(
  'ADMIN portal / real PostgreSQL authorization and lifecycle',
  { concurrency: false },
  () => {
    let c: Awaited<ReturnType<typeof createAuthContext>>;
    const ids = Array.from({ length: 5 }, () => randomUUID()),
      tokens = ids.map(() => randomToken()),
      sessions = ids.map(() => randomUUID());
    const password = 'Admin test phrase 2026!',
      passwords = new PasswordService();
    let hash: string;
    /** Tạo request test tới NestJS và đọc status/body để kiểm tra. */
    const http = () => request(c.app.getHttpServer());
    /** Gắn danh tính/token fixture cho request test. */
    const as = (
      i: number,
      method: 'get' | 'post' | 'patch' | 'delete' | 'put',
      path: string,
    ) => {
      const client = http();
      return client[method]('/api/v1' + path).set(
        'Authorization',
        'Bearer ' + tokens[i],
      );
    };
    /** Chuẩn bị dữ liệu fixture phục vụ assertions. */
    const data = () => ({
      userId: ids[2],
      items: [{ variantId: demoIds.black, quantity: 2 }],
      recipientName: 'Khách quản trị',
      phone: '0901234567',
      address: '123 Đường Demo, Thành phố Demo',
      reason: 'Khách yêu cầu tạo đơn qua quản trị',
      expectedTotalVnd: 3030000,
      paymentMethod: 'COD',
    });
    /** Helper tạo dữ liệu/yêu cầu riêng cho ca kiểm thử. */
    const create = async (extra: object = {}) =>
      (
        await as(0, 'post', '/orders/manage')
          .set('Idempotency-Key', randomUUID())
          .send({ ...data(), ...extra })
          .expect(201)
      ).body;
    // Chuẩn bị fixture/kết nối cho bộ kiểm thử; xem URL/schema riêng trước các thao tác ghi.
    before(async () => {
      c = await createAuthContext();
      hash = await passwords.hash(password);
      await seedDemo(c.prisma, 100);
    });
    // Chuẩn bị fixture/kết nối cho bộ kiểm thử; xem URL/schema riêng trước các thao tác ghi.
    beforeEach(async () => {
      await c.prisma.$transaction([
        c.prisma.businessAudit.deleteMany(),
        c.prisma.orderEvent.deleteMany(),
        c.prisma.promotionUse.deleteMany(),
        c.prisma.orderItem.deleteMany(),
        c.prisma.order.deleteMany(),
        c.prisma.cartLine.deleteMany(),
        c.prisma.userSession.deleteMany(),
        c.prisma.passwordResetToken.deleteMany(),
        c.prisma.auditEvent.deleteMany(),
        c.prisma.user.deleteMany(),
        c.prisma.product.update({
          where: { id: demoIds.everyday },
          data: { status: 'ACTIVE' },
        }),
        c.prisma.productVariant.update({
          where: { id: demoIds.black },
          data: { stockQuantity: 100, priceVnd: 1500000, status: 'ACTIVE' },
        }),
      ]);
      await c.prisma.user.createMany({
        data: ids.map((id, i) => ({
          id,
          email: 'admin-suite-' + i + '@example.test',
          displayName: 'Admin fixture ' + i,
          passwordHash: hash,
          role: i === 0 ? 'ADMIN' : i === 1 ? 'STAFF' : 'CUSTOMER',
        })),
      });
      await c.prisma.userSession.createMany({
        data: ids.map((userId, i) => ({
          id: sessions[i],
          userId,
          tokenHash: tokenHash(tokens[i]!),
          expiresAt: new Date(Date.now() + 3600000),
        })),
      });
    });
    // Cleanup kiểm thử: đóng ứng dụng/kết nối và dọn fixture để ca sau không kế thừa trạng thái.
    after(async () => {
      await c?.close();
    });
    it('admin login verifies credentials and denies other roles without issuing a session', async () => {
      for (const i of [1, 2]) {
        await http()
          .post('/api/v1/auth/admin/login')
          .send({ email: 'admin-suite-' + i + '@example.test', password })
          .expect(401);
        assert.equal(
          await c.prisma.userSession.count({ where: { userId: ids[i] } }),
          1,
        );
      }
      await http()
        .post('/api/v1/auth/admin/login')
        .send({
          email: 'admin-suite-0@example.test',
          password: 'wrong password',
        })
        .expect(401);
      const login = await http()
        .post('/api/v1/auth/admin/login')
        .send({ email: 'admin-suite-0@example.test', password })
        .expect(200);
      assert.equal(login.body.user.role, 'ADMIN');
      assert.ok(login.body.sessionToken);
      assert.ok(!JSON.stringify(login.body).includes(hash));
      await c.prisma.user.update({
        where: { id: ids[0] },
        data: { status: 'BLOCKED' },
      });
      await http()
        .post('/api/v1/auth/admin/login')
        .send({ email: 'admin-suite-0@example.test', password })
        .expect(401);
      await http()
        .get('/api/v1/management/reports')
        .set('Authorization', 'Bearer ' + login.body.sessionToken)
        .expect(401);
    });
    it('all management read and write routes deny guests, STAFF and CUSTOMER', async () => {
      const target = randomUUID();
      const routes: ['get' | 'post' | 'patch' | 'delete', string][] = [
        ['get', '/management/products'],
        ['get', '/management/reports'],
        ['get', '/management/promotions'],
        ['get', '/management/reviews'],
        ['get', '/management/audit'],
        ['get', '/management/tickets'],
        ['get', '/orders/manage'],
        ['get', '/users'],
        ['post', '/users'],
        ['patch', '/users/' + target],
        ['patch', '/users/' + target + '/access'],
        ['post', '/users/' + target + '/revoke-sessions'],
        ['post', '/users/' + target + '/unlock-login'],
        ['post', '/management/products'],
        ['patch', '/management/products/' + target],
        ['delete', '/management/products/' + target],
        ['patch', '/management/variants/' + target],
        ['post', '/management/products/' + target + '/variants'],
        ['post', '/management/promotions'],
        ['patch', '/management/promotions/' + target],
        ['patch', '/management/reviews/' + target],
        ['post', '/management/tickets/' + target + '/replies'],
        ['post', '/orders/manage'],
        ['post', '/orders/manage/quote'],
        ['patch', '/orders/' + target],
        ['delete', '/orders/' + target],
        ['post', '/orders/' + target + '/restore'],
        ['post', '/orders/' + target + '/actions'],
      ];
      for (const [method, path] of routes) {
        const client = http();
        await client[method]('/api/v1' + path).expect(401);
        for (const i of [1, 2]) await as(i, method, path).expect(403);
      }
      const own = await as(1, 'post', '/orders')
        .set('Idempotency-Key', randomUUID())
        .send({
          items: data().items,
          recipientName: data().recipientName,
          phone: data().phone,
          address: data().address,
          expectedTotalVnd: data().expectedTotalVnd,
        })
        .expect(201);
      await as(1, 'get', '/orders/' + own.body.id).expect(200);
      await as(2, 'get', '/orders/' + own.body.id).expect(404);
    });
    it('creates for a buyer exactly once under concurrency, uses buyer coupon and preserves cart', async () => {
      await as(2, 'put', '/shop/cart')
        .send({ variantId: demoIds.black, mode: 'SET', quantity: 5 })
        .expect(200);
      const promo = await c.prisma.promotion.create({
        data: {
          code: 'ADMIN50K',
          amountVnd: 50000,
          minSubtotalVnd: 0,
          maxUses: 2,
          perUserLimit: 1,
          startsAt: new Date(Date.now() - 60000),
          endsAt: new Date(Date.now() + 3600000),
        },
      });
      const quote = await as(0, 'post', '/orders/manage/quote')
        .send({
          userId: ids[2],
          items: data().items,
          promotionCode: promo.code,
          paymentMethod: 'COD',
        })
        .expect(201);
      assert.equal(quote.body.totalVnd, 2980000);
      const key = randomUUID(),
        body = {
          ...data(),
          promotionCode: promo.code,
          expectedTotalVnd: quote.body.totalVnd,
        };
      const responses = await Promise.all(
        Array.from({ length: 5 }, () =>
          as(0, 'post', '/orders/manage')
            .set('Idempotency-Key', key)
            .send(body),
        ),
      );
      assert.ok(
        responses.every((r) => r.status === 201),
        JSON.stringify(responses.map((r) => r.body)),
      );
      assert.equal(new Set(responses.map((r) => r.body.id)).size, 1);
      const order = responses[0]!.body;
      assert.equal(order.userId, ids[2]);
      assert.equal(order.events[0].action, 'CREATE_ADMIN');
      assert.equal(
        (
          await c.prisma.orderEvent.findFirstOrThrow({
            where: { orderId: order.id },
          })
        ).actorId,
        ids[0],
      );
      assert.equal(
        (
          await c.prisma.productVariant.findUniqueOrThrow({
            where: { id: demoIds.black },
          })
        ).stockQuantity,
        98,
      );
      assert.equal((await as(2, 'get', '/shop/cart')).body[0].quantity, 5);
      assert.equal(
        (await c.prisma.promotionUse.findFirstOrThrow()).userId,
        ids[2],
      );
      assert.equal(
        await c.prisma.businessAudit.count({
          where: { action: 'ORDER_CREATE_ADMIN' },
        }),
        1,
      );
      await as(0, 'post', '/orders/manage')
        .set('Idempotency-Key', key)
        .send({ ...body, address: 'Địa chỉ khác để thử xung đột' })
        .expect(409);
      await c.prisma.user.update({
        where: { id: ids[2] },
        data: { status: 'BLOCKED' },
      });
      await as(0, 'post', '/orders/manage')
        .set('Idempotency-Key', randomUUID())
        .send(body)
        .expect(409);
    });
    it('writes recheck current role/session rather than trusting a stale ADMIN principal', async () => {
      await c.prisma.user.update({
        where: { id: ids[0] },
        data: { role: 'CUSTOMER' },
      });
      await assert.rejects(
        c.app
          .get(OrdersService)
          .adminCreate(
            { userId: ids[0]!, sessionId: sessions[0]!, role: 'ADMIN' },
            randomUUID(),
            data() as never,
          ),
        /Forbidden/,
      );
      assert.equal(await c.prisma.order.count(), 0);
      assert.equal(
        (
          await c.prisma.productVariant.findUniqueOrThrow({
            where: { id: demoIds.black },
          })
        ).stockQuantity,
        100,
      );
    });
    it('delivery editing rejects stale/mass-assigned writes and cannot edit shipped orders', async () => {
      const order = await create();
      const edit = {
        recipientName: 'Người nhận mới',
        phone: '0901234568',
        address: '456 Đường Mới, Thành phố Demo',
        expectedUpdatedAt: order.updatedAt,
        reason: 'Khách cập nhật thông tin giao hàng',
      };
      await as(0, 'patch', '/orders/' + order.id)
        .send({ ...edit, totalVnd: 1 })
        .expect(400);
      const changed = await as(0, 'patch', '/orders/' + order.id)
        .send(edit)
        .expect(200);
      assert.equal(changed.body.totalVnd, order.totalVnd);
      assert.deepEqual(changed.body.items, order.items);
      await as(0, 'patch', '/orders/' + order.id)
        .send(edit)
        .expect(409);
      await as(0, 'post', '/orders/' + order.id + '/actions')
        .send({ action: 'CONFIRM', reason: 'Admin xác nhận đơn' })
        .expect(201);
      const shipped = await as(0, 'post', '/orders/' + order.id + '/actions')
        .send({ action: 'SHIP', reason: 'Bàn giao đơn cho vận chuyển' })
        .expect(201);
      await as(0, 'patch', '/orders/' + order.id)
        .send({ ...edit, expectedUpdatedAt: shipped.body.updatedAt })
        .expect(409);
    });
    it('archive only ended orders, preserve customer history and financial/stock data, restore safely', async () => {
      const order = await create();
      const reason = 'Lưu trữ đơn đã kết thúc';
      await as(0, 'delete', '/orders/' + order.id)
        .send({ expectedUpdatedAt: order.updatedAt, reason })
        .expect(409);
      await assert.rejects(
        c.prisma.order.update({
          where: { id: order.id },
          data: { archivedAt: new Date() },
        }),
      );
      const cancelled = await as(0, 'post', '/orders/' + order.id + '/actions')
        .send({ action: 'CANCEL', reason: 'Khách yêu cầu hủy đơn' })
        .expect(201);
      const archive = await as(0, 'delete', '/orders/' + order.id)
        .send({ expectedUpdatedAt: cancelled.body.updatedAt, reason })
        .expect(200);
      assert.ok(archive.body.archivedAt);
      assert.equal((await as(0, 'get', '/orders/manage')).body.meta.total, 0);
      assert.equal(
        (
          await as(
            0,
            'get',
            '/orders/manage?archive=archived&q=' +
              encodeURIComponent(data().recipientName),
          )
        ).body.meta.total,
        1,
      );
      const own = await as(2, 'get', '/orders/' + order.id).expect(200);
      assert.ok(!('archivedAt' in own.body));
      assert.equal((await as(2, 'get', '/orders')).body.meta.total, 1);
      assert.equal(
        (
          await c.prisma.productVariant.findUniqueOrThrow({
            where: { id: demoIds.black },
          })
        ).stockQuantity,
        100,
      );
      assert.equal(
        (await as(0, 'get', '/management/reports')).body.paidRevenueVnd,
        0,
      );
      await as(0, 'post', '/orders/' + order.id + '/restore')
        .send({ expectedUpdatedAt: cancelled.body.updatedAt, reason })
        .expect(409);
      const restored = await as(0, 'post', '/orders/' + order.id + '/restore')
        .send({ expectedUpdatedAt: archive.body.updatedAt, reason })
        .expect(201);
      assert.equal(restored.body.archivedAt, null);
      assert.equal((await as(0, 'get', '/orders/manage')).body.meta.total, 1);
      assert.equal(
        await c.prisma.businessAudit.count({
          where: {
            targetId: order.id,
            action: { in: ['ORDER_ARCHIVE', 'ORDER_RESTORE'] },
          },
        }),
        2,
      );
    });
    it('product delete hides public catalog and new sales, retains purchased snapshots, can reactivate', async () => {
      const order = await create();
      const product = await c.prisma.product.findUniqueOrThrow({
        where: { id: demoIds.everyday },
      });
      const dto = {
        expectedUpdatedAt: product.updatedAt.toISOString(),
        reason: 'Ngừng kinh doanh sản phẩm kiểm thử',
      };
      await as(0, 'delete', '/management/products/' + product.id)
        .send({ ...dto, expectedUpdatedAt: new Date(0).toISOString() })
        .expect(409);
      const hidden = await as(0, 'delete', '/management/products/' + product.id)
        .send(dto)
        .expect(200);
      assert.equal(hidden.body.status, 'DISCONTINUED');
      await http()
        .get('/api/v1/products/' + product.id)
        .expect(404);
      await as(2, 'get', '/orders/' + order.id).expect(200);
      await as(0, 'post', '/orders/manage')
        .set('Idempotency-Key', randomUUID())
        .send(data())
        .expect(409);
      await as(0, 'patch', '/management/products/' + product.id)
        .send({
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          category: product.category,
          description: product.description,
          status: 'ACTIVE',
          expectedUpdatedAt: hidden.body.updatedAt,
          reason: 'Kinh doanh trở lại sản phẩm',
        })
        .expect(200);
      await http()
        .get('/api/v1/products/' + product.id)
        .expect(200);
      assert.equal(
        await c.prisma.businessAudit.count({
          where: { targetId: product.id, action: 'PRODUCT_ARCHIVE' },
        }),
        1,
      );
    });
    it('account creation hashes password, edits atomically, protects last admin and revokes target sessions', async () => {
      const dto = {
        email: 'New-Admin-Customer@EXAMPLE.test',
        displayName: 'Khách mới',
        password,
        role: 'CUSTOMER',
        reason: 'Tạo tài khoản hỗ trợ khách',
      };
      const added = await as(0, 'post', '/users').send(dto).expect(201);
      assert.equal(added.body.email, dto.email.toLowerCase());
      assert.ok(!('passwordHash' in added.body));
      const stored = await c.prisma.user.findUniqueOrThrow({
        where: { id: added.body.id },
      });
      assert.ok(await passwords.verify(password, stored.passwordHash));
      await as(0, 'post', '/users').send(dto).expect(409);
      const protectedChange = await as(0, 'patch', '/users/' + ids[0])
        .send({
          displayName: 'Không được lưu tên này',
          role: 'CUSTOMER',
          status: 'ACTIVE',
          reason: 'Thử hạ quyền admin cuối',
        })
        .expect(409);
      assert.equal(protectedChange.body.code, 'LAST_ADMIN_REQUIRED');
      assert.equal(
        (await c.prisma.user.findUniqueOrThrow({ where: { id: ids[0] } }))
          .displayName,
        'Admin fixture 0',
      );
      await as(0, 'patch', '/users/' + ids[1])
        .send({
          displayName: 'Nhân viên đã khóa',
          role: 'STAFF',
          status: 'BLOCKED',
          reason: 'Khóa quyền truy cập thử nghiệm',
        })
        .expect(200);
      await as(1, 'get', '/users/me').expect(401);
      await c.prisma.user.update({
        where: { id: ids[2] },
        data: {
          lockedUntil: new Date(Date.now() + 60000),
          failedLoginAttempts: 5,
        },
      });
      await as(0, 'post', '/users/' + ids[2] + '/unlock-login')
        .send({ reason: 'Mở khóa theo yêu cầu đã xác thực' })
        .expect(201);
      const unlocked = await c.prisma.user.findUniqueOrThrow({
        where: { id: ids[2] },
      });
      assert.equal(unlocked.lockedUntil, null);
      assert.equal(unlocked.failedLoginAttempts, 0);
      await as(2, 'get', '/users/me').expect(401);
      const logs = JSON.stringify(await c.prisma.businessAudit.findMany());
      assert.ok(!logs.includes(password));
      assert.ok(!logs.includes(hash));
      const search = await as(
        0,
        'get',
        '/users?q=Khách%20mới&role=CUSTOMER&status=ACTIVE',
      ).expect(200);
      assert.equal(search.body.meta.total, 1);
    });
    it('first-admin bootstrap refuses existing accounts/admins and serializes concurrent bootstrap', async () => {
      await assert.rejects(
        createFirstAdmin(c.prisma, passwords, {
          email: 'other@example.test',
          displayName: 'Other admin',
          password,
        }),
        /Đã có admin/,
      );
      await c.prisma.userSession.deleteMany({ where: { userId: ids[0] } });
      await c.prisma.user.delete({ where: { id: ids[0] } });
      await assert.rejects(
        createFirstAdmin(c.prisma, passwords, {
          email: 'admin-suite-2@example.test',
          displayName: 'Không nâng quyền',
          password,
        }),
        /Email đã tồn tại/,
      );
      assert.equal(
        (await c.prisma.user.findUniqueOrThrow({ where: { id: ids[2] } })).role,
        'CUSTOMER',
      );
      const attempts = await Promise.allSettled(
        [0, 1].map((i) =>
          createFirstAdmin(c.prisma, passwords, {
            email: 'first-' + i + '@example.test',
            displayName: 'First Admin',
            password,
          }),
        ),
      );
      assert.equal(attempts.filter((x) => x.status === 'fulfilled').length, 1);
      assert.equal(
        await c.prisma.user.count({
          where: { role: 'ADMIN', status: 'ACTIVE' },
        }),
        1,
      );
      assert.equal(
        await c.prisma.businessAudit.count({
          where: { action: 'ADMIN_BOOTSTRAP' },
        }),
        1,
      );
    });
  },
);
