# HỌC VNWATCH — outputs/vnwatch-agent/contracts.py
# Hợp đồng Pydantic giữa NestJS, FastAPI và mô hình. Plan chỉ mô tả truy vấn, không phải lệnh SQL hoặc câu trả lời tự do.
# import nạp dependency; async/await chờ I/O mà không chặn toàn bộ event loop.
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


# Pydantic Message: validate cấu trúc/kiểu/giới hạn của dữ liệu được truyền giữa dịch vụ.
class Message(BaseModel):
    model_config = ConfigDict(extra="forbid")
    # Vai trò tài khoản; backend kiểm tra quyền từ database.
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=1000)


# Pydantic Variant: validate cấu trúc/kiểu/giới hạn của dữ liệu được truyền giữa dịch vụ.
class Variant(BaseModel):
    # Định danh bản ghi hoặc request để theo dõi/hủy.
    id: str
    # Mã SKU duy nhất của phiên bản đồng hồ.
    sku: str
    # Nhãn hiển thị của lựa chọn/đối tượng.
    label: str
    # Đơn giá nguyên VND, không dùng số thực để tính tiền.
    priceVnd: int = Field(ge=0, le=2147483647)
    # Cờ khả dụng suy ra từ tồn; không phải giữ chỗ cho khách.
    inStock: bool
    # Loại máy: quartz, automatic, mechanical hoặc solar.
    movementType: str
    # Đường kính mm; có thể null nếu nguồn chỉ cung cấp kích thước khác.
    caseDiameterMm: str | None = None
    # Kích thước đầy đủ theo nguồn, phù hợp cả vỏ không tròn.
    caseDimensionsMm: str | None = None
    # Chất liệu vỏ.
    caseMaterial: str
    # Chất liệu mặt kính.
    crystalMaterial: str
    # Chất liệu dây.
    strapMaterial: str
    # Thông số chống nước theo mét do catalog lưu.
    waterResistanceM: int
    # Số tháng bảo hành; null nghĩa chưa xác định, không tự tạo bảo hành.
    warrantyMonths: int | None = None
    # Tên nguồn giá.
    priceSourceName: str | None = None
    # URL nguồn giá để người dùng đối chiếu.
    priceSourceUrl: str | None = None
    # Mốc kiểm tra giá tham khảo; không bảo đảm giá còn giống ở nguồn ngoài.
    priceCheckedAt: str | None = None


# Mẫu đồng hồ chứa thông tin chung, tách khỏi SKU.
class Product(BaseModel):
    # Định danh bản ghi hoặc request để theo dõi/hủy.
    id: str
    # Tên đối tượng dùng để hiển thị.
    name: str
    # Tên thương hiệu của mẫu.
    brand: str
    # Nhóm sản phẩm cho bộ lọc.
    category: str
    # Mô tả được lưu trong catalog.
    description: str
    # DEMO là dữ liệu giả, REFERENCE là mẫu thật có nguồn tham khảo.
    dataKind: Literal["DEMO", "REFERENCE"]
    # Tên nguồn thông tin của mẫu.
    sourceName: str | None = None
    # URL nguồn thông tin dùng để đối chiếu.
    sourceUrl: str | None = None
    # Mốc đã tra cứu nguồn, không phải thời gian cập nhật tự động.
    sourceCheckedAt: str | None = None
    # Các phiên bản/SKU thuộc một mẫu.
    variants: list[Variant] = Field(max_length=50)


# Pydantic Source: validate cấu trúc/kiểu/giới hạn của dữ liệu được truyền giữa dịch vụ.
class Source(BaseModel):
    # Tiêu đề hiển thị.
    title: str
    # Địa chỉ URL của nguồn/request theo hợp đồng.
    url: str
    # Mốc kiểm tra nguồn.
    checkedAt: str | None = None


# Pydantic Brand: validate cấu trúc/kiểu/giới hạn của dữ liệu được truyền giữa dịch vụ.
class Brand(BaseModel):
    # Tên đối tượng dùng để hiển thị.
    name: str
    summary: str
    source: Source


# Pydantic ChatRequest: validate cấu trúc/kiểu/giới hạn của dữ liệu được truyền giữa dịch vụ.
class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    # Thông báo hoặc câu hỏi; giới hạn bằng hợp đồng đầu vào.
    message: str = Field(min_length=1, max_length=1000)
    # Lịch sử hội thoại giới hạn, được coi là dữ liệu không đáng tin.
    history: list[Message] = Field(default_factory=list, max_length=8)
    # Các mẫu trong catalog hoặc dữ liệu danh mục được tải.
    products: list[Product] = Field(max_length=200)
    # Thông tin thương hiệu có nguồn do gateway cung cấp.
    brands: list[Brand] = Field(max_length=20)
    # Chính sách VNWatch đã được gateway chọn, không suy ra từ chính sách hãng.
    policies: dict[str, str]
    # Cho biết lượt tra cứu đã giới hạn catalog, không gồm toàn bộ mẫu.
    truncated: bool = False


# Pydantic Plan: validate cấu trúc/kiểu/giới hạn của dữ liệu được truyền giữa dịch vụ.
class Plan(BaseModel):
    # Model output is a read-only query, never an answer or an executable command.
    model_config = ConfigDict(extra="forbid", strict=True)
    # Ý định chỉ đọc: tìm, mẫu, hãng, chính sách, hướng dẫn hoặc ngoài phạm vi.
    intent: Literal["search", "product", "brand", "policy", "guide", "unsupported"]
    # Tên thương hiệu của mẫu.
    brand: str | None
    # Các ID mẫu được phép tra cứu từ catalog.
    productIds: list[str] = Field(max_length=3)
    # Bộ lọc hoặc từ khóa truy vấn, không phải câu SQL thực thi.
    query: str | None = Field(max_length=100)
    # Cận dưới ngân sách VND.
    minPriceVnd: int | None = Field(ge=0, le=2147483647)
    # Cận trên ngân sách VND.
    maxPriceVnd: int | None = Field(ge=0, le=2147483647)
    # Giới hạn đường kính mm khi tư vấn.
    maxDiameterMm: float | None = Field(ge=10, le=60)
    # Bộ lọc loại máy cho kế hoạch tra cứu trợ lý.
    movement: Literal["QUARTZ", "AUTOMATIC", "MECHANICAL", "SOLAR"] | None
    # Chỉ lấy SKU còn hàng khi bộ lọc yêu cầu.
    inStockOnly: bool
    # Chủ đề chính sách được phép tra cứu.
    topic: Literal["warranty", "returns", "delivery", "payment", "orders", "support"] | None


# Pydantic Selection: validate cấu trúc/kiểu/giới hạn của dữ liệu được truyền giữa dịch vụ.
class Selection(BaseModel):
    # ID mẫu đồng hồ; một mẫu có thể có nhiều SKU.
    productId: str
    # Các ID SKU thuộc mẫu được chọn.
    variantIds: list[str]


# Pydantic ChatReply: validate cấu trúc/kiểu/giới hạn của dữ liệu được truyền giữa dịch vụ.
class ChatReply(BaseModel):
    # Thông tin được server lưu vào TinNhan theo ERD, không lấy từ trình duyệt.
    intent: Literal["search", "product", "brand", "policy", "guide", "unsupported"] | None = None
    modelName: str | None = None
    # Chế độ hội thoại/provider hoặc thao tác giỏ, theo hợp đồng của file.
    mode: Literal["CATALOG", "OPENAI"]
    # Thông báo chế độ catalog hoặc fallback khi provider lỗi.
    notice: str | None
    # Nội dung trả lời dựng từ dữ liệu đã cung cấp.
    text: str
    # Các ID mẫu/SKU được chọn; NestJS đối chiếu lại với catalog.
    selection: list[Selection] = Field(default_factory=list)
    # Nguồn đã được whitelist/đối chiếu.
    sources: list[Source] = Field(default_factory=list)
    # Hành động nghiệp vụ/đích điều hướng thuộc danh sách cho phép.
    action: Literal["orders", "collection", "guide"] | None = None
