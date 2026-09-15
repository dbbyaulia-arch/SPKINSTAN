import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
      return NextResponse.json({ status: 'PENDING', message: 'Redis env missing' });
    }

    // Ambil status transaksi dari Upstash Redis
    const res = await fetch(`${redisUrl}/get/${sessionId}`, {
      headers: { Authorization: `Bearer ${redisToken}` },
      cache: 'no-store',
    });

    const data = await res.json();
    const currentStatus = data.result || 'PENDING';

    return NextResponse.json({
      sessionId: sessionId,
      status: currentStatus,
    });
  } catch (error) {
    console.error('Error Checking Redis Status:', error);
    return NextResponse.json(
      { error: 'Gagal memeriksa status pembayaran' },
      { status: 500 }
    );
  }
}