/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/users/users.service.ts
 * Đọc/sửa hồ sơ và quản trị tài khoản. Thay quyền phải giữ ít nhất một ADMIN hoạt động, thu hồi phiên và ghi nhật ký.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { Principal } from '../auth/auth.types';
import { lockUser, requireCurrentSession } from '../auth/auth-transaction';
import { ListUsersDto, UpdateAccessDto, UpdateProfileDto } from './user.dto';
import { PasswordService } from '../auth/password.service';
import {
  AdminCreateUserDto,
  AdminProfileDto,
  AdminReasonDto,
} from './admin-user.dto';
import { publicUserSelect, toUserDto } from './user-mapping';

/** Service tập trung nghiệp vụ; các dependency được tiêm qua constructor để có thể kiểm thử độc lập. */
@Injectable()
export class UsersService {
  // NestJS tiêm các dependency được khai báo; private readonly vừa nhận tham số vừa tạo thuộc tính của lớp.
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  /** Chỉ đọc chính user hoặc theo quyền ADMIN; cùng lỗi 404 cho dữ liệu không thuộc quyền xem. */
  async findOne(principal: Principal, id: string) {
    const user =
      principal.userId === id || principal.role === 'ADMIN'
        ? await this.prisma.user.findUnique({
            where: { id },
            select: publicUserSelect,
          })
        : null;
    if (!user)
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Không tìm thấy người dùng.',
      });
    return toUserDto(user);
  }

  /** Lọc email/tên/role/status rồi đọc trang/count với snapshot RepeatableRead. */
  async list(query: ListUsersDto) {
    const escaped = query.q?.replace(/[\\%_]/g, '\\$&');
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(escaped
        ? {
            OR: [
              { email: { contains: escaped, mode: 'insensitive' } },
              { displayName: { contains: escaped, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [users, total] = await this.prisma.$transaction(
      [
        this.prisma.user.findMany({
          where,
          select: publicUserSelect,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.user.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      data: users.map(toUserDto),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /** Chỉ sửa displayName của principal; kiểm tra lại phiên trong transaction. */
  async updateMe(principal: Principal, dto: UpdateProfileDto) {
    return this.prisma.$transaction(async (tx) => {
      await lockUser(tx, principal.userId);
      await requireCurrentSession(tx, principal);
      return toUserDto(
        await tx.user.update({
          where: { id: principal.userId },
          data: { displayName: dto.displayName },
          select: publicUserSelect,
        }),
      );
    });
  }

  /** Tuần tự hóa thay quyền bằng advisory lock, giữ ADMIN cuối cùng, thu hồi phiên nếu quyền/trạng thái đổi và ghi audit. */
  async updateAccess(
    principal: Principal,
    id: string,
    dto: UpdateAccessDto & { displayName?: string },
  ) {
    if (!dto.role && !dto.status && !dto.displayName)
      throw new BadRequestException({
        code: 'ACCESS_CHANGE_REQUIRED',
        message: 'Cần cung cấp vai trò hoặc trạng thái mới.',
      });
    return this.prisma.$transaction(
      async (tx) => {
        // Serialize admin-access changes, including last-admin checks, across app instances.
        // Advisory lock dùng chung giữa các instance: hai admin không thể đồng thời loại bỏ cả hai ADMIN cuối cùng.
        await tx.$queryRaw`SELECT 1 WHERE pg_advisory_xact_lock(87120, 1) IS NULL`;
        // Loại ID trùng và khóa theo thứ tự ổn định để giảm nguy cơ deadlock khi hai thao tác chéo actor/target.
        for (const userId of [...new Set([principal.userId, id])].sort())
          await lockUser(tx, userId);
        const actor = await requireCurrentSession(tx, principal);
        if (actor.role !== 'ADMIN')
          throw new ForbiddenException({
            code: 'FORBIDDEN',
            message: 'Bạn không có quyền thực hiện thao tác này.',
          });
        const target = await tx.user.findUnique({ where: { id } });
        if (!target)
          throw new NotFoundException({
            code: 'USER_NOT_FOUND',
            message: 'Không tìm thấy người dùng.',
          });
        const role = dto.role ?? target.role;
        const status = dto.status ?? target.status;
        if (
          role === target.role &&
          status === target.status &&
          (!dto.displayName || dto.displayName === target.displayName)
        )
          return toUserDto(target);
        if (
          target.role === 'ADMIN' &&
          target.status === 'ACTIVE' &&
          (role !== 'ADMIN' || status !== 'ACTIVE')
        ) {
          const admins = await tx.user.count({
            where: { role: 'ADMIN', status: 'ACTIVE' },
          });
          // Bảo vệ tài khoản ADMIN cuối cùng còn ACTIVE để hệ thống không mất người có quyền quản trị.
          if (admins <= 1)
            throw new ConflictException({
              code: 'LAST_ADMIN_REQUIRED',
              message: 'Phải giữ ít nhất một quản trị viên đang hoạt động.',
            });
        }
        const updated = await tx.user.update({
          where: { id },
          data: {
            role,
            status,
            ...(dto.displayName ? { displayName: dto.displayName } : {}),
          },
          select: publicUserSelect,
        });
        // Thay quyền/khóa user làm các phiên và reset token cũ hết hiệu lực ngay trong cùng transaction.
        if (role !== target.role || status !== target.status) {
          await tx.userSession.updateMany({
            where: { userId: id, revokedAt: null },
            data: { revokedAt: new Date() },
          });
          await tx.passwordResetToken.updateMany({
            where: { userId: id, consumedAt: null },
            data: { consumedAt: new Date() },
          });
        }
        await tx.auditEvent.create({
          data: {
            actorId: actor.id,
            targetUserId: id,
            action: 'USER_ACCESS_CHANGED',
            before: {
              role: target.role,
              status: target.status,
              ...(dto.displayName ? { displayName: target.displayName } : {}),
            },
            after: {
              role,
              status,
              ...(dto.displayName ? { displayName: updated.displayName } : {}),
            },
            reason: dto.reason,
          },
        });
        await tx.businessAudit.create({
          data: {
            actorId: actor.id,
            action: 'USER_ACCESS_CHANGED',
            targetId: id,
            before: {
              role: target.role,
              status: target.status,
              displayName: target.displayName,
            },
            after: { role, status, displayName: updated.displayName },
            reason: dto.reason,
          },
        });
        return toUserDto(updated);
      },
      { timeout: 10000 },
    );
  }
  /** Khóa actor/target theo thứ tự và kiểm tra lại ADMIN trước khi chạy callback ghi dữ liệu. */
  private async adminWrite<T>(
    principal: Principal,
    id: string | null,
    action: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        for (const userId of [
          ...new Set([principal.userId, ...(id ? [id] : [])]),
        ].sort())
          await lockUser(tx, userId);
        const actor = await requireCurrentSession(tx, principal);
        if (actor.role !== 'ADMIN') throw new ForbiddenException();
        return action(tx);
      },
      { maxWait: 15000, timeout: 15000 },
    );
  }
  /** Băm mật khẩu, tạo user theo DTO admin, ghi audit và chuyển lỗi email trùng thành 409. */
  async create(principal: Principal, dto: AdminCreateUserDto) {
    const passwordHash = await this.passwords.hash(dto.password);
    try {
      return await this.adminWrite(principal, null, async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            displayName: dto.displayName,
            passwordHash,
            role: dto.role,
          },
          select: publicUserSelect,
        });
        await tx.businessAudit.create({
          data: {
            actorId: principal.userId,
            action: 'USER_CREATE',
            targetId: user.id,
            before: {},
            after: {
              role: user.role,
              status: user.status,
              displayName: user.displayName,
            },
            reason: dto.reason,
          },
        });
        return toUserDto(user);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException({
          code: 'EMAIL_IN_USE',
          message: 'Email này đã được sử dụng.',
        });
      throw error;
    }
  }
  /** Dùng chung updateAccess để giữ các quy tắc quyền và thu hồi phiên nhất quán. */
  adminProfile(principal: Principal, id: string, dto: AdminProfileDto) {
    return this.updateAccess(principal, id, dto);
  }
  /** Admin thu hồi phiên/reset token của target; tùy unlock còn xóa bộ đếm/khóa đăng nhập và ghi audit. */
  adminSessions(
    principal: Principal,
    id: string,
    dto: AdminReasonDto,
    unlock = false,
  ) {
    return this.adminWrite(principal, id, async (tx) => {
      const before = await tx.user.findUnique({ where: { id } });
      if (!before)
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          message: 'Không tìm thấy tài khoản.',
        });
      const now = new Date();
      const revoked = await tx.userSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: id, consumedAt: null },
        data: { consumedAt: now },
      });
      if (unlock)
        await tx.user.update({
          where: { id },
          data: { lockedUntil: null, failedLoginAttempts: 0 },
        });
      await tx.businessAudit.create({
        data: {
          actorId: principal.userId,
          action: unlock ? 'USER_LOGIN_UNLOCK' : 'USER_SESSIONS_REVOKE',
          targetId: id,
          before: { lockedUntil: before.lockedUntil?.toISOString() ?? null },
          after: { revokedSessions: revoked.count },
          reason: dto.reason,
        },
      });
      return { revokedSessions: revoked.count };
    });
  }
}
