// app/payment-success/page.tsx
'use client';

import { useEffect } from 'react';

export default function PaymentSuccessPage() {
  useEffect(() => {
    // Kirim sinyal ke window utama (parent) bahwa pembayaran telah lunas
    if (typeof window !== 'undefined' && window.parent) {
      window.parent.postMessage({ type: 'MAYAR_PAYMENT_SUCCESS' }, '*');
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800 p-4 text-center font-sans">
      <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
      <h1 className="font-bold text-sm text-emerald-600">Pembayaran Berhasil!</h1>
      <p className="text-xs text-slate-500 mt-1">
        Memproses dokumen dan mengunduh PDF Clean otomatis...
      </p>
    </div>
  );
}