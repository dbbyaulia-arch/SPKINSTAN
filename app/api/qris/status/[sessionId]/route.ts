import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> | { sessionId: string } }
) {
  // Await params untuk kompatibilitas Next.js 15
  const resolvedParams = await params;
  const { sessionId } = resolvedParams;

  if (!sessionId) {
    return NextResponse.json({ status: 'ERROR', paid: false, message: 'Invalid Session ID' }, { status: 400 });
  }

  try {
    // 1. Cek status di Upstash Redis yang diset oleh Webhook Mayar
    const redisStatus = await redis.get(`session:${sessionId}`);

    if (redisStatus === 'PAID') {
      return NextResponse.json({ status: 'PAID', paid: true });
    }

    // 2. Fallback: Cek key alternatif tanpa prefix jika ada
    const rawRedisStatus = await redis.get(sessionId);
    if (rawRedisStatus === 'PAID') {
      return NextResponse.json({ status: 'PAID', paid: true });
    }

    // 3. Fallback Opsional: Panggil API Mayar jika ID yang dikirim adalah Mayar ID asli
    if (process.env.MAYAR_API_KEY && !sessionId.startsWith('SPK-')) {
      const res = await fetch(`https://api.mayar.id/hl/v1/payment/status/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.MAYAR_API_KEY}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'PAID' || data.isPaid === true || data.data?.status === 'PAID' || data.data?.status === 'SUCCESS') {
          // Simpan ke Redis agar request selanjutnya langsung cepat
          await redis.set(`session:${sessionId}`, 'PAID', { ex: 86400 });
          return NextResponse.json({ status: 'PAID', paid: true });
        }
      }
    }

    return NextResponse.json({ status: 'PENDING', paid: false });
  } catch (error) {
    console.error('[STATUS CHECK ERROR]:', error);
    return NextResponse.json({ status: 'ERROR', paid: false }, { status: 500 });
  }
}