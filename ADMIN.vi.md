# Quản trị VNWatch bằng ứng dụng Windows — 11/10/2026

## Mở phần mềm quản trị

1. Bấm **VNWatch Manager** trên Desktop/menu Start hoặc **OPEN-MANAGER.cmd** trong **D:\VNWatch**.
2. Ứng dụng tự kiểm tra và khởi động backend Docker. Chờ thanh trạng thái báo đã kết nối.
3. Đăng nhập bằng tài khoản ADMIN đã tạo. CUSTOMER/STAFF và ADMIN bị khóa không được đăng nhập quản trị.

Bộ cài và mã nguồn ứng dụng: [DESKTOP.vi.md](DESKTOP.vi.md). Đường dẫn /admin trên website chỉ thông báo mở phần mềm; website mua hàng không còn các nút quản trị.

Nếu chưa có admin đầu tiên, dùng CREATE-ADMIN.cmd và mật khẩu 15–128 ký tự. Khi đã có ADMIN đang hoạt động, helper từ chối tạo thêm; dùng **Tài khoản → Thêm tài khoản** trong app. Backend kiểm tra quyền trên mọi API quản trị; đổi quyền/trạng thái thu hồi phiên của tài khoản đích.

Ứng dụng cần đăng nhập lại sau khi đóng hoặc tải lại. Yêu cầu tạo đơn chưa rõ kết quả được giữ theo admin trong sessionStorage của cửa sổ hiện tại để thử lại cùng mã, tránh tạo trùng. Nên xử lý yêu cầu đang chờ trước khi đóng cửa sổ.

## Các chức năng

| Mục | Thao tác |
| --- | --- |
| Tổng quan | Doanh thu đã thanh toán demo, đơn hoàn tất, số khách, tồn kho, yêu cầu hỗ trợ, SKU bán chạy/tồn thấp; xuất CSV |
| Sản phẩm & kho | Xem/tìm, thêm sản phẩm DEMO và phiên bản, sửa tên/ảnh/mô tả/thông số/giá/tồn/trạng thái; xóa khỏi cửa hàng bằng ngừng kinh doanh |
| Đơn hàng | Tìm theo mã UUID, người nhận, email, số điện thoại; lọc trạng thái/thanh toán/lưu trữ; tạo cho tài khoản ACTIVE, sửa thông tin giao hàng, xác nhận/giao/hoàn tất/hủy |
| Tài khoản | Tìm/lọc, tạo CUSTOMER/STAFF/ADMIN, sửa tên và quyền/trạng thái trong một transaction, khóa/mở tài khoản, thu hồi phiên, mở khóa đăng nhập tạm thời |
| Khuyến mãi | Tạo mã giảm cố định VND với ngày hiệu lực, giới hạn lượt toàn hệ thống/mỗi khách; bật/tắt mã |
| Hỗ trợ | Xem hội thoại của khách, phản hồi và đóng yêu cầu |
| Đánh giá | Xem và ẩn/hiện đánh giá |
| Nhật ký | Người thao tác, lý do, thời gian, dữ liệu trước/sau của thay đổi quản trị |

STAFF và CUSTOMER vẫn được mua hàng bằng tài khoản của mình, không có quyền quản lý. Không thể khóa/hạ quyền ADMIN cuối cùng đang hoạt động. Mở khóa đăng nhập tạm thời chỉ xóa lockout do nhập sai mật khẩu; không đổi trạng thái BLOCKED sang ACTIVE.

## Quy tắc đơn và xóa dữ liệu

- Đơn do admin tạo thuộc tài khoản khách; giỏ khách không bị sửa. Giá được tính trên server, tồn được khóa/trừ trong transaction; mã giảm tính giới hạn theo khách, không theo admin.
- Chỉ sửa người nhận, điện thoại và địa chỉ khi đơn chưa giao (PENDING/CONFIRMED, NOT_SHIPPED). Giá và sản phẩm đã chốt không được thay đổi.
- Xóa đơn chỉ áp dụng cho COMPLETED/CANCELLED và chuyển sang lưu trữ. Đơn biến mất khỏi danh sách mặc định nhưng khách vẫn xem lịch sử; tồn, doanh thu và bảo hành không thay đổi. Chọn **Đã lưu trữ → Khôi phục đơn hàng** để đưa về danh sách.
- Xóa sản phẩm chuyển trạng thái DISCONTINUED, ẩn khỏi catalog và chặn đặt mới. Lịch sử đơn vẫn giữ snapshot cũ. Để mở bán lại, sửa trạng thái sang ACTIVE.
- Hủy đơn hoàn tồn đúng một lần, không mở lại đơn đã hủy và không trả lại lượt mã giảm.
- Sửa sản phẩm/tồn/giao hàng và lưu trữ dùng phiên bản dữ liệu; bản sửa cũ nhận HTTP 409 và cần tải lại.
- QR và việc thu COD vẫn là mô phỏng, không chuyển tiền hoặc giao hàng thật.

## Điều hướng từ tổng quan

Bấm vào sáu ô thống kê để mở danh sách tương ứng. Doanh thu và đơn hoàn tất mở đơn COMPLETED + PAID, gồm cả đơn đã lưu trữ; Khách hàng mở tài khoản CUSTOMER; Mẫu sản phẩm mở toàn bộ sản phẩm; Tồn đang bán mở sản phẩm ACTIVE và chỉ hiển thị SKU ACTIVE; Yêu cầu đang mở gồm OPEN và IN_REVIEW. Bộ lọc chạy trên server trước phân trang.

URL lưu mục và bộ lọc ban đầu. Có thể dùng Quay lại/Tiến tới; chọn mục trên thanh quản trị để mở danh sách mặc định. Màn hình tự cuộn tới đầu nội dung vừa chọn khi chuyển mục.

## Mã nguồn và API

Frontend: outputs/vnwatch-frontend/src/AdminPortal.tsx, AdminUsers.tsx, AdminCreateOrder.tsx, AdminOrderTools.tsx; dùng lại Management.tsx, Orders.tsx và Shopping.tsx.

Backend: outputs/vnwatch-backend/src/auth, users, orders, shop. Migration mới chỉ thêm orders.archived_at, constraint đơn kết thúc và index, không reset dữ liệu.

API chính: POST /api/v1/auth/admin/login; /api/v1/management/*; POST /api/v1/orders/manage/quote và /manage; PATCH/DELETE /api/v1/orders/:id; POST /:id/restore; POST/PATCH /api/v1/users và /:id; POST /:id/revoke-sessions, /:id/unlock-login. Swagger tại **http://127.0.0.1:5180/docs**.

Bản sao trước migration: docker/backups/vnwatch-pre-admin-20261009.dump. Sau migration dữ liệu cửa hàng vẫn là 53 tài khoản, 13 sản phẩm, 15 SKU, 13 đơn; chưa tạo admin thật.

## Kiểm thử

Backend 84/84 kiểm thử đạt trên database vnwatch_test trong Docker. Bộ mới kiểm tra quyền trên 28 endpoint, đăng nhập admin, tạo đơn đồng thời/idempotency/coupon/cart, sửa stale/mass assignment, archive/restore, ẩn/khôi phục sản phẩm, tạo/băm mật khẩu, thu hồi phiên, bảo vệ admin cuối và bootstrap đồng thời.

Kiểm thử ứng dụng Electron thật đã đạt: đăng nhập STAFF bị từ chối, dashboard, cả 6 ô thống kê mở đúng danh sách/bộ lọc, bàn phím Enter, Quay lại/Tiến tới và cuộn tới đầu mục trên mobile, tạo đơn mất phản hồi/reload/thử lại không trùng, sửa/hủy/lưu trữ/khôi phục, thêm/khóa tài khoản và thu hồi phiên, thêm/sửa/ngừng sản phẩm, các mục quản trị, đăng xuất; không lỗi JavaScript hoặc tràn ngang mobile 390 px.

Kiểm thử giao diện dùng API fixture riêng thuộc profile test, cổng 5301, schema tạm; các tài khoản fixture không tồn tại trong database cửa hàng.

```powershell
# Sau khi build image tools và khởi động db:
docker compose --env-file .env.docker --profile test run --rm test-backend
docker compose --env-file .env.docker --profile test up -d test-admin-ui
cd outputs/vnwatch-frontend
$env:VNWATCH_WEB_URL="http://127.0.0.1:5180"
$env:VNWATCH_EDGE_PATH="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
npm test -- tests/admin-portal.spec.ts
cd ../..
docker compose --env-file .env.docker --profile test stop test-admin-ui
```

Không dùng down -v nếu cần giữ database.
