import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Unwarp params (dukungan Next.js 14 & Next.js 15)
    const resolvedParams = await params;
    const sessionId = resolvedParams.id;

    if (!sessionId) {
      return NextResponse.json({ status: 'PENDING', paid: false });
    }

    const status = await redis.get(`session:${sessionId}`);

    return NextResponse.json({
      status: status || 'PENDING',
      paid: status === 'PAID',
    });
  } catch (error) {
    console.error('Check status error:', error);
    return NextResponse.json({ status: 'PENDING', paid: false });
  }
}