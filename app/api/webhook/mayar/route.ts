import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Tangani event testing dari tombol "Test Webhook" Mayar
    if (body.event === 'testing') {
      return NextResponse.json({ success: true, message: 'Test webhook received' }, { status: 200 });
    }

    // 2. Tangani event pembayaran asli dari Mayar
    const { event, data } = body;

    // Cek jika transaksi berhasil
    if (data && (event === 'payment.received' || data.status === 'SUCCESS')) {
      // Ambil identifier transaksi (misal ID session atau nomor hp customer)
      const sessionId = data.custom_field?.[0]?.value || data.customerMobile || data.id;

      if (sessionId) {
        // Simpan status PAID ke Upstash Redis
        await redis.set(`qris_status:${sessionId}`, JSON.stringify({ status: 'PAID', paid: true }));
      }
    }

    // Selalu kembalikan response 200 OK ke Mayar
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook Error:', error);
    // Kembalikan status 200/400 secara terkontrol
    return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
  }
}