// app/api/qris/generate/route.ts
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, packageType, amount, docType, customerName, customerMobile, customerEmail } = body;

    const MAYAR_API_KEY = process.env.MAYAR_API_KEY || '';

    // 1. Panggil API Mayar untuk membuat link pembayaran
    const mayarRes = await fetch('https://api.mayar.id/hl/v1/payment/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MAYAR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: customerName || 'Klien SPKInstan',
        email: customerEmail || `client-${Date.now()}@spkinstan.com`,
        mobile: customerMobile || '081234567890',
        amount: amount || 1000,
        description: `Lisensi Dokumen ${docType} - ${packageType}`,
        // RedirectUrl mengarah ke halaman callback khusus
        redirectUrl: 'https://spkinstan.vercel.app/payment-success',
      }),
    });

    const mayarData = await mayarRes.json();
    const paymentId = mayarData?.data?.id || mayarData?.id || mayarData?.data?.paymentId;
    const paymentUrl = mayarData?.data?.link || mayarData?.link || mayarData?.data?.url;

    // 2. SIMPAN KE REDIS dengan status 'PENDING'
    const transactionData = {
      sessionId,
      mayarPaymentId: paymentId,
      status: 'PENDING',
      docType,
      packageType,
      amount,
      createdAt: new Date().toISOString(),
    };

    // Simpan key berdasarkan Session ID dan Mayar ID agar mudah dicari oleh Webhook
    await redis.set(`txn:${sessionId}`, JSON.stringify(transactionData), { ex: 86400 });
    if (paymentId) {
      await redis.set(`mayar_mapping:${paymentId}`, sessionId, { ex: 86400 });
    }

    return NextResponse.json({
      success: true,
      paymentUrl,
      mayarPaymentId: paymentId,
      sessionId,
    });
  } catch (error) {
    console.error('Error generate QRIS:', error);
    return NextResponse.json({ success: false, message: 'Gagal membuat pembayaran' }, { status: 500 });
  }
}