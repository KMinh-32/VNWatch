# Bằng chứng kiểm chứng

## ADMIN và Docker — 09/10/2026

Backend **82/82 đạt** trên PostgreSQL Docker, mỗi suite dùng schema test riêng. Có kiểm thử ADMIN-only trên 28 route, admin login, idempotency đồng thời/coupon/cart, phiên/quyền cũ bị đổi, stale/mass assignment, archive/restore giữ lịch sử/tồn/doanh thu, ngừng/khôi phục sản phẩm, tài khoản và bootstrap đầu tiên. Build và ESLint đạt.

**1 kịch bản E2E Edge đầy đủ đạt**, kiểm tra đăng nhập STAFF bị từ chối, tạo đơn mất phản hồi/reload/retry cùng đơn, sửa/hủy/lưu trữ/khôi phục, thêm/khóa tài khoản và thu hồi phiên, thêm/sửa/ngừng sản phẩm, mọi mục quản trị và đăng xuất. Giao diện 390 px không tràn ngang hoặc lỗi JavaScript. API fixture riêng ở profile test; dừng xong còn 0 schema vnwatch_it_*. Smoke cửa hàng/catalog/giỏ yêu cầu đăng nhập/trợ lý CATALOG cũng đạt.

Database cửa hàng sau migration và kiểm thử vẫn **53 user, 13 product, 15 SKU, 13 order, 0 ADMIN thật**; cần chạy CREATE-ADMIN.cmd với thông tin tự chọn. Bản sao trước migration ở docker/backups/vnwatch-pre-admin-20261009.dump. Ảnh ở docker/verification/admin-desktop.png, admin-mobile.png, admin-login.png. Hướng dẫn: [ADMIN.vi.md](../../../ADMIN.vi.md). Kết quả bên dưới là lịch sử.

## QR demo — 04/10/2026

**72/72 backend test đạt** (72,5 giây), gồm 5 ca QR mới và 67 ca trước. Đã kiểm tra quote/method/default COD, số tiền QR sau coupon, ma trận/finder, owner/unknown fields, 20 xác nhận đồng thời chỉ ghi 1 sự kiện, không giao QR chưa trả tiền, hủy chưa trả hoàn tồn, thanh toán tranh hủy giữ trạng thái/tồn nhất quán, CHECK database và retry. Build/ESLint/format đạt; OpenAPI xuất lại, migration deploy dev không reset dữ liệu. Đây là thanh toán mô phỏng, không ngân hàng/callback/thu tiền thật. Xem [QR-DEMO.vi.md](QR-DEMO.vi.md).

## Hiện hành 03/10/2026 — Shopping/Management

Backend **67/67 đạt**, 68,2 giây, PostgreSQL thật trên các schema test riêng với migration mới. Bao gồm phân quyền/owner, 10 lần thêm giỏ đồng thời, stale metadata/tồn bị từ chối, 20 người tranh 1 lượt coupon (1 thành công), retry/hủy không tiêu thêm/hoàn lượt mã, ticket private và staff phản hồi, đánh giá sau mua/moderation, bảo hành từ snapshot đơn hoàn tất và doanh thu chỉ tính hoàn tất. Ca tiền subtotal vượt Int dù tổng sau giảm trong Int trả 400 và không ghi đơn/lượt/trừ tồn. 100 người tranh 10 SKU vẫn chỉ 10 đơn thành công.

Build và ESLint đạt; OpenAPI đã xuất lại. Migration đã deploy vào dev, không reset dữ liệu. Backend test in cảnh báo MaxListeners từ HTTP test harness khi gửi nhiều request cùng server; toàn bộ assert/cleanup đạt, chưa dùng kết quả này như benchmark hoặc bằng chứng kiểm tra memory production. Agent Python không thay đổi; 24 test của lượt trước giữ nguyên, chưa gọi OpenAI thật. Kết quả frontend ở tài liệu riêng. Các phần bên dưới là lịch sử, đặc biệt mô tả giỏ local đã được thay thế.

## Cập nhật 03/10/2026 — yêu cầu đăng nhập trước khi thêm giỏ

Backend build, ESLint và kiểm tra định dạng `knowledge.ts` đạt; chỉ đổi hướng dẫn mua của trợ lý sang đăng nhập trước. SessionGuard/logic đơn giữ nguyên. E2E frontend đã xác nhận quote/create đơn không token trả 401, thu hồi phiên thật khiến thêm giỏ bị từ chối, lỗi kiểm tra phiên 503 không thay đổi giỏ, login/cancel/reload và COD Casio tiếp tục đúng. Lần chạy toàn bộ frontend đạt 11/12; ca ảnh nguồn ngoài chưa tải được, xem [bằng chứng frontend](../../vnwatch-frontend/VERIFICATION.vi.md). Không chạy lại 59 test backend vì không đổi logic backend; 59/59 bên dưới là kết quả lượt tồn kho trước.

## Cập nhật tồn kho 03/10/2026

Đã chạy script restock trên database local development: **15 phiên bản được đặt thành 100** và lưu trước/sau trong `work/inventory-updates`. Không reset database, không thay đổi giá hoặc trạng thái tài khoản/sản phẩm. Seed development dùng 100 cho bản ghi mới và giữ tồn của bản ghi đã có.

Build và ESLint đạt; **59/59 backend test đạt** (70,6 giây) trên các schema PostgreSQL test riêng. Ca mới cho cả CUSTOMER, STAFF và ADMIN mua Casio thật với tồn 100, giảm đúng 1 và hủy hoàn lại 100. Ca cạnh tranh/rollback/idempotency/quyền owner cũ vẫn đạt. Frontend **11/11 E2E đạt** (50,2 giây), luồng COD được đổi sang Casio thật, kiểm tra giá 1.501.000 + phí demo 30.000 VND, retry không tạo trùng và hủy đơn hoàn tồn.

## Cập nhật 03/10/2026 — customer assistant

Backend **58/58 test đạt** trên PostgreSQL local (5 ca mới cho gateway). Kiểm tra DTO/role hệ thống/snapshot từ client, phân tách real/demo, giá/tồn đọc lại, nguồn ngoài allowlist bị bỏ, provider outage trả 503 và giới hạn 12 lượt/phút/IP. Các test auth/catalog/COD/reference trước tiếp tục đạt; database dev không bị reset.

Agent FastAPI **24/24 pytest đạt**, `pip check` đạt. Provider giả kiểm tra tool read-only, override ngân sách, ID bịa và lỗi; mock HTTP transport đi qua OpenAI SDK thật để kiểm tra Responses serialization và strict schema, không gọi OpenAI thật. Client timeout/retry/giới hạn token được cấu hình, chưa có eval diễn giải câu hỏi trên model thật. Không có key trong React.

Backend/frontend build, ESLint và OpenAPI export đã chạy thành công. Toàn bộ 11 E2E React đạt; chat thật qua NestJS/FastAPI ở mode CATALOG, có ảnh desktop/mobile và lỗi/retry mô phỏng. Launcher đã khởi động FastAPI, backend, frontend; PostgreSQL hiện chạy native, chưa thử reboot máy. Xem [hướng dẫn agent](../../vnwatch-agent/README.vi.md).

## Cập nhật 02/10/2026 — COD và sản phẩm thật

- `npm run db:migrate`: migration COD và reference catalog đã áp dụng; migration mới không reset database.
- `npm run db:seed`: thêm 10 mẫu thật với một SKU mỗi mẫu; 5 hãng, nguồn ảnh/thông số/giá, tồn 0 và bảo hành null. Dữ liệu DEMO được giữ nguyên.
- `npm test`: **53/53 đạt**, 4 suites, trên PostgreSQL native thật với schema test riêng. Thời gian 58,1 giây là thời gian chạy test, không phải latency/throughput API.
- Test COD gồm quote, quyền owner/staff, snapshot, expected total, idempotency, rollback, trạng thái, hủy trả tồn đúng một lần. Test cạnh tranh 100 yêu cầu tranh 10 sản phẩm: 10 thành công, 90 xung đột, tồn còn 0.
- Ba test reference mới kiểm tra lọc dữ liệu/hãng/giá và provenance, kích thước phi tròn không thành đường kính, warranty null, nhập lại không trùng hoặc ghi đè tồn/giá/chính sách.
- Backend/frontend build và OpenAPI export thành công. API local ở 3000, website ở 5173. Nguồn/giới hạn dữ liệu ghi trong `PRODUCT-SOURCES.vi.md`.

Các mục bên dưới lưu bằng chứng ngày 01/10/2026; phát biểu “chưa có Orders” ở phần lịch sử đã được thay thế bởi cập nhật trên. Chưa kiểm chứng thanh toán online, public deployment, benchmark hoặc CI GitHub.

Ngày kiểm chứng: 01/10/2026 (giờ Việt Nam). Đây là kiểm chứng các slice Catalog và Auth/Users, không phải nghiệm thu toàn bộ VNWatch.

## Môi trường thực tế

- Windows; Node.js 24.18.0; npm 11.16.0; TypeScript 5.9.3.
- NestJS 12.1.2; Prisma/adapter/client 7.10.0; PostgreSQL 17.11 native.
- Cluster riêng trong thư mục làm việc, cổng 54329, bind 127.0.0.1; hai DB `vnwatch_dev` và `vnwatch_test`.
- Dependency versions đầy đủ nằm trong `package-lock.json`.
- Dữ liệu demo ban đầu: 3 mẫu, 5 SKU; công khai 2 mẫu và 3 SKU. Integration test bổ sung fixture riêng trong schema ngẫu nhiên.

## Kết quả đã chạy

| Kiểm tra                      | Kết quả quan sát                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `npm run db:migrate`          | Áp dụng migration `202610010001_catalog` và `202610010002_auth_users` thành công |
| `npm run typecheck`           | Exit code 0                                                                      |
| `npm run lint`                | Exit code 0                                                                      |
| `npm run format:check`        | Tất cả file được kiểm tra phù hợp Prettier                                       |
| `npm test`                    | 40 pass, 0 fail, 0 skipped, 0 todo                                               |
| `npm run db:seed`             | Build thành công, seed vào database dev thành công                               |
| `node dist/export-openapi.js` | Xuất `docs/openapi.json` thành công                                              |
| Chạy `node dist/main.js`      | Nest khởi động thành công; log JSON                                              |
| HTTP readiness                | 200, `status=ok`                                                                 |
| HTTP demo Auth                | Register → Login → `/users/me` → `/auth/sessions` → Logout thành công            |
| HTTP lọc giá tối đa 2 triệu   | 1 mẫu, SKU `DEMO-EVERYDAY-BLACK`, `priceVnd=1500000`                             |
| HTTP `/docs`                  | 200                                                                              |
| Docker Compose config         | Kiểm tra cú pháp bằng binary Compose, exit code 0                                |

Trong 40 test có **38 integration test chạy với PostgreSQL thật**, bao gồm migration trong schema mới, API NestJS, lọc giá trên cùng SKU, Auth/session, reset token cạnh tranh, rate limit, RBAC/owner checks, last-admin protection, audit, unique/FK/CHECK, rollback và seed lặp không ghi đè. **2 unit/readiness assertions** kiểm tra hành vi khi DB lỗi và các quy tắc ngoài HTTP.

Tóm tắt đầu ra test thật:

```text
tests 40
suites 1
pass 40
fail 0
cancelled 0
skipped 0
todo 0
```

Thời gian từng test không được coi là benchmark API. Test rollback ở đây chưa phải test checkout nhiều mặt hàng; test âm tồn chưa chứng minh chống overselling.

## Giới hạn bằng chứng

- Docker engine chưa chạy trên máy này. Chỉ cấu hình Compose được kiểm tra, chưa chạy container; các test dùng PostgreSQL native.
- CI được cung cấp nhưng chưa chạy trên GitHub. Bản Node được build và kiểm tra HTTP local.
- Chưa chạy reset dev có tính phá hủy; không cần reset để nghiệm thu phần này.
- Chưa đo p50/p95, throughput, tải 20 người dùng hay 100 yêu cầu mua đồng thời.
- Chưa có Orders, Payments, Warranty hoặc AI nên chưa có bằng chứng cho những nghiệp vụ đó.

## Tiếp tục trên chính máy đã tạo dự án

Source root hiện tại:

```text
C:\Users\hanhn\Documents\Codex\2026-10-01\files-pasted-by-the-user-b\outputs\vnwatch-backend
```

Cluster dùng để chạy lần này nằm ở:

```text
C:\Users\hanhn\Documents\Codex\2026-10-01\files-pasted-by-the-user-b\work\postgres-catalog
```

`.env` local đã được tạo, dependency đã cài, migration và seed đã chạy. Khi API còn chạy, mở Swagger tại <http://127.0.0.1:3000/docs>. Nếu API đã dừng, chạy `npm start` trong source root. Nếu PostgreSQL đã dừng, dùng lệnh khởi động lại trong `RUNBOOK.vi.md` với đúng đường dẫn cluster bên trên. Không dùng lệnh bootstrap mới để khởi tạo lại cluster này.
