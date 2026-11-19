# Chạy giao diện VNWatch

## Cập nhật 04/10/2026 — QR demo

Checkout đã có **Mã QR demo trên website**: tạo đơn, xem mã/số tiền ngay trong chi tiết và bấm **Mô phỏng thanh toán thành công**. QR không chứa tài khoản ngân hàng, không chuyển tiền thật; quét không tự xác nhận. Chỉ chủ đơn xác nhận demo; QR chưa PAID không được giao, đã PAID không hủy/hoàn tiền trong bản này. COD vẫn là mặc định. Chi tiết: [QR-DEMO.vi.md](../vnwatch-backend/docs/QR-DEMO.vi.md). Những giới hạn về thanh toán online bên dưới chỉ nói đến tích hợp thật.

## Trợ lý tư vấn mới

Nhấn **Tư vấn đồng hồ** góc dưới bên phải. Thử “Gợi ý đồng hồ dưới 2 triệu”, “Casio của nước nào?” hoặc “Bảo hành tại VNWatch thế nào?”. Chat trả sản phẩm có nút mở chi tiết, giá/tình trạng hàng và nguồn. Bản hiện tại chạy **Tư vấn theo dữ liệu** vì chưa cấu hình API key. Để bật OpenAI, điền key ở server theo [hướng dẫn FastAPI/OpenAI](../vnwatch-agent/README.vi.md), rồi khởi động lại riêng dịch vụ agent. Không đưa key vào frontend hoặc nội dung chat.

## Xem ngay trên máy hiện tại

Mở **http://127.0.0.1:5173** để xem website. Cổng 3000 là backend; `/docs` là tài liệu API.

Sau khi khởi động lại máy, mở PowerShell tại thư mục `outputs` rồi chạy:

```powershell
.\start-vnwatch.ps1
```

Script sử dụng cluster PostgreSQL đã tạo cho VNWatch, khởi động backend và bản build frontend. Không reset hoặc seed lại dữ liệu. Nếu PostgreSQL được cài ở chỗ khác, truyền `-PgBin` và `-DataDirectory`. Log nằm trong thư mục `work/demo-logs` của workspace. Script sẽ in URL khi các dịch vụ sẵn sàng.

## Chạy từng phần bằng terminal

1. Khởi động PostgreSQL theo `vnwatch-backend/docs/RUNBOOK.vi.md`.
2. Terminal thứ nhất, mở thư mục `vnwatch-backend`, chạy `npm start`. Cần cài dependency, migration và seed theo runbook nếu đây là máy mới.
3. Terminal thứ hai, mở thư mục `vnwatch-frontend`:

```powershell
npm ci
npm run build
npm run preview -- --port 5173
```

4. Mở **http://127.0.0.1:5173**. Giữ terminal đang chạy; Ctrl+C để dừng.

Khi sửa giao diện, dùng `npm run dev` thay cho lệnh preview. Tránh chạy cả dev và preview cùng cổng 5173. Trong môi trường Windows bị giới hạn quyền đọc thư mục cha, esbuild có thể báo `Access is denied` khi chạy dev; bản build + preview đã được kiểm chứng trong workspace này và là cách demo được khuyến nghị.

## Kịch bản thử giao diện

1. Bấm **Khám phá bộ sưu tập**. Website mặc định có 10 mẫu thật từ 5 hãng, với ảnh và nguồn giá/thông số. Tồn kho giả lập đã khởi tạo 100 mỗi phiên bản; có thể thử đặt COD ngay với sản phẩm thật hoặc chọn **Bộ dữ liệu → Demo đặt hàng**.
2. Lọc mức giá **Đến 2 triệu đồng**: catalog thật có Casio AE-1200WHD-1AV; catalog demo có DEMO Everyday. Đặt lại bộ lọc.
3. Bấm **Đăng nhập → Tạo tài khoản mới**. Dùng email của bạn và mật khẩu ít nhất 15 ký tự. Đăng ký xong, đăng nhập bằng tài khoản vừa tạo.
4. Mở Casio AE-1200WHD-1AV (1.501.000 VND) hoặc một mẫu khác, chọn phiên bản rồi thêm vào giỏ. Nếu chưa đăng nhập, nút thêm sẽ mở form đăng nhập và chưa thêm sản phẩm. Đăng nhập xong sẽ quay lại phiên bản đã chọn; bấm thêm một lần nữa.
5. DEMO Automatic cũng có tồn kho giả lập 100 khi khởi tạo và thêm được vào giỏ. Tồn giảm khi đặt đơn; khi thực sự về 0, nút thêm sẽ bị khóa.
6. Đóng chi tiết, mở biểu tượng giỏ hàng. Tăng/giảm số lượng. Tải lại trang cần đăng nhập lại trước khi mở giỏ đã lưu. Đóng form đăng nhập sẽ không mở giỏ hoặc bước đặt hàng.
7. Bấm tên tài khoản để đổi tên hiển thị, đổi mật khẩu hoặc quản lý các phiên đăng nhập. Đổi mật khẩu sẽ đăng xuất tất cả phiên.
8. Nếu đăng nhập bằng admin được tạo theo runbook backend, mục **Quản trị** xuất hiện. Thay đổi quyền/trạng thái phải nhập lý do; phiên của tài khoản bị thay đổi sẽ bị thu hồi.
9. Trong giỏ, bấm **Tiến hành đặt hàng**, nhập người nhận/SĐT/địa chỉ. Kiểm tra báo giá gồm phí demo 30.000 VND rồi xác nhận COD. API kiểm tra phiên đăng nhập; phiên hết hạn/bị thu hồi phải đăng nhập lại. Xem trạng thái ở **Đơn hàng của tôi**; hủy đơn chờ để trả tồn.
10. Nếu mất phản hồi sau gửi đơn, giữ bản nháp và bấm gửi lại: cùng idempotency key giúp tránh tạo trùng. Tải lại cần đăng nhập; bản gửi đang chờ được lưu trong sessionStorage của tab.

Mật khẩu/token không được lưu trong localStorage. Tải lại cần đăng nhập lại; giỏ/yêu thích/địa chỉ lưu riêng trên server theo tài khoản. Giỏ local dùng chung trước đây không tự chuyển vào tài khoản vì không xác định được chủ sở hữu.

## Các màn hình mới

- **Yêu thích:** bấm trái tim tại sản phẩm rồi mở danh sách đã lưu. **So sánh:** chọn tối đa 3 sản phẩm bằng nút so sánh, xem giá và thông số cạnh nhau.
- **Địa chỉ:** thêm địa chỉ và chọn nhanh tại checkout. Có thể xóa rồi thêm lại; tối đa 10 địa chỉ.
- **Hỗ trợ:** tạo yêu cầu và đọc/phản hồi trong website. Yêu cầu về đơn cần mã UUID của chính đơn bạn; không gửi email/SMS. Chỉ ADMIN có **Hỗ trợ khách hàng** để trả lời/đóng yêu cầu.
- **Bảo hành:** đơn phải hoàn tất và thu COD; chỉ dòng đơn có thời hạn bảo hành khi mua mới có phiếu demo. Phiếu còn hạn có nút tạo yêu cầu; chưa có serial riêng từng chiếc.
- **Đánh giá:** mở chi tiết sản phẩm sau khi nhận hàng/hoàn tất đơn; tài khoản đã mua được viết/cập nhật đánh giá. Không tự tạo đánh giá mẫu.
- **Quản trị cửa hàng:** ADMIN thêm sản phẩm DEMO/SKU, sửa giá/tồn/thông số/ảnh HTTPS, tạo/bật/tắt mã giảm giá, xem báo cáo/xuất CSV, audit và kiểm duyệt. Sửa cần lý do; nếu dữ liệu cũ bị xung đột, tải lại trước khi sửa. STAFF dùng website mua hàng, không có quyền quản trị. Quản trị bằng ứng dụng Windows VNWatch Manager trên Desktop/menu Start; xem [ADMIN.vi.md](../../ADMIN.vi.md).
- **Mã giảm giá:** ADMIN tạo mã đang trong hạn ở mục quản lý. Nhập mã khi checkout để lấy báo giá mới; có giới hạn theo người/tổng lượt. Hủy đơn không hoàn lượt mã theo chính sách demo.
- **Thông tin:** FAQ, hướng dẫn mua/COD, bảo hành demo và quyền riêng tư.

Để tạo ADMIN Docker bằng thông tin tự chọn, chạy **CREATE-ADMIN.cmd** tại D:\VNWatch. Chế độ Windows cũ dùng `npm run db:bootstrap-admin` theo [runbook](../vnwatch-backend/docs/RUNBOOK.vi.md). Không có mật khẩu mặc định; đăng ký công khai không cấp ADMIN. Danh sách đầy đủ và phần cần cấu hình: [COMPLETENESS.vi.md](../vnwatch-backend/docs/COMPLETENESS.vi.md).

## Quên mật khẩu trong demo

Chọn **Quên mật khẩu?**, gửi email. Backend trả thông báo chung để không tiết lộ tài khoản tồn tại. Bản local ghi nội dung vào `vnwatch-backend/work/mail-outbox`; chưa gửi email thật. Mở file JSON mới của tài khoản demo, lấy token rồi chọn **Tôi đã có mã đặt lại** và nhập token cùng mật khẩu mới. Token có hạn 15 phút và chỉ dùng được một lần. Không chia sẻ file chứa token.

## Giới hạn hiện tại

- Đã có đặt hàng/lịch sử/hủy COD giả lập; chưa thu tiền hoặc giao hàng thật. Chỉ ADMIN xử lý đơn trong phần mềm VNWatch Manager.
- Sản phẩm thật có giá tham khảo bên ngoài và tồn kho giả lập khởi tạo 100 mỗi phiên bản để thử mua COD. Bảo hành thực tế chưa thiết lập. CUSTOMER, STAFF và ADMIN đang hoạt động đều được thêm giỏ và đặt đơn sau đăng nhập. Khách chưa đăng nhập chỉ xem sản phẩm và hỏi trợ lý; không thêm giỏ/đặt hàng.
- Ảnh thật tải từ nguồn bên ngoài; cần Internet. Banner hero và sản phẩm DEMO dùng SVG có nhãn minh họa.
- Đã có quản trị sản phẩm/tồn kho và phiếu bảo hành demo; chưa có online payment, serial/bảo hành/sửa chữa thực tế, đồng bộ nhà cung cấp hoặc public deployment. Xem nguồn tại `vnwatch-backend/docs/PRODUCT-SOURCES.vi.md`.

## Kiểm tra lỗi thường gặp

- **Không kết nối được máy chủ:** kiểm tra backend tại `http://127.0.0.1:3000/api/v1/health/ready`, rồi bấm Thử lại trên giao diện.
- **Cổng đang được dùng:** mở URL đang chạy trước; không khởi động thêm server vào cùng cổng.
- **Tài khoản bị khóa đăng nhập:** backend khóa tạm 15 phút sau 5 lần sai liên tiếp. Chờ hết thời hạn rồi thử lại.
- **Đăng ký/đăng nhập bị giới hạn tần suất:** chờ trước khi gửi lại. Không lặp tự động các request xác thực.
- **Sửa mã nhưng giao diện chưa đổi:** preview phục vụ `dist`; chạy lại `npm run build` và tải lại trình duyệt, hoặc chuyển sang `npm run dev`.
