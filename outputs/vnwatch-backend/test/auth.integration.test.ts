/**
 * HỌC VNWATCH — outputs/vnwatch-backend/test/auth.integration.test.ts
 * Kiểm thử tự động. Kiểm tra đăng ký, hash mật khẩu, phiên, khóa đăng nhập, rate limit và reset token dùng một lần. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AuthService } from '../src/auth/auth.service';
import { PasswordService } from '../src/auth/password.service';
import { Principal } from '../src/auth/auth.types';
import { randomToken, tokenHash } from '../src/auth/tokens';
import { UsersService } from '../src/users/users.service';
import { UserRole } from '../src/generated/prisma/client';
import { createAuthContext } from './helpers/auth-context';

const PASSWORD = 'Demo password for tests 2026!';
const NEXT_PASSWORD = 'A new demo password for tests 2026!';

describe(
  'Auth and Users / HTTP + real PostgreSQL',
  { concurrency: false },
  () => {
    let context: Awaited<ReturnType<typeof createAuthContext>>;
    let fixtureHash: string;
    const ids = {
      alice: randomUUID(),
      bob: randomUUID(),
      staff: randomUUID(),
      admin: randomUUID(),
      secondAdmin: randomUUID(),
    };
    /** Tạo request test tới NestJS và đọc status/body để kiểm tra. */
    const http = () => request(context.app.getHttpServer());
    /** Đăng nhập bằng tài khoản fixture để lấy phiên phục vụ kịch bản. */
    const login = async (
      name = 'alice',
      password = PASSWORD,
    ): Promise<string> => {
      const response = await http()
        .post('/api/v1/auth/login')
        .send({ email: `${name}@example.test`, password })
        .expect(200);
      return response.body.sessionToken as string;
    };
    /** Lấy principal tương ứng fixture để gọi service trong test. */
    const principal = async (token: string): Promise<Principal> => {
      const session = await context.prisma.userSession.findUniqueOrThrow({
        where: { tokenHash: tokenHash(token) },
        include: { user: true },
      });
      return {
        userId: session.userId,
        sessionId: session.id,
        role: session.user.role,
      };
    };
    /** Gửi yêu cầu quên mật khẩu và đọc dữ liệu outbox fixture. */
    const forgot = async () => {
      await http()
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'alice@example.test' })
        .expect(202);
      return context.delivery.messages.at(-1)!.token;
    };

    // Chuẩn bị fixture/kết nối cho bộ kiểm thử; xem URL/schema riêng trước các thao tác ghi.
    before(async () => {
      context = await createAuthContext();
      fixtureHash = await context.app.get(PasswordService).hash(PASSWORD);
    });
    // Chuẩn bị fixture/kết nối cho bộ kiểm thử; xem URL/schema riêng trước các thao tác ghi.
    beforeEach(async () => {
      context.delivery.messages = [];
      context.delivery.fail = false;
      await context.prisma.$transaction([
        context.prisma.auditEvent.deleteMany(),
        context.prisma.passwordResetToken.deleteMany(),
        context.prisma.userSession.deleteMany(),
        context.prisma.authRateBucket.deleteMany(),
        context.prisma.user.deleteMany(),
      ]);
      await context.prisma.user.createMany({
        data: Object.entries(ids).map(([name, id]) => ({
          id,
          email: `${name.toLowerCase()}@example.test`,
          displayName: name,
          passwordHash: fixtureHash,
          role: (name === 'admin' || name === 'secondAdmin'
            ? 'ADMIN'
            : name === 'staff'
              ? 'STAFF'
              : 'CUSTOMER') as UserRole,
          status:
            name === 'secondAdmin' ? ('BLOCKED' as const) : ('ACTIVE' as const),
        })),
      });
    });
    // Cleanup kiểm thử: đóng ứng dụng/kết nối và dọn fixture để ca sau không kế thừa trạng thái.
    after(async () => {
      await context?.close();
    });

    it('registers a normalized CUSTOMER, salts passwords and never returns credentials', async () => {
      for (const email of ['  NEW@example.test ', 'another@example.test']) {
        const response = await http()
          .post('/api/v1/auth/register')
          .send({ email, displayName: ' New customer ', password: PASSWORD })
          .expect(201);
        assert.equal(response.body.role, 'CUSTOMER');
        assert.equal(response.body.email, email.trim().toLowerCase());
        assert.equal(response.body.displayName, 'New customer');
        assert.ok(!JSON.stringify(response.body).includes('password'));
        assert.equal(response.headers['cache-control'], 'no-store');
      }
      const first = await context.prisma.user.findUniqueOrThrow({
        where: { email: 'new@example.test' },
      });
      const second = await context.prisma.user.findUniqueOrThrow({
        where: { email: 'another@example.test' },
      });
      assert.notEqual(first.passwordHash, second.passwordHash);
      assert.notEqual(first.passwordHash, PASSWORD);
      assert.ok(
        await context.app
          .get(PasswordService)
          .verify(PASSWORD, first.passwordHash),
      );
    });

    it('rejects role/status injection and weak or excessive passwords', async () => {
      for (const extra of [
        { role: 'ADMIN' },
        { status: 'ACTIVE' },
        { password: 'short' },
        { password: 'a'.repeat(129) },
      ]) {
        await http()
          .post('/api/v1/auth/register')
          .send({
            email: 'new@example.test',
            displayName: 'New user',
            password: PASSWORD,
            ...extra,
          })
          .expect(400);
      }
      assert.equal(
        await context.prisma.user.count({
          where: { email: 'new@example.test' },
        }),
        0,
      );
    });

    it('concurrent registrations of the same normalized email produce one account', async () => {
      const responses = await Promise.all(
        ['NEW@example.test', 'new@example.test'].map((email) =>
          http()
            .post('/api/v1/auth/register')
            .send({ email, displayName: 'New user', password: PASSWORD }),
        ),
      );
      assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
      assert.equal(
        await context.prisma.user.count({
          where: { email: 'new@example.test' },
        }),
        1,
      );
    });

    it('uses an opaque token, stores only its digest, and denies unmarked routes by default', async () => {
      await http().get('/api/v1/users/me').expect(401);
      await http().get('/api/v1/test-protected').expect(401);
      const token = await login();
      assert.match(token, /^[A-Za-z0-9_-]{43}$/);
      const sessions = await context.prisma.userSession.findMany({
        where: { userId: ids.alice },
      });
      assert.equal(sessions[0]!.tokenHash, tokenHash(token));
      assert.ok(!JSON.stringify(sessions).includes(token));
      await http()
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      await http()
        .get('/api/v1/test-protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      for (const invalid of [
        '',
        'Bearer not-a-token',
        `Bearer ${randomToken()}`,
      ])
        await http()
          .get('/api/v1/users/me')
          .set('Authorization', invalid)
          .expect(401);
    });

    it('uses the same failure response for wrong, unknown, blocked and temporarily locked accounts', async () => {
      await context.prisma.user.update({
        where: { id: ids.bob },
        data: {
          lockedUntil: new Date(Date.now() + 60000),
          failedLoginAttempts: 5,
        },
      });
      const responses = [];
      for (const [email, password] of [
        ['alice@example.test', 'Wrong password 123456'],
        ['missing@example.test', PASSWORD],
        ['secondadmin@example.test', PASSWORD],
        ['bob@example.test', PASSWORD],
      ]) {
        responses.push(
          await http()
            .post('/api/v1/auth/login')
            .send({ email, password })
            .expect(401),
        );
      }
      assert.equal(new Set(responses.map((r) => r.body.code)).size, 1);
      assert.equal(new Set(responses.map((r) => r.body.message)).size, 1);
    });

    it('five concurrent failed logins lock once, survive service recreation, and expire correctly', async () => {
      const responses = await Promise.all(
        Array.from({ length: 5 }, () =>
          http().post('/api/v1/auth/login').send({
            email: 'alice@example.test',
            password: 'Wrong password 123456',
          }),
        ),
      );
      assert.ok(responses.every((r) => r.status === 401));
      const locked = await context.prisma.user.findUniqueOrThrow({
        where: { id: ids.alice },
      });
      assert.equal(locked.failedLoginAttempts, 5);
      assert.ok(locked.lockedUntil!.getTime() > Date.now() + 14 * 60000);
      const freshService = new AuthService(
        context.prisma,
        new PasswordService(),
        context.delivery,
      );
      await assert.rejects(
        freshService.login({ email: 'alice@example.test', password: PASSWORD }),
        (error: unknown) =>
          (error as { getStatus(): number }).getStatus() === 401,
      );
      await context.prisma.user.update({
        where: { id: ids.alice },
        data: { lockedUntil: new Date(Date.now() - 1000) },
      });
      await login();
      const unlocked = await context.prisma.user.findUniqueOrThrow({
        where: { id: ids.alice },
      });
      assert.equal(unlocked.failedLoginAttempts, 0);
      assert.equal(unlocked.lockedUntil, null);
    });

    it('a successful login resets consecutive failed attempts', async () => {
      await http()
        .post('/api/v1/auth/login')
        .send({
          email: 'alice@example.test',
          password: 'Wrong password 123456',
        })
        .expect(401);
      await login();
      assert.equal(
        (
          await context.prisma.user.findUniqueOrThrow({
            where: { id: ids.alice },
          })
        ).failedLoginAttempts,
        0,
      );
    });

    it('lists only own sessions, caps active sessions at ten and reveals no token hashes', async () => {
      const now = new Date();
      await context.prisma.userSession.createMany({
        data: Array.from({ length: 12 }, () => ({
          userId: ids.alice,
          tokenHash: tokenHash(randomToken()),
          expiresAt: new Date(now.getTime() + 60000),
        })),
      });
      const token = await login();
      const response = await http()
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      assert.equal(response.body.length, 10);
      assert.equal(
        response.body.filter((s: { current: boolean }) => s.current).length,
        1,
      );
      assert.ok(!JSON.stringify(response.body).includes('tokenHash'));
    });

    it('revokes own sessions idempotently and denies revoking another user’s session', async () => {
      const first = await login();
      const second = await login();
      const bob = await login('bob');
      const firstId = (await principal(first)).sessionId;
      await http()
        .delete('/api/v1/auth/sessions/' + (await principal(bob)).sessionId)
        .set('Authorization', `Bearer ${second}`)
        .expect(404);
      for (let i = 0; i < 2; i++)
        await http()
          .delete('/api/v1/auth/sessions/' + firstId)
          .set('Authorization', `Bearer ${second}`)
          .expect(204);
      await http()
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${first}`)
        .expect(401);
      await http()
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${bob}`)
        .expect(200);
    });

    it('logout, logout-all and expiry invalidate the correct sessions', async () => {
      const one = await login();
      const two = await login();
      await http()
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${one}`)
        .expect(204);
      await http()
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${one}`)
        .expect(401);
      const three = await login();
      await http()
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${two}`)
        .expect(204);
      await http()
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${three}`)
        .expect(401);
      const expired = await login();
      await context.prisma.userSession.update({
        where: { tokenHash: tokenHash(expired) },
        data: {
          createdAt: new Date(Date.now() - 7200000),
          expiresAt: new Date(Date.now() - 1000),
        },
      });
      await http()
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${expired}`)
        .expect(401);
    });

    it('requires the current password; password change revokes all sessions and reset tokens', async () => {
      const one = await login();
      const two = await login();
      const reset = await forgot();
      await http()
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${one}`)
        .send({
          currentPassword: 'Wrong password 123456',
          newPassword: NEXT_PASSWORD,
        })
        .expect(401);
      await http()
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${one}`)
        .send({ currentPassword: PASSWORD, newPassword: NEXT_PASSWORD })
        .expect(204);
      for (const token of [one, two])
        await http()
          .get('/api/v1/users/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      await http()
        .post('/api/v1/auth/reset-password')
        .send({ token: reset, newPassword: PASSWORD })
        .expect(400);
      await http()
        .post('/api/v1/auth/login')
        .send({ email: 'alice@example.test', password: PASSWORD })
        .expect(401);
      await login('alice', NEXT_PASSWORD);
    });

    it('forgot-password acknowledgement does not disclose account existence or reset token', async () => {
      const responses = [];
      for (const email of [
        'alice@example.test',
        'missing@example.test',
        'secondadmin@example.test',
      ])
        responses.push(
          await http()
            .post('/api/v1/auth/forgot-password')
            .send({ email })
            .expect(202),
        );
      assert.deepEqual(responses[0]!.body, responses[1]!.body);
      assert.deepEqual(responses[1]!.body, responses[2]!.body);
      assert.equal(context.delivery.messages.length, 1);
      assert.ok(
        !JSON.stringify(responses[0]!.body).includes(
          context.delivery.messages[0]!.token,
        ),
      );
      const reset = await context.prisma.passwordResetToken.findFirstOrThrow();
      assert.equal(
        reset.tokenHash,
        tokenHash(context.delivery.messages[0]!.token),
      );
    });

    it('consumes a reset token only once under concurrent requests and revokes every session', async () => {
      const session = await login();
      const token = await forgot();
      const results = await Promise.all(
        Array.from({ length: 2 }, () =>
          http()
            .post('/api/v1/auth/reset-password')
            .send({ token, newPassword: NEXT_PASSWORD }),
        ),
      );
      assert.deepEqual(results.map((r) => r.status).sort(), [204, 400]);
      assert.equal(
        await context.prisma.auditEvent.count({
          where: { action: 'PASSWORD_RESET' },
        }),
        1,
      );
      await http()
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${session}`)
        .expect(401);
      await http()
        .post('/api/v1/auth/reset-password')
        .send({ token, newPassword: PASSWORD })
        .expect(400);
      await login('alice', NEXT_PASSWORD);
    });

    it('rejects expired, unknown and superseded reset tokens without changing password', async () => {
      const old = await forgot();
      const latest = await forgot();
      await context.prisma.passwordResetToken.update({
        where: { tokenHash: tokenHash(latest) },
        data: {
          createdAt: new Date(Date.now() - 7200000),
          expiresAt: new Date(Date.now() - 1000),
        },
      });
      for (const token of [old, latest, randomToken()])
        await http()
          .post('/api/v1/auth/reset-password')
          .send({ token, newPassword: NEXT_PASSWORD })
          .expect(400);
      await login();
    });

    it('invalidates an undelivered reset token and keeps the generic acknowledgement', async () => {
      context.delivery.fail = true;
      await http()
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'alice@example.test' })
        .expect(202);
      assert.equal(
        await context.prisma.passwordResetToken.count({
          where: { consumedAt: null },
        }),
        0,
      );
      await login();
    });

    it('enforces resource ownership and blocks profile mass assignment', async () => {
      const alice = await login();
      const staff = await login('staff');
      for (const token of [alice, staff])
        await http()
          .get('/api/v1/users/' + ids.bob)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      await http()
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${alice}`)
        .send({ displayName: 'Alice changed', role: 'ADMIN' })
        .expect(400);
      await http()
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${alice}`)
        .send({ displayName: 'Alice changed', email: 'bob@example.test' })
        .expect(400);
      const own = await http()
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${alice}`)
        .send({ displayName: 'Alice changed' })
        .expect(200);
      assert.equal(own.body.displayName, 'Alice changed');
      assert.equal(own.body.role, 'CUSTOMER');
    });

    it('allows only ADMIN to list users or change access', async () => {
      for (const name of ['alice', 'staff']) {
        const token = await login(name);
        await http()
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${token}`)
          .expect(403);
        await http()
          .patch('/api/v1/users/' + ids.bob + '/access')
          .set('Authorization', `Bearer ${token}`)
          .send({ role: 'ADMIN', reason: 'Unauthorized test' })
          .expect(403);
      }
      const admin = await login('admin');
      const response = await http()
        .get('/api/v1/users?limit=2')
        .set('Authorization', `Bearer ${admin}`)
        .expect(200);
      assert.equal(response.body.data.length, 2);
      assert.ok(!JSON.stringify(response.body).includes('passwordHash'));
      await http()
        .get('/api/v1/users?limit=51')
        .set('Authorization', `Bearer ${admin}`)
        .expect(400);
      await http()
        .get('/api/v1/users/' + ids.bob)
        .set('Authorization', `Bearer ${admin}`)
        .expect(200);
    });

    it('role changes revoke sessions/reset tokens and audit once; repeated same state is a no-op', async () => {
      const old = await login();
      const reset = await forgot();
      const admin = await login('admin');
      for (let i = 0; i < 2; i++)
        await http()
          .patch('/api/v1/users/' + ids.alice + '/access')
          .set('Authorization', `Bearer ${admin}`)
          .send({ role: 'STAFF', reason: 'Assign store duties' })
          .expect(200);
      await http()
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${old}`)
        .expect(401);
      await http()
        .post('/api/v1/auth/reset-password')
        .send({ token: reset, newPassword: NEXT_PASSWORD })
        .expect(400);
      const audit = await context.prisma.auditEvent.findMany({
        where: { action: 'USER_ACCESS_CHANGED' },
      });
      assert.equal(audit.length, 1);
      assert.deepEqual(audit[0]!.before, {
        role: 'CUSTOMER',
        status: 'ACTIVE',
      });
      assert.deepEqual(audit[0]!.after, { role: 'STAFF', status: 'ACTIVE' });
      assert.equal(audit[0]!.actorId, ids.admin);
      const fresh = await login();
      const me = await http()
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${fresh}`)
        .expect(200);
      assert.equal(me.body.role, 'STAFF');
    });

    it('blocking invalidates sessions immediately; unblocking does not resurrect them', async () => {
      const old = await login();
      const admin = await login('admin');
      await http()
        .patch('/api/v1/users/' + ids.alice + '/access')
        .set('Authorization', `Bearer ${admin}`)
        .send({ status: 'BLOCKED', reason: 'Block test account' })
        .expect(200);
      await http()
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${old}`)
        .expect(401);
      await http()
        .post('/api/v1/auth/login')
        .send({ email: 'alice@example.test', password: PASSWORD })
        .expect(401);
      await http()
        .patch('/api/v1/users/' + ids.alice + '/access')
        .set('Authorization', `Bearer ${admin}`)
        .send({ status: 'ACTIVE', reason: 'Unblock test account' })
        .expect(200);
      await http()
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${old}`)
        .expect(401);
      await login();
    });

    it('protects the last active admin, including concurrent self-demotions', async () => {
      const admin = await login('admin');
      /** Helper gửi PATCH thay đổi dữ liệu trong kịch bản kiểm thử. */
      const patch = (id: string, token: string) =>
        http()
          .patch('/api/v1/users/' + id + '/access')
          .set('Authorization', `Bearer ${token}`)
          .send({ role: 'CUSTOMER', reason: 'Reduce access for test' });
      const rejected = await patch(ids.admin, admin).expect(409);
      assert.equal(rejected.body.code, 'LAST_ADMIN_REQUIRED');
      await context.prisma.user.update({
        where: { id: ids.secondAdmin },
        data: { status: 'ACTIVE' },
      });
      const second = await login('secondadmin');
      const responses = await Promise.all([
        patch(ids.admin, admin),
        patch(ids.secondAdmin, second),
      ]);
      assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
      assert.equal(
        await context.prisma.user.count({
          where: { role: 'ADMIN', status: 'ACTIVE' },
        }),
        1,
      );
    });

    it('rechecks a formerly valid principal inside writes after its session is revoked', async () => {
      const token = await login();
      const stale = await principal(token);
      await context.app.get(AuthService).logoutAll(stale);
      await assert.rejects(
        context.app
          .get(UsersService)
          .updateMe(stale, { displayName: 'Must not persist' }),
        (error: unknown) =>
          (error as { getStatus(): number }).getStatus() === 401,
      );
      assert.equal(
        (
          await context.prisma.user.findUniqueOrThrow({
            where: { id: ids.alice },
          })
        ).displayName,
        'alice',
      );
    });

    it('rate limits by real peer IP and ignores spoofed forwarding headers', async () => {
      for (let i = 0; i < 20; i++)
        await http()
          .post('/api/v1/auth/login')
          .set('X-Forwarded-For', `192.0.2.${i}`)
          .send({ email: 'invalid', password: PASSWORD })
          .expect(400);
      const response = await http()
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', '198.51.100.1')
        .send({ email: 'invalid', password: PASSWORD })
        .expect(429);
      assert.ok(Number(response.headers['retry-after']) > 0);
      assert.equal(response.body.code, 'RATE_LIMITED');
    });

    it('rate bucket updates are atomic under concurrent requests', async () => {
      const responses = await Promise.all(
        Array.from({ length: 10 }, () =>
          http().post('/api/v1/auth/register').send({ email: 'invalid' }),
        ),
      );
      assert.equal(responses.filter((r) => r.status === 400).length, 5);
      assert.equal(responses.filter((r) => r.status === 429).length, 5);
    });

    it('forgot-password throttles repeated email requests including unknown accounts', async () => {
      for (let i = 0; i < 3; i++)
        await http()
          .post('/api/v1/auth/forgot-password')
          .send({ email: 'missing@example.test' })
          .expect(202);
      await http()
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'MISSING@example.test' })
        .expect(429);
    });

    it('DB constraints reject non-normalized email, duplicate token digests and invalid expiry', async () => {
      await assert.rejects(
        context.sql.query('UPDATE users SET email = $1 WHERE id = $2', [
          'ALICE@example.test',
          ids.alice,
        ]),
        { code: '23514' },
      );
      await assert.rejects(
        context.sql.query(
          'UPDATE users SET failed_login_attempts = 6 WHERE id = $1',
          [ids.alice],
        ),
        { code: '23514' },
      );
      const one = await login();
      const two = await login();
      await assert.rejects(
        context.sql.query(
          'UPDATE user_sessions SET token_hash = $1 WHERE token_hash = $2',
          [tokenHash(one), tokenHash(two)],
        ),
        { code: '23505' },
      );
      await assert.rejects(
        context.sql.query(
          'UPDATE user_sessions SET expires_at = created_at WHERE token_hash = $1',
          [tokenHash(one)],
        ),
        { code: '23514' },
      );
    });
  },
);
