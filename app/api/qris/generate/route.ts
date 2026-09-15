import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, packageType } = body;

    const clientId = process.env.DOKU_CLIENT_ID;
    const secretKey = process.env.DOKU_SECRET_KEY;
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!clientId || !secretKey) {
      return NextResponse.json(
        { success: false, error: 'Kredensial DOKU belum dikonfigurasi di env' },
        { status: 500 }
      );
    }

    // Set nilai transaksi berdasarkan paket
    const amount = packageType === 'BUNDLING' ? 49999 : 19999;
    const targetPath = '/qris/v1/generate-code';
    const requestId = `REQ-${Date.now()}`;
    const requestTimestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

    const requestBody = {
      order: {
        invoice_number: sessionId,
        amount: amount,
      },
      payment: {
        payment_due_date: 15, // Berlaku 15 menit
      },
    };

    const jsonBody = JSON.stringify(requestBody);

    // Hitung Digest & HMAC Signature DOKU
    const digest = crypto.createHash('sha256').update(jsonBody).digest('base64');
    const signatureRaw =
      `Client-Id:${clientId}\n` +
      `Request-Id:${requestId}\n` +
      `Request-Timestamp:${requestTimestamp}\n` +
      `Request-Target:${targetPath}\n` +
      `Digest:${digest}`;

    const hmacSignature = crypto
      .createHmac('sha256', secretKey)
      .update(signatureRaw)
      .digest('base64');

    const signature = `HMACSHA256=${hmacSignature}`;

    // Panggil API DOKU (Ubah ke https://api.doku.com jika sudah Production)
    const dokuResponse = await fetch(`https://api.doku.com${targetPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': clientId,
        'Request-Id': requestId,
        'Request-Timestamp': requestTimestamp,
        Signature: signature,
      },
      body: jsonBody,
    });

    const dokuData = await dokuResponse.json();

    // Simpan status awal PENDING ke Upstash Redis
    if (redisUrl && redisToken) {
      await fetch(`${redisUrl}/set/${sessionId}/PENDING`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
    }

    const qrString =
      dokuData?.qris_data?.qr_code ||
      dokuData?.qr_string ||
      `SPKINSTAN_PAY_${sessionId}`;

    return NextResponse.json({
      success: true,
      qrString: qrString,
      dokuRaw: dokuData,
    });
  } catch (error) {
    console.error('Error QRIS Generate:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal membuat QRIS DOKU' },
      { status: 500 }
    );
  }
}