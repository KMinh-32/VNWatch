/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/auth/auth.service.ts
 * Nghiệp vụ tài khoản và phiên: đăng ký, đăng nhập, đổi mật khẩu, reset và thu hồi phiên trong database.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { publicUserSelect, toUserDto } from '../users/user-mapping';
import { PasswordService } from './password.service';
import { ResetDelivery } from './reset-delivery';
import {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  SessionDto,
} from './auth.dto';
import {
  LOGIN_LOCK_MS,
  MAX_LOGIN_FAILURES,
  RESET_TTL_MS,
  SESSION_TTL_MS,
} from './auth.constants';
import {
  invalidCredentials,
  invalidSession,
  lockUser,
  requireCurrentSession,
} from './auth-transaction';
import { Principal } from './auth.types';
import { randomToken, tokenHash } from './tokens';

/** Service tập trung nghiệp vụ; các dependency được tiêm qua constructor để có thể kiểm thử độc lập. */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  // NestJS tiêm các dependency được khai báo; private readonly vừa nhận tham số vừa tạo thuộc tính của lớp.
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly delivery: ResetDelivery,
  ) {}

  /** Băm mật khẩu và tạo user CUSTOMER; chuyển lỗi unique email thành xung đột 409. */
  async register(dto: RegisterDto) {
    const passwordHash = await this.passwords.hash(dto.password);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          displayName: dto.displayName,
          passwordHash,
          role: 'CUSTOMER',
        },
        select: publicUserSelect,
      });
      return toUserDto(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException({
          code: 'EMAIL_IN_USE',
          message: 'Email này không thể dùng để đăng ký.',
        });
      throw error;
    }
  }

  /** Xác minh mật khẩu rồi khóa user, kiểm tra lại trạng thái/hash, đếm lần sai và cấp token phiên chỉ khi hợp lệ. */
  async login(dto: LoginDto, adminOnly = false) {
    const observed = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    // Unknown accounts still perform the same password derivation work.
    // Kể cả email không tồn tại vẫn chạy kiểm tra hash giả; không bỏ qua phần tính scrypt tốn thời gian.
    const matches = await this.passwords.verify(
      dto.password,
      observed?.passwordHash,
    );
    if (!observed) throw invalidCredentials();
    const sessionToken = randomToken();
    // Kết quả login thất bại được trả null trong transaction để bộ đếm sai vẫn COMMIT; ném lỗi ở ngoài.
    const result = await this.prisma.$transaction(async (tx) => {
      await lockUser(tx, observed.id);
      const user = await tx.user.findUniqueOrThrow({
        where: { id: observed.id },
      });
      const now = new Date();
      if (
        user.status !== 'ACTIVE' ||
        // Hash đã đổi kể từ lúc kiểm tra mật khẩu thì không cho đăng nhập bằng mật khẩu cũ nữa.
        user.passwordHash !== observed.passwordHash ||
        (user.lockedUntil && user.lockedUntil > now)
      )
        return null;
      if (!matches) {
        const failures = (user.lockedUntil ? 0 : user.failedLoginAttempts) + 1;
        await tx.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: failures,
            lockedUntil:
              failures >= MAX_LOGIN_FAILURES
                ? new Date(now.getTime() + LOGIN_LOCK_MS)
                : null,
          },
        });
        return null;
      }
      // Cửa vào admin chỉ cấp phiên khi role hiện tại trong DB là ADMIN, không tin role client gửi.
      if (adminOnly && user.role !== 'ADMIN') return null;
      await tx.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
      const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
      const oldSessions = await tx.userSession.findMany({
        where: { userId: user.id, revokedAt: null, expiresAt: { gt: now } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        // Giữ tối đa chín phiên cũ trước khi tạo thêm một phiên mới, tổng tối đa mười phiên còn hoạt động.
        skip: 9,
        select: { id: true },
      });
      if (oldSessions.length)
        await tx.userSession.updateMany({
          where: { id: { in: oldSessions.map((s) => s.id) } },
          data: { revokedAt: now },
        });
      await tx.userSession.create({
        data: {
          userId: user.id,
          tokenHash: tokenHash(sessionToken),
          createdAt: now,
          expiresAt,
        },
      });
      return {
        sessionToken,
        tokenType: 'Bearer' as const,
        expiresAt: expiresAt.toISOString(),
        user: toUserDto(user),
      };
    });
    // Throw after commit so failed-login counters are not rolled back.
    // Đến đây transaction đã commit, nên lần nhập sai không bị rollback do exception HTTP.
    if (!result) throw invalidCredentials();
    return result;
  }

  /** Chỉ liệt kê các phiên còn hạn/chưa thu hồi của user và đánh dấu phiên đang sử dụng. */
  async sessions(principal: Principal): Promise<SessionDto[]> {
    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId: principal.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: { id: true, createdAt: true, expiresAt: true },
    });
    return sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      current: s.id === principal.sessionId,
    }));
  }

  /** Thu hồi phiên chỉ thuộc chính user sau khi kiểm tra lại quyền trong transaction. */
  async revokeSession(principal: Principal, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await lockUser(tx, principal.userId);
      await requireCurrentSession(tx, principal);
      const session = await tx.userSession.findFirst({
        where: { id, userId: principal.userId },
      });
      if (!session)
        throw new NotFoundException({
          code: 'SESSION_NOT_FOUND',
          message: 'Không tìm thấy phiên đăng nhập.',
        });
      await tx.userSession.updateMany({
        where: { id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }

  /** Thu hồi toàn bộ phiên đang hoạt động của user bằng một thao tác database. */
  async logoutAll(principal: Principal): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await lockUser(tx, principal.userId);
      await requireCurrentSession(tx, principal);
      await tx.userSession.updateMany({
        where: { userId: principal.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }

  /** Đổi passwordHash, xóa khóa đăng nhập, vô hiệu các phiên/reset token và ghi audit trong cùng transaction. */
  private async replacePassword(
    tx: Prisma.TransactionClient,
    userId: string,
    hash: string,
    actorId: string | null,
    action: string,
  ): Promise<void> {
    const now = new Date();
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash: hash, failedLoginAttempts: 0, lockedUntil: null },
    });
    const revoked = await tx.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: now },
    });
    await tx.auditEvent.create({
      data: {
        actorId,
        targetUserId: userId,
        action,
        before: {},
        after: { sessionsRevoked: revoked.count },
      },
    });
  }

  /** Xác minh mật khẩu cũ, băm mật khẩu mới rồi kiểm tra lại phiên/hash dưới khóa trước khi thay. */
  async changePassword(
    principal: Principal,
    dto: ChangePasswordDto,
  ): Promise<void> {
    const observed = await this.prisma.user.findUnique({
      where: { id: principal.userId },
    });
    if (
      !observed ||
      !(await this.passwords.verify(dto.currentPassword, observed.passwordHash))
    )
      throw invalidCredentials();
    const hash = await this.passwords.hash(dto.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await lockUser(tx, principal.userId);
      const user = await requireCurrentSession(tx, principal);
      if (user.passwordHash !== observed.passwordHash) throw invalidSession();
      await this.replacePassword(
        tx,
        user.id,
        hash,
        user.id,
        'PASSWORD_CHANGED',
      );
    });
  }

  /** Nếu email hoạt động, tạo reset token ngắn hạn và gửi qua adapter; không lộ việc email có tồn tại. */
  async forgotPassword(email: string): Promise<void> {
    const observed = await this.prisma.user.findUnique({ where: { email } });
    if (!observed) return;
    const token = randomToken();
    const record = await this.prisma.$transaction(async (tx) => {
      await lockUser(tx, observed.id);
      const user = await tx.user.findUniqueOrThrow({
        where: { id: observed.id },
      });
      if (user.status !== 'ACTIVE') return null;
      const now = new Date();
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: now },
      });
      return tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: tokenHash(token),
          createdAt: now,
          expiresAt: new Date(now.getTime() + RESET_TTL_MS),
        },
      });
    });
    if (!record) return;
    try {
      await this.delivery.send({
        recipient: email,
        token,
        expiresAt: record.expiresAt.toISOString(),
      });
    } catch {
      await this.prisma.passwordResetToken.updateMany({
        where: { id: record.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      this.logger.error({ event: 'password_reset_delivery_failed' });
    }
  }

  /** Tiêu thụ reset token bằng update có điều kiện để chỉ một request thành công rồi thay mật khẩu. */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    /** Tạo lỗi chung cho token reset sai/hết hạn/đã dùng. */
    const fail = () =>
      new BadRequestException({
        code: 'RESET_TOKEN_INVALID',
        message: 'Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
      });
    const observed = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: tokenHash(dto.token) },
    });
    if (!observed || observed.consumedAt || observed.expiresAt <= new Date())
      throw fail();
    const hash = await this.passwords.hash(dto.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await lockUser(tx, observed.userId);
      const user = await tx.user.findUniqueOrThrow({
        where: { id: observed.userId },
      });
      // Điều kiện consumedAt/hạn là chốt dùng một lần: request thứ hai không thể tiêu thụ lại token đã dùng.
      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id: observed.id,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { consumedAt: new Date() },
      });
      if (!consumed.count || user.status !== 'ACTIVE') throw fail();
      await this.replacePassword(tx, user.id, hash, null, 'PASSWORD_RESET');
    });
  }
}
