// app/api/webhooks/mayar/route.ts
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('>>> WEBHOOK MAYAR DITERIMA:', JSON.stringify(body, null, 2));

    const mayarPaymentId = body?.data?.id || body?.id || body?.paymentId;
    const eventType = (body?.event || body?.eventType || '').toLowerCase();
    const rawStatus = (body?.data?.status || body?.status || '').toString().toUpperCase();

    // HANYA anggap lunas jika event atau status benar-benar LUNAS
    // Abaikan "success: true" dari payload pembuatan QRIS
    const isTrulyPaid =
      eventType === 'payment.received' ||
      eventType === 'payment.settled' ||
      rawStatus === 'PAID' ||
      rawStatus === 'SETTLED';

    if (mayarPaymentId && isTrulyPaid) {
      // Cari sessionId berdasarkan Mayar Payment ID
      let sessionId = await redis.get<string>(`mayar_mapping:${mayarPaymentId}`);

      // Fallback email jika mapping tidak ketemu
      if (!sessionId && body?.data?.customer?.email) {
        const email = body.data.customer.email;
        if (email.includes('spk-')) {
          sessionId = email.split('@')[0].toUpperCase();
        }
      }

      if (sessionId) {
        const rawTxn = await redis.get<string>(`txn:${sessionId}`);
        let txnData = rawTxn ? (typeof rawTxn === 'string' ? JSON.parse(rawTxn) : rawTxn) : {};

        txnData = {
          ...txnData,
          status: 'PAID',
          paidAt: new Date().toISOString(),
        };

        // Update status di Redis
        await redis.set(`txn:${sessionId}`, JSON.stringify(txnData), { ex: 86400 });
        console.log(`✅ Status ${sessionId} VALID LUNAS via Webhook Mayar`);

        return NextResponse.json({ success: true, message: 'Status updated to PAID' });
      }
    }

    return NextResponse.json({ success: true, message: 'Webhook received but not paid yet' });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Webhook Error' }, { status: 500 });
  }
}