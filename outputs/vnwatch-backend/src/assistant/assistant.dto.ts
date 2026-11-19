/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/assistant/assistant.dto.ts
 * DTO câu hỏi, lịch sử hội thoại và câu trả lời; giới hạn độ dài để kiểm soát tải và dữ liệu đưa vào trợ lý.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { Type, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  ValidateIf,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductDto } from '../catalog/dto/product-response.dto';

/** AssistantMessageDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class AssistantMessageDto {
  // Vai trò tài khoản; backend kiểm tra quyền từ database.
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @ApiProperty({ maxLength: 1000 })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content!: string;
}

/** AssistantChatDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class AssistantChatDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsUUID()
  requestId?: string;
  // Thông báo hoặc câu hỏi; giới hạn bằng hợp đồng đầu vào. Kiểm tra: MinLength(1), MaxLength(1000).
  @ApiProperty({ maxLength: 1000, example: 'Gợi ý đồng hồ Casio dưới 2 triệu' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string;

  // Lịch sử hội thoại giới hạn, được coi là dữ liệu không đáng tin. Kiểm tra: ArrayMaxSize(8), ValidateNested({ each: true }).
  @ApiPropertyOptional({ type: [AssistantMessageDto], maxItems: 8 })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => AssistantMessageDto)
  history: AssistantMessageDto[] = [];

  // DEMO là dữ liệu giả, REFERENCE là mẫu thật có nguồn tham khảo.
  @ApiPropertyOptional({ enum: ['REFERENCE', 'DEMO'], default: 'REFERENCE' })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsIn(['REFERENCE', 'DEMO'])
  dataKind: 'REFERENCE' | 'DEMO' = 'REFERENCE';
}

/** AssistantSourceDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class AssistantSourceDto {
  // Tiêu đề hiển thị.
  @ApiProperty() title!: string;
  // Địa chỉ URL của nguồn/request theo hợp đồng.
  @ApiProperty() url!: string;
  // Mốc kiểm tra nguồn.
  @ApiProperty({ type: String, nullable: true }) checkedAt!: string | null;
}

/** AssistantReplyDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class AssistantReplyDto {
  @ApiPropertyOptional() intent?: string | null;
  @ApiPropertyOptional() modelName?: string | null;
  @ApiPropertyOptional() conversationId?: string;
  @ApiPropertyOptional() requestId?: string;
  @ApiPropertyOptional() messageId?: number;
  // Chế độ hội thoại/provider hoặc thao tác giỏ, theo hợp đồng của file.
  @ApiProperty({ enum: ['CATALOG', 'OPENAI'] }) mode!: 'CATALOG' | 'OPENAI';
  // Thông báo chế độ catalog hoặc fallback khi provider lỗi.
  @ApiProperty({ type: String, nullable: true }) notice!: string | null;
  // Nội dung trả lời dựng từ dữ liệu đã cung cấp.
  @ApiProperty() text!: string;
  // Các mẫu trong catalog hoặc dữ liệu danh mục được tải.
  @ApiProperty({ type: [ProductDto] }) products!: ProductDto[];
  // Nguồn đã được whitelist/đối chiếu.
  @ApiProperty({ type: [AssistantSourceDto] }) sources!: AssistantSourceDto[];
  // Hành động nghiệp vụ/đích điều hướng thuộc danh sách cho phép.
  @ApiProperty({
    type: String,
    nullable: true,
    enum: ['orders', 'collection', 'guide'],
  })
  action!: 'orders' | 'collection' | 'guide' | null;
}
