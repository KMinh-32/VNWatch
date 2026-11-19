# Bằng chứng kiểm tra frontend — 01/10/2026

## QR demo — 04/10/2026

Build đạt, **15/15 E2E đạt** (1,8 phút), sau khi sửa bộ chọn nút giỏ của ca QR mới. Node runtime tối giản thiếu biến ProgramFiles; lệnh chạy test đặt lại ProgramFiles/ProgramFiles(x86) theo vị trí Edge có thật trên máy, không cài thêm trình duyệt.

Ca QR dùng NestJS thật trên PostgreSQL test schema riêng: đăng nhập, thêm SKU, chọn QR, báo giá/tạo đơn, hiển thị SVG/đúng UUID và tổng VND, thông báo không chuyển tiền thật, cố ý bỏ phản hồi sau khi server ghi PAID, gửi lại vẫn một đơn/một PAY_QR_DEMO, không hiện hủy sau PAID và cập nhật trạng thái từ server. Mobile 390 × 844 không tràn ngang; runtime không lỗi. Đã xem ảnh work/qr-demo-mobile.png; desktop ở work/qr-demo-desktop.png. Không tạo QR PAID hoặc đổi quyền trên database dev.

Backend tương ứng 72/72 test đạt, build/lint/format đạt, migration dev và Swagger mới sẵn sàng. Các ca COD/giỏ/tài khoản/catalog/hỗ trợ/quản trị/chat cũ đều tiếp tục đạt. Chưa kiểm thử quét bằng camera điện thoại, app ngân hàng hay giao dịch thật. Nguồn, quyền và giới hạn: [QR-DEMO.vi.md](../vnwatch-backend/docs/QR-DEMO.vi.md).

## Hiện hành 03/10/2026 — hoàn thiện Shopping/Management

Production build TypeScript/React đạt. Toàn bộ **14/14 E2E đạt** trên Edge, khoảng 1,3 phút, sau khi build/restart API và sửa accessible name nút tài khoản mobile. Giao diện có server cart riêng theo tài khoản, yêu thích/so sánh, địa chỉ checkout, mã giảm giá, hỗ trợ/bảo hành demo, đánh giá người mua và quản trị/báo cáo/audit.

Ca quản trị dùng API NestJS thật và PostgreSQL `_test` schema riêng: đăng nhập ADMIN fixture, tạo mẫu DEMO và SKU, tạo coupon và áp dụng vào COD, hủy đơn, tải CSV, xem audit, phản hồi/đóng ticket. Không tạo admin hay đổi quyền trên database dev. Ca mua kiểm tra so sánh/yêu thích, địa chỉ, mã không hợp lệ và phục hồi báo giá, ticket, đăng xuất/đổi tài khoản không thấy giỏ người trước. Các ca xác thực, session bị thu hồi, retry đơn mất phản hồi, catalog, trợ lý/catalog-mode và lỗi API cũ tiếp tục đạt.

Ca ảnh nay kiểm tra đủ 10 sản phẩm hiển thị **ảnh thật tải được hoặc thông báo ảnh không khả dụng rõ ràng**. Timeout ảnh chỉ bắt đầu khi gần viewport, rồi thử nguồn tiếp theo/fallback sau 8 giây. Không dùng kết quả này để khẳng định cả 10 nguồn ảnh ngoài đã tải được. Ca chủ động chặn ảnh vẫn đạt.

Đã xem `work/management-desktop.png` và `work/support-mobile.png` (390 × 844): dialog, tab, nhật ký và hội thoại/form không tràn ngang. Private loading/error có thông báo và retry cho giỏ/yêu thích, hỗ trợ/bảo hành/đánh giá; chưa chạy fault injection cho mọi API mới. Readiness NestJS và FastAPI trả OK, frontend HTTP 200.

Backend tương ứng **67/67 test đạt**, build/lint/format đạt; OpenAPI đã xuất. Agent Python không đổi, 24 test từ lượt trước không được tính là chạy mới. Chưa kiểm thử OpenAI thật, online payment/email/SMS, vận chuyển/serial, accessibility toàn diện, backup/CI/public deployment hoặc benchmark. Phạm vi và giới hạn: [COMPLETENESS.vi.md](../vnwatch-backend/docs/COMPLETENESS.vi.md). Những phần bên dưới là lịch sử; mô tả giỏ local dùng chung đã được thay thế.

## Cập nhật 03/10/2026 — đăng nhập trước khi thêm giỏ

Build TypeScript/React đạt. Sau khi khởi động lại các dịch vụ local, toàn bộ E2E được chạy: **11/12 đạt** (2,4 phút). Ca duy nhất chưa đạt là kiểm tra đủ 10 ảnh nguồn ngoài tải được: nhận 0 ảnh trong 20 giây. Không coi ca này đã đạt và không thay dữ liệu bằng ảnh giả. Ca placeholder khi ảnh lỗi vẫn đạt.

Các ca xác thực/giỏ/COD đều đạt: khách bấm thêm chỉ mở đăng nhập và giỏ giữ rỗng; đóng form trở về đúng phiên bản Silver; đăng nhập chưa tự thêm, bấm thêm tiếp mới cập nhật giỏ. Sau reload, cần đăng nhập để mở giỏ đã lưu; đóng form không mở giỏ/checkout. Kiểm tra `/users/me` lỗi 503 không thêm; thu hồi phiên thật qua API logout-all khiến lần thêm tiếp mở đăng nhập và giỏ không đổi. Gọi trực tiếp quote/create đơn khi không có token đều trả 401. Luồng COD Casio thật, idempotency khi mất phản hồi, hủy hoàn tồn và tài khoản cũ tiếp tục đạt.

Sau khi đổi cập nhật giỏ sang kiểm tra SKU trên danh sách mới nhất trong state (tránh trùng khi request xác nhận phiên về chậm), đã build lại và chạy riêng **3/3 ca giỏ/xác thực/COD đạt** (37 giây). Kiểm tra định dạng các file nguồn/test đã thay đổi đạt.

Đã xem ảnh form đăng nhập khi mở giỏ trên mobile 390 × 844 (`work/cart-login-mobile.png`), không tràn ngang. Cart vẫn lưu IDs/số lượng trên trình duyệt, chưa chuyển thành giỏ đồng bộ server. Những mục dưới là kết quả lịch sử; quyền khách thêm giỏ trước đăng nhập đã được thay thế.

## Cập nhật tồn kho 03/10/2026

Production build đạt; **11/11 E2E đạt** (50,2 giây) sau khi đặt tồn kho mọi phiên bản thành 100. Ca reference và chat xác nhận còn hàng và nút thêm giỏ mở; DEMO Automatic cũng thêm được. Ca COD nay dùng Casio AE-1200WHD-1AV thật: thêm giỏ, đăng nhập, nhận báo giá, đặt đơn, retry sau mất phản hồi, chỉ một đơn và hủy để hoàn tồn. Giá/tồn vẫn lấy từ backend; sản phẩm hết tồn thật vẫn bị chặn theo `inStock`.

## Cập nhật 03/10/2026 — trợ lý tư vấn

Build TypeScript/React đạt; toàn bộ **11/11 E2E đạt** sau cập nhật ảnh có thời gian chờ (khoảng 1 phút): 9 ca trước và 2 ca chat mới. Chat chạy qua React → NestJS → FastAPI thật với PostgreSQL local, không có OpenAI key. Ca chat kiểm tra gợi ý dưới 2 triệu chỉ trả Casio phù hợp, trạng thái chưa có hàng, bảo hành thiếu, thông tin Casio và URL hãng, mẫu Rolex ngoài catalog, mở chi tiết và giữ hội thoại khi đóng/mở. Ca lỗi mô phỏng 503, giữ câu hỏi để gửi lại, xóa hội thoại và hiển thị chuỗi chứa script như văn bản.

Đã xem ảnh chat desktop/mobile trong `work/assistant-desktop.png`, `work/assistant-mobile.png`; mobile 390 × 844 không tràn ngang. Provider OpenAI chưa được gọi thật; cần key/quota để kiểm tra chất lượng diễn giải câu hỏi thực tế. Xem [hướng dẫn agent](../vnwatch-agent/README.vi.md).

## Cập nhật 02/10/2026

Production build với TypeScript strict đạt. **9/9 ca E2E đạt** trên Microsoft Edge với API/PostgreSQL local: 6 ca cũ, 1 ca COD và 2 ca reference catalog; lần chạy cuối 22,2 giây. Sau khi sửa nguồn ảnh và bổ sung accessible label của bộ lọc, đã chạy lại toàn bộ bộ kiểm thử. Không coi thời gian test là benchmark.

Ca COD tạo đơn với báo giá thật, cố ý mất phản hồi sau khi backend lưu, tải lại/đăng nhập/gửi lại với cùng key, xác nhận chỉ một đơn và hủy để hoàn tồn. Ca reference xác nhận 10 ảnh tải được, 5 hãng trong catalog, lọc Casio/giá, thông số vỏ đúng dạng kích thước, nguồn có URL, không tự gán bảo hành và chặn mua khi chưa có tồn. Ca ảnh lỗi chủ động chặn request, xác nhận placeholder và liên kết nguồn còn dùng được.

Một URL ảnh Bambino bị trình duyệt chặn; đã thay bằng ảnh cùng mẫu từ Orient Đài Loan và kiểm tra ảnh tải được. Đã xem ảnh desktop bộ sưu tập và trang sản phẩm mobile 390 × 844; không tràn ngang. Dialog mobile cuộn bên trong để xem thông số/nguồn.

Script Windows đã khởi động backend/frontend khi cả hai chưa chạy; PostgreSQL được khởi động riêng trước đó. Website local ở 5173, readiness API trả OK. Chưa xác nhận toàn bộ từ một lần reboot máy.

Mẫu thật có ảnh/thông số/giá tham khảo, chưa mở bán; bộ DEMO vẫn dùng để kiểm tra COD. Các phần bên dưới là bằng chứng lịch sử của 01/10/2026, gồm trạng thái checkout cũ đã được thay thế.

Môi trường: Windows, Node.js 24.18.0, React 19, TypeScript 5.9, Vite 7; Playwright chạy Microsoft Edge với browser context riêng. Backend NestJS và PostgreSQL local dùng dữ liệu demo gốc.

## Kết quả đã chạy

- `npm run build`: thành công (bao gồm kiểm tra TypeScript strict và production bundle).
- `npm test`: **6 passed**, lần cuối 14,4 giây. Đây là thời gian chạy bộ kiểm thử, không phải benchmark hiệu năng website.
- Ảnh toàn trang ở viewport desktop 1440 × 1000 và mobile 390 × 844 đã được mở kiểm tra trực quan. Không thấy tràn ngang trên mobile; không có lỗi JavaScript trong hai ca kiểm tra giao diện.
- Backend `/api/v1/health/ready` trả `status: ok`.
- `start-vnwatch.ps1` đã chạy khi backend/frontend sẵn sàng và đã khởi động lại frontend sau khi dừng preview. Chưa kiểm thử toàn bộ nhánh khởi động từ máy vừa reboot bằng chính script này; PostgreSQL và backend đã được khởi động riêng trong phiên làm việc.

## Sáu ca kiểm thử

1. Catalog thật: lọc giá, tìm kiếm không có kết quả, xóa bộ lọc và chặn thêm SKU hết hàng.
2. Giỏ hàng: chọn Silver, giữ SKU/số lượng qua tải lại trang, tính lại giá từ API, tăng số lượng, xóa và trạng thái rỗng; nút thanh toán chưa khả dụng.
3. Tài khoản thật: đăng ký, đăng nhập, sửa tên, xem phiên hiện tại, nhập sai mật khẩu hiện tại mà không bị đăng xuất, đổi mật khẩu thành công, đăng nhập bằng mật khẩu mới rồi đăng xuất. Không lưu token trong localStorage.
4. Lỗi API 503 được mô phỏng bằng Playwright: hiện lỗi, không tự sinh catalog giả, bấm Thử lại trở về API thật.
5. Mobile: không tràn ngang, mở/đóng chi tiết, mở giỏ rỗng và không lỗi runtime.
6. Desktop: tải catalog, chụp toàn trang và không lỗi runtime.

Các lần chạy tạo tài khoản demo có email `frontend.e2e.<timestamp>@example.test`; không xóa dữ liệu người dùng sẵn có. Không dùng bộ test này trên database sản xuất.

## Chưa được kiểm chứng bằng E2E trong lượt này

- Luồng lấy token từ outbox rồi reset mật khẩu qua giao diện.
- Thu hồi phiên khác/logout-all và tự chuyển về đăng nhập khi phiên bị thu hồi từ thiết bị khác.
- Chỉnh quyền/trạng thái bằng giao diện quản trị với tài khoản admin thật.
- Phân trang khi catalog có trên 12 mẫu, thay đổi sản phẩm trong lúc giỏ đang mở, kiểm tra toàn diện bằng trình đọc màn hình.
- CI trên dịch vụ ngoài, deployment public, tải đồng thời và mục tiêu hiệu năng.

Các màn hình trên đã được triển khai theo DTO/controller hiện có, nhưng không coi việc build thành công là bằng chứng đã kiểm thử tất cả các luồng.

## Ghi chú chạy trên Windows bị giới hạn quyền

Trong sandbox hiện tại, esbuild của Vite dev báo không đọc được thư mục cha khi tối ưu dependency. `npm run build` dùng native config loader và **build + preview chạy thành công**. Website ở cổng 5173 hiện được phục vụ bằng preview. Chế độ hot reload cần kiểm tra lại trong terminal thông thường; đây là giới hạn môi trường đã ghi nhận, không phải kết quả dev server đã đạt kiểm thử.
