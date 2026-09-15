import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    // Ekstrak invoice_number / session_id dari webhook DOKU
    const sessionId =
      body?.order?.invoice_number ||
      body?.trx_id ||
      body?.invoice_number;

    const paymentStatus =
      body?.transaction?.status ||
      body?.service?.id ||
      'SUCCESS';

    if (sessionId && (paymentStatus === 'SUCCESS' || paymentStatus === 'PAID')) {
      // Perbarui status di Upstash Redis menjadi PAID
      if (redisUrl && redisToken) {
        await fetch(`${redisUrl}/set/${sessionId}/PAID`, {
          headers: { Authorization: `Bearer ${redisToken}` },
        });
      }
    }

    return NextResponse.json({ status: 'OK' }, { status: 200 });
  } catch (error) {
    console.error('Error Webhook DOKU:', error);
    return NextResponse.json(
      { error: 'Invalid Webhook Payload' },
      { status: 400 }
    );
  }
}