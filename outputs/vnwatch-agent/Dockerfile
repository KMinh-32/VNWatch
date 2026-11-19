# HỌC VNWATCH — outputs/vnwatch-agent/Dockerfile
# Đóng gói FastAPI bằng Python, cài dependency khóa và chạy Uvicorn trên cổng nội bộ.
# Bắt đầu giai đoạn image; AS đặt tên giai đoạn để COPY --from sử dụng.
FROM python:3.12-slim-bookworm@sha256:34386ef0cb081344d7ec1c103ba398e6e9f64e9ab3a1509accc92a4e24a07258
# Biến môi trường mặc định của image, được compose ghi đè nếu có.
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
# Chọn thư mục làm việc bên trong container cho các lệnh tiếp theo.
WORKDIR /app
# Chép file vào image; tách dependency trước nguồn giúp Docker tái dùng cache.
COPY requirements.lock.txt ./
# Lệnh chạy khi build image, không chạy mỗi lần có request.
RUN pip install --no-cache-dir -r requirements.lock.txt \
    && useradd --create-home --uid 10001 agent
# Chép file vào image; tách dependency trước nguồn giúp Docker tái dùng cache.
COPY main.py consultant.py contracts.py ./
# Chạy bằng user được chỉ định trong image.
USER agent
# Mô tả cổng container; không tự publish cổng ra máy chủ.
EXPOSE 8000
# Lệnh mặc định khi container khởi động.
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
