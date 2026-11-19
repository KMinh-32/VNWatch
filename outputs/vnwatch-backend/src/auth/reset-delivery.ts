/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/auth/reset-delivery.ts
 * Adapter gửi thông tin reset. Bản phát triển ghi outbox cục bộ; không tự gửi email thật.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

/** Kiểu ResetMail mô tả cấu trúc dữ liệu lúc biên dịch; dữ liệu HTTP/IPC vẫn cần kiểm tra khi chạy. */
export interface ResetMail {
  recipient: string;
  // Token đầu vào; backend tra hash thay vì lưu token gốc.
  token: string;
  // Thời điểm hết hiệu lực.
  expiresAt: string;
}
export abstract class ResetDelivery {
  /** Adapter nhận thông tin phát reset; implementation phát triển ghi file outbox riêng với quyền truy cập hạn chế. */
  abstract send(message: ResetMail): Promise<void>;
}

@Injectable()
export class LocalResetDelivery extends ResetDelivery {
  // NestJS tiêm các dependency được khai báo; private readonly vừa nhận tham số vừa tạo thuộc tính của lớp.
  constructor() {
    super();
    if (!['development', 'test'].includes(process.env.NODE_ENV ?? '')) {
      throw new Error(
        'Local reset delivery is development/test only. Configure a real delivery adapter before deployment.',
      );
    }
  }
  /** Adapter nhận thông tin phát reset; implementation phát triển ghi file outbox riêng với quyền truy cập hạn chế. */
  async send(message: ResetMail): Promise<void> {
    const directory = resolve(process.env.RESET_MAIL_DIR ?? 'work/mail-outbox');
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(
      resolve(directory, `${randomUUID()}.json`),
      JSON.stringify({ mode: 'LOCAL_DEMO_NOT_SENT', ...message }, null, 2),
      { flag: 'wx', mode: 0o600 },
    );
  }
}
