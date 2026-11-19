/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/shop/shop.service.ts
 * Nghiệp vụ giỏ hàng, yêu thích, địa chỉ, bảo hành, hỗ trợ và quản trị catalog/khuyến mãi/báo cáo.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CatalogService } from '../catalog/catalog.service';
import { Principal } from '../auth/auth.types';
import { lockUser, requireCurrentSession } from '../auth/auth-transaction';
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

/** Bí danh TransactionClient: thao tác trên tx phải thuộc transaction đang mở. */
type Tx = Prisma.TransactionClient;
/** Tạo 404 chung cho tài nguyên thiếu hoặc không thuộc user. */
const missing = () =>
  new NotFoundException({
    code: 'RESOURCE_NOT_FOUND',
    message: 'Không tìm thấy dữ liệu thuộc quyền truy cập của bạn.',
  });
/** Tạo xung đột nghiệp vụ 409 với thông báo có thể hiển thị. */
const reject = (message: string) =>
  new ConflictException({ code: 'SHOP_CONFLICT', message });
/** Chuyển giá trị sang dữ liệu JSON tương thích để ghi before/after audit. */
const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
/** Tạo thông tin phân trang từ page/limit và tổng dòng. */
const meta = (q: ShopPageQuery, total: number) => ({
  page: q.page,
  limit: q.limit,
  total,
  totalPages: Math.ceil(total / q.limit),
});
/** Đổi page/limit sang skip/take của Prisma. */
const paging = (q: ShopPageQuery) => ({
  skip: (q.page - 1) * q.limit,
  take: q.limit,
});
const ticketInclude = {
  messages: {
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
  },
};
/** Cộng tháng theo UTC và chặn ngày vượt cuối tháng để ngày hết bảo hành hợp lệ. */
function warrantyEnd(start: Date, months: number) {
  const result = new Date(start);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const last = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, last));
  return result;
}
/** Service tập trung nghiệp vụ; các dependency được tiêm qua constructor để có thể kiểm thử độc lập. */
@Injectable()
export class ShopService {
  // NestJS tiêm các dependency được khai báo; private readonly vừa nhận tham số vừa tạo thuộc tính của lớp.
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
  ) {}
  /** Bao thao tác ghi trong transaction: khóa user, kiểm tra phiên/role hiện tại và chuyển lỗi dữ liệu trùng. */
  private async write<T>(
    p: Principal,
    role: 'USER' | 'STAFF' | 'ADMIN',
    action: (tx: Tx) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await lockUser(tx, p.userId);
          const user = await requireCurrentSession(tx, p);
          if (
            (role === 'ADMIN' && user.role !== 'ADMIN') ||
            (role === 'STAFF' && user.role === 'CUSTOMER')
          )
            throw new ForbiddenException();
          return action(tx);
        },
        { maxWait: 15000, timeout: 15000 },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw reject(
          'Mã hoặc dữ liệu này đã tồn tại. Vui lòng dùng giá trị khác.',
        );
      throw error;
    }
  }
  /** Ghi actor, target, hành động, lý do và JSON trước/sau cùng transaction nghiệp vụ. */
  private auditWrite(
    tx: Tx,
    p: Principal,
    action: string,
    targetId: string,
    before: unknown,
    after: unknown,
    reason: string,
  ) {
    return tx.businessAudit.create({
      data: {
        actorId: p.userId,
        action,
        targetId,
        before: json(before),
        after: json(after),
        reason,
      },
    });
  }
  /** Đọc dòng giỏ của user; trả variantId/productId/quantity để UI tải thông tin catalog riêng. */
  private async readCart(tx: Tx, p: Principal) {
    const lines = await tx.cartLine.findMany({
      where: { userId: p.userId },
      include: { variant: { select: { productId: true } } },
      orderBy: { variantId: 'asc' },
    });
    return lines.map((l) => ({
      variantId: l.variantId,
      productId: l.variant.productId,
      quantity: l.quantity,
    }));
  }
  /** Đọc giỏ hàng thuộc principal qua readCart. */
  cart(p: Principal) {
    return this.readCart(this.prisma, p);
  }
  /** ADD cộng số lượng, SET thay số lượng; 0 xóa dòng, còn lại kiểm tra SKU/tồn/giới hạn rồi upsert, không trừ tồn. */
  writeCart(p: Principal, d: CartWriteDto) {
    return this.write(p, 'USER', async (tx) => {
      const key = { userId: p.userId, variantId: d.variantId };
      const existing = await tx.cartLine.findUnique({
        where: { userId_variantId: key },
      });
      const quantity =
        // ADD cộng vào giỏ hiện có; SET là số lượng cuối cùng. Giỏ chưa trừ tồn hay tạo đơn.
        d.mode === 'ADD' ? (existing?.quantity ?? 0) + d.quantity : d.quantity;
      if (d.mode === 'ADD' && d.quantity === 0) throw new BadRequestException();
      if (!quantity) await tx.cartLine.deleteMany({ where: key });
      else {
        const variant = await tx.productVariant.findFirst({
          where: {
            id: d.variantId,
            status: 'ACTIVE',
            product: { status: 'ACTIVE' },
          },
        });
        if (!variant) throw reject('Phiên bản này không còn kinh doanh.');
        // Kiểm tra tồn khi thêm giỏ để báo sớm; checkout vẫn phải kiểm tra lại vì khách khác có thể mua sau đó.
        if (quantity > 99 || quantity > variant.stockQuantity)
          throw reject('Số lượng vượt giới hạn hoặc tồn kho hiện có.');
        if (
          !existing &&
          (await tx.cartLine.count({ where: { userId: p.userId } })) >= 50
        )
          throw reject('Giỏ hàng tối đa 50 phiên bản.');
        await tx.cartLine.upsert({
          where: { userId_variantId: key },
          create: { ...key, quantity },
          update: { quantity },
        });
      }
      return this.readCart(tx, p);
    });
  }
  /** Trả danh sách yêu thích kèm khả dụng của mẫu/SKU. */
  async favorites(p: Principal) {
    const rows = await this.prisma.favorite.findMany({
      where: { userId: p.userId },
      include: {
        product: {
          include: {
            variants: { where: { status: 'ACTIVE' }, select: { id: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      productId: r.productId,
      name: r.product.name,
      available: r.product.status === 'ACTIVE' && r.product.variants.length > 0,
    }));
  }
  /** Thêm/bỏ yêu thích của chính user; thêm chỉ cho mẫu đang bán. */
  favorite(p: Principal, id: string, add: boolean) {
    return this.write(p, 'USER', async (tx) => {
      const key = { userId: p.userId, productId: id };
      if (add) {
        if (
          !(await tx.product.findFirst({
            where: {
              id,
              status: 'ACTIVE',
              variants: { some: { status: 'ACTIVE' } },
            },
          }))
        )
          throw missing();
        if (
          (await tx.favorite.count({ where: { userId: p.userId } })) >= 100 &&
          !(await tx.favorite.findUnique({ where: { userId_productId: key } }))
        )
          throw reject('Danh sách yêu thích tối đa 100 sản phẩm.');
        await tx.favorite.upsert({
          where: { userId_productId: key },
          create: key,
          update: {},
        });
      } else await tx.favorite.deleteMany({ where: key });
      return { saved: add };
    });
  }
  /** Đọc các địa chỉ thuộc user, không lấy địa chỉ người khác. */
  addresses(p: Principal) {
    return this.prisma.savedAddress.findMany({
      where: { userId: p.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        label: true,
        recipientName: true,
        phone: true,
        address: true,
      },
    });
  }
  /** Lưu địa chỉ mới của user, tối đa mười địa chỉ. */
  address(p: Principal, d: AddressDto) {
    return this.write(p, 'USER', async (tx) => {
      if ((await tx.savedAddress.count({ where: { userId: p.userId } })) >= 10)
        throw reject('Bạn có thể lưu tối đa 10 địa chỉ.');
      return tx.savedAddress.create({ data: { ...d, userId: p.userId } });
    });
  }
  /** Xóa địa chỉ theo cả id và userId để bảo vệ quyền sở hữu. */
  removeAddress(p: Principal, id: string) {
    return this.write(p, 'USER', async (tx) => {
      const result = await tx.savedAddress.deleteMany({
        where: { id, userId: p.userId },
      });
      if (!result.count) throw missing();
      return { removed: true };
    });
  }
  /** Chỉ phát thẻ bảo hành cho dòng hàng có thời hạn trong đơn hoàn tất/đã thanh toán/đã giao. */
  async warranties(p: Principal) {
    const rows = await this.prisma.orderItem.findMany({
      where: {
        warrantyMonths: { gt: 0 },
        order: {
          userId: p.userId,
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          shippingStatus: 'DELIVERED',
        },
      },
      include: {
        order: {
          select: {
            events: {
              where: { action: 'COMPLETE' },
              orderBy: { createdAt: 'asc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });
    return rows.flatMap((item) => {
      const activatedAt = item.order.events[0]?.createdAt;
      if (!activatedAt || !item.warrantyMonths) return [];
      const expiresAt = warrantyEnd(activatedAt, item.warrantyMonths);
      return [
        {
          id: item.id,
          orderId: item.orderId,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          months: item.warrantyMonths,
          activatedAt,
          expiresAt,
          active: expiresAt > new Date(),
          serial: null,
        },
      ];
    });
  }
  /** Khách xem ticket của mình; ADMIN lọc open/closed trên server trước khi phân trang. */
  async tickets(p: Principal, q: ShopPageQuery, management = false) {
    if (management && p.role !== 'ADMIN') throw new ForbiddenException();
    const state = (q as ManagementTicketsQuery).state;
    const where: Prisma.SupportTicketWhereInput = !management
      ? { userId: p.userId }
      : state === 'open'
        ? { status: { in: ['OPEN', 'IN_REVIEW'] } }
        : state === 'closed'
          ? { status: { in: ['RESOLVED', 'REJECTED'] } }
          : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.supportTicket.findMany({
        where,
        include: ticketInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...paging(q),
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return { data, meta: meta(q, total) };
  }
  /** Tạo ticket sau khi kiểm tra đơn/thẻ bảo hành thuộc user và giới hạn yêu cầu đang mở. */
  ticket(p: Principal, d: TicketDto) {
    return this.write(p, 'USER', async (tx) => {
      if (
        d.orderId &&
        !(await tx.order.findFirst({
          where: { id: d.orderId, userId: p.userId },
        }))
      )
        throw missing();
      if (d.kind === 'ORDER' && !d.orderId)
        throw new BadRequestException({
          code: 'ORDER_REQUIRED',
          message: 'Chọn đơn hàng của bạn.',
        });
      if (d.kind === 'WARRANTY') {
        const item = await tx.orderItem.findFirst({
          where: {
            id: d.orderItemId ?? '00000000-0000-4000-8000-000000000000',
            order: {
              userId: p.userId,
              status: 'COMPLETED',
              paymentStatus: 'PAID',
              shippingStatus: 'DELIVERED',
            },
          },
          include: {
            order: {
              include: {
                events: {
                  where: { action: 'COMPLETE' },
                  orderBy: { createdAt: 'asc' },
                  take: 1,
                },
              },
            },
          },
        });
        const activated = item?.order.events[0]?.createdAt;
        if (
          !item ||
          !item.warrantyMonths ||
          !activated ||
          warrantyEnd(activated, item.warrantyMonths) <= new Date()
        )
          throw reject('Không có bảo hành còn hiệu lực cho sản phẩm đã chọn.');
        if (
          await tx.supportTicket.count({
            where: {
              userId: p.userId,
              orderItemId: item.id,
              kind: 'WARRANTY',
              status: { in: ['OPEN', 'IN_REVIEW'] },
            },
          })
        )
          throw reject('Sản phẩm này đã có yêu cầu bảo hành đang xử lý.');
        d.orderId = item.orderId;
      } else if (d.orderItemId) throw new BadRequestException();
      if (
        (await tx.supportTicket.count({
          where: { userId: p.userId, status: { in: ['OPEN', 'IN_REVIEW'] } },
        })) >= 50
      )
        throw reject('Bạn đang có quá nhiều yêu cầu chưa giải quyết.');
      const user = await tx.user.findUniqueOrThrow({ where: { id: p.userId } });
      return tx.supportTicket.create({
        data: {
          userId: p.userId,
          kind: d.kind,
          subject: d.subject,
          orderId: d.orderId,
          orderItemId: d.orderItemId,
          messages: {
            create: {
              body: d.body,
              authorName: user.displayName,
              authorRole: 'CUSTOMER',
            },
          },
        },
        include: ticketInclude,
      });
    });
  }
  /** Trả lời ticket dưới transaction; version ngăn trả lời đồng thời với đóng ticket, admin mới được đổi trạng thái. */
  reply(p: Principal, id: string, d: ReplyDto, management: boolean) {
    return this.write(p, management ? 'ADMIN' : 'USER', async (tx) => {
      const ticket = await tx.supportTicket.findFirst({
        where: { id, ...(management ? {} : { userId: p.userId }) },
      });
      if (!ticket) throw missing();
      if (!management && d.status) throw new ForbiddenException();
      if (['RESOLVED', 'REJECTED'].includes(ticket.status))
        throw reject(
          'Yêu cầu đã đóng. Hãy tạo yêu cầu mới nếu cần hỗ trợ thêm.',
        );
      const user = await tx.user.findUniqueOrThrow({ where: { id: p.userId } });
      // Conditional update serializes simultaneous replies with closing a ticket.
      // Khóa lạc quan: chỉ update nếu timestamp chưa đổi, tránh ghi đè thao tác trả lời/đóng ticket đồng thời.
      const changed = await tx.supportTicket.updateMany({
        where: { id, updatedAt: ticket.updatedAt },
        data: { status: d.status ?? ticket.status, updatedAt: new Date() },
      });
      if (!changed.count)
        throw reject('Yêu cầu vừa được cập nhật. Hãy tải lại.');
      await tx.ticketMessage.create({
        data: {
          ticketId: id,
          body: d.body,
          authorName: user.displayName,
          authorRole: management ? user.role : 'CUSTOMER',
        },
      });
      if (management)
        await this.auditWrite(
          tx,
          p,
          'SUPPORT_REPLY',
          id,
          { status: ticket.status },
          { status: d.status ?? ticket.status },
          d.body,
        );
      return tx.supportTicket.findUniqueOrThrow({
        where: { id },
        include: ticketInclude,
      });
    });
  }
  /** Trả đánh giá công khai chưa ẩn, tác giả và điểm trung bình của mẫu. */
  async reviews(id: string, q: ShopPageQuery) {
    await this.catalog.findOne(id);
    const where = { productId: id, hidden: false };
    const [data, total, aggregate] = await this.prisma.$transaction([
      this.prisma.productReview.findMany({
        where,
        select: {
          id: true,
          rating: true,
          body: true,
          updatedAt: true,
          user: { select: { displayName: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...paging(q),
      }),
      this.prisma.productReview.count({ where }),
      this.prisma.productReview.aggregate({ where, _avg: { rating: true } }),
    ]);
    return {
      data: data.map(({ user, ...r }) => ({
        ...r,
        authorName: user.displayName,
        verifiedPurchase: true,
      })),
      meta: meta(q, total),
      averageRating: aggregate._avg.rating,
    };
  }
  /** Chỉ user có đơn hoàn tất/đã trả/đã nhận mới được upsert một đánh giá cho mỗi mẫu. */
  review(p: Principal, id: string, d: ReviewDto) {
    return this.write(p, 'USER', async (tx) => {
      const bought = await tx.orderItem.findFirst({
        where: {
          variant: { productId: id },
          order: {
            userId: p.userId,
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            shippingStatus: 'DELIVERED',
          },
        },
      });
      if (!bought)
        throw reject(
          'Chỉ khách đã nhận hàng và hoàn tất đơn mới có thể đánh giá.',
        );
      return tx.productReview.upsert({
        where: { userId_productId: { userId: p.userId, productId: id } },
        create: { ...d, userId: p.userId, productId: id },
        update: d,
      });
    });
  }
  /** Danh mục quản trị gồm cả nháp/ngừng bán; tìm/lọc trước khi phân trang và trả tồn/version SKU. */
  async products(q: ManagementProductsQuery) {
    const search = q.q?.replace(/[\\%_]/g, '\\$&');
    const where: Prisma.ProductWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    if (q.status) where.status = q.status;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: { variants: { orderBy: { sku: 'asc' } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...paging(q),
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data, meta: meta(q, total) };
  }
  /** ADMIN tạo mẫu DEMO kèm SKU đầu tiên và audit. */
  createProduct(p: Principal, d: ProductCreateDto) {
    return this.write(p, 'ADMIN', async (tx) => {
      const { variant, reason, ...fields } = d;
      const product = await tx.product.create({
        data: { ...fields, dataKind: 'DEMO', variants: { create: variant } },
        include: { variants: true },
      });
      await this.auditWrite(
        tx,
        p,
        'PRODUCT_CREATE',
        product.id,
        {},
        product,
        reason,
      );
      return product;
    });
  }
  /** ADMIN tạo thêm SKU cho mẫu đã tồn tại, tối đa năm mươi SKU và ghi audit. */
  createVariant(p: Principal, id: string, d: VariantCreateDto) {
    return this.write(p, 'ADMIN', async (tx) => {
      if (!(await tx.product.findUnique({ where: { id } }))) throw missing();
      if ((await tx.productVariant.count({ where: { productId: id } })) >= 50)
        throw reject('Một mẫu có tối đa 50 phiên bản.');
      const { reason, ...fields } = d;
      const variant = await tx.productVariant.create({
        data: { ...fields, productId: id },
      });
      await this.auditWrite(
        tx,
        p,
        'VARIANT_CREATE',
        variant.id,
        {},
        variant,
        reason,
      );
      return variant;
    });
  }
  /** Cập nhật mẫu nếu updatedAt khớp version client, tránh ghi đè thay đổi mới. */
  product(p: Principal, id: string, d: ProductWriteDto) {
    return this.write(p, 'ADMIN', async (tx) => {
      const before = await tx.product.findUnique({ where: { id } });
      if (!before) throw missing();
      const { reason, expectedUpdatedAt, ...fields } = d;
      const changed = await tx.product.updateMany({
        where: { id, updatedAt: new Date(expectedUpdatedAt) },
        data: fields,
      });
      if (!changed.count)
        throw reject('Sản phẩm đã thay đổi. Hãy tải lại trước khi lưu.');
      const after = await tx.product.findUniqueOrThrow({
        where: { id },
        include: { variants: true },
      });
      await this.auditWrite(tx, p, 'PRODUCT_UPDATE', id, before, after, reason);
      return after;
    });
  }
  /** Cập nhật SKU nếu timestamp và tồn cùng khớp; đổi giá chuyển nguồn giá sang cấu hình demo và ghi audit. */
  variant(p: Principal, id: string, d: VariantWriteDto) {
    return this.write(p, 'ADMIN', async (tx) => {
      const before = await tx.productVariant.findUnique({ where: { id } });
      if (!before) throw missing();
      const { reason, expectedUpdatedAt, expectedStockQuantity, ...fields } = d;
      const changed = await tx.productVariant.updateMany({
        where: {
          id,
          updatedAt: new Date(expectedUpdatedAt),
          // Tồn là điều kiện version bổ sung: checkout có thể đổi tồn mà không đi qua form quản trị.
          stockQuantity: expectedStockQuantity,
        },
        data: {
          ...fields,
          ...(before.priceVnd !== d.priceVnd
            ? {
                priceSourceName: 'VNWatch — giá cấu hình demo',
                priceSourceUrl: null,
                priceCheckedAt: new Date(),
              }
            : {}),
        },
      });
      if (!changed.count)
        throw reject(
          'Giá hoặc tồn kho đã thay đổi. Hãy tải lại để tránh ghi đè đơn vừa đặt.',
        );
      const after = await tx.productVariant.findUniqueOrThrow({
        where: { id },
      });
      await this.auditWrite(tx, p, 'VARIANT_UPDATE', id, before, after, reason);
      return after;
    });
  }
  /** Tổng hợp cùng snapshot: doanh thu chỉ của đơn COMPLETED/PAID, tồn SKU/mẫu ACTIVE và ticket đang mở. */
  async reports() {
    return this.prisma.$transaction(
      async (tx) => {
        const [
          orders,
          paid,
          customers,
          products,
          variants,
          stock,
          lowStock,
          tickets,
          best,
        ] = await Promise.all([
          tx.order.groupBy({
            by: ['status'],
            _count: true,
            _sum: { totalVnd: true },
          }),
          tx.order.aggregate({
            // Báo cáo doanh thu chỉ tính đơn đã hoàn tất và thanh toán; tổng đơn chờ/hủy không phải doanh thu.
            where: { status: 'COMPLETED', paymentStatus: 'PAID' },
            _sum: { totalVnd: true },
            _count: true,
          }),
          tx.user.count({ where: { role: 'CUSTOMER' } }),
          tx.product.count(),
          tx.productVariant.count(),
          tx.productVariant.aggregate({
            where: { status: 'ACTIVE', product: { status: 'ACTIVE' } },
            _sum: { stockQuantity: true },
          }),
          tx.productVariant.findMany({
            where: {
              status: 'ACTIVE',
              product: { status: 'ACTIVE' },
              stockQuantity: { lte: 10 },
            },
            select: {
              sku: true,
              label: true,
              stockQuantity: true,
              product: { select: { name: true } },
            },
            orderBy: { stockQuantity: 'asc' },
            take: 20,
          }),
          tx.supportTicket.count({
            where: { status: { in: ['OPEN', 'IN_REVIEW'] } },
          }),
          tx.orderItem.groupBy({
            by: ['sku', 'productName'],
            where: { order: { status: 'COMPLETED', paymentStatus: 'PAID' } },
            _sum: { quantity: true, lineTotalVnd: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 10,
          }),
        ]);
        return {
          generatedAt: new Date(),
          customers,
          products,
          variants,
          availableUnits: stock._sum.stockQuantity ?? 0,
          paidRevenueVnd: paid._sum.totalVnd ?? 0,
          completedOrders: paid._count,
          orders: orders.map((x) => ({
            status: x.status,
            count: x._count,
            totalVnd: x._sum.totalVnd ?? 0,
          })),
          openTickets: tickets,
          lowStock,
          bestSellers: best.map((x) => ({
            sku: x.sku,
            name: x.productName,
            quantity: x._sum.quantity ?? 0,
            productRevenueVnd: x._sum.lineTotalVnd ?? 0,
          })),
          note: 'Dữ liệu demo. Doanh thu chỉ gồm đơn hoàn tất đã thanh toán demo; tổng đơn chờ/hủy không phải doanh thu.',
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  /** Liệt kê nhật ký nghiệp vụ và tên actor theo phân trang. */
  async audit(q: ShopPageQuery) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.businessAudit.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...paging(q),
        include: { actor: { select: { displayName: true } } },
      }),
      this.prisma.businessAudit.count(),
    ]);
    return { data, meta: meta(q, total) };
  }
  /** Liệt kê mã giảm giá kèm số lượt đã dùng. */
  async promotions(q: ShopPageQuery) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.promotion.findMany({
        ...paging(q),
        orderBy: { code: 'asc' },
        include: { _count: { select: { uses: true } } },
      }),
      this.prisma.promotion.count(),
    ]);
    return { data, meta: meta(q, total) };
  }
  /** Tạo mã giảm giá sau kiểm tra thời điểm kết thúc lớn hơn bắt đầu, kèm audit. */
  promotion(p: Principal, d: PromotionDto) {
    return this.write(p, 'ADMIN', async (tx) => {
      if (new Date(d.endsAt) <= new Date(d.startsAt))
        throw new BadRequestException({
          code: 'INVALID_DATES',
          message: 'Thời điểm kết thúc phải sau bắt đầu.',
        });
      const { reason, ...fields } = d;
      const row = await tx.promotion.create({
        data: {
          ...fields,
          startsAt: new Date(d.startsAt),
          endsAt: new Date(d.endsAt),
        },
      });
      await this.auditWrite(tx, p, 'PROMOTION_CREATE', row.id, {}, row, reason);
      return row;
    });
  }
  /** ADMIN bật/tắt mã và ghi before/after; không xóa lịch sử lượt dùng. */
  promotionActive(p: Principal, id: string, d: ActiveDto) {
    return this.write(p, 'ADMIN', async (tx) => {
      const before = await tx.promotion.findUnique({ where: { id } });
      if (!before) throw missing();
      const after = await tx.promotion.update({
        where: { id },
        data: { active: d.active },
      });
      await this.auditWrite(
        tx,
        p,
        'PROMOTION_ACTIVE',
        id,
        before,
        after,
        d.reason,
      );
      return after;
    });
  }
  /** ADMIN xem toàn bộ đánh giá gồm cả đã ẩn để kiểm duyệt. */
  async manageReviews(q: ShopPageQuery) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.productReview.findMany({
        ...paging(q),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { displayName: true } },
          product: { select: { name: true } },
        },
      }),
      this.prisma.productReview.count(),
    ]);
    return { data, meta: meta(q, total) };
  }
  /** ADMIN đổi hidden của đánh giá và lưu lý do vào audit. */
  reviewVisibility(p: Principal, id: string, d: VisibilityDto) {
    return this.write(p, 'ADMIN', async (tx) => {
      const before = await tx.productReview.findUnique({ where: { id } });
      if (!before) throw missing();
      const after = await tx.productReview.update({
        where: { id },
        data: { hidden: d.hidden },
      });
      await this.auditWrite(
        tx,
        p,
        'REVIEW_VISIBILITY',
        id,
        before,
        after,
        d.reason,
      );
      return after;
    });
  }
  /** Chuyển mẫu sang DISCONTINUED nếu version khớp; giữ SKU/đơn/lịch sử thay vì xóa dữ liệu liên quan. */
  archiveProduct(p: Principal, id: string, d: ProductArchiveDto) {
    return this.write(p, 'ADMIN', async (tx) => {
      const before = await tx.product.findUnique({ where: { id } });
      if (!before) throw missing();
      if (
        before.updatedAt.getTime() !== new Date(d.expectedUpdatedAt).getTime()
      )
        throw reject('Sản phẩm đã thay đổi. Hãy tải lại trước khi xóa.');
      const changed = await tx.product.updateMany({
        where: { id, updatedAt: new Date(d.expectedUpdatedAt) },
        // Xóa trong UI là ngừng kinh doanh; giữ bản ghi để các đơn cũ và khóa ngoại còn đúng.
        data: { status: 'DISCONTINUED' },
      });
      if (!changed.count) throw reject('Sản phẩm đã thay đổi. Hãy tải lại.');
      const after = await tx.product.findUniqueOrThrow({
        where: { id },
        include: { variants: true },
      });
      await this.auditWrite(
        tx,
        p,
        'PRODUCT_ARCHIVE',
        id,
        { status: before.status },
        { status: after.status },
        d.reason,
      );
      return after;
    });
  }
}
