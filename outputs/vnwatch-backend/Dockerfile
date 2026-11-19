# HỌC VNWATCH — outputs/vnwatch-backend/Dockerfile
# Build nhiều giai đoạn: công cụ Prisma/build và runtime NestJS; runtime chạy từ mã đã biên dịch.
# Bắt đầu giai đoạn image; AS đặt tên giai đoạn để COPY --from sử dụng.
FROM node:24-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS tools
# Chọn thư mục làm việc bên trong container cho các lệnh tiếp theo.
WORKDIR /app
# Chép file vào image; tách dependency trước nguồn giúp Docker tái dùng cache.
COPY package.json package-lock.json ./
# Chép file vào image; tách dependency trước nguồn giúp Docker tái dùng cache.
COPY vendor ./vendor
# Lệnh chạy khi build image, không chạy mỗi lần có request.
RUN npm ci --ignore-scripts --no-audit --no-fund
# Lệnh chạy khi build image, không chạy mỗi lần có request.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
# Chép file vào image; tách dependency trước nguồn giúp Docker tái dùng cache.
COPY prisma ./prisma
# Chép file vào image; tách dependency trước nguồn giúp Docker tái dùng cache.
COPY prisma.config.ts tsconfig.json tsconfig.build.json ./
# Chép file vào image; tách dependency trước nguồn giúp Docker tái dùng cache.
COPY src ./src
# Lệnh chạy khi build image, không chạy mỗi lần có request.
RUN npm run build

# Bắt đầu giai đoạn image; AS đặt tên giai đoạn để COPY --from sử dụng.
FROM node:24-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS runtime
# Chọn thư mục làm việc bên trong container cho các lệnh tiếp theo.
WORKDIR /app
# Chép file vào image; tách dependency trước nguồn giúp Docker tái dùng cache.
COPY package.json package-lock.json ./
# Chép file vào image; tách dependency trước nguồn giúp Docker tái dùng cache.
COPY vendor ./vendor
# Lệnh chạy khi build image, không chạy mỗi lần có request.
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
    && npm cache clean --force \
    && mkdir -p /app/work/mail-outbox \
    && chown -R node:node /app/work
# Chép file vào image; tách dependency trước nguồn giúp Docker tái dùng cache.
COPY --from=tools /app/dist ./dist
# Chạy bằng user được chỉ định trong image.
USER node
# Mô tả cổng container; không tự publish cổng ra máy chủ.
EXPOSE 3000
# Lệnh mặc định khi container khởi động.
CMD ["node", "dist/main.js"]
