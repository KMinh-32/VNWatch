# Tự học danh mục trong bản VNWatch hiện tại

Hướng dẫn toàn dự án nằm tại [HOC-CODE.vi.md](../../../HOC-CODE.vi.md); chỉ mục từng file ở [FILE-INDEX.vi.md](../../../docs/learning/FILE-INDEX.vi.md). Đây là bản cập nhật để không nhầm với ghi chú giai đoạn catalog đầu tiên: dự án hiện có giỏ hàng, đặt hàng, QR demo, trợ lý và app quản trị Windows.

## Thứ tự đọc

1. prisma/schema.prisma: Product, ProductVariant, Order, OrderItem và quan hệ.
2. src/catalog/dto/list-products.dto.ts: query, Transform và validation.
3. src/catalog/catalog.controller.ts: HTTP và chuyển việc sang service.
4. src/catalog/catalog.service.ts: khoảng giá và public DTO.
5. src/catalog/catalog.repository.ts: SKU phải thỏa cùng bộ lọc; thứ tự/phân trang/snapshot.
6. test/catalog.integration.test.ts: kiểm chứng lọc, constraint và rollback.
7. src/orders/orders.service.ts: báo giá chỉ là đọc; create tái kiểm tra và trừ tồn trong transaction.

## Các điều cần hiểu

Mẫu khác SKU: mẫu giữ tên/hãng/nguồn, SKU giữ giá/tồn/thông số. Public catalog trả inStock, không cấp quyền sửa tồn. Mẫu/SKU nháp hoặc ngừng bán không được dùng như hàng đang bán.

DTO kiểm tra HTTP; CHECK/UNIQUE/FOREIGN KEY ở PostgreSQL bảo vệ cả script và nguồn ghi khác. Index phải phù hợp truy vấn; ILIKE có wildcard đầu không tự nhanh chỉ vì có B-tree.

RepeatableRead ở danh mục giữ count/trang cùng snapshot. Checkout tạo đơn dùng khóa hàng và cập nhật tồn có điều kiện: tồn hiển thị trên UI/báo giá không phải giữ chỗ, request khác có thể mua trước.

Catalog có nguồn thật được nhập bởi reference-data.ts với mốc tra cứu cố định. Upsert update rỗng giữ sửa đổi nghiệp vụ, không tự crawl và ghi đè giá/tồn mỗi lần khởi động.

Token phiên là opaque, không phải JWT. SessionGuard kiểm tra phiên/role từ DB; service ghi kiểm tra lại sau khi khóa user. API công khai catalog vẫn mở, các chức năng riêng cần phiên, quản trị yêu cầu ADMIN.

## Bài tập

- Mô tả kết quả khi limit vượt 50 hoặc khoảng giá đảo ngược.
- Giải thích vì sao mẫu có SKU 1,5 triệu và 3,2 triệu không khớp bộ lọc 2–3 triệu.
- Theo một SKU từ lọc giá tới báo giá rồi create và xác định nơi chống overselling.
- Tìm test chứng minh chỉ mẫu/SKU ACTIVE xuất hiện công khai.
- Đọc bản SQL có chú thích trong docs/learning/migrations; giữ nguyên checksum migration gốc.
