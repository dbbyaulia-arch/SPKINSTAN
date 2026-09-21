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
    const rawCandidates = [id, querySessionId, queryMayarId].filter(
      (k): k is string => typeof k === 'string' && k.trim() !== ''
    );

    // Ambil mapped ID dari Redis jika pemetaan telah disimpan sebelumnya
    const expandedCandidates = new Set<string>(rawCandidates);
    for (const key of rawCandidates) {
      const mappedVal = await redis.get<string>(`mapping:${key}`);
      if (mappedVal) {
        expandedCandidates.add(mappedVal);
      }
    }

    const candidateKeys = Array.from(expandedCandidates);

    // 1. Pengecekan tingkat 1: Cek status di Upstash Redis (dengan prefix 'session:' maupun raw key)
    for (const key of candidateKeys) {
      const redisStatusWithPrefix = await redis.get<string>(`session:${key}`);
      if (redisStatusWithPrefix === 'PAID') {
        return NextResponse.json({ status: 'PAID', paid: true });
      }

      const rawRedisStatus = await redis.get<string>(key);
      if (rawRedisStatus === 'PAID') {
        return NextResponse.json({ status: 'PAID', paid: true });
      }
    }

    // 2. Pengecekan tingkat 2 (Direct Fallback): Cek langsung ke API Mayar
    const apiKey = process.env.MAYAR_API_KEY;
    const baseUrl = process.env.MAYAR_BASE_URL || 'https://api.mayar.id/hl/v1';

    if (apiKey) {
      const checkMayarIds = Array.from(
        new Set(
          [queryMayarId, id, querySessionId].filter(
            (k): k is string => typeof k === 'string' && k.trim() !== ''
          )
        )
      );

      for (const targetId of checkMayarIds) {
        const urlsToTry = [
          `${baseUrl}/payment/status/${targetId}`,
          `${baseUrl}/payment/${targetId}`,
          `https://api.mayar.id/hl/v1/payment/status/${targetId}`,
          `https://api.mayar.id/hl/v1/payment/${targetId}`,
        ];

        for (const url of urlsToTry) {
          try {
            const res = await fetch(url, {
              headers: {
                Authorization: `Bearer ${apiKey}`,
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
                data.data?.status === 'SUCCESS' ||
                data.data?.status === 'SETTLED' ||
                data.data?.isPaid === true;

              if (isPaid) {
                // Simpan status LUNAS ke Redis untuk semua kandidat key (dual-keying)
                for (const key of candidateKeys) {
                  await redis.set(`session:${key}`, 'PAID', { ex: 86400 });
                  await redis.set(key, 'PAID', { ex: 86400 });
                }
                return NextResponse.json({ status: 'PAID', paid: true });
              }
            }
          } catch (mayarErr) {
            console.error(`[DIRECT MAYAR API CHECK ERROR] URL: ${url}`, mayarErr);
          }
        }
      }
    }

    return NextResponse.json({ status: 'PENDING', paid: false });
  } catch (error) {
    console.error('[STATUS CHECK ERROR]:', error);
    return NextResponse.json({ status: 'ERROR', paid: false }, { status: 500 });
  }
}