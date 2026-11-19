/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/src/Management.tsx
 * Màn hình báo cáo/catalog/tồn/khuyến mãi/kiểm duyệt/audit dùng trong quản trị; thao tác ghi gửi lý do và version.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, date, money, post } from "./api";
import { AdminPanel, Notice } from "./components";
import { Pager } from "./Shopping";
import type { Page, Product, Variant } from "./types";
import type { AdminNavigate, AdminSection } from "./adminNavigation";

/** SKU quản trị bổ sung tồn/trạng thái/version so với dữ liệu catalog công khai. */
interface AdminVariant extends Variant {
  // Tồn thực của SKU; backend thay đổi trong transaction.
  stockQuantity: number;
  // Trạng thái nghiệp vụ của đối tượng; xem enum/DTO tương ứng.
  status: string;
  // Thời điểm cập nhật, còn dùng làm version để chống ghi đè.
  updatedAt: string;
}
/** Mẫu quản trị chứa SKU và version phục vụ chỉnh sửa an toàn. */
interface AdminProduct extends Omit<Product, "variants"> {
  // Trạng thái nghiệp vụ của đối tượng; xem enum/DTO tương ứng.
  status: string;
  // Thời điểm cập nhật, còn dùng làm version để chống ghi đè.
  updatedAt: string;
  // Các phiên bản/SKU thuộc một mẫu.
  variants: AdminVariant[];
}
/** Snapshot báo cáo quản trị nhận từ API, không tự suy doanh thu từ mọi đơn. */
interface Report {
  // Số tài khoản CUSTOMER.
  customers: number;
  // Các mẫu trong catalog hoặc dữ liệu danh mục được tải.
  products: number;
  // Các phiên bản/SKU thuộc một mẫu.
  variants: number;
  // Tổng tồn SKU ACTIVE của mẫu ACTIVE.
  availableUnits: number;
  // Doanh thu demo của đơn COMPLETED và PAID.
  paidRevenueVnd: number;
  // Số đơn hoàn tất đã thanh toán theo báo cáo.
  completedOrders: number;
  // Số ticket OPEN/IN_REVIEW.
  openTickets: number;
  // Mốc tạo báo cáo.
  generatedAt: string;
  note: string;
  orders: { status: string; count: number; totalVnd: number }[];
  // Danh sách SKU sắp hết theo ngưỡng báo cáo.
  lowStock: {
    // Mã SKU duy nhất của phiên bản đồng hồ.
    sku: string;
    // Nhãn hiển thị của lựa chọn/đối tượng.
    label: string;
    // Tồn thực của SKU; backend thay đổi trong transaction.
    stockQuantity: number;
    product: { name: string };
  }[];
  // Các SKU bán nhiều trong đơn hoàn tất đã thanh toán.
  bestSellers: {
    // Mã SKU duy nhất của phiên bản đồng hồ.
    sku: string;
    // Tên đối tượng dùng để hiển thị.
    name: string;
    // Số lượng của dòng hàng; có giới hạn tùy DTO.
    quantity: number;
    // Tổng tiền sản phẩm theo dòng hàng của báo cáo.
    productRevenueVnd: number;
  }[];
}
/** Mã giảm tiền cố định, điều kiện thời gian/lượt dùng. */
interface Promotion {
  // Định danh bản ghi hoặc request để theo dõi/hủy.
  id: string;
  // Mã lỗi hoặc mã khuyến mãi tùy DTO/model.
  code: string;
  // Số tiền giảm cố định theo mã khuyến mãi.
  amountVnd: number;
  // Giá trị tiền hàng tối thiểu để áp mã giảm giá.
  minSubtotalVnd: number;
  // Tổng lượt dùng tối đa của mã.
  maxUses: number;
  // Giới hạn lượt dùng cho mỗi user.
  perUserLimit: number;
  // Cờ đang hoạt động; ý nghĩa cụ thể tùy đối tượng.
  active: boolean;
  // Thời điểm mã bắt đầu hợp lệ.
  startsAt: string;
  // Thời điểm mã hết hiệu lực.
  endsAt: string;
  _count: { uses: number };
}
/** Kiểu Audit mô tả cấu trúc dữ liệu lúc biên dịch; dữ liệu HTTP/IPC vẫn cần kiểm tra khi chạy. */
interface Audit {
  // Định danh bản ghi hoặc request để theo dõi/hủy.
  id: string;
  // Hành động nghiệp vụ/đích điều hướng thuộc danh sách cho phép.
  action: string;
  // ID đối tượng bị thay đổi trong nhật ký.
  targetId: string;
  // Lý do thao tác, được ghi vào lịch sử/audit.
  reason: string;
  // Thời điểm tạo bản ghi.
  createdAt: string;
  actor: { displayName: string } | null;
  // JSON trạng thái trước thay đổi.
  before: unknown;
  // JSON trạng thái sau thay đổi.
  after: unknown;
}
/** Kiểu ManagedReview mô tả cấu trúc dữ liệu lúc biên dịch; dữ liệu HTTP/IPC vẫn cần kiểm tra khi chạy. */
interface ManagedReview {
  // Định danh bản ghi hoặc request để theo dõi/hủy.
  id: string;
  // Điểm đánh giá từ 1 đến 5.
  rating: number;
  // Nội dung tin nhắn/đánh giá hoặc JSON request tùy hợp đồng.
  body: string;
  // Cờ kiểm duyệt; true không xuất hiện ở đánh giá công khai.
  hidden: boolean;
  // Hồ sơ/danh tính hiện tại; quan hệ DB nếu dùng trong Prisma.
  user: { displayName: string };
  product: { name: string };
}
const initialVariant = {
  label: "Phiên bản tiêu chuẩn",
  priceVnd: 1500000,
  stockQuantity: 100,
  status: "ACTIVE",
  movementType: "QUARTZ",
  caseDiameterMm: "38",
  caseMaterial: "Thép không gỉ (demo)",
  crystalMaterial: "Kính khoáng (demo)",
  strapMaterial: "Dây da (demo)",
  waterResistanceM: 30,
  warrantyMonths: 12,
};
const statusLabel: Record<string, string> = {
  DRAFT: "Bản nháp",
  ACTIVE: "Đang kinh doanh",
  DISCONTINUED: "Ngừng kinh doanh",
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};
const blankVariant: AdminVariant = {
  ...initialVariant,
  id: "new",
  sku: "",
  updatedAt: "",
  inStock: true,
  caseDimensionsMm: null,
  priceSourceName: null,
  priceSourceUrl: null,
  priceCheckedAt: null,
};
/** Escape dấu nháy và vô hiệu ký tự mở đầu công thức CSV để dữ liệu không thành công thức khi mở Excel. */
const escapedCell = (v: string | number) =>
  `"${String(v)
    // Tiền tố công thức CSV bị vô hiệu bằng dấu nháy đơn để Excel không thực thi dữ liệu làm công thức.
    .replace(/^[=+\-@\t\r]/, "'$&")
    .replaceAll('"', '""')}"`;
/** Tạo CSV UTF-8 có BOM, dùng Blob URL để tải/lưu rồi thu hồi URL tránh giữ bộ nhớ. */
function exportReport(r: Report) {
  const lines = [
    ["Chỉ số", "Giá trị"],
    ["Doanh thu demo đã thanh toán", r.paidRevenueVnd],
    ["Đơn hoàn tất", r.completedOrders],
    ["Khách hàng", r.customers],
    ["Tồn đang kinh doanh", r.availableUnits],
    ["Yêu cầu chưa xử lý", r.openTickets],
    [],
    ["SKU", "Sản phẩm", "Số lượng đã bán", "Doanh thu sản phẩm"],
    ...r.bestSellers.map((s) => [
      s.sku,
      s.name,
      s.quantity,
      s.productRevenueVnd,
    ]),
  ];
  // Blob URL cho phép tải nội dung đã dựng trong bộ nhớ; revokeObjectURL giải phóng sau khi lưu.
  const url = URL.createObjectURL(
    new Blob(
      ["\ufeff" + lines.map((l) => l.map(escapedCell).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "vnwatch-bao-cao-demo.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Tải dữ liệu theo tab/bộ lọc và cung cấp báo cáo cùng các form quản trị. */
export function Management({
  close,
  admin,
  embedded = false,
  initialTab,
  initialStockView = false,
  onNavigate,
}: {
  // Callback đóng màn hình/component; component cha quyết định state.
  close: () => void;
  // Cờ giao diện quản trị; quyền thật vẫn do backend xác thực.
  admin: boolean;
  // Render trong trang quản trị thay vì modal. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
  embedded?: boolean;
  // Tab quản trị mở ban đầu. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
  initialTab?: string;
  // Bật bộ lọc xem tồn đang bán lúc mở màn hình. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
  initialStockView?: boolean;
  // Callback điều hướng quản trị với bộ lọc. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
  onNavigate?: AdminNavigate;
}) {
  // React state tab: Mục quản trị đang được chọn. setTab yêu cầu React render lại khi giá trị đổi.
  const [tab, setTab] = useState(
      initialTab ?? (admin ? "reports" : "products"),
    ),
    // React state page: Trang hiện tại; đổi bộ lọc cần quay về trang đầu. setPage yêu cầu React render lại khi giá trị đổi.
    [page, setPage] = useState(1),
    // React state search: Từ khóa áp dụng vào truy vấn server. setSearch yêu cầu React render lại khi giá trị đổi.
    [search, setSearch] = useState(""),
    // React state revision: Bộ đếm yêu cầu tải lại dữ liệu sau thay đổi/thử lại. setRevision yêu cầu React render lại khi giá trị đổi.
    [revision, setRevision] = useState(0),
    // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
    [error, setError] = useState(""),
    // React state message: Thông báo kết quả thao tác. setMessage yêu cầu React render lại khi giá trị đổi.
    [message, setMessage] = useState(""),
    // React state busy: Đang thực hiện thao tác để vô hiệu nút gửi lặp. setBusy yêu cầu React render lại khi giá trị đổi.
    [busy, setBusy] = useState(false),
    // React state loading: Đang tải dữ liệu để hiển thị skeleton/thông báo. setLoading yêu cầu React render lại khi giá trị đổi.
    [loading, setLoading] = useState(false);
  // React state products: Danh mục được tải từ API. setProducts yêu cầu React render lại khi giá trị đổi.
  const [products, setProducts] = useState<Page<AdminProduct> | null>(null),
    // React state report: Snapshot thống kê trả về từ backend. setReport yêu cầu React render lại khi giá trị đổi.
    [report, setReport] = useState<Report | null>(null),
    // React state promotions: Trang khuyến mãi hiện tại. setPromotions yêu cầu React render lại khi giá trị đổi.
    [promotions, setPromotions] = useState<Page<Promotion> | null>(null),
    // React state audits: Trang nhật ký hiện tại. setAudits yêu cầu React render lại khi giá trị đổi.
    [audits, setAudits] = useState<Page<Audit> | null>(null),
    // React state reviews: Trang đánh giá hiện tại. setReviews yêu cầu React render lại khi giá trị đổi.
    [reviews, setReviews] = useState<Page<ManagedReview> | null>(null);
  // React state stockView: Bộ lọc xem tồn đang kinh doanh. setStockView yêu cầu React render lại khi giá trị đổi.
  const [stockView, setStockView] = useState(initialStockView);
  // React state selected: Bản ghi đang được chọn để xem/sửa. setSelected yêu cầu React render lại khi giá trị đổi.
  const [selected, setSelected] = useState<AdminProduct | null>(null),
    // React state newProduct: Cờ mở form tạo mẫu mới. setNewProduct yêu cầu React render lại khi giá trị đổi.
    [newProduct, setNewProduct] = useState(false),
    // React state variantId: SKU đang được chọn để xem/sửa hoặc thêm vào đơn. setVariantId yêu cầu React render lại khi giá trị đổi.
    [variantId, setVariantId] = useState("");
  // Tải dữ liệu từ API theo dependency; kết quả cập nhật state, lỗi hiển thị và cleanup hủy lượt cũ nếu có AbortController.
  useEffect(() => {
    // AbortController tạo tín hiệu hủy cho lượt tải này; cleanup ngăn phản hồi cũ tiếp tục cập nhật UI.
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const query = `?page=${page}&limit=10${tab === "products" && search ? `&q=${encodeURIComponent(search)}` : ""}${tab === "products" && stockView ? "&status=ACTIVE" : ""}`;
    /** Chọn API theo tab hiện tại và dùng chung AbortSignal cho lượt tải dữ liệu. */
    const run = async () => {
      if (tab === "reports")
        setReport(
          await api("/management/reports", { signal: controller.signal }),
        );
      else if (tab === "products")
        setProducts(
          await api(`/management/products${query}`, {
            signal: controller.signal,
          }),
        );
      else if (tab === "promotions")
        setPromotions(
          await api(`/management/promotions${query}`, {
            signal: controller.signal,
          }),
        );
      else if (tab === "audit")
        setAudits(
          await api(`/management/audit${query}`, { signal: controller.signal }),
        );
      else
        setReviews(
          await api(`/management/reviews${query}`, {
            signal: controller.signal,
          }),
        );
    };
    run()
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [tab, page, revision, search, stockView]);
  /** Bao thao tác ghi: hiển thị busy/lỗi, tăng revision tải lại và thông báo đã lưu. */
  async function action(run: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await run();
      setRevision((n) => n + 1);
      setMessage("Đã lưu thay đổi và nhật ký thao tác.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  /** Đọc form mẫu, tách ảnh từng dòng và gửi tạo hoặc cập nhật có version/lý do. */
  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    await action(async () => {
      const fields = {
        slug: data.slug,
        name: data.name,
        brand: data.brand,
        category: data.category,
        description: data.description,
        status: data.status,
        reason: data.reason,
        imageUrls: String(data.imageUrls ?? "")
          .split(/\r?\n/)
          .map((v) => v.trim())
          .filter(Boolean),
      };
      if (newProduct) {
        await post("/management/products", {
          ...fields,
          variant: { ...initialVariant, caseDiameterMm: 38, sku: data.sku },
        });
        setNewProduct(false);
      } else if (selected) {
        const result = await api<AdminProduct>(
          `/management/products/${selected.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              ...fields,
              expectedUpdatedAt: selected.updatedAt,
            }),
          },
        );
        setSelected(result);
      }
    });
  }
  /** Chuyển trường số của SKU và gửi version/tồn đang biết để backend chống ghi đè. */
  async function saveVariant(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const v = selected.variants.find((v) => v.id === variantId);
    if (!v && variantId !== "new") return;
    await action(async () => {
      await api(
        v
          ? `/management/variants/${v.id}`
          : `/management/products/${selected.id}/variants`,
        {
          method: v ? "PATCH" : "POST",
          body: JSON.stringify({
            label: data.label,
            priceVnd: Number(data.priceVnd),
            stockQuantity: Number(data.stockQuantity),
            status: data.status,
            movementType: data.movementType,
            caseDiameterMm: data.caseDiameterMm
              ? Number(data.caseDiameterMm)
              : null,
            caseMaterial: data.caseMaterial,
            crystalMaterial: data.crystalMaterial,
            strapMaterial: data.strapMaterial,
            waterResistanceM: Number(data.waterResistanceM),
            warrantyMonths:
              data.warrantyMonths === "" ? null : Number(data.warrantyMonths),
            ...(v
              ? {
                  expectedUpdatedAt: v.updatedAt,
                  expectedStockQuantity: v.stockQuantity,
                }
              : { sku: data.sku }),
            reason: data.reason,
          }),
        },
      );
      setSelected(null);
      setVariantId("");
    });
  }
  /** Yêu cầu ngừng kinh doanh mẫu theo version/lý do, giữ lịch sử thay vì xóa cứng. */
  async function archiveProduct(form: HTMLFormElement) {
    if (!selected) return;
    const reason = String(new FormData(form).get("reason") ?? "").trim();
    if (reason.length < 5) {
      setError("Nhập lý do thay đổi tối thiểu 5 ký tự trước khi xóa.");
      return;
    }
    await action(async () => {
      await api("/management/products/" + selected.id, {
        method: "DELETE",
        body: JSON.stringify({ reason, expectedUpdatedAt: selected.updatedAt }),
      });
      setSelected(null);
      setVariantId("");
    });
  }
  /** Đọc form giảm giá và gửi số tiền/giới hạn/thời gian/lý do tới backend. */
  async function createPromotion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    await action(async () => {
      await post("/management/promotions", {
        code: String(data.code).toUpperCase(),
        amountVnd: Number(data.amountVnd),
        minSubtotalVnd: Number(data.minSubtotalVnd),
        maxUses: Number(data.maxUses),
        perUserLimit: Number(data.perUserLimit),
        startsAt: new Date(String(data.startsAt)).toISOString(),
        endsAt: new Date(String(data.endsAt)).toISOString(),
        reason: data.reason,
      });
      form.reset();
    });
  }
  const variant =
    variantId === "new"
      ? blankVariant
      : selected?.variants.find((v) => v.id === variantId);
  return (
    <AdminPanel
      embedded={embedded}
      title={
        embedded
          ? ((
              {
                reports: "Tổng quan kinh doanh",
                products: stockView ? "Tồn kho đang bán" : "Danh mục sản phẩm",
                promotions: "Quản lý khuyến mãi",
                reviews: "Kiểm duyệt đánh giá",
                audit: "Nhật ký thay đổi",
              } as Record<string, string>
            )[tab] ?? "Quản trị cửa hàng")
          : admin
            ? "Quản trị cửa hàng"
            : "Danh mục & tồn kho"
      }
      close={close}
      wide
    >
      <div className="tabs management-tabs">
        {(admin
          ? [
              ["reports", "Tổng quan"],
              ["products", "Sản phẩm & kho"],
              ["promotions", "Mã giảm giá"],
              ["reviews", "Đánh giá"],
              ["audit", "Nhật ký"],
            ]
          : [["products", "Sản phẩm & kho"]]
        ).map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => {
              setTab(key);
              setPage(1);
              setSelected(null);
              setNewProduct(false);
              setMessage("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      <div className="management-toolbar">
        <button
          className="text-button"
          disabled={busy || loading}
          onClick={() => {
            setSelected(null);
            setRevision((n) => n + 1);
          }}
        >
          Tải lại dữ liệu
        </button>
        <span className="small muted">Dữ liệu kinh doanh demo</span>
      </div>
      {loading ? (
        <p role="status">Đang tải dữ liệu…</p>
      ) : tab === "reports" && report ? (
        <>
          <div className="stat-grid">
            {(
              [
                {
                  label: "Doanh thu đã thu",
                  value: money(report.paidRevenueVnd),
                  section: "orders",
                  params: {
                    status: "COMPLETED",
                    paymentStatus: "PAID",
                    archive: "all",
                  },
                },
                {
                  label: "Đơn hoàn tất",
                  value: report.completedOrders,
                  section: "orders",
                  params: {
                    status: "COMPLETED",
                    paymentStatus: "PAID",
                    archive: "all",
                  },
                },
                {
                  label: "Khách hàng",
                  value: report.customers,
                  section: "users",
                  params: { role: "CUSTOMER" },
                },
                {
                  label: "Mẫu sản phẩm",
                  value: report.products,
                  section: "products",
                },
                {
                  label: "Tồn đang bán",
                  value: report.availableUnits,
                  section: "products",
                  params: { view: "stock" },
                },
                {
                  label: "Yêu cầu đang mở",
                  value: report.openTickets,
                  section: "support",
                  params: { state: "open" },
                },
              ] as {
                // Nhãn hiển thị của lựa chọn/đối tượng.
                label: string;
                value: string | number;
                section: AdminSection;
                params?: Record<string, string>;
              }[]
            ).map(({ label, value, section, params }) =>
              onNavigate ? (
                <button
                  className="stat-card stat-link"
                  key={label}
                  type="button"
                  onClick={() => onNavigate(section, params)}
                >
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <i className="stat-arrow" aria-hidden="true">
                    ↗
                  </i>
                </button>
              ) : (
                <div className="stat-card" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ),
            )}
          </div>
          <p className="small muted">
            {report.note} · Cập nhật {date(report.generatedAt)}
          </p>
          <button className="outline" onClick={() => exportReport(report)}>
            Xuất báo cáo CSV
          </button>
          <div className="feature-grid">
            <section>
              <h3>Trạng thái đơn</h3>
              {report.orders.map((o) => (
                <div className="summary-line" key={o.status}>
                  <span>{statusLabel[o.status]}</span>
                  <strong>
                    {o.count} đơn · {money(o.totalVnd)}
                  </strong>
                </div>
              ))}
            </section>
            <section>
              <h3>Sắp hết hàng (≤ 10)</h3>
              {report.lowStock.length ? (
                report.lowStock.map((v) => (
                  <div className="summary-line" key={v.sku}>
                    <span>
                      {v.product.name}
                      <small className="block muted">{v.sku}</small>
                    </span>
                    <strong>{v.stockQuantity}</strong>
                  </div>
                ))
              ) : (
                <p className="muted">Chưa có phiên bản sắp hết hàng.</p>
              )}
            </section>
          </div>
          <h3>Sản phẩm đã bán nhiều nhất</h3>
          {report.bestSellers.length ? (
            report.bestSellers.map((s) => (
              <div className="summary-line" key={s.sku}>
                <span>
                  {s.name} · {s.sku}
                </span>
                <strong>
                  {s.quantity} chiếc · {money(s.productRevenueVnd)}
                </strong>
              </div>
            ))
          ) : (
            <Notice>Chưa có đơn hoàn tất để thống kê.</Notice>
          )}
        </>
      ) : tab === "products" ? (
        <>
          <div className="management-toolbar">
            <label>
              Danh sách sản phẩm
              <select
                value={stockView ? "stock" : "all"}
                onChange={(e) => {
                  const next = e.target.value === "stock";
                  if (onNavigate)
                    onNavigate("products", next ? { view: "stock" } : {});
                  else {
                    setStockView(next);
                    setPage(1);
                    setSelected(null);
                    setNewProduct(false);
                  }
                }}
              >
                <option value="all">Tất cả sản phẩm</option>
                <option value="stock">Tồn kho đang bán</option>
              </select>
            </label>
            <label>
              Tìm sản phẩm quản trị
              <input
                value={search}
                maxLength={100}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Tên hoặc thương hiệu"
              />
            </label>
            {admin && (
              <button
                className="primary"
                onClick={() => {
                  setSelected(null);
                  setVariantId("");
                  setNewProduct(true);
                }}
              >
                Thêm sản phẩm demo
              </button>
            )}
          </div>
          {(newProduct || selected) && admin ? (
            <>
              <button
                className="text-button"
                onClick={() => {
                  setSelected(null);
                  setNewProduct(false);
                  setVariantId("");
                }}
              >
                ← Danh sách sản phẩm
              </button>
              {!variantId ? (
                <form
                  className="stack"
                  key={selected?.id ?? "new"}
                  onSubmit={saveProduct}
                >
                  <h3>{newProduct ? "Sản phẩm demo mới" : selected?.name}</h3>
                  <div className="feature-grid">
                    <label>
                      Tên sản phẩm
                      <input
                        name="name"
                        defaultValue={selected?.name}
                        required
                        minLength={2}
                        maxLength={200}
                      />
                    </label>
                    <label>
                      Slug
                      <input
                        name="slug"
                        defaultValue={selected?.slug}
                        required
                        pattern="[a-z0-9]+(-[a-z0-9]+)*"
                        maxLength={120}
                      />
                    </label>
                    <label>
                      Thương hiệu
                      <input
                        name="brand"
                        defaultValue={
                          selected?.brand ?? "VNWatch Demo (fictional)"
                        }
                        required
                        minLength={2}
                        maxLength={100}
                      />
                    </label>
                    <label>
                      Danh mục
                      <select
                        name="category"
                        defaultValue={selected?.category ?? "dress"}
                      >
                        <option value="dress">Thanh lịch</option>
                        <option value="sport">Thể thao</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    Mô tả
                    <textarea
                      name="description"
                      defaultValue={selected?.description}
                      minLength={10}
                      maxLength={5000}
                      required
                      rows={3}
                    />
                  </label>
                  <label>
                    URL ảnh HTTPS (mỗi dòng một ảnh, tối đa 5)
                    <textarea
                      name="imageUrls"
                      defaultValue={selected?.imageUrls.join("\n") ?? ""}
                      rows={3}
                      maxLength={10005}
                    />
                  </label>
                  <label>
                    Trạng thái
                    <select
                      name="status"
                      defaultValue={selected?.status ?? "DRAFT"}
                    >
                      {["DRAFT", "ACTIVE", "DISCONTINUED"].map((s) => (
                        <option key={s} value={s}>
                          {statusLabel[s]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {newProduct && (
                    <>
                      <label>
                        SKU phiên bản đầu
                        <input
                          name="sku"
                          required
                          pattern="[A-Za-z0-9_-]{2,64}"
                        />
                      </label>
                      <Notice>
                        SKU mới dùng thông số demo: quartz 38 mm, giá 1.500.000
                        VND, tồn 100, bảo hành demo 12 tháng. Có thể sửa từng
                        thông số sau khi tạo. Không được trình bày mẫu này như
                        sản phẩm thật.
                      </Notice>
                    </>
                  )}
                  <label>
                    Lý do thay đổi
                    <input
                      name="reason"
                      required
                      minLength={5}
                      maxLength={500}
                    />
                  </label>
                  <button className="primary" disabled={busy}>
                    Lưu sản phẩm
                  </button>
                  {selected && selected.status !== "DISCONTINUED" && (
                    <button
                      type="button"
                      className="outline"
                      disabled={busy}
                      onClick={(e) => {
                        if (
                          window.confirm(
                            "Ngừng kinh doanh sản phẩm này? Sản phẩm sẽ ẩn khỏi cửa hàng; lịch sử đơn được giữ. Nhập lý do trước khi xác nhận.",
                          )
                        )
                          void archiveProduct(e.currentTarget.form!);
                      }}
                    >
                      Xóa / ngừng kinh doanh sản phẩm
                    </button>
                  )}
                  {selected?.variants.map((v) => (
                    <article className="feature-card" key={v.id}>
                      <strong>
                        {v.sku} · {v.label}
                      </strong>
                      <p>
                        {money(v.priceVnd)} · Tồn {v.stockQuantity} ·{" "}
                        {statusLabel[v.status]}
                      </p>
                      <button
                        type="button"
                        className="outline"
                        onClick={() => setVariantId(v.id)}
                      >
                        Sửa giá / tồn / thông số
                      </button>
                    </article>
                  ))}
                  {selected && (
                    <button
                      type="button"
                      className="outline"
                      onClick={() => setVariantId("new")}
                    >
                      Thêm phiên bản
                    </button>
                  )}
                </form>
              ) : (
                variant && (
                  <form
                    className="stack"
                    key={variant.id}
                    onSubmit={saveVariant}
                  >
                    <h3>{variant.sku}</h3>
                    {variantId === "new" && (
                      <label>
                        SKU mới
                        <input
                          name="sku"
                          required
                          pattern="[A-Za-z0-9_-]{2,64}"
                        />
                      </label>
                    )}
                    <Notice>
                      Server kiểm tra giá/tồn chưa thay đổi kể từ lúc tải. Nếu
                      có đơn vừa đặt, tải lại trước khi sửa để không ghi đè tồn
                      kho.
                    </Notice>
                    <div className="feature-grid">
                      <label>
                        Nhãn phiên bản
                        <input
                          name="label"
                          defaultValue={variant.label}
                          required
                          maxLength={120}
                        />
                      </label>
                      <label>
                        Giá VND
                        <input
                          name="priceVnd"
                          type="number"
                          min={1}
                          max={2147483647}
                          step={1}
                          defaultValue={variant.priceVnd}
                          required
                        />
                      </label>
                      <label>
                        Tồn kho
                        <input
                          name="stockQuantity"
                          type="number"
                          min={0}
                          max={1000000}
                          step={1}
                          defaultValue={variant.stockQuantity}
                          required
                        />
                      </label>
                      <label>
                        Trạng thái
                        <select name="status" defaultValue={variant.status}>
                          {["DRAFT", "ACTIVE", "DISCONTINUED"].map((s) => (
                            <option key={s} value={s}>
                              {statusLabel[s]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Bộ máy
                        <select
                          name="movementType"
                          defaultValue={variant.movementType}
                        >
                          {["QUARTZ", "AUTOMATIC", "MECHANICAL", "SOLAR"].map(
                            (s) => (
                              <option key={s}>{s}</option>
                            ),
                          )}
                        </select>
                      </label>
                      <label>
                        Đường kính mm (để trống nếu không tròn)
                        <input
                          name="caseDiameterMm"
                          type="number"
                          min={1}
                          max={100}
                          step="0.01"
                          defaultValue={variant.caseDiameterMm ?? ""}
                        />
                      </label>
                      <label>
                        Vỏ
                        <input
                          name="caseMaterial"
                          defaultValue={variant.caseMaterial}
                          required
                          minLength={2}
                          maxLength={100}
                        />
                      </label>
                      <label>
                        Mặt kính
                        <input
                          name="crystalMaterial"
                          defaultValue={variant.crystalMaterial}
                          required
                          minLength={2}
                          maxLength={100}
                        />
                      </label>
                      <label>
                        Dây đeo
                        <input
                          name="strapMaterial"
                          defaultValue={variant.strapMaterial}
                          required
                          minLength={2}
                          maxLength={100}
                        />
                      </label>
                      <label>
                        Chịu nước m
                        <input
                          name="waterResistanceM"
                          type="number"
                          min={0}
                          max={2000}
                          defaultValue={variant.waterResistanceM}
                          required
                        />
                      </label>
                      <label>
                        Bảo hành tháng (trống nếu chưa có)
                        <input
                          name="warrantyMonths"
                          type="number"
                          min={0}
                          max={120}
                          defaultValue={variant.warrantyMonths ?? ""}
                        />
                      </label>
                    </div>
                    <label>
                      Lý do thay đổi
                      <input
                        name="reason"
                        required
                        minLength={5}
                        maxLength={500}
                      />
                    </label>
                    <button className="primary" disabled={busy}>
                      Lưu phiên bản
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setVariantId("")}
                    >
                      Quay lại sản phẩm
                    </button>
                  </form>
                )
              )}
            </>
          ) : (
            <>
              {products?.data.map((p) => (
                <article key={p.id} className="feature-card">
                  <div className="management-toolbar">
                    <div>
                      <h3>{p.name}</h3>
                      <p className="muted small">
                        {p.brand} · {statusLabel[p.status]} ·{" "}
                        {p.dataKind === "DEMO" ? "Demo" : "Dữ liệu tham khảo"}
                      </p>
                    </div>
                    {admin && (
                      <button
                        className="outline"
                        onClick={() => {
                          setSelected(p);
                          setVariantId("");
                          setNewProduct(false);
                        }}
                      >
                        Chỉnh sửa {p.name}
                      </button>
                    )}
                  </div>
                  {p.variants
                    .filter((v) => !stockView || v.status === "ACTIVE")
                    .map((v) => (
                      <div key={v.id} className="summary-line">
                        <span>
                          {v.sku} · {statusLabel[v.status]}
                        </span>
                        <strong>
                          {money(v.priceVnd)} · Tồn {v.stockQuantity}
                        </strong>
                      </div>
                    ))}
                </article>
              ))}
              <Pager meta={products?.meta} change={setPage} />
            </>
          )}
        </>
      ) : tab === "promotions" ? (
        <div className="feature-grid">
          <div className="stack">
            <Notice>
              Mã giảm cố định theo VND, giới hạn theo hệ thống và từng khách.
              Hủy đơn không trả lại lượt mã. Không có mã giả được tự thêm vào dữ
              liệu.
            </Notice>
            {promotions?.data.map((p) => (
              <article className="feature-card" key={p.id}>
                <h3>
                  {p.code} · {money(p.amountVnd)}
                </h3>
                <p className="small">
                  Đơn tối thiểu {money(p.minSubtotalVnd)} · {p._count.uses}/
                  {p.maxUses} lượt · {p.perUserLimit} lượt/khách
                </p>
                <p className="small muted">
                  {date(p.startsAt)} → {date(p.endsAt)}
                </p>
                <form
                  className="stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const d = Object.fromEntries(new FormData(e.currentTarget));
                    void action(async () => {
                      await api(`/management/promotions/${p.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({
                          active: !p.active,
                          reason: d.reason,
                        }),
                      });
                    });
                  }}
                >
                  <label>
                    Lý do bật/tắt
                    <input
                      name="reason"
                      required
                      minLength={5}
                      maxLength={500}
                    />
                  </label>
                  <button className="outline" disabled={busy}>
                    {p.active ? "Tắt mã" : "Bật mã"}
                  </button>
                </form>
              </article>
            ))}
            <Pager meta={promotions?.meta} change={setPage} />
          </div>
          <form className="stack" onSubmit={createPromotion}>
            <h3>Tạo mã giảm giá</h3>
            <label>
              Mã
              <input
                name="code"
                required
                pattern="[A-Za-z0-9_-]{3,32}"
                maxLength={32}
              />
            </label>
            <label>
              Giảm VND
              <input
                name="amountVnd"
                type="number"
                required
                min={1}
                max={100000000}
                step={1}
              />
            </label>
            <label>
              Đơn tối thiểu VND
              <input
                name="minSubtotalVnd"
                type="number"
                required
                min={0}
                max={2147483647}
                step={1}
                defaultValue={0}
              />
            </label>
            <label>
              Tổng lượt
              <input
                name="maxUses"
                type="number"
                required
                min={1}
                max={1000000}
                defaultValue={100}
              />
            </label>
            <label>
              Lượt mỗi tài khoản
              <input
                name="perUserLimit"
                type="number"
                required
                min={1}
                max={100}
                defaultValue={1}
              />
            </label>
            <label>
              Bắt đầu
              <input name="startsAt" type="datetime-local" required />
            </label>
            <label>
              Kết thúc
              <input name="endsAt" type="datetime-local" required />
            </label>
            <label>
              Lý do tạo
              <input name="reason" required minLength={5} maxLength={500} />
            </label>
            <button className="primary" disabled={busy}>
              Tạo mã
            </button>
          </form>
        </div>
      ) : tab === "audit" ? (
        <>
          {audits?.data.map((a) => (
            <details className="feature-card" key={a.id}>
              <summary>
                {a.action} · {a.actor?.displayName ?? "Tài khoản đã xóa"} ·{" "}
                {date(a.createdAt)}
              </summary>
              <p>{a.reason}</p>
              <p className="small muted">Tài nguyên: {a.targetId}</p>
              <div className="feature-grid">
                <div>
                  <strong>Trước</strong>
                  <pre className="audit-json">
                    {JSON.stringify(a.before, null, 2)}
                  </pre>
                </div>
                <div>
                  <strong>Sau</strong>
                  <pre className="audit-json">
                    {JSON.stringify(a.after, null, 2)}
                  </pre>
                </div>
              </div>
            </details>
          ))}
          {!audits?.data.length && <Notice>Chưa có nhật ký thay đổi.</Notice>}
          <Pager meta={audits?.meta} change={setPage} />
        </>
      ) : (
        <>
          {reviews?.data.map((r) => (
            <article className="feature-card" key={r.id}>
              <h3>
                {r.product.name} · {r.rating}/5
              </h3>
              <p>
                {r.user.displayName} · {r.hidden ? "Đang ẩn" : "Đang hiển thị"}
              </p>
              <p className="user-text">{r.body}</p>
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  const d = Object.fromEntries(new FormData(e.currentTarget));
                  void action(async () => {
                    await api(`/management/reviews/${r.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({
                        hidden: !r.hidden,
                        reason: d.reason,
                      }),
                    });
                  });
                }}
              >
                <label>
                  Lý do kiểm duyệt
                  <input name="reason" required minLength={5} maxLength={500} />
                </label>
                <button className="outline" disabled={busy}>
                  {r.hidden ? "Hiện đánh giá" : "Ẩn đánh giá"}
                </button>
              </form>
            </article>
          ))}
          {!reviews?.data.length && (
            <Notice>Chưa có đánh giá từ khách đã mua.</Notice>
          )}
          <Pager meta={reviews?.meta} change={setPage} />
        </>
      )}
    </AdminPanel>
  );
}
