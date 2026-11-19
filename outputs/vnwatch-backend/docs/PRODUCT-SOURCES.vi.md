# Sản phẩm thật trong VNWatch

## Cập nhật ngày 18/11/2026 — nguồn Duy Anh

Đã nhập thêm 25 mẫu đồng hồ nam từ [danh mục Duy Anh](https://donghoduyanh.com/dong-ho-nam-c594), gồm Daniel Wellington, Seiko, Tissot, Mido, Orient Star, Hamilton và Frederique Constant. Mỗi sản phẩm được đọc từ trang chi tiết, lưu mã SKU, giá tại thời điểm kiểm tra, loại máy, kích thước, chất liệu và URL nguồn. Tổng dữ liệu tham khảo chuẩn sau seed là 35 mẫu.

Dữ liệu bổ sung nằm ở `src/database/duy-anh-products.json`, hàm nhập ở `src/database/duy-anh-data.ts`, ảnh ở `../vnwatch-frontend/public/images/catalog`. Mỗi bản ghi JSON giữ cả URL ảnh gốc và đường dẫn ảnh cục bộ. Banner dùng ảnh đeo tay của mẫu DW00100900 từ trang nguồn, giữ dấu nguồn trên ảnh.

Seed thêm SKU chưa có, khởi tạo tồn giả lập 100 cho sản phẩm mới, giữ giá và tồn đã chỉnh sửa khi chạy lại. Giá nguồn là giá tham khảo tại ngày kiểm tra. Chạy `npm run db:seed` local hoặc dịch vụ init Docker để nhập. Các ảnh lưu cục bộ đi kèm frontend khi build Docker. Bộ lọc thương hiệu, dây và kính lấy từ catalog qua `/api/v1/products/facets`. Bộ lọc đường kính hỗ trợ phần thập phân. Các mẫu không tròn giữ kích thước đầy đủ.

## Đợt nhập ban đầu tháng 10/2026

Đã nhập 10 mẫu đại diện từ 5 hãng, kiểm tra nguồn ngày **02/10/2026**. Đây là dữ liệu tuyển chọn thủ công, chưa phải toàn bộ thị trường hoặc luồng đồng bộ thời gian thực. Nội dung giới thiệu được viết lại; ảnh, thông số và giá có nguồn riêng. Không sao chép đánh giá, thông tin khách hàng, cam kết chính hãng hoặc chính sách bảo hành của nơi khác.

| Sản phẩm                  | Nguồn thông số                                                                                                | Giá tham khảo VND | Nguồn giá                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------: | ------------------------------------------------------------------------------------------------------------------- |
| Casio AE-1200WHD-1AV      | [Casio](https://www.casio.com/vn/watches/casio/product.AE-1200WHD-1AV/)                                       |         1.501.000 | [Anh Khuê](https://casio.anhkhue.com/casio-timeless/ae-1200whd-1a)                                                  |
| G-SHOCK GA-2100-1A1       | [Casio](https://www.casio.com/vn/watches/gshock/product.GA-2100-1A1/)                                         |         3.627.000 | [Anh Khuê](https://casio.anhkhue.com/ga-2100/GA-2100-1A1)                                                           |
| Seiko SRPD55K1            | [Seiko USA, SRPD55](https://seikousa.com/products/srpd55)                                                     |         6.000.000 | [Passion Watch](https://passionwatch.vn/seiko-5-sports-srpd55k1/)                                                   |
| Seiko SRPE51K1            | [Seiko, SRPE51](https://www.seikowatches.com/global-en/products/5sports/srpe51)                               |         5.400.000 | [Đình Túc Watch](https://dinhtucwatch.com/dong-ho/dong-ho-seiko-srpe51k1)                                           |
| Citizen NJ0150-81L        | [Citizen Europe](https://citizenwatch.eu/en/p/nj0150-81l/)                                                    |         7.200.000 | [Vua Hàng Hiệu](https://vuahanghieu.com/dong-ho-nam-citizen-mechanical-automatic-watch-nj0150-81l-mau-bac-ph113399) |
| Citizen NJ0150-81E        | [Citizen Europe](https://citizenwatch.eu/en/p/nj0150-81e/)                                                    |         8.500.000 | [Vua Hàng Hiệu](https://vuahanghieu.com/dong-ho-nam-citizen-mechanical-automatic-watch-nj0150-81e-mau-bac-ph113404) |
| Orient RA-AA0001B19B      | [Orient Vietnam, website phân phối](https://orient-watch.vn/product/dong-ho-nam-orient-sports-ra-aa0001b19b/) |        11.000.000 | [Orient Vietnam](https://orient-watch.vn/product/dong-ho-nam-orient-sports-ra-aa0001b19b/)                          |
| Orient RA-AC0M04Y10B      | [Orient USA, RA-AC0M04Y](https://www.orientwatchusa.com/products/ra-ac0m04y30b)                               |         4.990.000 | [Vua Hàng Hiệu](https://vuahanghieu.com/dong-ho-nam-orient-bambino-ra-ac0m04y10b-mau-nau-bac-ph145010)              |
| Tissot T137.410.11.041.00 | [Tissot](https://www.tissotwatches.com/en-us/T1374101104100.html)                                             |        10.350.000 | [Hwatch](https://hwatch.com.vn/dong-ho-nam-tissot-quartz-prx-t137-410-11-041-00)                                    |
| Tissot T006.407.11.033.00 | [Tissot](https://www.tissotwatches.com/en-us/T0064071103300.html)                                             |        13.070.000 | [Shop Đồng Hồ](https://shopdongho.com/tissot-t006-407-11-033-00/)                                                   |

Giá có thể là giá khuyến mãi, khác theo khu vực/thời điểm; chưa phải giá bán của VNWatch. Mã thị trường được ghi rõ: SRPD55/K1 cùng mẫu gốc; trang Orient USA ghi RA-AC0M04Y30B và RA-AC0M04Y10B. Không lấy giá của đồng hồ màu khác hoặc đã qua sử dụng.

Ảnh Casio từ Anh Khuê; Seiko/Citizen/Tissot từ hãng; Kamasu từ Orient Vietnam; Bambino từ [Orient Đài Loan](https://orientwatchtaiwan.com/products/ra-ac0m04y). URL ảnh và trang nguồn lưu trong database. Ảnh dùng URL bên ngoài, cần Internet; khi nguồn lỗi, UI hiển thị “Ảnh chưa tải được” và giữ liên kết nguồn.

## Quy tắc nhập

- `dataKind=REFERENCE`, một SKU mỗi mẫu, bảo hành VNWatch **null**. Ngày 03/10/2026, theo yêu cầu người dùng, đã đặt mọi phiên bản hiện có thành **100 đơn vị tồn kho giả lập**. Seed development tạo phiên bản mới với tồn 100; không tự bổ sung tồn cho bản ghi cũ khi chạy lại. Không nhập tồn kho từ website nguồn. Có thể đặt COD giả lập bằng mẫu thật.
- Casio và PRX có kích thước các trục vỏ trong `caseDimensionsMm`, không biến chiều rộng thành đường kính. Mẫu tròn có `caseDiameterMm` decimal.
- DEMO giữ riêng để thử COD. Backend kiểm tra giá/tồn, kể cả khi gọi API trực tiếp.
- Trước khi bán, cần cấu hình tồn kho, giá bán và chính sách VNWatch. Chưa có quản trị catalog/tồn kho hoặc tự cập nhật giá.

Trong `vnwatch-backend`, `.env` phải trỏ tới database loopback `_dev`, `NODE_ENV=development`:

```powershell
npm run db:migrate
npm run db:seed
```

Seed thêm DEMO và REFERENCE, không reset database. Nguồn nằm trong `src/database/reference-data.ts`. Nhập lại không tạo trùng hoặc ghi đè giá, tồn và chính sách đã có; seed không đồng bộ thay đổi giá. `npm run db:restock:demo` là thao tác chủ động đặt lại tồn mọi phiên bản thành 100, chỉ cho database development loopback; có bản ghi trước/sau trong `work/inventory-updates`. Không chạy lệnh này như một phần của startup thông thường.

API: `/api/v1/products?dataKind=REFERENCE&brand=Casio`; bỏ `brand` để xem 10 mẫu, bỏ `dataKind` để xem cả hai bộ. Website mặc định hiện sản phẩm thật; chọn **Bộ dữ liệu → Demo đặt hàng** để thử COD.
