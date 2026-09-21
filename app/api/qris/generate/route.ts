import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Otomatis bersihkan karakter ] jika tersisa di Environment Variable
const redisUrl = (process.env.UPSTASH_REDIS_REST_URL || '')
  .replace(/[\]\s]+$/, '')
  .trim();

const redis = new Redis({
  url: redisUrl,
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
      return NextResponse.json(
        { success: false, message: 'MAYAR_API_KEY belum diset di Vercel Environment Variables.' },
        { status: 500 }
      );
    }

    // 1. Sanitasi & Validasi Nomor HP (Mewajibkan minimal 10 digit)
    let cleanMobile = (customerMobile || '').toString().replace(/[^0-9]/g, '');

    if (cleanMobile.startsWith('0')) {
      cleanMobile = '62' + cleanMobile.slice(1);
    }

    // Fallback jika nomor diisi kurang dari 10 digit (mencegah error 'stringMin')
    if (cleanMobile.length < 10) {
      cleanMobile = '6281234567890';
    }

    const mayarPayload = {
      name: customerName || 'Klien SPKInstan',
      email: customerEmail || `client-${Date.now()}@spkinstan.com`,
      mobile: cleanMobile,
      amount: Number(amount) || 1000,
      description: `Pembayaran Lisensi Dokumen ${docType || ''} [Ref: ${sessionId}]`,
    };

    // 2. Panggil API Mayar
    const response = await fetch(`${baseUrl}/payment/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mayarPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[MAYAR API REJECTED]:', response.status, data);
      return NextResponse.json(
        { 
          success: false, 
          message: data.message || data.messages || 'Gagal membuat tagihan di Mayar' 
        },
        { status: response.status }
      );
    }

    const mayarPaymentId = data.data?.id || data.data?.paymentId || data.id || data.paymentId;
    const paymentUrl = data.data?.link || data.data?.url || data.link || data.url;

    // 3. Simpan status awal ke Upstash Redis secara aman
    try {
      if (mayarPaymentId) {
        await redis.set(`mapping:${sessionId}`, mayarPaymentId, { ex: 86400 });
        await redis.set(`mapping:${mayarPaymentId}`, sessionId, { ex: 86400 });
        await redis.set(`session:${mayarPaymentId}`, 'PENDING', { ex: 86400 });
      }
      await redis.set(`session:${sessionId}`, 'PENDING', { ex: 86400 });
    } catch (redisError) {
      console.warn('[REDIS WARNING]: Gagal simpan ke Redis, proses pembayaran tetap berlanjut:', redisError);
    }

    return NextResponse.json({
      success: true,
      mayarPaymentId: mayarPaymentId,
      paymentId: mayarPaymentId,
      paymentUrl: paymentUrl,
      qrString: data.data?.qrString || data.qrString,
    });

  } catch (error: any) {
    console.error('[SERVER ERROR]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}