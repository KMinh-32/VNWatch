/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/auth/password.service.ts
 * Băm mật khẩu với scrypt và salt ngẫu nhiên, giới hạn số tác vụ tốn bộ nhớ, so sánh bằng timingSafeEqual.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const PREFIX = 'scrypt:131072:8:1';
const DUMMY = `${PREFIX}:${'0'.repeat(32)}:${'0'.repeat(128)}`;

/** Service tập trung nghiệp vụ; các dependency được tiêm qua constructor để có thể kiểm thử độc lập. */
@Injectable()
export class PasswordService {
  // Cờ đang hoạt động; ý nghĩa cụ thể tùy đối tượng.
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  /** Chạy scrypt bất đồng bộ; tối đa hai việc đang chạy và tám việc chờ để giới hạn bộ nhớ. */
  private async derive(password: string, salt: string): Promise<Buffer> {
    // Two jobs bound scrypt memory to approximately 256 MiB per application process.
    // scrypt dùng nhiều RAM: xếp hàng khi đã có hai tác vụ, từ chối nếu hàng chờ cũng đầy.
    if (this.active >= 2) {
      if (this.waiting.length >= 8)
        throw new ServiceUnavailableException({
          code: 'AUTH_BUSY',
          message: 'Hệ thống đăng nhập đang bận, vui lòng thử lại.',
        });
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    } else {
      this.active++;
    }
    try {
      return await new Promise<Buffer>((resolve, reject) =>
        scrypt(
          password,
          Buffer.from(salt, 'hex'),
          64,
          // N/r/p là chi phí scrypt; maxmem giới hạn bộ nhớ. Không dùng hash nhanh SHA-256 thay cho hash mật khẩu.
          { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
          (error, key) => (error ? reject(error) : resolve(key)),
        ),
      );
    } finally {
      // finally luôn trao slot cho lượt kế tiếp hoặc giảm bộ đếm, kể cả scrypt lỗi.
      const next = this.waiting.shift();
      if (next) next();
      else this.active--;
    }
  }

  /** Sinh salt riêng cho mỗi mật khẩu rồi lưu tham số, salt và kết quả scrypt thành chuỗi. */
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    return `${PREFIX}:${salt}:${(await this.derive(password, salt)).toString('hex')}`;
  }

  /** Dùng hash giả nếu tài khoản/hash thiếu, vẫn chạy scrypt; so sánh byte bằng timingSafeEqual. */
  async verify(password: string, encoded?: string): Promise<boolean> {
    const valid =
      typeof encoded === 'string' &&
      /^scrypt:131072:8:1:[a-f0-9]{32}:[a-f0-9]{128}$/.test(encoded);
    const parts = (valid ? encoded : DUMMY).split(':');
    const key = await this.derive(password, parts[4]!);
    return timingSafeEqual(key, Buffer.from(parts[5]!, 'hex')) && valid;
  }
}
