// app/api/qris/status/[id]/route.ts
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId') || params.id;

    if (!sessionId) {
      return NextResponse.json({ isPaid: false, message: 'Session ID tidak ditemukan' });
    }

    const rawTxn = await redis.get<string>(`txn:${sessionId}`);

    if (!rawTxn) {
      return NextResponse.json({ isPaid: false, status: 'NOT_FOUND' });
    }

    const txnData = typeof rawTxn === 'string' ? JSON.parse(rawTxn) : rawTxn;
    const isPaid = txnData?.status === 'PAID';

    return NextResponse.json({
      success: true,
      isPaid,
      status: txnData?.status || 'PENDING',
    });
  } catch (error) {
    console.error('Error checking status in Redis:', error);
    return NextResponse.json({ isPaid: false, error: 'Database read failed' }, { status: 500 });
  }
}