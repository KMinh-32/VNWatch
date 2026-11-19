/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/assistant/assistant.service.ts
 * Gateway NestJS lấy catalog công khai rồi gọi FastAPI nội bộ; đối chiếu SKU và nguồn trả về với dữ liệu đã gửi.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CatalogService } from '../catalog/catalog.service';
import { ListProductsDto } from '../catalog/dto/list-products.dto';
import { ProductDto } from '../catalog/dto/product-response.dto';
import { AssistantChatDto, AssistantReplyDto } from './assistant.dto';
import { brands, policies } from './knowledge';

/** Hợp đồng agent dự kiến; gateway còn kiểm tra cấu trúc/ID/nguồn thật trước khi trả client. */
interface AgentReply {
  intent?: string | null;
  modelName?: string | null;
  // Chế độ hội thoại/provider hoặc thao tác giỏ, theo hợp đồng của file.
  mode: 'CATALOG' | 'OPENAI';
  // Nội dung trả lời dựng từ dữ liệu đã cung cấp.
  text: string;
  // Thông báo chế độ catalog hoặc fallback khi provider lỗi.
  notice: string | null;
  // Các ID mẫu/SKU được chọn; NestJS đối chiếu lại với catalog.
  selection: { productId: string; variantIds: string[] }[];
  // Nguồn đã được whitelist/đối chiếu.
  sources: { title: string; url: string; checkedAt: string | null }[];
  // Hành động nghiệp vụ/đích điều hướng thuộc danh sách cho phép.
  action: 'orders' | 'collection' | 'guide' | null;
}

/** Service tập trung nghiệp vụ; các dependency được tiêm qua constructor để có thể kiểm thử độc lập. */
@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  // NestJS tiêm các dependency được khai báo; private readonly vừa nhận tham số vừa tạo thuộc tính của lớp.
  constructor(private readonly catalog: CatalogService) {}

  /** Giới hạn catalog hai trăm mẫu, gọi agent bằng token server, kiểm tra reply rồi chỉ trả SKU/nguồn thuộc catalog đã gửi. */
  async chat(body: AssistantChatDto): Promise<AssistantReplyDto> {
    const token = process.env.ASSISTANT_SERVICE_TOKEN;
    const address = process.env.ASSISTANT_SERVICE_URL;
    if (!address || !token || token.length < 32) this.unavailable();
    // Địa chỉ agent là cấu hình operator, không cho khách chọn URL để server fetch tùy ý.
    const url = new URL(address);
    // Service endpoint is operator configuration, never supplied by a visitor.
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      this.unavailable();
    if (
      url.protocol === 'http:' &&
      !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) &&
      !(
        process.env.NODE_ENV === 'development' &&
        process.env.VNWATCH_DOCKER_DEMO === 'true' &&
        url.hostname === 'agent' &&
        url.port === '8000' &&
        url.pathname === '/'
      )
    )
      this.unavailable();
    const products: ProductDto[] = [];
    let total = 0;
    // Mỗi trang tối đa 50 mẫu, bốn trang giới hạn dữ liệu và thời gian trợ lý; truncated báo kết quả bị giới hạn.
    for (let page = 1; page <= 4; page++) {
      const result = await this.catalog.list(
        Object.assign(new ListProductsDto(), {
          page,
          limit: 50,
          dataKind: body.dataKind,
          sort: 'name_asc',
        }),
      );
      products.push(...result.data);
      total = result.meta.total;
      if (page >= result.meta.totalPages) break;
    }
    // Whitelist nguồn hình thành từ kiến thức hãng và catalog thật, không chấp nhận URL mô hình tự đưa thêm.
    const allowedSources = new Map<
      string,
      { title: string; url: string; checkedAt: string | null }
    >();
    for (const brand of brands)
      allowedSources.set(brand.source.url, brand.source);
    for (const product of products) {
      if (product.sourceUrl?.startsWith('https://'))
        allowedSources.set(product.sourceUrl, {
          title: product.sourceName ?? product.brand,
          url: product.sourceUrl,
          checkedAt: product.sourceCheckedAt,
        });
      for (const v of product.variants)
        if (v.priceSourceUrl?.startsWith('https://'))
          allowedSources.set(v.priceSourceUrl, {
            title: `Giá: ${v.priceSourceName ?? product.name}`,
            url: v.priceSourceUrl,
            checkedAt: v.priceCheckedAt,
          });
    }
    try {
      const response = await fetch(new URL('/internal/chat', url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Agent-Token': token },
        body: JSON.stringify({
          message: body.message,
          history: body.history,
          products,
          brands,
          policies,
          truncated: total > products.length,
        }),
        signal: AbortSignal.timeout(11000),
        redirect: 'error',
      });
      if (!response.ok) throw new Error('Agent unavailable');
      const data = (await response.json()) as AgentReply;
      if (
        !['OPENAI', 'CATALOG'].includes(data.mode) ||
        typeof data.text !== 'string' ||
        data.text.length > 5000 ||
        !Array.isArray(data.selection) ||
        data.selection.length > 3 ||
        !Array.isArray(data.sources) ||
        data.sources.length > 30 ||
        !(data.notice === null || typeof data.notice === 'string') ||
        ![null, 'orders', 'collection', 'guide'].includes(data.action)
      )
        throw new Error('Invalid agent response');
      // Đối chiếu ID mẫu và SKU với catalog đã gửi; TypeScript cast AgentReply phía trên không tự validate JSON.
      const selected = data.selection.map((selection) => {
        const product = products.find((p) => p.id === selection.productId);
        if (
          !product ||
          !Array.isArray(selection.variantIds) ||
          !selection.variantIds.length
        )
          throw new Error('Invalid selection');
        const variants = product.variants.filter((v) =>
          selection.variantIds.includes(v.id),
        );
        if (variants.length !== new Set(selection.variantIds).size)
          throw new Error('Unknown variant');
        return { ...product, variants };
      });
      return {
        intent:
          typeof data.intent === 'string' &&
          [
            'search',
            'product',
            'brand',
            'policy',
            'guide',
            'unsupported',
          ].includes(data.intent)
            ? data.intent
            : null,
        modelName:
          data.mode === 'OPENAI' && typeof data.modelName === 'string'
            ? data.modelName.slice(0, 100)
            : null,
        mode: data.mode,
        notice: data.notice,
        text: data.text,
        products: selected,
        sources: [...new Set(data.sources.map((s) => s.url))].flatMap(
          (source) => {
            const allowed = allowedSources.get(source);
            return allowed ? [allowed] : [];
          },
        ),
        action: data.action,
      };
    } catch {
      this.logger.warn({ event: 'assistant_unavailable' });
      this.unavailable();
    }
  }

  /** Tạo lỗi 503 an toàn khi agent/cấu hình/phản hồi không hợp lệ, không lộ token hoặc nội dung provider. */
  private unavailable(): never {
    throw new ServiceUnavailableException({
      code: 'ASSISTANT_UNAVAILABLE',
      message:
        'Trợ lý đang tạm ngừng kết nối. Bạn vẫn có thể xem sản phẩm trong bộ sưu tập; hãy thử chat lại sau.',
    });
  }
}
