'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle } from 'lucide-react';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPaid = localStorage.getItem('spkinstan_paid_docs');
      let paidState = { SPK: true, NDA: true, BAST: true };

      if (savedPaid) {
        try {
          const parsed = JSON.parse(savedPaid);
          paidState = { ...parsed, SPK: true, NDA: true, BAST: true };
        } catch (e) {
          console.error(e);
        }
      }

      localStorage.setItem('spkinstan_paid_docs', JSON.stringify(paidState));
      localStorage.setItem('spkinstan_show_success_modal', 'true');

      setTimeout(() => {
        router.push('/?payment=success');
      }, 1000);
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans text-center">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900">Pembayaran Berhasil!</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Lisensi dokumen PRO Anda telah aktif. Memindahkan Anda kembali ke editor untuk mengunduh PDF Clean...
        </p>
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 pt-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Membuka Editor Dokumen...</span>
        </div>
      </div>
    </div>
  );
}