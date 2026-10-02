// app/api/qris/generate/route.ts
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, packageType, amount, docType } = body;

    // 1. Tangkap identitas pembayar
    const rawName = body.name || body.customerName;
    const finalCustomerName =
      rawName && typeof rawName === 'string' && rawName.trim() !== ''
        ? rawName.trim()
        : 'Penerima Kuitansi SPKInstan';

    const rawEmail = body.email || body.customerEmail;
    const finalCustomerEmail =
      rawEmail && typeof rawEmail === 'string' && rawEmail.trim() !== ''
        ? rawEmail.trim()
        : `client-${Date.now()}@spkinstan.com`;

    const rawMobile = body.mobile || body.customerMobile;
    const finalCustomerMobile =
      rawMobile && typeof rawMobile === 'string' && rawMobile.trim() !== ''
        ? rawMobile.trim()
        : '081234567890';

    const MAYAR_API_KEY = process.env.MAYAR_API_KEY || '';

    // 2. Judul Produk/Transaksi (Memisahkan Nama Produk dan Nama Pembayar)
    const transactionTitle = `Lisensi Dokumen ${docType || 'SPKInstan'} - ${packageType || 'Dokumen'}`;

    // 3. Panggil API Mayar dengan Payload Lengkap (name = Judul Produk, customerName/customer = Pembayar)
    const mayarRes = await fetch('https://api.mayar.id/hl/v1/payment/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MAYAR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: transactionTitle, // Nama Produk / Transaksi
        customerName: finalCustomerName, // Nama Pembayar
        email: finalCustomerEmail,
        mobile: finalCustomerMobile,
        // Mendukung objek customer terisolasi jika API Mayar versi akun Anda membutuhkan format ini
        customer: {
          name: finalCustomerName,
          email: finalCustomerEmail,
          mobile: finalCustomerMobile,
        },
        amount: Number(amount) || 1000,
        description: `Pembayaran lisensi oleh ${finalCustomerName}`,
        redirectUrl: process.env.NEXT_PUBLIC_BASE_URL
          ? `${process.env.NEXT_PUBLIC_BASE_URL}/payment-success`
          : 'https://spkinstan.vercel.app/payment-success',
      }),
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
    let paymentUrl = mayarData?.data?.link || mayarData?.link || mayarData?.data?.url;

    // 4. PRE-FILL QUERY PARAMS PADA URL IFRAME
    // Menambahkan query string agar modal/iframe Mayar memaksa pre-fill nama & email pembayar
    if (paymentUrl) {
      const urlObj = new URL(paymentUrl);
      urlObj.searchParams.set('name', finalCustomerName);
      urlObj.searchParams.set('customerName', finalCustomerName);
      urlObj.searchParams.set('email', finalCustomerEmail);
      urlObj.searchParams.set('mobile', finalCustomerMobile);
      paymentUrl = urlObj.toString();
    }

    // 5. Simpan data ke Redis
    const transactionData = {
      sessionId,
      mayarPaymentId: paymentId,
      status: 'PENDING',
      docType,
      packageType,
      amount,
      customerName: finalCustomerName,
      customerEmail: finalCustomerEmail,
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