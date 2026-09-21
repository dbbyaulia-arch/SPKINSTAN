import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const { 
      sessionId, 
      amount, 
      customerName, 
      customerMobile, 
      customerEmail 
    } = body;

    const response = await fetch('https://api.mayar.id/hl/v1/payment/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MAYAR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: customerName || 'Klien SPKInstan',
        email: customerEmail || `client-${Date.now()}@spkinstan.com`,
        mobile: customerMobile || '081234567890',
        amount: amount,
        // Format [Ref: sessionId] wajib agar regex Webhook bekerja
        description: `Pembayaran Lisensi Dokumen [Ref: ${sessionId}]`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Gagal membuat tagihan di Mayar' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      paymentUrl: data.data?.link || data.data?.url,
      qrString: data.data?.qrString,
    });
  } catch (error) {
    console.error('Mayar API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}