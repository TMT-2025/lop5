import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { orderCode, deviceId } = req.query;
    if (!orderCode || !deviceId) {
      res.status(400).json({ error: 'Thiếu orderCode hoặc deviceId' });
      return;
    }

    // Bắt buộc khớp cả orderCode LẪN deviceId — tránh 1 thiết bị dò hỏi trạng thái
    // đơn hàng của thiết bị khác.
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', Number(orderCode))
      .eq('device_id', deviceId)
      .single();

    if (error || !order) {
      res.status(200).json({ status: 'not_found' });
      return;
    }

    if (order.status !== 'paid') {
      res.status(200).json({ status: order.status });
      return;
    }

    if (order.claimed_at) {
      // Đã cộng credit cho đơn này rồi (client có thể poll trùng vài nhịp) — báo lại
      // là đã paid nhưng KHÔNG trả credits để frontend không cộng lần 2.
      res.status(200).json({ status: 'paid', already_claimed: true });
      return;
    }

    // Đánh dấu "đã claim" ngay trong cùng 1 lệnh update có điều kiện (chỉ update nếu
    // claimed_at còn NULL). Đây là cách chống race condition khi client gọi 2 request
    // gần như đồng thời (ví dụ mở 2 tab) — chỉ 1 trong 2 request thắng và nhận được credits.
    const { data: claimed, error: claimError } = await supabase
      .from('orders')
      .update({ claimed_at: new Date().toISOString() })
      .eq('id', order.id)
      .is('claimed_at', null)
      .select();

    const wonClaim = !claimError && claimed && claimed.length > 0;

    res.status(200).json({
      status: 'paid',
      already_claimed: !wonClaim,
      packageId: order.package_id,
      credits: wonClaim ? order.credits : 0,
      price: order.price,
    });
  } catch (err) {
    console.error('[check-order-status] Lỗi:', err);
    res.status(500).json({ error: err.message });
  }
}
