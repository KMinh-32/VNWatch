# Trợ lý tư vấn VNWatch

FastAPI hỗ trợ chọn đồng hồ, tra cứu giá/thông số/tình trạng hàng và hỏi về các thương hiệu trong website. React gửi câu hỏi đến NestJS, NestJS đọc catalog công khai mới nhất từ PostgreSQL và chuyển snapshot giới hạn tới FastAPI. FastAPI không có mật khẩu database, quyền xem đơn hàng hoặc công cụ ghi dữ liệu.

## Chạy bản đã chuẩn bị trên máy này

Từ thư mục workspace, chạy PowerShell:

```powershell
.\outputs\start-vnwatch.ps1
```

Mở http://127.0.0.1:5173 rồi chọn **Tư vấn đồng hồ** ở góc dưới bên phải. FastAPI chạy nền ở cổng 8000, NestJS ở 3000. File log trong `work/demo-logs`. Không cần OpenAI API key để thử chế độ catalog.

## Bật OpenAI

1. Mở `.env` trong thư mục `vnwatch-agent` trên máy chủ.
2. Điền `OPENAI_API_KEY=...`. Không đưa key vào React, biến `VITE_*`, Git hoặc nội dung chat.
3. `OPENAI_MODEL=gpt-5.4-mini` đã được chuẩn bị; có thể dùng model hỗ trợ Responses API và function calling mà tài khoản của bạn được phép sử dụng.
4. Dừng **tiến trình FastAPI của VNWatch** đang chạy ở cổng 8000 rồi chạy lại launcher, hoặc mở terminal trong `vnwatch-agent` và chạy:

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --no-access-log
```

Key được đọc khi tiến trình khởi động. Sau câu hỏi thành công qua mô hình, chat hiển thị **AI · OpenAI**. Nếu chưa có key hoặc provider lỗi/timeout, chat hiển thị **Tư vấn theo dữ liệu** cùng lý do. `GET /health` chỉ phản ánh key được cấu hình, không xác nhận key hợp lệ hoặc tài khoản còn quota. Chi phí API tính trên tài khoản OpenAI của bạn.

Phần kết nối dùng [Responses API function calling](https://developers.openai.com/api/docs/guides/function-calling) và [GPT-5.4 mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini), kiểm tra tài liệu ngày 03/10/2026. Trong phiên triển khai này chưa có key nên chưa gọi OpenAI thật.

## Cài trên máy khác

Cần Python 3.12+, Node theo backend README và PostgreSQL đã cấu hình. Trong `vnwatch-agent`:

```powershell
.\setup.ps1 -Python 'C:\duong-dan\python.exe'
```

Script tạo venv, cài phiên bản khóa trong `requirements.lock.txt`, tạo token nội bộ khớp với backend mà không in token. Backend `.env` cần có sẵn. Hai file cấu hình:

```text
vnwatch-backend/.env: ASSISTANT_SERVICE_URL, ASSISTANT_SERVICE_TOKEN
vnwatch-agent/.env: ASSISTANT_SERVICE_TOKEN, OPENAI_API_KEY, OPENAI_MODEL
```

Chỉ NestJS gọi `POST /internal/chat` với `X-Agent-Token`. Không mở cổng 8000 công khai. HTTP được phép cho gateway loopback; endpoint từ xa phải HTTPS. Frontend không gọi trực tiếp FastAPI.

## Cách trợ lý trả lời

OpenAI diễn giải câu hỏi thành đúng một công cụ `consult_catalog` với schema chặt: tìm sản phẩm, xem mẫu cụ thể, thương hiệu, chính sách, hướng dẫn hoặc ngoài phạm vi. Agent kiểm tra ID và bộ lọc rồi dựng câu trả lời từ dữ liệu, không hiển thị văn bản kiến thức tự sinh bởi model. Vì vậy cách diễn đạt theo mẫu; đây chưa phải chatbot tự do hoặc tìm kiếm web trực tiếp.

Không có key: bộ phân tích mẫu câu tiếng Việt tra cứu cùng catalog. Hỗ trợ ngân sách như “dưới 2 triệu”, “từ 2 đến 5 triệu”, hãng, máy quartz/tự động, đường kính tối đa và còn hàng. Chế độ này chỉ kế thừa bộ lọc cho câu tiếp nối đơn giản; câu phức tạp nên nêu lại nhu cầu đầy đủ hoặc bật OpenAI.

Mỗi lượt dùng catalog công khai mới nhất, tối đa 200 sản phẩm trong dataset đang xem; tối đa 3 thẻ gợi ý, phiên bản được lọc riêng. Sản phẩm thật và demo tách biệt. Nguồn trả về nằm trong allowlist từ catalog và kiến thức thương hiệu; model không tạo URL. Giá tham khảo có ngày kiểm tra nguồn, tồn kho được đọc tại lúc tra cứu và checkout vẫn kiểm tra lại.

Thông tin 5 hãng trong `vnwatch-backend/src/assistant/knowledge.ts` có nguồn chính thức: [Casio](https://world.casio.com/corporate/profile/), [Seiko](https://www.seikowatches.com/global-en/special/heritage/), [Citizen](https://www.citizenwatch-global.com/100th/history/index.html), [Orient](https://orient-watch.com/en/about_orient/), [Tissot](https://www.tissotwatches.com/en-gb/magazine-news-beginnings-le-locle.html). Kiểm tra 03/10/2026. Cập nhật file này khi bổ sung chính sách cửa hàng đã duyệt; không lấy chính sách của website nguồn làm chính sách VNWatch.

Website hiện là demo: chưa có bảo hành chung/đổi trả/phí giao hàng/hotline được xác nhận. Chat nói rõ giới hạn này. Yêu cầu đơn hàng hướng tới luồng đăng nhập và “Đơn hàng của tôi”; không lấy hồ sơ tài khoản, token đăng nhập hoặc dữ liệu đơn gửi tới provider. Khi bật OpenAI, nội dung câu hỏi và lịch sử chat gần nhất được gửi cho OpenAI để diễn giải; không nhập thông tin cá nhân vào chat.

## Giới hạn vận hành và kiểm thử

NestJS giới hạn 12 lượt/phút/IP. FastAPI tối đa 4 lượt đồng thời, một call OpenAI/lượt, 700 output tokens, timeout 8 giây và không retry SDK. Gateway timeout 11 giây; provider lỗi dùng fallback, FastAPI ngừng hoạt động trả 503 có nút gửi lại. Chưa có hạn mức chi phí theo ngày; cần bổ sung trước khi đưa lên hệ thống bán hàng công khai.

Hội thoại giới hạn 10 lượt hiển thị, gửi tối đa 8 tin lịch sử, 1000 ký tự/tin và lưu trong bộ nhớ trang. Đổi dataset/xóa hội thoại/tải lại trang sẽ xóa lịch sử; đóng chat vẫn giữ trong phiên. Không log nội dung câu hỏi. API chat dùng `Cache-Control: no-store`; call OpenAI dùng `store=False` (không thay thế chính sách xử lý dữ liệu của nhà cung cấp). Ảnh trong chat có trạng thái tải và tối đa 8 giây chờ mỗi URL trước khi chuyển nguồn hoặc báo không tải được.

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m pip check
```

Test Python kiểm tra ngân sách/phiên bản, chính sách thiếu, mẫu không tồn tại, SKU ngắn, nguồn, hội thoại, khóa gateway, lỗi provider/công cụ trái phép và ID model bịa. OpenAI SDK được kiểm tra qua provider giả, không khẳng định đã kiểm thử dịch vụ thật. Backend có integration test với PostgreSQL và HTTP agent giả; frontend có Playwright kiểm thử luồng React → NestJS → FastAPI ở chế độ catalog.
