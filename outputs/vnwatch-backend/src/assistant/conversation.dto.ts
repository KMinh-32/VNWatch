import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Chọn catalog ở server và giữ nguyên catalog cho toàn bộ hội thoại. */
export class ConversationQueryDto {
  @ApiPropertyOptional({ enum: ['REFERENCE', 'DEMO'] })
  @IsIn(['REFERENCE', 'DEMO'])
  dataKind: 'REFERENCE' | 'DEMO' = 'REFERENCE';
}

/** Phân trang tin nhắn theo khóa tăng dần, không tải cả lịch sử dài một lần. */
export class MessageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  before?: number;
}
