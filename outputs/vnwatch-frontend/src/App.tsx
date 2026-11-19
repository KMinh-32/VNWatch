/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/src/App.tsx
 * Component gốc cửa hàng: giữ phiên ở bộ nhớ, bộ lọc catalog, giỏ/yêu thích và màn hình phủ cho các chức năng.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { api, money, setToken } from "./api";
import { Account, Auth } from "./Account";
import { Icon, Modal, Notice, ProductImage, caseSize } from "./components";
import { Cart, ProductDetail } from "./Product";
import { Checkout, Orders } from "./Orders";
import { Assistant } from "./Assistant";
import {
  Addresses,
  Comparison,
  Favorites,
  Information,
  Support,
  Warranties,
} from "./Shopping";
import type {
  CartItem,
  Favorite,
  Page,
  Product,
  User,
  Variant,
  Order,
  WarrantyCard,
} from "./types";

/** Danh sách màn hình yêu cầu đăng nhập trên cửa hàng. */
type PrivateView =
  | "cart"
  | "checkout"
  | "orders"
  | "favorites"
  | "addresses"
  | "warranties"
  | "support";

function movementName(value?: string) {
  const names: Record<string, string> = {
    AUTOMATIC: "Máy cơ tự động",
    QUARTZ: "Máy quartz",
    MECHANICAL: "Cơ lên cót tay",
    SOLAR: "Năng lượng ánh sáng",
  };
  return names[value ?? ""] ?? "Đồng hồ";
}

/** Đọc trang /products/:id và các liên kết product cũ để hỗ trợ mở trực tiếp, Back/Forward. */
function getProductId() {
  const route = /^\/products\/([^/]+)\/?$/.exec(window.location.pathname);
  return (
    route?.[1] ?? new URLSearchParams(window.location.search).get("product")
  );
}
/** Phối hợp state cửa hàng, các effect tải dữ liệu và callback mở/đóng từng màn hình. */
export default function App() {
  // React state user: Hồ sơ đăng nhập hiện tại; null là chưa đăng nhập. setUser yêu cầu React render lại khi giá trị đổi.
  const [user, setUser] = useState<User | null>(null);
  // React state overlay: Màn hình phủ đang mở; null nghĩa không có modal. setOverlay yêu cầu React render lại khi giá trị đổi.
  const [overlay, setOverlay] = useState<
    | "auth"
    | "account"
    | "cart"
    | "checkout"
    | "orders"
    | "assistant"
    | "favorites"
    | "addresses"
    | "warranties"
    | "support"
    | "compare"
    | "information"
    | null
  >(null);
  // React state afterLogin: Đích riêng tư cần mở lại sau khi user đăng nhập. setAfterLogin yêu cầu React render lại khi giá trị đổi.
  const [afterLogin, setAfterLogin] = useState<PrivateView | null>(null);
  // React state preferredVariantId: SKU ưu tiên khi mở chi tiết. setPreferredVariantId yêu cầu React render lại khi giá trị đổi.
  const [preferredVariantId, setPreferredVariantId] = useState("");
  // Revision nhận diện đời phiên: tăng khi đăng xuất/hết phiên để bỏ qua phản hồi của tài khoản trước.
  const sessionRevision = useRef(0);
  // React state placedOrder: Đơn vừa tạo để mở ngay màn hình kết quả. setPlacedOrder yêu cầu React render lại khi giá trị đổi.
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  // React state productId: Mẫu đang mở ở chi tiết, đồng bộ với URL. setProductId yêu cầu React render lại khi giá trị đổi.
  const [productId, setProductId] = useState<string | null>(getProductId);
  useEffect(() => {
    const url = new URL(window.location.href);
    const legacy = url.searchParams.get("product");
    if (legacy && !url.pathname.startsWith("/products/")) {
      url.pathname = `/products/${encodeURIComponent(legacy)}`;
      url.searchParams.delete("product");
      url.hash = "";
      window.history.replaceState(window.history.state, "", url);
    }
  }, []);
  // React state cart: Giỏ đã được server xác nhận của user hiện tại. setCart yêu cầu React render lại khi giá trị đổi.
  const [cart, setCart] = useState<CartItem[]>([]);
  // React state favorites: Danh sách yêu thích thuộc user. setFavorites yêu cầu React render lại khi giá trị đổi.
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  // React state compareIds: Các mẫu đang được chọn so sánh, tối đa ba. setCompareIds yêu cầu React render lại khi giá trị đổi.
  const [compareIds, setCompareIds] = useState<string[]>([]);
  // React state accountLoading: Đang tải lại dữ liệu cá nhân. setAccountLoading yêu cầu React render lại khi giá trị đổi.
  const [accountLoading, setAccountLoading] = useState(false);
  // React state accountError: Lỗi tải dữ liệu cá nhân. setAccountError yêu cầu React render lại khi giá trị đổi.
  const [accountError, setAccountError] = useState("");
  // React state cartBusy: Đang cập nhật giỏ; chặn thao tác số lượng chồng nhau. setCartBusy yêu cầu React render lại khi giá trị đổi.
  const [cartBusy, setCartBusy] = useState(false);
  // React state supportCard: Thẻ bảo hành đang được chọn để mở yêu cầu hỗ trợ. setSupportCard yêu cầu React render lại khi giá trị đổi.
  const [supportCard, setSupportCard] = useState<WarrantyCard | null>(null);
  // React state query: Chuỗi user đang gõ; có thể được debounce trước khi gọi API. setQuery yêu cầu React render lại khi giá trị đổi.
  const [query, setQuery] = useState("");
  // React state search: Từ khóa áp dụng vào truy vấn server. setSearch yêu cầu React render lại khi giá trị đổi.
  const [search, setSearch] = useState("");
  // React state category: Bộ lọc nhóm sản phẩm. setCategory yêu cầu React render lại khi giá trị đổi.
  const [category, setCategory] = useState("");
  // Cửa hàng và trợ lý cùng sử dụng catalog sản phẩm thật.
  const dataKind = "REFERENCE";
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("catalog") === "demo") {
      url.searchParams.delete("catalog");
      window.history.replaceState({}, "", url);
    }
  }, []);
  // React state brand: Bộ lọc thương hiệu. setBrand yêu cầu React render lại khi giá trị đổi.
  const [brand, setBrand] = useState("");
  const [strap, setStrap] = useState("");
  const [crystal, setCrystal] = useState("");
  const [diameter, setDiameter] = useState("");
  const [facets, setFacets] = useState<{
    brands: string[];
    strapMaterials: string[];
    crystalMaterials: string[];
  }>({ brands: [], strapMaterials: [], crystalMaterials: [] });
  const [facetError, setFacetError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    setFacetError("");
    api<typeof facets>(`/products/facets?dataKind=${dataKind}`, {
      signal: abort.signal,
    })
      .then(setFacets)
      .catch(() => {
        if (!abort.signal.aborted)
          setFacetError(
            "Chưa tải được danh sách bộ lọc. Bạn vẫn có thể tìm theo tên.",
          );
      });
    return () => abort.abort();
  }, [dataKind]);
  // React state budget: Khoảng ngân sách được mã hóa cho query. setBudget yêu cầu React render lại khi giá trị đổi.
  const [budget, setBudget] = useState("");
  // React state sort: Thứ tự sắp xếp catalog. setSort yêu cầu React render lại khi giá trị đổi.
  const [sort, setSort] = useState("newest");
  // React state movement: Bộ lọc loại máy. setMovement yêu cầu React render lại khi giá trị đổi.
  const [movement, setMovement] = useState("");
  // React state availability: Bộ lọc còn hàng/hết hàng. setAvailability yêu cầu React render lại khi giá trị đổi.
  const [availability, setAvailability] = useState("");
  // React state page: Trang hiện tại; đổi bộ lọc cần quay về trang đầu. setPage yêu cầu React render lại khi giá trị đổi.
  const [page, setPage] = useState(1);
  // React state result: Trang catalog mới nhất đã tải; null khi chưa có dữ liệu. setResult yêu cầu React render lại khi giá trị đổi.
  const [result, setResult] = useState<Page<Product> | null>(null);
  // React state loading: Đang tải dữ liệu để hiển thị skeleton/thông báo. setLoading yêu cầu React render lại khi giá trị đổi.
  const [loading, setLoading] = useState(true);
  // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
  const [error, setError] = useState("");
  // React state revision: Bộ đếm yêu cầu tải lại dữ liệu sau thay đổi/thử lại. setRevision yêu cầu React render lại khi giá trị đổi.
  const [revision, setRevision] = useState(0);
  // React state toast: Thông báo ngắn được tự xóa bằng timer. setToast yêu cầu React render lại khi giá trị đổi.
  const [toast, setToast] = useState("");
  // useRef giữ giá trị/DOM giữa các lần render; đổi .current không tự làm component render lại.
  const searchRef = useRef<HTMLInputElement>(null);
  // Debounce: chờ user ngừng gõ trước khi truy vấn; cleanup hủy timer/lượt tải cũ.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  // Đồng bộ tác vụ ngoài render với state/props; dependency bên dưới quyết định lúc effect chạy lại.
  useEffect(() => {
    if (user) void syncAccount();
    else {
      setCart([]);
      setFavorites([]);
      setAccountError("");
    }
    // Account data must be replaced when identity changes, never shared across accounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  // Effect quản lý timer của màn hình; cleanup giải phóng timer khi dữ liệu đổi hoặc component bị tháo.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  // Đăng ký sự kiện khi component tồn tại; cleanup removeEventListener để tránh handler trùng sau render/mount lại. Mảng []: chạy khi mount, cleanup khi unmount.
  useEffect(() => {
    /** Xóa dữ liệu cá nhân đang hiển thị và mở đăng nhập khi backend báo phiên không còn hợp lệ. */
    const expired = () => {
      sessionRevision.current += 1;
      setUser(null);
      setCart([]);
      setFavorites([]);
      setAfterLogin(null);
      setOverlay("auth");
      setToast("Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.");
    };
    /** Đồng bộ productId theo URL khi trình duyệt quay lại/tiến lên. */
    const pop = () => {
      setProductId(getProductId());
      setOverlay(null);
      setPreferredVariantId("");
      const scroll = window.history.state?.vnwatchScroll ?? 0;
      window.requestAnimationFrame(() => window.scrollTo(0, scroll));
    };
    window.addEventListener("session-expired", expired);
    window.addEventListener("popstate", pop);
    return () => {
      window.removeEventListener("session-expired", expired);
      window.removeEventListener("popstate", pop);
    };
  }, []);
  // Tải dữ liệu từ API theo dependency; kết quả cập nhật state, lỗi hiển thị và cleanup hủy lượt cũ nếu có AbortController.
  useEffect(() => {
    // AbortController tạo tín hiệu hủy cho lượt tải này; cleanup ngăn phản hồi cũ tiếp tục cập nhật UI.
    const controller = new AbortController();
    setLoading(true);
    setError("");
    // Mã hóa query an toàn và để backend lọc toàn bộ catalog trước khi phân trang.
    const params = new URLSearchParams({
      page: String(page),
      limit: "15",
      sort,
      dataKind,
    });
    if (search) params.set("q", search);
    if (category) params.set("category", category);
    if (brand) params.set("brand", brand);
    if (strap) params.set("strapMaterial", strap);
    if (crystal) params.set("crystalMaterial", crystal);
    if (diameter) {
      const [min, max] = diameter.split(":");
      if (min) params.set("minDiameterMm", min);
      if (max) params.set("maxDiameterMm", max);
    }
    if (movement) params.set("movementType", movement);
    if (availability) params.set("inStock", availability);
    if (budget) {
      const [min, max] = budget.split(":");
      params.set("minPriceVnd", min);
      if (max) params.set("maxPriceVnd", max);
    }
    api<Page<Product>>(`/products?${params}`, { signal: controller.signal })
      .then(setResult)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    search,
    category,
    budget,
    sort,
    page,
    revision,
    dataKind,
    brand,
    movement,
    availability,
    strap,
    crystal,
    diameter,
  ]);
  /** Điều hướng nội bộ giữ phiên đăng nhập, bộ lọc và vị trí cuộn khi dùng Back. */
  function navigate(url: URL, id: string | null) {
    window.history.replaceState(
      { ...window.history.state, vnwatchScroll: window.scrollY },
      "",
    );
    window.history.pushState({ vnwatchScroll: 0 }, "", url);
    setProductId(id);
    setPreferredVariantId("");
    setOverlay(null);
    window.requestAnimationFrame(() => {
      const section = url.hash
        ? document.getElementById(url.hash.slice(1))
        : null;
      if (section) section.scrollIntoView();
      else window.scrollTo(0, 0);
    });
  }

  function selectProduct(id: string | null) {
    const url = new URL(
      id ? `/products/${encodeURIComponent(id)}` : "/#collection",
      window.location.origin,
    );
    navigate(url, id);
  }

  /** Link thật hỗ trợ mở tab mới, Ctrl+click và sao chép đường dẫn sản phẩm. */
  function openProduct(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    selectProduct(id);
  }

  function openSection(event: MouseEvent<HTMLAnchorElement>, section: string) {
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    navigate(
      new URL(`/${section ? `#${section}` : ""}`, window.location.origin),
      null,
    );
  }
  /** Ghi màn hình muốn đến sau đăng nhập rồi mở hộp xác thực. */
  function requireLogin(destination: typeof afterLogin = null) {
    setAfterLogin(destination);
    setOverlay("auth");
  }
  /** Đọc giỏ/yêu thích song song; sessionRevision ngăn kết quả phiên cũ ghi vào tài khoản mới. */
  async function syncAccount() {
    if (!user) return;
    const revision = sessionRevision.current;
    setAccountLoading(true);
    setAccountError("");
    try {
      const [items, saved] = await Promise.all([
        api<CartItem[]>("/shop/cart"),
        api<Favorite[]>("/shop/favorites"),
      ]);
      // Chỉ nhận dữ liệu nếu vẫn là đời phiên đã gửi request, tránh rò giỏ/yêu thích giữa hai tài khoản.
      if (revision === sessionRevision.current) {
        setCart(items);
        setFavorites(saved);
      }
    } catch (e) {
      if (revision === sessionRevision.current)
        setAccountError((e as Error).message);
    } finally {
      if (revision === sessionRevision.current) setAccountLoading(false);
    }
  }
  /** Chỉ mở chức năng cá nhân khi đã có user; nếu chưa thì yêu cầu đăng nhập và nhớ đích đến. */
  function privateView(view: PrivateView) {
    if (!user) requireLogin(view);
    else {
      setOverlay(view);
      if (view === "cart" || view === "favorites") void syncAccount();
    }
  }
  /** Thêm/bỏ mẫu trong so sánh, tối đa ba mẫu. */
  function compare(id: string) {
    if (compareIds.includes(id))
      setCompareIds((ids) => ids.filter((i) => i !== id));
    else if (compareIds.length >= 3)
      setToast("So sánh tối đa 3 mẫu. Bỏ một mẫu trước khi chọn thêm.");
    else setCompareIds((ids) => [...ids, id]);
  }
  /** Yêu cầu đăng nhập, gửi PUT/DELETE rồi đồng bộ danh sách; chỉ cập nhật nếu phiên chưa đổi. */
  async function toggleFavorite(id: string) {
    if (!user) {
      requireLogin("favorites");
      return;
    }
    const revision = sessionRevision.current;
    const saved = favorites.some((f) => f.productId === id);
    try {
      await api(`/shop/favorites/${id}`, { method: saved ? "DELETE" : "PUT" });
      const next = await api<Favorite[]>("/shop/favorites");
      if (revision === sessionRevision.current) {
        setFavorites(next);
        setToast(saved ? "Đã bỏ yêu thích." : "Đã lưu sản phẩm yêu thích.");
      }
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  /** Gửi chế độ SET tới backend để thay số lượng trong khoảng UI cho phép; backend tiếp tục kiểm tra tồn. */
  async function changeCart(id: string, quantity: number) {
    if (!user) {
      requireLogin("cart");
      return;
    }
    if (cartBusy) return;
    const revision = sessionRevision.current;
    setCartBusy(true);
    try {
      const items = await api<CartItem[]>("/shop/cart", {
        method: "PUT",
        body: JSON.stringify({
          variantId: id,
          mode: "SET",
          quantity: Math.max(0, Math.min(99, quantity)),
        }),
      });
      if (revision === sessionRevision.current) setCart(items);
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setCartBusy(false);
    }
  }
  /** Chặn SKU hết hàng/khách chưa đăng nhập, gửi ADD một sản phẩm rồi nhận giỏ đã được server xác nhận. */
  async function add(product: Product, variant: Variant) {
    if (!variant.inStock) return false;
    setPreferredVariantId(variant.id);
    if (!user) {
      requireLogin();
      setToast("Vui lòng đăng nhập trước khi thêm sản phẩm vào giỏ hàng.");
      return false;
    }
    const revision = sessionRevision.current;
    try {
      const items = await api<CartItem[]>("/shop/cart", {
        method: "PUT",
        body: JSON.stringify({
          variantId: variant.id,
          mode: "ADD",
          quantity: 1,
        }),
      });
      if (revision !== sessionRevision.current) return false;
      setCart(items);
    } catch (error) {
      if (revision === sessionRevision.current)
        setToast((error as Error).message);
      return false;
    }
    setToast(`Đã thêm ${product.name} vào giỏ hàng.`);
    return true;
  }
  /** Tăng revision để vô hiệu phản hồi cũ, xóa token và dữ liệu cá nhân khỏi state. */
  function signedOut() {
    sessionRevision.current += 1;
    setToken(null);
    setUser(null);
    setCart([]);
    setFavorites([]);
    setAccountLoading(false);
    setAfterLogin(null);
    setOverlay(null);
    setToast("Đã đăng xuất. Bạn có thể đăng nhập lại.");
  }
  /** Đưa bộ lọc/tìm kiếm/sắp xếp về mặc định và quay về trang đầu. */
  function resetFilters() {
    setQuery("");
    setSearch("");
    setBudget("");
    setCategory("");
    setBrand("");
    setStrap("");
    setCrystal("");
    setDiameter("");
    setMovement("");
    setAvailability("");
    setSort("newest");
    setPage(1);
  }
  const count = user ? cart.reduce((sum, item) => sum + item.quantity, 0) : 0;
  return (
    <>
      <a
        className="skip-link"
        href="/#collection"
        onClick={(event) => openSection(event, "collection")}
      >
        Đến danh sách sản phẩm
      </a>
      <div className="announcement">
        VNWATCH STUDIO <span>·</span> SẢN PHẨM THẬT <span>·</span> GIÁ THAM KHẢO
        CÓ NGUỒN
      </div>
      <header className="header">
        <form
          className="header-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(query.trim());
            setPage(1);
            if (productId) selectProduct(null);
            document
              .getElementById("collection")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <label className="sr-only" htmlFor="header-search">
            Tìm kiếm sản phẩm
          </label>
          <input
            id="header-search"
            placeholder="Tìm đồng hồ, thương hiệu hoặc mã sản phẩm…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
          />
          <button aria-label="Tìm sản phẩm" type="submit">
            <Icon name="search" />
          </button>
        </form>
        <a
          className="logo"
          href="/"
          onClick={(event) => {
            if (
              event.button === 0 &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.shiftKey &&
              !event.altKey
            )
              resetFilters();
            openSection(event, "");
          }}
        >
          VN<span>WATCH</span>
          <i />
        </a>
        <nav aria-label="Điều hướng chính">
          <a
            href="/#collection"
            onClick={(event) => openSection(event, "collection")}
          >
            Bộ sưu tập
          </a>
          <a href="/#story" onClick={(event) => openSection(event, "story")}>
            Câu chuyện VNWatch
          </a>
          <a href="/#guide" onClick={(event) => openSection(event, "guide")}>
            Chọn đồng hồ
          </a>
          {user && (
            <button
              onClick={() => {
                setPlacedOrder(null);
                setOverlay("orders");
              }}
            >
              Đơn hàng của tôi
            </button>
          )}
        </nav>
        <div className="header-actions">
          <button
            className="icon-button search-button"
            aria-label="Tìm kiếm đồng hồ"
            onClick={() => {
              if (productId) selectProduct(null);
              document
                .getElementById("collection")
                ?.scrollIntoView({ behavior: "smooth" });
              searchRef.current?.focus({ preventScroll: true });
            }}
          >
            <Icon name="search" />
          </button>
          <button
            className="account-button"
            aria-label={user ? user.displayName : "Đăng nhập"}
            onClick={() => (user ? setOverlay("account") : requireLogin())}
          >
            <Icon name="user" />
            <span>{user ? user.displayName : "Đăng nhập"}</span>
          </button>
          <button
            className="bag-button"
            aria-label={`Mở giỏ hàng, ${count} sản phẩm`}
            onClick={() => privateView("cart")}
          >
            <Icon name="bag" />
            <span>{count}</span>
          </button>
        </div>
      </header>
      <div className="service-nav" aria-label="Tiện ích mua hàng">
        <button onClick={() => privateView("favorites")}>
          ♡ Yêu thích {user && favorites.length ? `(${favorites.length})` : ""}
        </button>
        <button onClick={() => setOverlay("compare")}>
          ⇄ So sánh {compareIds.length ? `(${compareIds.length}/3)` : ""}
        </button>
        <button onClick={() => privateView("addresses")}>
          Địa chỉ nhận hàng
        </button>
        <button onClick={() => privateView("warranties")}>
          Bảo hành của tôi
        </button>
        <button
          onClick={() => {
            setSupportCard(null);
            privateView("support");
          }}
        >
          Hỗ trợ
        </button>
        <button onClick={() => setOverlay("information")}>
          Hướng dẫn & chính sách
        </button>
      </div>
      <main>
        {productId ? (
          <ProductDetail
            key={productId}
            id={productId}
            signedIn={!!user}
            preferredVariantId={preferredVariantId}
            login={() => requireLogin()}
            close={() => selectProduct(null)}
            add={add}
          />
        ) : (
          <>
            <section className="catalog-hero" aria-labelledby="hero-title">
              <img
                src="/images/catalog/collection-wrist.jpg"
                alt="Đồng hồ Daniel Wellington Bound trên cổ tay"
                fetchPriority="high"
              />
              <div className="catalog-hero-content">
                <p className="eyebrow">BỘ SƯU TẬP ĐỒNG HỒ NAM</p>
                <h1 id="hero-title">
                  Dấu ấn riêng.
                  <br />
                  <em>Trong từng khoảnh khắc.</em>
                </h1>
                <p>
                  Từ vẻ thanh lịch cổ điển đến tinh thần thể thao.
                  <br />
                  Tìm chiếc đồng hồ dành cho bạn.
                </p>
                <a
                  className="primary"
                  href="/#collection"
                  onClick={(event) => openSection(event, "collection")}
                >
                  Khám phá bộ sưu tập <Icon name="arrow" />
                </a>
              </div>
            </section>
            <section className="collection section" id="collection">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">BỘ SƯU TẬP VNWATCH</p>
                  <h2>Đồng hồ nam</h2>
                </div>
                <p>Khám phá theo thương hiệu, bộ máy và ngân sách.</p>
              </div>
              <div
                className="brand-discovery"
                aria-label="Khám phá thương hiệu"
              >
                <button
                  className={!brand ? "selected" : ""}
                  onClick={() => {
                    setBrand("");
                    setPage(1);
                  }}
                >
                  Tất cả thương hiệu
                </button>
                {facets.brands.map((name) => (
                  <button
                    key={name}
                    className={brand === name ? "selected" : ""}
                    onClick={() => {
                      setBrand(brand === name ? "" : name);
                      setPage(1);
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
              {facetError && <Notice error>{facetError}</Notice>}
              <div className="catalog-layout">
                <aside className="filters">
                  <div className="filter-title">
                    <h3>Bộ lọc</h3>
                    <button className="text-button" onClick={resetFilters}>
                      Đặt lại
                    </button>
                  </div>
                  <label>
                    Tìm kiếm
                    <div className="search-input">
                      <Icon name="search" />
                      <input
                        ref={searchRef}
                        placeholder="Tên đồng hồ, thương hiệu…"
                        value={query}
                        maxLength={100}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                  </label>
                  <label>
                    Thương hiệu
                    <select
                      aria-label="Thương hiệu"
                      value={brand}
                      onChange={(e) => {
                        setBrand(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">Tất cả thương hiệu</option>
                      {facets.brands.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Danh mục
                    <select
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">Tất cả đồng hồ</option>
                      <option value="dress">Dress — Thanh lịch</option>
                      <option value="sport">Sport — Thể thao</option>
                    </select>
                  </label>
                  <label>
                    Khoảng giá
                    <select
                      value={budget}
                      onChange={(e) => {
                        setBudget(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">Tất cả mức giá</option>
                      <option value="0:1999999">Dưới 2 triệu</option>
                      <option value="2000000:4999999">
                        Từ 2 đến dưới 5 triệu
                      </option>
                      <option value="5000000:9999999">
                        Từ 5 đến dưới 10 triệu
                      </option>
                      <option value="10000000:19999999">
                        Từ 10 đến dưới 20 triệu
                      </option>
                      <option value="20000000:29999999">
                        Từ 20 đến dưới 30 triệu
                      </option>
                      <option value="30000000:49999999">
                        Từ 30 đến dưới 50 triệu
                      </option>
                      <option value="50000000:">Từ 50 triệu trở lên</option>
                    </select>
                  </label>
                  <label>
                    Bộ máy
                    <select
                      value={movement}
                      onChange={(e) => {
                        setMovement(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">Tất cả bộ máy</option>
                      <option value="QUARTZ">Quartz</option>
                      <option value="AUTOMATIC">Cơ tự động</option>
                      <option value="MECHANICAL">Cơ lên cót</option>
                      <option value="SOLAR">Năng lượng ánh sáng</option>
                    </select>
                  </label>
                  <label>
                    Đường kính
                    <select
                      aria-label="Đường kính"
                      value={diameter}
                      onChange={(e) => {
                        setDiameter(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">Tất cả kích thước</option>
                      <option value="1:37.99">Dưới 38 mm</option>
                      <option value="38:40.99">38 – 40 mm</option>
                      <option value="41:42.99">41 – 42 mm</option>
                      <option value="43:">Từ 43 mm</option>
                    </select>
                  </label>
                  <label>
                    Chất liệu dây
                    <select
                      aria-label="Chất liệu dây"
                      value={strap}
                      onChange={(e) => {
                        setStrap(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">Tất cả loại dây</option>
                      {facets.strapMaterials.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Mặt kính
                    <select
                      aria-label="Mặt kính"
                      value={crystal}
                      onChange={(e) => {
                        setCrystal(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">Tất cả mặt kính</option>
                      {facets.crystalMaterials.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Tình trạng hàng
                    <select
                      value={availability}
                      onChange={(e) => {
                        setAvailability(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">Tất cả tình trạng</option>
                      <option value="true">Còn hàng</option>
                      <option value="false">Hết hàng</option>
                    </select>
                  </label>
                  <div className="filter-note">
                    <span>VNW</span>
                    <h4>
                      Chi tiết tạo nên
                      <br />
                      sự khác biệt.
                    </h4>
                    <p>
                      Xem bộ máy, kích thước và từng phiên bản trên trang sản
                      phẩm.
                    </p>
                    <a
                      href="/#guide"
                      onClick={(event) => openSection(event, "guide")}
                    >
                      Tìm hiểu thêm ↗
                    </a>
                  </div>
                </aside>
                <div className="catalog-results">
                  {(brand ||
                    budget ||
                    movement ||
                    category ||
                    availability ||
                    strap ||
                    crystal ||
                    diameter ||
                    search) && (
                    <div className="active-filters" aria-label="Bộ lọc đã chọn">
                      {[
                        [brand, () => setBrand("")],
                        [
                          search,
                          () => {
                            setQuery("");
                            setSearch("");
                          },
                        ],
                        [strap, () => setStrap("")],
                        [crystal, () => setCrystal("")],
                        [
                          diameter &&
                            `Đường kính ${diameter.replace(":", " – ")} mm`,
                          () => setDiameter(""),
                        ],
                        [movement, () => setMovement("")],
                        [
                          budget &&
                            `Giá ${budget
                              .split(":")
                              .map((v) => (v ? money(Number(v)) : "trở lên"))
                              .join(" – ")}`,
                          () => setBudget(""),
                        ],
                        [
                          category === "dress"
                            ? "Thanh lịch"
                            : category
                              ? "Thể thao"
                              : "",
                          () => setCategory(""),
                        ],
                        [
                          availability
                            ? availability === "true"
                              ? "Còn hàng"
                              : "Hết hàng"
                            : "",
                          () => setAvailability(""),
                        ],
                      ].map(
                        ([label, clear], i) =>
                          label && (
                            <button
                              key={i}
                              onClick={() => {
                                (clear as () => void)();
                                setPage(1);
                              }}
                            >
                              {label as string}{" "}
                              <span aria-hidden="true">×</span>
                            </button>
                          ),
                      )}
                      <button onClick={resetFilters}>Xóa tất cả</button>
                    </div>
                  )}
                  <div className="results-toolbar">
                    <span aria-live="polite">
                      {loading
                        ? "Đang tìm đồng hồ…"
                        : error
                          ? "Chưa tải được sản phẩm"
                          : `${result?.meta.total ?? 0} sản phẩm`}
                    </span>
                    <label>
                      Sắp xếp
                      <select
                        value={sort}
                        onChange={(e) => {
                          setSort(e.target.value);
                          setPage(1);
                        }}
                      >
                        <option value="newest">Mới nhất</option>
                        <option value="name_asc">Tên A–Z</option>
                        <option value="price_asc">Giá thấp đến cao</option>
                        <option value="price_desc">Giá cao đến thấp</option>
                      </select>
                    </label>
                  </div>
                  {loading ? (
                    <div className="products" aria-busy="true">
                      {[1, 2].map((i) => (
                        <div className="skeleton" key={i} />
                      ))}
                    </div>
                  ) : error ? (
                    <div className="empty">
                      <Notice error>{error}</Notice>
                      <button
                        className="primary"
                        onClick={() => setRevision((n) => n + 1)}
                      >
                        Thử lại
                      </button>
                    </div>
                  ) : result?.data.length ? (
                    <div className="products">
                      {result.data.map((p, index) => {
                        const cheapest = [...p.variants].sort(
                          (a, b) => a.priceVnd - b.priceVnd,
                        )[0];
                        const available = p.variants.some((v) => v.inStock);
                        return (
                          <article className="product-card" key={p.id}>
                            <a
                              href={`/products/${p.id}`}
                              className={`product-image tone-${index % 2}`}
                              onClick={(event) => openProduct(event, p.id)}
                              aria-label={`Xem ${p.name}`}
                            >
                              <span className="product-badge">
                                {cheapest?.movementType === "AUTOMATIC"
                                  ? "AUTOMATIC"
                                  : "EVERYDAY"}
                              </span>
                              <ProductImage
                                product={p}
                                dark={cheapest?.movementType === "AUTOMATIC"}
                              />
                              <span className="view-circle">
                                <Icon name="arrow" />
                              </span>
                            </a>
                            <div className="product-meta">
                              <span>
                                {p.dataKind === "REFERENCE"
                                  ? p.brand.toUpperCase()
                                  : p.category === "dress"
                                    ? "THANH LỊCH"
                                    : p.category.toUpperCase()}
                              </span>
                              <span
                                className={`stock ${available ? "" : "out"}`}
                              >
                                {available
                                  ? "● Còn hàng"
                                  : p.dataKind === "REFERENCE"
                                    ? "○ Chưa mở bán"
                                    : "○ Hết hàng"}
                              </span>
                            </div>
                            <a
                              href={`/products/${p.id}`}
                              className="product-name"
                              onClick={(event) => openProduct(event, p.id)}
                            >
                              {p.name}
                            </a>
                            <p className="product-sub">
                              {movementName(cheapest?.movementType)} ·{" "}
                              {caseSize(cheapest)} · {p.variants.length} phiên
                              bản
                            </p>
                            <div className="product-bottom">
                              <strong>
                                {p.variants.length > 1 ? "Từ " : ""}
                                {money(cheapest?.priceVnd ?? 0)}
                              </strong>
                              <a
                                href={`/products/${p.id}`}
                                className="text-button"
                                onClick={(event) => openProduct(event, p.id)}
                              >
                                Xem chi tiết ↗
                              </a>
                            </div>
                            <div className="product-tools">
                              <button
                                aria-label={`${favorites.some((f) => f.productId === p.id) ? "Bỏ yêu thích" : "Yêu thích"} ${p.name}`}
                                aria-pressed={favorites.some(
                                  (f) => f.productId === p.id,
                                )}
                                onClick={() => void toggleFavorite(p.id)}
                              >
                                {favorites.some((f) => f.productId === p.id)
                                  ? "♥ Đã lưu"
                                  : "♡ Yêu thích"}
                              </button>
                              <button
                                aria-label={`So sánh ${p.name}`}
                                aria-pressed={compareIds.includes(p.id)}
                                onClick={() => compare(p.id)}
                              >
                                {compareIds.includes(p.id)
                                  ? "✓ Đang so sánh"
                                  : "⇄ So sánh"}
                              </button>
                            </div>
                            {p.dataKind === "REFERENCE" && (
                              <p className="reference-price">
                                Giá tham khảo · {cheapest?.priceSourceName}
                              </p>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty">
                      <span>⌕</span>
                      <h3>Chưa tìm thấy thiết kế phù hợp</h3>
                      <p>Thử từ khóa khác hoặc mở rộng khoảng giá.</p>
                      <button className="outline" onClick={resetFilters}>
                        Xóa bộ lọc
                      </button>
                    </div>
                  )}
                  {!loading && !error && (result?.meta.totalPages ?? 0) > 1 && (
                    <div className="pagination">
                      <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        ← Trước
                      </button>
                      <span>
                        Trang {page} / {result?.meta.totalPages}
                      </span>
                      <button
                        disabled={page >= (result?.meta.totalPages ?? 1)}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Sau →
                      </button>
                    </div>
                  )}
                  <p className="demo-note">
                    Thông tin và ảnh từ hãng hoặc nhà bán lẻ. Giá tham khảo có
                    nguồn trong chi tiết. Tồn kho giả lập được khởi tạo 100 mỗi
                    phiên bản để thử giỏ hàng và đặt COD, sẽ giảm khi đặt đơn.
                  </p>
                </div>
              </div>
            </section>
            <section className="story section" id="story">
              <div>
                <p className="eyebrow">TINH THẦN VNWATCH</p>
                <h2>
                  Không chỉ đo thời gian.
                  <br />
                  <em>Lưu giữ phong cách.</em>
                </h2>
              </div>
              <div>
                <p>
                  VNWatch bắt đầu từ một ý tưởng đơn giản: giúp việc khám phá và
                  lựa chọn đồng hồ trở nên dễ dàng hơn.
                </p>
                <p className="muted">
                  Đây là dự án portfolio bán đồng hồ trực tuyến. Bạn có thể khám
                  phá sản phẩm, so sánh phiên bản, quản lý tài khoản và trải
                  nghiệm giỏ hàng.
                </p>
                <a
                  href="/#collection"
                  onClick={(event) => openSection(event, "collection")}
                  className="text-button"
                >
                  Tìm chiếc đồng hồ của bạn <Icon name="arrow" />
                </a>
              </div>
            </section>
            <section className="guide section" id="guide">
              <p className="eyebrow">MỘT CHÚT GỢI Ý</p>
              <h2>Bắt đầu từ điều bạn thích.</h2>
              <div className="guide-grid">
                <article>
                  <span>01 / BỘ MÁY</span>
                  <h3>Nhịp đập bên trong.</h3>
                  <p>
                    Quartz phù hợp với sự tiện dụng. Máy cơ tự động dành cho
                    người yêu chuyển động và cấu tạo cơ khí.
                  </p>
                </article>
                <article>
                  <span>02 / KÍCH THƯỚC</span>
                  <h3>Vừa vặn, tự nhiên.</h3>
                  <p>
                    Đường kính mặt là điểm bắt đầu. Cảm giác đeo còn phụ thuộc
                    độ dày, chiều dài càng và dáng cổ tay.
                  </p>
                </article>
                <article>
                  <span>03 / PHONG CÁCH</span>
                  <h3>Đơn giản là chính bạn.</h3>
                  <p>
                    Tông màu mặt số và chất liệu dây tạo nên cá tính. Chọn thiết
                    kế phù hợp với trang phục thường ngày.
                  </p>
                </article>
              </div>
            </section>
          </>
        )}
      </main>
      <footer>
        <div>
          <a
            className="logo"
            href="/"
            onClick={(event) => openSection(event, "")}
          >
            VN<span>WATCH</span>
            <i />
          </a>
          <p>Thời gian mang dấu ấn riêng.</p>
        </div>
        <div>
          <a
            href="/#collection"
            onClick={(event) => openSection(event, "collection")}
          >
            Bộ sưu tập
          </a>
          <a href="/#story" onClick={(event) => openSection(event, "story")}>
            Về dự án
          </a>
          <a href="/#guide" onClick={(event) => openSection(event, "guide")}>
            Gợi ý lựa chọn
          </a>
          <button
            className="text-button"
            onClick={() => setOverlay("information")}
          >
            Thông tin & chính sách
          </button>
          <button
            className="text-button"
            onClick={() => {
              setSupportCard(null);
              privateView("support");
            }}
          >
            Liên hệ hỗ trợ
          </button>
        </div>
        <p className="small">
          © {new Date().getFullYear()} VNWatch
          <br />
          Bản demo · Đặt hàng COD giả lập
        </p>
      </footer>
      {overlay === "auth" && (
        <Auth
          close={() => {
            setOverlay(null);
            setAfterLogin(null);
          }}
          loggedIn={(account) => {
            sessionRevision.current += 1;
            setUser(account);
            setOverlay(afterLogin);
            setAfterLogin(null);
            setToast(
              "Đăng nhập thành công. Bạn có thể thêm sản phẩm vào giỏ và đặt hàng.",
            );
          }}
        />
      )}
      {overlay === "account" && user && (
        <Account
          user={user}
          updateUser={setUser}
          close={() => setOverlay(null)}
          signedOut={signedOut}
        />
      )}
      {overlay === "cart" && user && (accountLoading || accountError) && (
        <Modal title="Giỏ hàng" close={() => setOverlay(null)}>
          {accountLoading ? (
            <p>Đang tải giỏ theo tài khoản…</p>
          ) : (
            <>
              <Notice error>{accountError}</Notice>
              <button className="primary" onClick={() => void syncAccount()}>
                Thử tải lại giỏ
              </button>
            </>
          )}
        </Modal>
      )}
      {overlay === "cart" && user && !accountLoading && !accountError && (
        <Cart
          busy={cartBusy}
          checkout={() => {
            if (user) setOverlay("checkout");
            else {
              requireLogin("checkout");
            }
          }}
          items={cart}
          change={(id, quantity) => void changeCart(id, quantity)}
          close={() => setOverlay(null)}
        />
      )}
      {overlay === "checkout" && user && (
        <Checkout
          items={cart}
          user={user}
          close={() => setOverlay("cart")}
          placed={(order) => {
            void syncAccount();
            setPlacedOrder(order);
            setOverlay("orders");
            setRevision((n) => n + 1);
            setToast(
              "Đơn COD đã được lưu. Bạn có thể xem trạng thái bên dưới.",
            );
          }}
        />
      )}
      {overlay === "favorites" && user && (
        <Favorites
          rows={favorites}
          loading={accountLoading}
          loadError={accountError}
          retry={() => void syncAccount()}
          close={() => setOverlay(null)}
          open={(id) => {
            setOverlay(null);
            selectProduct(id);
          }}
          remove={async (id) => {
            await api(`/shop/favorites/${id}`, { method: "DELETE" });
            setFavorites((rows) => rows.filter((f) => f.productId !== id));
          }}
        />
      )}
      {overlay === "addresses" && user && (
        <Addresses close={() => setOverlay(null)} />
      )}
      {overlay === "compare" && (
        <Comparison
          ids={compareIds}
          close={() => setOverlay(null)}
          remove={compare}
          open={(id) => {
            setOverlay(null);
            selectProduct(id);
          }}
        />
      )}
      {overlay === "information" && (
        <Information
          close={() => setOverlay(null)}
          support={() => {
            setSupportCard(null);
            privateView("support");
          }}
        />
      )}
      {overlay === "warranties" && user && (
        <Warranties
          close={() => setOverlay(null)}
          request={(card) => {
            setSupportCard(card);
            setOverlay("support");
          }}
        />
      )}
      {overlay === "support" && user && (
        <Support
          close={() => setOverlay(null)}
          warrantyId={supportCard?.id}
          orderId={supportCard?.orderId}
        />
      )}
      {overlay === "orders" && user && (
        <Orders
          user={user}
          initial={overlay === "orders" ? placedOrder : null}
          close={() => {
            setOverlay(null);
            setRevision((n) => n + 1);
          }}
          resume={() => setOverlay("checkout")}
        />
      )}
      {!overlay && !productId && (
        <button
          className="assistant-launcher"
          onClick={() => setOverlay("assistant")}
          aria-label="Mở trợ lý tư vấn"
        >
          <Icon name="chat" />
          <span>Tư vấn đồng hồ</span>
        </button>
      )}
      <Assistant
        key={`assistant-${user?.id ?? "guest"}-${dataKind}`}
        open={overlay === "assistant"}
        close={() => setOverlay(null)}
        dataKind={dataKind}
        selectProduct={(id) => {
          setOverlay(null);
          selectProduct(id);
        }}
        viewOrders={() => {
          setPlacedOrder(null);
          if (user) setOverlay("orders");
          else requireLogin("orders");
        }}
        viewSupport={() => {
          setSupportCard(null);
          privateView("support");
        }}
      />
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button aria-label="Ẩn thông báo" onClick={() => setToast("")}>
            ×
          </button>
        </div>
      )}
    </>
  );
}
