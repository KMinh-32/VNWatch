/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/orders/orders.controller.ts
 * API đơn hàng cá nhân và quản trị. Tạo đơn yêu cầu Idempotency-Key; UUID, DTO và quyền được kiểm tra ở cửa vào.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Patch,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { CurrentSession, Roles } from '../auth/auth.decorators';
import { Principal } from '../auth/auth.types';
import { isUUID } from 'class-validator';
import { OrdersService } from './orders.service';
import {
  AdminCreateOrderDto,
  AdminQuoteDto,
  AdminOrderQuery,
  AdminEditOrderDto,
  AdminVersionDto,
} from './admin-order.dto';
import {
  CancelOrderDto,
  DemoPaymentDto,
  CreateOrderDto,
  OrderActionDto,
  OrderPageQuery,
  QuoteDto,
} from './order.dto';
import {
  OrderResponseDto,
  QrDemoResponseDto,
  QuoteResponseDto,
  OrderPageResponseDto,
} from './order-response.dto';
import { ApiErrorDto } from '../common/api-error.dto';

/** Controller ánh xạ HTTP → service; decorator class/route là nơi khai báo xác thực và quyền truy cập. */
@ApiTags('Orders (demo COD / QR)')
@ApiBearerAuth()
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiConflictResponse({ type: ApiErrorDto })
@Controller('orders')
export class OrdersController {
  // NestJS tiêm các dependency được khai báo; private readonly vừa nhận tham số vừa tạo thuộc tính của lớp.
  constructor(private readonly orders: OrdersService) {}
  /** POST /api/v1/orders/quote. Nhận danh sách SKU và tính báo giá theo principal. */
  @Post('quote')
  @ApiCreatedResponse({ type: QuoteResponseDto })
  @ApiOperation({
    summary:
      'Quote live SKU prices and 30,000 VND demo shipping. Does not reserve stock.',
  })
  quote(@CurrentSession() principal: Principal, @Body() dto: QuoteDto) {
    return this.orders.quote(dto, principal);
  }

  /** POST /api/v1/orders. Kiểm tra Idempotency-Key UUID v4 rồi tạo đơn của user. */
  @Post()
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description:
      'UUID v4. Scoped to the user and retained for the order lifetime.',
  })
  @ApiOperation({
    summary:
      'Create demo COD or QR order atomically. Duplicate key and identical normalized body returns the existing order.',
  })
  create(
    @CurrentSession() principal: Principal,
    @Headers('idempotency-key') key: string,
    @Body() dto: CreateOrderDto,
  ) {
    if (typeof key !== 'string' || !isUUID(key, '4'))
      throw new BadRequestException({
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key phải là UUID v4.',
      });
    return this.orders.create(principal, key, dto);
  }

  /** GET /api/v1/orders. Liệt kê đơn cá nhân theo phân trang. */
  @Get()
  @ApiOkResponse({ type: OrderPageResponseDto })
  @ApiOperation({ summary: 'List your own orders.' })
  list(@CurrentSession() principal: Principal, @Query() query: OrderPageQuery) {
    return this.orders.list(principal, query);
  }

  /** GET /api/v1/orders/manage. ADMIN xem danh sách đơn với bộ lọc quản trị. */
  @Get('manage')
  @ApiOkResponse({ type: OrderPageResponseDto })
  @Roles('ADMIN')
  @ApiOperation({ summary: 'ADMIN: paginated order work queue.' })
  manage(
    @CurrentSession() principal: Principal,
    @Query() query: AdminOrderQuery,
  ) {
    return this.orders.list(principal, query, true);
  }

  /** GET /api/v1/orders/:id. Đọc một đơn theo UUID và principal. */
  @Get(':id')
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiOperation({
    summary: 'Owner or ADMIN: read order snapshots and event history.',
  })
  read(
    @CurrentSession() principal: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.orders.findOne(principal, id);
  }

  /** GET /api/v1/orders/:id/qr-demo. Lấy mã QR demo của đơn thuộc khách. */
  @Get(':id/qr-demo')
  @ApiOkResponse({ type: QrDemoResponseDto })
  @ApiOperation({
    summary:
      'Owner: non-bank QR matrix and immutable amount. No payment provider or funds transfer.',
  })
  qrDemo(
    @CurrentSession() principal: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.orders.qrDemo(principal, id);
  }

  /** POST /api/v1/orders/:id/qr-demo/confirm. Mô phỏng thanh toán của chủ đơn, không gọi dịch vụ ngân hàng. */
  @Post(':id/qr-demo/confirm')
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiOperation({
    summary:
      'Owner: explicitly simulate QR payment; idempotent, no real money.',
  })
  confirmQrDemo(
    @CurrentSession() principal: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: DemoPaymentDto,
  ) {
    void dto;
    return this.orders.confirmQrDemo(principal, id);
  }

  /** POST /api/v1/orders/:id/cancel. Khách yêu cầu hủy đơn của mình với quy tắc trạng thái chặt chẽ. */
  @Post(':id/cancel')
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiOperation({
    summary:
      'Owner: cancel a pending order, restore inventory once. Repeat cancellation is harmless.',
  })
  cancel(
    @CurrentSession() principal: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orders.transition(
      principal,
      id,
      { ...dto, action: 'CANCEL' },
      true,
    );
  }

  /** POST /api/v1/orders/:id/actions. ADMIN chuyển trạng thái đơn bằng hành động/lý do đã validation. */
  @Post(':id/actions')
  @ApiCreatedResponse({ type: OrderResponseDto })
  @Roles('ADMIN')
  @ApiOperation({
    summary:
      'ADMIN: CONFIRM, SHIP, COMPLETE or CANCEL. COMPLETE confirms delivery and COD collection; reason must record receipt evidence.',
  })
  action(
    @CurrentSession() principal: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: OrderActionDto,
  ) {
    return this.orders.transition(principal, id, dto);
  }

  /** POST /api/v1/orders/manage/quote. Tính báo giá cho khách được admin chọn. */
  @Post('manage/quote')
  @ApiCreatedResponse({ type: QuoteResponseDto })
  @Roles('ADMIN')
  @ApiOperation({ summary: 'ADMIN: quote an order for an active customer.' })
  adminQuote(@CurrentSession() p: Principal, @Body() d: AdminQuoteDto) {
    return this.orders.adminQuote(p, d);
  }

  /** POST /api/v1/orders/manage. Admin tạo đơn cho khách với Idempotency-Key và lý do. */
  @Post('manage')
  @ApiCreatedResponse({ type: OrderResponseDto })
  @Roles('ADMIN')
  @ApiOperation({
    summary:
      'ADMIN: create an order for an active account; cart preserved, stock and coupons checked atomically.',
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  adminCreate(
    @CurrentSession() p: Principal,
    @Headers('idempotency-key') key: string,
    @Body() d: AdminCreateOrderDto,
  ) {
    if (typeof key !== 'string' || !isUUID(key, '4'))
      throw new BadRequestException({
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key phải là UUID v4.',
      });
    return this.orders.adminCreate(p, key, d);
  }
  /** PATCH /api/v1/orders/:id. Sửa dữ liệu giao nhận khi version/trạng thái cho phép. */
  @Patch(':id')
  @ApiOkResponse({ type: OrderResponseDto })
  @Roles('ADMIN')
  @ApiOperation({
    summary:
      'ADMIN: edit delivery contact before shipment, with version and audit. Prices/items remain immutable.',
  })
  edit(
    @CurrentSession() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: AdminEditOrderDto,
  ) {
    return this.orders.adminChange(p, id, d, 'EDIT');
  }
  /** DELETE /api/v1/orders/:id. Lưu trữ đơn kết thúc, không xóa lịch sử mua hàng. */
  @Delete(':id')
  @ApiOkResponse({ type: OrderResponseDto })
  @Roles('ADMIN')
  @ApiOperation({
    summary:
      'ADMIN: archive a terminal order; customer history, revenue and stock preserved.',
  })
  archive(
    @CurrentSession() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: AdminVersionDto,
  ) {
    return this.orders.adminChange(p, id, d, 'ARCHIVE');
  }
  /** POST /api/v1/orders/:id/restore. Khôi phục đơn lưu trữ về danh sách quản trị. */
  @Post(':id/restore')
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiOperation({
    summary: 'ADMIN: restore a terminal archived order to the management list.',
  })
  @Roles('ADMIN')
  restore(
    @CurrentSession() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: AdminVersionDto,
  ) {
    return this.orders.adminChange(p, id, d, 'RESTORE');
  }
}
