import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { sessionId, packageType } = await request.json();
    const amount = packageType === 'BUNDLING' ? 49999 : 19999;

    // 1. Simpan Status awal PENDING ke Upstash Redis (TTL 15 Menit = 900 Detik)
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (redisUrl && redisToken) {
      await fetch(`${redisUrl}/set/${sessionId}/PENDING/EX/900`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
    }

    // 2. Generate string QRIS DOKU / Mock Payload
    const qrString = `00020101021226680016ID.DOKU.WWW01189360091400000000000215${sessionId}5204581253033605405${amount}5802ID5909SPKINSTAN6007JAKARTA6304ABCD`;

    return NextResponse.json({
      success: true,
      sessionId,
      qrString,
    });
  } catch (error) {
    console.error('API QRIS Generate Error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}