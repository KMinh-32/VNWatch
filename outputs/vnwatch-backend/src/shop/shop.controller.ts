/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/shop/shop.controller.ts
 * Nhóm route mua sắm cá nhân và quản trị. Quyền ở controller được bổ sung bằng kiểm tra phiên khi service ghi dữ liệu.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentSession, Public, Roles } from '../auth/auth.decorators';
import { Principal } from '../auth/auth.types';
import { AuthRate } from '../auth/auth-rate.guard';
import { ShopService } from './shop.service';
import {
  ActiveDto,
  ProductArchiveDto,
  AddressDto,
  CartWriteDto,
  ProductCreateDto,
  ProductWriteDto,
  PromotionDto,
  ReplyDto,
  ReviewDto,
  ShopPageQuery,
  ManagementProductsQuery,
  ManagementTicketsQuery,
  TicketDto,
  VariantWriteDto,
  VariantCreateDto,
  VisibilityDto,
} from './shop.dto';

/** Controller ánh xạ HTTP → service; decorator class/route là nơi khai báo xác thực và quyền truy cập. */
@ApiTags('Shopping account')
@ApiBearerAuth()
@Controller('shop')
export class ShopController {
  // NestJS tiêm các dependency được khai báo; private readonly vừa nhận tham số vừa tạo thuộc tính của lớp.
  constructor(private readonly shop: ShopService) {}
  /** GET /api/v1/shop/cart. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Đọc giỏ hàng thuộc principal qua readCart. */
  @Get('cart') cart(@CurrentSession() p: Principal) {
    return this.shop.cart(p);
  }
  /** PUT /api/v1/shop/cart. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: ADD cộng số lượng, SET thay số lượng; 0 xóa dòng, còn lại kiểm tra SKU/tồn/giới hạn rồi upsert, không trừ tồn. */
  @Put('cart') writeCart(
    @CurrentSession() p: Principal,
    @Body() d: CartWriteDto,
  ) {
    return this.shop.writeCart(p, d);
  }
  /** GET /api/v1/shop/favorites. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Trả danh sách yêu thích kèm khả dụng của mẫu/SKU. */
  @Get('favorites') favorites(@CurrentSession() p: Principal) {
    return this.shop.favorites(p);
  }
  /** PUT /api/v1/shop/favorites/:id. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Thêm/bỏ yêu thích của chính user; thêm chỉ cho mẫu đang bán. */
  @Put('favorites/:id') favorite(
    @CurrentSession() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shop.favorite(p, id, true);
  }
  /** DELETE /api/v1/shop/favorites/:id. Giao yêu cầu bỏ mẫu khỏi danh sách yêu thích của principal cho service. */
  @Delete('favorites/:id') unfavorite(
    @CurrentSession() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shop.favorite(p, id, false);
  }
  /** GET /api/v1/shop/addresses. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Đọc các địa chỉ thuộc user, không lấy địa chỉ người khác. */
  @Get('addresses') addresses(@CurrentSession() p: Principal) {
    return this.shop.addresses(p);
  }
  /** POST /api/v1/shop/addresses. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Lưu địa chỉ mới của user, tối đa mười địa chỉ. */
  @Post('addresses') address(
    @CurrentSession() p: Principal,
    @Body() d: AddressDto,
  ) {
    return this.shop.address(p, d);
  }
  /** DELETE /api/v1/shop/addresses/:id. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Xóa địa chỉ theo cả id và userId để bảo vệ quyền sở hữu. */
  @Delete('addresses/:id') removeAddress(
    @CurrentSession() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shop.removeAddress(p, id);
  }
  /** GET /api/v1/shop/warranties. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Chỉ phát thẻ bảo hành cho dòng hàng có thời hạn trong đơn hoàn tất/đã thanh toán/đã giao. */
  @Get('warranties') warranties(@CurrentSession() p: Principal) {
    return this.shop.warranties(p);
  }
  /** GET /api/v1/shop/tickets. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Khách xem ticket của mình; ADMIN lọc open/closed trên server trước khi phân trang. */
  @Get('tickets') tickets(
    @CurrentSession() p: Principal,
    @Query() q: ShopPageQuery,
  ) {
    return this.shop.tickets(p, q);
  }
  /** POST /api/v1/shop/tickets. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Tạo ticket sau khi kiểm tra đơn/thẻ bảo hành thuộc user và giới hạn yêu cầu đang mở. */
  @Post('tickets')
  @AuthRate({ name: 'support', limit: 10, seconds: 60 })
  ticket(@CurrentSession() p: Principal, @Body() d: TicketDto) {
    return this.shop.ticket(p, d);
  }
  /** POST /api/v1/shop/tickets/:id/replies. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Trả lời ticket dưới transaction; version ngăn trả lời đồng thời với đóng ticket, admin mới được đổi trạng thái. */
  @Post('tickets/:id/replies')
  @AuthRate({ name: 'support-reply', limit: 30, seconds: 60 })
  reply(
    @CurrentSession() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: ReplyDto,
  ) {
    return this.shop.reply(p, id, d, false);
  }
  /** GET /api/v1/shop/reviews/:id. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Trả đánh giá công khai chưa ẩn, tác giả và điểm trung bình của mẫu. */
  @Get('reviews/:id') @Public() reviews(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: ShopPageQuery,
  ) {
    return this.shop.reviews(id, q);
  }
  /** PUT /api/v1/shop/reviews/:id. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Chỉ user có đơn hoàn tất/đã trả/đã nhận mới được upsert một đánh giá cho mỗi mẫu. */
  @Put('reviews/:id')
  @AuthRate({ name: 'review', limit: 10, seconds: 60 })
  review(
    @CurrentSession() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: ReviewDto,
  ) {
    return this.shop.review(p, id, d);
  }
}
/** Controller ánh xạ HTTP → service; decorator class/route là nơi khai báo xác thực và quyền truy cập. */
@ApiTags('Store management')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('management')
export class ManagementController {
  // NestJS tiêm các dependency được khai báo; private readonly vừa nhận tham số vừa tạo thuộc tính của lớp.
  constructor(private readonly shop: ShopService) {}
  /** GET /api/v1/management/products. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Danh mục quản trị gồm cả nháp/ngừng bán; tìm/lọc trước khi phân trang và trả tồn/version SKU. */
  @Get('products') products(@Query() q: ManagementProductsQuery) {
    return this.shop.products(q);
  }
  /** POST /api/v1/management/products. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: ADMIN tạo mẫu DEMO kèm SKU đầu tiên và audit. */
  @Post('products') @Roles('ADMIN') createProduct(
    @CurrentSession() p: Principal,
    @Body() d: ProductCreateDto,
  ) {
    return this.shop.createProduct(p, d);
  }
  /** PATCH /api/v1/management/products/:id. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Cập nhật mẫu nếu updatedAt khớp version client, tránh ghi đè thay đổi mới. */
  @Patch('products/:id') @Roles('ADMIN') product(
    @CurrentSession() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: ProductWriteDto,
  ) {
    return this.shop.product(p, id, d);
  }
  /** PATCH /api/v1/management/variants/:id. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Cập nhật SKU nếu timestamp và tồn cùng khớp; đổi giá chuyển nguồn giá sang cấu hình demo và ghi audit. */
  @Patch('variants/:id') @Roles('ADMIN') variant(
    @CurrentSession() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: VariantWriteDto,
  ) {
    return this.shop.variant(p, id, d);
  }
  /** POST /api/v1/management/products/:id/variants. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: ADMIN tạo thêm SKU cho mẫu đã tồn tại, tối đa năm mươi SKU và ghi audit. */
  @Post('products/:id/variants') @Roles('ADMIN') createVariant(
    @CurrentSession() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: VariantCreateDto,
  ) {
    return this.shop.createVariant(p, id, d);
  }
  /** GET /api/v1/management/reports. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Tổng hợp cùng snapshot: doanh thu chỉ của đơn COMPLETED/PAID, tồn SKU/mẫu ACTIVE và ticket đang mở. */
  @Get('reports') @Roles('ADMIN') reports() {
    return this.shop.reports();
  }
  /** GET /api/v1/management/audit. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Liệt kê nhật ký nghiệp vụ và tên actor theo phân trang. */
  @Get('audit') @Roles('ADMIN') audit(@Query() q: ShopPageQuery) {
    return this.shop.audit(q);
  }
  /** GET /api/v1/management/promotions. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Liệt kê mã giảm giá kèm số lượt đã dùng. */
  @Get('promotions') @Roles('ADMIN') promotions(@Query() q: ShopPageQuery) {
    return this.shop.promotions(q);
  }
  /** POST /api/v1/management/promotions. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Tạo mã giảm giá sau kiểm tra thời điểm kết thúc lớn hơn bắt đầu, kèm audit. */
  @Post('promotions') @Roles('ADMIN') promotion(
    @CurrentSession() p: Principal,
    @Body() d: PromotionDto,
  ) {
    return this.shop.promotion(p, d);
  }
  /** PATCH /api/v1/management/promotions/:id. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: ADMIN bật/tắt mã và ghi before/after; không xóa lịch sử lượt dùng. */
  @Patch('promotions/:id') @Roles('ADMIN') promotionActive(
    @CurrentSession() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: ActiveDto,
  ) {
    return this.shop.promotionActive(p, id, d);
  }
  /** GET /api/v1/management/tickets. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Khách xem ticket của mình; ADMIN lọc open/closed trên server trước khi phân trang. */
  @Get('tickets') tickets(
    @CurrentSession() p: Principal,
    @Query() q: ManagementTicketsQuery,
  ) {
    return this.shop.tickets(p, q, true);
  }
  /** POST /api/v1/management/tickets/:id/replies. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Trả lời ticket dưới transaction; version ngăn trả lời đồng thời với đóng ticket, admin mới được đổi trạng thái. */
  @Post('tickets/:id/replies') reply(
    @CurrentSession() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: ReplyDto,
  ) {
    return this.shop.reply(p, id, d, true);
  }
  /** GET /api/v1/management/reviews. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Trả đánh giá công khai chưa ẩn, tác giả và điểm trung bình của mẫu. */
  @Get('reviews') @Roles('ADMIN') reviews(@Query() q: ShopPageQuery) {
    return this.shop.manageReviews(q);
  }
  /** PATCH /api/v1/management/reviews/:id. Giao yêu cầu ADMIN đổi mức hiển thị đánh giá cho service. */
  @Patch('reviews/:id') @Roles('ADMIN') visibility(
    @CurrentSession() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: VisibilityDto,
  ) {
    return this.shop.reviewVisibility(p, id, d);
  }
  /** DELETE /api/v1/management/products/:id. Route nhận tham số/DTO và giao nghiệp vụ cho ShopService: Chuyển mẫu sang DISCONTINUED nếu version khớp; giữ SKU/đơn/lịch sử thay vì xóa dữ liệu liên quan. */
  @Delete('products/:id')
  @Roles('ADMIN')
  archiveProduct(
    @CurrentSession() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: ProductArchiveDto,
  ) {
    return this.shop.archiveProduct(p, id, d);
  }
}
