# Chia sẻ VNWatch qua Internet

Bấm đúp **D:\VNWatch\SHARE-WEBSITE.cmd**. Script khởi động website Docker, kiểm tra cổng xem thử rồi tạo đường hầm HTTPS Cloudflare. Sao chép liên kết được in ra hoặc đọc **D:\VNWatch\SHARE-LINK.txt**, gửi cho người xem. Không cần cùng Wi-Fi, tài khoản Cloudflare hay mở cổng router.

Liên kết chỉ cho xem trang cửa hàng, catalog, chi tiết sản phẩm và đánh giá công khai. Có thông báo xem thử trên trang. Đăng nhập, giỏ hàng, đặt hàng, trợ lý, admin, Swagger và API ngoài danh sách cho phép bị chặn; dữ liệu tài khoản/đơn hàng không được công khai. Website tại http://127.0.0.1:5180/ vẫn dùng đầy đủ.

Giữ máy tính bật, kết nối Internet và Docker Desktop đang chạy. **STOP-SHARING.cmd** dừng đường hầm và cổng xem thử, không dừng cửa hàng cục bộ. Chạy lại có thể tạo liên kết khác. Đây là cách trình diễn tạm thời, không phải hosting ổn định 24/7.

Cloudflare Quick Tunnels: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/

Cấu hình: compose.share.yaml; docker/share-nginx.conf; docker/share.ps1. Cổng xem thử chỉ gắn 127.0.0.1:5181, không mở LAN. Image được cố định bằng digest. Không lưu API key hay thông tin đăng nhập Cloudflare trong chế độ chia sẻ này.
