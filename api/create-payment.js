import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { PACKAGES } from './_packages.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { deviceId, packageId, cancelUrl, returnUrl } = req.body;

    // Chỉ nhận deviceId + packageId từ client. KHÔNG nhận amount/orderCode từ client nữa —
    // hai giá trị này giờ do server tự quyết định, tránh việc client (vô tình hay cố ý)
    // gửi sai số tiền.
    if (!deviceId || typeof deviceId !== 'string') {
      res.status(400).json({ error: 'Thiếu deviceId' });
      return;
    }
    const pkg = PACKAGES[packageId];
    if (!pkg) {
      res.status(400).json({ error: 'packageId không hợp lệ' });
      return;
    }

    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
    if (!clientId || !apiKey || !checksumKey) {
      console.error('[create-payment] Thiếu payOS keys trong env');
      res.status(500).json({ error: 'payOS configuration keys are missing' });
      return;
    }

    // 1) Ghi đơn hàng vào Supabase TRƯỚC khi gọi payOS, trạng thái 'pending'.
    //    id tự tăng (bigserial) của bản ghi này sẽ dùng làm orderCode — đảm bảo
    //    không bao giờ trùng với bất kỳ đơn nào khác, kể cả đơn từ nhiều tháng trước.
    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert({
        device_id: deviceId,
        package_id: pkg.id,
        price: pkg.price,
        credits: pkg.credits,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[create-payment] Lỗi ghi Supabase:', insertError);
      res.status(500).json({ error: 'Không thể tạo đơn hàng' });
      return;
    }

    const orderCode = order.id;
    const description = `TMT ${deviceId.replace(/-/g, '')}`.substring(0, 25);

    const dataToSign = {
      amount: pkg.price,
      cancelUrl,
      description,
      orderCode,
      returnUrl,
    };
    const sortedKeys = Object.keys(dataToSign).sort();
    const signString = sortedKeys.map((key) => `${key}=${dataToSign[key]}`).join('&');
    const signature = crypto.createHmac('sha256', checksumKey).update(signString).digest('hex');

    const payload = { ...dataToSign, signature };

    const payosRes = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': clientId,
        'x-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });
    const result = await payosRes.json();

    if (result.code !== '00') {
      console.error('[create-payment] payOS từ chối:', result);
      // Hủy đơn vừa tạo vì payOS không nhận
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderCode);
      res.status(400).json(result);
      return;
    }

    // Lưu lại paymentLinkId của payOS để tiện đối chiếu sau này nếu cần
    await supabase
      .from('orders')
      .update({ payos_payment_link_id: result.data?.paymentLinkId ?? null })
      .eq('id', orderCode);

    res.status(200).json({
      code: '00',
      data: {
        orderCode,
        checkoutUrl: result.data.checkoutUrl,
        qrCode: result.data.qrCode,
      },
    });
  } catch (error) {
    console.error('[create-payment] Catch error:', error);
    res.status(500).json({ error: error.message });
  }
}
