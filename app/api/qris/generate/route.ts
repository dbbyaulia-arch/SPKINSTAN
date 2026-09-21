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
      packageType,
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
        // Format [Ref: sessionId] wajib agar regex Webhook bekerja
        description: `Pembayaran Lisensi Dokumen ${docType || ''} [Ref: ${sessionId}]`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Gagal membuat tagihan di Mayar' },
        { status: response.status }
      );
    }

    const mayarPaymentId = data.data?.id || data.data?.paymentId || data.id || data.paymentId;

    // Menyimpan pemetaan (mapping) awal antara sessionId dengan mayarPaymentId ke dalam Upstash Redis
    if (mayarPaymentId) {
      await redis.set(`mapping:${sessionId}`, mayarPaymentId, { ex: 86400 });
      await redis.set(`mapping:${mayarPaymentId}`, sessionId, { ex: 86400 });
      await redis.set(`session:${mayarPaymentId}`, 'PENDING', { ex: 86400 });
    }
    await redis.set(`session:${sessionId}`, 'PENDING', { ex: 86400 });

    return NextResponse.json({
      success: true,
      mayarPaymentId: mayarPaymentId,
      paymentId: mayarPaymentId,
      paymentUrl: data.data?.link || data.data?.url || data.link || data.url,
      qrString: data.data?.qrString || data.qrString,
    });
  } catch (error) {
    console.error('Mayar API Generate Error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server saat membuat tagihan' },
      { status: 500 }
    );
  }
}