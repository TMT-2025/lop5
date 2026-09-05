import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, Download, Loader2, ChevronRight, BookOpen, GraduationCap, X, Sparkles, Lock, CreditCard, ShieldCheck, Copy, Check, QrCode, Key, Eye, EyeOff } from 'lucide-react';
import mammoth from 'mammoth';
import { integrateNLS, generateLessonPlan, SUPPORTED_MODELS, getStoredModel, setStoredModel, testGeminiApiKey } from './services/geminiService';
import { generateDocx } from './services/docxService';
import LessonPlanPreviewer from './components/LessonPlanPreviewer';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// Payment configuration for MB Bank
const PAYMENT_CONFIG = {
  bankId: 'MB',
  accountNo: '0989618939', // Số tài khoản MB Bank mới
  accountName: 'TRAN MINH THANH', // Tên chủ tài khoản mới
  branch: 'Ngân hàng Quân Đội (MB Bank)',
  supportZalo: '0989618939', // Số điện thoại hỗ trợ Zalo
  adminBypassKey: 'TMT_KEYGEN_2026', // Khóa mở cổng Admin Keygen ẩn mới để tránh lộ cổng admin khi cấp key vĩnh viễn cho người dùng
  salt: 'TMT_2026_KHBD_SALT', // Muối băm mã kích hoạt bảo mật
  cassoApiKey: ''
};

const PAYMENT_PACKAGES = [
  { id: 'goi1', name: 'Gói 1 (Trải nghiệm)', price: 25000, credits: 5, label: '5 lượt tải - 5.000đ/lượt (Gemini 3.5 Flash Lite)', prefix: 'VIP5' },
  { id: 'goi2', name: 'Gói 2 (Tiết kiệm)', price: 60000, credits: 15, label: '15 lượt tải - 4.000đ/lượt (Gemini 3.5 Flash Lite)', prefix: 'VIP15' },
  { id: 'goi3', name: 'Gói 3 (Pro)', price: 140000, credits: 40, label: '40 lượt tải - 3.500đ/lượt (Gemini 3.5 Flash Lite)', prefix: 'VIP40' }
];

import { GRADE_5_SUBJECTS, getGrade5Lessons, LessonItem } from './data/lessonsData';

const SUBJECTS = GRADE_5_SUBJECTS;
const GRADES = ['Lớp 5'];

function getLessonsList(subject: string, _grade = 'Lớp 5'): LessonItem[] {
  return getGrade5Lessons(subject);
}

export default function App() {
  const [mode, setMode] = useState<'integrate' | 'generate'>('generate');
  const [subject, setSubject] = useState<string>('Tiếng Việt');
  const [grade, setGrade] = useState('Lớp 5');
  const initialLessons = getGrade5Lessons('Tiếng Việt');
  const [selectedLesson, setSelectedLesson] = useState<LessonItem>(initialLessons[0]);
  const [periods, setPeriods] = useState<number>(initialLessons[0]?.periods || 3);
  const [customPeriods, setCustomPeriods] = useState<number | null>(null);

  // Gemini API Key & Model State
  const [apiKey, setApiKey] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('khbd_gemini_api_key')) || process.env.GEMINI_API_KEY || '';
  });
  const [selectedModel, setSelectedModel] = useState<string>(() => getStoredModel());
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showKeyText, setShowKeyText] = useState<boolean>(false);
  const [apiKeySavedSuccess, setApiKeySavedSuccess] = useState<boolean>(false);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [testKeyResult, setTestKeyResult] = useState<{ ok: boolean; message: string } | null>(null);

  const effectivePeriods = customPeriods !== null ? customPeriods : periods;

  // Paywall & Premium State
  const [deviceId, setDeviceId] = useState<string>('');
  const [credits, setCredits] = useState<number>(2);
  const [tier, setTier] = useState<'free' | 'vip' | 'pro'>('free');
  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  const [paywallTab, setPaywallTab] = useState<'pay' | 'activate'>('pay');
  const [activationKeyInput, setActivationKeyInput] = useState<string>('');
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState<boolean>(false);

  // Selected package for payment QR code
  const [selectedPackage, setSelectedPackage] = useState(PAYMENT_PACKAGES[1]); // Default to Goi 2 (Tiết kiệm)

  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);
  const [versionClicks, setVersionClicks] = useState<number>(0);
  const [adminTargetDevice, setAdminTargetDevice] = useState<string>('');
  const [adminSelectedPrefix, setAdminSelectedPrefix] = useState<string>('VIP15'); // Default prefix for 15 credits (changed from VIP5)
  const [adminGeneratedKey, setAdminGeneratedKey] = useState<string>('');
  const [adminPayosClientIdInput, setAdminPayosClientIdInput] = useState<string>(() => localStorage.getItem('khbd_payos_client_id') || '');
  const [adminPayosApiKeyInput, setAdminPayosApiKeyInput] = useState<string>(() => localStorage.getItem('khbd_payos_api_key') || '');
  const [adminPayosChecksumKeyInput, setAdminPayosChecksumKeyInput] = useState<string>(() => localStorage.getItem('khbd_payos_checksum_key') || '');

  // payOS real-time transaction detection states
  const [payosClientId] = useState<string>('server-configured');
  const [isCheckingPayment, setIsCheckingPayment] = useState<boolean>(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);

  // payOS order and checkout states
  const [currentOrderCode, setCurrentOrderCode] = useState<number | null>(null);
  const [currentCheckoutUrl, setCurrentCheckoutUrl] = useState<string | null>(null);
  const [currentQrCode, setCurrentQrCode] = useState<string | null>(null);
  const [isCreatingPaymentLink, setIsCreatingPaymentLink] = useState<boolean>(false);
  const [shouldGenerateQR, setShouldGenerateQR] = useState<boolean>(false);

  // Reset QR generation state when paywall closed
  React.useEffect(() => {
    if (!showPaywall) {
      setShouldGenerateQR(false);
    }
  }, [showPaywall]);

  React.useEffect(() => {
    // Sync default API key from environment if not yet set in localStorage
    const defaultEnvKey = process.env.GEMINI_API_KEY || '';
    const storedKey = localStorage.getItem('khbd_gemini_api_key') || '';
    if (defaultEnvKey && (!storedKey || !storedKey.trim())) {
      localStorage.setItem('khbd_gemini_api_key', defaultEnvKey);
      setApiKey(defaultEnvKey);
    }

    // Ensure default model is Gemini 3.5 Flash Lite
    const storedModel = localStorage.getItem('khbd_gemini_model');
    if (!storedModel || storedModel === 'gemini-2.5-flash' || storedModel === 'gemini-2.0-flash') {
      localStorage.setItem('khbd_gemini_model', 'gemini-3.5-flash-lite');
      setSelectedModel('gemini-3.5-flash-lite');
    } else {
      setSelectedModel(storedModel);
    }

    // Generate or load Device ID
    let storedDeviceId = localStorage.getItem('khbd_device_id');
    if (!storedDeviceId) {
      const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
      storedDeviceId = `KHBD-L5-${rand}`;
      localStorage.setItem('khbd_device_id', storedDeviceId);
    }
    setDeviceId(storedDeviceId);

    // Load Credits & Tier
    const storedCredits = localStorage.getItem('khbd_credits');
    const storedTier = localStorage.getItem('khbd_tier') as 'free' | 'vip' | 'pro' | null;

    if (storedCredits !== null && storedTier !== null) {
      setCredits(parseInt(storedCredits, 10));
      setTier(storedTier);
    } else {
      // Default to Pro mode with 9999 credits
      setCredits(9999);
      setTier('pro');
      localStorage.setItem('khbd_credits', '9999');
      localStorage.setItem('khbd_tier', 'pro');
    }
  }, []);

  // Create payOS payment link when paywall opens or package changes (with debounce)
  React.useEffect(() => {
    if (!showPaywall || !selectedPackage || !payosClientId || !shouldGenerateQR) return;

    let isMounted = true;
    const timerId = setTimeout(async () => {
      setIsCreatingPaymentLink(true);
      setCurrentOrderCode(null);
      setCurrentCheckoutUrl(null);
      setCurrentQrCode(null);
      try {
        const response = await fetch('/api/create-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            deviceId,
            packageId: selectedPackage.id,
            cancelUrl: window.location.href,
            returnUrl: window.location.href
          })
        });

        if (!response.ok) {
          throw new Error('Không thể tạo link thanh toán payOS');
        }

        const resData = await response.json();
        if (resData.code === '00' && isMounted) {
          setCurrentOrderCode(resData.data.orderCode);
          setCurrentCheckoutUrl(resData.data.checkoutUrl);
          setCurrentQrCode(resData.data.qrCode);
        } else {
          console.error('payOS Error:', resData.desc);
        }
      } catch (err) {
        console.error('Generate payment link error:', err);
      } finally {
        if (isMounted) {
          setIsCreatingPaymentLink(false);
        }
      }
    }, 450);

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [showPaywall, selectedPackage, deviceId, payosClientId, shouldGenerateQR]);

  // payOS Polling for Automatic Activation
  React.useEffect(() => {
    if (!showPaywall || !currentOrderCode || !payosClientId) return;

    let intervalId: any;
    let isPolling = false;

    const checkPaymentStatus = async () => {
      if (isPolling) return;
      isPolling = true;
      setIsCheckingPayment(true);
      try {
        const response = await fetch(`/api/check-order-status?orderCode=${currentOrderCode}&deviceId=${deviceId}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`order check error: ${response.status}`);
        }

        const result = await response.json();
        if (result.status === 'paid' && !result.already_claimed && result.credits > 0) {
          const addedCredits = result.credits;
          let newTier: 'vip' | 'pro' = 'vip';
          let packageName = '';

          if (result.packageId === 'goi3') {
            newTier = 'pro';
            packageName = 'Gói 3 (Pro) - 40 lượt';
          } else if (result.packageId === 'goi2') {
            newTier = 'vip';
            packageName = 'Gói 2 (Tiết kiệm) - 15 lượt';
          } else if (result.packageId === 'goi1') {
            newTier = 'vip';
            packageName = 'Gói 1 (Trải nghiệm) - 5 lượt';
          }

          const oldCredits = tier === 'free' ? 0 : credits;
          const nextCredits = oldCredits + addedCredits;
          setCredits(nextCredits);
          setTier(newTier);
          localStorage.setItem('khbd_credits', nextCredits.toString());
          localStorage.setItem('khbd_tier', newTier);

          setPaymentSuccessMessage(
            `Giao dịch thành công! Đã thanh toán ${packageName}.\n` +
            `• Được cộng thêm: +${addedCredits} lượt tải\n` +
            `• Số dư cũ: ${oldCredits} lượt\n` +
            `• Tổng số dư mới: ${nextCredits} lượt`
          );
          
          setTimeout(() => {
            setShowPaywall(false);
            setPaymentSuccessMessage(null);
            setCurrentOrderCode(null);
          }, 4000);
        }
      } catch (err) {
        console.error("order check error:", err);
      } finally {
        isPolling = false;
        setIsCheckingPayment(false);
      }
    };

    checkPaymentStatus();
    intervalId = setInterval(checkPaymentStatus, 4000);

    return () => {
      clearInterval(intervalId);
    };
  }, [showPaywall, currentOrderCode, payosClientId, credits, tier, selectedPackage, deviceId]);

  // Helper to generate key for a specific Device ID
  const getActivationCode = (devId: string): string => {
    const salt = PAYMENT_CONFIG.salt;
    let hash = 0;
    const combined = devId.trim() + salt;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const absHash = Math.abs(hash).toString(36).toUpperCase();
    return `${absHash.substring(0, 4)}-${absHash.substring(4, 8)}-${absHash.substring(8, 12) || 'KHBD'}`;
  };

  const handleActivate = () => {
    setActivationError(null);
    const key = activationKeyInput.trim().toUpperCase();
    if (!key) {
      setActivationError('Vui lòng nhập mã kích hoạt.');
      return;
    }

    // Nhập mã ADMIN_1, ADMIN_2, ADMIN_3 để kích hoạt nhanh các gói
    if (key === 'ADMIN_1') {
      const oldCredits = tier === 'free' ? 0 : credits;
      const nextCredits = oldCredits + 5;
      setCredits(nextCredits);
      setTier('vip');
      localStorage.setItem('khbd_credits', nextCredits.toString());
      localStorage.setItem('khbd_tier', 'vip');
      setActivationSuccess(true);
      setActivationKeyInput('');
      setActivationError(null);
      setTimeout(() => {
        setShowPaywall(false);
        setActivationSuccess(false);
      }, 2500);
      return;
    }

    if (key === 'ADMIN_2') {
      const oldCredits = tier === 'free' ? 0 : credits;
      const nextCredits = oldCredits + 15;
      setCredits(nextCredits);
      setTier('vip');
      localStorage.setItem('khbd_credits', nextCredits.toString());
      localStorage.setItem('khbd_tier', 'vip');
      setActivationSuccess(true);
      setActivationKeyInput('');
      setActivationError(null);
      setTimeout(() => {
        setShowPaywall(false);
        setActivationSuccess(false);
      }, 2500);
      return;
    }

    if (key === 'ADMIN_3') {
      const oldCredits = tier === 'free' ? 0 : credits;
      const nextCredits = oldCredits + 40;
      setCredits(nextCredits);
      setTier('pro');
      localStorage.setItem('khbd_credits', nextCredits.toString());
      localStorage.setItem('khbd_tier', 'pro');
      setActivationSuccess(true);
      setActivationKeyInput('');
      setActivationError(null);
      setTimeout(() => {
        setShowPaywall(false);
        setActivationSuccess(false);
      }, 2500);
      return;
    }

    if (key === PAYMENT_CONFIG.adminBypassKey) {
      setShowAdminPanel(true);
      setActivationKeyInput('');
      setActivationError(null);
      return;
    }

    let cleanKey = '';
    let addedCredits = 0;
    let newTier: 'free' | 'vip' | 'pro' = 'vip';
    let packageName = '';

    if (key.startsWith('VIP5-')) {
      cleanKey = key.substring(5);
      addedCredits = 5;
      newTier = 'vip';
      packageName = 'Gói 1 (Trải nghiệm) - 5 lượt';
    } else if (key.startsWith('VIP15-')) {
      cleanKey = key.substring(6);
      addedCredits = 15;
      newTier = 'vip';
      packageName = 'Gói 2 (Tiết kiệm) - 15 lượt';
    } else if (key.startsWith('VIP40-')) {
      cleanKey = key.substring(6);
      addedCredits = 40;
      newTier = 'pro';
      packageName = 'Gói 3 (Pro) - 40 lượt';
    } else {
      setActivationError('Mã kích hoạt không đúng hoặc không hợp lệ.');
      return;
    }

    const expectedHash = getActivationCode(deviceId);
    if (cleanKey === expectedHash) {
      const nextCredits = (tier === 'free' ? 0 : credits) + addedCredits;
      setCredits(nextCredits);
      setTier(newTier);
      localStorage.setItem('khbd_credits', nextCredits.toString());
      localStorage.setItem('khbd_tier', newTier);
      setActivationSuccess(true);
      setActivationKeyInput('');
      setTimeout(() => {
        setShowPaywall(false);
        setActivationSuccess(false);
      }, 2500);
    } else {
      setActivationError('Mã kích hoạt không đúng cho thiết bị này. Vui lòng kiểm tra lại.');
    }
  };

  const handleAdminGenerateKey = () => {
    if (!adminTargetDevice.trim()) {
      return;
    }
    const hash = getActivationCode(adminTargetDevice.trim());
    setAdminGeneratedKey(`${adminSelectedPrefix}-${hash}`);
  };

  // Update selected lesson when grade or subject changes
  React.useEffect(() => {
    const lessons = getLessonsList(subject, grade);
    
    if (lessons.length > 0) {
      setSelectedLesson(lessons[0]);
      setPeriods(lessons[0].periods);
      setCustomPeriods(null);
      setTimeout(() => {
        generateButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [grade, subject]);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const generateButtonRef = useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (result || error) {
      mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [result, error]);

  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File input changed", e.target.files);
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.docx') || selectedFile.name.endsWith('.pdf')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Chỉ hỗ trợ tệp .docx hoặc .pdf');
      }
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    console.log("File dropped", e.dataTransfer.files);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.docx') || droppedFile.name.endsWith('.pdf')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Chỉ hỗ trợ tệp .docx hoặc .pdf');
      }
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFile = async () => {
    const activeKey = (typeof window !== 'undefined' && localStorage.getItem('khbd_gemini_api_key')) || process.env.GEMINI_API_KEY || '';
    if (!activeKey || !activeKey.trim()) {
      setApiKeyInput('');
      setShowApiKeyModal(true);
      setError('Vui lòng cấu hình Gemini API Key để bắt đầu tạo Kế hoạch bài dạy.');
      return;
    }
    if (credits <= 0) {
      setShowPaywall(true);
      return;
    }

    if (mode === 'integrate' && !file) {
      setError('Vui lòng tải lên tệp tin.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let integratedContent = '';

      if (mode === 'integrate' && file) {
        let text = '';
        if (file.name.endsWith('.docx')) {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          text = result.value;
          
          if (!text || text.trim().length < 10) {
            throw new Error("Tệp tin không có nội dung văn bản hoặc quá ngắn để xử lý.");
          }
        } else if (file.name.endsWith('.pdf')) {
          setError('Hiện tại hệ thống ưu tiên xử lý tệp .docx để đảm bảo định dạng.');
          setIsProcessing(false);
          return;
        }

        console.log("Starting file integration...");
        integratedContent = await integrateNLS(text, subject, grade);
      } else {
        console.log("Starting lesson generation...");
        integratedContent = await generateLessonPlan(selectedLesson.name, effectivePeriods, subject, grade);
      }
      
      if (!integratedContent || integratedContent.trim().length === 0) {
        throw new Error("Không nhận được nội dung phản hồi từ AI. Vui lòng thử lại.");
      }

      console.log("Processing complete, updating UI.");
      setResult(integratedContent);
    } catch (err) {
      console.error("Processing error:", err);
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra trong quá trình xử lý. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = async () => {
    if (result) {
      if (credits <= 0) {
        setShowPaywall(true);
        return;
      }
      try {
        const fileName = mode === 'integrate' && file ? file.name.split('.')[0] : selectedLesson.name;
        await generateDocx(result, fileName, effectivePeriods);
        
        // Deduct 1 credit if not unlimited
        if (credits < 9000) {
          const nextCredits = Math.max(0, credits - 1);
          setCredits(nextCredits);
          localStorage.setItem('khbd_credits', nextCredits.toString());
          
          if (nextCredits === 0) {
            setTier('free');
            localStorage.setItem('khbd_tier', 'free');
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải file DOCX:", err);
        setError(err instanceof Error ? `Lỗi tải file Word: ${err.message}` : "Không thể tạo file Word. Vui lòng kiểm tra lại nội dung.");
      }
    }
  };

  const exportDesignSpecs = async () => {
    const specsContent = `
# I. QUY CHUẨN CẤU TRÚC KẾ HOẠCH BÀI DẠY (KHBD)
1. Cấu trúc tổng thể: Tuân thủ nghiêm ngặt Công văn 2345/BGDĐT-GDTH với 4 mục chính:
- I. MỤC TIÊU (Kiến thức, Năng lực chung, Năng lực đặc thù, Năng lực số, Phẩm chất).
- II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU (Bao gồm học liệu số).
- III. TIẾN TRÌNH DẠY HỌC (Chi tiết các hoạt động).
- IV. CÁC PHIẾU HỌC TẬP (Nằm ở cuối tài liệu).

2. Cấu trúc mỗi hoạt động: Gồm 4 bước chuẩn:
- a) Mục tiêu: Xác định rõ kết quả học sinh cần đạt.
- b) Nội dung: Mô tả nhiệm vụ, dẫn chiếu đến Phiếu học tập.
- c) Sản phẩm: Trình bày chi tiết đáp án, công thức, kết quả dự kiến.
- d) Tổ chức thực hiện: Mô tả chi tiết cách thức giáo viên dẫn dắt và học sinh tương tác.

# II. ĐỊNH DẠNG VĂN BẢN VÀ MÀU SẮC (DOCX)
1. Quy tắc màu sắc và In đậm:
- Tiêu đề mục lớn (I, II, III, IV...): In đậm, màu Đỏ (Red).
- Hoạt động dạy học: Định dạng "1) Hoạt động 1", in đậm, màu Xanh dương (Blue).
- Các mục con (1., 2...): In đậm, màu Xanh dương (Blue).
- Tiêu đề Phiếu học tập: "PHIẾU HỌC TẬP SỐ X", in đậm, màu Xanh dương, nằm trên dòng riêng.
- Nhãn hoạt động 4 bước: "a) Mục tiêu:", "b) Nội dung:", "c) Sản phẩm:", "d) Tổ chức thực hiện:" được in đậm.
- Nội dung bên trong Phiếu học tập: Chữ thường, màu Đen.

2. Xử lý ký tự và kỹ thuật:
- Loại bỏ tất cả dấu sao (*) dư thừa từ quá trình tạo nội dung.
- Tự động định dạng chỉ số dưới cho các công thức hóa học (ví dụ: H2O -> H₂O).
- Font chữ: Times New Roman, cỡ 13pt.
- Căn lề: Trái 3cm, còn lại 2cm.

# III. CHIẾN LƯỢC SƯ PHẠM VÀ CÔNG NGHỆ SỐ
1. Kỹ thuật dạy học tích cực:
- Áp dụng linh hoạt: KWL, Brainstorming, Think-Pair-Share, Khăn trải bàn, Mảnh ghép, Trạm xoay, PBL (Học theo vấn đề), Tranh luận, Bể cá.
- Thí nghiệm: Thí nghiệm khám phá, mô hình hóa phân tử, thí nghiệm ảo PhET.

2. Tích hợp Năng lực số (NLS) và Giáo dục AI:
- Mã chỉ báo chuẩn NC1 theo Thông tư 02/2025/TT-BGDĐT, Quyết định 2422/QĐ-BGDĐT và Công văn 5588/BGDĐT-GDPT.
- Đa dạng hóa 40 hình thức tổ chức mở đầu: Tình huống thực tiễn, vật thật/sản phẩm đời sống, thí nghiệm mở đầu, video tình huống, mâu thuẫn nhận thức, câu chuyện khoa học, ô chữ/mảnh ghép, mô phỏng 3D PhET... Tuyệt đối không lặp lại rập khuôn Mentimeter.
- Sử dụng công cụ trực tuyến linh hoạt: Quizizz, Wordwall, ClassPoint, Blooket, Kahoot!, Padlet, Canva khai thác tối đa bảng tương tác.
- Hoạt động 1: Luôn là hoạt động khởi động vui tươi, kích thích tư duy, không kiểm tra bài cũ.

3. Phiếu học tập: Tích hợp đầy đủ câu hỏi trắc nghiệm, đúng/sai, bảng thảo luận cuối bài để giáo viên nạp liệu nhanh vào các nền tảng dạy học.
    `;
    await generateDocx(specsContent, "Dac_ta_Thiet_ke_KHBD_Digital");
  };

  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed) {
      localStorage.setItem('khbd_gemini_api_key', trimmed);
      setApiKey(trimmed);
    } else {
      localStorage.removeItem('khbd_gemini_api_key');
      setApiKey(process.env.GEMINI_API_KEY || '');
    }
    setStoredModel(selectedModel);
    setApiKeySavedSuccess(true);
    setTimeout(() => {
      setApiKeySavedSuccess(false);
      setShowApiKeyModal(false);
      setTestKeyResult(null);
    }, 1000);
  };

  const handleTestApiKey = async () => {
    const keyToTest = apiKeyInput.trim() || apiKey || process.env.GEMINI_API_KEY || '';
    if (!keyToTest) {
      setTestKeyResult({ ok: false, message: 'Vui lòng nhập API Key trước khi kiểm tra.' });
      return;
    }
    setIsTestingKey(true);
    setTestKeyResult(null);
    try {
      const res = await testGeminiApiKey(keyToTest, selectedModel);
      setTestKeyResult(res);
    } catch (err: any) {
      setTestKeyResult({ ok: false, message: err?.message || 'Không thể kết nối với máy chủ AI.' });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleRestoreDefaultKey = () => {
    const defaultKey = process.env.GEMINI_API_KEY || '';
    if (defaultKey) {
      setApiKeyInput(defaultKey);
      localStorage.setItem('khbd_gemini_api_key', defaultKey);
      setApiKey(defaultKey);
      setSelectedModel('gemini-3.5-flash-lite');
      setStoredModel('gemini-3.5-flash-lite');
      setTestKeyResult({ ok: true, message: 'Đã khôi phục khóa API hệ thống mặc định và mô hình Gemini 3.5 Flash Lite.' });
    } else {
      setTestKeyResult({ ok: false, message: 'Chưa có khóa mặc định trong biến môi trường. Vui lòng dán khóa API của bạn vào ô trên.' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-prof-slate-bg">
      {/* Header */}
      <header className="bg-prof-blue-dark text-white px-10 py-5 shadow-md flex-shrink-0 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Biên soạn Kế hoạch Bài dạy (KHBD) Tích hợp NLS & Giáo dục AI</h1>
          <p className="text-[11px] opacity-80 uppercase tracking-widest mt-1 font-medium">
            Hệ thống tích hợp Năng lực số & Giáo dục AI — Theo TT 02/2025/TT-BGDĐT, CV 2345, Quyết định 2422/QĐ-BGDĐT & Công văn 5588/BGDĐT-GDPT
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setApiKeyInput((typeof window !== 'undefined' && localStorage.getItem('khbd_gemini_api_key')) || apiKey || '');
              setSelectedModel(getStoredModel());
              setTestKeyResult(null);
              setShowApiKeyModal(true);
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer shadow-xs",
              apiKey 
                ? "bg-emerald-600/90 hover:bg-emerald-600 text-white border-emerald-400" 
                : "bg-amber-500 hover:bg-amber-600 text-slate-900 border-amber-300 animate-pulse"
            )}
            title="Cấu hình Gemini API Key & Mô hình AI"
          >
            <Key className="w-3.5 h-3.5" />
            {apiKey ? `Gemini: ${selectedModel.includes('3.5') ? '3.5 Flash Lite' : selectedModel.includes('3.6') ? '3.6 Flash' : '2.5 Flash'}` : "Cài đặt API Key"}
          </button>
          {tier === 'pro' ? (
            <button
              onClick={() => { setPaywallTab('pay'); setShowPaywall(true); }}
              className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 px-4 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 border border-amber-300 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 fill-slate-900 animate-pulse" />
              PRO: {credits >= 9000 ? 'Vô hạn' : `${credits} lượt tải`}
            </button>
          ) : tier === 'vip' ? (
            <button
              onClick={() => { setPaywallTab('pay'); setShowPaywall(true); }}
              className="bg-gradient-to-r from-prof-blue-primary to-cyan-500 text-white px-4 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-prof-blue-primary/20 border border-prof-blue-light transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 fill-white animate-pulse" />
              VIP: {credits} lượt tải
            </button>
          ) : (
            <button 
              onClick={() => { setPaywallTab('pay'); setShowPaywall(true); }}
              className="bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white px-4 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
            >
              <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
              Dùng thử: {credits} lượt tải
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main ref={mainRef} className="flex-grow p-6 md:p-10 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 overflow-y-auto relative">
        {isProcessing && (
          <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-2xl border border-prof-slate-border flex flex-col items-center gap-6 max-w-sm text-center animate-in fade-in zoom-in duration-300">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-prof-blue-light/20 border-t-prof-blue-primary rounded-full animate-spin" />
                <Loader2 className="w-6 h-6 text-prof-blue-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-prof-slate-text mb-2">
                  {mode === 'integrate' ? 'Đang tích hợp Năng lực số...' : 'Đang tạo KHBD mới...'}
                </h3>
                <p className="text-sm text-prof-slate-muted">Quá trình này có thể mất 30-60 giây tùy thuộc vào độ dài nội dung.</p>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-prof-blue-primary h-full animate-progress" style={{ width: '60%' }} />
              </div>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <aside className="h-fit lg:sticky lg:top-10">
          <div className="card p-8">
            <div className="section-title text-base mb-6">Cấu hình hệ thống</div>
            
            <div className="space-y-6">

              <div className="form-group">
                <label className="block text-[13px] font-bold text-prof-slate-label mb-2 uppercase tracking-wider">Môn học</label>
                <select 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium focus:border-prof-blue-primary outline-none transition-all cursor-pointer appearance-none"
                >
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="block text-[13px] font-bold text-prof-slate-label mb-2 uppercase tracking-wider">Khối lớp</label>
                <select 
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium focus:border-prof-blue-primary outline-none transition-all cursor-pointer appearance-none"
                >
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              {mode === 'generate' && (
                <div className="form-group animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-[13px] font-bold text-prof-slate-label mb-2 uppercase tracking-wider">Chọn bài dạy</label>
                  <select 
                    value={selectedLesson.id}
                    onChange={(e) => {
                      const lessons = getLessonsList(subject, grade);
                      const lesson = lessons.find(l => l.id === parseInt(e.target.value));
                      if (lesson) {
                        setSelectedLesson(lesson);
                        setPeriods(lesson.periods);
                        setCustomPeriods(null);
                        setTimeout(() => {
                          generateButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }, 100);
                      }
                    }}
                    className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium focus:border-prof-blue-primary outline-none transition-all cursor-pointer appearance-none"
                  >
                    {getLessonsList(subject, grade).map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                  
                  <div className="mt-4">
                    <label className="block text-[11px] font-bold text-prof-slate-label mb-2 uppercase tracking-wider">Số tiết thực hiện</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                        <div
                          key={p}
                          className={cn(
                            "flex-1 py-2 rounded-lg border-2 font-bold text-sm text-center select-none",
                            periods === p 
                              ? "border-prof-blue-primary bg-prof-blue-primary text-white shadow-md" 
                              : "border-slate-200 bg-white text-slate-400 opacity-60"
                          )}
                        >
                          {p}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-[11px] font-bold text-prof-slate-label mb-2 uppercase tracking-wider">Chọn lại số tiết</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCustomPeriods(customPeriods === p ? null : p)}
                          className={cn(
                            "flex-1 py-2 rounded-lg border-2 transition-all font-bold text-sm cursor-pointer",
                            customPeriods === p 
                              ? "border-prof-blue-primary bg-prof-blue-primary text-white shadow-md" 
                              : "border-slate-200 bg-white text-slate-500 hover:border-prof-blue-light"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nút tạo KHBD trực tiếp ngay dưới phần cấu hình bài dạy */}
                  <div className="mt-5 pt-3 border-t border-slate-100">
                    <button
                      ref={generateButtonRef}
                      type="button"
                      onClick={processFile}
                      disabled={isProcessing}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-prof-blue-primary hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm md:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Đang khởi tạo KHBD...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                          <span>Bắt đầu tạo KHBD mới</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-center text-slate-500 mt-2 font-medium">
                      Đang chọn: <span className="font-bold text-prof-blue-dark">{selectedLesson.name}</span> ({effectivePeriods} tiết)
                    </p>
                  </div>
                </div>
              )}

              <div className="form-group font-sans">
                <label className="block text-[13px] font-bold text-prof-slate-label mb-2 uppercase tracking-wider">Tiêu chuẩn tích hợp</label>
                <div className="flex flex-wrap gap-1">
                  <span className="ref-badge px-3 py-1.5 text-[10px]">CV 2345</span>
                  <span className="ref-badge px-3 py-1.5 text-[10px]">TT 02/2025</span>
                  <span className="ref-badge px-3 py-1.5 text-[10px]">QĐ 2422/QĐ-BGDĐT</span>
                  <span className="ref-badge px-3 py-1.5 text-[10px]">CV 5588/BGDĐT-GDPT</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="stat-box p-5">
                  <div className="text-[11px] text-prof-slate-muted uppercase font-bold tracking-widest mb-1">Mức độ</div>
                  <div className="text-2xl font-bold text-prof-blue-dark">Cơ bản 1 (CB1)</div>
                </div>
                <div className="stat-box p-5">
                  <div className="text-[11px] text-prof-slate-muted uppercase font-bold tracking-widest mb-1">Công cụ</div>
                  <div className="text-2xl font-bold text-prof-blue-dark">AI-05 (Tiểu học)</div>
                </div>
              </div>


            </div>
          </div>
        </aside>

        {/* Center Panel */}
        <section className="flex flex-col">
          <div className="card h-fit flex flex-col p-8 mb-10">
            <div className="section-title text-base mb-6 flex items-center gap-2">
              {mode === 'integrate' ? <Upload className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
              {mode === 'integrate' ? 'Tải lên tài liệu gốc' : 'Gợi ý nội dung bài dạy'}
            </div>
            <p className="text-sm text-prof-slate-muted -mt-3 mb-8 leading-relaxed">
              {mode === 'integrate' 
                ? 'Hệ thống sẽ tự động quét nội dung, giữ nguyên định dạng, công thức hóa học và hình ảnh để bổ sung các mục Năng lực số tương ứng.'
                : `Dựa trên gợi ý tổ chức hoạt động dạy học từ SGK ${subject} Lớp 5 Bộ sách Kết nối tri thức, hệ thống sẽ tạo KHBD mới hoàn chỉnh tích hợp Năng lực số.`}
            </p>

            {result === null ? (
              <div className="flex flex-col">
                {mode === 'integrate' ? (
                  <div 
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={cn(
                      "upload-zone py-12 md:py-20 flex flex-col items-center justify-center gap-6 border-3 transition-all duration-200 relative",
                      file ? "bg-blue-50/50 border-prof-blue-light" : "border-slate-200",
                      isDragging ? "border-prof-blue-primary bg-blue-50 scale-[0.99] shadow-inner" : ""
                    )}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      accept=".docx,.pdf"
                    />
                    <div className={cn(
                      "w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-sm transition-all duration-300",
                      file ? "bg-prof-blue-primary text-white" : "bg-slate-100 text-slate-400",
                      isDragging ? "scale-110 rotate-3 bg-prof-blue-light text-white" : ""
                    )}>
                      {file ? <FileText className="w-8 h-8 md:w-10 md:h-10" /> : <Upload className="w-8 h-8 md:w-10 md:h-10" />}
                    </div>
                    <div className="text-center space-y-2 px-4">
                      <p className="text-base md:text-lg font-bold text-slate-800 break-all">
                        {file ? file.name : (isDragging ? "Thả tệp vào đây" : "Kéo thả file .docx hoặc .pdf vào đây")}
                      </p>
                      <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                        Dung lượng tối đa: 25MB
                      </p>
                    </div>

                    <div className="mt-2 bg-white text-prof-blue-primary border-2 border-prof-blue-primary px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-prof-blue-primary hover:text-white transition-all shadow-sm flex items-center gap-2 relative z-0">
                      <Upload className="w-4 h-4" />
                      Chọn tệp từ máy tính
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center text-center gap-6">
                    <div className="w-20 h-20 bg-prof-blue-light/10 text-prof-blue-primary rounded-full flex items-center justify-center">
                      <GraduationCap className="w-10 h-10" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">{selectedLesson.name}</h3>
                      <p className="text-sm text-slate-500 max-w-sm">
                        Hệ thống sẽ tạo KHBD chi tiết theo Công văn 2345/BGDĐT-GDTH, tích hợp các hoạt động phát triển Năng lực số phù hợp với nội dung bài học.
                      </p>
                    </div>
                    <button 
                      onClick={processFile}
                      disabled={isProcessing}
                      className="btn-primary px-10 py-4 text-base flex items-center gap-3"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                      Bắt đầu tạo KHBD mới
                    </button>
                  </div>
                )}

                <div className="mt-8">
                  <div className="section-title">Xem trước cấu trúc tích hợp</div>
                  <div className="bg-slate-50 border border-prof-slate-border rounded-md p-5 space-y-3">
                    <div className="flex items-center text-xs text-prof-slate-label font-medium">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-3" />
                      Khung NL số: Khai thác dữ liệu & thông tin (Component 1.1)
                    </div>
                    <div className="flex items-center text-xs text-prof-slate-label font-medium">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-3" />
                      Kỹ thuật: Sử dụng phần mềm mô phỏng (Phet, ChemDraw)
                    </div>
                    <div className="flex items-center text-xs text-prof-slate-label font-medium">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-3" />
                      Kiểm tra: Đánh giá số hóa qua LMS/Quizizz
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-grow min-h-[500px] w-full">
                <LessonPlanPreviewer 
                  content={result}
                  subject={subject}
                  grade={grade}
                  lessonName={mode === 'integrate' && file ? file.name.split('.')[0] : selectedLesson.name}
                  periods={effectivePeriods}
                  onDownload={downloadResult}
                  onReset={() => setResult(null)}
                />
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-md flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {error}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer Actions */}
      <footer className="bg-white border-top border-prof-slate-border px-10 py-5 flex justify-end items-center gap-5 flex-shrink-0">
        <button 
          onClick={reset}
          className="btn-secondary"
        >
          Hủy bỏ
        </button>
        
        {result === null ? (
          <button
            disabled={(mode === 'integrate' && !file) || isProcessing}
            onClick={processFile}
            className="btn-primary flex items-center gap-3"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                {mode === 'integrate' ? 'Tích hợp Năng lực số' : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    Bắt đầu tạo KHBD mới
                  </>
                )}
              </>
            )}
          </button>
        ) : (
          <button
            onClick={downloadResult}
            className="btn-primary flex items-center gap-3 bg-green-600 hover:bg-green-700 shadow-green-200"
          >
            <Download className="w-4 h-4" />
            Tải về File DOCX
          </button>
        )}
      </footer>

      {/* Paywall Modal */}
      <AnimatePresence>
        {showPaywall && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col my-8 font-sans text-slate-800"
            >
              {/* Header */}
              <div className="bg-prof-blue-dark text-white p-6 relative flex-shrink-0">
                <button 
                  onClick={() => {
                    if (credits > 0) {
                      setShowPaywall(false);
                      setShowAdminPanel(false);
                    } else {
                      alert("Vui lòng kích hoạt gói học tập để tiếp tục soạn bài giảng!");
                    }
                  }}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-400">
                    <Sparkles className="w-6 h-6 fill-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">Kích hoạt Tài khoản KHBD</h3>
                      <span 
                        onClick={() => {
                          setVersionClicks(prev => {
                            const next = prev + 1;
                            if (next >= 5) {
                              setShowAdminPanel(true);
                              return 0;
                            }
                            return next;
                          });
                        }}
                        title="Click 5 lần để mở Admin Panel"
                        className="text-[9px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded font-black uppercase cursor-pointer select-none"
                      >
                        v1.1.2
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      {tier === 'free' ? 'Bạn đang sử dụng gói dùng thử miễn phí' : `Tài khoản: Gói ${tier.toUpperCase()}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabs selector */}
              {!showAdminPanel && (
                <div className="flex border-b border-slate-100 bg-slate-50 p-1">
                  <button 
                    onClick={() => setPaywallTab('pay')}
                    className={cn(
                      "flex-1 py-3 text-sm font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2",
                      paywallTab === 'pay' ? "bg-white text-prof-blue-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <CreditCard className="w-4 h-4" />
                    Đăng ký gói lượt tải
                  </button>
                  <button 
                    onClick={() => setPaywallTab('activate')}
                    className={cn(
                      "flex-1 py-3 text-sm font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2",
                      paywallTab === 'activate' ? "bg-white text-prof-blue-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <Lock className="w-4 h-4" />
                    Nhập mã kích hoạt
                  </button>
                </div>
              )}

              {/* Body */}
              <div className="p-6 overflow-y-auto max-h-[60vh] flex-grow">
                {paymentSuccessMessage && (
                  <div 
                    onClick={() => window.location.reload()}
                    className="p-5 mb-4 bg-green-50 border border-green-200 rounded-2xl text-green-800 text-center space-y-2 animate-bounce cursor-pointer hover:bg-green-100 transition-all border-dashed"
                  >
                    <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
                    <h4 className="font-bold text-base">Thanh toán Thành công!</h4>
                    <p className="text-xs whitespace-pre-line text-left max-w-sm mx-auto">{paymentSuccessMessage}</p>
                    <p className="text-[10px] text-green-600 font-bold underline mt-2">Bấm vào đây để tải lại trang ngay</p>
                  </div>
                )}

                {showAdminPanel ? (
                  // Admin panel UI
                  <div className="space-y-5 animate-in fade-in duration-300">
                    <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl text-purple-800 text-xs">
                      <h4 className="font-bold mb-1">CỔNG ADMIN - TẠO MÃ KÍCH HOẠT & CẤU HÌNH</h4>
                      <p>Hệ thống hỗ trợ tạo mã kích hoạt theo từng gói lượt tải.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Mã thiết bị khách hàng</label>
                      <input 
                        type="text"
                        value={adminTargetDevice}
                        onChange={(e) => setAdminTargetDevice(e.target.value)}
                        placeholder="Ví dụ: KHBD-V3-XXXXXX"
                        className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold uppercase focus:border-prof-blue-primary outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Chọn gói kích hoạt</label>
                      <select 
                        value={adminSelectedPrefix}
                        onChange={(e) => setAdminSelectedPrefix(e.target.value)}
                        className="w-full p-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold focus:border-prof-blue-primary outline-none"
                      >
                        <option value="VIP5">Gói 1 (Trải nghiệm): 5 lượt tải - Gemini 3.5 Flash (Prefix VIP5-)</option>
                        <option value="VIP15">Gói 2 (Tiết kiệm): 15 lượt tải - Gemini 3.5 Flash (Prefix VIP15-)</option>
                        <option value="VIP40">Gói 3 (Pro): 40 lượt tải - Gemini 3.5 Flash (Prefix VIP40-)</option>
                      </select>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Cấu hình cổng payOS (Casso)</label>
                      
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-slate-500">Client ID:</span>
                        <input 
                          type="text"
                          value={adminPayosClientIdInput}
                          onChange={(e) => setAdminPayosClientIdInput(e.target.value)}
                          placeholder="Nhập Client ID..."
                          className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono focus:border-prof-blue-primary outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-slate-500">API Key:</span>
                        <input 
                          type="text"
                          value={adminPayosApiKeyInput}
                          onChange={(e) => setAdminPayosApiKeyInput(e.target.value)}
                          placeholder="Nhập API Key..."
                          className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono focus:border-prof-blue-primary outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-slate-500">Checksum Key:</span>
                        <input 
                          type="text"
                          value={adminPayosChecksumKeyInput}
                          onChange={(e) => setAdminPayosChecksumKeyInput(e.target.value)}
                          placeholder="Nhập Checksum Key..."
                          className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono focus:border-prof-blue-primary outline-none transition-all"
                        />
                      </div>

                      <button
                        onClick={() => {
                          const cid = adminPayosClientIdInput.trim();
                          const akey = adminPayosApiKeyInput.trim();
                          const csk = adminPayosChecksumKeyInput.trim();

                          localStorage.setItem('khbd_payos_client_id', cid);
                          localStorage.setItem('khbd_payos_api_key', akey);
                          localStorage.setItem('khbd_payos_checksum_key', csk);

                          alert("Đã lưu cấu hình payOS thành công!");
                        }}
                        className="py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded text-[10px] font-bold transition-all cursor-pointer"
                      >
                        Lưu cấu hình payOS
                      </button>
                    </div>

                    <button 
                      onClick={handleAdminGenerateKey}
                      className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                    >
                      Tạo mã kích hoạt
                    </button>

                    {adminGeneratedKey && (
                      <div className="mt-4 p-4 bg-slate-900 text-white rounded-xl space-y-3">
                        <div className="text-xs text-slate-400 font-bold uppercase">Mã kích hoạt tương ứng:</div>
                        <div className="flex items-center justify-between gap-3">
                          <code className="text-sm font-mono font-bold text-green-400 select-all tracking-wider">{adminGeneratedKey}</code>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(adminGeneratedKey);
                              alert("Đã sao chép mã kích hoạt!");
                            }}
                            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-3 border-t border-slate-100">
                      <button 
                        onClick={() => {
                          setCredits(9999);
                          setTier('pro');
                          localStorage.setItem('khbd_credits', '9999');
                          localStorage.setItem('khbd_tier', 'pro');
                          alert("Đã kích hoạt chế độ VIP Vô hạn cho thiết bị này!");
                          setShowPaywall(false);
                          setShowAdminPanel(false);
                        }}
                        className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-xs transition-all cursor-pointer"
                      >
                        Kích hoạt thiết bị này
                      </button>
                      <button 
                        onClick={() => {
                          setShowAdminPanel(false);
                          setPaywallTab('activate');
                        }}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-all cursor-pointer"
                      >
                        Thoát chế độ Admin
                      </button>
                    </div>
                  </div>
                ) : paywallTab === 'pay' ? (
                  // Payment Info UI
                  <div className="space-y-5 animate-in fade-in duration-300">
                    {credits <= 0 && (
                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-800 space-y-1">
                          <p className="font-bold">Lượt tải của thiết bị đã hết (0 lượt)</p>
                          <p>Vui lòng đăng ký gói tải hoặc mua thêm lượt để tiếp tục tải file giáo án Word.</p>
                        </div>
                      </div>
                    )}

                    {/* Hướng dẫn thanh toán nhanh */}
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2.5 text-xs text-slate-700">
                      <div className="flex items-center gap-2 font-bold text-blue-800 uppercase tracking-wider">
                        <BookOpen className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span>Hướng dẫn thanh toán &amp; kích hoạt</span>
                      </div>
                      <div className="space-y-2 text-slate-600 leading-relaxed pl-1">
                        <div className="flex gap-2">
                          <span className="font-bold text-blue-700">1.</span>
                          <span>Chọn gói lượt tải cần mua ở <strong>Bước 1</strong>.</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-bold text-blue-700">2.</span>
                          <span>Bấm <strong>&quot;Tạo mã QR thanh toán&quot;</strong> ở <strong>Bước 2</strong>.</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-bold text-blue-700">3.</span>
                          <span>Quét mã QR bằng ứng dụng ngân hàng. Vui lòng giữ nguyên <strong>số tiền</strong> và <strong>nội dung chuyển khoản</strong> để hệ thống tự động nhận diện.</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-bold text-blue-700">4.</span>
                          <span>Sau khi chuyển khoản thành công, vui lòng <strong>chờ 1-3 phút</strong>. Hệ thống <strong>MB Auto-Check</strong> sẽ tự động kích hoạt gói và cộng lượt tải trực tiếp trên thiết bị của bạn.</span>
                        </div>
                      </div>
                    </div>

                    {/* Package Selector */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Bước 1: Chọn gói lượt tải phù hợp</label>
                      <div className="grid grid-cols-1 gap-2.5">
                        {PAYMENT_PACKAGES.map((pkg) => (
                          <div 
                            key={pkg.id}
                            onClick={() => setSelectedPackage(pkg)}
                            className={cn(
                              "border-2 rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all",
                              selectedPackage.id === pkg.id 
                                ? "border-prof-blue-primary bg-prof-blue-light/5 shadow-md shadow-prof-blue-light/5" 
                                : "border-slate-100 bg-slate-50 hover:bg-slate-100/50"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <input 
                                type="radio" 
                                checked={selectedPackage.id === pkg.id}
                                onChange={() => setSelectedPackage(pkg)}
                                className="accent-prof-blue-primary w-4 h-4"
                              />
                              <div>
                                <h4 className="font-bold text-slate-800 text-xs sm:text-sm">{pkg.name}</h4>
                                <p className="text-[10px] text-slate-400 font-semibold">{pkg.label}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-black text-slate-800 text-sm sm:text-base">
                                {pkg.price.toLocaleString('vi-VN')}đ
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* QR Code Tabs */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Bước 2: Quét mã QR thanh toán</label>
                      
                      <div className="flex bg-slate-50 p-4 rounded-2xl items-center gap-4 justify-between border border-slate-100 min-h-[160px]">
                        <div className="space-y-1">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Gói đã chọn</div>
                          <div className="text-sm font-bold text-slate-800">{selectedPackage.name}</div>
                          <div className="text-lg font-black text-prof-blue-primary font-mono">
                            {selectedPackage.price.toLocaleString('vi-VN')} đ
                          </div>
                        </div>

                        {/* Dynamic VietQR or Button */}
                        {!shouldGenerateQR ? (
                          <button
                            type="button"
                            onClick={() => setShouldGenerateQR(true)}
                            className="py-3 px-5 bg-prof-blue-primary hover:bg-prof-blue-dark text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.97] hover:scale-[1.02] flex items-center gap-2"
                          >
                            <QrCode className="w-4 h-4" />
                            Tạo mã QR thanh toán
                          </button>
                        ) : (
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center flex-shrink-0">
                            {isCreatingPaymentLink ? (
                              <div className="w-32 h-32 flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-slate-100">
                                <Loader2 className="w-6 h-6 text-prof-blue-primary animate-spin" />
                                <span className="text-[8px] text-slate-400 mt-2 font-bold uppercase">Đang tạo mã...</span>
                              </div>
                            ) : (
                              <img 
                                src={currentQrCode 
                                  ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentQrCode)}`
                                  : `https://img.vietqr.io/image/${PAYMENT_CONFIG.bankId}-${PAYMENT_CONFIG.accountNo}-vietqr.png?amount=${selectedPackage.price}&addInfo=TMT%20${deviceId.replace(/-/g, '%20')}&accountName=${encodeURIComponent(PAYMENT_CONFIG.accountName)}`
                                }
                                alt="VietQR Dynamic Link"
                                className="w-32 h-32 object-contain animate-fade-in"
                              />
                            )}
                            <span className="text-[8px] text-slate-400 font-black mt-1 uppercase text-center mt-1">Quét mã Tự động điền</span>
                          </div>
                        )}
                      </div>

                      {/* Static QR Modal view fallback if they want school account image */}
                      <details className="text-xs text-slate-500 cursor-pointer">
                        <summary className="font-bold text-prof-blue-primary hover:underline">Hiển thị mã QR ngân hàng gốc (Ảnh hóa đơn gốc)</summary>
                        <div className="mt-2 bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
                          <img 
                            src="/qr_payment.jpg" 
                            alt="Mã QR Gốc MB Bank" 
                            className="max-w-[200px] rounded-lg shadow-sm border border-slate-200"
                          />
                          <p className="text-[9px] text-slate-400 font-bold mt-2 text-center uppercase">Vui lòng nhập đúng số tiền {selectedPackage.price.toLocaleString('vi-VN')}đ và Nội dung chuyển khoản bên dưới</p>
                        </div>
                      </details>
                    </div>

                    {/* Manual Bank details table */}
                    <div className="space-y-2 text-sm bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <h4 className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-1.5 uppercase">Thông tin tài khoản nhận</h4>
                      
                      <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-50 text-xs">
                        <div className="text-slate-400 font-medium">Ngân hàng</div>
                        <div className="col-span-2 font-bold text-slate-800">MB BANK (NGÂN HÀNG QUÂN ĐỘI)</div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-50 text-xs">
                        <div className="text-slate-400 font-medium">Số tài khoản</div>
                        <div className="col-span-2 font-bold text-slate-800 flex items-center justify-between">
                          <span>{PAYMENT_CONFIG.accountNo}</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(PAYMENT_CONFIG.accountNo);
                              alert("Đã sao chép số tài khoản!");
                            }}
                            className="text-[10px] text-prof-blue-primary font-bold hover:underline cursor-pointer"
                          >
                            Sao chép
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-50 text-xs">
                        <div className="text-slate-400 font-medium">Chủ tài khoản</div>
                        <div className="col-span-2 font-bold text-slate-800 uppercase">{PAYMENT_CONFIG.accountName}</div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-50 text-xs">
                        <div className="text-slate-400 font-medium">Nội dung CK</div>
                        <div className="col-span-2 font-bold text-red-600 flex items-center justify-between bg-red-50 p-1.5 rounded border border-red-100">
                          <span className="font-mono">TMT {deviceId}</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(`TMT ${deviceId}`);
                              alert("Đã sao chép nội dung chuyển khoản!");
                            }}
                            className="text-[10px] text-red-600 font-bold hover:underline cursor-pointer"
                          >
                            Sao chép
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Auto Check Loader / payOS status Indicator */}
                    {payosClientId ? (
                      <div 
                        onClick={paymentSuccessMessage ? () => window.location.reload() : undefined}
                        className={cn(
                          "p-3 rounded-xl flex items-center justify-between gap-3 text-xs transition-all duration-300",
                          paymentSuccessMessage 
                            ? "bg-green-600 text-white cursor-pointer hover:bg-green-700 active:scale-[0.98]" 
                            : "bg-slate-900 text-white"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {paymentSuccessMessage ? (
                            <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
                          ) : isCheckingPayment ? (
                            <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
                          )}
                          <span className="font-medium text-slate-300">
                            {paymentSuccessMessage 
                              ? "Chuyển tiền thành công! Mời bạn tạo tiếp KHBD. Click vào đây để tải lại trang." 
                              : isCheckingPayment 
                                ? "Đang dò tìm chuyển khoản..." 
                                : "Hệ thống tự động kích hoạt đang chạy..."}
                          </span>
                        </div>
                        <span className={cn(
                          "text-[9px] px-2 py-0.5 rounded uppercase font-black",
                          paymentSuccessMessage ? "bg-green-800 text-green-100" : "bg-slate-800 text-slate-400"
                        )}>
                          {paymentSuccessMessage ? "Tải lại" : "MB Auto-Check"}
                        </span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 bg-slate-50 p-3 rounded-lg leading-relaxed font-medium">
                        💡 <strong>Hướng dẫn</strong>: Sau khi chuyển khoản đúng số tiền và nội dung, bạn chụp màn hình gửi Zalo cho Admin kèm theo <strong>Mã thiết bị</strong> để được hỗ trợ kích hoạt thủ công nhanh nhất.
                      </div>
                    )}
                  </div>
                ) : (
                  // Activation code input UI
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                      <div className="text-xs text-slate-400 font-medium">Mã thiết bị của bạn (gửi cho Admin):</div>
                      <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
                        <code className="text-xs font-mono font-bold text-slate-800 tracking-wider select-all">{deviceId}</code>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(deviceId);
                            alert("Đã sao chép mã thiết bị!");
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-600 hover:text-slate-800 transition-all cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Nhập mã kích hoạt (VIP Key)</label>
                      <input 
                        type="text"
                        value={activationKeyInput}
                        onChange={(e) => setActivationKeyInput(e.target.value)}
                        placeholder="VIP5-XXXX-XXXX"
                        className="w-full p-3 rounded-lg border border-slate-200 text-sm font-semibold uppercase tracking-widest text-center focus:border-prof-blue-primary outline-none transition-all"
                      />
                    </div>

                    {activationError && (
                      <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg font-medium">
                        ⚠️ {activationError}
                      </div>
                    )}

                    {activationSuccess && (
                      <div className="p-3 bg-green-50 border border-green-100 text-green-600 text-xs rounded-lg font-medium flex items-center gap-2 animate-pulse">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        {credits >= 9000 
                          ? 'Kích hoạt thành công gói VIP Vĩnh viễn!' 
                          : 'Kích hoạt gói thành công! Hệ thống đang cập nhật...'}
                      </div>
                    )}

                    <button 
                      onClick={handleActivate}
                      disabled={activationSuccess}
                      className="w-full py-3.5 bg-prof-blue-primary hover:bg-prof-blue-dark text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-prof-blue-light/10"
                    >
                      Xác nhận kích hoạt VIP
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 flex-shrink-0">
                <span>Thiết bị ID: <strong className="font-mono text-[10px] text-slate-700">{deviceId}</strong></span>
                <span className="flex items-center gap-1 font-medium">
                  Hỗ trợ Zalo: 
                  <a 
                    href={`https://zalo.me/${PAYMENT_CONFIG.supportZalo}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="font-bold text-prof-blue-primary hover:underline"
                  >
                    {PAYMENT_CONFIG.supportZalo}
                  </a>
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Gemini API Key & Model Configuration Modal */}
      <AnimatePresence>
        {showApiKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="bg-prof-blue-dark text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-prof-blue-primary/30 border border-blue-400/30 flex items-center justify-center">
                    <Key className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Cấu hình Gemini API & Mô hình AI</h3>
                    <p className="text-[11px] text-slate-300">Tùy chỉnh mã khóa API và lựa chọn mô hình tạo bài</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 text-slate-800">
                {/* AI Model Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Mô hình Trí tuệ Nhân tạo (Gemini Model)
                  </label>
                  <div className="space-y-2">
                    {SUPPORTED_MODELS.map((m) => (
                      <label
                        key={m.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                          selectedModel === m.id
                            ? "bg-blue-50/70 border-prof-blue-primary shadow-xs ring-1 ring-prof-blue-primary"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        <input
                          type="radio"
                          name="aiModel"
                          value={m.id}
                          checked={selectedModel === m.id}
                          onChange={(e) => {
                            setSelectedModel(e.target.value);
                            setStoredModel(e.target.value);
                          }}
                          className="mt-1 text-prof-blue-primary focus:ring-prof-blue-primary"
                        />
                        <div className="flex-1">
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                            {m.name}
                            {m.id === 'gemini-3.5-flash-lite' && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">Khuyên dùng</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{m.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* API Key Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Google Gemini API Key
                    </label>
                    <button
                      type="button"
                      onClick={handleRestoreDefaultKey}
                      className="text-[11px] font-bold text-prof-blue-primary hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Dùng khóa hệ thống
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showKeyText ? "text" : "password"}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Dán mã API Key của bạn (AQ.Ab8...)"
                      className="w-full pr-10 pl-3 py-2.5 rounded-lg border border-slate-300 text-xs font-mono focus:border-prof-blue-primary outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyText(!showKeyText)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      {showKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Khóa API được lưu trữ trực tiếp trên trình duyệt của bạn (LocalStorage) và không chia sẻ ra ngoài.
                  </p>
                </div>

                {/* Connection Test Result */}
                {testKeyResult && (
                  <div className={cn(
                    "p-3 rounded-xl text-xs font-medium flex items-start gap-2 animate-in fade-in duration-200",
                    testKeyResult.ok 
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                      : "bg-red-50 text-red-700 border border-red-200"
                  )}>
                    {testKeyResult.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 leading-relaxed">
                      {testKeyResult.message}
                    </div>
                  </div>
                )}

                {/* Success Notification */}
                {apiKeySavedSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-bold flex items-center gap-2 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Đã lưu cấu hình API Key và Mô hình AI thành công!
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleTestApiKey}
                  disabled={isTestingKey}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isTestingKey ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Đang kiểm tra...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-prof-blue-primary" />
                      Kiểm tra kết nối
                    </>
                  )}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowApiKeyModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-prof-blue-primary hover:bg-prof-blue-dark text-white transition-colors cursor-pointer shadow-xs"
                  >
                    Lưu cấu hình
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
