/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/assistant/knowledge.ts
 * Kiến thức thương hiệu có nguồn và chính sách của VNWatch được cung cấp cho trợ lý; không phải dữ liệu riêng của user.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
// Reviewed public facts. Retailer warranty/returns are never manufacturer policies.
export const brands = [
  {
    name: 'Casio',
    summary:
      'Casio có trụ sở tại Tokyo, Nhật Bản. Casio Computer Co., Ltd. được thành lập ngày 1/6/1957.',
    source: {
      title: 'Casio — Company Data',
      url: 'https://world.casio.com/corporate/profile/',
      checkedAt: '2026-10-03',
    },
  },
  {
    name: 'Seiko',
    summary:
      'Lịch sử Seiko bắt đầu năm 1881 khi Kintaro Hattori mở cửa hàng bán và sửa đồng hồ tại Tokyo, Nhật Bản. Mẫu đồng hồ đầu tiên mang tên Seiko xuất hiện năm 1924.',
    source: {
      title: 'Seiko — Our Heritage',
      url: 'https://www.seikowatches.com/global-en/special/heritage/',
      checkedAt: '2026-10-03',
    },
  },
  {
    name: 'Citizen',
    summary:
      'Citizen có nguồn gốc tại Nhật Bản, với tiền thân là Shokosha Watch Research Institute năm 1918. Citizen Watch Company được thành lập năm 1930.',
    source: {
      title: 'Citizen — History',
      url: 'https://www.citizenwatch-global.com/100th/history/index.html',
      checkedAt: '2026-10-03',
    },
  },
  {
    name: 'Orient',
    summary:
      'Orient bắt đầu sản xuất đồng hồ năm 1950 với tên Tama Keiki; năm 1951 đổi tên thành Orient Watch Co., Ltd. Công ty sáp nhập vào Seiko Epson năm 2017.',
    source: {
      title: 'Orient — About Orient',
      url: 'https://orient-watch.com/en/about_orient/',
      checkedAt: '2026-10-03',
    },
  },
  {
    name: 'Tissot',
    summary:
      'Tissot bắt đầu tại Le Locle, Thụy Sĩ, năm 1853. Dòng Le Locle được giới thiệu năm 2003 để kỷ niệm 150 năm thương hiệu.',
    source: {
      title: 'Tissot — A Story That Starts in Le Locle',
      url: 'https://www.tissotwatches.com/en-gb/magazine-news-beginnings-le-locle.html',
      checkedAt: '2026-10-03',
    },
  },
];

export const policies = {
  warranty:
    'VNWatch chưa công bố chính sách bảo hành chung cho sản phẩm thật. Thời hạn đã cấu hình cho từng phiên bản sẽ hiện ở trang chi tiết; nếu ghi “Chưa thiết lập chính sách”, mình chưa thể xác nhận. Với SKU có thời hạn, bảo hành demo kích hoạt khi đơn hoàn tất giao hàng và thanh toán demo (COD hoặc QR); hãy đăng nhập, mở “Bảo hành của tôi” để xem hoặc gửi yêu cầu. Không tạo serial giả. Chính sách của nhà sản xuất hoặc website nguồn không tự động áp dụng tại VNWatch.',
  returns:
    'VNWatch chưa có chính sách đổi trả hoặc hoàn tiền được xác nhận cho sản phẩm thật. Mình chưa thể hứa thời hạn đổi trả. Cần chủ cửa hàng bổ sung chính sách trước khi mua bán thực tế.',
  delivery:
    'Website hiện là bản demo; chưa thiết lập phí vận chuyển, thời gian giao hoặc đơn vị giao hàng thực tế. Đơn COD trong demo là giả lập.',
  payment:
    'Website hỗ trợ đặt COD giả lập với mọi tài khoản đang hoạt động: đăng nhập trước, chọn phiên bản còn hàng, thêm vào giỏ rồi chọn địa chỉ đã lưu hoặc điền thông tin nhận hàng. Giỏ lưu riêng theo tài khoản trên server. Có thể nhập mã giảm giá ở checkout; server kiểm tra thời hạn và lượt dùng, hủy đơn không trả lại lượt mã. Có lựa chọn QR demo ngay tại checkout: tạo đơn, xem mã QR của đơn rồi bấm “Mô phỏng thanh toán thành công”. QR này không chứa tài khoản ngân hàng, không chuyển tiền thật; quét mã không tự xác nhận. Chỉ chủ đơn xác nhận demo; không hủy hoặc hoàn tiền demo sau khi đã xác nhận. Thanh toán online thật chưa cấu hình. Khách chưa đăng nhập chỉ xem sản phẩm và tư vấn; cần đăng nhập để thêm vào giỏ và đặt mua. Sản phẩm thật dùng giá tham khảo và tồn kho giả lập khởi tạo 100 mỗi phiên bản; đặt đơn sẽ giảm tồn, hủy đơn chờ sẽ hoàn lại. Trợ lý chỉ tư vấn; bạn tự xác nhận đặt hàng ở trang thanh toán.',
  orders:
    'Để xem đơn của chính bạn, hãy đăng nhập và mở “Đơn hàng của tôi”. Trợ lý không truy cập thông tin đơn hàng riêng tư, không hủy đơn hay thay đổi thanh toán qua chat.',
  support:
    'Bạn có thể đăng nhập, bấm “Hỗ trợ” trên website để tạo yêu cầu tư vấn hoặc hỏi về đơn của chính mình, rồi xem phản hồi nhân viên tại cùng màn hình. Chat không tự tạo hoặc gửi yêu cầu thay bạn. Kênh này lưu trong hệ thống demo; chưa có hotline, gửi email/SMS hoặc thời gian phản hồi cam kết.',
};
