'use client';

import clausesData from '@/config/clauses.json';
import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  MessageCircle,
  ArrowRight,
  Code2,
  Palette,
  Video,
  Briefcase,
  Edit3,
  FileText,
  Lock,
  CheckSquare,
  Info,
  User,
  Building2,
  RotateCcw,
  Shield,
  Unlock,
  MessageSquarePlus,
  X,
  CheckCircle,
  Download,
  Send,
  Star,
  Sparkles,
  Plus,
  Trash2,
  Loader2,
  ExternalLink,
  Check
} from 'lucide-react';

declare global {
  interface Window {
    fbq?: (event: string, action: string, data?: object) => void;
  }
}

interface Review {
  id: string;
  name: string;
  text: string;
  stars: number;
}

export default function Home() {
  const [activeDocTab, setActiveDocTab] = useState<'SPK' | 'NDA' | 'BAST'>('SPK');
  const [selectedPackage, setSelectedPackage] = useState<'SINGLE' | 'BUNDLING'>('SINGLE');
  const [currentWizardStep, setCurrentWizardStep] = useState(1);

  // Per-document Payment License state
  const [paidDocs, setPaidDocs] = useState<{ SPK: boolean; NDA: boolean; BAST: boolean }>({
    SPK: false,
    NDA: false,
    BAST: false,
  });
  const [paidDocTarget, setPaidDocTarget] = useState<'SPK' | 'NDA' | 'BAST'>('SPK');
  const [shouldAutoDownload, setShouldAutoDownload] = useState(false);
  const [autoDownloadStatus, setAutoDownloadStatus] = useState<string>('');

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalStep, setModalStep] = useState<'download_choice' | 'qris'>('download_choice');
  const [mobileViewMode, setMobileViewMode] = useState<'form' | 'preview'>('form');
  const [isExporting, setIsExporting] = useState(false);

  const [sessionId, setSessionId] = useState('');
  const [mayarPaymentId, setMayarPaymentId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(899);

  // Mayar API, QRIS & Polling States
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [isLoadingQris, setIsLoadingQris] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [useIframePayment, setUseIframePayment] = useState(true);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Form State
  const [freelancerName, setFreelancerName] = useState('');
  const [freelancerEmail, setFreelancerEmail] = useState('');
  const [freelancerWa, setFreelancerWa] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientWa, setClientWa] = useState('');

  // SPK Fields
  const [projectTitle, setProjectTitle] = useState('');
  const [projectAmount, setProjectAmount] = useState('');
  const [dpPercent, setDpPercent] = useState('');
  const [bankInfo, setBankInfo] = useState('');

  // NDA Fields
  const [ndaScope, setNdaScope] = useState('');
  const [ndaYears, setNdaYears] = useState('');
  const [ndaPenalty, setNdaPenalty] = useState('');

  // BAST Fields
  const [bastRef, setBastRef] = useState('');
  const [bastWarranty, setBastWarranty] = useState('');
  const [bastDate, setBastDate] = useState('');

  // Clause Checkboxes
  const [clauseRevision, setClauseRevision] = useState(true);
  const [clauseSla, setClauseSla] = useState(true);
  const [clauseRetention, setClauseRetention] = useState(true);
  const [clauseDp, setClauseDp] = useState(true);

  // Custom Dynamic Clauses Array
  const [customClauses, setCustomClauses] = useState<string[]>(['']);

  // Signature Pad Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Testimonials
  const [reviews, setReviews] = useState<Review[]>([]);

  const generateNewSessionId = () => {
    return 'SPK-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  useEffect(() => {
    setSessionId(generateNewSessionId());
  }, []);

  // Proteksi Anti-Inspect & Shortcut jika belum lunas
  useEffect(() => {
    const isPaid = paidDocs[activeDocTab];
    if (isPaid) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        alert('Proteksi Keamanan: Fitur inspect, cetak langsung, dan simpan draf dibatasi. Silakan lakukan pembayaran untuk mendapatkan PDF HD Clean tanpa watermark.');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [paidDocs, activeDocTab]);

  useEffect(() => {
    if (showCheckoutModal && modalStep === 'qris' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [showCheckoutModal, modalStep, timeLeft]);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => {
    if (!showCheckoutModal) {
      stopPolling();
    }
  }, [showCheckoutModal]);

  // Eksekusi Kelunasan & Pencabutan Watermark
  const handlePaymentSuccess = () => {
    stopPolling();

    // 1. Set status dokumen ke LUNAS
    if (selectedPackage === 'BUNDLING') {
      setPaidDocs({ SPK: true, NDA: true, BAST: true });
    } else {
      setPaidDocs((prev) => ({ ...prev, [paidDocTarget]: true }));
    }

    // 2. Alihkan UI
    setMobileViewMode('preview');
    setShowCheckoutModal(false);
    setShowSuccessModal(true);
    setShouldAutoDownload(true);
    setAutoDownloadStatus('Memproses pencabutan watermark & menyiapkan PDF...');

    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'Purchase', {
        value: selectedPackage === 'SINGLE' ? 1000 : 49999,
        currency: 'IDR',
      });
    }
  };

  // Trigger Unduh Otomatis Setelah DOM Rerender Tanpa Watermark
  useEffect(() => {
    if (shouldAutoDownload) {
      setShouldAutoDownload(false);
      const timer = setTimeout(async () => {
        try {
          setAutoDownloadStatus('Mengunduh file PDF Clean otomatis...');
          if (selectedPackage === 'BUNDLING') {
            await captureDocumentToPdf('SPK');
          } else {
            await captureDocumentToPdf(paidDocTarget);
          }
          setAutoDownloadStatus('Unduhan selesai!');
        } catch (autoErr) {
          console.warn('Browser memblokir auto download:', autoErr);
          setAutoDownloadStatus('Silakan klik tombol unduh hijau di bawah ini.');
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoDownload, paidDocs, selectedPackage, paidDocTarget]);

  // Verifikasi Pembayaran Ketat Tanpa Bypass (Membaca Server Redis)
  const handleManualCheckPayment = async () => {
    if (!sessionId || isVerifyingPayment) return;
    setIsVerifyingPayment(true);

    try {
      const res = await fetch(`/api/qris/status/${sessionId}?sessionId=${sessionId}`);

      if (res.ok) {
        const data = await res.json();

        // Wajib tervalidasi LUNAS dari server Redis
        if (data.isPaid === true && data.status === 'PAID') {
          handlePaymentSuccess();
          return;
        }
      }

      alert('Pembayaran belum terdeteksi di server. Silakan selesaikan proses transfer/scan QRIS terlebih dahulu.');
    } catch (err) {
      console.error('Verifikasi pembayaran gagal:', err);
      alert('Gagal terhubung ke server verifikasi. Silakan periksa koneksi internet Anda.');
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  // Polling Real-time Ketat ke Server Redis
  const startPollingStatus = (currentSession: string, mayarId?: string) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/qris/status/${currentSession}?sessionId=${currentSession}`);

        if (!res.ok) return;

        const data = await res.json();
        // Wajib strict PAID dari Redis
        if (data.isPaid === true && data.status === 'PAID') {
          handlePaymentSuccess();
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);
  };

  // PostMessage Event Listener dari Mayar (Validasi Spesifik Event)
  useEffect(() => {
    const handleMayarMessage = (event: MessageEvent) => {
      if (!event.data) return;

      let payload = event.data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch (e) {
          return;
        }
      }

      // Hanya izinkan jika event tipe khusus payment_success dikirim
      if (
        payload?.type === 'mayar_payment_success' ||
        (payload?.event === 'payment.received' && payload?.status === 'PAID')
      ) {
        handlePaymentSuccess();
      }
    };

    window.addEventListener('message', handleMayarMessage);
    return () => window.removeEventListener('message', handleMayarMessage);
  }, [paidDocTarget, selectedPackage, mayarPaymentId, sessionId]);

  // Dynamic Custom Clauses Handlers
  const handleAddCustomClause = () => {
    setCustomClauses((prev) => [...prev, '']);
  };

  const handleCustomClauseChange = (index: number, value: string) => {
    const updated = [...customClauses];
    updated[index] = value;
    setCustomClauses(updated);
  };

  const handleRemoveCustomClause = (index: number) => {
    setCustomClauses((prev) => prev.filter((_, i) => i !== index));
  };

  // Request Pembayaran Mayar
  const handleRequestQris = async () => {
    if (isLoadingQris) return;

    setIsLoadingQris(true);
    setModalStep('qris');
    setPaidDocTarget(activeDocTab);
    setQrCodeData(null);
    setPaymentUrl(null);

    const currentSession = generateNewSessionId();
    setSessionId(currentSession);
    setTimeLeft(899);

    const amount = selectedPackage === 'SINGLE' ? 1000 : 49999;

    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        value: amount,
        currency: 'IDR',
      });
    }

    const targetName = clientName || freelancerName || 'Klien SPKInstan';
    const cleanName = targetName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const targetEmail =
      freelancerEmail.trim() ||
      (cleanName ? `${cleanName}@spkinstan.com` : `client-${Date.now()}@spkinstan.com`);

    try {
      const res = await fetch('/api/qris/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSession,
          packageType: selectedPackage,
          amount,
          docType: activeDocTab,
          customerName: targetName,
          customerMobile: clientWa || freelancerWa || '081234567890',
          customerEmail: targetEmail,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const realMayarId = data.mayarPaymentId || data.paymentId || data.id || data.data?.id || currentSession;
        setMayarPaymentId(realMayarId);

        if (data.paymentUrl) {
          setPaymentUrl(data.paymentUrl);
        }
        if (data.qrString) {
          setQrCodeData(data.qrString);
        }

        startPollingStatus(currentSession, realMayarId);
      } else {
        console.error('Mayar Payment Generation Error:', data.message || 'Gagal membuat pembayaran Mayar');
      }
    } catch (err) {
      console.error('Network error during Mayar payment generation:', err);
    } finally {
      setIsLoadingQris(false);
    }
  };

  const formatRupiah = (val: string) => (val ? parseInt(val, 10).toLocaleString('id-ID') : '0');
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getTodayFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('id-ID', options);
  };

  // Canvas Drawing Handlers
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDraw = () => {
    if (isDrawing && canvasRef.current) {
      setSignatureDataUrl(canvasRef.current.toDataURL());
    }
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl(null);
  };

  // Generator PDF Berbasis Blob Stream & Force Clean DOM
  const captureDocumentToPdf = async (docType: 'SPK' | 'NDA' | 'BAST') => {
    setActiveDocTab(docType);
    setMobileViewMode('preview');

    await new Promise((resolve) => setTimeout(resolve, 400));

    const element = document.getElementById('a4-document-preview');
    if (!element) {
      console.error('Elemen #a4-document-preview tidak ditemukan');
      return;
    }

    try {
      const html2canvasPro = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      // Sembunyikan elemen watermark secara eksplisit sebelum capturing jika dokumen sudah lunas
      const isPaidDoc = paidDocs[docType] || paidDocs[activeDocTab];
      const watermarkElement = element.querySelector('.watermark-layer') as HTMLElement;
      if (isPaidDoc && watermarkElement) {
        watermarkElement.style.display = 'none';
      }

      const canvas = await html2canvasPro(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowWidth: 1200,
      });

      // Kembalikan tampilan watermark jika belum lunas
      if (watermarkElement && !isPaidDoc) {
        watermarkElement.style.display = 'flex';
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const fileSuffix = isPaidDoc ? 'CLEAN' : 'WATERMARKED_DRAFT';

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

      // Unduh menggunakan Blob Object URL untuk menembus Pop-up Blocker
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = blobUrl;
      downloadAnchor.download = `SPKInstan_${docType}_${(freelancerName || 'Freelancer').replace(/\s+/g, '_')}_${fileSuffix}.pdf`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Gagal mengekspor PDF secara otomatis. Silakan klik tombol hijau "Unduh PDF Clean" di bawah.');
    }
  };

  // PDF Export Handler
  const handleDownloadPDF = async (specificDoc?: 'SPK' | 'NDA' | 'BAST') => {
    try {
      setIsExporting(true);

      if (specificDoc) {
        await captureDocumentToPdf(specificDoc);
      } else if (selectedPackage === 'BUNDLING') {
        await captureDocumentToPdf('SPK');
        await new Promise((r) => setTimeout(r, 600));
        await captureDocumentToPdf('NDA');
        await new Promise((r) => setTimeout(r, 600));
        await captureDocumentToPdf('BAST');
      } else {
        await captureDocumentToPdf(activeDocTab);
      }
    } catch (err) {
      console.error('Gagal membuat PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFreeDownload = () => {
    setShowCheckoutModal(false);
    handleDownloadPDF();
  };

  const handleFinishForm = () => {
    setMobileViewMode('preview');
    if (!paidDocs[activeDocTab]) {
      setModalStep('download_choice');
      setShowCheckoutModal(true);
    } else {
      setShowSuccessModal(true);
    }
  };

  const handleShareWhatsApp = (specificDoc?: 'SPK' | 'NDA' | 'BAST') => {
    const targetDoc = specificDoc || activeDocTab;
    let text = '';

    if (selectedPackage === 'BUNDLING' && !specificDoc) {
      text = `Halo ${clientName || 'Klien'},\n\nBerikut dikirimkan draf resmi *Paket Perjanjian Kerja Sama (SPK, NDA, & BAST)* untuk proyek "${projectTitle || 'Pekerjaan Jasa'}" yang telah diterbitkan secara legal.\n\n*Penyedia Jasa:* ${freelancerName || 'Debby Aulia'}\n*Status Dokumen:* Sah (Terverifikasi Pelunasan PRO)\n\nMohon diperiksa dan ditandatangani kembali. Terima kasih!`;
    } else {
      text = `Halo ${clientName || 'Klien'},\n\nBerikut dikirimkan draf resmi *${targetDoc} Perjanjian Kerja Sama* untuk proyek "${projectTitle || 'Pekerjaan Jasa'}" yang telah diterbitkan secara legal.\n\n*Penyedia Jasa:* ${freelancerName || 'Debby Aulia'}\n*Status Dokumen:* Sah (Terverifikasi Pelunasan)\n\nMohon diperiksa dan ditandatangani kembali. Terima kasih!`;
    }

    window.open(`https://wa.me/${clientWa}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const wizardTitles = [
    'Identitas Para Pihak',
    'Detail Spesifik Dokumen',
    'Klausul Proteksi Hukum',
    'Legalisasi & Tanda Tangan'
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans antialiased selection:bg-blue-100 selection:text-blue-700 pb-20 md:pb-0">
      
      {/* CSS Anti-Print untuk Draf Belum Lunas */}
      {!paidDocs[activeDocTab] && (
        <style>{`
          @media print {
            body { display: none !important; }
          }
        `}</style>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-extrabold shadow-md shadow-blue-500/25 ring-2 ring-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">
                SPK<span className="text-blue-600">Instan</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
                LegalTech Platform
              </span>
            </div>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              Bebas Database & Login
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://wa.me/6281234567890?text=Halo%20Admin%20SPKInstan,%20saya%20butuh%20bantuan"
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              Bantuan CS WA
            </a>
            <a
              href="#editor"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-full transition-all shadow-sm hover:shadow-md flex items-center gap-1.5"
            >
              <span>Buat Dokumen</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        
        {/* Hero Section */}
        <section className="relative pt-8 pb-10 sm:pt-12 sm:pb-14 overflow-hidden bg-gradient-to-b from-white via-slate-50/50 to-slate-100/70 border-b border-slate-200/60">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-100/50 rounded-full filter blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-100/40 rounded-full filter blur-3xl pointer-events-none"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.2] sm:leading-[1.15]">
                Generator Perjanjian Kerja Sama{' '}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Digital Resmi
                </span>
              </h1>

              <p className="text-slate-500 text-xs sm:text-sm md:text-base font-medium leading-relaxed max-w-xl mx-auto">
                Hasilkan SPK, NDA, & BAST sah dalam 2 menit. Bebas ghosting klien, kepastian pembayaran, dan revisi terstruktur langsung dari HP.
              </p>

              {/* Package Selector Pills */}
              <div className="pt-2 flex items-center justify-center">
                <div className="flex flex-col sm:flex-row p-1.5 bg-slate-200/70 rounded-2xl sm:rounded-full w-full sm:w-auto shadow-inner border border-slate-300/40 gap-1.5 sm:gap-0">
                  <button
                    onClick={() => setSelectedPackage('SINGLE')}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl sm:rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 text-center ${
                      selectedPackage === 'SINGLE'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Dokumen Satuan — Rp 1.000
                  </button>
                  <button
                    onClick={() => setSelectedPackage('BUNDLING')}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl sm:rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                      selectedPackage === 'BUNDLING'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Paket Bundling Proteksi (3-in-1) — Rp 49.999</span>
                    <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider whitespace-nowrap">
                      Hemat 60%
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 pt-6 border-t border-slate-200/60 flex flex-wrap items-center justify-center gap-6 sm:gap-8 opacity-90 text-xs font-semibold text-slate-600">
              <span className="text-slate-500 font-medium w-full text-center sm:w-auto">
                Solusi Perlindungan Hukum Legalitas Khusus Pekerja Lepas & Kreatif:
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <Code2 className="w-4 h-4 text-blue-600" /> Software Devs
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <Palette className="w-4 h-4 text-indigo-600" /> UI/UX Designers
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <Video className="w-4 h-4 text-purple-600" /> Video Editors
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <Briefcase className="w-4 h-4 text-emerald-600" /> Agensi Mikro
              </span>
            </div>
          </div>
        </section>

        {/* Editor Workspace Section */}
        <section id="editor" className="py-8 sm:py-10 bg-slate-100/70 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Mobile Tab Toggle Switch */}
            <div className="lg:hidden flex bg-white rounded-2xl border border-slate-200 p-1 mb-6 shadow-sm text-xs font-bold">
              <button
                type="button"
                onClick={() => setMobileViewMode('form')}
                className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  mobileViewMode === 'form' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" /> 1. Isi Data Form
              </button>
              <button
                type="button"
                onClick={() => setMobileViewMode('preview')}
                className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  mobileViewMode === 'preview' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> 2. Preview Draf A4
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT COLUMN: Dynamic Form Wizard */}
              <div
                className={`lg:col-span-5 bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 space-y-6 ${
                  mobileViewMode === 'preview' ? 'hidden lg:block' : 'block'
                }`}
              >
                {/* Document Tab Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    1. Jenis Dokumen Hukum
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/70">
                    <button
                      type="button"
                      onClick={() => setActiveDocTab('SPK')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        activeDocTab === 'SPK' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" /> SPK
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDocTab('NDA')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        activeDocTab === 'NDA' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" /> NDA
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDocTab('BAST')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        activeDocTab === 'BAST' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <CheckSquare className="w-3.5 h-3.5" /> BAST
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                    <Info className={`w-3.5 h-3.5 ${activeDocTab === 'SPK' ? 'text-blue-600' : activeDocTab === 'NDA' ? 'text-indigo-600' : 'text-purple-600'}`} />
                    <span>
                      Membuat Dokumen:{' '}
                      <strong>
                        {activeDocTab === 'SPK' && 'Surat Perjanjian Kerja Sama (SPK Proyek)'}
                        {activeDocTab === 'NDA' && 'Non-Disclosure Agreement (NDA Kerahasiaan)'}
                        {activeDocTab === 'BAST' && 'Berita Acara Serah Terima (BAST Final)'}
                      </strong>
                    </span>
                  </p>
                </div>

                {/* Step Wizard Navigation Dots */}
                <div className="flex items-center justify-between border-y border-slate-100 py-3">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                      {currentWizardStep}
                    </span>
                    <span>{wizardTitles[currentWizardStep - 1]}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => setCurrentWizardStep(step)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          currentWizardStep === step ? 'bg-blue-600' : 'bg-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Form Steps */}
                <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                  {/* STEP 1 */}
                  {currentWizardStep === 1 && (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                          <User className="w-3.5 h-3.5" /> Pihak Pertama (Penyedia Jasa)
                        </h4>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nama Lengkap Freelancer
                          </label>
                          <input
                            type="text"
                            value={freelancerName}
                            onChange={(e) => setFreelancerName(e.target.value)}
                            placeholder="cth: Debby Aulia"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Email Freelancer (Untuk Struk / Kuitansi Payment)
                          </label>
                          <input
                            type="email"
                            value={freelancerEmail}
                            onChange={(e) => setFreelancerEmail(e.target.value)}
                            placeholder="cth: debby@gmail.com"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nomor WhatsApp Freelancer
                          </label>
                          <input
                            type="text"
                            value={freelancerWa}
                            onChange={(e) => setFreelancerWa(e.target.value)}
                            placeholder="cth: 081234567890"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                          />
                        </div>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" /> Pihak Kedua (Pemberi Kerja)
                        </h4>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nama Klien / Perusahaan
                          </label>
                          <input
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="cth: PT Digital Inovasi Nusantara"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nomor WhatsApp Klien
                          </label>
                          <input
                            type="text"
                            value={clientWa}
                            onChange={(e) => setClientWa(e.target.value)}
                            placeholder="cth: 089876543210"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2 */}
                  {currentWizardStep === 2 && (
                    <div className="space-y-4">
                      {activeDocTab === 'SPK' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Judul Pekerjaan / Proyek
                            </label>
                            <input
                              type="text"
                              value={projectTitle}
                              onChange={(e) => setProjectTitle(e.target.value)}
                              placeholder="cth: Pengembangan Aplikasi Web Dashboard & API Integration"
                              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Nilai Imbalan (Rp)
                              </label>
                              <input
                                type="number"
                                value={projectAmount}
                                onChange={(e) => setProjectAmount(e.target.value)}
                                placeholder="cth: 7500000"
                                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Uang Muka DP (%)
                              </label>
                              <input
                                type="number"
                                value={dpPercent}
                                onChange={(e) => setDpPercent(e.target.value)}
                                placeholder="cth: 50"
                                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Rekening Tujuan Pelunasan
                            </label>
                            <input
                              type="text"
                              value={bankInfo}
                              onChange={(e) => setBankInfo(e.target.value)}
                              placeholder="cth: BCA 1234567890 a.n Debby Aulia"
                              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                            />
                          </div>
                        </div>
                      )}

                      {activeDocTab === 'NDA' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Cakupan Informasi Rahasia
                            </label>
                            <input
                              type="text"
                              value={ndaScope}
                              onChange={(e) => setNdaScope(e.target.value)}
                              placeholder="cth: Source Code, Skema Database, Aset Desain Figma, & Strategi Bisnis"
                              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Masa Kerahasiaan (Tahun)
                              </label>
                              <input
                                type="number"
                                value={ndaYears}
                                onChange={(e) => setNdaYears(e.target.value)}
                                placeholder="cth: 2"
                                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Denda Pelanggaran (Rp)
                              </label>
                              <input
                                type="number"
                                value={ndaPenalty}
                                onChange={(e) => setNdaPenalty(e.target.value)}
                                placeholder="cth: 25000000"
                                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {activeDocTab === 'BAST' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Nomor Referensi SPK Utama
                            </label>
                            <input
                              type="text"
                              value={bastRef}
                              onChange={(e) => setBastRef(e.target.value)}
                              placeholder="cth: SPK/2026/DEV/009"
                              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Masa Garansi Bug (Hari)
                              </label>
                              <input
                                type="number"
                                value={bastWarranty}
                                onChange={(e) => setBastWarranty(e.target.value)}
                                placeholder="cth: 14"
                                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Tanggal Serah Terima
                              </label>
                              <input
                                type="date"
                                value={bastDate}
                                onChange={(e) => setBastDate(e.target.value)}
                                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 3 */}
                  {currentWizardStep === 3 && (
                    <div className="space-y-3">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Pilih Klausul Proteksi Hukum Perdata
                      </label>

                      <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-all">
                        <input
                          type="checkbox"
                          checked={clauseRevision}
                          onChange={(e) => setClauseRevision(e.target.checked)}
                          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-slate-900 block">Pembatasan Scope & Revisi (Maks 2x)</span>
                          <span className="text-slate-500">Permintaan di luar acuan dianggap addendum biaya baru.</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-all">
                        <input
                          type="checkbox"
                          checked={clauseSla}
                          onChange={(e) => setClauseSla(e.target.checked)}
                          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-slate-900 block">SLA Evaluasi Feedback Klien (5 Hari)</span>
                          <span className="text-slate-500">Jika 5 hari tidak ada feedback, dianggap auto-approved.</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-all">
                        <input
                          type="checkbox"
                          checked={clauseRetention}
                          onChange={(e) => setClauseRetention(e.target.checked)}
                          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-slate-900 block">Retensi Hak Master File Pasca-Pelunasan</span>
                          <span className="text-slate-500">File Figma/Source Code dikirim hanya setelah lunas 100%.</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-all">
                        <input
                          type="checkbox"
                          checked={clauseDp}
                          onChange={(e) => setClauseDp(e.target.checked)}
                          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-slate-900 block">DP Non-Refundable (Pasal 1464 KUHPerdata)</span>
                          <span className="text-slate-500">Uang muka hangus jika pembatalan terjadi sepihak dari Klien.</span>
                        </div>
                      </label>

                      {/* Dynamic Multiple Custom Clauses Section */}
                      <div className="pt-3 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-700">
                            + Tambah Klausul Khusus Mandiri
                          </label>
                          <button
                            type="button"
                            onClick={handleAddCustomClause}
                            className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambah Klausul
                          </button>
                        </div>

                        {customClauses.map((clause, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <textarea
                              rows={2}
                              value={clause}
                              onChange={(e) => handleCustomClauseChange(idx, e.target.value)}
                              placeholder={`cth: Klien wajib memberikan materi konten maksimal H+3 sejak SPK ditandatangani.`}
                              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                            />
                            {customClauses.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomClause(idx)}
                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-all"
                                title="Hapus Klausul Ini"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STEP 4 */}
                  {currentWizardStep === 4 && (
                    <div className="space-y-4">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Digital Signature (Opsional)
                      </label>
                      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-3 text-center space-y-2">
                        <canvas
                          ref={canvasRef}
                          width={300}
                          height={120}
                          onMouseDown={startDraw}
                          onMouseMove={draw}
                          onMouseUp={stopDraw}
                          onTouchStart={startDraw}
                          onTouchMove={draw}
                          onTouchEnd={stopDraw}
                          className="w-full h-28 bg-white rounded-xl border border-slate-200 cursor-crosshair touch-none mx-auto"
                        />
                        <div className="flex items-center justify-between text-xs">
                          <button
                            type="button"
                            onClick={clearSignature}
                            className="text-slate-500 hover:text-red-600 flex items-center gap-1 font-semibold"
                          >
                            <RotateCcw className="w-3 h-3" /> Hapus Coretan
                          </button>
                          <button
                            type="button"
                            onClick={clearSignature}
                            className="text-blue-600 hover:text-blue-800 font-semibold"
                          >
                            Gunakan Kolom Titik-Titik Manual
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 italic">
                        *Tanda tangan dapat digambar dengan jari di layar HP atau dilewati untuk dicetak fisik.
                      </p>
                    </div>
                  )}

                  {/* Wizard Controls Navigation */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={currentWizardStep === 1}
                      onClick={() => setCurrentWizardStep((p) => p - 1)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-40"
                    >
                      Kembali
                    </button>
                    {currentWizardStep < 4 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentWizardStep((p) => p + 1)}
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm"
                      >
                        Lanjut
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleFinishForm}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <Download className="w-4 h-4" />
                        <span>Selesai & Unduh Dokumen</span>
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* RIGHT COLUMN: Realtime Formal A4 Document Preview */}
              <div
                className={`lg:col-span-7 space-y-4 ${
                  mobileViewMode === 'form' ? 'hidden lg:block' : 'block'
                }`}
              >
                {/* Security Status Bar */}
                <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Draf Legal A4 (Georgia / Times New Roman)
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    <Shield className="w-3 h-3 text-blue-600" />
                    Proteksi Anti-Inspect Active
                  </span>
                </div>

                {/* Printable A4 Paper Container */}
                <div className="relative bg-slate-300/40 p-2 sm:p-6 rounded-3xl overflow-hidden border border-slate-200">
                  <div
                    id="a4-document-preview"
                    onContextMenu={(e) => e.preventDefault()}
                    className={`w-full min-h-[780px] bg-white text-slate-950 font-serif p-4 sm:p-10 relative overflow-x-auto shadow-xl rounded-xl ${
                      !paidDocs[activeDocTab] ? 'select-none' : ''
                    }`}
                  >
                    {/* Watermark Overlay Layer */}
                    {!paidDocs[activeDocTab] && (
                      <div className="watermark-layer absolute inset-0 pointer-events-none z-20 overflow-hidden flex flex-col justify-between p-6">
                        {/* Diagonal Repeating Watermark Grid */}
                        <div className="absolute inset-0 flex items-center justify-center rotate-[-30deg] scale-125 opacity-25">
                          <div className="grid grid-cols-2 gap-12 text-center font-extrabold uppercase font-sans tracking-widest text-slate-900 select-none">
                            <span className="text-4xl sm:text-6xl border-4 border-slate-900 p-2 rounded-xl">SPKINSTAN DRAFT</span>
                            <span className="text-4xl sm:text-6xl border-4 border-slate-900 p-2 rounded-xl">SPKINSTAN DRAFT</span>
                            <span className="text-4xl sm:text-6xl border-4 border-slate-900 p-2 rounded-xl">SPKINSTAN DRAFT</span>
                            <span className="text-4xl sm:text-6xl border-4 border-slate-900 p-2 rounded-xl">SPKINSTAN DRAFT</span>
                          </div>
                        </div>

                        {/* Top Watermark Banner */}
                        <div className="w-full bg-slate-900/10 border border-slate-900/20 text-slate-900 text-center py-1 rounded-lg text-[10px] font-black uppercase tracking-widest font-sans">
                          --- DRAF GRATIS TERPROTEKSI WATERMARK SPKINSTAN - TIDAK SAH UNTUK TRANSAKSI TANPA PELUNASAN ---
                        </div>

                        {/* Bottom Right Stamp */}
                        <div className="self-end bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider font-sans opacity-85 shadow-md">
                          Dibuat via SPKInstan (Versi Draf Gratis)
                        </div>
                      </div>
                    )}

                    {/* Legal Contract Content */}
                    <div className="relative z-0 space-y-5 text-[11px] sm:text-[13px] leading-relaxed break-words">
                      {/* Document Header */}
                      <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900 font-sans">
                        <h2 className="text-sm sm:text-lg font-bold tracking-tight uppercase">
                          {activeDocTab === 'SPK' && 'SURAT PERJANJIAN KERJA SAMA PEKERJAAN JASA'}
                          {activeDocTab === 'NDA' && 'PERJANJIAN KERAHASIAAN INFORMASI (NON-DISCLOSURE AGREEMENT)'}
                          {activeDocTab === 'BAST' && 'BERITA ACARA SERAH TERIMA PEKERJAAN (BAST)'}
                        </h2>
                        <p className="text-[10px] sm:text-[11px] text-slate-600">
                          Nomor Registrasi Perikatan: SPK/2026/09/{sessionId ? sessionId.split('-')[1] : '000000'}
                        </p>
                      </div>

                      {/* Paragraph Komparisi */}
                      <p className="text-justify">
                        Pada hari ini, <strong>{getTodayFormattedDate()}</strong>, telah disepakati perjanjian kerja sama hukum perdata antara pihak-pihak di bawah ini:
                      </p>

                      {/* Identitas Table */}
                      <div className="space-y-2 pl-2">
                        <div className="grid grid-cols-12 gap-1">
                          <span className="col-span-1 font-bold">1.</span>
                          <div className="col-span-11">
                            <strong>PIHAK PERTAMA (Penyedia Jasa):</strong> {freelancerName || 'Debby Aulia'} (No. WA: {freelancerWa || '081234567890'}).
                          </div>
                        </div>
                        <div className="grid grid-cols-12 gap-1">
                          <span className="col-span-1 font-bold">2.</span>
                          <div className="col-span-11">
                            <strong>PIHAK KEDUA (Pemberi Kerja):</strong> {clientName || 'PT Digital Inovasi Nusantara'} (No. WA: {clientWa || '089876543210'}).
                          </div>
                        </div>
                      </div>

                      <p className="text-justify">
                        Kedua belah pihak secara sadar mengikatkan diri dalam ketentuan pasal-pasal sebagai berikut:
                      </p>

                      {/* Dynamic Clauses Render */}
                      <div className="space-y-4">
                        {activeDocTab === 'SPK' && (
                          <>
                            <div className="space-y-1">
                              <strong>PASAL 1: LINGKUP PEKERJAAN & ADDENDUM</strong>
                              <p className="text-justify">
                                PIHAK PERTAMA sepakat melaksanakan pekerjaan <strong>"{projectTitle || 'Pengembangan Aplikasi Web Dashboard & API Integration'}"</strong> untuk PIHAK KEDUA sesuai spesifikasi teknis yang disetujui.
                              </p>
                            </div>
                            <div className="space-y-1">
                              <strong>PASAL 2: NILAI PEKERJAAN & HAK RETENSI</strong>
                              <p className="text-justify">
                                Total nilai imbalan sebesar <strong>Rp {formatRupiah(projectAmount || '7500000')}</strong> dengan Uang Muka (DP) sebesar <strong>{dpPercent || '50'}%</strong>. Pelunasan dikirimkan ke rekening <strong>{bankInfo || 'BCA 1234567890 a.n Debby Aulia'}</strong>.
                              </p>
                            </div>

                            {(clauseRevision || clauseSla || clauseRetention || clauseDp || customClauses.some((c) => c.trim() !== '')) && (
                              <div className="space-y-1">
                                <strong>PASAL 3: KLAUSUL KHUSUS PROTEKSI HUKUM PERDATA</strong>
                                <ol className="list-decimal pl-4 space-y-1 mt-1">
                                  {clauseRevision && (
                                    <li>Pekerjaan mencakup maksimal 2 (dua) kali revisi. Permintaan perubahan di luar acuan dinilai sebagai Addendum biaya baru.</li>
                                  )}
                                  {clauseSla && (
                                    <li>PIHAK KEDUA wajib memberikan masukan dalam 5 (lima) hari kerja. Apabila melebihi batas waktu, pekerjaan dianggap disetujui penuh (auto-approved).</li>
                                  )}
                                  {clauseRetention && (
                                    <li>Seluruh hak guna aset master file (Figma/Source Code) diserahkan secara sah hanya setelah pelunasan 100% diterima.</li>
                                  )}
                                  {clauseDp && (
                                    <li>Uang Muka (DP) bersifat tidak dapat ditarik kembali (non-refundable) sesuai Pasal 1464 KUHPerdata jika pembatalan terjadi sepihak oleh PIHAK KEDUA.</li>
                                  )}
                                  {customClauses.map((c, i) =>
                                    c.trim() !== '' ? <li key={i}>{c}</li> : null
                                  )}
                                </ol>
                              </div>
                            )}
                          </>
                        )}

                        {activeDocTab === 'NDA' && (
                          <>
                            <div className="space-y-1">
                              <strong>PASAL 1: CAKUPAN INFORMASI RAHASIA</strong>
                              <p className="text-justify">
                                Informasi Rahasia mencakup <strong>"{ndaScope || 'Source Code, Skema Database, Aset Desain Figma, & Strategi Bisnis'}"</strong> yang diserahterimakan selama masa kerja sama.
                              </p>
                            </div>
                            <div className="space-y-1">
                              <strong>PASAL 2: JANGKA WAKTU & DENDA PELANGGARAN</strong>
                              <p className="text-justify">
                                Kerahasiaan berlaku selama <strong>{ndaYears || '2'} tahun</strong>. Pelanggaran atas kerahasiaan dikenakan denda kewajiban ganti rugi sebesar <strong>Rp {formatRupiah(ndaPenalty || '25000000')}</strong> sesuai Pasal 1365 KUHPerdata.
                              </p>
                            </div>
                          </>
                        )}

                        {activeDocTab === 'BAST' && (
                          <>
                            <div className="space-y-1">
                              <strong>PASAL 1: SERAH TERIMA PEKERJAAN FINAL</strong>
                              <p className="text-justify">
                                PIHAK PERTAMA menyerahkan hasil pekerjaan akhir berdasarkan SPK Referensi <strong>"{bastRef || 'SPK/2026/DEV/009'}"</strong> kepada PIHAK KEDUA pada tanggal <strong>{bastDate || '2026-09-15'}</strong>.
                              </p>
                            </div>
                            <div className="space-y-1">
                              <strong>PASAL 2: MASA GARANSI & PELEPASAN TUNTUTAN</strong>
                              <p className="text-justify">
                                PIHAK KEDUA menerima pekerjaan dalam kondisi baik dengan masa garansi perbaikan bug selama <strong>{bastWarranty || '14'} hari kerja</strong>.
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Signatures Section */}
                      <div className="pt-8 grid grid-cols-2 gap-8 text-center font-sans border-t border-slate-200 mt-8">
                        <div className="space-y-12">
                          <p className="font-bold">PIHAK PERTAMA (Penyedia Jasa)</p>
                          <div className="h-16 flex items-center justify-center">
                            {signatureDataUrl ? (
                              <img src={signatureDataUrl} alt="Signature" className="max-h-16 mx-auto" />
                            ) : (
                              <div className="border-b border-dashed border-slate-900 w-36 text-[10px] text-slate-400 min-h-[16px] flex items-end justify-center">
                                {!isExporting && '( Tanda Tangan Digital )'}
                              </div>
                            )}
                          </div>
                          <p className="font-bold underline">{freelancerName || 'Debby Aulia'}</p>
                        </div>
                        <div className="space-y-12">
                          <p className="font-bold">PIHAK KEDUA (Pemberi Kerja)</p>
                          <div className="h-16 flex items-center justify-center">
                            <div className="border-b border-dashed border-slate-900 w-36 text-[10px] text-slate-400 min-h-[16px] flex items-end justify-center">
                              {!isExporting && '( Tanda Tangan & Nama Terang )'}
                            </div>
                          </div>
                          <p className="font-bold underline">{clientName || 'PT Digital Inovasi Nusantara'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sticky Main Action Button Bar */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="w-full sm:w-auto text-center sm:text-left">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Status Dokumen Draf
                    </span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {paidDocs[activeDocTab] ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 inline" /> Terverifikasi Lunas ({activeDocTab})
                        </span>
                      ) : (
                        <span>Draf Gratis (Terdapat Watermark)</span>
                      )}
                    </span>
                  </div>

                  <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFreeDownload}
                      className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-full text-xs transition-all flex items-center justify-center gap-1.5 border border-slate-300"
                    >
                      <Download className="w-4 h-4 text-slate-600" />
                      <span>Download Draf Watermark</span>
                    </button>

                    {paidDocs[activeDocTab] ? (
                      <button
                        type="button"
                        onClick={() => handleDownloadPDF(activeDocTab)}
                        className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-4 h-4" />
                        <span>Unduh PDF Clean (Tanpa Watermark)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setModalStep('download_choice');
                          setShowCheckoutModal(true);
                        }}
                        className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                      >
                        <Unlock className="w-4 h-4" />
                        <span>Buka PDF HD Tanpa Watermark</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-14 bg-white border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Forum Testimoni Freelancer
              </h3>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Ulasan Pengguna Terverifikasi
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.length === 0 ? (
                <div className="md:col-span-3 bg-slate-50 p-8 rounded-3xl border border-dashed border-slate-300 text-center space-y-2 max-w-xl mx-auto">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <MessageSquarePlus className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">Belum Ada Testimoni Pengguna</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Jadilah freelancer pertama yang membagikan ulasan setelah mengunduh dokumen legal Anda. Ulasan pengguna terverifikasi akan ditampilkan di sini.
                  </p>
                </div>
              ) : (
                reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-3"
                  >
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(rev.stars)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed italic">"{rev.text}"</p>
                    <div className="pt-2 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                        {rev.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{rev.name}</h4>
                        <span className="text-[11px] text-slate-400">Pengguna Terverifikasi</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Download Choice & Integrated Payment Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 my-8">
            
            {/* STEP 1: Main Download Choice Modal */}
            {modalStep === 'download_choice' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <span className="text-xs font-extrabold text-slate-900 uppercase">
                      Pilih Paket Lisensi Dokumen
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCheckoutModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Silakan bayar melalui Mayar Payment Gateway untuk menghapus watermark dan membuka PDF HD legal:
                </p>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl border-2 border-emerald-500/80 bg-emerald-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" /> Versi PRO Clean (Tanpa Watermark)
                      </span>
                    </div>

                    <div className="space-y-2 pt-1">
                      <div
                        onClick={() => setSelectedPackage('SINGLE')}
                        className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                          selectedPackage === 'SINGLE'
                            ? 'bg-white border-emerald-600 font-bold shadow-sm'
                            : 'bg-white/60 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div>
                          <span className="block font-bold">Dokumen Satuan ({activeDocTab})</span>
                          <span className="text-[10px] text-slate-500 font-normal">Unduh 1 dokumen PDF pilihan</span>
                        </div>
                        <span className="font-extrabold text-slate-900 text-sm">Rp 1.000</span>
                      </div>

                      <div
                        onClick={() => setSelectedPackage('BUNDLING')}
                        className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                          selectedPackage === 'BUNDLING'
                            ? 'bg-white border-emerald-600 font-bold shadow-sm'
                            : 'bg-white/60 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">Paket Bundling Proteksi 3-in-1</span>
                            <span className="bg-amber-500 text-white text-[9px] px-1 py-0.2 rounded font-black uppercase">
                              -60%
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-normal">Unduh sekaligus 3 Dokumen (SPK + NDA + BAST)</span>
                        </div>
                        <span className="font-extrabold text-emerald-700 text-sm">Rp 49.999</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isLoadingQris}
                      onClick={handleRequestQris}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      {isLoadingQris ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Unlock className="w-4 h-4" />
                      )}
                      <span>
                        {isLoadingQris
                          ? 'Memproses...'
                          : `Bayar via Mayar Payment Gateway (${selectedPackage === 'SINGLE' ? 'Rp 1.000' : 'Rp 49.999'})`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Payment Process View (Direct Verifier Only - Strict Verification) */}
            {modalStep === 'qris' && (
              <div className="space-y-4 text-center">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-400">
                    ID Session: <span className="text-slate-800">{sessionId}</span>
                  </span>
                  <span className="text-xs font-extrabold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    ⏱️ {formatTime(timeLeft)}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Pembayaran Lisensi Dokumen</h3>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {selectedPackage === 'SINGLE' ? 'Rp 1.000' : 'Rp 49.999'}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Paket: <strong>{selectedPackage === 'SINGLE' ? `Single Document (${activeDocTab})` : 'Bundling (SPK + NDA + BAST)'}</strong>
                  </p>
                </div>

                {/* Switch Modus Tampilan Pembayaran */}
                {paymentUrl && (
                  <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setUseIframePayment(true)}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${
                        useIframePayment ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Portal Langsung Modal
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseIframePayment(false)}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${
                        !useIframePayment ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Scan Barcode QRIS
                    </button>
                  </div>
                )}

                {/* Container QRIS / Embedded Iframe */}
                <div className="bg-slate-50 p-2 sm:p-4 rounded-2xl border border-slate-200 overflow-hidden w-full space-y-3">
                  {isLoadingQris ? (
                    <div className="w-full h-64 rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-500 animate-pulse font-sans font-bold gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Menyiapkan Payment Gateway Mayar...</span>
                    </div>
                  ) : paymentUrl && useIframePayment ? (
                    <div className="w-full h-[360px] rounded-xl overflow-hidden border border-slate-200 bg-white relative">
                      <iframe
                        src={paymentUrl}
                        className="w-full h-full border-0"
                        title="Mayar Payment Gateway"
                      />
                    </div>
                  ) : qrCodeData ? (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
                      <span className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                        Scan Kode QRIS Di Bawah Ini
                      </span>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrCodeData)}`}
                        alt="QRIS Barcode Mayar"
                        className="w-52 h-52 mx-auto rounded-lg shadow-md border border-slate-100"
                      />
                      <span className="block text-[11px] font-medium text-slate-500">
                        Dapat discan menggunakan GoPay, OVO, Dana, ShopeePay, BCA, Mandiri, dll.
                      </span>
                    </div>
                  ) : (
                    <div className="w-full h-32 rounded-xl bg-red-50 text-red-500 flex items-center justify-center text-xs p-4 text-center font-sans font-medium">
                      Gagal memuat metode pembayaran. Silakan coba kembali beberapa saat.
                    </div>
                  )}

                  {paymentUrl && (
                    <a
                      href={paymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 pt-1"
                    >
                      <span>Buka Portal Mayar di Tab Baru (Jika Iframe Terkendala)</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  <span className="block text-[10px] font-bold text-slate-400">
                    Secured by Mayar Payment Gateway (QRIS, VA, E-Wallet)
                  </span>
                </div>

                <div className="text-[11px] text-emerald-600 font-semibold flex items-center justify-center gap-2 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>Sistem memverifikasi pelunasan secara real-time...</span>
                </div>

                {/* Tombol Verifikasi Ketat Server Redis (Tanpa Bypass) */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    disabled={isVerifyingPayment}
                    onClick={handleManualCheckPayment}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition"
                  >
                    {isVerifyingPayment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    <span>
                      {isVerifyingPayment ? 'Mengecek Server...' : 'CEK STATUS PEMBAYARAN'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      stopPolling();
                      setModalStep('download_choice');
                    }}
                    className="w-full py-2 text-slate-400 hover:text-slate-600 font-medium text-[11px]"
                  >
                    Batal Transaksi
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success & Download Receipt Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Pembayaran Terverifikasi Lunas!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Watermark SPKINSTAN telah resmi dicabut. Dokumen PDF Clean (Tanpa Watermark) Anda siap diunduh.
              </p>
            </div>

            {/* Indikator Status Auto-Download */}
            {autoDownloadStatus && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{autoDownloadStatus}</span>
              </div>
            )}

            {selectedPackage === 'BUNDLING' ? (
              <div className="space-y-3 pt-2 text-left">
                <span className="text-xs font-bold text-slate-700 block text-center uppercase tracking-wider">
                  Paket Bundling 3 Dokumen (Lunas)
                </span>

                <button
                  type="button"
                  onClick={() => handleDownloadPDF()}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>KLIK UNDUH SEMUA DOKUMEN (SPK + NDA + BAST)</span>
                </button>

                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDownloadPDF('SPK')}
                    className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-[11px] text-center border border-slate-200"
                  >
                    1. Unduh SPK
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPDF('NDA')}
                    className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-[11px] text-center border border-slate-200"
                  >
                    2. Unduh NDA
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPDF('BAST')}
                    className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-[11px] text-center border border-slate-200"
                  >
                    3. Unduh BAST
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleShareWhatsApp()}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-md flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Paket Bundling ke WA Klien</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(paidDocTarget)}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>KLIK UNDUH PDF CLEAN (TANPA WATERMARK)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(paidDocTarget)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-md flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Langsung ke WhatsApp Klien</span>
                </button>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 text-center space-y-2.5">
                <div className="text-xs font-extrabold text-slate-900 flex items-center justify-center gap-1.5">
                  <MessageSquarePlus className="w-4 h-4 text-emerald-600" />
                  <span>Berikan Ulasan & Kritik via WhatsApp</span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 max-w-xs mx-auto">
                  Pengalaman Anda sangat berharga. Kirim kesan atau masukan Anda langsung ke WhatsApp Admin Business kami.
                </p>
                <a
                  href="https://wa.me/6281234567890?text=Halo%20Admin%20SPKInstan,%20saya%20baru%20saja%20membuat%20dokumen%20dan%20ingin%20memberikan%20ulasan/kritik:"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat WA Admin Business</span>
                </a>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="text-xs text-slate-400 hover:text-slate-600 pt-2"
            >
              Tutup Modal
            </button>
          </div>
        </div>
      )}

      {/* Mobile Floating Sticky Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 z-30 shadow-lg flex gap-2">
        <button
          type="button"
          onClick={handleFreeDownload}
          className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-full text-xs transition-all flex items-center justify-center gap-1 border border-slate-300"
        >
          <Download className="w-3.5 h-3.5 text-slate-600" />
          <span>Draf Watermark</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (paidDocs[activeDocTab]) {
              handleDownloadPDF(activeDocTab);
            } else {
              setModalStep('download_choice');
              setShowCheckoutModal(true);
            }
          }}
          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs transition-all shadow-md flex items-center justify-center gap-1"
        >
          <Unlock className="w-3.5 h-3.5" />
          <span>{paidDocs[activeDocTab] ? 'Unduh PDF Clean' : 'Versi Pro (Clean)'}</span>
        </button>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                <span>
                  SPK<span className="text-blue-500">Instan</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Platform generator perjanjian legal perdata instan bagi freelancer & agensi mikro Indonesia.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
                Landasan Hukum Perikatan
              </h4>
              <ul className="space-y-2 text-xs">
                <li>Pasal 1320 KUHPerdata (Syarat Sah Perikatan)</li>
                <li>Pasal 1338 KUHPerdata (Pacta Sunt Servanda)</li>
                <li>Pasal 1464 KUHPerdata (Ketentuan Uang Muka / DP)</li>
                <li>Pasal 1365 KUHPerdata & UU Rahasia Dagang</li>
                <li>Pasal 1812 KUHPerdata & UU Hak Cipta No. 28/2014</li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
                Keamanan & Keabsahan
              </h4>
              <ul className="space-y-2 text-xs">
                <li>Zero Database (Strict Local Privacy)</li>
                <li>Proteksi Anti-Inspect Canvas Watermark</li>
                <li>Tanda Tangan Digital & Fisik Manual</li>
                <li>Format Cetak A4 Standar Perdata</li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
                Dukungan Pengguna
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Ada kendala teknis atau pertanyaan perikatan legal? CS WhatsApp kami siap membantu.
              </p>
              <a
                href="https://wa.me/6281234567890?text=Halo%20Admin%20SPKInstan,%20saya%20butuh%20bantuan"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-xl text-xs font-semibold border border-emerald-500/30 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Hubungi CS WA SPKInstan</span>
              </a>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
            <p>© 2026 SPKInstan Legal Tech Platform. Hak Cipta Dilindungi Undang-Undang.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}