// app/api/qris/generate/route.ts
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, packageType, amount, docType } = body;

    // 1. Sanitasi Nama Pembayar (Cegah nama kosong/statis)
    const rawName = body.name || body.customerName;
    const customerName =
      rawName && typeof rawName === 'string' && rawName.trim() !== ''
        ? rawName.trim()
        : 'Pihak Kedua';

    // 2. Sanitasi Email (Jika kosong, buat email acak unik agar Mayar TIDAK menyimpan profil terpusat)
    const rawEmail = body.email || body.customerEmail;
    const customerEmail =
      rawEmail && typeof rawEmail === 'string' && rawEmail.trim() !== ''
        ? rawEmail.trim()
        : `trx-${Date.now()}@spkinstan.com`; // Email unik per transaksi

    const rawMobile = body.mobile || body.customerMobile;
    const customerMobile =
      rawMobile && typeof rawMobile === 'string' && rawMobile.trim() !== ''
        ? rawMobile.trim()
        : '081234567890';

    const MAYAR_API_KEY = process.env.MAYAR_API_KEY || '';

    // 3. Payload ke Mayar API
    const mayarPayload = {
      name: customerName,
      email: customerEmail,
      mobile: customerMobile,
      amount: Number(amount) || 1000,
      description: `Lisensi Dokumen ${docType || 'SPKInstan'} - ${packageType || 'Dokumen'}`,
      redirectUrl: process.env.NEXT_PUBLIC_BASE_URL
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/payment-success`
        : 'https://spkinstan.vercel.app/payment-success',
    };

    // 4. Panggil API Mayar
    const mayarRes = await fetch('https://api.mayar.id/hl/v1/payment/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MAYAR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mayarPayload),
    });

    const mayarData = await mayarRes.json();

    if (!mayarRes.ok) {
      console.error('Mayar API Error:', mayarData);
      return NextResponse.json(
        {
          success: false,
          message: mayarData.message || 'Gagal membuat transaksi pembayaran di Mayar',
        },
        { status: mayarRes.status }
      );
    }

    const paymentId = mayarData?.data?.id || mayarData?.id || mayarData?.data?.paymentId;
    const paymentUrl = mayarData?.data?.link || mayarData?.link || mayarData?.data?.url;

    // 5. Simpan transaksi ke Redis
    const transactionData = {
      sessionId,
      mayarPaymentId: paymentId,
      status: 'PENDING',
      docType,
      packageType,
      amount,
      customerName,
      customerEmail,
      createdAt: new Date().toISOString(),
    };

    if (sessionId) {
      await redis.set(`txn:${sessionId}`, JSON.stringify(transactionData), { ex: 86400 });
    }
    if (paymentId && sessionId) {
      await redis.set(`mayar_mapping:${paymentId}`, sessionId, { ex: 86400 });
    }

    return NextResponse.json({
      success: true,
      paymentUrl,
      mayarPaymentId: paymentId,
      sessionId,
    });
  } catch (error: any) {
    console.error('Error generate QRIS:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal membuat pembayaran' },
      { status: 500 }
    );
  }
}