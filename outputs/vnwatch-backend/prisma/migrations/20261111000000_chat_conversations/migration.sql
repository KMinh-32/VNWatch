-- Chỉ bổ sung hai bảng chatbot, không thay đổi dữ liệu bán hàng hiện có.
CREATE TABLE "HoiThoai" (
  "maHoiThoai" UUID NOT NULL,
  "maTK" UUID,
  "guestTokenHash" CHAR(64),
  "tieuDe" VARCHAR(150),
  "trangThai" VARCHAR(20) NOT NULL DEFAULT 'DANG_MO',
  "dataKind" VARCHAR(20) NOT NULL DEFAULT 'REFERENCE',
  "ngayTao" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ngayCapNhat" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "HoiThoai_pkey" PRIMARY KEY ("maHoiThoai"),
  CONSTRAINT "HoiThoai_owner_check" CHECK (("maTK" IS NOT NULL) <> ("guestTokenHash" IS NOT NULL)),
  CONSTRAINT "HoiThoai_status_check" CHECK ("trangThai" IN ('DANG_MO', 'DA_DONG')),
  CONSTRAINT "HoiThoai_kind_check" CHECK ("dataKind" IN ('REFERENCE', 'DEMO')),
  CONSTRAINT "HoiThoai_maTK_fkey" FOREIGN KEY ("maTK") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "TinNhan" (
  "maTinNhan" SERIAL NOT NULL,
  "maHoiThoai" UUID NOT NULL,
  "nguoiGui" VARCHAR(15) NOT NULL,
  "noiDung" TEXT NOT NULL,
  "yDinh" VARCHAR(30),
  "cheDo" VARCHAR(20),
  "tenMoHinh" VARCHAR(100),
  "trangThai" VARCHAR(20) NOT NULL DEFAULT 'HOAN_THANH',
  "thoiGian" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "requestId" UUID NOT NULL,
  "duLieuTraLoi" JSONB,
  CONSTRAINT "TinNhan_pkey" PRIMARY KEY ("maTinNhan"),
  CONSTRAINT "TinNhan_maHoiThoai_fkey" FOREIGN KEY ("maHoiThoai") REFERENCES "HoiThoai"("maHoiThoai") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TinNhan_sender_check" CHECK ("nguoiGui" IN ('user', 'assistant')),
  CONSTRAINT "TinNhan_status_check" CHECK ("trangThai" IN ('DANG_XU_LY', 'HOAN_THANH', 'LOI')),
  CONSTRAINT "TinNhan_mode_check" CHECK ("cheDo" IS NULL OR "cheDo" IN ('CATALOG', 'OPENAI'))
);
CREATE INDEX "HoiThoai_maTK_ngayCapNhat_idx" ON "HoiThoai"("maTK", "ngayCapNhat");
CREATE INDEX "HoiThoai_guestTokenHash_ngayCapNhat_idx" ON "HoiThoai"("guestTokenHash", "ngayCapNhat");
CREATE UNIQUE INDEX "TinNhan_maHoiThoai_requestId_nguoiGui_key" ON "TinNhan"("maHoiThoai", "requestId", "nguoiGui");
CREATE INDEX "TinNhan_maHoiThoai_maTinNhan_idx" ON "TinNhan"("maHoiThoai", "maTinNhan");
