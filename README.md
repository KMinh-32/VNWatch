# VNWatch

Website bán đồng hồ và ứng dụng quản lý trên Windows, có chatbot tư vấn dựa trên catalog.

## Công nghệ

- React + TypeScript + Vite: giao diện cửa hàng và giao diện quản lý.
- NestJS + Prisma + PostgreSQL 17: REST API, tài khoản, sản phẩm, giỏ hàng, đơn hàng.
- FastAPI: chatbot tư vấn theo catalog; có thể cấu hình OpenAI.
- Electron: ứng dụng quản lý dành cho quản trị viên.
- Docker Compose + Nginx API Gateway: chạy các dịch vụ cùng nhau.

## Chạy bằng Docker

1. Cài và mở Docker Desktop, sử dụng Linux containers.
2. Clone repository và mở thư mục dự án.
3. Trên Windows, chạy `START-DOCKER.cmd`. Lần đầu cần Internet để build image.
4. Mở <http://localhost:5180/>. Swagger: <http://localhost:5180/docs>.

Script tự tạo `.env.docker` với mật khẩu và token mới. Database mới được tạo bằng
Prisma migrations và catalog seed. Đăng ký tài khoản khách hàng trên website;
chạy `CREATE-ADMIN.cmd` để tạo quản trị viên đầu tiên.

Giá sản phẩm là dữ liệu tham khảo; tồn kho khởi tạo, COD và QR phục vụ demo.
Chatbot dùng catalog khi chưa cấu hình OpenAI API key.

## Mã nguồn và tài liệu

| Thành phần | Thư mục |
| --- | --- |
| Website React | `outputs/vnwatch-frontend` |
| API NestJS và Prisma migrations | `outputs/vnwatch-backend` |
| Chatbot FastAPI | `outputs/vnwatch-agent` |
| Ứng dụng quản lý Electron | `outputs/vnwatch-manager` |
| Cấu trúc PostgreSQL | [database/schema.sql](database/schema.sql) |

- [Hướng dẫn Docker](DOCKER.vi.md)
- [Kiến trúc Web Services](docs/architecture/WEB-SERVICES.vi.md)
- [Ứng dụng quản lý](DESKTOP.vi.md)
- [Hướng dẫn học mã nguồn](HOC-CODE.vi.md)
- [Tài liệu dự án](README.vi.md)

Repository chứa mã nguồn, ảnh catalog, cấu hình mẫu, tài liệu và kiểm thử.
File `.env` thật, backup chứa dữ liệu tài khoản/đơn hàng, lịch sử chat cá nhân,
dependencies, bộ cài và kết quả build được bỏ qua bằng `.gitignore`.
