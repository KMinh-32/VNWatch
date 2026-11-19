import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { invalidSession } from '../auth/auth-transaction';
import { tokenHash } from '../auth/tokens';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { AssistantService } from './assistant.service';
import { AssistantChatDto, AssistantReplyDto } from './assistant.dto';

type Owner =
  | { maTK: string; guestTokenHash: null }
  | { maTK: null; guestTokenHash: string };
const summary = {
  maHoiThoai: true,
  tieuDe: true,
  trangThai: true,
  dataKind: true,
  ngayTao: true,
  ngayCapNhat: true,
} as const;

@Injectable()
export class ConversationService {
  constructor(
    private readonly db: PrismaService,
    private readonly assistant: AssistantService,
  ) {}

  /** Không nhận MaTK từ trình duyệt. Đăng nhập dùng phiên đã kiểm tra; khách dùng cookie ngẫu nhiên. */
  async owner(req: Request, res: Response): Promise<Owner> {
    if (req.headers.authorization) {
      const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(
        req.headers.authorization,
      );
      if (!match) throw invalidSession();
      const session = await this.db.userSession.findFirst({
        where: {
          tokenHash: tokenHash(match[1]!),
          revokedAt: null,
          expiresAt: { gt: new Date() },
          user: { status: 'ACTIVE' },
        },
        select: { userId: true },
      });
      if (!session) throw invalidSession();
      return { maTK: session.userId, guestTokenHash: null };
    }
    const existing = /(?:^|;\s*)vnwatch_chat=([A-Za-z0-9_-]{43})(?:;|$)/.exec(
      req.headers.cookie ?? '',
    )?.[1];
    const token = existing ?? randomBytes(32).toString('base64url');
    if (!existing)
      res.cookie('vnwatch_chat', token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: req.secure,
        path: '/api/v1/assistant',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    return { maTK: null, guestTokenHash: tokenHash(token) };
  }

  async create(owner: Owner, dataKind: 'REFERENCE' | 'DEMO') {
    return this.db.hoiThoai.create({
      data: { ...owner, dataKind },
      select: summary,
    });
  }
  async list(owner: Owner, dataKind: 'REFERENCE' | 'DEMO') {
    return this.db.hoiThoai.findMany({
      where: { ...owner, dataKind },
      select: summary,
      orderBy: [{ ngayCapNhat: 'desc' }, { maHoiThoai: 'desc' }],
      take: 30,
    });
  }

  private async owned(owner: Owner, id: string) {
    const conversation = await this.db.hoiThoai.findFirst({
      where: { ...owner, maHoiThoai: id },
      select: summary,
    });
    if (!conversation)
      throw new NotFoundException('Không tìm thấy hội thoại của bạn.');
    return conversation;
  }

  async messages(owner: Owner, id: string, before?: number) {
    const conversation = await this.owned(owner, id);
    const rows = await this.db.tinNhan.findMany({
      where: {
        maHoiThoai: id,
        ...(before ? { maTinNhan: { lt: before } } : {}),
      },
      orderBy: { maTinNhan: 'desc' },
      take: 101,
    });
    const hasMore = rows.length > 100;
    const messages = rows.slice(0, 100).reverse();
    return {
      conversation,
      messages,
      nextBefore: hasMore ? messages[0]!.maTinNhan : null,
    };
  }

  /** Đóng phiên vẫn giữ lịch sử. Chặn đóng khi lượt hỏi đang xử lý để tránh kết quả đến sau khi đóng. */
  async close(owner: Owner, id: string) {
    await this.owned(owner, id);
    return this.db.$transaction(async (tx) => {
      // UPDATE lấy khóa hàng và dùng đúng schema của Prisma (kể cả schema kiểm thử).
      await tx.hoiThoai.update({
        where: { maHoiThoai: id },
        data: { ngayCapNhat: new Date() },
      });
      if (
        await tx.tinNhan.count({
          where: {
            maHoiThoai: id,
            trangThai: 'DANG_XU_LY',
            thoiGian: { gt: new Date(Date.now() - 60000) },
          },
        })
      )
        throw new ConflictException(
          'Đang trả lời câu hỏi. Vui lòng chờ rồi đóng hội thoại.',
        );
      await tx.tinNhan.updateMany({
        where: { maHoiThoai: id, trangThai: 'DANG_XU_LY' },
        data: {
          trangThai: 'LOI',
          noiDung: 'Lượt trả lời bị gián đoạn. Hãy tạo hội thoại mới.',
        },
      });
      return tx.hoiThoai.update({
        where: { maHoiThoai: id },
        data: { trangThai: 'DA_DONG' },
        select: summary,
      });
    });
  }

  async send(owner: Owner, body: AssistantChatDto) {
    const conversation = body.conversationId
      ? await this.owned(owner, body.conversationId)
      : await this.create(owner, body.dataKind);
    if (conversation.dataKind !== body.dataKind)
      throw new ConflictException(
        'Hội thoại thuộc catalog khác. Hãy tạo hội thoại mới.',
      );
    const id = conversation.maHoiThoai;
    const requestId = body.requestId ?? randomUUID();
    // Khóa hàng chỉ trong giao dịch ngắn; không giữ kết nối DB khi chờ AI qua mạng.
    const turn = await this.db.$transaction(async (tx) => {
      const current = await tx.hoiThoai.update({
        where: { maHoiThoai: id },
        data: { ngayCapNhat: new Date() },
      });
      if (current.trangThai !== 'DANG_MO')
        throw new ConflictException(
          'Hội thoại đã đóng. Hãy tạo hội thoại mới.',
        );
      const prior = await tx.tinNhan.findMany({
        where: { maHoiThoai: id, requestId },
        orderBy: { maTinNhan: 'asc' },
      });
      if (prior.length && prior[0]!.noiDung !== body.message)
        throw new ConflictException('Mã lượt gửi đã dùng cho câu hỏi khác.');
      const answer = prior.find((m) => m.nguoiGui === 'assistant');
      if (answer?.trangThai === 'HOAN_THANH' && answer.duLieuTraLoi)
        return { cached: answer.duLieuTraLoi, answerId: answer.maTinNhan };
      const stale = new Date(Date.now() - 60000);
      if (
        await tx.tinNhan.count({
          where: {
            maHoiThoai: id,
            trangThai: 'DANG_XU_LY',
            thoiGian: { gt: stale },
          },
        })
      )
        throw new ConflictException(
          'Hội thoại đang xử lý một câu hỏi. Vui lòng thử lại sau.',
        );
      await tx.tinNhan.updateMany({
        where: { maHoiThoai: id, trangThai: 'DANG_XU_LY' },
        data: {
          trangThai: 'LOI',
          noiDung: 'Lượt trả lời bị gián đoạn. Bạn có thể gửi lại câu hỏi.',
        },
      });
      if ((await tx.tinNhan.count({ where: { maHoiThoai: id } })) >= 1000)
        throw new ConflictException(
          'Hội thoại đã dài. Hãy bắt đầu hội thoại mới.',
        );
      if (!prior.length)
        await tx.tinNhan.create({
          data: {
            maHoiThoai: id,
            requestId,
            nguoiGui: 'user',
            noiDung: body.message,
          },
        });
      const pending = answer
        ? await tx.tinNhan.update({
            where: { maTinNhan: answer.maTinNhan },
            data: {
              trangThai: 'DANG_XU_LY',
              noiDung: '',
              thoiGian: new Date(),
            },
          })
        : await tx.tinNhan.create({
            data: {
              maHoiThoai: id,
              requestId,
              nguoiGui: 'assistant',
              noiDung: '',
              trangThai: 'DANG_XU_LY',
            },
          });
      await tx.hoiThoai.update({
        where: { maHoiThoai: id },
        data: {
          tieuDe: current.tieuDe ?? body.message.slice(0, 150),
          ngayCapNhat: new Date(),
        },
      });
      return { cached: null, answerId: pending.maTinNhan };
    });
    if (turn.cached)
      return {
        ...(turn.cached as unknown as AssistantReplyDto),
        conversationId: id,
        requestId,
        messageId: turn.answerId,
      };
    try {
      // Lấy lịch sử từ DB đã kiểm tra quyền; bỏ history tự khai của trình duyệt.
      const previous = await this.db.tinNhan.findMany({
        where: {
          maHoiThoai: id,
          requestId: { not: requestId },
          trangThai: 'HOAN_THANH',
        },
        orderBy: { maTinNhan: 'desc' },
        take: 8,
      });
      const reply = await this.assistant.chat(
        Object.assign(new AssistantChatDto(), body, {
          history: previous.reverse().map((m) => ({
            role: m.nguoiGui as 'user' | 'assistant',
            content: m.noiDung.slice(0, 1000),
          })),
        }),
      );
      await this.db.$transaction([
        this.db.tinNhan.update({
          where: { maTinNhan: turn.answerId },
          data: {
            noiDung: reply.text,
            trangThai: 'HOAN_THANH',
            cheDo: reply.mode,
            yDinh: reply.intent ?? null,
            tenMoHinh: reply.modelName ?? null,
            duLieuTraLoi: JSON.parse(
              JSON.stringify(reply),
            ) as Prisma.InputJsonValue,
          },
        }),
        this.db.hoiThoai.update({
          where: { maHoiThoai: id },
          data: { ngayCapNhat: new Date() },
        }),
      ]);
      return {
        ...reply,
        conversationId: id,
        requestId,
        messageId: turn.answerId,
      };
    } catch (error) {
      await this.db.tinNhan.update({
        where: { maTinNhan: turn.answerId },
        data: {
          trangThai: 'LOI',
          noiDung: 'Trợ lý chưa trả lời được. Bạn có thể gửi lại câu hỏi.',
        },
      });
      throw error;
    }
  }
}
