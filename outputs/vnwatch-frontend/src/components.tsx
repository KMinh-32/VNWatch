/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/src/components.tsx
 * Component dùng chung: icon, ảnh sản phẩm, hình minh họa, modal và thông báo; quản lý focus và tải ảnh.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Product, Variant } from "./types";

/** Ở chế độ embedded render section trong trang quản trị, còn lại dùng Modal. */
export function AdminPanel({
  embedded = false,
  ...props
}: Parameters<typeof Modal>[0] & { embedded?: boolean }) {
  return embedded ? (
    <section className="admin-panel">
      <h2>{props.title}</h2>
      {props.children}
    </section>
  ) : (
    <Modal {...props} />
  );
}

/** Ưu tiên kích thước đầy đủ, nếu không thì đường kính; null không được biến thành thông số giả. */
export function caseSize(variant?: Variant) {
  if (!variant) return "Chưa có kích thước";
  return (
    variant.caseDimensionsMm ??
    (variant.caseDiameterMm
      ? `${Number(variant.caseDiameterMm)} mm`
      : "Chưa có kích thước")
  );
}

/** Tải ảnh khi gần viewport; ảnh lỗi/thời gian chờ thì thử ảnh kế tiếp, DEMO thiếu ảnh mới dùng hình minh họa. */
export function ProductImage({
  product,
  dark = false,
  eager = false,
}: {
  product: Product;
  dark?: boolean;
  eager?: boolean;
}) {
  // React state index: Chỉ số ảnh đang thử trong danh sách URL. setIndex yêu cầu React render lại khi giá trị đổi.
  const [index, setIndex] = useState(0);
  // React state loadedSrc: URL ảnh đã tải xong, dùng để bỏ chỉ báo chờ. setLoadedSrc yêu cầu React render lại khi giá trị đổi.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  // useRef giữ giá trị/DOM giữa các lần render; đổi .current không tự làm component render lại.
  const image = useRef<HTMLImageElement>(null);
  // React state visible: Ảnh đã gần vùng nhìn để bắt đầu tải. setVisible yêu cầu React render lại khi giá trị đổi.
  const [visible, setVisible] = useState(eager);
  const src = product.imageUrls[index];
  // Đồng bộ tác vụ ngoài render với state/props; dependency bên dưới quyết định lúc effect chạy lại.
  useEffect(() => setIndex(0), [product.id]);
  // Quan sát ảnh gần viewport để tải đúng lúc; disconnect khi không còn cần quan sát.
  useEffect(() => {
    if (eager || !image.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "250px" },
    );
    observer.observe(image.current);
    return () => observer.disconnect();
  }, [eager, src]);
  // Effect quản lý timer của màn hình; cleanup giải phóng timer khi dữ liệu đổi hoặc component bị tháo.
  useEffect(() => {
    if (!(eager || visible) || !src) return;
    const timer = setTimeout(() => {
      if (image.current?.complete && image.current.naturalWidth > 0) return;
      setIndex((i) => i + 1);
    }, 8000);
    return () => clearTimeout(timer);
  }, [eager, visible, src, product.dataKind]);
  if (product.dataKind === "DEMO" && !product.imageUrls.length)
    return (
      <>
        <Watch dark={dark} />
        <span className="image-caption">HÌNH MINH HỌA</span>
      </>
    );
  return src ? (
    <>
      <img
        ref={image}
        className="product-photo"
        src={src}
        alt={product.name}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setIndex((i) => i + 1)}
        onLoad={() => setLoadedSrc(src)}
      />
      {loadedSrc !== src && (
        <span className="photo-loading" role="status">
          Đang tải ảnh…
        </span>
      )}
    </>
  ) : (
    <div
      className="photo-unavailable"
      role="img"
      aria-label={`Ảnh ${product.name} chưa tải được`}
    >
      <span>VNW</span>
      <p>Ảnh chưa tải được</p>
    </div>
  );
}

/** Render icon SVG theo tên để dùng nhất quán trong nút và điều hướng. */
export function Icon({
  name,
}: {
  // Tên đối tượng dùng để hiển thị.
  name: "bag" | "user" | "search" | "arrow" | "close" | "chat";
}) {
  const paths = {
    bag: "M5 7h14l1 14H4L5 7Zm3 0V5a4 4 0 0 1 8 0v2",
    user: "M20 21v-2a8 8 0 0 0-16 0v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
    search: "m21 21-5-5M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z",
    arrow: "M4 12h16m-6-6 6 6-6 6",
    close: "m6 6 12 12M6 18 18 6",
    chat: "M21 11a8 8 0 0 1-8 8H6l-4 3V11a9 9 0 0 1 19 0ZM7 10h10M7 14h6",
  };
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

// Original vector illustration: never presented as a photograph of real stock.
/** Vẽ đồng hồ minh họa bằng cấu trúc giao diện; không phải ảnh sản phẩm thật. */
export function Watch({
  dark = false,
  hero = false,
}: {
  dark?: boolean;
  hero?: boolean;
}) {
  return (
    <svg
      className={`watch ${hero ? "hero-watch" : ""}`}
      viewBox="0 0 300 440"
      role="img"
      aria-label="Hình minh họa đồng hồ VNWatch"
    >
      <rect
        x="104"
        y="4"
        width="92"
        height="432"
        rx="30"
        fill={dark ? "#352c25" : "#5c4836"}
      />
      <rect
        x="113"
        y="7"
        width="74"
        height="426"
        rx="23"
        fill="none"
        stroke="#bca183"
        strokeDasharray="3 4"
        opacity=".45"
      />
      <path
        d="M108 126V97h84v29M108 314v29h84v-29"
        stroke="#c7bda8"
        strokeWidth="12"
        fill="none"
      />
      <rect x="250" y="207" width="15" height="26" rx="4" fill="#b8ab92" />
      <circle cx="150" cy="220" r="110" fill="#665b4d" />
      <circle cx="150" cy="220" r="105" fill="#d3c8b3" />
      <circle cx="150" cy="220" r="99" fill="#8e8576" />
      <circle cx="150" cy="220" r="95" fill={dark ? "#1d3c34" : "#eeeade"} />
      <circle
        cx="150"
        cy="220"
        r="87"
        fill="none"
        stroke={dark ? "#b8ad91" : "#93836a"}
        strokeWidth=".7"
        opacity=".5"
      />
      {Array.from({ length: 60 }, (_, i) => (
        <line
          key={i}
          x1="150"
          y1="136"
          x2="150"
          y2={i % 5 === 0 ? 148 : 140}
          transform={`rotate(${i * 6} 150 220)`}
          stroke={dark ? "#d6c9a6" : "#726955"}
          strokeWidth={i % 5 === 0 ? 2.4 : 0.8}
        />
      ))}
      <text
        x="150"
        y="185"
        textAnchor="middle"
        fill={dark ? "#eee4cb" : "#3b4037"}
        fontFamily="Georgia,serif"
        fontSize="12"
        letterSpacing="2"
      >
        VNWATCH
      </text>
      <text
        x="150"
        y="267"
        textAnchor="middle"
        fill={dark ? "#b3bfb2" : "#858276"}
        fontFamily="sans-serif"
        fontSize="7"
        letterSpacing="2"
      >
        TIMELESS
      </text>
      <path
        d="m150 220-43-37M150 220l52-49"
        fill="none"
        stroke={dark ? "#e5d4ae" : "#353e35"}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="m150 235 0-89"
        stroke="#b98451"
        strokeWidth="1.2"
        transform="rotate(150 150 220)"
      />
      <circle cx="150" cy="220" r="5" fill="#b79260" />
    </svg>
  );
}

/** Cửa sổ phủ: quản lý focus, phím Escape, vòng Tab và khóa cuộn để có thể dùng bàn phím. */
export function Modal({
  title,
  close,
  children,
  wide = false,
}: {
  // Tiêu đề hiển thị.
  title: string;
  // Callback đóng màn hình/component; component cha quyết định state.
  close: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  // useRef giữ giá trị/DOM giữa các lần render; đổi .current không tự làm component render lại.
  const ref = useRef<HTMLDialogElement>(null);
  // Đưa focus/cuộn về mục vừa mở để điều hướng bằng click, Back/Forward và bàn phím có cùng kết quả. Mảng []: chạy khi mount, cleanup khi unmount.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            close();
        }
      }}
      aria-label={title}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" onClick={close} aria-label="Đóng">
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
/** Hiển thị thông báo thường/lỗi bằng lớp CSS và role phù hợp. */
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      className={`notice ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
