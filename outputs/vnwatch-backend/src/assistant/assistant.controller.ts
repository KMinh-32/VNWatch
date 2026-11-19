/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/assistant/assistant.controller.ts
 * API chat công khai có giới hạn tần suất; giao câu hỏi đã kiểm tra cho gateway trợ lý.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { Public } from '../auth/auth.decorators';
import { AuthRate } from '../auth/auth-rate.guard';
import { AssistantChatDto, AssistantReplyDto } from './assistant.dto';
import { ConversationService } from './conversation.service';
import { ConversationQueryDto, MessageQueryDto } from './conversation.dto';

/** Controller ánh xạ HTTP → service; decorator class/route là nơi khai báo xác thực và quyền truy cập. */
@ApiTags('Customer assistant')
@Controller('assistant')
export class AssistantController {
  // NestJS tiêm các dependency được khai báo; private readonly vừa nhận tham số vừa tạo thuộc tính của lớp.
  constructor(private readonly service: ConversationService) {}

  @Public()
  @Get('conversations')
  @AuthRate({ name: 'assistant-history', limit: 60, seconds: 60 })
  @ApiOperation({
    summary:
      'Danh sách tối đa 30 hội thoại gần nhất của tài khoản hoặc khách hiện tại.',
  })
  async list(
    @Query() query: ConversationQueryDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.service.list(
      await this.service.owner(req, res),
      query.dataKind,
    );
  }

  @Public()
  @Post('conversations')
  @AuthRate({ name: 'assistant-create', limit: 12, seconds: 60 })
  @ApiOperation({
    summary:
      'Tạo HoiThoai; chủ sở hữu lấy từ phiên đăng nhập hoặc cookie khách.',
  })
  async create(
    @Body() body: ConversationQueryDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.service.create(
      await this.service.owner(req, res),
      body.dataKind,
    );
  }

  @Public()
  @Get('conversations/:id/messages')
  @AuthRate({ name: 'assistant-history', limit: 60, seconds: 60 })
  @ApiOperation({
    summary: 'Đọc lịch sử TinNhan sau khi kiểm tra quyền sở hữu hội thoại.',
  })
  async messages(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: MessageQueryDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.service.messages(
      await this.service.owner(req, res),
      id,
      query.before,
    );
  }

  @Public()
  @Post('conversations/:id/close')
  @HttpCode(200)
  @AuthRate({ name: 'assistant-close', limit: 12, seconds: 60 })
  async close(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.service.close(await this.service.owner(req, res), id);
  }

  /** POST /api/v1/assistant/chat. Gửi DTO câu hỏi đã được validation và rate limit qua gateway trợ lý. */
  @Public()
  @Post('chat')
  @HttpCode(200)
  @AuthRate({ name: 'assistant-chat', limit: 12, seconds: 60 })
  @ApiOperation({
    summary:
      'Tư vấn catalog, lưu câu hỏi và câu trả lời; không đọc dữ liệu đơn hàng riêng tư.',
  })
  @ApiOkResponse({ type: AssistantReplyDto })
  @ApiResponse({
    status: 429,
    description: 'At most 12 requests per minute per IP.',
  })
  @ApiResponse({
    status: 503,
    description: 'Agent offline or gateway configuration missing.',
  })
  async chat(
    @Body() body: AssistantChatDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.service.send(await this.service.owner(req, res), body);
  }
}
