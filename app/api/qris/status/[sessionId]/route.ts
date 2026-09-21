import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;

  try {
    // Panggil langsung status dari API Mayar
    const res = await fetch(`https://api.mayar.id/hl/v1/payment/status/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MAYAR_API_KEY}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store' // Wajib agar respon tidak di-cache Vercel
    });

    const data = await res.json();

    // Cek kriteria lunas dari respon Mayar
    if (data.status === 'PAID' || data.isPaid === true || data.data?.status === 'PAID') {
      return NextResponse.json({ status: 'PAID', paid: true });
    }

    return NextResponse.json({ status: 'PENDING', paid: false });
  } catch (error) {
    return NextResponse.json({ status: 'ERROR', paid: false }, { status: 500 });
  }
}