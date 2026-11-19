/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/users/admin-user.dto.ts
 * DTO tạo/sửa tài khoản bởi admin, kèm lý do thao tác để ghi nhật ký.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { RegisterDto } from '../auth/auth.dto';
import { UpdateProfileDto, trimText } from './user.dto';
import { UserRole, UserStatus } from '../generated/prisma/client';
/** AdminReasonDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class AdminReasonDto {
  // Lý do thao tác, được ghi vào lịch sử/audit. Kiểm tra: MinLength(5), MaxLength(200).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  reason!: string;
}
/** AdminCreateUserDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class AdminCreateUserDto extends RegisterDto {
  // Vai trò tài khoản; backend kiểm tra quyền từ database. Kiểm tra: IsEnum(UserRole).
  @ApiProperty({ enum: UserRole, default: 'CUSTOMER' })
  @IsEnum(UserRole)
  role: UserRole = 'CUSTOMER';
  // Lý do thao tác, được ghi vào lịch sử/audit. Kiểm tra: MinLength(5), MaxLength(200).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  reason!: string;
}
/** AdminProfileDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class AdminProfileDto extends UpdateProfileDto {
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
  // Lý do thao tác, được ghi vào lịch sử/audit. Kiểm tra: MinLength(5), MaxLength(200).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  reason!: string;
}
