/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/auth/auth.dto.ts
 * DTO đăng nhập/đăng ký/reset: chuẩn hóa email, giới hạn chuỗi và mô tả kết quả phiên.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { normalizeEmail, UpdateProfileDto, UserDto } from '../users/user.dto';

/** RegisterDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class RegisterDto extends UpdateProfileDto {
  // Địa chỉ đăng nhập; chuẩn hóa trước khi tra cứu. Kiểm tra: IsEmail({}, { message: 'Email không hợp lệ.' }), MaxLength(254, { message: 'Email tối đa 254 ký tự.' }).
  @ApiProperty({ example: 'learner@example.test', maxLength: 254 })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @MaxLength(254, { message: 'Email tối đa 254 ký tự.' })
  email!: string;
  // Mật khẩu đầu vào; backend băm trước khi lưu, không trả ra API. Kiểm tra: MinLength(15, { message: 'Mật khẩu tối thiểu 15 ký tự.' }), MaxLength(128, { message: 'Mật khẩu tối đa 128 ký tự.' }).
  @ApiProperty({ minLength: 15, maxLength: 128, format: 'password' })
  @IsString({ message: 'Mật khẩu phải là chuỗi.' })
  @MinLength(15, { message: 'Mật khẩu tối thiểu 15 ký tự.' })
  @MaxLength(128, { message: 'Mật khẩu tối đa 128 ký tự.' })
  password!: string;
}
/** LoginDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class LoginDto {
  // Địa chỉ đăng nhập; chuẩn hóa trước khi tra cứu. Kiểm tra: IsEmail({}, { message: 'Email không hợp lệ.' }), MaxLength(254, { message: 'Email tối đa 254 ký tự.' }).
  @ApiProperty({ example: 'learner@example.test' })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @MaxLength(254, { message: 'Email tối đa 254 ký tự.' })
  email!: string;
  // Mật khẩu đầu vào; backend băm trước khi lưu, không trả ra API. Kiểm tra: MinLength(1, { message: 'Mật khẩu không được rỗng.' }), MaxLength(128, { message: 'Mật khẩu tối đa 128 ký tự.' }).
  @ApiProperty({ format: 'password', maxLength: 128 })
  @IsString({ message: 'Mật khẩu phải là chuỗi.' })
  @MinLength(1, { message: 'Mật khẩu không được rỗng.' })
  @MaxLength(128, { message: 'Mật khẩu tối đa 128 ký tự.' })
  password!: string;
}
/** ForgotPasswordDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class ForgotPasswordDto {
  // Địa chỉ đăng nhập; chuẩn hóa trước khi tra cứu. Kiểm tra: IsEmail({}, { message: 'Email không hợp lệ.' }), MaxLength(254, { message: 'Email tối đa 254 ký tự.' }).
  @ApiProperty({ example: 'learner@example.test' })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @MaxLength(254, { message: 'Email tối đa 254 ký tự.' })
  email!: string;
}
/** NewPasswordDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class NewPasswordDto {
  // Mật khẩu mới được validation rồi băm. Kiểm tra: MinLength(15, { message: 'Mật khẩu mới tối thiểu 15 ký tự.' }), MaxLength(128, { message: 'Mật khẩu mới tối đa 128 ký tự.' }).
  @ApiProperty({ format: 'password', minLength: 15, maxLength: 128 })
  @IsString({ message: 'Mật khẩu mới phải là chuỗi.' })
  @MinLength(15, { message: 'Mật khẩu mới tối thiểu 15 ký tự.' })
  @MaxLength(128, { message: 'Mật khẩu mới tối đa 128 ký tự.' })
  newPassword!: string;
}
/** ResetPasswordDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class ResetPasswordDto extends NewPasswordDto {
  // Token đầu vào; backend tra hash thay vì lưu token gốc. Kiểm tra: Matches(/^[A-Za-z0-9_-]{43}$/, { message: 'Token đặt lại mật khẩu không hợp lệ.', }).
  @ApiProperty({
    description: 'One-time token delivered by the local demo outbox.',
    minLength: 43,
    maxLength: 43,
  })
  @Matches(/^[A-Za-z0-9_-]{43}$/, {
    message: 'Token đặt lại mật khẩu không hợp lệ.',
  })
  token!: string;
}
/** ChangePasswordDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class ChangePasswordDto extends NewPasswordDto {
  // Mật khẩu hiện tại cần xác minh trước khi đổi. Kiểm tra: MinLength(1, { message: 'Mật khẩu hiện tại không được rỗng.' }), MaxLength(128, { message: 'Mật khẩu hiện tại tối đa 128 ký tự.' }).
  @ApiProperty({ format: 'password', maxLength: 128 })
  @IsString({ message: 'Mật khẩu hiện tại phải là chuỗi.' })
  @MinLength(1, { message: 'Mật khẩu hiện tại không được rỗng.' })
  @MaxLength(128, { message: 'Mật khẩu hiện tại tối đa 128 ký tự.' })
  currentPassword!: string;
}
/** LoginResponseDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class LoginResponseDto {
  // Token opaque trả một lần sau login để client gửi Bearer.
  @ApiProperty({
    description:
      'Opaque bearer token, returned once. Never log or put in a URL.',
  })
  sessionToken!: string;
  // Kiểu Authorization, giá trị Bearer.
  @ApiProperty({ enum: ['Bearer'] }) tokenType!: 'Bearer';
  // Thời điểm hết hiệu lực.
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
  // Hồ sơ/danh tính hiện tại; quan hệ DB nếu dùng trong Prisma.
  @ApiProperty({ type: UserDto }) user!: UserDto;
}
/** SessionDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class SessionDto {
  // Định danh bản ghi hoặc request để theo dõi/hủy.
  @ApiProperty({ format: 'uuid' }) id!: string;
  // Thời điểm tạo bản ghi.
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  // Thời điểm hết hiệu lực.
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
  // Cho biết đây có phải phiên đang sử dụng.
  @ApiProperty() current!: boolean;
}
/** ForgotResponseDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class ForgotResponseDto {
  // Thông báo hoặc câu hỏi; giới hạn bằng hợp đồng đầu vào.
  @ApiProperty({
    example:
      'Nếu tài khoản phù hợp tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi.',
  })
  message!: string;
}
