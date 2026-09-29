'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId') || searchParams.get('id');

  useEffect(() => {
    // 1. Kirim sinyal sukses ke Tab Utama via BroadcastChannel
    const channel = new BroadcastChannel('spkinstan_payment_channel');
    channel.postMessage({
      type: 'PAYMENT_SUCCESS',
      sessionId: sessionId,
    });

    // 2. Simpan ke localStorage sebagai cadangan (fallback)
    if (sessionId) {
      localStorage.setItem('spkinstan_last_paid_session', sessionId);
    }

    // 3. Tutup tab pembayaran ini secara otomatis setelah 1.5 detik
    const timer = setTimeout(() => {
      window.close();
    }, 1500);

    return () => {
      clearTimeout(timer);
      channel.close();
    };
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4 animate-bounce">
        <CheckCircle2 className="w-10 h-10" />
      </div>
      <h1 className="text-2xl font-extrabold mb-2">Pembayaran Berhasil!</h1>
      <p className="text-slate-400 text-sm max-w-sm mb-6">
        Struk transaksi telah terverifikasi. Tab ini akan menutup otomatis dan mengalihkan Anda kembali ke dokumen...
      </p>
      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
        <span>Menutup tab pembayaran...</span>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}