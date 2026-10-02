// app/api/qris/status/[id]/route.ts
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET(
  request: Request,
  { params }: { params: { id?: string; sessionId?: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId') || params.id || params.sessionId;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, isPaid: false, message: 'Session ID tidak ditemukan' },
        { status: 400 }
      );
    }

    // 1. Ambil data transaksi dari Redis
    const rawTxn = await redis.get<string | object>(`txn:${sessionId}`);

    if (!rawTxn) {
      return NextResponse.json(
        { success: false, isPaid: false, status: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    let txnData = typeof rawTxn === 'string' ? JSON.parse(rawTxn) : rawTxn;

    // 2. Jika status lokal di Redis belum 'PAID', cek langsung ke server Mayar
    if (txnData?.status !== 'PAID') {
      const mayarPaymentId = txnData?.mayarPaymentId || txnData?.paymentId || txnData?.id;
      const mayarApiKey = process.env.MAYAR_API_KEY;

      if (mayarPaymentId && mayarApiKey) {
        try {
          const mayarRes = await fetch(
            `https://api.mayar.id/hl/v1/payment/${mayarPaymentId}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${mayarApiKey}`,
                'Content-Type': 'application/json',
              },
              cache: 'no-store',
            }
          );

          if (mayarRes.ok) {
            const mayarData = await mayarRes.json();
            const statusMayar = (mayarData?.data?.status || mayarData?.status || '').toUpperCase();

            // Jika status transaksi di server Mayar sudah terkonfirmasi LUNAS
            if (['SETTLED', 'PAID', 'SUCCESS'].includes(statusMayar)) {
              txnData.status = 'PAID';
              txnData.paidAt = new Date().toISOString();

              // Perbarui status transaksi di Redis
              const payloadToStore = typeof rawTxn === 'string' ? JSON.stringify(txnData) : txnData;
              await redis.set(`txn:${sessionId}`, payloadToStore);
            }
          }
        } catch (fetchError) {
          console.error('Gagal melakukan verifikasi langsung ke API Mayar:', fetchError);
        }
      }
    }

    const isPaid = txnData?.status === 'PAID';

    return NextResponse.json({
      success: true,
      isPaid,
      status: txnData?.status || 'PENDING',
    });
  } catch (error) {
    console.error('Error checking status in Redis/Mayar:', error);
    return NextResponse.json(
      { success: false, isPaid: false, error: 'Database read failed' },
      { status: 500 }
    );
  }
}