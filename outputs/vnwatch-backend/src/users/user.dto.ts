/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/users/user.dto.ts
 * DTO hồ sơ, phân trang và cập nhật quyền; decorator mô tả dữ liệu được phép gửi vào API.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { UserRole, UserStatus } from '../generated/prisma/client';

/** Chuẩn hóa khoảng trắng chuỗi; kiểu sai được giữ để validator từ chối. */
export const trimText = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
/** Trim và viết thường email để tra cứu/kiểm tra duy nhất nhất quán. */
export const normalizeEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** UserDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class UserDto {
  // Định danh bản ghi hoặc request để theo dõi/hủy.
  @ApiProperty({ format: 'uuid' }) id!: string;
  // Địa chỉ đăng nhập; chuẩn hóa trước khi tra cứu.
  @ApiProperty({ example: 'learner@example.test' }) email!: string;
  // Tên hiển thị, không phải thông tin phân quyền.
  @ApiProperty({ example: 'VNWatch Learner' }) displayName!: string;
  // Vai trò tài khoản; backend kiểm tra quyền từ database.
  @ApiProperty({ enum: UserRole }) role!: UserRole;
  // Trạng thái nghiệp vụ của đối tượng; xem enum/DTO tương ứng.
  @ApiProperty({ enum: UserStatus }) status!: UserStatus;
  // Thời điểm tạo bản ghi.
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

/** UpdateProfileDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class UpdateProfileDto {
  // Tên hiển thị, không phải thông tin phân quyền. Kiểm tra: MinLength(2, { message: 'Tên hiển thị tối thiểu 2 ký tự.' }), MaxLength(80, { message: 'Tên hiển thị tối đa 80 ký tự.' }).
  @ApiProperty({ minLength: 2, maxLength: 80 })
  @Transform(trimText)
  @IsString({ message: 'displayName phải là chuỗi.' })
  @MinLength(2, { message: 'Tên hiển thị tối thiểu 2 ký tự.' })
  @MaxLength(80, { message: 'Tên hiển thị tối đa 80 ký tự.' })
  displayName!: string;
}

/** UpdateAccessDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class UpdateAccessDto {
  // Vai trò tài khoản; backend kiểm tra quyền từ database. Dấu ? cho phép thiếu trường trong kiểu TypeScript. Kiểm tra: IsOptional(), IsEnum(UserRole, { message: 'Vai trò không hợp lệ.' }).
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Vai trò không hợp lệ.' })
  role?: UserRole;
  // Trạng thái nghiệp vụ của đối tượng; xem enum/DTO tương ứng. Dấu ? cho phép thiếu trường trong kiểu TypeScript. Kiểm tra: IsOptional(), IsEnum(UserStatus, { message: 'Trạng thái tài khoản không hợp lệ.' }).
  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Trạng thái tài khoản không hợp lệ.' })
  status?: UserStatus;
  // Lý do thao tác, được ghi vào lịch sử/audit. Kiểm tra: MinLength(5, { message: 'Lý do tối thiểu 5 ký tự.' }), MaxLength(200, { message: 'Lý do tối đa 200 ký tự.' }).
  @ApiProperty({ minLength: 5, maxLength: 200 })
  @Transform(trimText)
  @IsString({ message: 'Lý do phải là chuỗi.' })
  @MinLength(5, { message: 'Lý do tối thiểu 5 ký tự.' })
  @MaxLength(200, { message: 'Lý do tối đa 200 ký tự.' })
  reason!: string;
}

/** Chuyển query số nguyên khi định dạng hợp lệ; dữ liệu sai phải bị validator phát hiện. */
const integer = ({ value }: { value: unknown }): number =>
  typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
/** ListUsersDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class ListUsersDto {
  // Từ khóa tìm kiếm do user nhập. Dấu ? cho phép thiếu trường trong kiểu TypeScript. Kiểm tra: IsOptional(), MaxLength(100).
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(100)
  q?: string;
  // Vai trò tài khoản; backend kiểm tra quyền từ database. Dấu ? cho phép thiếu trường trong kiểu TypeScript. Kiểm tra: IsOptional(), IsEnum(UserRole).
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
  // Trạng thái nghiệp vụ của đối tượng; xem enum/DTO tương ứng. Dấu ? cho phép thiếu trường trong kiểu TypeScript. Kiểm tra: IsOptional(), IsEnum(UserStatus).
  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
  // Trang bắt đầu từ 1. Kiểm tra: IsInt({ message: 'page phải là số nguyên.' }), Min(1, { message: 'page tối thiểu 1.' }), Max(1000, { message: 'page tối đa 1000.' }).
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 1000 })
  @Transform(integer)
  @IsInt({ message: 'page phải là số nguyên.' })
  @Min(1, { message: 'page tối thiểu 1.' })
  @Max(1000, { message: 'page tối đa 1000.' })
  page = 1;
  // Số bản ghi tối đa mỗi trang. Kiểm tra: IsInt({ message: 'limit phải là số nguyên.' }), Min(1, { message: 'limit tối thiểu 1.' }), Max(50, { message: 'limit tối đa 50.' }).
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @Transform(integer)
  @IsInt({ message: 'limit phải là số nguyên.' })
  @Min(1, { message: 'limit tối thiểu 1.' })
  @Max(50, { message: 'limit tối đa 50.' })
  limit = 20;
}

/** UserPageDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class UserPageDto {
  // Dữ liệu trả về của API/trang kết quả.
  @ApiProperty({ type: [UserDto] }) data!: UserDto[];
  // Thông tin phân trang đi cùng data.
  @ApiProperty({ example: { page: 1, limit: 20, total: 3, totalPages: 1 } })
  meta!: { page: number; limit: number; total: number; totalPages: number };
}
