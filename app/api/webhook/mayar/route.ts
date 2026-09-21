import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Tangani event testing dari tombol "Test Webhook" Mayar
    if (body.event === 'testing' || body.type === 'testing') {
      return NextResponse.json(
        { success: true, message: 'Test webhook received successfully' },
        { status: 200 }
      );
    }

    const { event, data } = body;

    // 2. Tangani event pembayaran resmi dari Mayar
    if (data && (event === 'payment.received' || data.status === 'SUCCESS')) {
      let sessionId: string | null = null;

      // Extract sessionId dari deskripsi (Format: [Ref: SPK-XXXXXX])
      if (data.description) {
        const match = data.description.match(/\[Ref:\s*([^\]]+)\]/);
        if (match && match[1]) {
          sessionId = match[1].trim();
        }
      }

      // Fallback jika tidak ditemukan di deskripsi
      if (!sessionId) {
        sessionId = data.custom_field?.[0]?.value || data.customerMobile || data.id;
      }

      if (sessionId) {
        // Disamakan menggunakan key "session:SPK-XXXXXX" agar sesuai dengan /api/qris/status/[id]
        await redis.set(`session:${sessionId}`, 'PAID', { ex: 86400 }); // Expire dalam 24 jam
        console.log(`[MAYAR WEBHOOK] Success set status PAID for session: ${sessionId}`);
      }
    }

    // Selalu kembalikan HTTP 200 OK ke Mayar
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[MAYAR WEBHOOK ERROR]:', error);
    // Kembalikan 200 agar Mayar tidak terus mengulang retry jika terjadi error JSON parsing
    return NextResponse.json({ success: false, message: 'Webhook processing error' }, { status: 200 });
  }
}