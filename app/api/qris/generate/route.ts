import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, qrString: `SPKINSTAN_PAY_${body.sessionId}` });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}