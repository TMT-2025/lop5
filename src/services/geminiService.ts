import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({
  apiKey: API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

/**
 * Helper to call Gemini API with retry logic for rate limiting (429), spikes in demand (503),
 * status UNAVAILABLE, and dynamic model fallback.
 */
async function callAIWithRetry(prompt: string, modelName = "gemini-2.5-flash", maxRetries = 6) {
  let lastError: any;
  let currentModel = modelName;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const config: any = {};
      if (currentModel.startsWith("gemini-2.5") || currentModel.startsWith("gemini-3")) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }
      
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: prompt,
        config: config,
      });
      return response;
    } catch (error: any) {
      lastError = error;
      const errorMessage = String(error?.message || "").toLowerCase();
      const errorStatus = String(error?.status || "").toLowerCase();
      const errorCode = String(error?.code || "");
      
      const isRateLimit = errorMessage.includes("429") || 
                          errorMessage.includes("resource_exhausted") || 
                          errorMessage.includes("quota") || 
                          errorMessage.includes("limit") ||
                          errorStatus.includes("resource_exhausted");
                          
      const isUnavailable = errorMessage.includes("503") || 
                             errorMessage.includes("unavailable") || 
                             errorMessage.includes("demand") || 
                             errorMessage.includes("clogged") ||
                             errorMessage.includes("busy") ||
                             errorMessage.includes("overload") ||
                             errorMessage.includes("temporary") ||
                             errorMessage.includes("try again") ||
                             errorStatus.includes("unavailable") ||
                             errorCode === "503";

      const isRetryable = isRateLimit || isUnavailable;
      
      if (isRetryable) {
        if (i >= 2) {
          if (currentModel === "gemini-2.5-flash") {
            currentModel = "gemini-2.5-flash-lite";
          } else if (currentModel === "gemini-2.5-flash-lite") {
            currentModel = "gemini-2.0-flash";
          }
        }
        
        const waitTime = Math.pow(2, i) * 1500 + Math.random() * 1500;
        console.warn(`Gemini API retryable error. Retrying in ${Math.round(waitTime)}ms... (Attempt ${i + 1}/${maxRetries}, Model: ${currentModel})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

export const NLS_FRAMEWORK_PRIMARY = {
  domains: [
    { id: "1", name: "Khai thác dữ liệu và thông tin", sub: ["1.1. Duyệt, tìm kiếm và lọc dữ liệu", "1.2. Đánh giá dữ liệu, thông tin", "1.3. Quản lý dữ liệu, thông tin số"] },
    { id: "2", name: "Giao tiếp và hợp tác trong môi trường số", sub: ["2.1. Tương tác công nghệ số", "2.2. Chia sẻ thông tin số", "2.3. Trách nhiệm công dân số", "2.4. Hợp tác qua công cụ số", "2.5. Nghi thức số", "2.6. Danh tính số"] },
    { id: "3", name: "Sáng tạo nội dung số", sub: ["3.1. Phát triển nội dung số đơn giản", "3.2. Tích hợp và làm mới nội dung số", "3.3. Tôn trọng bản quyền học liệu", "3.4. Tư duy máy tính và lập trình trực quan"] },
    { id: "4", name: "An toàn số", sub: ["4.1. Bảo vệ thiết bị học tập", "4.2. Bảo vệ thông tin cá nhân", "4.3. Bảo vệ sức khỏe và mắt khi dùng máy tính", "4.4. Ý thức tiết kiệm điện và môi trường"] },
    { id: "5", name: "Giải quyết vấn đề", sub: ["5.1. Xử lý sự cố kỹ thuật đơn giản", "5.2. Chọn công cụ số phù hợp nhiệm vụ học tập", "5.3. Sáng tạo với phần mềm học tập", "5.4. Tự tin phát triển kỹ năng số"] },
    { id: "6", name: "Ứng dụng trí tuệ nhân tạo (AI)", sub: ["6.1. Nhận biết và hiểu về AI xung quanh em", "6.2. Sử dụng AI có đạo đức, trung thực trong học tập", "6.3. Đánh giá kết quả từ công cụ AI"] }
  ],
  levelCode: "CB1", // Cơ bản 1 cho cấp Tiểu học
  levelName: "Cơ bản 1 (Lớp 1 - 5)"
};

export async function integrateNLS(content: string, subject: string, grade = "Lớp 5") {
  if (!API_KEY) {
    throw new Error("API Key không tồn tại. Vui lòng kiểm tra cấu hình.");
  }

  const prompt = `
    Bạn là một Chuyên gia Giáo dục Tiểu học cấp cao tại Việt Nam, am hiểu sâu sắc:
    1. Công văn 2345/BGDĐT-GDTH về việc Hướng dẫn xây dựng kế hoạch giáo dục của nhà trường cấp tiểu học (trong đó Phụ lục 3 quy định khung Kế hoạch bài dạy cấp tiểu học).
    2. Thông tư 32/2018/TT-BGDĐT (Chương trình GDPT 2018) môn ${subject} cấp tiểu học (Lớp 5).
    3. Thông tư quy định Khung năng lực số cho người học (mức Cơ bản 1 - CB1 cho cấp Tiểu học).
    4. Quyết định số 2422/QĐ-BGDĐT ban hành Khung giáo dục Trí tuệ nhân tạo (AI) cho học sinh phổ thông (Cấp Tiểu học - Khối 5).
    5. Công văn số 5588/BGDĐT-GDPT hướng dẫn thực hiện giáo dục AI từ năm học 2026-2027.
    6. Thông tư số 27/2020/TT-BGDĐT quy định đánh giá học sinh tiểu học.

    Nhiệm vụ: Phân tích Kế hoạch bài dạy (KHBD) môn ${subject} Lớp 5 dưới đây và chuẩn hóa cấu trúc theo CÔNG VĂN 2345/BGDĐT-GDTH, đồng thời tích hợp Năng lực số (NLS) và Giáo dục Trí tuệ nhân tạo (AI) cho học sinh lớp 5 một cách tự nhiên, thực tế, hấp dẫn và khả thi.

    CÁC NGUYÊN TẮC QUAN TRỌNG ĐỐI VỚI HỌC SINH LỚP 5:
    - Phù hợp tâm sinh lý lứa tuổi học sinh tiểu học: Trực quan, sinh động, kích thích tò mò, học qua chơi (trò chơi học tập, đố vui, thử thách nhóm, tương tác bảng thông minh).
    - KHÔNG dạy lý thuyết máy học trừu tượng hay lập trình phức tạp. Tiếp cận AI qua trải nghiệm trực quan: Nhận diện giọng nói, nhận diện hình ảnh, chatbot hỏi đáp thông minh, trợ lý ảo hỗ trợ đọc bài hoặc gợi ý giải toán, tạo hình ảnh minh họa bằng AI (Canva AI, AutoDraw, Teachable Machine).
    - Giáo dục Đạo đức AI & An toàn số: Nhắc nhở học sinh trung thực trong học tập (không chép nguyên văn từ AI, xem AI như bạn cùng học hỗ trợ kiểm tra kết quả), bảo vệ dữ liệu cá nhân, giữ khoảng cách mắt khi dùng thiết bị số.
    - Không làm thay đổi mục tiêu cốt lõi của môn học ${subject} Lớp 5, không gây quá tải cho học sinh và giáo viên.

    CẤU TRÚC BẮT BUỘC THEO CÔNG VĂN 2345/BGDĐT-GDTH:

    # KẾ HOẠCH BÀI DẠY MÔN ${subject.toUpperCase()} LỚP 5
    ## BÀI HỌC: [Tên bài học]
    (Thời lượng: [Số tiết] tiết)

    ### I. YÊU CẦU CẦN ĐẠT
    1. Năng lực đặc thù:
       ${subject === 'Tiếng Việt' 
         ? `- Năng lực ngôn ngữ: Đọc đúng, diễn cảm bài đọc, hiểu nội dung và ý nghĩa; Nhận biết và sử dụng đúng kiến thức Luyện từ và câu; Rèn kỹ năng Viết (kể chuyện, miêu tả, viết báo cáo...); Rèn kỹ năng Nói và nghe tự tin, hợp tác.`
         : `- Năng lực toán học: Năng lực tư duy và lập luận toán học; Năng lực mô hình hoá toán học; Năng lực giải quyết vấn đề toán học; Năng lực giao tiếp toán học; Năng lực sử dụng công cụ, phương tiện học toán.`}
    2. Năng lực chung:
       - Năng lực tự chủ và tự học: Chủ động hoàn thành nhiệm vụ học tập, tự kiểm tra đánh giá kết quả.
       - Năng lực giao tiếp và hợp tác: Tự tin trao đổi với bạn, làm việc nhóm tích cực, biết lắng nghe và phản hồi.
       - Năng lực giải quyết vấn đề và sáng tạo: Biết vận dụng kiến thức bài học để giải quyết các tình huống thực tế.
    3. Năng lực số và Giáo dục Trí tuệ nhân tạo (AI):
       - Năng lực số (Khung NLS Tiểu học mức CB1): Ghi rõ các mã chỉ báo như 1.1.CB1a, 2.1.CB1a, 3.1.CB1a, 4.3.CB1a, 6.1.CB1a, 6.2.CB1a (viết bằng văn bản thường, KHÔNG dùng dấu nháy ngược).
       - Năng lực Giáo dục AI (QĐ 2422/QĐ-BGDĐT Khối 5): Ghi rõ mã chỉ báo lớp 5 (ví dụ: 5.A1.1, 5.A2.1, 5.B1.1, 5.B2.1, 5.C1.1, 5.C2.1, 5.D1.1...) bằng văn bản thường, kèm mô tả ngắn gọn biểu hiện cụ thể của học sinh.
    4. Phẩm chất:
       - Chăm chỉ: Tích cực suy nghĩ, thực hiện các hoạt động học tập.
       - Trung thực: Thật thà trong đánh giá, tự giác học tập, sử dụng công nghệ và AI trung thực.
       - Trách nhiệm: Giữ gìn đồ dùng học tập, có ý thức hoàn thành nhiệm vụ được giao trong nhóm.
       - Nhân ái, Yêu nước: Yêu thích tiếng Việt / vẻ đẹp toán học, gắn bó với quê hương, đất nước.

    ### II. ĐỒ DÙNG DẠY HỌC
    1. Giáo viên:
       - Thiết bị số: Ti vi thông minh / Bảng tương tác, máy tính, bài giảng điện tử tương tác (PowerPoint/Canva).
       - Ứng dụng số & AI hỗ trợ: Nêu rõ phần mềm cụ thể (Quizizz, Wordwall, GeoGebra Tiểu học, Canva AI, Trợ lý giọng nói AI...).
       - Đồ dùng học tập trực quan: Thẻ từ, bảng phụ, phiếu bài tập.
    2. Học sinh:
       - SGK ${subject} 5 (Kết nối tri thức), vở bài tập, đồ dùng học tập.
       - Thiết bị học tập số (máy tính bảng / phòng tin học nếu nhà trường có điều kiện).

    ### III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU
    LƯU Ý ĐẶC BIỆT CHO TIẾN TRÌNH:
    - Nếu bài dạy gồm nhiều tiết, ghi rõ phân chia từng tiết: **TIẾT 1: [TÊN PHẦN HỌC]**, **TIẾT 2: [TÊN PHẦN HỌC]**... Thiết kế chi tiết 100%, TUYỆT ĐỐI CẤM ghi chú tóm tắt kiểu "(Thiết kế tương tự...)".
    - Mỗi tiết học gồm 4 hoạt động chuẩn:
      1. Khởi động (Mở đầu / Kết nối)
      2. Khám phá (Hình thành kiến thức mới)
      3. Luyện tập, thực hành
      4. Vận dụng, trải nghiệm
    - TRONG MỖI HOẠT ĐỘNG:
      * a) Mục tiêu: Nêu rõ mục tiêu cần đạt.
      * b) Cách tiến hành: BẮT BUỘC THIẾT KẾ BẢNG 2 CỘT MARKDOWN:
        | Hoạt động của giáo viên | Hoạt động của học sinh |
        | :--- | :--- |
        Trong bảng, ghi chi tiết lời giảng, câu hỏi gợi mở của GV và hành động, câu trả lời đầy đủ của HS. Sau mỗi ý hành động lớn, chèn thẻ <br> để xuống hàng rõ ràng.
        Lồng ghép các nội dung NLS và Giáo dục AI vào thẻ: <nls>[Tích hợp NLS/AI - Mã ...]: Mô tả cụ thể hành động tương tác công nghệ</nls>.

    ### IV. ĐIỀU CHỈNH SAU BÀI DẠY (ĐÁNH GIÁ THEO THÔNG TƯ 27/2020/TT-BGDĐT)
    - Nhận xét mức độ tham gia, hứng thú và kết quả học tập của học sinh.
    - Đánh giá sự tiến bộ về năng lực số và ý thức sử dụng AI an toàn của học sinh.
    - Những điểm cần lưu ý hoặc điều chỉnh cho các tiết học sau.

    Nội dung kế hoạch bài dạy gốc cần xử lý:
    ${content}
  `;

  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error("Yêu cầu quá thời gian xử lý (120s). Vui lòng thử lại với tệp tin ngắn hơn hoặc kiểm tra kết nối mạng.")), 120000)
  );

  try {
    const result = await Promise.race([callAIWithRetry(prompt), timeoutPromise]);
    const responseText = result.text;
    
    if (!responseText || responseText.trim().length < 10) {
      throw new Error("AI không thể tạo nội dung tích hợp. Vui lòng kiểm tra lại nội dung tệp tin gốc.");
    }
    
    return responseText;
  } catch (error: any) {
    console.error("Gemini API Error (Integrate):", error);
    const msg = error.message || "";
    if (msg.includes("120s")) throw error;
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("Máy chủ AI đang quá tải (Hết lượt yêu cầu). Vui lòng chờ 30 giây rồi nhấn thử lại.");
    }
    throw new Error("Không thể kết nối với máy chủ AI hoặc nội dung bị từ chối. Vui lòng thử lại sau.");
  }
}

export async function generateLessonPlan(lessonName: string, periods: number, subject: string, grade = "Lớp 5") {
  if (!API_KEY) {
    throw new Error("API Key không tồn tại. Vui lòng kiểm tra cấu hình.");
  }

  const prompt = `
    Bạn là một Chuyên gia Giáo dục Tiểu học cấp cao tại Việt Nam, am hiểu sâu sắc:
    1. Công văn 2345/BGDĐT-GDTH về việc Hướng dẫn xây dựng kế hoạch giáo dục của nhà trường cấp tiểu học (Phụ lục 3: Kế hoạch bài dạy).
    2. Thông tư 32/2018/TT-BGDĐT (Chương trình GDPT 2018) môn ${subject} Lớp 5 (Bộ sách Kết nối tri thức với cuộc sống).
    3. Thông tư quy định Khung năng lực số cho người học (Mức Cơ bản 1 - CB1 cấp Tiểu học).
    4. Quyết định số 2422/QĐ-BGDĐT ban hành Khung giáo dục Trí tuệ nhân tạo (AI) cho học sinh phổ thông (Cấp Tiểu học - Khối 5).
    5. Công văn số 5588/BGDĐT-GDPT hướng dẫn thực hiện nhiệm vụ giáo dục Trí tuệ nhân tạo (AI) cho học sinh phổ thông từ năm học 2026-2027.
    6. Thông tư số 27/2020/TT-BGDĐT quy định đánh giá học sinh tiểu học.

    Nhiệm vụ: Tạo một Kế hoạch bài dạy (KHBD) hoàn chỉnh, mẫu mực, chi tiết cho giáo viên Lớp 5 theo đúng mẫu CÔNG VĂN 2345/BGDĐT-GDTH:
    - Tên bài: ${lessonName}
    - Môn học: ${subject}
    - Khối lớp: ${grade}
    - Thời lượng: ${periods} tiết (35 phút/tiết)
    - Bộ sách: Kết nối tri thức với cuộc sống

    CÁC NGUYÊN TẮC CỐT LÕI CHO TIỂU HỌC:
    1. Giáo dục Tiểu học mang tính trực quan, vui tươi, lôi cuốn: Áp dụng phương pháp dạy học tích cực (trò chơi học tập, đóng vai, chia sẻ nhóm đôi/nhóm bốn, kỹ thuật khăn trải bàn, mảnh ghép, bể cá, góc học tập). Tối ưu hóa tương tác với BẢNG TƯƠNG TÁC THÔNG MINH (chạm, kéo thả, ghép thẻ, vẽ hình trực tiếp).
    2. Tích hợp Năng lực số (NLS) mức CB1: Rèn luyện cho học sinh lớp 5 kỹ năng tìm kiếm thông tin an toàn, sử dụng phần mềm học tập (Wordwall, Quizizz, Blooket, GeoGebra Tiểu học), chia sẻ bài làm trên màn hình, giữ tư thế ngồi và bảo vệ thị lực (4.3.CB1a).
    3. Tích hợp Giáo dục AI theo QĐ 2422/QĐ-BGDĐT khối 5:
       - Không dạy lập trình hay thuật toán AI phức tạp.
       - Trải nghiệm AI trực quan: Nhận diện giọng nói tiếng Việt, phân loại hình ảnh (Teachable Machine / AutoDraw), chatbot đố vui kiến thức, trợ lý AI đọc mẫu thơ/văn hoặc hỗ trợ kiểm tra đáp án tính toán.
       - Rèn luyện đạo đức AI: Nhấn mạnh tính trung thực, không ỷ lại công nghệ, hiểu rằng AI là trợ lý học tập do con người tạo ra, học sinh luôn phải suy nghĩ độc lập.
       - BẮT BUỘC MÃ HÓA NĂNG LỰC AI KHỐI 5 bằng văn bản thường hoàn toàn (ví dụ: 5.A1.1, 5.A2.1, 5.B1.1, 5.B2.1, 5.C1.1, 5.C2.1, 5.D1.1...), KHÔNG dùng dấu nháy ngược.
    4. PHÂN BỔ ĐỦ ${periods} TIẾT VÀ KHÔNG BỎ TIẾT:
       - Toàn bộ nội dung phải được thiết kế chi tiết 100% từ Tiết 1 đến Tiết ${periods}.
       - Chia tiêu đề từng tiết rõ ràng: **TIẾT 1: [TÊN NỘI DUNG TIẾT 1]**, **TIẾT 2: [TÊN NỘI DUNG TIẾT 2]**...
       - Mỗi tiết học phải có đầy đủ các hoạt động học: Khởi động, Khám phá, Luyện tập, Vận dụng.
    5. CẤU TRÚC BẢNG 2 CỘT MARKDOWN:
       - Ở bước "Cách tiến hành" của mỗi hoạt động, bắt buộc dùng bảng 2 cột:
         | Hoạt động của giáo viên | Hoạt động của học sinh |
         | :--- | :--- |
       - Cung cấp lời thoại chi tiết của GV, câu hỏi dẫn dắt, phiếu học tập, đáp án cụ thể và câu trả lời mẫu đầy đủ của HS. Sau mỗi ý lớn, chèn thẻ <br> để xuống dòng rõ ràng.
       - Mọi điểm nhấn NLS và AI được bao bọc trong thẻ <nls>[Tích hợp NLS/AI - Mã ...]: Mô tả cụ thể hoạt động</nls>.

    CẤU TRÚC KẾ HOẠCH BÀI DẠY:

    # KẾ HOẠCH BÀI DẠY MÔN ${subject.toUpperCase()} LỚP 5
    ## BÀI: ${lessonName.toUpperCase()}
    (Thời lượng: ${periods} tiết)

    ### I. YÊU CẦU CẦN ĐẠT
    1. Năng lực đặc thù:
       ${subject === 'Tiếng Việt'
         ? `- Năng lực ngôn ngữ: 
            + Đọc: Đọc đúng từ ngữ, câu văn, đoạn văn; đọc diễn cảm bài văn/bài thơ; hiểu ý nghĩa nội dung bài học.
            + Luyện từ và câu: Hiểu và vận dụng đúng các đơn vị từ ngữ, ngữ pháp trọng tâm của bài.
            + Viết: Viết câu, đoạn văn hoặc bài văn hoàn chỉnh, giàu hình ảnh, cảm xúc.
            + Nói và nghe: Tự tin chia sẻ ý kiến trước lớp, biết lắng nghe và tương tác lịch sự.`
         : `- Năng lực toán học:
            + Năng lực tư duy và lập luận toán học: Nhận biết quy tắc, so sánh, phân tích các dữ liệu toán học trong bài.
            + Năng lực mô hình hoá toán học: Chuyển đổi tình huống thực tế thành phép tính hoặc sơ đồ toán học.
            + Năng lực giải quyết vấn đề toán học: Thực hiện giải toán chính xác qua các bước logic.
            + Năng lực giao tiếp toán học: Diễn đạt rõ ràng cách tính, lập luận bằng ngôn ngữ toán học.
            + Năng lực sử dụng công cụ, phương tiện học toán: Sử dụng thành thạo thước đo, compa, bảng tính, ứng dụng học toán trực quan.`}
    2. Năng lực chung:
       - Năng lực tự chủ và tự học: Tự giác hoàn thành nhiệm vụ cá nhân, chuẩn bị bài chu đáo.
       - Năng lực giao tiếp và hợp tác: Tích cực thảo luận nhóm, biết phân công và hỗ trợ bạn cùng tiến bộ.
       - Năng lực giải quyết vấn đề và sáng tạo: Chủ động tìm tòi nhiều cách giải quyết sáng tạo cho nhiệm vụ học tập.
    3. Năng lực số và Giáo dục Trí tuệ nhân tạo (AI):
       - Năng lực số (Mức CB1): Các mã chỉ báo 1.1.CB1a, 2.1.CB1a, 3.1.CB1a, 4.3.CB1a, 6.1.CB1a, 6.2.CB1a (viết chữ thường bình thường).
       - Giáo dục AI (QĐ 2422 Khối 5): Các mã chỉ báo 5.A1.1, 5.A2.1, 5.B1.1, 5.B2.1, 5.C1.1, 5.C2.1... kèm mô tả hành động cụ thể của học sinh.
    4. Phẩm chất:
       - Chăm chỉ: Tích cực suy nghĩ, chăm chú nghe giảng và hoàn thành bài tập.
       - Trung thực: Thật thà, khách quan trong học tập; sử dụng công cụ số và AI trung thực.
       - Trách nhiệm: Giữ gìn trật tự lớp, bảo quản thiết bị học tập chung, có trách nhiệm với sản phẩm của nhóm.
       - Nhân ái / Yêu nước: Yêu quý bạn bè, trân trọng nét đẹp văn hóa, ngôn ngữ và đất nước Việt Nam.

    ### II. ĐỒ DÙNG DẠY HỌC
    1. Giáo viên:
       - Bảng tương tác thông minh / Ti vi thông minh kết nối máy tính.
       - Kế hoạch bài dạy, bài giảng điện tử tương tác sinh động (Canva / PowerPoint).
       - Các phần mềm và công cụ số: Trò chơi trực tuyến (Quizizz/Wordwall), công cụ số trực quan (GeoGebra Tiểu học), học liệu AI hỗ trợ (Canva AI tạo hình ảnh minh họa, Trợ lý AI đọc diễn cảm tiếng Việt).
       - Phiếu học tập, bộ đồ dùng học tập trực quan môn học.
    2. Học sinh:
       - SGK ${subject} 5 (Bộ sách Kết nối tri thức với cuộc sống), vở ghi, vở bài tập.
       - Bộ đồ dùng học tập cá nhân (bút, thước, compa, bảng con, bút lông...).
       - Thiết bị số học tập (máy tính bảng / phòng máy nếu có).

    ### III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU
    (Thiết kế chi tiết lần lượt từ Tiết 1 đến Tiết ${periods}, mỗi tiết có đầy đủ 4 hoạt động với bảng 2 cột):

    **TIẾT 1: ...**
    #### 1. Hoạt động Khởi động (Mở đầu / Kết nối)
    a) Mục tiêu: ...
    b) Cách tiến hành:
    | Hoạt động của giáo viên | Hoạt động của học sinh |
    | :--- | :--- |
    | [Mô tả chi tiết lời nói, trình chiếu, giao việc của GV] <br> | [Mô tả chi tiết hành động, câu trả lời đầy đủ của HS] <br> |

    #### 2. Hoạt động Khám phá (Hình thành kiến thức mới)
    a) Mục tiêu: ...
    b) Cách tiến hành:
    | Hoạt động của giáo viên | Hoạt động của học sinh |
    | :--- | :--- |
    | [Mô tả chi tiết các bước hướng dẫn, gợi mở của GV] <br> | [Mô tả chi tiết hành động thảo luận, tương tác bảng thông minh của HS] <br> |

    #### 3. Hoạt động Luyện tập, thực hành
    a) Mục tiêu: ...
    b) Cách tiến hành:
    | Hoạt động của giáo viên | Hoạt động của học sinh |
    | :--- | :--- |
    | [Nêu đề bài, nhiệm vụ, trò chơi củng cố của GV] <br> | [Lời giải chi tiết, kết quả thực hành của HS] <br> |

    #### 4. Hoạt động Vận dụng, trải nghiệm
    a) Mục tiêu: ...
    b) Cách tiến hành:
    | Hoạt động của giáo viên | Hoạt động của học sinh |
    | :--- | :--- |
    | [GV định hướng tình huống thực tế, nhiệm vụ sáng tạo] <br> | [HS liên hệ thực tế, trình bày giải pháp hoặc sản phẩm] <br> |

    (Tiếp tục thiết kế tương tự cho các tiết tiếp theo cho đến hết ${periods} tiết)

    ### IV. ĐIỀU CHỈNH SAU BÀI DẠY (ĐÁNH GIÁ THEO THÔNG TƯ 27/2020/TT-BGDĐT)
    - Đánh giá thường xuyên mức độ hoàn thành nhiệm vụ học tập của học sinh.
    - Ghi nhận sự tiến bộ về năng lực số và thói quen sử dụng thiết bị số an toàn, lành mạnh.
    - Những điều chỉnh cần thiết cho các tiết học tiếp theo.

    Hãy viết bằng tiếng Việt chuẩn mực sư phạm tiểu học, chi tiết, phong phú, thực tế và dùng ngay được!
  `;

  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error("Yêu cầu quá thời gian xử lý (120s). Vui lòng thử lại hoặc kiểm tra kết nối mạng.")), 120000)
  );

  try {
    const result = await Promise.race([callAIWithRetry(prompt), timeoutPromise]);
    const responseText = result.text;
    
    if (!responseText || responseText.trim().length < 10) {
      throw new Error("AI không thể tạo KHBD. Vui lòng kiểm tra lại yêu cầu.");
    }
    
    return responseText;
  } catch (error: any) {
    console.error("Gemini API Error (Generate):", error);
    const msg = error.message || "";
    if (msg.includes("120s")) throw error;
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("Máy chủ AI đang quá tải (Hết lượt yêu cầu). Vui lòng chờ 30 giây rồi nhấn thử lại.");
    }
    throw new Error("Không thể kết nối với máy chủ AI hoặc nội dung bị từ chối. Vui lòng thử lại sau.");
  }
}
