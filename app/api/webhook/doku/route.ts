import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Ambil Session ID dari payload DOKU
    const sessionId = body?.order?.invoice_number || body?.session_id;
    const paymentStatus = body?.transaction?.status; // 'SUCCESS' / 'PAID'

    if (sessionId && (paymentStatus === 'SUCCESS' || paymentStatus === 'PAID')) {
      const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

      if (redisUrl && redisToken) {
        // Update status di Upstash Redis menjadi PAID (Berlaku 1 Jam)
        await fetch(`${redisUrl}/set/${sessionId}/PAID/EX/3600`, {
          headers: { Authorization: `Bearer ${redisToken}` },
        });
      }
    }

    return NextResponse.json({ status: 'OK' });
  } catch (error) {
    console.error('Webhook DOKU Error:', error);
    return NextResponse.json({ status: 'ERROR' }, { status: 500 });
  }
}