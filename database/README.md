# PostgreSQL VNWatch

`schema.sql` là cấu trúc schema public, xuất từ PostgreSQL 17, không chứa dữ liệu tài khoản,
đơn hàng hay hội thoại. Cách chạy ứng dụng chuẩn dùng Prisma migrations trong
`outputs/vnwatch-backend/prisma/migrations` và catalog seed, tự thực hiện qua Docker.

File schema SQL dành cho xem cấu trúc hoặc nhập vào database mới, trống; không nhập
chồng lên database đã được Prisma migrations tạo. Các file snapshot `.sql` có dữ liệu,
`.backup` và báo cáo kiểm chứng trên máy cá nhân được `.gitignore` bỏ qua.
