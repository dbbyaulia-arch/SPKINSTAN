// app/api/qris/consume/route.ts
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ success: false, message: 'Session ID diperlukan' }, { status: 400 });
    }

    // Ambil data transaksi dari Redis
    const rawData = await redis.get(`txn:${sessionId}`);
    if (!rawData) {
      return NextResponse.json({ success: false, message: 'Transaksi tidak ditemukan' }, { status: 404 });
    }

    const txnData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    // Ubah status menjadi USED agar lisensi hangus dan tidak bisa dipakai ulang
    txnData.status = 'USED';
    txnData.isPaid = false;
    txnData.usedAt = new Date().toISOString();

    await redis.set(`txn:${sessionId}`, JSON.stringify(txnData), { ex: 86400 });

    return NextResponse.json({ success: true, message: 'Lisensi berhasil digunakan (1x pakai)' });
  } catch (error) {
    console.error('Error consume payment:', error);
    return NextResponse.json({ success: false, message: 'Gagal memproses lisensi' }, { status: 500 });
  }
}