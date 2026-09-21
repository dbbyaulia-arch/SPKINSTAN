// app/api/webhooks/mayar/route.ts
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('>>> WEBHOOK MAYAR DITERIMA:', body);

    // Ambil Payment ID dan Event Status dari Payload Mayar
    const mayarPaymentId = body?.data?.id || body?.id || body?.paymentId || body?.data?.paymentId;
    const statusStr = JSON.stringify(body).toUpperCase();

    const isPaid =
      statusStr.includes('"PAID"') ||
      statusStr.includes('"SETTLED"') ||
      statusStr.includes('"SUCCESS"') ||
      statusStr.includes('PAYMENT.RECEIVED');

    if (mayarPaymentId && isPaid) {
      // 1. Cari sessionId berdasarkan Mayar Payment ID dari Redis
      let sessionId = await redis.get<string>(`mayar_mapping:${mayarPaymentId}`);

      // Fallback jika sessionId dikirim langsung di customer detail
      if (!sessionId && body?.data?.customer?.email) {
        const email = body.data.customer.email;
        if (email.includes('spk-')) {
          sessionId = email.split('@')[0].toUpperCase();
        }
      }

      if (sessionId) {
        // 2. Update status transaksi di Redis menjadi PAID
        const rawTxn = await redis.get<string>(`txn:${sessionId}`);
        let txnData = rawTxn ? (typeof rawTxn === 'string' ? JSON.parse(rawTxn) : rawTxn) : {};

        txnData = {
          ...txnData,
          status: 'PAID',
          paidAt: new Date().toISOString(),
        };

        await redis.set(`txn:${sessionId}`, JSON.stringify(txnData), { ex: 86400 });
        console.log(`✅ Status transaksi ${sessionId} BERHASIL DIUPDATE KE 'PAID' via Webhook!`);

        return NextResponse.json({ success: true, message: 'Status updated to PAID' });
      }
    }

    return NextResponse.json({ success: true, message: 'Webhook received but ignored' });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Webhook Error' }, { status: 500 });
  }
}