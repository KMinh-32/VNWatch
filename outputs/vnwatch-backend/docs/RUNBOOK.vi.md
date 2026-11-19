# Chạy VNWatch — phần 01–02

## Chuẩn bị

- Node.js 24 LTS, từ 24.15 trong nhánh 24.x; npm đi kèm.
- PostgreSQL 17, bằng Docker Compose hoặc bản đã cài trên máy.
- Mở terminal tại thư mục chứa `package.json` của dự án.
- Chỉ dữ liệu demo ở thời điểm này. Đã có danh mục và tài khoản; chưa có đặt hàng.

Giao diện React + TypeScript nằm ở thư mục `vnwatch-frontend` cạnh backend. Xem `../vnwatch-frontend/HUONG-DAN.vi.md` từ thư mục backend. Website chạy ở `http://127.0.0.1:5173`; `/docs` ở cổng 3000 là tài liệu API.

## Cách A: Docker Compose

```powershell
Copy-Item .env.example .env
```

Đổi `replace-with-your-local-password` trong `POSTGRES_PASSWORD`, `DATABASE_URL` và `TEST_DATABASE_URL` thành cùng một mật khẩu local. Không commit `.env`. File mẫu chỉ chứa placeholder.

```powershell
docker compose --profile test up -d --wait
npm ci
npm run db:migrate
npm run db:seed
npm start
```

Nếu muốn tạo một quản trị viên local (chỉ chạy một lần trên database dev), không ghi mật khẩu vào `.env`; đặt biến tạm trong PowerShell rồi chạy:

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL = 'admin@example.test'
$env:BOOTSTRAP_ADMIN_PASSWORD = 'A strong local password 2026!'
$env:BOOTSTRAP_ADMIN_NAME = 'Local Admin'
npm run db:bootstrap-admin
Remove-Item Env:BOOTSTRAP_ADMIN_EMAIL, Env:BOOTSTRAP_ADMIN_PASSWORD, Env:BOOTSTRAP_ADMIN_NAME
```

Script từ chối nếu database không phải loopback/dev hoặc đã có admin. Không dùng lệnh này trên production.

DB phát triển ở cổng 54329; DB kiểm thử riêng ở 54330. Compose chỉ công bố các cổng trên loopback. Database dev dùng volume; database test dùng tmpfs. `docker compose down` dừng dịch vụ và giữ volume dev. Chạy lại `up` để tiếp tục.

## Cách B: PostgreSQL có sẵn trên Windows

Helper dùng `initdb`, `postgres`, `createdb` trong thư mục PostgreSQL đã cài. Nó tạo cluster mới, hai database riêng, mật khẩu ngẫu nhiên và `.env`; không đọc cấu hình hay dữ liệu của cluster đang dùng.

Khi chưa có `.env`:

```powershell
.\scripts\start-local-postgres.ps1 -PgBin 'C:\Program Files\PostgreSQL\17\bin'
npm ci
npm run db:migrate
npm run db:seed
npm start
```

Mặc định cluster nằm ở `work/postgres` bên trong dự án; có thể truyền `-DataDirectory 'D:\your-work\vnwatch-postgres'` và `-Port 54329`. Helper từ chối ghi đè `.env` hoặc khởi tạo lại cluster cũ. Cả hai URL sử dụng cùng cổng nhưng database khác tên; test còn tạo schema riêng cho mỗi lần chạy.

Sau khi đóng máy, khởi động lại cluster đã tạo bằng lệnh dưới đây, thay `$vnDataPath` bằng đường dẫn helper đã in:

```powershell
$vnDataPath = Join-Path (Get-Location) 'work\postgres'
Start-Process -FilePath 'C:\Program Files\PostgreSQL\17\bin\postgres.exe' -ArgumentList @('-D', ('"' + $vnDataPath + '"'), '-h', '127.0.0.1', '-p', '54329', '-c', 'timezone=UTC') -WindowStyle Hidden
npm start
```

Dừng cluster này bằng:

```powershell
& 'C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe' -D $vnDataPath -m fast -w stop
```

Không dùng đường dẫn cluster khác. API dừng bằng Ctrl+C. Nếu bạn đã có database dev/test muốn tự cấu hình, tạo `.env` theo file mẫu rồi dùng migration; không chạy helper.

## Kết quả mong đợi

Các ví dụ dưới đây mô tả seed cơ bản ban đầu. Website hiện có mẫu thật, giỏ server, quản trị và coupon theo [COMPLETENESS.vi.md](COMPLETENESS.vi.md); SKU mới từ seed dev khởi tạo tồn 100, không ghi đè tồn đã thay đổi. Database workspace có 12 sản phẩm hiển thị; bộ DEMO vẫn có 2 mẫu. Không chạy reset để nhận tính năng mới.

```powershell
Invoke-RestMethod 'http://localhost:3000/api/v1/health/ready'
Invoke-RestMethod 'http://localhost:3000/api/v1/products?maxPriceVnd=2000000'
```

- Readiness trả `{"status":"ok"}` khi truy vấn DB thành công.
- Danh mục không lọc có `meta.total = 2` trên DB demo mới.
- Lọc `maxPriceVnd=2000000` trả một mẫu `DEMO Everyday`, chỉ SKU `DEMO-EVERYDAY-BLACK`, giá 1.500.000 VND.
- SKU `DEMO-AUTOMATIC` mới từ seed có tồn 100; khi tồn thực sự bằng 0, vẫn xem được nhưng `inStock=false`.
- Sản phẩm ngừng bán trả HTTP 404. Tham số `limit=51` trả 400, mã `VALIDATION_ERROR` và thông báo tiếng Việt.
- Swagger: <http://localhost:3000/docs>. JSON: <http://localhost:3000/docs-json>.

## Demo Auth và Users bằng Swagger

1. Mở `http://localhost:3000/docs`.
2. `POST /api/v1/auth/register`: đăng ký customer bằng email, tên hiển thị và mật khẩu tối thiểu 15 ký tự.
3. `POST /api/v1/auth/login`: copy trường `sessionToken` trong response. Đây là token bí mật, chỉ dùng trong terminal/demo và không đưa vào URL.
4. Bấm `Authorize`, nhập `Bearer <sessionToken>`, sau đó gọi `GET /api/v1/users/me`, `GET /api/v1/auth/sessions` và `PATCH /api/v1/users/me`.
5. Gọi `POST /api/v1/auth/logout`; token cũ phải nhận 401.
6. Nếu đã bootstrap admin, đăng nhập admin rồi gọi `GET /api/v1/users`. Chỉ admin được gọi `PATCH /api/v1/users/{id}/access`. Mỗi thay đổi quyền/trạng thái thu hồi phiên của tài khoản đích và ghi audit event.

Reset password trong demo không gửi email. Gọi `POST /api/v1/auth/forgot-password`, mở file JSON mới trong `work/mail-outbox`, lấy token, rồi gửi token và mật khẩu mới vào `POST /api/v1/auth/reset-password`. Token hết hạn sau 15 phút và chỉ dùng một lần.

## Kiểm tra trước khi bàn giao

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run openapi:export
```

`npm test` phải có PostgreSQL thật. Không tự bỏ qua integration test khi thiếu DB. Bộ kiểm thử từ chối dùng `DATABASE_URL` thay cho `TEST_DATABASE_URL`. Mỗi lần chạy áp dụng migration từ đầu trong schema ngẫu nhiên và dọn đúng schema đó; database thử phải có hậu tố `_test` và ở loopback.

Lệnh `npm run start:dev` theo dõi thay đổi TypeScript. Chạy `npm run db:generate` trước nếu vừa cài package hoặc sửa Prisma schema. Dùng SQL migration để giữ các CHECK constraint mà Prisma schema chưa biểu diễn được; không thay migration bằng `db push`.

## Reset dữ liệu demo

Đây là thao tác xóa toàn bộ dữ liệu trong schema dev đang cấu hình. Chỉ dùng khi bạn chủ động muốn reset, không cần cho chạy thường ngày:

```powershell
npm run db:reset:dev -- --confirm=vnwatch_dev
npm run db:seed
```

Script yêu cầu `NODE_ENV=development`, host loopback và đúng tên `vnwatch_dev`. Seed đơn lẻ không reset số tồn đã sửa.

## Giới hạn vận hành

Compose hiện cung cấp DB; API chạy trên Node.js của máy. Chưa có Docker image cho API, triển khai public, backup/restore đã diễn tập hoặc CI đã chạy trên GitHub. Trạng thái bằng chứng ghi tại `VERIFICATION.vi.md`. Không coi khởi động local thành công là đã đủ điều kiện vận hành kinh doanh.
