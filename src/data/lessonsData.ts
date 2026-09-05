export interface LessonItem {
  id: number;
  name: string;
  periods: number;
  term: string;
  topic: string;
  subject: string;
}

export const GRADE_5_SUBJECTS = ['Tiếng Việt', 'Toán học'] as const;
export type Grade5Subject = typeof GRADE_5_SUBJECTS[number];

export const MATH_5_LESSONS: LessonItem[] = [
  {
    "id": 1,
    "name": "Bài 1. Ôn tập số tự nhiên.",
    "periods": 2,
    "term": "Học kì I",
    "topic": "Ôn tập và bổ sung (19 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 2,
    "name": "Bài 2. Ôn tập các phép tính với số tự nhiên",
    "periods": 2,
    "term": "Học kì I",
    "topic": "Ôn tập và bổ sung (19 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 3,
    "name": "Bài 3. Ôn tập phân số",
    "periods": 2,
    "term": "Học kì I",
    "topic": "Ôn tập và bổ sung (19 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 4,
    "name": "Bài 4. Phân số thập phân",
    "periods": 1,
    "term": "Học kì I",
    "topic": "Ôn tập và bổ sung (19 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 5,
    "name": "Bài 5. Ôn tập các phép tính với phân số",
    "periods": 3,
    "term": "Học kì I",
    "topic": "Ôn tập và bổ sung (19 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 6,
    "name": "Bài 6. Cộng, trừ hai phân số khác mẫu số",
    "periods": 2,
    "term": "Học kì I",
    "topic": "Ôn tập và bổ sung (19 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 7,
    "name": "Bài 7. Hỗn số",
    "periods": 2,
    "term": "Học kì I",
    "topic": "Ôn tập và bổ sung (19 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 8,
    "name": "Bài 8. Ôn tập hình học và đo lường",
    "periods": 2,
    "term": "Học kì I",
    "topic": "Ôn tập và bổ sung (19 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 9,
    "name": "Bài 9. Luyện tập chung",
    "periods": 3,
    "term": "Học kì I",
    "topic": "Ôn tập và bổ sung (19 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 10,
    "name": "Bài 10. Khái niệm số thập phân",
    "periods": 3,
    "term": "Học kì I",
    "topic": "(12 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 11,
    "name": "Bài 11. So sánh các số thập phân",
    "periods": 2,
    "term": "Học kì I",
    "topic": "(12 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 12,
    "name": "Bài 12. Viết số đo đại lượng dưới dạng số thập phân",
    "periods": 3,
    "term": "Học kì I",
    "topic": "(12 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 13,
    "name": "Bài 13. Làm tròn số thập phân",
    "periods": 2,
    "term": "Học kì I",
    "topic": "(12 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 14,
    "name": "Bài 14. Luyện tập chung",
    "periods": 2,
    "term": "Học kì I",
    "topic": "(12 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 15,
    "name": "Bài 15. Ki-lô-mét vuông. Héc-ta",
    "periods": 2,
    "term": "Học kì I",
    "topic": "Một số đơn vị đo diện tích (8 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 16,
    "name": "Bài 16. Các đơn vị đo diện tích",
    "periods": 2,
    "term": "Học kì I",
    "topic": "Một số đơn vị đo diện tích (8 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 17,
    "name": "Bài 17. Thực hành và trải nghiệm với một số đơn vị đo đại lượng",
    "periods": 2,
    "term": "Học kì I",
    "topic": "Một số đơn vị đo diện tích (8 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 18,
    "name": "Bài 18. Luyện tập chung",
    "periods": 2,
    "term": "Học kì I",
    "topic": "Một số đơn vị đo diện tích (8 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 19,
    "name": "Bài 19. Phép cộng số thập phân",
    "periods": 2,
    "term": "Học kì I",
    "topic": "(16 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 20,
    "name": "Bài 20. Phép trừ số thập phân",
    "periods": 2,
    "term": "Học kì I",
    "topic": "(16 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 21,
    "name": "Bài 21. Phép nhân số thập phân",
    "periods": 3,
    "term": "Học kì I",
    "topic": "(16 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 22,
    "name": "Bài 22. Phép chia số thập phân",
    "periods": 4,
    "term": "Học kì I",
    "topic": "(16 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 23,
    "name": "Bài 23. Nhân, chia số thập phân với 10; 100; 1000;… hoặc với 0,1; 0,01; 0,001;…",
    "periods": 2,
    "term": "Học kì I",
    "topic": "(16 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 24,
    "name": "Bài 24. Luyện tập chung",
    "periods": 3,
    "term": "Học kì I",
    "topic": "(16 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 25,
    "name": "Bài 25. Hình tam giác. Diện tích hình tam giác",
    "periods": 4,
    "term": "Học kì I",
    "topic": "(18 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 26,
    "name": "Bài 26. Hình thang. Diện tích hình thang",
    "periods": 4,
    "term": "Học kì I",
    "topic": "(18 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 27,
    "name": "Bài 27. Đường tròn. Chu vi và diện tích hình tròn",
    "periods": 5,
    "term": "Học kì I",
    "topic": "(18 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 28,
    "name": "Bài 28. Thực hành và trải nghiệm đo, vẽ, lắp ghép, tạo hình",
    "periods": 2,
    "term": "Học kì I",
    "topic": "(18 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 29,
    "name": "Bài 29. Luyện tập chung",
    "periods": 3,
    "term": "Học kì I",
    "topic": "(18 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 30,
    "name": "Bài 30. Ôn tập số thập phân",
    "periods": 3,
    "term": "Học kì I",
    "topic": "(17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 31,
    "name": "Bài 31. Ôn tập các phép tính với số thập phân",
    "periods": 4,
    "term": "Học kì I",
    "topic": "(17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 32,
    "name": "Bài 32. Ôn tập một số hinh phẳng",
    "periods": 2,
    "term": "Học kì I",
    "topic": "(17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 33,
    "name": "Bài 33. Ôn tập diện tích, chu vi một số hình phẳng",
    "periods": 3,
    "term": "Học kì I",
    "topic": "(17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 34,
    "name": "Bài 34. Ôn tập đo lường",
    "periods": 2,
    "term": "Học kì I",
    "topic": "(17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 35,
    "name": "Bài 35. Ôn tập chung",
    "periods": 3,
    "term": "Học kì I",
    "topic": "(17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 36,
    "name": "Bài 36. Tỉ số. Tỉ số phần trăm",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Tỉ số và các bài toán liên quan (17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 37,
    "name": "Bài 37. Tỉ lệ bản đồ và ứng dụng",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Tỉ số và các bài toán liên quan (17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 38,
    "name": "Bài 38. Tìm hai số khi biết tổng và tỉ số của hai số đó",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Tỉ số và các bài toán liên quan (17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 39,
    "name": "Bài 39. Tìm hai số khi biết hiệu và tỉ số của hai số đó",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Tỉ số và các bài toán liên quan (17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 40,
    "name": "Bài 40. Tìm tỉ số phần trăm của hai số",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Tỉ số và các bài toán liên quan (17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 41,
    "name": "Bài 41. Tìm giá trị phần trăm của một số",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Tỉ số và các bài toán liên quan (17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 42,
    "name": "Bài 42. Máy tính cầm tay",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Tỉ số và các bài toán liên quan (17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 43,
    "name": "Bài 43. Thực hành và trải nghiệm sử dụng máy tính cầm tay",
    "periods": 1,
    "term": "Học kì II",
    "topic": "Tỉ số và các bài toán liên quan (17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 44,
    "name": "Bài 44. Luyện tập chung",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Tỉ số và các bài toán liên quan (17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 45,
    "name": "Bài 45. Thể tích của một hình",
    "periods": 1,
    "term": "Học kì II",
    "topic": "Tỉ số và các bài toán liên quan (17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 46,
    "name": "Bài 46. Xăng-ti-mét khối. Đề-xi-mét khối",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Tỉ số và các bài toán liên quan (17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 47,
    "name": "Bài 47. Mét khối",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Tỉ số và các bài toán liên quan (17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 48,
    "name": "Bài 48. Luyện tập chung",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Tỉ số và các bài toán liên quan (17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 49,
    "name": "Bài 49. Hình khai triển của hình lập phương, hình hộp chữ nhật và hình trụ",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Tỉ số và các bài toán liên quan (17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 50,
    "name": "Bài 50. Diện tích xung quanh và diện tích toàn phần của hình hộp chữ nhật",
    "periods": 3,
    "term": "Học kì II",
    "topic": "Tỉ số và các bài toán liên quan (17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 51,
    "name": "Bài 51. Diện tích xung quanh và diện tích toàn phần của hình lập phương",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Tỉ số và các bài toán liên quan (17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 52,
    "name": "Bài 52. Thể tích của hình hộp chữ nhật",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Tỉ số và các bài toán liên quan (17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 53,
    "name": "Bài 53. Thể tích của hình lập phương",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Tỉ số và các bài toán liên quan (17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 54,
    "name": "Bài 54. Thực hành tính toán và ước lượng thể tích một số hình khối",
    "periods": 1,
    "term": "Học kì II",
    "topic": "Tỉ số và các bài toán liên quan (17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 55,
    "name": "Bài 55. Luyện tập chung",
    "periods": 3,
    "term": "Học kì II",
    "topic": "Tỉ số và các bài toán liên quan (17 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 56,
    "name": "Bài 56. Các đơn vị đo thời gian",
    "periods": 1,
    "term": "Học kì II",
    "topic": "Số đo thời gian. Vận tốc. Các bài toán liên quan đến chuyển động đều (16 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 57,
    "name": "Bài 57. Cộng, trừ số đo thời gian",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Số đo thời gian. Vận tốc. Các bài toán liên quan đến chuyển động đều (16 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 58,
    "name": "Bài 58. Nhân, chia số đo thời gian với một số",
    "periods": 3,
    "term": "Học kì II",
    "topic": "Số đo thời gian. Vận tốc. Các bài toán liên quan đến chuyển động đều (16 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 59,
    "name": "Bài 59. Vận tốc của một chuyển động đều",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Số đo thời gian. Vận tốc. Các bài toán liên quan đến chuyển động đều (16 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 60,
    "name": "Bài 60. Quãng đường, thời gian của một chuyển động đều",
    "periods": 3,
    "term": "Học kì II",
    "topic": "Số đo thời gian. Vận tốc. Các bài toán liên quan đến chuyển động đều (16 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 61,
    "name": "Bài 61. Thực hành tính toán và ước lượng về vận tốc, quãng đường, thời gian trong chuyển động đều",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Số đo thời gian. Vận tốc. Các bài toán liên quan đến chuyển động đều (16 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 62,
    "name": "Bài 62. Luyện tập chung",
    "periods": 3,
    "term": "Học kì II",
    "topic": "Số đo thời gian. Vận tốc. Các bài toán liên quan đến chuyển động đều (16 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 63,
    "name": "Bài 63. Thu thập, phân loại, sắp xếp các số liệu",
    "periods": 1,
    "term": "Học kì II",
    "topic": "Số đo thời gian. Vận tốc. Các bài toán liên quan đến chuyển động đều (16 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 64,
    "name": "Bài 64. Biểu đồ hình quạt tròn",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Số đo thời gian. Vận tốc. Các bài toán liên quan đến chuyển động đều (16 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 65,
    "name": "Bài 65. Tỉ số của số lần lặp lại một sự kiện so với tổng số lần thực hiện",
    "periods": 1,
    "term": "Học kì II",
    "topic": "Số đo thời gian. Vận tốc. Các bài toán liên quan đến chuyển động đều (16 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 66,
    "name": "Bài 66. Thực hành và trải nghiệm thu thập, phân tích, biểu diễn các số liệu thống kê",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Số đo thời gian. Vận tốc. Các bài toán liên quan đến chuyển động đều (16 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 67,
    "name": "Bài 67. Luyện tập chung",
    "periods": 1,
    "term": "Học kì II",
    "topic": "Số đo thời gian. Vận tốc. Các bài toán liên quan đến chuyển động đều (16 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 68,
    "name": "Bài 68. Ôn tập số tự nhiên, phân số, số thập phân",
    "periods": 3,
    "term": "Học kì II",
    "topic": "Ôn tập cuối năm (23 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 69,
    "name": "Bài 69. Ôn tập các phép tính với số tự nhiên, phân số, số thập phân",
    "periods": 4,
    "term": "Học kì II",
    "topic": "Ôn tập cuối năm (23 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 70,
    "name": "Bài 70. Ôn tập tỉ số, tỉ số phần trăm",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Ôn tập cuối năm (23 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 71,
    "name": "Bài 71. Ôn tập hình học",
    "periods": 4,
    "term": "Học kì II",
    "topic": "Ôn tập cuối năm (23 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 72,
    "name": "Bài 72. Ôn tập đo lường",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Ôn tập cuối năm (23 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 73,
    "name": "Bài 73. Ôn tập toán chuyển đồng đèu",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Ôn tập cuối năm (23 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 74,
    "name": "Bài 74. Ôn tập một số yếu tố thống kê và xác suất",
    "periods": 2,
    "term": "Học kì II",
    "topic": "Ôn tập cuối năm (23 tiết)",
    "subject": "Toán học"
  },
  {
    "id": 75,
    "name": "Bài 75. Ôn tập chung",
    "periods": 4,
    "term": "Học kì II",
    "topic": "Ôn tập cuối năm (23 tiết)",
    "subject": "Toán học"
  }
];

export const VIETNAMESE_5_LESSONS: LessonItem[] = [
  {
    "id": 101,
    "name": "Bài 1: Thanh âm của gió",
    "periods": 3,
    "term": "Học kì I",
    "topic": "Thế giới tuổi thơ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 102,
    "name": "Bài 2: Cánh đồng hoa",
    "periods": 4,
    "term": "Học kì I",
    "topic": "Thế giới tuổi thơ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 103,
    "name": "Bài 3: Tuổi ngựa",
    "periods": 3,
    "term": "Học kì I",
    "topic": "Thế giới tuổi thơ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 104,
    "name": "Bài 4: Bến sông tuổi thơ",
    "periods": 4,
    "term": "Học kì I",
    "topic": "Thế giới tuổi thơ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 105,
    "name": "Bài 5: Tiếng hát nảy mầm",
    "periods": 3,
    "term": "Học kì I",
    "topic": "Thế giới tuổi thơ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 106,
    "name": "Bài 6: Ngôi sao sân cỏ",
    "periods": 4,
    "term": "Học kì I",
    "topic": "Thế giới tuổi thơ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 107,
    "name": "Bài 7: Bộ sưu tập độc đáo",
    "periods": 3,
    "term": "Học kì I",
    "topic": "Thế giới tuổi thơ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 108,
    "name": "Bài 8: Hành tinh kì lạ",
    "periods": 4,
    "term": "Học kì I",
    "topic": "Thế giới tuổi thơ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 109,
    "name": "Bài 9: Đọc trước cổng trời",
    "periods": 3,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 110,
    "name": "Bài 10: Kì diệu rừng xanh",
    "periods": 4,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 111,
    "name": "Bài 11: Hang Sơn Đoòng – những điều kì thú",
    "periods": 3,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 112,
    "name": "Bài 12: Những hòn đảo trên Vịnh Hạ Long",
    "periods": 4,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 113,
    "name": "Bài 13: Mầm non",
    "periods": 3,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 114,
    "name": "Bài 14: Những ngọn núi nóng rẫy",
    "periods": 4,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 115,
    "name": "Bài 15: Bài ca về mặt trời",
    "periods": 3,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 116,
    "name": "Bài 16: Xin chào, Xa-ha-ra",
    "periods": 4,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 117,
    "name": "Bài 17: Thư gửi các học sinh",
    "periods": 3,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 118,
    "name": "Bài 18: Tấm gương tự học",
    "periods": 4,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 119,
    "name": "Bài 19: Trải nghiệm để sáng tạo",
    "periods": 3,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 120,
    "name": "Bài 20: Khổ luyện thành tài",
    "periods": 4,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 121,
    "name": "Bài 21: Thế giới trong trang sách",
    "periods": 3,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 122,
    "name": "Bài 22: Từ những câu chuyện ấy thơ",
    "periods": 4,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 123,
    "name": "Bài 23: Giới thiệu sách Dế Mèn phiêu lưu kí",
    "periods": 3,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 124,
    "name": "Bài 24: Tinh thần học tập của nhà Phi-lít",
    "periods": 4,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 125,
    "name": "Bài 25: Tiếng đàn ba-la-lai-ca trên sông Đà",
    "periods": 3,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 126,
    "name": "Bài 26: Trí tưởng tượng phong phú",
    "periods": 4,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 127,
    "name": "Bài 27: Tranh làng Hồ",
    "periods": 3,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 128,
    "name": "Bài 28: Tập hát quan họ",
    "periods": 4,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 129,
    "name": "Bài 29: Phim hoạt hình Chú ốc sên bay",
    "periods": 3,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 130,
    "name": "Bài 30: Nghệ thuật múa ba lê",
    "periods": 4,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 131,
    "name": "Bài 31: Một ngôi chùa độc đáo",
    "periods": 3,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 132,
    "name": "Bài 32: Sự tích chú Tễu",
    "periods": 4,
    "term": "Học kì I",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 133,
    "name": "Bài 1: Tiếng hát của người đá",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 134,
    "name": "Bài 2: Khúc hát ru những em bé lớn trên lưng mẹ",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 135,
    "name": "Bài 3: Hạt gạo làng ta",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 136,
    "name": "Bài 4: Hộp quà màu thiên thanh",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 137,
    "name": "Bài 5: Giỏ hoa tháng Năm",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 138,
    "name": "Bài 6: Thư của bố",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 139,
    "name": "Bài 7: Đoàn thuyền đánh cá",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 140,
    "name": "Bài 8: Khu rừng của Mát",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 141,
    "name": "Bài 9: Hội thổi cơm thi ở Đồng Vân",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 142,
    "name": "Bài 10: Những búp chè trên cây cổ thụ",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 143,
    "name": "Bài 11: Hương cốm mùa thu",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 144,
    "name": "Bài 12: Vũ điệu trên nền thổ cẩm",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 145,
    "name": "Bài 13: Đàn t’rưng – tiếng ca đại ngàn",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 146,
    "name": "Bài 14: Đường quê Đồng Tháp Mười",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 147,
    "name": "Bài 15: Xuồng ba lá quê tôi",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 148,
    "name": "Bài 16: Về thăm Đất Mũi",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 149,
    "name": "Bài 17: Nghìn năm văn hiến",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 150,
    "name": "Bài 18: Người thầy của muôn đời",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 151,
    "name": "Bài 19: Danh y Tuệ Tĩnh",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 152,
    "name": "Bài 20: Cụ Đồ Chiểu",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 153,
    "name": "Bài 21: Anh hùng Lao động Trần Đại Nghĩa",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 154,
    "name": "Bài 22: Bộ đội về làng",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 155,
    "name": "Bài 23: Về ngôi nhà đang xây",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 156,
    "name": "Bài 24: Việt Nam quê hương ta",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 157,
    "name": "Bài 25: Bài ca Trái Đất",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 158,
    "name": "Bài 26: Những con hạc giấy",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 159,
    "name": "Bài 27: Một người hùng thầm lặng",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 160,
    "name": "Bài 28: Giờ Trái Đất",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 161,
    "name": "Bài 29: Điện thoại di động",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  },
  {
    "id": 162,
    "name": "Bài 30: Thành phố thông minh Mát-xđa",
    "periods": 4,
    "term": "Học kì II",
    "topic": "THIÊN NHIÊN KÌ THÚ",
    "subject": "Tiếng Việt"
  }
];

export function getGrade5Lessons(subject: string): LessonItem[] {
  if (subject === 'Toán học') return MATH_5_LESSONS;
  if (subject === 'Tiếng Việt') return VIETNAMESE_5_LESSONS;
  return [];
}
