/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/src/Product.tsx
 * Chi tiết mẫu, lựa chọn SKU và giỏ hàng. Dữ liệu hiển thị được tải lại từ API; tồn hiển thị không giữ chỗ.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { useEffect, useState } from "react";
import { api, money } from "./api";
import { Modal, Notice, ProductImage, caseSize } from "./components";
import type { CartItem, Product, Variant } from "./types";
import { Reviews } from "./Shopping";

/** Tải mẫu theo ID, chọn SKU, hiển thị thông số/nguồn/đánh giá và giao callback thêm giỏ cho App. */
export function ProductDetail({
  id,
  signedIn,
  preferredVariantId,
  login,
  close,
  add,
}: {
  // Định danh bản ghi hoặc request để theo dõi/hủy.
  id: string;
  signedIn: boolean;
  preferredVariantId: string;
  login: () => void;
  // Callback đóng màn hình/component; component cha quyết định state.
  close: () => void;
  add: (p: Product, v: Variant) => Promise<boolean>;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  // React state variantId: SKU đang được chọn để xem/sửa hoặc thêm vào đơn. setVariantId yêu cầu React render lại khi giá trị đổi.
  const [variantId, setVariantId] = useState("");
  // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
  const [error, setError] = useState("");
  // React state revision: Bộ đếm yêu cầu tải lại dữ liệu sau thay đổi/thử lại. setRevision yêu cầu React render lại khi giá trị đổi.
  const [revision, setRevision] = useState(0);
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);
  // Tải dữ liệu từ API theo dependency; kết quả cập nhật state, lỗi hiển thị và cleanup hủy lượt cũ nếu có AbortController.
  useEffect(() => {
    // AbortController tạo tín hiệu hủy cho lượt tải này; cleanup ngăn phản hồi cũ tiếp tục cập nhật UI.
    const controller = new AbortController();
    setError("");
    api<Product>(`/products/${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
      .then((p) => {
        setProduct(p);
        setVariantId(
          p.variants.find((v) => v.id === preferredVariantId)?.id ??
            p.variants.find((v) => v.inStock)?.id ??
            p.variants[0]?.id ??
            "",
        );
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [id, revision, preferredVariantId]);
  useEffect(() => {
    const previousTitle = document.title;
    document.title = product
      ? `${product.name} | VNWatch`
      : "Chi tiết đồng hồ | VNWatch";
    return () => {
      document.title = previousTitle;
    };
  }, [product]);
  const variant = product?.variants.find((v) => v.id === variantId);
  return (
    <section
      className="product-page section"
      aria-labelledby="product-page-title"
    >
      <nav className="product-breadcrumb" aria-label="Đường dẫn sản phẩm">
        <a
          href="/#collection"
          onClick={(event) => {
            if (
              event.button === 0 &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.shiftKey &&
              !event.altKey
            ) {
              event.preventDefault();
              close();
            }
          }}
        >
          ← Bộ sưu tập
        </a>
        <span aria-hidden="true">/</span>
        <span>{product?.brand ?? "Đồng hồ"}</span>
      </nav>
      <h1 id="product-page-title">{product?.name ?? "Chi tiết đồng hồ"}</h1>
      {error ? (
        <>
          <Notice error>{error}</Notice>
          <button className="outline" onClick={() => setRevision((x) => x + 1)}>
            Thử lại
          </button>
        </>
      ) : !product ? (
        <p role="status">Đang tải sản phẩm…</p>
      ) : (
        <div className="detail-grid">
          <div className="detail-visual">
            <ProductImage
              product={product}
              eager
              dark={variant?.movementType === "AUTOMATIC"}
            />
          </div>
          <div className="stack">
            <span className="eyebrow">{product.brand}</span>
            <p>{product.description}</p>
            <label>
              Phiên bản
              <select
                disabled={adding}
                value={variantId}
                onChange={(e) => {
                  setVariantId(e.target.value);
                  setAdded(false);
                }}
              >
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} — {money(v.priceVnd)}
                    {v.inStock
                      ? ""
                      : product.dataKind === "REFERENCE"
                        ? " · Chưa mở bán"
                        : " · Hết hàng"}
                  </option>
                ))}
              </select>
            </label>
            {variant && (
              <>
                <strong className="price large">
                  {money(variant.priceVnd)}
                </strong>
                {product.dataKind === "REFERENCE" && (
                  <p className="reference-price">
                    Giá tham khảo tại{" "}
                    {variant.priceSourceName ?? "nguồn bên ngoài"}
                  </p>
                )}
                <span className={`stock ${variant.inStock ? "" : "out"}`}>
                  {variant.inStock
                    ? "● Còn hàng"
                    : product.dataKind === "REFERENCE"
                      ? "○ Chưa mở bán tại VNWatch"
                      : "○ Tạm hết hàng"}
                </span>
                <button
                  className="primary"
                  disabled={!variant.inStock || adding}
                  onClick={async () => {
                    setAdding(true);
                    try {
                      setAdded(await add(product, variant));
                    } finally {
                      setAdding(false);
                    }
                  }}
                >
                  {adding ? "Đang kiểm tra…" : "Thêm vào giỏ hàng"}
                </button>
                {!signedIn && (
                  <p className="muted small">
                    Đăng nhập để thêm vào giỏ hàng và đặt mua sản phẩm.
                  </p>
                )}
                {added && (
                  <Notice>
                    Đã thêm vào giỏ hàng. Bấm biểu tượng giỏ hàng để xem và đặt
                    mua.
                  </Notice>
                )}
                <dl className="specs">
                  {[
                    ["SKU", variant.sku],
                    [
                      "Bộ máy",
                      variant.movementType === "QUARTZ"
                        ? "Quartz"
                        : variant.movementType,
                    ],
                    [
                      variant.caseDimensionsMm ? "Kích thước vỏ" : "Đường kính",
                      caseSize(variant),
                    ],
                    ["Chất liệu vỏ", variant.caseMaterial],
                    ["Mặt kính", variant.crystalMaterial],
                    ["Dây đeo", variant.strapMaterial],
                    ["Chịu nước", `${variant.waterResistanceM} m`],
                    [
                      "Bảo hành VNWatch",
                      variant.warrantyMonths === null
                        ? "Chưa thiết lập chính sách"
                        : `${variant.warrantyMonths} tháng`,
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                {product.dataKind === "REFERENCE" && (
                  <div className="source-note">
                    <strong>Nguồn dữ liệu sản phẩm</strong>
                    <a
                      href={product.sourceUrl ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Thông số: {product.sourceName} ↗
                    </a>
                    <a
                      href={product.imageSourceUrl ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Nguồn ảnh sản phẩm ↗
                    </a>
                    <a
                      href={variant.priceSourceUrl ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Giá tham khảo: {variant.priceSourceName} ↗
                    </a>
                    <p>
                      Kiểm tra nguồn:{" "}
                      {variant.priceCheckedAt
                        ? new Date(variant.priceCheckedAt).toLocaleDateString(
                            "vi-VN",
                          )
                        : "Chưa có ngày"}
                      . Giá và tồn kho được dùng để thử đặt COD trong bản demo;
                      tồn kho giả lập khởi tạo 100 mỗi phiên bản. Chính sách bảo
                      hành thực tế chưa được thiết lập.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {product && !error && (
        <Reviews id={product.id} signedIn={signedIn} login={login} />
      )}
    </section>
  );
}

/** Tải dữ liệu mẫu tương ứng dòng giỏ để hiện giá/khả dụng; chuyển mua hàng qua Checkout để server tái kiểm tra. */
export function Cart({
  items,
  busy,
  change,
  close,
  checkout,
}: {
  // Các dòng SKU/số lượng hoặc snapshot đơn.
  items: CartItem[];
  busy: boolean;
  // Callback cập nhật lựa chọn/trang.
  change: (id: string, quantity: number) => void;
  // Callback đóng màn hình/component; component cha quyết định state.
  close: () => void;
  checkout: () => void;
}) {
  // React state products: Danh mục được tải từ API. setProducts yêu cầu React render lại khi giá trị đổi.
  const [products, setProducts] = useState<Product[]>([]);
  // React state loading: Đang tải dữ liệu để hiển thị skeleton/thông báo. setLoading yêu cầu React render lại khi giá trị đổi.
  const [loading, setLoading] = useState(true);
  // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
  const [error, setError] = useState("");
  // React state revision: Bộ đếm yêu cầu tải lại dữ liệu sau thay đổi/thử lại. setRevision yêu cầu React render lại khi giá trị đổi.
  const [revision, setRevision] = useState(0);
  // Changes in quantity do not trigger a fetch; opening the cart refreshes prices and availability.
  const ids = [...new Set(items.map((i) => i.productId))].sort().join(",");
  // Tải dữ liệu từ API theo dependency; kết quả cập nhật state, lỗi hiển thị và cleanup hủy lượt cũ nếu có AbortController.
  useEffect(() => {
    // AbortController tạo tín hiệu hủy cho lượt tải này; cleanup ngăn phản hồi cũ tiếp tục cập nhật UI.
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all(
      ids
        ? ids.split(",").map((id) =>
            api<Product>(`/products/${encodeURIComponent(id)}`, {
              signal: controller.signal,
            }).catch((e) => {
              if (e.status === 404) return null;
              throw e;
            }),
          )
        : [],
    )
      .then((result) =>
        setProducts(result.filter((p): p is Product => p !== null)),
      )
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [ids, revision]);
  const total = items.reduce(
    (sum, item) =>
      sum +
      (products
        .find((p) => p.id === item.productId)
        ?.variants.find((v) => v.id === item.variantId)?.priceVnd ?? 0) *
        item.quantity,
    0,
  );
  return (
    <Modal
      title={`Giỏ hàng (${items.reduce((s, i) => s + i.quantity, 0)})`}
      close={close}
      wide
    >
      {!items.length ? (
        <div className="empty">
          <span>↗</span>
          <h3>Giỏ hàng đang trống</h3>
          <p>Chọn một chiếc đồng hồ mang dấu ấn của bạn.</p>
          <button className="primary" onClick={close}>
            Khám phá bộ sưu tập
          </button>
        </div>
      ) : loading ? (
        <p role="status">Đang cập nhật giá và tình trạng sản phẩm…</p>
      ) : error ? (
        <>
          <Notice error>{error}</Notice>
          <button className="outline" onClick={() => setRevision((x) => x + 1)}>
            Thử lại
          </button>
        </>
      ) : (
        <>
          {items.map((item) => {
            const p = products.find((p) => p.id === item.productId);
            const v = p?.variants.find((v) => v.id === item.variantId);
            return (
              <div className="cart-row" key={item.variantId}>
                <div className="cart-watch">
                  {p && (
                    <ProductImage
                      product={p}
                      dark={v?.movementType === "AUTOMATIC"}
                    />
                  )}
                </div>
                <div className="cart-info">
                  <strong>{p?.name ?? "Sản phẩm không còn kinh doanh"}</strong>
                  <p className="muted small">
                    {v?.label ?? "Biến thể không khả dụng"}
                  </p>
                  {v && <p className="price">{money(v.priceVnd)}</p>}
                  {!v?.inStock && (
                    <span className="out small">Hiện không thể đặt mua</span>
                  )}
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => change(item.variantId, 0)}
                  >
                    Xóa
                  </button>
                </div>
                <div className="quantity">
                  <button
                    aria-label={`Giảm số lượng ${p?.name ?? ""}`}
                    disabled={busy}
                    onClick={() => change(item.variantId, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    aria-label={`Tăng số lượng ${p?.name ?? ""}`}
                    disabled={busy || item.quantity >= 99 || !v?.inStock}
                    onClick={() => change(item.variantId, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
          <div className="cart-total">
            <span>Tạm tính</span>
            <strong>{money(total)}</strong>
          </div>
          <p className="muted small">
            Giỏ hàng được lưu riêng theo tài khoản trên server. Giá và tồn kho
            được kiểm tra lại khi đặt hàng; thêm giỏ chưa giữ chỗ sản phẩm.
          </p>
          <Notice>
            Đặt hàng COD trong hệ thống demo. Phí giao hàng và tổng tiền sẽ được
            hiển thị ở bước xác nhận. Cần đăng nhập trước khi đặt hàng.
          </Notice>
          <button
            className="primary full"
            disabled={
              busy ||
              items.some(
                (item) =>
                  !products
                    .find((p) => p.id === item.productId)
                    ?.variants.find((v) => v.id === item.variantId)?.inStock,
              )
            }
            onClick={checkout}
          >
            Tiến hành đặt hàng
          </button>
        </>
      )}
    </Modal>
  );
}
