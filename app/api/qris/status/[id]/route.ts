import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Await params untuk kompatibilitas penuh Next.js 15
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const { searchParams } = new URL(request.url);
  const querySessionId = searchParams.get('sessionId');
  const queryMayarId = searchParams.get('mayarId');

  if (!id && !querySessionId && !queryMayarId) {
    return NextResponse.json(
      { status: 'ERROR', paid: false, message: 'Invalid ID / Session ID' },
      { status: 400 }
    );
  }

  try {
    // Kumpulkan seluruh kandidat ID yang dikirim oleh Frontend
    const candidateKeys = Array.from(
      new Set(
        [id, querySessionId, queryMayarId].filter(
(k): k is string => typeof k === 'string' && k.trim() !== ''        )
      )
    );

    // 1. Cek status di Upstash Redis (dengan prefix 'session:' maupun raw key)
    for (const key of candidateKeys) {
      const redisStatusWithPrefix = await redis.get(`session:${key}`);
      if (redisStatusWithPrefix === 'PAID') {
        return NextResponse.json({ status: 'PAID', paid: true });
      }

      const rawRedisStatus = await redis.get(key);
      if (rawRedisStatus === 'PAID') {
        return NextResponse.json({ status: 'PAID', paid: true });
      }
    }

    // 2. Fallback: Cek langsung ke API Mayar jika belum ada di Redis (Webhook terlambat/gagal)
    const checkMayarId = queryMayarId || id || querySessionId;

    if (process.env.MAYAR_API_KEY && checkMayarId) {
      const urlsToTry = [
        `https://api.mayar.id/hl/v1/payment/status/${checkMayarId}`,
        `https://api.mayar.id/hl/v1/payment/${checkMayarId}`
      ];

      for (const url of urlsToTry) {
        try {
          const res = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${process.env.MAYAR_API_KEY}`,
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          });

          if (res.ok) {
            const data = await res.json();
            const isPaid =
              data.status === 'PAID' ||
              data.status === 'SUCCESS' ||
              data.status === 'SETTLED' ||
              data.isPaid === true ||
              data.paid === true ||
              data.data?.status === 'PAID' ||
              data.data?.status === 'SUCCESS';

            if (isPaid) {
              // Simpan status LUNAS ke Redis untuk semua kandidat key agar request berikutnya sangat cepat
              for (const key of candidateKeys) {
                await redis.set(`session:${key}`, 'PAID', { ex: 86400 });
              }
              return NextResponse.json({ status: 'PAID', paid: true });
            }
          }
        } catch (mayarErr) {
          console.error('[DIRECT MAYAR API CHECK ERROR]:', mayarErr);
        }
      }
    }

    return NextResponse.json({ status: 'PENDING', paid: false });
  } catch (error) {
    console.error('[STATUS CHECK ERROR]:', error);
    return NextResponse.json({ status: 'ERROR', paid: false }, { status: 500 });
  }
}