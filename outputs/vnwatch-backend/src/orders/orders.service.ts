/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/orders/orders.service.ts
 * Nghiệp vụ đơn hàng: báo giá từ database, tạo đơn chống trùng, trừ/hoàn tồn trong transaction và kiểm soát trạng thái.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { isUUID } from 'class-validator';
import { createRequire } from 'node:module';
/** Giao diện tối thiểu của thư viện mã QR mà service sử dụng. */
interface QRMatrixEncoder {
  addData(data: string): void;
  make(): void;
  getModuleCount(): number;
  isDark(row: number, column: number): boolean;
}
const QRCode = createRequire(__filename)(
  'qrcode-terminal/vendor/QRCode',
) as new (version: number, level: number) => QRMatrixEncoder;
import { Prisma, Order } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { Principal } from '../auth/auth.types';
import { lockUser, requireCurrentSession } from '../auth/auth-transaction';
import {
  AdminCreateOrderDto,
  AdminQuoteDto,
  AdminEditOrderDto,
  AdminVersionDto,
  AdminOrderQuery,
} from './admin-order.dto';
import {
  CreateOrderDto,
  OrderActionDto,
  OrderPageQuery,
  QuoteDto,
} from './order.dto';

export const SHIPPING_FEE_VND = 30000;
export const WARRANTY_POLICY =
  'Dữ liệu demo. Bảo hành theo thời hạn SKU tại lúc đặt; kích hoạt khi hoàn tất giao hàng và thanh toán demo (COD hoặc QR). SKU chưa có thời hạn không tự được bảo hành. Không tạo serial giả. Mã giảm giá dùng khi tạo đơn; hủy đơn không hoàn lượt mã.';
const include = {
  items: { orderBy: { variantId: 'asc' as const } },
  events: { orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }] },
};
/** Kiểu Prisma suy ra từ include items/events để view nhận đủ snapshot/lịch sử. */
type FullOrder = Prisma.OrderGetPayload<{ include: typeof include }>;
/** Ẩn requestHash/idempotencyKey và actorId nội bộ; chỉ thêm archivedAt vào kết quả quản trị. */
function view(order: FullOrder, management = false) {
  // Request hash and idempotency key are internal; don't expose them in customer responses.
  const {
    requestHash: _hash,
    idempotencyKey: _key,
    archivedAt,
    ...rest
  } = order;
  void _hash;
  void _key;
  return {
    ...rest,
    ...(management ? { archivedAt } : {}),
    events: order.events.map(({ actorId: _actor, ...event }) => {
      void _actor;
      return event;
    }),
  };
}
/** Chụp ba trạng thái của đơn để ghi before/after vào lịch sử. */
function state(order: Order) {
  return {
    status: order.status,
    paymentStatus: order.paymentStatus,
    shippingStatus: order.shippingStatus,
  };
}
/** Tạo lỗi 404 dùng chung; không tiết lộ đơn của người khác. */
const missing = () =>
  new NotFoundException({
    code: 'ORDER_NOT_FOUND',
    message: 'Không tìm thấy đơn hàng.',
  });
/** Ném lỗi 409 có code cụ thể để client biết giá/tồn/trạng thái đã xung đột. */
function conflict(code: string, message: string): never {
  throw new ConflictException({ code, message });
}
/** Lấy schema từ DATABASE_URL và whitelist tên trước khi ghép định danh SQL; giá trị vẫn truyền bằng tham số. */
function schemaName() {
  const schema =
    new URL(process.env.DATABASE_URL!).searchParams.get('schema') ?? 'public';
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema))
    throw new Error('Unsupported schema identifier');
  return schema;
}
/** Viết thường UUID, sắp SKU ổn định và từ chối SKU lặp để hash/yêu cầu nhất quán. */
function normalized(dto: QuoteDto) {
  const items = [...dto.items]
    .map((i) => ({
      variantId: i.variantId.toLowerCase(),
      quantity: i.quantity,
    }))
    .sort((a, b) => a.variantId.localeCompare(b.variantId));
  if (new Set(items.map((i) => i.variantId)).size !== items.length)
    throw new BadRequestException({
      code: 'DUPLICATE_SKU',
      message: 'Mỗi phiên bản chỉ được xuất hiện một lần trong đơn.',
    });
  return items;
}

/** Service tập trung nghiệp vụ; các dependency được tiêm qua constructor để có thể kiểm thử độc lập. */
@Injectable()
export class OrdersService {
  // NestJS tiêm các dependency được khai báo; private readonly vừa nhận tham số vừa tạo thuộc tính của lớp.
  constructor(private readonly prisma: PrismaService) {}

  /** Đọc giá/tồn SKU ACTIVE từ DB, kiểm tra mã giảm giá/lượt dùng và tính tổng trong giới hạn số nguyên. */
  private async prices(
    tx: Prisma.TransactionClient,
    dto: QuoteDto,
    userId?: string,
  ) {
    const requested = normalized(dto);
    const variants = await tx.productVariant.findMany({
      where: {
        id: { in: requested.map((i) => i.variantId) },
        status: 'ACTIVE',
        product: { status: 'ACTIVE' },
      },
      include: { product: true },
    });
    const items = requested.map((line) => {
      const variant = variants.find((v) => v.id === line.variantId);
      if (!variant)
        conflict(
          'SKU_UNAVAILABLE',
          'Một sản phẩm đã ngừng kinh doanh. Vui lòng cập nhật giỏ hàng.',
        );
      if (variant.stockQuantity < line.quantity)
        conflict(
          'INSUFFICIENT_STOCK',
          `Không đủ tồn kho cho ${variant.product.name} — ${variant.label}.`,
        );
      return {
        variantId: variant.id,
        productName: variant.product.name,
        variantLabel: variant.label,
        sku: variant.sku,
        quantity: line.quantity,
        unitPriceVnd: variant.priceVnd,
        lineTotalVnd: variant.priceVnd * line.quantity,
        warrantyMonths: variant.warrantyMonths,
      };
    });
    const subtotalVnd = items.reduce((sum, i) => sum + i.lineTotalVnd, 0);
    if (!Number.isSafeInteger(subtotalVnd) || subtotalVnd > 2147483647)
      throw new BadRequestException({
        code: 'ORDER_TOTAL_TOO_LARGE',
        message:
          'Tiền sản phẩm vượt giới hạn cho phép. Vui lòng giảm số lượng.',
      });
    let discountVnd = 0;
    let promotionId: string | undefined;
    if (dto.promotionCode) {
      const promotion = await tx.promotion.findUnique({
        where: { code: dto.promotionCode },
      });
      if (
        !promotion ||
        !promotion.active ||
        promotion.startsAt > new Date() ||
        promotion.endsAt <= new Date() ||
        subtotalVnd < promotion.minSubtotalVnd ||
        !userId
      )
        conflict(
          'PROMOTION_INVALID',
          'Mã giảm giá không khả dụng hoặc đơn chưa đủ giá trị tối thiểu.',
        );
      const totalUses = await tx.promotionUse.count({
        where: { promotionId: promotion.id },
      });
      const ownUses = await tx.promotionUse.count({
        where: { promotionId: promotion.id, userId },
      });
      if (totalUses >= promotion.maxUses || ownUses >= promotion.perUserLimit)
        conflict(
          'PROMOTION_LIMIT',
          'Mã đã hết lượt hoặc bạn đã dùng đủ số lượt.',
        );
      promotionId = promotion.id;
      discountVnd = Math.min(subtotalVnd, promotion.amountVnd);
    }
    const totalVnd = subtotalVnd - discountVnd + SHIPPING_FEE_VND;
    if (!Number.isSafeInteger(totalVnd) || totalVnd > 2147483647)
      throw new BadRequestException({
        code: 'ORDER_TOTAL_TOO_LARGE',
        message: 'Tổng đơn vượt giới hạn cho phép. Vui lòng giảm số lượng.',
      });
    return {
      items,
      subtotalVnd,
      shippingFeeVnd: SHIPPING_FEE_VND,
      totalVnd,
      discountVnd,
      promotionCode: dto.promotionCode ?? null,
      promotionId,
      paymentMethod: dto.paymentMethod ?? 'COD',
      warrantyPolicy: WARRANTY_POLICY,
    };
  }

  /** Tạo báo giá ở snapshot RepeatableRead; chưa trừ tồn, chưa tạo đơn và ẩn promotionId nội bộ. */
  async quote(dto: QuoteDto, principal?: Principal) {
    const { promotionId: _id, ...quote } = await this.prisma.$transaction(
      (tx) => this.prices(tx, dto, principal?.userId),
      { isolationLevel: 'RepeatableRead' },
    );
    void _id;
    return quote;
  }

  /** Khóa user/SKU/mã giảm giá, tái tính giá, trừ tồn có điều kiện và lưu snapshot đơn; cùng key/body trả lại đơn cũ. */
  async create(
    principal: Principal,
    key: string,
    dto: CreateOrderDto,
    adminOwner?: { userId: string; reason: string },
  ) {
    const buyerId = adminOwner?.userId ?? principal.userId;
    const items = normalized(dto);
    const canonical = {
      items,
      recipientName: dto.recipientName,
      phone: dto.phone,
      address: dto.address,
      expectedTotalVnd: dto.expectedTotalVnd,
      ...(dto.paymentMethod === 'QR_DEMO'
        ? { paymentMethod: dto.paymentMethod }
        : {}),
      ...(dto.promotionCode ? { promotionCode: dto.promotionCode } : {}),
      ...(adminOwner
        ? { adminActorId: principal.userId, reason: adminOwner.reason }
        : {}),
    };
    // Hash JSON canonical nhận diện nội dung lần đặt: cùng key/body thì retry, cùng key/body khác thì xung đột.
    const requestHash = createHash('sha256')
      .update(JSON.stringify(canonical))
      .digest('hex');
    return this.prisma.$transaction(
      async (tx) => {
        // Same-user requests serialize, including duplicate idempotency keys and auth revocation.
        // Khóa cả actor và khách theo thứ tự; tạo đơn và thao tác giỏ/thu hồi phiên không xen kẽ sai trên cùng user.
        for (const id of [...new Set([principal.userId, buyerId])].sort())
          await lockUser(tx, id);
        const actor = await requireCurrentSession(tx, principal);
        if (adminOwner) {
          if (actor.role !== 'ADMIN') throw new ForbiddenException();
          const buyer = await tx.user.findUnique({ where: { id: buyerId } });
          if (!buyer || buyer.status !== 'ACTIVE')
            conflict(
              'BUYER_UNAVAILABLE',
              'Tài khoản khách hàng không hoạt động.',
            );
        }
        const existing = await tx.order.findUnique({
          where: {
            userId_idempotencyKey: {
              userId: buyerId,
              idempotencyKey: key.toLowerCase(),
            },
          },
          include,
        });
        // Kiểm tra idempotency trước khi trừ tồn: request đã thành công phải trả lại đơn cũ và không trừ lần hai.
        if (existing) {
          if (existing.requestHash !== requestHash)
            conflict(
              'IDEMPOTENCY_CONFLICT',
              'Mã yêu cầu đã được dùng với nội dung khác.',
            );
          return view(existing, Boolean(adminOwner));
        }
        const schema = schemaName();
        // Parent visibility and SKU prices cannot change between quote validation and snapshot.
        await tx.$queryRawUnsafe(
          `SELECT p.id FROM "${schema}".products p WHERE p.id IN (SELECT product_id FROM "${schema}".product_variants WHERE id = ANY($1::uuid[])) ORDER BY p.id FOR SHARE`,
          items.map((i) => i.variantId),
        );
        await tx.$queryRawUnsafe(
          `SELECT id FROM "${schema}".product_variants WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE`,
          items.map((i) => i.variantId),
        );
        if (dto.promotionCode)
          await tx.$queryRawUnsafe(
            `SELECT id FROM "${schema}".promotions WHERE code = $1 FOR UPDATE`,
            dto.promotionCode,
          );
        // Báo giá trước checkout chỉ để hiển thị; lúc tạo đơn luôn đọc/tính lại giá và tồn dưới các khóa DB.
        const quote = await this.prices(
          tx,
          {
            items,
            promotionCode: dto.promotionCode,
            paymentMethod: dto.paymentMethod,
          },
          buyerId,
        );
        // Khách đã xem tổng khác thì trả PRICE_CHANGED để yêu cầu xác nhận lại, không tự thu tổng mới.
        if (quote.totalVnd !== dto.expectedTotalVnd)
          conflict(
            'PRICE_CHANGED',
            'Giá đã thay đổi. Vui lòng xem lại tổng tiền trước khi đặt hàng.',
          );
        for (const item of items) {
          // Trừ tồn có điều kiện stockQuantity >= quantity. count khác 1 nghĩa không đủ tồn và toàn đơn phải rollback.
          const changed = await tx.productVariant.updateMany({
            where: {
              id: item.variantId,
              status: 'ACTIVE',
              stockQuantity: { gte: item.quantity },
            },
            data: { stockQuantity: { decrement: item.quantity } },
          });
          if (changed.count !== 1)
            conflict(
              'INSUFFICIENT_STOCK',
              'Tồn kho đã thay đổi. Vui lòng cập nhật giỏ hàng.',
            );
        }
        const order = await tx.order.create({
          data: {
            userId: buyerId,
            idempotencyKey: key.toLowerCase(),
            requestHash,
            recipientName: dto.recipientName,
            phone: dto.phone,
            address: dto.address,
            subtotalVnd: quote.subtotalVnd,
            shippingFeeVnd: quote.shippingFeeVnd,
            totalVnd: quote.totalVnd,
            paymentMethod: quote.paymentMethod,
            discountVnd: quote.discountVnd,
            promotionCode: quote.promotionCode,
            warrantyPolicy: quote.warrantyPolicy,
            // Lưu snapshot tên/SKU/giá/bảo hành của từng dòng; sửa catalog sau này không sửa lịch sử mua.
            items: { create: quote.items },
            events: {
              create: {
                actorId: principal.userId,
                action: adminOwner ? 'CREATE_ADMIN' : 'CREATE',
                reason: adminOwner
                  ? adminOwner.reason
                  : quote.paymentMethod === 'QR_DEMO'
                    ? 'Khách đặt hàng với QR demo, không chuyển tiền thật.'
                    : 'Khách xác nhận đặt hàng COD.',
                before: {},
                after: {
                  status: 'PENDING',
                  paymentStatus: 'UNPAID',
                  shippingStatus: 'NOT_SHIPPED',
                },
              },
            },
          },
          include,
        });
        if (quote.promotionId)
          await tx.promotionUse.create({
            data: {
              promotionId: quote.promotionId,
              userId: buyerId,
              orderId: order.id,
            },
          });
        // Same user lock as cart writes; a successful order removes its quantities only once.
        // Đơn khách tự tạo trừ đúng số lượng khỏi giỏ; đơn admin lập hộ không đụng tới giỏ cá nhân của khách.
        for (const item of adminOwner ? [] : items) {
          const line = await tx.cartLine.findUnique({
            where: {
              userId_variantId: {
                userId: principal.userId,
                variantId: item.variantId,
              },
            },
          });
          if (!line) continue;
          if (line.quantity <= item.quantity)
            await tx.cartLine.delete({
              where: {
                userId_variantId: {
                  userId: principal.userId,
                  variantId: item.variantId,
                },
              },
            });
          else
            await tx.cartLine.update({
              where: {
                userId_variantId: {
                  userId: principal.userId,
                  variantId: item.variantId,
                },
              },
              data: { quantity: { decrement: item.quantity } },
            });
        }
        if (adminOwner)
          await tx.businessAudit.create({
            data: {
              actorId: principal.userId,
              action: 'ORDER_CREATE_ADMIN',
              targetId: order.id,
              before: {},
              after: {
                userId: buyerId,
                totalVnd: order.totalVnd,
                paymentMethod: order.paymentMethod,
              },
              reason: adminOwner.reason,
            },
          });
        return view(order, Boolean(adminOwner));
      },
      { maxWait: 15000, timeout: 15000 },
    );
  }

  /** Chỉ đọc đơn của chủ sở hữu và tạo ma trận QR chứa nhãn DEMO, mã đơn/số tiền; không chứa tài khoản ngân hàng. */
  async qrDemo(principal: Principal, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId: principal.userId },
    });
    if (!order) throw missing();
    if (order.paymentMethod !== 'QR_DEMO' || order.status === 'CANCELLED')
      conflict('QR_DEMO_UNAVAILABLE', 'Đơn này không có mã QR demo khả dụng.');
    const payload =
      'VNWatch DEMO\nNOT A BANK TRANSFER\nORDER: ' +
      order.id +
      '\nAMOUNT: ' +
      order.totalVnd +
      '\nCURRENCY: VND';
    // Thư viện mã hóa payload DEMO thành QR; ma trận trả về để React vẽ, không tạo VietQR ngân hàng.
    const qr = new QRCode(-1, 0);
    qr.addData(payload);
    qr.make();
    const size = qr.getModuleCount();
    return {
      orderId: order.id,
      totalVnd: order.totalVnd,
      currency: 'VND',
      mode: 'DEMO',
      payload,
      modules: Array.from({ length: size }, (_, r) =>
        Array.from({ length: size }, (_, c) => qr.isDark(r, c)),
      ),
    };
  }

  /** Khóa đơn, kiểm tra chủ sở hữu/phương thức/trạng thái và mô phỏng PAID một lần, kèm lịch sử. */
  async confirmQrDemo(principal: Principal, id: string) {
    return this.prisma.$transaction(
      async (tx) => {
        await lockUser(tx, principal.userId);
        await requireCurrentSession(tx, principal);
        await tx.$queryRawUnsafe(
          `SELECT id FROM "${schemaName()}".orders WHERE id = $1::uuid FOR UPDATE`,
          id,
        );
        const order = await tx.order.findUnique({ where: { id }, include });
        if (!order || order.userId !== principal.userId) throw missing();
        if (order.paymentMethod !== 'QR_DEMO' || order.status === 'CANCELLED')
          conflict(
            'QR_DEMO_UNAVAILABLE',
            'Không thể mô phỏng thanh toán cho đơn này.',
          );
        // Thanh toán mô phỏng lặp là no-op: không ghi thêm lịch sử PAID lần hai.
        if (order.paymentStatus === 'PAID') return view(order);
        if (
          !['PENDING', 'CONFIRMED'].includes(order.status) ||
          order.shippingStatus !== 'NOT_SHIPPED'
        )
          conflict(
            'INVALID_ORDER_TRANSITION',
            'Đơn không ở trạng thái chờ thanh toán QR demo.',
          );
        const before = state(order);
        const after = { ...before, paymentStatus: 'PAID' as const };
        return view(
          await tx.order.update({
            where: { id },
            data: {
              paymentStatus: 'PAID',
              events: {
                create: {
                  actorId: principal.userId,
                  action: 'PAY_QR_DEMO',
                  reason:
                    'Mô phỏng thanh toán QR thành công. Không chuyển tiền thật.',
                  before,
                  after,
                },
              },
            },
            include,
          }),
        );
      },
      { maxWait: 15000, timeout: 15000 },
    );
  }

  /** Khách chỉ xem đơn của mình; admin thêm bộ lọc trạng thái/tìm kiếm/lưu trữ trước khi phân trang. */
  async list(principal: Principal, query: OrderPageQuery, management = false) {
    if (management && principal.role !== 'ADMIN')
      throw new ForbiddenException();
    const q = query as AdminOrderQuery;
    const escaped = q.q?.replace(/[\\%_]/g, '\\$&');
    const where: Prisma.OrderWhereInput = management
      ? {
          ...(q.archive !== 'all'
            ? { archivedAt: q.archive === 'archived' ? { not: null } : null }
            : {}),
          ...(q.status ? { status: q.status } : {}),
          ...(q.paymentStatus ? { paymentStatus: q.paymentStatus } : {}),
          ...(escaped
            ? {
                OR: [
                  { recipientName: { contains: escaped, mode: 'insensitive' } },
                  { phone: { contains: escaped } },
                  {
                    user: { email: { contains: escaped, mode: 'insensitive' } },
                  },
                  ...(isUUID(q.q ?? '', '4') ? [{ id: q.q }] : []),
                ],
              }
            : {}),
        }
      : { userId: principal.userId };
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      data: orders.map((order) => view(order, management)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
  /** Đọc chi tiết đơn: ADMIN hoặc chủ sở hữu; luôn bỏ trường nội bộ qua view. */
  async findOne(principal: Principal, id: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        ...(principal.role !== 'ADMIN' ? { userId: principal.userId } : {}),
      },
      include,
    });
    if (!order) throw missing();
    return view(order, principal.role === 'ADMIN');
  }

  /** Yêu cầu ADMIN và khách hoạt động; tính giảm giá theo userId khách được chọn. */
  async adminQuote(principal: Principal, dto: AdminQuoteDto) {
    if (principal.role !== 'ADMIN') throw new ForbiddenException();
    const buyer = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!buyer || buyer.status !== 'ACTIVE')
      conflict('BUYER_UNAVAILABLE', 'Tài khoản khách hàng không hoạt động.');
    return this.quote(dto, { ...principal, userId: dto.userId });
  }

  /** Gọi create với chủ đơn là khách, lưu actor/lý do admin và giữ nguyên giỏ khách. */
  adminCreate(principal: Principal, key: string, dto: AdminCreateOrderDto) {
    return this.create(principal, key, dto, {
      userId: dto.userId,
      reason: dto.reason,
    });
  }

  /** Kiểm tra version và ADMIN dưới khóa đơn; chỉ sửa khi chưa giao, lưu trữ/khôi phục khi đơn kết thúc, ghi audit. */
  async adminChange(
    principal: Principal,
    id: string,
    dto: AdminVersionDto | AdminEditOrderDto,
    mode: 'EDIT' | 'ARCHIVE' | 'RESTORE',
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        await lockUser(tx, principal.userId);
        const actor = await requireCurrentSession(tx, principal);
        if (actor.role !== 'ADMIN') throw new ForbiddenException();
        await tx.$queryRawUnsafe(
          `SELECT id FROM "${schemaName()}".orders WHERE id = $1::uuid FOR UPDATE`,
          id,
        );
        const order = await tx.order.findUnique({ where: { id }, include });
        if (!order) throw missing();
        if (
          order.updatedAt.getTime() !==
          new Date(dto.expectedUpdatedAt).getTime()
        )
          conflict(
            'ORDER_CHANGED',
            'Đơn đã thay đổi. Hãy tải lại trước khi lưu.',
          );
        let data: Prisma.OrderUpdateInput;
        let before: Prisma.InputJsonObject;
        let after: Prisma.InputJsonObject;
        if (mode === 'EDIT') {
          if (
            order.archivedAt ||
            !['PENDING', 'CONFIRMED'].includes(order.status) ||
            order.shippingStatus !== 'NOT_SHIPPED'
          )
            conflict(
              'ORDER_NOT_EDITABLE',
              'Chỉ sửa thông tin giao hàng khi đơn chưa giao.',
            );
          const edit = dto as AdminEditOrderDto;
          data = {
            recipientName: edit.recipientName,
            phone: edit.phone,
            address: edit.address,
          };
          before = {
            recipientName: order.recipientName,
            phone: order.phone,
            address: order.address,
          };
          after = {
            recipientName: edit.recipientName,
            phone: edit.phone,
            address: edit.address,
          };
        } else {
          if (!['COMPLETED', 'CANCELLED'].includes(order.status))
            conflict(
              'ORDER_NOT_ARCHIVABLE',
              'Chỉ xóa khỏi danh sách quản trị các đơn đã hoàn tất hoặc đã hủy.',
            );
          const archivedAt = mode === 'ARCHIVE' ? new Date() : null;
          // Lưu trữ/khôi phục đúng trạng thái hiện tại không cần ghi lại; dữ liệu đơn/lịch sử vẫn tồn tại.
          if (Boolean(order.archivedAt) === Boolean(archivedAt))
            return view(order, true);
          data = { archivedAt };
          before = { archivedAt: order.archivedAt?.toISOString() ?? null };
          after = { archivedAt: archivedAt?.toISOString() ?? null };
        }
        const updated = await tx.order.update({
          where: { id },
          data: {
            ...data,
            events: {
              create: {
                actorId: principal.userId,
                action: 'ADMIN_' + mode,
                reason: dto.reason,
                before,
                after,
              },
            },
          },
          include,
        });
        await tx.businessAudit.create({
          data: {
            actorId: principal.userId,
            action: 'ORDER_' + mode,
            targetId: id,
            reason: dto.reason,
            before,
            after,
          },
        });
        return view(updated, true);
      },
      { maxWait: 15000, timeout: 15000 },
    );
  }

  /** Thực hiện máy trạng thái đơn dưới khóa: xác nhận/giao/hoàn tất/hủy; hủy hợp lệ hoàn tồn đúng một lần. */
  async transition(
    principal: Principal,
    id: string,
    dto: OrderActionDto,
    customerCancel = false,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        await lockUser(tx, principal.userId);
        const user = await requireCurrentSession(tx, principal);
        if (!customerCancel && user.role !== 'ADMIN')
          throw new ForbiddenException({
            code: 'FORBIDDEN',
            message: 'Bạn không có quyền xử lý đơn hàng.',
          });
        await tx.$queryRawUnsafe(
          `SELECT id FROM "${schemaName()}".orders WHERE id = $1::uuid FOR UPDATE`,
          id,
        );
        const order = await tx.order.findUnique({ where: { id }, include });
        if (!order || (customerCancel && order.userId !== principal.userId))
          throw missing();
        const previous = state(order);
        const next = { ...previous };
        // Repeated cancellation has no second inventory or audit effect.
        // Hủy lặp trả lại trạng thái cũ để không hoàn tồn hoặc ghi audit hai lần.
        if (dto.action === 'CANCEL' && order.status === 'CANCELLED')
          return view(order);
        if (dto.action === 'CANCEL') {
          if (
            order.shippingStatus !== 'NOT_SHIPPED' ||
            order.paymentStatus !== 'UNPAID' ||
            !['PENDING', ...(customerCancel ? [] : ['CONFIRMED'])].includes(
              order.status,
            )
          )
            conflict(
              'INVALID_ORDER_TRANSITION',
              'Đơn đã được xử lý, không thể hủy ở trạng thái hiện tại.',
            );
          for (const item of [...order.items].sort((a, b) =>
            a.variantId.localeCompare(b.variantId),
          )) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              // Chỉ hoàn tồn trong nhánh hủy hợp lệ, cùng transaction với cập nhật đơn.
              data: { stockQuantity: { increment: item.quantity } },
            });
          }
          next.status = 'CANCELLED';
        } else if (dto.action === 'CONFIRM' && order.status === 'PENDING')
          next.status = 'CONFIRMED';
        else if (
          dto.action === 'SHIP' &&
          order.status === 'CONFIRMED' &&
          order.shippingStatus === 'NOT_SHIPPED' &&
          (order.paymentMethod === 'COD' || order.paymentStatus === 'PAID')
        )
          next.shippingStatus = 'IN_TRANSIT';
        else if (
          dto.action === 'COMPLETE' &&
          order.status === 'CONFIRMED' &&
          order.shippingStatus === 'IN_TRANSIT' &&
          (order.paymentMethod === 'COD'
            ? order.paymentStatus === 'UNPAID'
            : order.paymentStatus === 'PAID')
        ) {
          next.status = 'COMPLETED';
          next.shippingStatus = 'DELIVERED';
          // Khi hoàn tất giao COD, thanh toán chuyển PAID; QR demo phải đã PAID trước khi giao/hoàn tất.
          next.paymentStatus = 'PAID';
        } else
          conflict(
            'INVALID_ORDER_TRANSITION',
            'Không thể chuyển đơn sang trạng thái đã chọn.',
          );
        const updated = await tx.order.update({
          where: { id },
          data: {
            ...next,
            events: {
              create: {
                actorId: principal.userId,
                action: dto.action,
                reason: dto.reason,
                before: previous,
                after: next,
              },
            },
          },
          include,
        });
        if (!customerCancel)
          await tx.businessAudit.create({
            data: {
              actorId: principal.userId,
              action: 'ORDER_' + dto.action,
              targetId: id,
              before: previous,
              after: next,
              reason: dto.reason,
            },
          });
        return view(updated, !customerCancel);
      },
      { maxWait: 15000, timeout: 15000 },
    );
  }
}
