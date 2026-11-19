/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/assistant/assistant.module.ts
 * Module assistant: đăng ký controller/provider và imports/exports để NestJS tiêm dependency đúng phạm vi.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { ConversationService } from './conversation.service';
import { DatabaseModule } from '../database/database.module';

/** NestJS module: decorator bên dưới xác định imports, controllers, providers và dependency được export. */
@Module({
  imports: [CatalogModule, DatabaseModule],
  controllers: [AssistantController],
  providers: [AssistantService, ConversationService],
})
export class AssistantModule {}
