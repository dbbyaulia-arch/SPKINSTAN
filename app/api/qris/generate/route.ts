import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      sessionId,
      amount,
      customerName,
      customerMobile,
      customerEmail,
      docType,
    } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Session ID diperlukan' },
        { status: 400 }
      );
    }

    const apiKey = process.env.MAYAR_API_KEY;
    const baseUrl = process.env.MAYAR_BASE_URL || 'https://api.mayar.id/hl/v1';

    if (!apiKey) {
      console.error('[MAYAR GENERATE ERROR]: MAYAR_API_KEY belum dikonfigurasi');
      return NextResponse.json(
        { success: false, message: 'MAYAR_API_KEY belum dikonfigurasi' },
        { status: 500 }
      );
    }

    // 1. Panggil API Mayar untuk membuat transaksi
    const response = await fetch(`${baseUrl}/payment/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: customerName || 'Klien SPKInstan',
        email: customerEmail || `client-${Date.now()}@spkinstan.com`,
        mobile: customerMobile || '081234567890',
        amount: amount || 1000,
        description: `Pembayaran Lisensi Dokumen ${docType || ''} [Ref: ${sessionId}]`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[MAYAR API RESPONSE ERROR]:', data);
      return NextResponse.json(
        { success: false, message: data.message || 'Gagal membuat tagihan di Mayar' },
        { status: response.status }
      );
    }

    const mayarPaymentId = data.data?.id || data.data?.paymentId || data.id || data.paymentId;
    const paymentUrl = data.data?.link || data.data?.url || data.link || data.url;

    // 2. Simpan pemetaan ke Redis secara Non-Blocking (Safe Try-Catch)
    try {
      if (mayarPaymentId) {
        await redis.set(`mapping:${sessionId}`, mayarPaymentId, { ex: 86400 });
        await redis.set(`mapping:${mayarPaymentId}`, sessionId, { ex: 86400 });
        await redis.set(`session:${mayarPaymentId}`, 'PENDING', { ex: 86400 });
      }
      await redis.set(`session:${sessionId}`, 'PENDING', { ex: 86400 });
    } catch (redisError) {
      console.warn('[REDIS SAVE WARNING]: Gagal menyimpan ke Redis, tetap melanjutkan:', redisError);
    }

    // 3. Kembalikan response ke Frontend
    return NextResponse.json({
      success: true,
      mayarPaymentId: mayarPaymentId,
      paymentId: mayarPaymentId,
      paymentUrl: paymentUrl,
      qrString: data.data?.qrString || data.qrString,
    });
  } catch (error) {
    console.error('[MAYAR API GENERATE SERVER ERROR]:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server saat membuat tagihan' },
      { status: 500 }
    );
  }
}