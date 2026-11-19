/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/src/Assistant.tsx
 * Giao diện hội thoại: gửi câu hỏi/lịch sử giới hạn, hiển thị sản phẩm và nguồn do backend đã đối chiếu.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { useEffect, useRef, useState } from "react";
import { api, money } from "./api";
import { Modal, Icon, Notice, ProductImage, caseSize } from "./components";
import type { Product } from "./types";

/** Kiểu Reply mô tả cấu trúc dữ liệu lúc biên dịch; dữ liệu HTTP/IPC vẫn cần kiểm tra khi chạy. */
interface Reply {
  conversationId?: string;
  // Chế độ hội thoại/provider hoặc thao tác giỏ, theo hợp đồng của file.
  mode: "CATALOG" | "OPENAI";
  // Thông báo chế độ catalog hoặc fallback khi provider lỗi.
  notice: string | null;
  // Nội dung trả lời dựng từ dữ liệu đã cung cấp.
  text: string;
  // Các mẫu trong catalog hoặc dữ liệu danh mục được tải.
  products: Product[];
  // Nguồn đã được whitelist/đối chiếu.
  sources: { title: string; url: string; checkedAt: string | null }[];
  // Hành động nghiệp vụ/đích điều hướng thuộc danh sách cho phép.
  action: "orders" | "collection" | "guide" | null;
}
/** Kiểu Turn mô tả cấu trúc dữ liệu lúc biên dịch; dữ liệu HTTP/IPC vẫn cần kiểm tra khi chạy. */
interface Turn {
  requestId?: string;
  question: string;
  reply: Reply;
}
interface Conversation {
  maHoiThoai: string;
  tieuDe: string | null;
  trangThai: "DANG_MO" | "DA_DONG";
  ngayCapNhat: string;
}
interface SavedMessage {
  maTinNhan: number;
  requestId: string;
  nguoiGui: "user" | "assistant";
  noiDung: string;
  trangThai: "DANG_XU_LY" | "HOAN_THANH" | "LOI";
  duLieuTraLoi: Reply | null;
}
interface History {
  conversation: Conversation;
  messages: SavedMessage[];
  nextBefore: number | null;
}
/** Ghép hai bản ghi của cùng lượt hỏi để sử dụng lại giao diện sản phẩm và nguồn. */
function savedTurns(messages: SavedMessage[]): Turn[] {
  return messages
    .filter((m) => m.nguoiGui === "user")
    .map((question) => {
      const answer = messages.find(
        (m) => m.requestId === question.requestId && m.nguoiGui === "assistant",
      );
      return {
        requestId: question.requestId,
        question: question.noiDung,
        reply: answer?.duLieuTraLoi ?? {
          mode: "CATALOG",
          notice: null,
          products: [],
          sources: [],
          action: null,
          text:
            answer?.noiDung ||
            "Lượt trả lời chưa hoàn tất. Bạn có thể gửi lại câu hỏi.",
        },
      };
    });
}
const suggestions = [
  "Gợi ý đồng hồ dưới 2 triệu",
  "Casio của nước nào?",
  "Bảo hành tại VNWatch thế nào?",
];

/** Giữ hội thoại ở state, gửi câu hỏi/lịch sử và hiển thị phản hồi/catalog/nguồn có kiểm tra. */
export function Assistant({
  open,
  close,
  selectProduct,
  viewOrders,
  viewSupport,
  dataKind,
}: {
  open: boolean;
  // Callback đóng màn hình/component; component cha quyết định state.
  close: () => void;
  selectProduct: (id: string) => void;
  viewOrders: () => void;
  viewSupport: () => void;
  // DEMO là dữ liệu giả, REFERENCE là mẫu thật có nguồn tham khảo.
  dataKind: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  // React state pending: Request chưa rõ kết quả; giữ cùng key/body khi thử lại. setPending yêu cầu React render lại khi giá trị đổi.
  const [pending, setPending] = useState("");
  // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
  const [error, setError] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saved, setSaved] = useState<SavedMessage[]>([]);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  // undefined: chưa chọn; null: chủ động bắt đầu cuộc trò chuyện mới.
  const selectedId = useRef<string | null | undefined>(undefined);
  const attempt = useRef<{ message: string; requestId: string } | null>(null);
  const closed = conversation?.trangThai === "DA_DONG";
  // useRef giữ giá trị/DOM giữa các lần render; đổi .current không tự làm component render lại.
  const bottom = useRef<HTMLDivElement>(null);
  // useRef giữ giá trị/DOM giữa các lần render; đổi .current không tự làm component render lại.
  const controller = useRef<AbortController | null>(null);
  // useRef giữ giá trị/DOM giữa các lần render; đổi .current không tự làm component render lại.
  const busy = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  // Mỗi lần mở chat, tải danh sách từ DB. App remount component khi đổi tài khoản/catalog.
  useEffect(() => {
    if (!open || busy.current) return;
    const current = new AbortController();
    controller.current = current;
    busy.current = true;
    setLoadingHistory(true);
    void (async () => {
      try {
        const list = await api<Conversation[]>(
          `/assistant/conversations?dataKind=${dataKind}`,
          { signal: current.signal },
        );
        if (current.signal.aborted) return;
        setConversations(list);
        const id =
          selectedId.current === undefined
            ? list[0]?.maHoiThoai
            : selectedId.current;
        if (id) {
          const history = await api<History>(
            `/assistant/conversations/${id}/messages`,
            { signal: current.signal },
          );
          if (!current.signal.aborted) acceptHistory(history);
        }
      } catch (e) {
        if (!current.signal.aborted)
          setError(e instanceof Error ? e.message : "Không tải được lịch sử.");
      } finally {
        if (controller.current === current) {
          busy.current = false;
          setLoadingHistory(false);
        }
      }
    })();
    return () => {
      current.abort();
      if (controller.current === current) busy.current = false;
    };
  }, [open, dataKind]);

  function acceptHistory(history: History) {
    selectedId.current = history.conversation.maHoiThoai;
    setConversation(history.conversation);
    setSaved(history.messages);
    setTurns(savedTurns(history.messages));
    setNextBefore(history.nextBefore);
  }

  function newConversation() {
    if (busy.current) return;
    selectedId.current = null;
    attempt.current = null;
    setConversation(null);
    setTurns([]);
    setSaved([]);
    setNextBefore(null);
    setError("");
    setInput("");
  }

  async function loadConversation(id: string, older = false) {
    if (!id) {
      newConversation();
      return;
    }
    if (busy.current) return;
    busy.current = true;
    setLoadingHistory(true);
    setError("");
    const current = new AbortController();
    controller.current = current;
    try {
      const history = await api<History>(
        `/assistant/conversations/${id}/messages${older && nextBefore ? `?before=${nextBefore}` : ""}`,
        { signal: current.signal },
      );
      if (!current.signal.aborted) {
        if (older) {
          setSaved([...history.messages, ...saved]);
          setNextBefore(history.nextBefore);
          setTurns((old) => [
            ...savedTurns(history.messages).filter(
              (t) =>
                !old.some((existing) => existing.requestId === t.requestId),
            ),
            ...old,
          ]);
        } else acceptHistory(history);
        attempt.current = null;
        setInput("");
      }
    } catch (e) {
      if (!current.signal.aborted)
        setError(e instanceof Error ? e.message : "Không tải được hội thoại.");
    } finally {
      if (controller.current === current) {
        busy.current = false;
        setLoadingHistory(false);
      }
    }
  }

  async function closeConversation() {
    if (!conversation || busy.current) return;
    busy.current = true;
    setLoadingHistory(true);
    const current = new AbortController();
    controller.current = current;
    try {
      const updated = await api<Conversation>(
        `/assistant/conversations/${conversation.maHoiThoai}/close`,
        { method: "POST", signal: current.signal },
      );
      if (!current.signal.aborted) {
        setConversation(updated);
        setConversations((old) =>
          old.map((c) => (c.maHoiThoai === updated.maHoiThoai ? updated : c)),
        );
      }
    } catch (e) {
      if (!current.signal.aborted)
        setError(e instanceof Error ? e.message : "Không đóng được hội thoại.");
    } finally {
      if (controller.current === current) {
        busy.current = false;
        setLoadingHistory(false);
      }
    }
  }
  // Đưa focus/cuộn về mục vừa mở để điều hướng bằng click, Back/Forward và bàn phím có cùng kết quả.
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns, pending, error, open]);
  /** Gửi câu hỏi tới backend, giữ loading để tránh gửi chồng và hiện thông báo khi dịch vụ lỗi. */
  async function send(question: string) {
    const message = question.trim();
    if (!message || message.length > 1000 || busy.current || closed) return;
    busy.current = true;
    // AbortController tạo tín hiệu hủy cho lượt tải này; cleanup ngăn phản hồi cũ tiếp tục cập nhật UI.
    const current = new AbortController();
    controller.current = current;
    setInput("");
    setError("");
    setPending(message);
    // Gửi lại cùng mã lượt khi lỗi mạng để backend không tạo tin nhắn trùng.
    if (attempt.current?.message !== message)
      attempt.current = { message, requestId: crypto.randomUUID() };
    const requestId = attempt.current.requestId;
    try {
      let active = conversation;
      if (!active) {
        active = await api<Conversation>("/assistant/conversations", {
          method: "POST",
          signal: current.signal,
          body: JSON.stringify({ dataKind }),
        });
        if (current.signal.aborted) return;
        selectedId.current = active.maHoiThoai;
        setConversation(active);
        setConversations((old) => [active!, ...old].slice(0, 30));
      }
      const reply = await api<Reply>("/assistant/chat", {
        method: "POST",
        signal: current.signal,
        body: JSON.stringify({
          message,
          conversationId: active.maHoiThoai,
          requestId,
          dataKind,
        }),
      });
      if (!current.signal.aborted) {
        setTurns((old) => [
          ...old.filter((t) => t.requestId !== requestId),
          { question: message, reply, requestId },
        ]);
        const updated = {
          ...active,
          tieuDe: active.tieuDe ?? message.slice(0, 150),
          ngayCapNhat: new Date().toISOString(),
        };
        setConversation(updated);
        setConversations((old) =>
          [
            updated,
            ...old.filter((c) => c.maHoiThoai !== updated.maHoiThoai),
          ].slice(0, 30),
        );
        attempt.current = null;
      }
    } catch (e) {
      if (!current.signal.aborted) {
        setError(
          e instanceof Error
            ? e.message
            : "Không nhận được phản hồi. Hãy thử lại.",
        );
        setInput(message);
      }
    } finally {
      if (controller.current === current) {
        busy.current = false;
        setPending("");
      }
    }
  }
  /** Mở màn hình mà reply đề xuất qua callback; trợ lý không tự sửa đơn hoặc thanh toán. */
  function action(target: Reply["action"]) {
    if (target === "orders") {
      viewOrders();
      return;
    }
    close();
    window.setTimeout(
      () =>
        document
          .getElementById(target === "guide" ? "guide" : "collection")
          ?.scrollIntoView({ behavior: "smooth" }),
      0,
    );
  }
  if (!open) return null;
  const latest = turns.at(-1)?.reply;
  return (
    <Modal title="Trợ lý VNWatch" close={close} wide>
      <div className="assistant-shell">
        <div className="assistant-meta">
          <span className="assistant-mode">
            {latest?.mode === "OPENAI"
              ? "AI · OpenAI"
              : latest
                ? "Tư vấn theo dữ liệu"
                : "Tư vấn sản phẩm & thương hiệu"}
          </span>
          <button
            className="text-button"
            disabled={!!pending || loadingHistory}
            onClick={newConversation}
          >
            Hội thoại mới
          </button>
        </div>
        <div className="assistant-history-controls">
          <label htmlFor="assistant-history">Lịch sử hội thoại</label>
          <select
            id="assistant-history"
            value={conversation?.maHoiThoai ?? ""}
            disabled={!!pending || loadingHistory}
            onChange={(e) => void loadConversation(e.target.value)}
          >
            <option value="">Cuộc trò chuyện mới</option>
            {conversations.map((c) => (
              <option key={c.maHoiThoai} value={c.maHoiThoai}>
                {c.trangThai === "DA_DONG" ? "[Đã đóng] " : ""}
                {c.tieuDe ?? "Hội thoại chưa có tin nhắn"}
              </option>
            ))}
          </select>
          {conversation && !closed && (
            <button
              className="text-button"
              disabled={!!pending || loadingHistory}
              onClick={() => void closeConversation()}
            >
              Kết thúc hội thoại
            </button>
          )}
        </div>
        {loadingHistory && <p role="status">Đang tải lịch sử…</p>}
        {closed && (
          <Notice>
            Hội thoại đã kết thúc. Chọn “Hội thoại mới” để tiếp tục tư vấn.
          </Notice>
        )}
        <p className="assistant-disclosure">
          {dataKind === "DEMO"
            ? "Đang tra cứu sản phẩm demo giả lập."
            : "Đang tra cứu sản phẩm thật trong catalog."}{" "}
          Lịch sử được lưu theo tài khoản hoặc trình duyệt khách. Giá/tồn kho
          trong câu trả lời cũ chỉ để tham khảo; xem sản phẩm để cập nhật.
        </p>
        <div
          className="assistant-thread"
          role="log"
          aria-label="Hội thoại tư vấn"
          aria-live="polite"
          aria-relevant="additions"
          aria-busy={!!pending}
        >
          <article className="assistant-answer welcome">
            <span className="assistant-speaker">VNWATCH</span>
            <p>
              Chào bạn! Mình giúp tìm đồng hồ theo ngân sách, tra cứu thông số
              và tìm hiểu các thương hiệu có trên website. Bạn đang tìm mẫu nào?
            </p>
            <div className="assistant-suggestions">
              {suggestions.map((q) => (
                <button
                  key={q}
                  disabled={!!pending || loadingHistory || closed}
                  onClick={() => void send(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </article>
          {nextBefore && (
            <button
              className="text-button"
              disabled={loadingHistory || !!pending}
              onClick={() =>
                void loadConversation(conversation!.maHoiThoai, true)
              }
            >
              Xem tin nhắn cũ hơn
            </button>
          )}
          {turns.map((turn, i) => (
            <div key={i} className="assistant-turn">
              <p className="assistant-question">
                <span className="sr-only">Bạn: </span>
                {turn.question}
              </p>
              <article className="assistant-answer">
                <span className="assistant-speaker">
                  {turn.reply.mode === "OPENAI"
                    ? "VNWATCH · AI"
                    : "VNWATCH · DỮ LIỆU"}
                </span>
                {turn.reply.notice && (
                  <p className="assistant-fallback">{turn.reply.notice}</p>
                )}
                <p className="assistant-copy">{turn.reply.text}</p>
                {turn.reply.products.map((p) => (
                  <div className="assistant-product" key={p.id}>
                    <div className="assistant-product-top">
                      <div className="assistant-photo">
                        <ProductImage product={p} eager />
                      </div>
                      <div>
                        <span className="eyebrow">{p.brand}</span>
                        <h3>{p.name}</h3>
                        <span className="assistant-price">
                          {money(
                            Math.min(...p.variants.map((v) => v.priceVnd)),
                          )}
                        </span>
                        <p className="small">
                          {p.dataKind === "REFERENCE"
                            ? "Sản phẩm thật · Giá tham khảo"
                            : "Sản phẩm demo giả lập"}
                        </p>
                        <button
                          className="text-button"
                          onClick={() => selectProduct(p.id)}
                        >
                          Xem chi tiết <Icon name="arrow" />
                        </button>
                      </div>
                    </div>
                    {p.variants.map((v) => (
                      <details className="assistant-specs" key={v.id}>
                        <summary>
                          {v.sku} · {money(v.priceVnd)} ·{" "}
                          {v.inStock ? "Còn hàng" : "Chưa có hàng"}
                        </summary>
                        <dl>
                          <dt>Bộ máy</dt>
                          <dd>{v.movementType}</dd>
                          <dt>Kích thước</dt>
                          <dd>{caseSize(v)}</dd>
                          <dt>Vỏ / kính</dt>
                          <dd>
                            {v.caseMaterial} / {v.crystalMaterial}
                          </dd>
                          <dt>Dây</dt>
                          <dd>{v.strapMaterial}</dd>
                          <dt>Chống nước công bố</dt>
                          <dd>{v.waterResistanceM} m</dd>
                          <dt>Bảo hành tại VNWatch</dt>
                          <dd>
                            {v.warrantyMonths === null
                              ? "Chưa thiết lập chính sách"
                              : `${v.warrantyMonths} tháng`}
                          </dd>
                        </dl>
                      </details>
                    ))}
                  </div>
                ))}
                {!!turn.reply.sources.length && (
                  <details className="assistant-sources">
                    <summary>
                      Nguồn thông tin ({turn.reply.sources.length})
                    </summary>
                    <ul>
                      {turn.reply.sources.map((s) => (
                        <li key={s.url}>
                          <a href={s.url} target="_blank" rel="noreferrer">
                            {s.title} ↗
                          </a>
                          {s.checkedAt && (
                            <span> · Kiểm tra {s.checkedAt.slice(0, 10)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                {turn.reply.action && (
                  <button
                    className="text-button"
                    onClick={() => action(turn.reply.action)}
                  >
                    {turn.reply.action === "orders"
                      ? "Mở đơn hàng của tôi"
                      : turn.reply.action === "guide"
                        ? "Xem hướng dẫn chọn đồng hồ"
                        : "Khám phá bộ sưu tập"}{" "}
                    <Icon name="arrow" />
                  </button>
                )}
              </article>
            </div>
          ))}
          {pending && (
            <>
              <p className="assistant-question">{pending}</p>
              <p className="assistant-thinking" role="status">
                Đang tra cứu dữ liệu…
              </p>
            </>
          )}
          {error && (
            <Notice error>
              {error} Câu hỏi đã được giữ lại để bạn gửi lại.
            </Notice>
          )}
          <div ref={bottom} />
        </div>
        <button className="text-button" onClick={viewSupport}>
          Liên hệ hỗ trợ về sản phẩm hoặc đơn hàng
        </button>
        <form
          className="assistant-form"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <label className="sr-only" htmlFor="assistant-question">
            Câu hỏi cho trợ lý
          </label>
          <textarea
            id="assistant-question"
            placeholder="Ví dụ: đồng hồ tự động dưới 10 triệu…"
            rows={2}
            maxLength={1000}
            value={input}
            disabled={!!pending || loadingHistory || closed}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                void send(input);
              }
            }}
          />
          <button
            className="primary"
            type="submit"
            disabled={!!pending || loadingHistory || closed || !input.trim()}
            aria-label="Gửi câu hỏi"
          >
            <Icon name="arrow" />
          </button>
          <span className="assistant-counter">
            {input.length}/1000 · Enter để gửi · Shift+Enter xuống dòng
          </span>
        </form>
      </div>
    </Modal>
  );
}
