// Danh mục gói cước — ĐÂY LÀ NGUỒN SỰ THẬT DUY NHẤT về giá và số credit của từng gói.
// Server luôn tra giá từ đây, KHÔNG BAO GIỜ tin số tiền do client gửi lên,
// để tránh trường hợp client (hoặc ai đó can thiệp request) tự sửa amount.
//
// Nếu đổi giá/gói, chỉ cần sửa ở file này — cả create-payment và webhook đều dùng chung.

export const PACKAGES = {
  goi1: { id: 'goi1', name: 'Gói 1 (Trải nghiệm)', price: 25000, credits: 5 },
  goi2: { id: 'goi2', name: 'Gói 2 (Tiết kiệm)', price: 60000, credits: 15 },
  goi3: { id: 'goi3', name: 'Gói 3 (Pro)', price: 140000, credits: 40 },
};
