# Phần mềm quản trị VNWatch — 11/10/2026

Mở **VNWatch Manager** trên Desktop/menu Start hoặc **OPEN-MANAGER.cmd**. Ứng dụng Windows đã cài tại D:\VNWatch\apps\VNWatchManager, tự kết nối/khởi động backend Docker. Giao diện quản trị được đóng gói bên trong phần mềm; website mua hàng không còn các nút quản trị. Bộ cài và hướng dẫn: [DESKTOP.vi.md](DESKTOP.vi.md). Chức năng và quy tắc dữ liệu: [ADMIN.vi.md](ADMIN.vi.md).

# Chạy VNWatch bằng Docker — 09/10/2026

Mở Docker Desktop, bấm đúp **START-DOCKER.cmd**, rồi mở **http://127.0.0.1:5180/**. Bộ này chạy React/Nginx, NestJS, FastAPI và PostgreSQL cùng nhau. Cấu hình đầy đủ: [compose.yaml](compose.yaml); hướng dẫn, sao lưu và kiểm thử: [DOCKER.vi.md](DOCKER.vi.md).

Database Docker đã nhận bản sao dữ liệu cũ. Database Windows được giữ nguyên; hai bản không tự đồng bộ. Cách chạy Windows cũ ở phần dưới dùng cổng 5173.

# VNWatch trên ổ D — 04/10/2026

Project, dependency, cấu hình và database demo đã chuyển vào `D:\VNWatch`. Bấm đúp **START-VNWATCH.cmd** để chạy, rồi mở http://127.0.0.1:5173/. File chỉ đặt execution policy cho tiến trình PowerShell đang chạy, không đổi cấu hình hệ thống.

Hoặc mở PowerShell 7 tại thư mục này và chạy `./outputs/start-vnwatch.ps1`. Backend ở 3000, trợ lý ở 8000 và PostgreSQL demo ở 54329; log trong `work/demo-logs`. Không reset/seed database để khởi động thông thường.

Mã nguồn: `outputs/vnwatch-frontend`, `outputs/vnwatch-backend`, `outputs/vnwatch-agent`. Khi sửa trong Codex/VS Code, mở thư mục **D:\VNWatch**. Node.js, PostgreSQL và Python nền là các chương trình đã cài trên máy, vẫn dùng vị trí cài đặt hiện có ở ổ C. Môi trường `.venv` của agent đã sửa đường dẫn sang D.

Đã đối chiếu SHA-256 41.856 tệp trước khi sửa đường dẫn/build lại: `relocation-verification.json`. Database được xác nhận chạy từ D, dữ liệu cũ còn nguyên: `relocation-runtime-verification.json`. Build backend/frontend, import Python, readiness, catalog, đăng nhập bắt buộc và giao diện mobile đều đã kiểm tra.

Chức năng và giới hạn demo: [COMPLETENESS.vi.md](outputs/vnwatch-backend/docs/COMPLETENESS.vi.md). Hướng dẫn website: [HUONG-DAN.vi.md](outputs/vnwatch-frontend/HUONG-DAN.vi.md).

## Học mã nguồn

Mã nguồn đã có chú thích tiếng Việt tại hàm/khối và trường dữ liệu. Bắt đầu ở [HOC-CODE.vi.md](HOC-CODE.vi.md), sau đó dùng [chỉ mục file](docs/learning/FILE-INDEX.vi.md). Migration gốc giữ nguyên; bản SQL học tập nằm trong docs/learning/migrations.

## Kiến trúc Web Services

VNWatch dùng API Gateway Nginx trên cổng 5180 để định tuyến tới frontend React và REST API NestJS. Backend gọi dịch vụ chatbot FastAPI bằng HTTP/JSON. [Thiết kế và hướng dẫn Web Services](docs/architecture/WEB-SERVICES.vi.md) · [Sơ đồ draw.io](docs/architecture/VNWatch-Web-Services.drawio).
