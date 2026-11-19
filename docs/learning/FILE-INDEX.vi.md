# Chỉ mục mã nguồn có chú thích tiếng Việt

Bắt đầu với [HOC-CODE.vi.md](../../HOC-CODE.vi.md). Các file dưới đây có chú thích HỌC VNWATCH và chú thích tại hàm/field/khối liên quan. Tìm tên hàm bằng Ctrl+F rồi dùng F12 để đi tới file gọi tiếp theo.

**Phạm vi:** 159 file nguồn/cấu hình và 7 bản SQL học tập. JSON/lockfile được giải thích ở mục 12 của hướng dẫn; thư viện và output sinh tự động không sửa bằng tay.

## Docker và script vận hành

| File | Vai trò cần học |
| --- | --- |
| [.env.docker.example](../../.env.docker.example) | Mẫu cấu hình Docker cục bộ; .env.docker thật giữ secret và không đưa vào git. |
| [.gitignore](../../.gitignore) | Các file Git bỏ qua như dependency, log, build và secret cục bộ; không đồng nghĩa file bị xóa khỏi máy. |
| [compose.share.yaml](../../compose.share.yaml) | Đọc mô tả vai trò ở đầu file và chú thích tại khối xử lý. |
| [compose.yaml](../../compose.yaml) | Cấu hình dịch vụ, health check, volume và kết nối Docker. |
| [CREATE-ADMIN.cmd](../../CREATE-ADMIN.cmd) | Lối tắt gọi PowerShell tạo admin đầu tiên trong môi trường Docker. |
| [docker/admin-ui-api.cjs](../../docker/admin-ui-api.cjs) | Dựng API fixture riêng cho kiểm thử quản trị và dọn schema khi kết thúc; không dùng dữ liệu cửa hàng để test ghi. |
| [docker/create-admin.ps1](../../docker/create-admin.ps1) | Wrapper PowerShell nhận thông tin admin rồi chạy CLI backend trong Docker; không in mật khẩu ra màn hình. |
| [docker/export-local.cjs](../../docker/export-local.cjs) | Xuất snapshot từ database local và ghi metadata phục vụ chuyển dữ liệu sang Docker. |
| [docker/import-snapshot.ps1](../../docker/import-snapshot.ps1) | Nhập bản sao dữ liệu vào PostgreSQL Docker. Đây là thao tác phục hồi dữ liệu, không cần chạy để đọc code. |
| [docker/setup.ps1](../../docker/setup.ps1) | Chuẩn bị môi trường chạy và kiểm tra dependency; đọc từng lệnh trước khi dùng để hiểu file được tạo. |
| [docker/share-nginx.conf](../../docker/share-nginx.conf) | Proxy dành riêng cho chia sẻ: chỉ cho các route mua hàng công khai/cá nhân, chặn route quản trị và giới hạn request. |
| [docker/share.ps1](../../docker/share.ps1) | Bật/tắt tunnel chia sẻ Internet theo lệnh rõ ràng; mặc định học mã không cần bật chia sẻ. |
| [docker/smoke-browser.cjs](../../docker/smoke-browser.cjs) | Kiểm tra nhanh cửa hàng trong trình duyệt: catalog, đăng nhập bắt buộc, trợ lý và màn hình nhỏ. |
| [docker/test-backend.cjs](../../docker/test-backend.cjs) | Chạy bộ kiểm thử backend trong môi trường Docker riêng và thu thập kết quả, không seed/reset database cửa hàng. |
| [docker/verify-manager-installed.cjs](../../docker/verify-manager-installed.cjs) | Kiểm tra file exe đã cài: React đóng gói, sandbox, đăng nhập admin, xem catalog và đăng xuất. |
| [docker/verify-share.cjs](../../docker/verify-share.cjs) | Kiểm tra địa chỉ chia sẻ và các giới hạn truy cập khi chế độ chia sẻ được bật có chủ đích. |
| [docker/verify-snapshot.cjs](../../docker/verify-snapshot.cjs) | Đối chiếu dữ liệu sau chuyển database bằng các kiểm tra số lượng và quan hệ. |
| [OPEN-MANAGER.cmd](../../OPEN-MANAGER.cmd) | Mở file exe quản trị đã cài tại apps/VNWatchManager; báo hướng dẫn cài nếu chưa có. |
| [start-vnwatch.ps1](../../outputs/start-vnwatch.ps1) | Khởi động các tiến trình demo cục bộ và lưu PID/log vào thư mục work để theo dõi. |
| [SHARE-WEBSITE.cmd](../../SHARE-WEBSITE.cmd) | Lối tắt bật chia sẻ website qua Internet; không liên quan đến mở app quản trị cục bộ. |
| [START-DOCKER.cmd](../../START-DOCKER.cmd) | Chạy các dịch vụ Docker của VNWatch và chờ health check; dữ liệu PostgreSQL nằm trong volume. |
| [START-VNWATCH.cmd](../../START-VNWATCH.cmd) | Lối tắt Windows gọi script khởi động demo local; giữ cửa sổ để đọc lỗi nếu khởi động thất bại. |
| [STOP-SHARING.cmd](../../STOP-SHARING.cmd) | Lối tắt dừng tunnel chia sẻ Internet, giữ các dịch vụ cửa hàng local. |

## Trợ lý FastAPI

| File | Vai trò cần học |
| --- | --- |
| [vnwatch-agent/.dockerignore](../../outputs/vnwatch-agent/.dockerignore) | Các đường dẫn không gửi vào Docker build context: dependency, secret và output không nên đi vào image. |
| [vnwatch-agent/.env.example](../../outputs/vnwatch-agent/.env.example) | Mẫu tên biến môi trường; sao chép sang .env và điền giá trị riêng khi cài mới, không đưa key vào React. |
| [vnwatch-agent/.gitignore](../../outputs/vnwatch-agent/.gitignore) | Các file Git bỏ qua như dependency, log, build và secret cục bộ; không đồng nghĩa file bị xóa khỏi máy. |
| [vnwatch-agent/consultant.py](../../outputs/vnwatch-agent/consultant.py) | Trợ lý chỉ đọc: phân tích câu hỏi thành bộ lọc rồi dựng câu trả lời từ catalog/chính sách đã được backend cung cấp. |
| [vnwatch-agent/contracts.py](../../outputs/vnwatch-agent/contracts.py) | Hợp đồng Pydantic giữa NestJS, FastAPI và mô hình. Plan chỉ mô tả truy vấn, không phải lệnh SQL hoặc câu trả lời tự do. |
| [vnwatch-agent/Dockerfile](../../outputs/vnwatch-agent/Dockerfile) | Build image và lệnh khởi động container. |
| [vnwatch-agent/main.py](../../outputs/vnwatch-agent/main.py) | Tạo dịch vụ FastAPI nội bộ: xác thực gateway bằng service token, giới hạn bốn lượt đồng thời và chọn OpenAI/catalog. |
| [vnwatch-agent/requirements-dev.txt](../../outputs/vnwatch-agent/requirements-dev.txt) | Dependency bổ sung để chạy pytest và kiểm thử HTTP/agent. |
| [vnwatch-agent/requirements.lock.txt](../../outputs/vnwatch-agent/requirements.lock.txt) | Danh sách version/hash Python đã khóa để cài dependency nhất quán; không tự sửa version khi chỉ học code. |
| [vnwatch-agent/requirements.txt](../../outputs/vnwatch-agent/requirements.txt) | Dependency Python khai báo trực tiếp để chạy FastAPI/agent. |
| [vnwatch-agent/setup.ps1](../../outputs/vnwatch-agent/setup.ps1) | Chuẩn bị môi trường chạy và kiểm tra dependency; đọc từng lệnh trước khi dùng để hiểu file được tạo. |
| [vnwatch-agent/tests/test_consultant.py](../../outputs/vnwatch-agent/tests/test_consultant.py) | Kiểm thử tự động. Kiểm thử phân tích ngân sách/ý định, catalog/chính sách, nguồn và fallback khi provider lỗi. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup. |

## Backend NestJS / Prisma

| File | Vai trò cần học |
| --- | --- |
| [vnwatch-backend/.dockerignore](../../outputs/vnwatch-backend/.dockerignore) | Các đường dẫn không gửi vào Docker build context: dependency, secret và output không nên đi vào image. |
| [vnwatch-backend/.env.example](../../outputs/vnwatch-backend/.env.example) | Mẫu tên biến môi trường; sao chép sang .env và điền giá trị riêng khi cài mới, không đưa key vào React. |
| [vnwatch-backend/.gitignore](../../outputs/vnwatch-backend/.gitignore) | Các file Git bỏ qua như dependency, log, build và secret cục bộ; không đồng nghĩa file bị xóa khỏi máy. |
| [vnwatch-backend/compose.yaml](../../outputs/vnwatch-backend/compose.yaml) | Cấu hình dịch vụ, health check, volume và kết nối Docker. |
| [vnwatch-backend/Dockerfile](../../outputs/vnwatch-backend/Dockerfile) | Build image và lệnh khởi động container. |
| [vnwatch-backend/eslint.config.mjs](../../outputs/vnwatch-backend/eslint.config.mjs) | Cấu hình quy tắc kiểm tra mã TypeScript của backend; tách file sinh tự động và mã ứng dụng. |
| [vnwatch-backend/prisma/schema.prisma](../../outputs/vnwatch-backend/prisma/schema.prisma) | Schema nguồn: bảng, enum, quan hệ và index. |
| [vnwatch-backend/prisma.config.ts](../../outputs/vnwatch-backend/prisma.config.ts) | Cấu hình CLI Prisma: vị trí schema, migration và URL database đọc từ môi trường. |
| [vnwatch-backend/requests/catalog.http](../../outputs/vnwatch-backend/requests/catalog.http) | Mẫu request cho REST Client: dòng method/URL chọn endpoint, header truyền metadata, JSON là body; ### ngăn các request riêng. |
| [vnwatch-backend/scripts/reset-dev.mjs](../../outputs/vnwatch-backend/scripts/reset-dev.mjs) | Script reset database phát triển có điều kiện xác nhận môi trường; thao tác reset sẽ xóa dữ liệu, không dùng để học thử tùy tiện. |
| [vnwatch-backend/scripts/start-local-postgres.ps1](../../outputs/vnwatch-backend/scripts/start-local-postgres.ps1) | Khởi động PostgreSQL cục bộ từ công cụ phát triển; quản lý đường dẫn, port và dữ liệu của riêng dự án. |
| [vnwatch-backend/src/app.module.ts](../../outputs/vnwatch-backend/src/app.module.ts) | Module gốc tập hợp các module nghiệp vụ. NestJS dùng danh sách imports để lắp ghép ứng dụng và cấp các dependency. |
| [vnwatch-backend/src/assistant/assistant.controller.ts](../../outputs/vnwatch-backend/src/assistant/assistant.controller.ts) | API chat công khai có giới hạn tần suất; giao câu hỏi đã kiểm tra cho gateway trợ lý. |
| [vnwatch-backend/src/assistant/assistant.dto.ts](../../outputs/vnwatch-backend/src/assistant/assistant.dto.ts) | DTO câu hỏi, lịch sử hội thoại và câu trả lời; giới hạn độ dài để kiểm soát tải và dữ liệu đưa vào trợ lý. |
| [vnwatch-backend/src/assistant/assistant.module.ts](../../outputs/vnwatch-backend/src/assistant/assistant.module.ts) | Module assistant: đăng ký controller/provider và imports/exports để NestJS tiêm dependency đúng phạm vi. |
| [vnwatch-backend/src/assistant/assistant.service.ts](../../outputs/vnwatch-backend/src/assistant/assistant.service.ts) | Gateway NestJS lấy catalog công khai rồi gọi FastAPI nội bộ; đối chiếu SKU và nguồn trả về với dữ liệu đã gửi. |
| [vnwatch-backend/src/assistant/knowledge.ts](../../outputs/vnwatch-backend/src/assistant/knowledge.ts) | Kiến thức thương hiệu có nguồn và chính sách của VNWatch được cung cấp cho trợ lý; không phải dữ liệu riêng của user. |
| [vnwatch-backend/src/auth/auth-rate.guard.ts](../../outputs/vnwatch-backend/src/auth/auth-rate.guard.ts) | Giới hạn request theo cửa sổ thời gian, IP và email bằng bộ đếm database; trả 429 khi vượt ngưỡng. |
| [vnwatch-backend/src/auth/auth-transaction.ts](../../outputs/vnwatch-backend/src/auth/auth-transaction.ts) | Các hàm bảo vệ thao tác ghi: khóa user rồi kiểm tra lại phiên trong transaction để tránh quyền bị thu hồi giữa chừng. |
| [vnwatch-backend/src/auth/auth.constants.ts](../../outputs/vnwatch-backend/src/auth/auth.constants.ts) | Tập trung thời hạn phiên/reset và ngưỡng khóa đăng nhập để nghiệp vụ dùng cùng một quy tắc. |
| [vnwatch-backend/src/auth/auth.controller.ts](../../outputs/vnwatch-backend/src/auth/auth.controller.ts) | API xác thực. Mỗi route chỉ rõ public/private, giới hạn tần suất và DTO; login quản trị yêu cầu ADMIN. |
| [vnwatch-backend/src/auth/auth.decorators.ts](../../outputs/vnwatch-backend/src/auth/auth.decorators.ts) | Decorator ghi metadata public và vai trò lên route; SessionGuard sẽ đọc metadata để quyết định quyền truy cập. |
| [vnwatch-backend/src/auth/auth.dto.ts](../../outputs/vnwatch-backend/src/auth/auth.dto.ts) | DTO đăng nhập/đăng ký/reset: chuẩn hóa email, giới hạn chuỗi và mô tả kết quả phiên. |
| [vnwatch-backend/src/auth/auth.module.ts](../../outputs/vnwatch-backend/src/auth/auth.module.ts) | Module auth: đăng ký controller/provider và imports/exports để NestJS tiêm dependency đúng phạm vi. |
| [vnwatch-backend/src/auth/auth.service.ts](../../outputs/vnwatch-backend/src/auth/auth.service.ts) | Nghiệp vụ tài khoản và phiên: đăng ký, đăng nhập, đổi mật khẩu, reset và thu hồi phiên trong database. |
| [vnwatch-backend/src/auth/auth.types.ts](../../outputs/vnwatch-backend/src/auth/auth.types.ts) | Các kiểu TypeScript cho danh tính đã xác thực và request chứa principal. Kiểu không thay thế kiểm tra lúc chạy. |
| [vnwatch-backend/src/auth/password.service.ts](../../outputs/vnwatch-backend/src/auth/password.service.ts) | Băm mật khẩu với scrypt và salt ngẫu nhiên, giới hạn số tác vụ tốn bộ nhớ, so sánh bằng timingSafeEqual. |
| [vnwatch-backend/src/auth/reset-delivery.ts](../../outputs/vnwatch-backend/src/auth/reset-delivery.ts) | Adapter gửi thông tin reset. Bản phát triển ghi outbox cục bộ; không tự gửi email thật. |
| [vnwatch-backend/src/auth/session.guard.ts](../../outputs/vnwatch-backend/src/auth/session.guard.ts) | Guard dùng chung: bỏ qua route public, tra hash Bearer token, kiểm tra phiên/user rồi kiểm tra role. |
| [vnwatch-backend/src/auth/tokens.ts](../../outputs/vnwatch-backend/src/auth/tokens.ts) | Tạo token ngẫu nhiên và hash SHA-256. Client nhận token gốc; database chỉ giữ hash để tra phiên/reset. |
| [vnwatch-backend/src/catalog/catalog.controller.ts](../../outputs/vnwatch-backend/src/catalog/catalog.controller.ts) | Cửa vào HTTP của danh mục công khai. Controller nhận tham số hợp lệ rồi giao việc cho service. |
| [vnwatch-backend/src/catalog/catalog.module.ts](../../outputs/vnwatch-backend/src/catalog/catalog.module.ts) | Module catalog: đăng ký controller/provider và imports/exports để NestJS tiêm dependency đúng phạm vi. |
| [vnwatch-backend/src/catalog/catalog.repository.ts](../../outputs/vnwatch-backend/src/catalog/catalog.repository.ts) | Tầng truy vấn Prisma: lọc mẫu và SKU đang bán, sắp xếp và phân trang trên cùng điều kiện. |
| [vnwatch-backend/src/catalog/catalog.service.ts](../../outputs/vnwatch-backend/src/catalog/catalog.service.ts) | Nghiệp vụ danh mục: kiểm tra khoảng giá, phối hợp repository và chỉ trả các trường công khai. |
| [vnwatch-backend/src/catalog/dto/list-products.dto.ts](../../outputs/vnwatch-backend/src/catalog/dto/list-products.dto.ts) | DTO bộ lọc danh mục. Query HTTP ban đầu là chuỗi; Transform chuyển kiểu và decorator kiểm tra giới hạn. |
| [vnwatch-backend/src/catalog/dto/product-response.dto.ts](../../outputs/vnwatch-backend/src/catalog/dto/product-response.dto.ts) | Các lớp mô tả JSON trả về của mẫu, SKU và trang kết quả; đồng thời dùng để tạo tài liệu Swagger. |
| [vnwatch-backend/src/common/api-error.dto.ts](../../outputs/vnwatch-backend/src/common/api-error.dto.ts) | Mô tả cấu trúc lỗi API thống nhất để client đọc mã lỗi, thông báo, chi tiết và requestId. |
| [vnwatch-backend/src/common/api-exception.filter.ts](../../outputs/vnwatch-backend/src/common/api-exception.filter.ts) | Chuyển exception thành JSON lỗi thống nhất; log lỗi server có mã theo dõi nhưng không trả stack trace cho khách. |
| [vnwatch-backend/src/config.ts](../../outputs/vnwatch-backend/src/config.ts) | Đọc và kiểm tra cấu hình môi trường trước khi chạy; không đặt mật khẩu database trực tiếp trong mã nguồn. |
| [vnwatch-backend/src/configure-app.ts](../../outputs/vnwatch-backend/src/configure-app.ts) | Cấu hình áp dụng cho mọi request: header bảo mật, mã theo dõi, tiền tố API, kiểm tra DTO và định dạng lỗi. |
| [vnwatch-backend/src/database/bootstrap-admin.ts](../../outputs/vnwatch-backend/src/database/bootstrap-admin.ts) | CLI lấy thông tin admin từ đầu vào/môi trường, kiểm tra DTO rồi gọi nghiệp vụ tạo admin đầu tiên. |
| [vnwatch-backend/src/database/create-admin.ts](../../outputs/vnwatch-backend/src/database/create-admin.ts) | Script cục bộ tạo tài khoản admin cho demo với mật khẩu đã được băm; không chạy tự động trên mỗi request. |
| [vnwatch-backend/src/database/database.module.ts](../../outputs/vnwatch-backend/src/database/database.module.ts) | Module database: đăng ký controller/provider và imports/exports để NestJS tiêm dependency đúng phạm vi. |
| [vnwatch-backend/src/database/demo-data.ts](../../outputs/vnwatch-backend/src/database/demo-data.ts) | Dữ liệu giả có ID ổn định để demo và kiểm thử. Upsert với update rỗng không ghi đè chỉnh sửa nghiệp vụ. |
| [vnwatch-backend/src/database/demo-target.ts](../../outputs/vnwatch-backend/src/database/demo-target.ts) | Nhận diện database/schema demo được phép thao tác bằng các script demo, tránh tác động nhầm dữ liệu khác. |
| [vnwatch-backend/src/database/first-admin.ts](../../outputs/vnwatch-backend/src/database/first-admin.ts) | Tạo ADMIN đầu tiên dưới khóa database; từ chối nếu đã có admin hoặc email đã tồn tại, không tự nâng quyền user. |
| [vnwatch-backend/src/database/prisma.service.ts](../../outputs/vnwatch-backend/src/database/prisma.service.ts) | Dependency database dùng chung: tạo adapter PostgreSQL, kết nối khi module sẵn sàng và đóng pool khi dừng. |
| [vnwatch-backend/src/database/reference-data.ts](../../outputs/vnwatch-backend/src/database/reference-data.ts) | Catalog sản phẩm thật có nguồn và mốc tra cứu cố định. Seed không tự làm mới giá, ảnh hay tồn mỗi lần chạy. |
| [vnwatch-backend/src/database/restock-demo.ts](../../outputs/vnwatch-backend/src/database/restock-demo.ts) | Script nhập tồn cho môi trường demo và lưu bằng chứng thay đổi. Không chạy script này chỉ để đọc/học mã nguồn. |
| [vnwatch-backend/src/database/seed.ts](../../outputs/vnwatch-backend/src/database/seed.ts) | Script khởi tạo catalog demo/tham khảo sau migration; kiểm tra đúng môi trường và luôn đóng kết nối sau khi chạy. |
| [vnwatch-backend/src/export-openapi.ts](../../outputs/vnwatch-backend/src/export-openapi.ts) | Xuất đặc tả OpenAPI ra file tài liệu. Đây là script phát triển, không phải endpoint phục vụ khách hàng. |
| [vnwatch-backend/src/health/health.controller.ts](../../outputs/vnwatch-backend/src/health/health.controller.ts) | Health check: liveness cho biết tiến trình còn chạy; readiness kiểm tra khả năng truy cập database. |
| [vnwatch-backend/src/main.ts](../../outputs/vnwatch-backend/src/main.ts) | Điểm khởi động NestJS: tạo ứng dụng, gắn cấu hình dùng chung, mở HTTP và xử lý lỗi khởi động. |
| [vnwatch-backend/src/openapi.ts](../../outputs/vnwatch-backend/src/openapi.ts) | Tạo tài liệu OpenAPI/Swagger từ controller và DTO để tra cứu và thử API. |
| [vnwatch-backend/src/orders/admin-order.dto.ts](../../outputs/vnwatch-backend/src/orders/admin-order.dto.ts) | DTO admin tạo đơn cho khách, sửa giao nhận và lưu trữ. expectedUpdatedAt phát hiện dữ liệu đã thay đổi. |
| [vnwatch-backend/src/orders/order-response.dto.ts](../../outputs/vnwatch-backend/src/orders/order-response.dto.ts) | Mô tả snapshot dòng hàng, lịch sử và JSON đơn trả về; giá trong đơn là giá tại thời điểm tạo. |
| [vnwatch-backend/src/orders/order.dto.ts](../../outputs/vnwatch-backend/src/orders/order.dto.ts) | DTO báo giá/tạo đơn/chuyển trạng thái: chỉ nhận SKU và số lượng, không tin đơn giá do client tự tính. |
| [vnwatch-backend/src/orders/orders.controller.ts](../../outputs/vnwatch-backend/src/orders/orders.controller.ts) | API đơn hàng cá nhân và quản trị. Tạo đơn yêu cầu Idempotency-Key; UUID, DTO và quyền được kiểm tra ở cửa vào. |
| [vnwatch-backend/src/orders/orders.module.ts](../../outputs/vnwatch-backend/src/orders/orders.module.ts) | Module orders: đăng ký controller/provider và imports/exports để NestJS tiêm dependency đúng phạm vi. |
| [vnwatch-backend/src/orders/orders.service.ts](../../outputs/vnwatch-backend/src/orders/orders.service.ts) | Nghiệp vụ đơn hàng: báo giá từ database, tạo đơn chống trùng, trừ/hoàn tồn trong transaction và kiểm soát trạng thái. |
| [vnwatch-backend/src/shop/shop.controller.ts](../../outputs/vnwatch-backend/src/shop/shop.controller.ts) | Nhóm route mua sắm cá nhân và quản trị. Quyền ở controller được bổ sung bằng kiểm tra phiên khi service ghi dữ liệu. |
| [vnwatch-backend/src/shop/shop.dto.ts](../../outputs/vnwatch-backend/src/shop/shop.dto.ts) | DTO dữ liệu mua sắm và quản trị; kiểm tra số lượng, URL ảnh, giá/tồn, timestamp và lý do thay đổi. |
| [vnwatch-backend/src/shop/shop.module.ts](../../outputs/vnwatch-backend/src/shop/shop.module.ts) | Module shop: đăng ký controller/provider và imports/exports để NestJS tiêm dependency đúng phạm vi. |
| [vnwatch-backend/src/shop/shop.service.ts](../../outputs/vnwatch-backend/src/shop/shop.service.ts) | Nghiệp vụ giỏ hàng, yêu thích, địa chỉ, bảo hành, hỗ trợ và quản trị catalog/khuyến mãi/báo cáo. |
| [vnwatch-backend/src/users/admin-user.dto.ts](../../outputs/vnwatch-backend/src/users/admin-user.dto.ts) | DTO tạo/sửa tài khoản bởi admin, kèm lý do thao tác để ghi nhật ký. |
| [vnwatch-backend/src/users/user-mapping.ts](../../outputs/vnwatch-backend/src/users/user-mapping.ts) | Chọn và ánh xạ trường user được phép trả ra; passwordHash và dữ liệu đăng nhập nội bộ không đi ra client. |
| [vnwatch-backend/src/users/user.dto.ts](../../outputs/vnwatch-backend/src/users/user.dto.ts) | DTO hồ sơ, phân trang và cập nhật quyền; decorator mô tả dữ liệu được phép gửi vào API. |
| [vnwatch-backend/src/users/users.controller.ts](../../outputs/vnwatch-backend/src/users/users.controller.ts) | API hồ sơ và quản trị user: route cá nhân nhận principal, route quản trị có điều kiện ADMIN. |
| [vnwatch-backend/src/users/users.module.ts](../../outputs/vnwatch-backend/src/users/users.module.ts) | Module users: đăng ký controller/provider và imports/exports để NestJS tiêm dependency đúng phạm vi. |
| [vnwatch-backend/src/users/users.service.ts](../../outputs/vnwatch-backend/src/users/users.service.ts) | Đọc/sửa hồ sơ và quản trị tài khoản. Thay quyền phải giữ ít nhất một ADMIN hoạt động, thu hồi phiên và ghi nhật ký. |
| [vnwatch-backend/test/admin.integration.test.ts](../../outputs/vnwatch-backend/test/admin.integration.test.ts) | Kiểm thử tự động. Kiểm tra role ADMIN/STAFF, tài khoản, sản phẩm, đơn thủ công, bảo vệ admin cuối cùng và audit. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup. |
| [vnwatch-backend/test/assistant.integration.test.ts](../../outputs/vnwatch-backend/test/assistant.integration.test.ts) | Kiểm thử tự động. Kiểm tra gateway trợ lý, catalog/nguồn hợp lệ, dữ liệu riêng tư và phản hồi agent sai. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup. |
| [vnwatch-backend/test/auth.integration.test.ts](../../outputs/vnwatch-backend/test/auth.integration.test.ts) | Kiểm thử tự động. Kiểm tra đăng ký, hash mật khẩu, phiên, khóa đăng nhập, rate limit và reset token dùng một lần. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup. |
| [vnwatch-backend/test/catalog.integration.test.ts](../../outputs/vnwatch-backend/test/catalog.integration.test.ts) | Kiểm thử tự động. Kiểm tra lọc cùng SKU, mẫu/SKU ACTIVE, phân trang, constraints và rollback. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup. |
| [vnwatch-backend/test/demo-target.unit.test.ts](../../outputs/vnwatch-backend/test/demo-target.unit.test.ts) | Kiểm thử tự động. Kiểm tra whitelist database/schema để script demo không chạy nhầm. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup. |
| [vnwatch-backend/test/health.unit.test.ts](../../outputs/vnwatch-backend/test/health.unit.test.ts) | Kiểm thử tự động. Kiểm tra liveness/readiness khi database hoạt động hoặc lỗi. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup. |
| [vnwatch-backend/test/helpers/auth-context.ts](../../outputs/vnwatch-backend/test/helpers/auth-context.ts) | Kiểm thử tự động. Fixture chuẩn bị danh tính/dữ liệu riêng để xác nhận hành vi API. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup. |
| [vnwatch-backend/test/orders.integration.test.ts](../../outputs/vnwatch-backend/test/orders.integration.test.ts) | Kiểm thử tự động. Kiểm tra snapshot giá, quyền sở hữu, idempotency, tạo đơn đồng thời, trừ/hoàn tồn và chuyển trạng thái. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup. |
| [vnwatch-backend/test/qr-demo.integration.test.ts](../../outputs/vnwatch-backend/test/qr-demo.integration.test.ts) | Kiểm thử tự động. Kiểm tra ma trận QR demo, chủ sở hữu, thanh toán lặp và điều kiện chuyển trạng thái. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup. |
| [vnwatch-backend/test/reference-catalog.integration.test.ts](../../outputs/vnwatch-backend/test/reference-catalog.integration.test.ts) | Kiểm thử tự động. Kiểm tra catalog mẫu thật có nguồn và nguyên tắc nhập lại không ghi đè. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup. |
| [vnwatch-backend/test/shop.integration.test.ts](../../outputs/vnwatch-backend/test/shop.integration.test.ts) | Kiểm thử tự động. Kiểm tra giỏ riêng, yêu thích, địa chỉ, giảm giá, bảo hành, hỗ trợ, đánh giá và optimistic update. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup. |

## Frontend React / TypeScript

| File | Vai trò cần học |
| --- | --- |
| [vnwatch-frontend/.dockerignore](../../outputs/vnwatch-frontend/.dockerignore) | Các đường dẫn không gửi vào Docker build context: dependency, secret và output không nên đi vào image. |
| [vnwatch-frontend/.gitignore](../../outputs/vnwatch-frontend/.gitignore) | Các file Git bỏ qua như dependency, log, build và secret cục bộ; không đồng nghĩa file bị xóa khỏi máy. |
| [vnwatch-frontend/desktop.html](../../outputs/vnwatch-frontend/desktop.html) | Khung HTML riêng được đóng gói vào Electron; root được desktop.tsx gắn giao diện quản trị. |
| [vnwatch-frontend/Dockerfile](../../outputs/vnwatch-frontend/Dockerfile) | Build image và lệnh khởi động container. |
| [vnwatch-frontend/index.html](../../outputs/vnwatch-frontend/index.html) | Khung HTML của cửa hàng: metadata/font, thẻ root và module khởi động React. |
| [vnwatch-frontend/nginx.conf](../../outputs/vnwatch-frontend/nginx.conf) | Nginx phục vụ web đã build, proxy /api tới NestJS và trả thông báo mở app cho /admin. |
| [vnwatch-frontend/playwright.config.ts](../../outputs/vnwatch-frontend/playwright.config.ts) | Cấu hình kiểm thử giao diện: một worker, địa chỉ web, trình duyệt, viewport và server preview. |
| [vnwatch-frontend/src/Account.tsx](../../outputs/vnwatch-frontend/src/Account.tsx) | Giao diện đăng nhập/đăng ký/reset và quản lý hồ sơ/phiên. Component Admin cũ được giữ trong nguồn nhưng không gắn vào cửa hàng. |
| [vnwatch-frontend/src/admin.css](../../outputs/vnwatch-frontend/src/admin.css) | CSS quản trị và thanh trạng thái app Windows: login, sidebar, bảng, form, thống kê và responsive. |
| [vnwatch-frontend/src/AdminCreateOrder.tsx](../../outputs/vnwatch-frontend/src/AdminCreateOrder.tsx) | Admin lập đơn cho khách đang hoạt động; lấy báo giá server và giữ request key/body cho lần thử lại. |
| [vnwatch-frontend/src/adminNavigation.ts](../../outputs/vnwatch-frontend/src/adminNavigation.ts) | Kiểu route/filter của quản trị để các ô thống kê và menu chuyển đúng màn hình bằng một hợp đồng chung. |
| [vnwatch-frontend/src/AdminOrderTools.tsx](../../outputs/vnwatch-frontend/src/AdminOrderTools.tsx) | Sửa thông tin nhận hàng hoặc lưu trữ/khôi phục đơn với expectedUpdatedAt và lý do thao tác. |
| [vnwatch-frontend/src/AdminPortal.tsx](../../outputs/vnwatch-frontend/src/AdminPortal.tsx) | Giao diện quản trị dùng trong app Windows: đăng nhập ADMIN, điều hướng theo hash và gắn các màn hình quản lý. |
| [vnwatch-frontend/src/AdminUsers.tsx](../../outputs/vnwatch-frontend/src/AdminUsers.tsx) | Quản trị tài khoản: tìm/lọc, tạo/sửa quyền, khóa user, mở khóa đăng nhập và thu hồi phiên. |
| [vnwatch-frontend/src/api.ts](../../outputs/vnwatch-frontend/src/api.ts) | Cầu nối API dùng chung cho web và app Windows: token ở bộ nhớ, timeout/hủy request, JSON lỗi và xử lý phiên hết hạn. |
| [vnwatch-frontend/src/App.tsx](../../outputs/vnwatch-frontend/src/App.tsx) | Component gốc cửa hàng: giữ phiên ở bộ nhớ, bộ lọc catalog, giỏ/yêu thích và màn hình phủ cho các chức năng. |
| [vnwatch-frontend/src/Assistant.tsx](../../outputs/vnwatch-frontend/src/Assistant.tsx) | Giao diện hội thoại: gửi câu hỏi/lịch sử giới hạn, hiển thị sản phẩm và nguồn do backend đã đối chiếu. |
| [vnwatch-frontend/src/components.tsx](../../outputs/vnwatch-frontend/src/components.tsx) | Component dùng chung: icon, ảnh sản phẩm, hình minh họa, modal và thông báo; quản lý focus và tải ảnh. |
| [vnwatch-frontend/src/desktop-bridge.d.ts](../../outputs/vnwatch-frontend/src/desktop-bridge.d.ts) | Khai báo API giới hạn trên window.vnwatchDesktop để TypeScript hiểu cầu nối preload; không cấp quyền Node cho React. |
| [vnwatch-frontend/src/desktop.tsx](../../outputs/vnwatch-frontend/src/desktop.tsx) | Điểm vào React của app Windows: theo dõi backend, cho khởi động lại dịch vụ và chỉ bật đăng nhập khi dữ liệu sẵn sàng. |
| [vnwatch-frontend/src/main.tsx](../../outputs/vnwatch-frontend/src/main.tsx) | Điểm vào web: gắn React vào root. Đường dẫn /admin chỉ hướng dẫn mở phần mềm quản trị đã cài. |
| [vnwatch-frontend/src/Management.tsx](../../outputs/vnwatch-frontend/src/Management.tsx) | Màn hình báo cáo/catalog/tồn/khuyến mãi/kiểm duyệt/audit dùng trong quản trị; thao tác ghi gửi lý do và version. |
| [vnwatch-frontend/src/Orders.tsx](../../outputs/vnwatch-frontend/src/Orders.tsx) | Thanh toán, đơn cá nhân và quản trị. Lưu yêu cầu đang chờ vào sessionStorage để thử lại cùng key khi mất phản hồi. |
| [vnwatch-frontend/src/Product.tsx](../../outputs/vnwatch-frontend/src/Product.tsx) | Chi tiết mẫu, lựa chọn SKU và giỏ hàng. Dữ liệu hiển thị được tải lại từ API; tồn hiển thị không giữ chỗ. |
| [vnwatch-frontend/src/QrDemoPayment.tsx](../../outputs/vnwatch-frontend/src/QrDemoPayment.tsx) | Vẽ ma trận QR từ backend và nút mô phỏng thanh toán; QR demo không chuyển tiền qua ngân hàng. |
| [vnwatch-frontend/src/Shopping.tsx](../../outputs/vnwatch-frontend/src/Shopping.tsx) | Các màn hình địa chỉ, yêu thích, so sánh, hỗ trợ, bảo hành, đánh giá và hướng dẫn mua hàng. |
| [vnwatch-frontend/src/styles.css](../../outputs/vnwatch-frontend/src/styles.css) | CSS cửa hàng: biến màu/font, bố cục, catalog, modal, tài khoản và các breakpoint thích ứng màn hình. |
| [vnwatch-frontend/src/types.ts](../../outputs/vnwatch-frontend/src/types.ts) | Hợp đồng TypeScript của dữ liệu từ backend: Product khác Variant; Page chứa data và meta phân trang. |
| [vnwatch-frontend/tests/admin-portal.spec.ts](../../outputs/vnwatch-frontend/tests/admin-portal.spec.ts) | Kiểm thử tự động. Kiểm thử Electron thật với API fixture riêng: đăng nhập, sáu ô điều hướng, quản lý đơn/user/catalog và logout. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup. |
| [vnwatch-frontend/tests/assistant.spec.ts](../../outputs/vnwatch-frontend/tests/assistant.spec.ts) | Kiểm thử tự động. Kiểm thử chat, sản phẩm gợi ý, nguồn và điều hướng trợ lý. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup. |
| [vnwatch-frontend/tests/management.spec.ts](../../outputs/vnwatch-frontend/tests/management.spec.ts) | Kiểm thử tự động. Kiểm thử các màn hình quản trị được dựng bởi fixture; một số test giữ hành vi giao diện lịch sử. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup. |
| [vnwatch-frontend/tests/orders.spec.ts](../../outputs/vnwatch-frontend/tests/orders.spec.ts) | Kiểm thử tự động. Kiểm thử đặt hàng, phản hồi và màn hình đơn; không tự tạo đơn từ thao tác xem catalog. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup. |
| [vnwatch-frontend/tests/qr-demo.spec.ts](../../outputs/vnwatch-frontend/tests/qr-demo.spec.ts) | Kiểm thử tự động. Kiểm thử chọn QR demo, hiển thị mã và mô phỏng thanh toán trên giao diện. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup. |
| [vnwatch-frontend/tests/reference-catalog.spec.ts](../../outputs/vnwatch-frontend/tests/reference-catalog.spec.ts) | Kiểm thử tự động. Kiểm thử các mẫu thật và nguồn/ảnh hiển thị ở catalog. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup. |
| [vnwatch-frontend/tests/shopping.spec.ts](../../outputs/vnwatch-frontend/tests/shopping.spec.ts) | Kiểm thử tự động. Kiểm thử thao tác giỏ/yêu thích/địa chỉ và tiện ích mua hàng qua giao diện. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup. |
| [vnwatch-frontend/tests/storefront.spec.ts](../../outputs/vnwatch-frontend/tests/storefront.spec.ts) | Kiểm thử tự động. Kiểm thử cửa hàng trên desktop/mobile, tìm/lọc, thông tin mẫu và trạng thái guest. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup. |
| [vnwatch-frontend/vite.config.ts](../../outputs/vnwatch-frontend/vite.config.ts) | Cấu hình dev proxy API và hai chế độ build: web dùng index.html; desktop dùng desktop.html và assets tương đối. |

## Ứng dụng Windows Electron

| File | Vai trò cần học |
| --- | --- |
| [vnwatch-manager/.gitignore](../../outputs/vnwatch-manager/.gitignore) | Các file Git bỏ qua như dependency, log, build và secret cục bộ; không đồng nghĩa file bị xóa khỏi máy. |
| [vnwatch-manager/build/create-icon.ps1](../../outputs/vnwatch-manager/build/create-icon.ps1) | Dùng System.Drawing vẽ icon đồng hồ và ghi PNG/ICO phục vụ đóng gói ứng dụng Windows. |
| [vnwatch-manager/src/bridge.ts](../../outputs/vnwatch-manager/src/bridge.ts) | Xác thực request từ renderer: chỉ backend loopback cố định, whitelist method/header, JSON nhỏ và chặn path traversal. |
| [vnwatch-manager/src/main.ts](../../outputs/vnwatch-manager/src/main.ts) | Main Electron: quyền Windows, protocol, IPC, cửa sổ và khởi động backend. |
| [vnwatch-manager/src/preload.ts](../../outputs/vnwatch-manager/src/preload.ts) | Cầu nối contextBridge chỉ công khai các thao tác API/status/start/cancel/openWebsite, không công khai ipcRenderer hay shell. |
| [vnwatch-manager/tests/bridge.test.cjs](../../outputs/vnwatch-manager/tests/bridge.test.cjs) | Kiểm thử tự động. Kiểm thử bridge desktop từ chối URL ngoài, path traversal, header sai, body lớn và key không hợp lệ. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup. |

## Migration SQL bản học tập

| File | Vai trò cần học |
| --- | --- |
| [docs/learning/migrations/202610010001_catalog.sql](../../docs/learning/migrations/202610010001_catalog.sql) | Bản có comment để đọc SQL, không chạy migration từ thư mục này. |
| [docs/learning/migrations/202610010002_auth_users.sql](../../docs/learning/migrations/202610010002_auth_users.sql) | Bản có comment để đọc SQL, không chạy migration từ thư mục này. |
| [docs/learning/migrations/202610010003_cod_orders.sql](../../docs/learning/migrations/202610010003_cod_orders.sql) | Bản có comment để đọc SQL, không chạy migration từ thư mục này. |
| [docs/learning/migrations/202610020004_reference_catalog.sql](../../docs/learning/migrations/202610020004_reference_catalog.sql) | Bản có comment để đọc SQL, không chạy migration từ thư mục này. |
| [docs/learning/migrations/20261003000000_shopping_management.sql](../../docs/learning/migrations/20261003000000_shopping_management.sql) | Bản có comment để đọc SQL, không chạy migration từ thư mục này. |
| [docs/learning/migrations/20261004000000_qr_demo.sql](../../docs/learning/migrations/20261004000000_qr_demo.sql) | Bản có comment để đọc SQL, không chạy migration từ thư mục này. |
| [docs/learning/migrations/20261009000000_admin_order_archive.sql](../../docs/learning/migrations/20261009000000_admin_order_archive.sql) | Bản có comment để đọc SQL, không chạy migration từ thư mục này. |

## File JSON và dữ liệu sinh tự động

| Nhóm | Nơi đọc ý nghĩa |
| --- | --- |
| package.json, package-lock.json của từng package | Mục 12 HOC-CODE: scripts, dependency, lockfile; không chèn comment vào JSON. |
| tsconfig*.json, nest-cli.json | target/module/strict/include/exclude/outDir và thư mục source/build. |
| src/generated/prisma | Sinh từ schema.prisma; học schema và PrismaService trước. |
| node_modules, .venv, vendor | Mã thư viện; import của nguồn ứng dụng cho biết phần nào thực sự được dùng. |
| dist, ui, release, apps, __pycache__ | Output biên dịch/đóng gói; học từ source tương ứng. |
| docker/backups, work, logs, verification, docs/openapi.json | Dữ liệu vận hành/kết quả kiểm tra hoặc tài liệu sinh từ nguồn. |
