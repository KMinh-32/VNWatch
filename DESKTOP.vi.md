# VNWatch Manager cho Windows — 11/10/2026

## Mở phần mềm

Ứng dụng đã được cài tại **D:\VNWatch\apps\VNWatchManager**. Bấm biểu tượng **VNWatch Manager** trên Desktop/menu Start hoặc **D:\VNWatch\OPEN-MANAGER.cmd**. Dùng tài khoản ADMIN đã tạo để đăng nhập. Khi đóng hoặc tải lại giao diện, cần đăng nhập lại; mật khẩu và token không được lưu trong cấu hình ứng dụng.

Giao diện React/TypeScript được đóng gói bên trong file app.asar của ứng dụng Electron, dùng cửa sổ Windows riêng, không tải trang /admin từ web. Website mua hàng vẫn ở http://127.0.0.1:5180/. Các nút quản trị đã gỡ khỏi web; đường dẫn /admin trả thông báo mở VNWatch Manager.

Ứng dụng tự kiểm tra và khởi động Docker/backend nếu cần. Khi chưa kết nối được, thanh trạng thái hướng dẫn thử lại qua **Khởi động dịch vụ**; đăng nhập chỉ bật khi dịch vụ sẵn sàng. Docker Desktop và project **D:\VNWatch** phải còn trên máy. App dùng backend tại 127.0.0.1:5180 và dữ liệu PostgreSQL hiện có; không chứa database, API key hay tài khoản fixture trong bộ cài. Đóng app không dừng cửa hàng hoặc database.

## Chức năng

Giữ đầy đủ tổng quan/6 ô điều hướng, sản phẩm/SKU/giá/tồn, tạo/sửa/xử lý/lưu trữ/khôi phục đơn, tài khoản/quyền/thu hồi phiên, khuyến mãi, hỗ trợ, kiểm duyệt và nhật ký. Xuất CSV mở hộp thoại lưu file của Windows. Chi tiết nghiệp vụ trong ADMIN.vi.md.

## Bộ cài và gỡ cài đặt

Bộ cài Windows x64: **outputs\vnwatch-manager\release\VNWatch-Manager-Setup-0.1.0.exe**. Đã cài cho người dùng Windows hiện tại, tạo shortcut Desktop và Start Menu. Có thể gỡ trong **Settings → Apps → Installed apps → VNWatch Manager**. Gỡ app không xóa dữ liệu PostgreSQL của cửa hàng.

Bộ cài do dự án tự build, chưa có chứng thư ký số; nếu phân phối sang máy khác, Windows có thể cảnh báo ứng dụng chưa xác định nhà phát hành. Đây chưa phải bản phân phối thương mại.

## Mã nguồn và build

- Tiến trình Electron và preload: outputs/vnwatch-manager/src.
- React dành riêng cho app: outputs/vnwatch-frontend/src/desktop.tsx, AdminPortal.tsx; build vào outputs/vnwatch-manager/ui.
- Cầu nối API: src/api.ts, desktop-bridge.d.ts và vnwatch-manager/src/bridge.ts.
- Tại outputs/vnwatch-manager: npm ci; npm run build; npm start; npm run dist:win.
- Runtime: Electron 44.7.0; bộ cài NSIS tạo bằng electron-builder 26.15.3; lockfile đã lưu.

Renderer dùng sandbox/context isolation, không có Node.js hay quyền chạy shell/đọc file. IPC kiểm tra frame gọi, method/header/body/path; chỉ gọi backend loopback cố định, không theo redirect. Token chỉ ở bộ nhớ, app cố gắng đăng xuất khi đóng. CSP chặn script ngoài gói và kết nối trực tiếp từ renderer. Các API quản trị vẫn kiểm tra ADMIN ở backend.

## Kiểm thử

3 kiểm thử cầu nối API đạt. Kiểm thử Electron thật trên schema fixture riêng đạt: quyền ADMIN/STAFF, 6 ô tổng quan/lịch sử, tạo đơn mất phản hồi và thử lại không trùng, sửa/hủy/lưu trữ/khôi phục, tạo/khóa tài khoản, thêm/sửa/ngừng sản phẩm và đăng xuất. Bộ cài được kiểm tra lại bằng file exe đã cài và dữ liệu thực (đăng nhập, xem catalog, đăng xuất). Website mua hàng được kiểm tra lại: catalog/giỏ yêu cầu đăng nhập/trợ lý/mobile hoạt động bình thường. Backend không đổi schema và không reset dữ liệu.
