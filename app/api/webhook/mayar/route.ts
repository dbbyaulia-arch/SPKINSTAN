import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Ambil deskripsi transaksi untuk ekstrak sessionId
    const description = body.data?.description || '';
    const match = description.match(/\[Ref:\s*([^\]]+)\]/);
    const sessionId = match ? match[1] : null;

    if (body.event === 'payment.received' || body.status === 'SUCCESS' || body.status === 'PAID') {
      if (sessionId) {
        // Update status di Redis menjadi PAID
        await redis.set(`session:${sessionId}`, 'PAID', { ex: 86400 });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Mayar Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook Handler Failed' }, { status: 500 });
  }
}