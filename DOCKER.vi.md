# VNWatch chạy bằng Docker — 09/10/2026

Bộ Docker đầy đủ nằm tại **D:\\VNWatch\\compose.yaml**. Compose cũ ở thư mục backend chỉ dành cho PostgreSQL khi phát triển trên Windows.

## Chạy website

Mở Docker Desktop ở chế độ Linux containers, rồi bấm đúp **D:\\VNWatch\\START-DOCKER.cmd**. Lần đầu cần mạng để tải image và dependency. Mở **http://127.0.0.1:5180/**; Swagger ở **http://127.0.0.1:5180/docs**.

Hoặc mở PowerShell tại thư mục dự án:

```powershell
cd D:\VNWatch
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\docker\setup.ps1
docker compose --env-file .env.docker up -d --build --wait --wait-timeout 180
docker compose --env-file .env.docker ps
```

Script setup tạo mật khẩu database và token nội bộ ngẫu nhiên, giữ nguyên cấu hình khi chạy lại. Thay WEB_PORT trong .env.docker nếu cổng 5180 đã được dùng. OPENAI_API_KEY để trống thì trợ lý vẫn tư vấn theo catalog; key chỉ đi vào container FastAPI, không vào frontend hay image. QR vẫn là demo, không chuyển tiền thật.

## Cấu trúc

- gateway: Nginx nhận cổng host 127.0.0.1:5180, định tuyến /api và /docs tới backend, các trang và assets tới frontend.
- frontend: React/TypeScript build thành file tĩnh, Nginx phục vụ ở cổng 8080 trong mạng Docker.
- backend: NestJS/TypeScript trên Node 24, chạy bằng user node; gateway chuyển /api và /docs vào backend.
- agent: FastAPI/Python 3.12, chạy bằng user agent; backend gọi qua mạng Docker với token chung.
- db: PostgreSQL 17, không mở cổng database ra Windows.
- init: chạy migration và thêm catalog còn thiếu trước khi backend khởi động; kết thúc với mã 0 là trạng thái bình thường.

Các dịch vụ chờ healthcheck và init theo [hướng dẫn Docker Compose](https://docs.docker.com/compose/how-tos/startup-order/). Backend/frontend sử dụng [build nhiều giai đoạn](https://docs.docker.com/build/building/multi-stage/). Base image được ghim digest của bản đã kiểm tra; cập nhật digest có chủ đích khi nâng cấp.

Named volume **vnwatch-docker_postgres_data** giữ database; **vnwatch-docker_reset_mail** giữ thư đặt lại mật khẩu demo. Đây vẫn là demo cục bộ, NODE_ENV=development vì adapter email hiện dùng outbox nội bộ. Bộ này không phải cấu hình public production/domain/HTTPS.

Docker Desktop quản lý volume trong Linux VM/WSL, không trực tiếp dùng thư mục PostgreSQL Windows ở D:\VNWatch\work. Nếu muốn chuyển nơi Docker Desktop lưu toàn bộ image/volume sang ổ D, cần thực hiện trong cài đặt Docker Desktop; di chuyển mã nguồn sang D không tự chuyển kho Docker.

## Dữ liệu hiện tại

Đã nhập bản sao dữ liệu Windows vào Docker: **53 tài khoản, 13 sản phẩm, 15 SKU, 13 đơn hàng**. Cả 20 bảng public được đối chiếu số dòng và digest nội dung trước khi thử website, không có sai khác. Tài khoản và mật khẩu cũ tiếp tục dùng được; reload trang yêu cầu đăng nhập lại như trước.

Database Windows gốc được giữ nguyên. Hai bản database hoạt động độc lập: đơn hàng tạo ở website Docker 5180 sẽ không tự xuất hiện ở website Windows 5173. Khởi động lại Compose chỉ migration/seed idempotent, không reset tồn kho hoặc dữ liệu người dùng.

Trên máy mới chưa có volume, init tạo schema và catalog với tồn kho demo 100 cho SKU mới. Chỉ có catalog; không tự tạo tài khoản quản trị hay mật khẩu mặc định.

Bản sao lưu ban đầu ở **docker/backups/** chứa dữ liệu tài khoản và đơn hàng; không đưa thư mục này lên Git hay chia sẻ công khai.

## Vận hành

```powershell
# Xem trạng thái và log
docker compose --env-file .env.docker ps -a
docker compose --env-file .env.docker logs --tail 100 backend agent init

# Dừng; volume và dữ liệu được giữ
docker compose --env-file .env.docker down

# Chạy lại sau khi dừng
docker compose --env-file .env.docker up -d --wait --wait-timeout 180

# Rebuild khi sửa mã nguồn
docker compose --env-file .env.docker up -d --build --wait --wait-timeout 180
```

Không dùng down -v khi cần giữ dữ liệu.

Sao lưu database Docker mà không đưa mật khẩu vào dòng lệnh:

```powershell
New-Item -ItemType Directory -Force .\docker\backups | Out-Null
docker compose --env-file .env.docker exec -T db pg_dump -U vnwatch -d vnwatch_dev --schema=public --format=custom --no-owner --no-acl --file=/tmp/vnwatch-backup.dump
$id = docker compose --env-file .env.docker ps -q db
$stamp = Get-Date -Format yyyyMMdd-HHmmss
docker cp "${id}:/tmp/vnwatch-backup.dump" ".\docker\backups\docker-$stamp.dump"
```

Nhập một snapshot **vào database Docker trống trước lần chạy ứng dụng đầu tiên**:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\docker\setup.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\docker\import-snapshot.ps1 -Archive .\docker\backups\ten-snapshot.dump
docker compose --env-file .env.docker up -d --build --wait --wait-timeout 180
```

Helper từ chối database đã có bảng và ứng dụng đang chạy. Restore trong một transaction; không có lệnh tự xóa database hiện có. Xuất dữ liệu Windows khi database local đang chạy: node .\docker\export-local.cjs (cần Node và công cụ PostgreSQL 17 đã cài).

## Kiểm chứng Docker

- Backend **82/82** tests chạy trong image tools trên Linux/PostgreSQL Docker, database **vnwatch_test** riêng; bao gồm đăng nhập, phân quyền, giỏ hàng, COD, QR, tồn kho đồng thời, trợ lý và giới hạn seed demo.
- FastAPI **24/24** tests trong image agent, dùng fixture, không gọi OpenAI thật.
- Qua Nginx: readiness/catalog/Swagger thành công; khách chưa đăng nhập lấy giỏ hàng nhận HTTP 401; trợ lý trả CATALOG và gợi ý từ catalog hiện tại.
- Trình duyệt thật: sản phẩm hiển thị, thêm vào giỏ yêu cầu đăng nhập, chat nhận phản hồi; desktop/mobile 390 px không lỗi JavaScript hoặc tràn ngang. Ảnh ở docker/verification/.
- Chưa thử gọi OpenAI thật hoặc thanh toán thật.

Chạy lại các test sau khi build và khởi động db:

```powershell
docker compose --env-file .env.docker --profile test run --rm test-backend
docker compose --env-file .env.docker --profile test run --rm --no-deps test-agent
```

Service test-backend dùng namespace mạng của db nên test kết nối loopback tới vnwatch_test đúng điều kiện bảo vệ hiện có. Mỗi integration suite tự tạo/xóa schema riêng. Không dùng dữ liệu khách hàng để kiểm thử.

## Cho người ở mạng khác xem thử

Bấm SHARE-WEBSITE.cmd để tạo liên kết HTTPS tạm thời, xem liên kết trong SHARE-LINK.txt. Bấm STOP-SHARING.cmd để dừng chia sẻ. Giữ máy tính, Docker Desktop và Internet hoạt động. Liên kết chỉ xem cửa hàng/catalog; các API đăng nhập, quản trị và đặt hàng bị chặn. Hướng dẫn chi tiết trong SHARE.vi.md.

Thiết kế hiện hành, nhóm API và luồng gọi dịch vụ nằm trong [WEB-SERVICES.vi.md](docs/architecture/WEB-SERVICES.vi.md).
