/**
 * Danh mục sản phẩm mẫu dùng để seed database.
 * Nguồn dữ liệu duy nhất cho server. Frontend đọc qua API, không import file này.
 */
export const categories = [
  { id: 'figure', name: 'Figure & Nhân vật' },
  { id: 'decor', name: 'Trang trí & Thư tượng' },
  { id: 'collectible', name: 'Sưu tầm' },
  { id: 'custom', name: 'Sản xuất riêng' },
]

export const seedProducts = [
  {
    id: 'p1',
    slug: 'mo-hinh-ky-vien-3d',
    name: 'Mô hình Kỷ Viễn In 3D',
    category: 'figure',
    description: 'Mô hình nhân vật đặc biệt, in 3D chi tiết cao, phù hợp sưu tầm và trang trí bàn làm việc.',
    base_price: 250000,
    images: [
      'https://images.unsplash.com/photo-1618990102830-3060efb9c4ca?w=800&q=80',
      'https://images.unsplash.com/photo-1589930274168-c0994299ca3b?w=800&q=80',
    ],
    status: 'active',
    production_days: 5,
    featured: 1,
    variants: [
      { id: 'v1', sku: 'FIG-001-RED', color: 'Đỏ', size: '15cm', price: 250000, stock: 12, min_qty: 1, max_qty: 10 },
      { id: 'v2', sku: 'FIG-001-BLU', color: 'Xanh dương', size: '15cm', price: 250000, stock: 8, min_qty: 1, max_qty: 10 },
      { id: 'v3', sku: 'FIG-001-BLK', color: 'Đen', size: '20cm', price: 350000, stock: 5, min_qty: 1, max_qty: 6 },
    ],
  },
  {
    id: 'p2',
    slug: 'mo-hinh-trong-tuong-3d',
    name: 'Mô hình Trong Tùm In 3D',
    category: 'decor',
    description: 'Mô hình cảnh tùng non in 3D, ánh sáng lên và tạo không gian nghỉ ngơi.',
    base_price: 420000,
    images: [
      'https://images.unsplash.com/photo-1606893906813-f7d12e3c62ad?w=800&q=80',
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80',
    ],
    status: 'active',
    production_days: 7,
    featured: 1,
    variants: [
      { id: 'v4', sku: 'DEC-002-WHT', color: 'Trắng', size: '12cm', price: 420000, stock: 7, min_qty: 1, max_qty: 8 },
      { id: 'v5', sku: 'DEC-002-BLK', color: 'Đen', size: '12cm', price: 450000, stock: 4, min_qty: 1, max_qty: 5 },
    ],
  },
  {
    id: 'p3',
    slug: 'mo-hinh-dong-vat-3d',
    name: 'Mô hình Động Vật In 3D',
    category: 'collectible',
    description: 'Bộ sưu tập động vật in 3D tinh xảo, màu sắc tươi sáng, phù hợp quà tặng.',
    base_price: 180000,
    images: ['https://images.unsplash.com/photo-1594273774108-7107b6f71f60?w=800&q=80'],
    status: 'active',
    production_days: 4,
    featured: 1,
    variants: [
      { id: 'v6', sku: 'COL-003-PNK', color: 'Hồng', size: '10cm', price: 180000, stock: 20, min_qty: 1, max_qty: 12 },
      { id: 'v7', sku: 'COL-003-YLW', color: 'Vàng', size: '10cm', price: 180000, stock: 15, min_qty: 1, max_qty: 12 },
    ],
  },
  {
    id: 'p4',
    slug: 'mo-hinh-phim-hien-dai-3d',
    name: 'Mô hình Phim Hiện Đại In 3D',
    category: 'figure',
    description: 'Nhân vật phim ảnh in 3D, chi tiết sắc nét, vật liệu cao cấp.',
    base_price: 320000,
    images: ['https://images.unsplash.com/photo-1611720731423-c05ce6bb27b7?w=800&q=80'],
    status: 'active',
    production_days: 6,
    featured: 1,
    variants: [
      { id: 'v8', sku: 'FIG-004-RED', color: 'Đỏ', size: '18cm', price: 320000, stock: 6, min_qty: 1, max_qty: 6 },
    ],
  },
  {
    id: 'p5',
    slug: 'mo-hinh-xe-custom-3d',
    name: 'Mô hình Xe Custom In 3D',
    category: 'collectible',
    description: 'Xe mô hình custom theo yêu cầu, in 3D độ phân giải cao.',
    base_price: 550000,
    images: ['https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80'],
    status: 'active',
    production_days: 10,
    featured: 0,
    variants: [
      { id: 'v9', sku: 'CAR-005-BLU', color: 'Xanh', size: '25cm', price: 550000, stock: 3, min_qty: 1, max_qty: 3 },
    ],
  },
  {
    id: 'p6',
    slug: 'mo-hinh-thu-tuong-3d',
    name: 'Mô hình Thư Tượng In 3D',
    category: 'decor',
    description: 'Thư tượng in 3D phong cách hiện đại, phù hợp trang trí văn phòng.',
    base_price: 290000,
    images: ['https://images.unsplash.com/photo-1578642318673-725840a1c7ff?w=800&q=80'],
    status: 'active',
    production_days: 5,
    featured: 0,
    variants: [
      { id: 'v10', sku: 'DEC-006-WHT', color: 'Trắng', size: '14cm', price: 290000, stock: 9, min_qty: 1, max_qty: 8 },
    ],
  },
  {
    id: 'p7',
    slug: 'mo-hinh-linh-thong-3d',
    name: 'Mô hình Linh Thông In 3D',
    category: 'figure',
    description: 'Nhân vật linh thông cưỡi mây, in 3D nhiều lớp chi tiết sắc nét.',
    base_price: 390000,
    images: ['https://images.unsplash.com/photo-1608889175123-8ee362201f81?w=800&q=80'],
    status: 'active',
    production_days: 8,
    featured: 0,
    variants: [
      { id: 'v11', sku: 'FIG-007-WHT', color: 'Trắng', size: '20cm', price: 390000, stock: 6, min_qty: 1, max_qty: 6 },
      { id: 'v12', sku: 'FIG-007-GLD', color: 'Vàng', size: '25cm', price: 480000, stock: 2, min_qty: 1, max_qty: 2 },
    ],
  },
  {
    id: 'p8',
    slug: 'mau-thu-tuong-mat-cat-3d',
    name: 'Mẫu Thư Tượng Mặt Cắt In 3D',
    category: 'custom',
    description: 'Mẫu tham khảo cho yêu cầu sản xuất riêng, có thể in theo file của bạn.',
    base_price: 150000,
    images: ['https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&q=80'],
    status: 'hidden',
    production_days: 3,
    featured: 0,
    variants: [
      { id: 'v13', sku: 'CUS-008-STD', color: 'Mặc định', size: '10cm', price: 150000, stock: 30, min_qty: 1, max_qty: 20 },
    ],
  },
]

export const seedCoupons = [
  { code: 'PHSHOP10', type: 'percent', value: 10, min_order: 200000, max_discount: 100000 },
  { code: 'FREESHIP', type: 'free_shipping', value: 0, min_order: 0, max_discount: 0 },
]
