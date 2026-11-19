/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/database/reference-data.ts
 * Catalog sản phẩm thật có nguồn và mốc tra cứu cố định. Seed không tự làm mới giá, ảnh hay tồn mỗi lần chạy.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { PrismaService } from './prisma.service';
import { MovementType } from '../generated/prisma/client';

// Curated snapshot, not a live feed. Prices belong to the linked external sellers.
// No external inventory, reviews, authenticity claims or warranty policies are copied.
export const REFERENCE_CHECKED_AT = new Date('2026-10-02T00:00:00.000Z');
export const referenceProducts = [
  {
    slug: 'casio-ae-1200whd-1av',
    name: 'Casio AE-1200WHD-1AV',
    brand: 'Casio',
    category: 'sport',
    sku: 'AE-1200WHD-1AV',
    label: 'Màn hình số / Dây thép',
    movementType: 'QUARTZ' as MovementType,
    description:
      'Đồng hồ điện tử với giờ thế giới, đèn LED và 5 báo thức. Vỏ nhựa phối dây thép, pin CR2025 có thời lượng khoảng 10 năm theo hãng.',
    diameter: null,
    dimensions: '45 × 42.1 × 12.5 mm (dài × rộng × dày)',
    caseMaterial: 'Nhựa resin',
    crystalMaterial: 'Kính nhựa resin',
    strapMaterial: 'Thép không gỉ',
    waterResistanceM: 100,
    sourceName: 'Casio',
    sourceUrl: 'https://www.casio.com/vn/watches/casio/product.AE-1200WHD-1AV/',
    image:
      'https://casio.anhkhue.com/upload/images/general/ae-1200whd-1avdf_f0a7c4ccb2eb4f08aeb3e079b09f1b8c_master.jpg',
    priceVnd: 1501000,
    priceSourceName: 'Casio Anh Khuê',
    priceSourceUrl: 'https://casio.anhkhue.com/casio-timeless/ae-1200whd-1a',
  },
  {
    slug: 'g-shock-ga-2100-1a1',
    name: 'Casio G-SHOCK GA-2100-1A1',
    brand: 'Casio',
    category: 'sport',
    sku: 'GA-2100-1A1',
    label: 'Đen / Dây resin',
    movementType: 'QUARTZ' as MovementType,
    description:
      'Thiết kế kim kết hợp màn hình số, vỏ carbon và resin. Mẫu G-SHOCK này có cấu trúc chống sốc và mức chịu nước 200 m theo hãng.',
    diameter: null,
    dimensions: '48.5 × 45.4 × 11.8 mm (dài × rộng × dày)',
    caseMaterial: 'Carbon / Nhựa resin',
    crystalMaterial: 'Kính khoáng',
    strapMaterial: 'Nhựa resin',
    waterResistanceM: 200,
    sourceName: 'Casio',
    sourceUrl: 'https://www.casio.com/vn/watches/gshock/product.GA-2100-1A1/',
    image: 'https://casio.anhkhue.com/upload/images/11-2022/GA-2100-1A11.webp',
    priceVnd: 3627000,
    priceSourceName: 'Casio Anh Khuê',
    priceSourceUrl: 'https://casio.anhkhue.com/ga-2100/GA-2100-1A1',
  },
  {
    slug: 'seiko-5-sports-srpd55k1',
    name: 'Seiko 5 Sports SRPD55K1',
    brand: 'Seiko',
    category: 'sport',
    sku: 'SRPD55K1',
    label: 'Mặt đen / Dây thép',
    movementType: 'AUTOMATIC' as MovementType,
    description:
      'Seiko 5 Sports với mặt số đen và vành xoay một chiều. Bộ máy 4R36 hỗ trợ lên cót tay, lịch thứ và ngày, trữ cót khoảng 41 giờ.',
    diameter: '42.50',
    dimensions: null,
    caseMaterial: 'Thép không gỉ',
    crystalMaterial: 'Hardlex',
    strapMaterial: 'Thép không gỉ',
    waterResistanceM: 100,
    sourceName: 'Seiko USA (model SRPD55)',
    sourceUrl: 'https://seikousa.com/products/srpd55',
    image:
      'https://seikousa.com/cdn/shop/files/SRPD55_1_7d0da364-2778-4b4d-a1e8-be406cb6965b.png?v=1786545460',
    priceVnd: 6000000,
    priceSourceName: 'Passion Watch',
    priceSourceUrl: 'https://passionwatch.vn/seiko-5-sports-srpd55k1/',
  },
  {
    slug: 'seiko-5-sports-srpe51k1',
    name: 'Seiko 5 Sports SRPE51K1',
    brand: 'Seiko',
    category: 'dress',
    sku: 'SRPE51K1',
    label: 'Mặt xám / Dây thép',
    movementType: 'AUTOMATIC' as MovementType,
    description:
      'Đồng hồ cơ dáng tròn 40 mm với dây thép và kính Hardlex. Máy 4R36 có trữ cót khoảng 41 giờ, lịch thứ và ngày; mặt số xám tạo cảm giác thanh lịch.',
    diameter: '40.00',
    dimensions: null,
    caseMaterial: 'Thép không gỉ',
    crystalMaterial: 'Hardlex',
    strapMaterial: 'Thép không gỉ',
    waterResistanceM: 100,
    sourceName: 'Seiko',
    sourceUrl: 'https://www.seikowatches.com/global-en/products/5sports/srpe51',
    image:
      'https://www.seikowatches.com/global-en/-/media/Images/Product--Image/All/Seiko/2022/02/20/02/23/SRPE51K1/SRPE51K1.png?mh=1200&mw=1200',
    priceVnd: 5400000,
    priceSourceName: 'Đình Túc Watch',
    priceSourceUrl: 'https://dinhtucwatch.com/dong-ho/dong-ho-seiko-srpe51k1',
  },
  {
    slug: 'citizen-tsuyosa-nj0150-81l',
    name: 'Citizen Tsuyosa NJ0150-81L',
    brand: 'Citizen',
    category: 'dress',
    sku: 'NJ0150-81L',
    label: 'Mặt xanh / Dây thép',
    movementType: 'AUTOMATIC' as MovementType,
    description:
      'Tsuyosa mặt xanh với dây thép tích hợp và kính sapphire. Máy tự động 8210, vỏ 40 mm và cửa sổ lịch ngày tạo nên thiết kế dễ phối đồ.',
    diameter: '40.00',
    dimensions: null,
    caseMaterial: 'Thép không gỉ',
    crystalMaterial: 'Sapphire',
    strapMaterial: 'Thép không gỉ',
    waterResistanceM: 50,
    sourceName: 'Citizen Europe',
    sourceUrl: 'https://citizenwatch.eu/en/p/nj0150-81l/',
    image:
      'https://citizenwatch.eu/media/thumbs/15/42/bcfbc73b625f9f36e384a23ba48a49c5f4e2/1400x_crop=center;format=webp/managed/61/9c/619c0c2b5e7e0bdc224198afbd60031f/NJ0150-81L.png.thumb.webp',
    priceVnd: 7200000,
    priceSourceName: 'Vua Hàng Hiệu',
    priceSourceUrl:
      'https://vuahanghieu.com/dong-ho-nam-citizen-mechanical-automatic-watch-nj0150-81l-mau-bac-ph113399',
  },
  {
    slug: 'citizen-tsuyosa-nj0150-81e',
    name: 'Citizen Tsuyosa NJ0150-81E',
    brand: 'Citizen',
    category: 'dress',
    sku: 'NJ0150-81E',
    label: 'Mặt đen / Dây thép',
    movementType: 'AUTOMATIC' as MovementType,
    description:
      'Phiên bản Tsuyosa mặt đen, vỏ và dây thép không gỉ. Bộ máy tự động 8210 có trữ cót khoảng 40 giờ; kính sapphire bảo vệ mặt số.',
    diameter: '40.00',
    dimensions: null,
    caseMaterial: 'Thép không gỉ',
    crystalMaterial: 'Sapphire',
    strapMaterial: 'Thép không gỉ',
    waterResistanceM: 50,
    sourceName: 'Citizen Europe',
    sourceUrl: 'https://citizenwatch.eu/en/p/nj0150-81e/',
    image:
      'https://citizenwatch.eu/media/thumbs/ad/6e/35cbd689893c080b6eac7551a263a8b0d5c1/1400x_crop=center;format=webp/managed/7c/db/7cdb49fc398e81f522e5c19679f4f518/NJ0150-81E.png.thumb.webp',
    priceVnd: 8500000,
    priceSourceName: 'Vua Hàng Hiệu',
    priceSourceUrl:
      'https://vuahanghieu.com/dong-ho-nam-citizen-mechanical-automatic-watch-nj0150-81e-mau-bac-ph113404',
  },
  {
    slug: 'orient-kamasu-ra-aa0001b19b',
    name: 'Orient Kamasu RA-AA0001B19B',
    brand: 'Orient',
    category: 'sport',
    sku: 'RA-AA0001B19B',
    label: 'Mặt đen / Dây thép',
    movementType: 'AUTOMATIC' as MovementType,
    description:
      'Đồng hồ cơ Kamasu với mặt số đen, kính sapphire và dây thép. Vỏ 41.8 mm, lịch thứ và ngày, mức chịu nước 200 m theo thông tin sản phẩm.',
    diameter: '41.80',
    dimensions: null,
    caseMaterial: 'Thép không gỉ',
    crystalMaterial: 'Sapphire',
    strapMaterial: 'Thép không gỉ',
    waterResistanceM: 200,
    sourceName: 'Orient Vietnam (website phân phối)',
    sourceUrl:
      'https://orient-watch.vn/product/dong-ho-nam-orient-sports-ra-aa0001b19b/',
    image:
      'https://orient-watch.vn/wp-content/uploads/2022/10/ra-aa0001b19b_1539144338.png',
    priceVnd: 11000000,
    priceSourceName: 'Orient Vietnam',
    priceSourceUrl:
      'https://orient-watch.vn/product/dong-ho-nam-orient-sports-ra-aa0001b19b/',
  },
  {
    slug: 'orient-bambino-ra-ac0m04y10b',
    name: 'Orient Bambino RA-AC0M04Y10B',
    brand: 'Orient',
    category: 'dress',
    sku: 'RA-AC0M04Y10B',
    label: 'Mặt champagne / Dây da nâu',
    movementType: 'AUTOMATIC' as MovementType,
    description:
      'Bambino Version 7 với mặt champagne và dây da nâu. Máy F6724 tự động hỗ trợ lên cót tay, vỏ 38.4 mm và kính khoáng dạng vòm.',
    diameter: '38.40',
    dimensions: null,
    caseMaterial: 'Thép không gỉ',
    crystalMaterial: 'Kính khoáng dạng vòm',
    strapMaterial: 'Da',
    waterResistanceM: 30,
    sourceName: 'Orient Watch USA (RA-AC0M04Y)',
    sourceUrl: 'https://www.orientwatchusa.com/products/ra-ac0m04y30b',
    image:
      'https://orientwatchtaiwan.com/cdn/shop/files/RA-AC0M04Y_s.jpg?v=1721290205',
    priceVnd: 4990000,
    priceSourceName: 'Vua Hàng Hiệu',
    priceSourceUrl:
      'https://vuahanghieu.com/dong-ho-nam-orient-bambino-ra-ac0m04y10b-mau-nau-bac-ph145010',
  },
  {
    slug: 'tissot-prx-t1374101104100',
    name: 'Tissot PRX T137.410.11.041.00',
    brand: 'Tissot',
    category: 'sport',
    sku: 'T137.410.11.041.00',
    label: 'Mặt xanh / Dây thép',
    movementType: 'QUARTZ' as MovementType,
    description:
      'PRX quartz với mặt xanh và dây thép tích hợp. Vỏ thép 316L rộng 40 mm, kính sapphire và lịch ngày; kiểu dáng lấy cảm hứng từ thiết kế PRX năm 1978.',
    diameter: null,
    dimensions: '39.5 × 40 × 10.4 mm (trục 12–6h × trục 3–9h × dày)',
    caseMaterial: 'Thép không gỉ 316L',
    crystalMaterial: 'Sapphire',
    strapMaterial: 'Thép không gỉ',
    waterResistanceM: 100,
    sourceName: 'Tissot',
    sourceUrl: 'https://www.tissotwatches.com/en-us/T1374101104100.html',
    image:
      'https://www.tissotwatches.com/on/demandware.static/-/Sites-Tissot-Catalogue/default/dw9b840963/product-pictures/739cc440-025b-42e8-a5f9-ae33b31479b2_T137-410-11-041-00_shadow.png',
    priceVnd: 10350000,
    priceSourceName: 'Hwatch',
    priceSourceUrl:
      'https://hwatch.com.vn/dong-ho-nam-tissot-quartz-prx-t137-410-11-041-00',
  },
  {
    slug: 'tissot-le-locle-t0064071103300',
    name: 'Tissot Le Locle T006.407.11.033.00',
    brand: 'Tissot',
    category: 'dress',
    sku: 'T006.407.11.033.00',
    label: 'Mặt bạc / Dây thép',
    movementType: 'AUTOMATIC' as MovementType,
    description:
      'Le Locle với cọc số La Mã và bộ máy Powermatic 80. Vỏ tròn 39.3 mm, mặt kính sapphire và dây thép không gỉ mang phong cách cổ điển.',
    diameter: '39.30',
    dimensions: null,
    caseMaterial: 'Thép không gỉ 316L',
    crystalMaterial: 'Sapphire',
    strapMaterial: 'Thép không gỉ',
    waterResistanceM: 30,
    sourceName: 'Tissot',
    sourceUrl: 'https://www.tissotwatches.com/en-us/T0064071103300.html',
    image:
      'https://www.tissotwatches.com/on/demandware.static/-/Sites-Tissot-Catalogue/default/dw1af9d0f4/product-pictures/8c99426a-3edc-4e15-ae24-ef8e49f73757_T006-407-11-033-00_shadow.png',
    priceVnd: 13070000,
    priceSourceName: 'Shop Đồng Hồ',
    priceSourceUrl: 'https://shopdongho.com/tissot-t006-407-11-033-00/',
  },
];

/** Nhập mẫu/SKU thật có nguồn trong một transaction; chỉ tạo bản ghi thiếu, tồn khởi tạo do tham số quyết định. */
export async function seedReference(
  prisma: PrismaService,
  initialStock = 0,
): Promise<void> {
  // One transaction prevents a partial import; re-running preserves business edits.
  await prisma.$transaction(async (tx) => {
    for (const [index, p] of referenceProducts.entries()) {
      const suffix = String(index + 1).padStart(12, '0');
      const product = await tx.product.upsert({
        where: { slug: p.slug },
        update: {},
        create: {
          id: `40000000-0000-4000-8000-${suffix}`,
          slug: p.slug,
          name: p.name,
          brand: p.brand,
          category: p.category,
          description: p.description,
          status: 'ACTIVE',
          dataKind: 'REFERENCE',
          imageUrls: [p.image],
          sourceName: p.sourceName,
          sourceUrl: p.sourceUrl,
          sourceCheckedAt: REFERENCE_CHECKED_AT,
          imageSourceUrl:
            p.sku === 'RA-AC0M04Y10B'
              ? 'https://orientwatchtaiwan.com/products/ra-ac0m04y'
              : ['AE-1200WHD-1AV', 'GA-2100-1A1'].includes(p.sku)
                ? p.priceSourceUrl
                : p.sourceUrl,
        },
      });
      await tx.productVariant.upsert({
        where: { sku: p.sku },
        update: {},
        create: {
          id: `50000000-0000-4000-8000-${suffix}`,
          productId: product.id,
          sku: p.sku,
          label: p.label,
          priceVnd: p.priceVnd,
          stockQuantity: initialStock,
          status: 'ACTIVE',
          movementType: p.movementType,
          caseDiameterMm: p.diameter,
          caseDimensionsMm: p.dimensions,
          caseMaterial: p.caseMaterial,
          crystalMaterial: p.crystalMaterial,
          strapMaterial: p.strapMaterial,
          waterResistanceM: p.waterResistanceM,
          warrantyMonths: null,
          priceSourceName: p.priceSourceName,
          priceSourceUrl: p.priceSourceUrl,
          priceCheckedAt: REFERENCE_CHECKED_AT,
        },
      });
    }
  });
}
