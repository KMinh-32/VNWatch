# HỌC VNWATCH — outputs/vnwatch-frontend/Dockerfile
# Dùng Node build React rồi chỉ chép assets sang Nginx để phục vụ cửa hàng.
# Bắt đầu giai đoạn image; AS đặt tên giai đoạn để COPY --from sử dụng.
FROM node:24-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS build
# Chọn thư mục làm việc bên trong container cho các lệnh tiếp theo.
WORKDIR /app
# Chép file vào image; tách dependency trước nguồn giúp Docker tái dùng cache.
COPY package.json package-lock.json ./
# Lệnh chạy khi build image, không chạy mỗi lần có request.
RUN npm ci --ignore-scripts --no-audit --no-fund
# Chép file vào image; tách dependency trước nguồn giúp Docker tái dùng cache.
COPY . .
# Lệnh chạy khi build image, không chạy mỗi lần có request.
RUN npm run build

# Bắt đầu giai đoạn image; AS đặt tên giai đoạn để COPY --from sử dụng.
FROM nginx:stable-alpine@sha256:0985e772fb9f729e6fa0980da05fca5d9c468e870eed43071545afa9d2e27d94
# Chép file vào image; tách dependency trước nguồn giúp Docker tái dùng cache.
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Chép file vào image; tách dependency trước nguồn giúp Docker tái dùng cache.
COPY --from=build /app/dist /usr/share/nginx/html
# Mô tả cổng container; không tự publish cổng ra máy chủ.
EXPOSE 8080
# Lệnh mặc định khi container khởi động.
CMD ["nginx", "-g", "daemon off;"]
