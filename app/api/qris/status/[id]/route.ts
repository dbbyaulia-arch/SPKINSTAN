import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
      return NextResponse.json({ status: 'PENDING' });
    }

    const res = await fetch(`${redisUrl}/get/${id}`, {
      headers: { Authorization: `Bearer ${redisToken}` },
      cache: 'no-store',
    });

    const data = await res.json();
    const status = data.result || 'PENDING';

    return NextResponse.json({ status });
  } catch (error) {
    return NextResponse.json({ status: 'PENDING' });
  }
}