import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function verifySignature(data, signature, checksumKey) {
  const sortedKeys = Object.keys(data).sort();
  const signString = sortedKeys.map((key) => `${key}=${data[key]}`).join('&');
  const expected = crypto.createHmac('sha256', checksumKey).update(signString).digest('hex');
  return expected === signature;
}

// LƯU Ý QUAN TRỌNG: endpoint này luôn trả về 200, kể cả khi có lỗi hoặc dữ liệu
// không hợp lệ. Nếu trả về lỗi (4xx/5xx), payOS sẽ hiểu là chưa nhận được và
// RETRY liên tục, có thể dẫn tới xử lý trùng lặp. Việc chống trùng lặp/giả mạo
// được xử lý bằng logic bên trong (kiểm tra chữ ký, kiểm tra status hiện tại),
// không phải bằng HTTP status code.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(200).json({ received: true });
    return;
  }

  try {
    const { data, signature } = req.body || {};
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    // payOS gửi 1 request test (không có data/signature thật) khi đăng ký webhook lần đầu.
    if (!data || !signature || !checksumKey) {
      res.status(200).json({ received: true });
      return;
    }

    const isValid = verifySignature(data, signature, checksumKey);
    if (!isValid) {
      console.error('[webhook] Chữ ký không hợp lệ, bỏ qua payload này');
      res.status(200).json({ received: true });
      return;
    }

    const orderCode = Number(data.orderCode);
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderCode)
      .single();

    if (error || !order) {
      console.error(`[webhook] Không tìm thấy orderCode ${orderCode} trong hệ thống`);
      res.status(200).json({ received: true });
      return;
    }

    if (order.status === 'paid') {
      // Đơn đã được xử lý trước đó (payOS có thể gửi lại webhook) — không làm gì thêm.
      res.status(200).json({ received: true });
      return;
    }

    const paidAmount = Number(data.amount);
    if (paidAmount !== order.price) {
      // Không khớp giá đã ghi lúc tạo đơn -> có gì đó bất thường, không kích hoạt.
      console.error(
        `[webhook] Amount mismatch cho order ${orderCode}: kỳ vọng ${order.price}, nhận ${paidAmount}`
      );
      res.status(200).json({ received: true });
      return;
    }

    await supabase
      .from('orders')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', orderCode)
      .eq('status', 'pending'); // điều kiện an toàn: chỉ update nếu vẫn đang 'pending'

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[webhook] Lỗi xử lý:', err);
    res.status(200).json({ received: true });
  }
}
