# ỨNG DỤNG TẠO KẾ HOẠCH BÀI DẠY LỚP 5
## TÍCH HỢP NĂNG LỰC SỐ VÀ GIÁO DỤC TRÍ TUỆ NHÂN TẠO (AI)

Ứng dụng web chuyên nghiệp hỗ trợ giáo viên Tiểu học thiết kế Kế hoạch bài dạy (giáo án) môn **Tiếng Việt Lớp 5** và **Toán Lớp 5** (Bộ sách Kết nối tri thức với cuộc sống), bám sát các văn bản quy phạm và hướng dẫn chuyên môn của Bộ Giáo dục và Đào tạo.

---

### 🏛️ CĂN CỨ VĂN BẢN QUY ĐỊNH
1. **Khung và cấu trúc KHBD**: Chuẩn **Công văn số 2345/BGDĐT-GDTH** của Bộ GD&ĐT dành riêng cho cấp Tiểu học (Phụ lục 3: Kế hoạch bài dạy).
2. **Chương trình và Yêu cầu cần đạt**: Bám sát **Thông tư số 32/2018/TT-BGDĐT** (Chương trình GDPT 2018) cho môn Tiếng Việt và Toán lớp 5.
3. **Khung Năng lực số (NLS)**: Chuẩn mức **Cơ bản 1 (CB1)** với 6 miền năng lực theo Thông tư quy định Khung năng lực số người học và **Công văn số 3456/BGDĐT-GDPT**.
4. **Giáo dục Trí tuệ nhân tạo (AI)**: Bám sát **Quyết định số 2422/QĐ-BGDĐT** (Khung nội dung giáo dục AI cấp Tiểu học - Khối 5: các mạch 5.A1, 5.A2, 5.B1, 5.B2, 5.C1, 5.C2, 5.D1...) và **Công văn số 5588/BGDĐT-GDPT** (triển khai từ năm học 2026-2027).
5. **Đánh giá học sinh**: Tích hợp quy định đánh giá thường xuyên theo **Thông tư số 27/2020/TT-BGDĐT** (Quy định đánh giá học sinh tiểu học).

---

### 🌟 TÍNH NĂNG NỔI BẬT
- **Đầy đủ 100% chương trình cả năm**:
  - **Môn Tiếng Việt Lớp 5**: 62 bài học đầy đủ cả Tập 1 và Tập 2 (Đọc, Luyện từ và câu, Viết bài văn, Nói và nghe, Đọc mở rộng).
  - **Môn Toán Lớp 5**: 75 bài học đầy đủ cả Tập 1 và Tập 2 (Số tự nhiên, Phân số, Số thập phân, Hình tam giác/thang/tròn, Tỉ số %, Thể tích hình hộp chữ nhật/lập phương, Chuyển động đều, Xác suất thống kê, Ôn tập cuối năm).
- **2 Chế độ linh hoạt**:
  - *Chế độ 1: Tạo KHBD mới từ Danh mục SGK*: Chọn bài $\rightarrow$ Chọn số tiết $\rightarrow$ Tạo KHBD chi tiết 100% không tóm tắt hay bỏ tiết.
  - *Chế độ 2: Tích hợp NLS vào tệp có sẵn*: Kéo thả tệp Word (.docx) hoặc PDF giáo án cũ để tự động phân tích, bổ sung mục tiêu NLS mức CB1, mã hóa AI QĐ 2422 và bảng tiến trình 2 cột.
- **Tiến trình dạy học trực quan chuẩn CV 2345**:
  - Bảng 2 cột: `Hoạt động của giáo viên` và `Hoạt động của học sinh` (tỉ lệ 50/50 chuẩn sư phạm tiểu học).
  - Đa dạng hóa các hình thức mở đầu vui tươi, trò chơi khởi động, tương tác bảng thông minh (bảng tương tác), thẻ học tập, không kiểm tra bài cũ máy móc.
- **Trình xem trước & Xuất file Word (.docx) chất lượng cao**:
  - Hỗ trợ công thức toán học phân số, hỗn số, số thập phân, hình học sắc nét.
  - Thể thức văn bản chuẩn Times New Roman cỡ chữ 13-14, căn lề và bảng biểu chuyên nghiệp.
- **Hệ thống thanh toán & Quản lý VIP**:
  - Chuyển khoản QR MB Bank tự động.
  - Mã kích hoạt thiết bị (Device ID Keygen) an toàn, phân quyền.

---

### 🚀 CÀI ĐẶT & CHẠY DỰ ÁN

#### 1. Yêu cầu môi trường
- Node.js version 18 trở lên.
- Trình quản lý gói `npm` hoặc `pnpm`.

#### 2. Cài đặt thư viện
```bash
npm install
```

#### 3. Chạy ở môi trường phát triển (Dev)
```bash
npm run dev
```
Mở trình duyệt truy cập: `http://localhost:3000`

#### 4. Build sản phẩm (Production)
```bash
npm run build
```

---

### ☁️ TRIỂN KHAI LÊN VERCEL
1. Kết nối kho mã nguồn GitHub: `https://github.com/TMT-2025/lop5`
2. Tạo Project mới trên [Vercel](https://vercel.com):
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./`
   - **Build Command**: `vite build`
   - **Output Directory**: `dist`
3. Cấu hình biến môi trường (Environment Variables) trên Vercel:
   - `GEMINI_API_KEY`: Khóa API của Google Gemini.
   - `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` (nếu sử dụng thanh toán tự động qua payOS).
