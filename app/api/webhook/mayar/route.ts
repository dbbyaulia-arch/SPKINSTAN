import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    let body: any;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 200 });
    }

    // 1. Verifikasi Webhook Signature (jika MAYAR_WEBHOOK_SECRET dikonfigurasi)
    const webhookSecret = process.env.MAYAR_WEBHOOK_SECRET;
    const signature = req.headers.get('x-mayar-signature') || req.headers.get('X-Mayar-Signature');

    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.warn('[MAYAR WEBHOOK] Signature verification failed');
      }
    }

    // 2. Tangani event testing dari Mayar
    if (body.event === 'testing' || body.type === 'testing') {
      return NextResponse.json(
        { success: true, message: 'Test webhook received successfully' },
        { status: 200 }
      );
    }

    const { event, data } = body;

    // 3. Tangani event pembayaran resmi dari Mayar
    const isSuccessEvent =
      event === 'payment.received' ||
      event === 'payment.success' ||
      event === 'payment.settled' ||
      data?.status === 'SUCCESS' ||
      data?.status === 'PAID' ||
      data?.status === 'SETTLED' ||
      data?.isPaid === true;

    if (data && isSuccessEvent) {
      let sessionId: string | null = null;
      const mayarPaymentId: string | null = data.id || data.paymentId || data.transactionId || null;

      // Extract sessionId dari deskripsi (Format: [Ref: SPK-XXXXXX])
      if (data.description) {
        const match = data.description.match(/\[Ref:\s*([^\]]+)\]/);
        if (match && match[1]) {
          sessionId = match[1].trim();
        }
      }

      // Fallback jika tidak ditemukan di deskripsi
      if (!sessionId) {
        sessionId =
          data.custom_field?.[0]?.value ||
          data.customField ||
          data.metadata?.sessionId ||
          data.customerMobile ||
          null;
      }

      // Dual-Keying Storage ke Upstash Redis (Simpan dengan prefix 'session:' dan raw key)
      if (sessionId) {
        await redis.set(`session:${sessionId}`, 'PAID', { ex: 86400 });
        await redis.set(sessionId, 'PAID', { ex: 86400 });
        console.log(`[MAYAR WEBHOOK] Status PAID saved for sessionId: ${sessionId}`);
      }

      if (mayarPaymentId) {
        await redis.set(`session:${mayarPaymentId}`, 'PAID', { ex: 86400 });
        await redis.set(mayarPaymentId, 'PAID', { ex: 86400 });
        console.log(`[MAYAR WEBHOOK] Status PAID saved for mayarPaymentId: ${mayarPaymentId}`);
      }

      // Simpan pemetaan relasi sessionId <-> mayarPaymentId
      if (sessionId && mayarPaymentId) {
        await redis.set(`mapping:${sessionId}`, mayarPaymentId, { ex: 86400 });
        await redis.set(`mapping:${mayarPaymentId}`, sessionId, { ex: 86400 });
      }
    }

    // Selalu kembalikan HTTP 200 OK ke Mayar agar tidak terus berulang (retry)
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[MAYAR WEBHOOK ERROR]:', error);
    return NextResponse.json({ success: false, message: 'Webhook processing error' }, { status: 200 });
  }
}