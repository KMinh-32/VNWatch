# Đọc migration SQL có chú thích

Các bản SQL trong thư mục `migrations` này là bản học tập. Không đặt chúng vào thư mục Prisma migrations và không chạy chúng để thử trên database hiện tại.

Migration gốc nằm trong `outputs/vnwatch-backend/prisma/migrations`. Prisma lưu checksum của migration đã áp dụng; sửa comment ngay trong file gốc cũng đổi checksum, nên dự án giữ nguyên các file đó.

| Bản học tập | Thay đổi chính |
| --- | --- |
| [202610010001_catalog.sql](migrations/202610010001_catalog.sql) | Mẫu/SKU, enum catalog/loại máy, ràng buộc giá/tồn/thông số và index. |
| [202610010002_auth_users.sql](migrations/202610010002_auth_users.sql) | User, phiên, reset token, rate limit và audit tài khoản. |
| [202610010003_cod_orders.sql](migrations/202610010003_cod_orders.sql) | Đơn/dòng hàng/lịch sử, snapshot và cặp user/idempotency key duy nhất. |
| [202610020004_reference_catalog.sql](migrations/202610020004_reference_catalog.sql) | Catalog tham khảo có nguồn, mốc giá/ảnh và kích thước nullable. |
| [20261003000000_shopping_management.sql](migrations/20261003000000_shopping_management.sql) | Giỏ/yêu thích/địa chỉ/khuyến mãi/hỗ trợ/đánh giá và nhật ký nghiệp vụ. |
| [20261004000000_qr_demo.sql](migrations/20261004000000_qr_demo.sql) | Phương thức QR demo và điều chỉnh ràng buộc đơn liên quan. |
| [20261009000000_admin_order_archive.sql](migrations/20261009000000_admin_order_archive.sql) | Timestamp lưu trữ đơn và index truy vấn quản trị. |

Đọc một câu `CREATE TABLE` theo thứ tự: cột/kiểu → nullable/default → primary key → unique → CHECK → foreign key/onDelete → index.

`NOT NULL` không cho thiếu giá trị; `UNIQUE` chặn trùng; `CHECK` bảo vệ giá/tồn ngay tại DB dù không ghi qua DTO; `FOREIGN KEY` giữ quan hệ đúng. `ON DELETE RESTRICT` ngăn xóa bản ghi còn được tham chiếu. `CASCADE` xóa dữ liệu phụ theo parent, còn `SET NULL` giữ dòng nhưng bỏ liên kết nếu schema cho phép.

DTO và schema bảo vệ hai lớp khác nhau: validation HTTP cho phản hồi rõ, constraint DB bảo vệ mọi nguồn ghi. Transaction bảo đảm các thay đổi cùng commit hoặc rollback; index hỗ trợ truy vấn, không tự bảo đảm mọi truy vấn nhanh.

Đối chiếu [schema hiện tại](../../outputs/vnwatch-backend/prisma/schema.prisma) sau khi đọc lịch sử: migration đầu tiên chưa chứa mọi cột hiện có. Mọi bản sao đã được kiểm tra giữ nguyên các câu SQL sau khi bỏ chú thích.
