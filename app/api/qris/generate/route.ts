import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, packageType, amount, docType } = body;

    // 1. Ambil nama, email, & nomor WhatsApp aktual dari request frontend
    const customerName = body.name || body.customerName || 'Pihak Kedua';
    const customerEmail = body.email || body.customerEmail || 'pembayar@spkinstan.com';
    const customerMobile = body.mobile || body.customerMobile || '081234567890';

    const MAYAR_API_KEY = process.env.MAYAR_API_KEY || '';

    // 2. Buat struktur payload untuk Mayar API
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

    // 3. Panggil API Mayar untuk membuat link/tagihan pembayaran
    const mayarRes = await fetch('https://api.mayar.id/hl/v1/payment/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MAYAR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mayarPayload),
    });

    const mayarData = await mayarRes.json();

    // Validasi penanganan error dari respon API Mayar
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

    // 4. Simpan status transaksi awal ke Redis
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