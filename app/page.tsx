'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  ShieldCheck,
  MessageCircle,
  ArrowRight,
  Edit3,
  FileText,
  Lock,
  CheckSquare,
  User,
  Building2,
  RotateCcw,
  Shield,
  Unlock,
  MessageSquarePlus,
  X,
  CheckCircle,
  Download,
  Star,
  Sparkles,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  Sliders,
  RefreshCw,
  Mail
} from 'lucide-react';

declare global {
  interface Window {
    fbq?: (event: string, action: string, data?: object) => void;
  }
}

type DocType = 'SPK' | 'NDA' | 'BAST';

// Data Khusus per Jenis Dokumen (Independen & Terisolasi)
interface SingleDocDetails {
  docNumber: string;
  docDate: string; // Properti untuk tanggal dokumen kustom
  projectTitle: string;

  // Field Identitas Pihak
  freelancerName: string;
  freelancerEmail: string;
  freelancerWa: string;
  clientName: string;
  clientWa: string;

  signerFirstParty: string;
  signerSecondParty: string;
  signatureFirstParty: string | null;
  signatureSecondParty: string | null;

  // Isian Spesifik SPK
  projectAmount: string;
  dpPercent: string;
  bankInfo: string;

  // Isian Spesifik NDA
  ndaScope: string;
  ndaYears: string;
  ndaPenalty: string;

  // Isian Spesifik BAST
  bastRef: string;
  bastWarranty: string;
  bastDate: string;
}

interface Review {
  id: string;
  name: string;
  text: string;
  stars: number;
}

interface Clause {
  id: string;
  docType: DocType;
  title: string;
  content: string;
  isEnabled: boolean;
  isCustom?: boolean;
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function Home() {
  const adminWaNumber = process.env.NEXT_PUBLIC_ADMIN_WA_NUMBER || '62881027908462';

  // ---------------------------------------------------------
  // ALL STATES & REFS
  // ---------------------------------------------------------
  const [isLoaded, setIsLoaded] = useState(false); // Flag pelacak status restore/reset awal
  const [activeDocTab, setActiveDocTab] = useState<DocType>('SPK');
  const [selectedPackage, setSelectedPackage] = useState<'SINGLE' | 'BUNDLING'>('SINGLE');
  const [currentWizardStep, setCurrentWizardStep] = useState(1);
  const [activePreset, setActivePreset] = useState<'web' | 'design' | 'all' | null>(null);

  const [paidDocs, setPaidDocs] = useState<{ SPK: boolean; NDA: boolean; BAST: boolean }>({
    SPK: false,
    NDA: false,
    BAST: false,
  });

  const [downloadedDocs, setDownloadedDocs] = useState<{ SPK: boolean; NDA: boolean; BAST: boolean }>({
    SPK: false,
    NDA: false,
    BAST: false,
  });

  const [processingDoc, setProcessingDoc] = useState<'SPK' | 'NDA' | 'BAST' | 'ALL' | null>(null);
  const [paidDocTarget, setPaidDocTarget] = useState<DocType>('SPK');

  // POPUP & MODAL CONTROL STATES
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [modalStep, setModalStep] = useState<'download_choice' | 'qris'>('download_choice');
  const [showDownloadPopup, setShowDownloadPopup] = useState(false);

  // STATE RECEIPT EMAIL, NAMA (MANUAL TANPA AUTOFILL), & VALIDASI ERROR
  const [receiptEmail, setReceiptEmail] = useState('');
  const [receiptName, setReceiptName] = useState(''); // Default Kosong Manual Input
  const [emailError, setEmailError] = useState('');

  const [mobileViewMode, setMobileViewMode] = useState<'form' | 'preview'>('form');
  const [isExporting, setIsExporting] = useState(false);

  const [sessionId, setSessionId] = useState('');
  const [, setMayarPaymentId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(899);

  const [, setQrCodeData] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [isLoadingQris, setIsLoadingQris] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // HELPER VALIDASI FORMAT EMAIL
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // HELPER FORMAT TANGGAL INDONESIA KUSTOM
  const formatIndonesianDate = (dateString: string) => {
    if (!dateString) return '-';
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) return dateString;

    return dateObj.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // ---------------------------------------------------------
  // KEYED DICTIONARY STATE IMPLEMENTATION (TERPISAH PER DOKUMEN)
  // Multi-Doc State Nomor Surat Terisolasi Mandiri
  // ---------------------------------------------------------
  const [docsData, setDocsData] = useState<Record<DocType, SingleDocDetails>>({
    SPK: {
      docNumber: '001/SPK/IX/2026',
      docDate: new Date().toISOString().split('T')[0],
      projectTitle: 'Pengembangan Aplikasi Web Dashboard',
      freelancerName: '',
      freelancerEmail: '',
      freelancerWa: '',
      clientName: '',
      clientWa: '',
      signerFirstParty: '',
      signerSecondParty: '',
      signatureFirstParty: null,
      signatureSecondParty: null,
      projectAmount: '7500000',
      dpPercent: '50',
      bankInfo: 'BCA 1234567890 a.n Budi Santoso',
      ndaScope: '',
      ndaYears: '',
      ndaPenalty: '',
      bastRef: '',
      bastWarranty: '',
      bastDate: '',
    },
    NDA: {
      docNumber: '001/NDA/IX/2026',
      docDate: new Date().toISOString().split('T')[0],
      projectTitle: 'Kerahasiaan Source Code & Database',
      freelancerName: '',
      freelancerEmail: '',
      freelancerWa: '',
      clientName: '',
      clientWa: '',
      signerFirstParty: '',
      signerSecondParty: '',
      signatureFirstParty: null,
      signatureSecondParty: null,
      projectAmount: '',
      dpPercent: '',
      bankInfo: '',
      ndaScope: 'Source Code, Schema Database, Aset Desain Figma, & API Key',
      ndaYears: '2',
      ndaPenalty: '25000000',
      bastRef: '',
      bastWarranty: '',
      bastDate: '',
    },
    BAST: {
      docNumber: '001/BAST/IX/2026',
      docDate: new Date().toISOString().split('T')[0],
      projectTitle: 'Serah Terima Pekerjaan Web Dashboard',
      freelancerName: '',
      freelancerEmail: '',
      freelancerWa: '',
      clientName: '',
      clientWa: '',
      signerFirstParty: '',
      signerSecondParty: '',
      signatureFirstParty: null,
      signatureSecondParty: null,
      projectAmount: '',
      dpPercent: '',
      bankInfo: '',
      ndaScope: '',
      ndaYears: '',
      ndaPenalty: '',
      bastRef: '001/SPK/IX/2026',
      bastWarranty: '14',
      bastDate: '2026-09-25',
    },
  });

  // Handler Pembaruan Input Form Dokumen Spesifik & Invalidate Payment Link
  const handleDocInputChange = (
    docTarget: DocType,
    field: keyof SingleDocDetails,
    value: string | null
  ) => {
    setDocsData((prev) => ({
      ...prev,
      [docTarget]: {
        ...prev[docTarget],
        [field]: value,
      },
    }));

    // RESET LINK PEMBAYARAN LAMA (INVALIDATE INVOICE EXPIRED)
    setPaymentUrl(null);
    setMayarPaymentId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('spkinstan_active_payment');
    }
  };

  const canvasRef1 = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing1, setIsDrawing1] = useState(false);

  const canvasRef2 = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing2, setIsDrawing2] = useState(false);

  const [reviews] = useState<Review[]>([]);
  const page1ContentRef = useRef<HTMLDivElement | null>(null);
  const page1MainContentRef = useRef<HTMLDivElement | null>(null);
  const page2ContentRef = useRef<HTMLDivElement | null>(null);
  const [heightNeedsPage2, setHeightNeedsPage2] = useState(false);

  // Master Clauses dengan Landasan Hukum Indonesia Terlengkap & Presisi
  const [clauses, setClauses] = useState<Clause[]>([
    // --- PASAL-PASAL DOKUMEN SPK ---
    {
      id: 'spk-1',
      docType: 'SPK',
      title: 'Ruang Lingkup Pekerjaan & Asas Iktikad Baik',
      content: 'Sesuai Pasal 1338 ayat (3) KUHPerdata jo. Pasal 3 & Pasal 18 UU ITE (UU No. 1 Tahun 2024), Para Pihak sepakat melaksanakan pengerjaan proyek sesuai dengan acuan spesifikasi teknis dan deliverables yang disepakati secara beriktikad baik.',
      isEnabled: true,
    },
    {
      id: 'spk-2',
      docType: 'SPK',
      title: 'Keabsahan Kontrak & Tanda Tangan Elektronik',
      content: 'Berdasarkan Pasal 5 ayat (1), Pasal 11 ayat (1), dan Pasal 18 ayat (1) UU ITE (UU No. 1 Tahun 2024), Kontrak Elektronik dan Tanda Tangan Elektronik ini merupakan alat bukti hukum yang sah serta mengikat Para Pihak sejak dibubuhi tanda tangan secara elektronik maupun fisik.',
      isEnabled: true,
    },
    {
      id: 'spk-3',
      docType: 'SPK',
      title: 'Imbalan Jasa & Skema Pembayaran',
      content: 'Total imbalan jasa yang disepakati wajib dibayarkan dengan Uang Muka (DP) sebelum pengerjaan dimulai melalui transfer bank resmi PIHAK PERTAMA.',
      isEnabled: true,
    },
    {
      id: 'spk-4',
      docType: 'SPK',
      title: 'Ketentuan Revisi & SLA Feedback Auto-Approval',
      content: 'Revisi pekerjaan dibatasi maksimal 2 (dua) kali sesuai cakupan kesepakatan awal. Evaluasi atau feedback dari PIHAK KEDUA wajib diberikan maksimal 5 (lima) hari kerja; jika melebihi batas waktu tersebut, pekerjaan dianggap disetujui secara otomatis (auto-approved).',
      isEnabled: true,
    },
    {
      id: 'spk-5',
      docType: 'SPK',
      title: 'Kepemilikan Hak Cipta & Retensi Master File',
      content: 'Sesuai Pasal 36, Pasal 16 ayat (1)-(2), dan Pasal 80 ayat (1) UU No. 28 Tahun 2014 tentang Hak Cipta, Hak Cipta atas Ciptaan yang dibuat berdasarkan pesanan tetap berada pada Pembuat Ciptaan (PIHAK PERTAMA) dan baru dialihkan/dilisensikan secara tertulis kepada PIHAK KEDUA setelah sisa pembayaran dilunasi 100%.',
      isEnabled: true,
    },
    {
      id: 'spk-6',
      docType: 'SPK',
      title: 'Kepemilikan Hak Invensi, Paten & Lisensi',
      content: 'Berdasarkan Pasal 1 angka 1, angka 11, dan Pasal 19 ayat (1) UU No. 65 Tahun 2024 tentang Paten, apabila hasil pekerjaan menghasilkan invensi teknologi atau algoritma baru, Hak Paten dan Lisensi eksklusif/non-eksklusif diatur berdasarkan kesepakatan tertulis Para Pihak.',
      isEnabled: true,
    },
    {
      id: 'spk-7',
      docType: 'SPK',
      title: 'Pembatalan & Uang Muka (DP) Non-Refundable',
      content: 'Sesuai Pasal 1338 ayat (1) jo. Pasal 1249 KUHPerdata, apabila pembatalan perjanjian dilakukan secara sepihak oleh PIHAK KEDUA, maka Uang Muka (DP) yang telah dibayarkan dianggap hangus sebagai ganti rugi dan tidak dapat ditarik kembali (non-refundable).',
      isEnabled: true,
    },
    {
      id: 'spk-8',
      docType: 'SPK',
      title: 'Keamanan Akses Sistem & Larangan Akses Ilegal',
      content: 'PIHAK KEDUA wajib menyediakan akses kredensial server/hosting/API yang diperlukan untuk pengerjaan proyek. Sesuai Pasal 30 jo. Pasal 46 UU ITE (UU No. 11 Tahun 2008 jo. UU No. 1 Tahun 2024), dilarang keras melakukan pengaksesan tanpa hak atau melampaui wewenang atas server, kode sumber, maupun sistem elektronik milik pihak lain baik sebelum maupun sesudah penyerahan resmi.',
      isEnabled: true,
    },
    {
      id: 'spk-9',
      docType: 'SPK',
      title: 'Hukum Yang Berlaku & Penyelesaian Sengketa',
      content: 'Berdasarkan Pasal 1338 KUHPerdata jo. Pasal 18 ayat (1) UU ITE (UU No. 1 Tahun 2024), Perjanjian ini tunduk pada dan ditafsirkan menurut hukum Republik Indonesia. Setiap sengketa yang timbul akan diselesaikan secara musyawarah untuk mufakat, dan apabila tidak tercapai kesepakatan, diselesaikan melalui domisili Pengadilan Negeri yang berwenang.',
      isEnabled: true,
    },

    // --- PASAL-PASAL DOKUMEN NDA ---
    {
      id: 'nda-1',
      docType: 'NDA',
      title: 'Definisi Rahasia Dagang & Informasi Rahasia',
      content: 'Sesuai Pasal 1 angka 1 jo. Pasal 2 UU No. 30 Tahun 2000 tentang Rahasia Dagang, Informasi Rahasia mencakup seluruh data teknis, Source Code, Schema Database, Aset Desain Figma, API Key, strategi bisnis, serta data finansial yang diberikan oleh Pemilik Informasi.',
      isEnabled: true,
    },
    {
      id: 'nda-2',
      docType: 'NDA',
      title: 'Kewajiban & Pembatasan Pengungkapan',
      content: 'Berdasarkan Pasal 4 huruf b jo. Pasal 13 UU No. 30 Tahun 2000 tentang Rahasia Dagang, Penerima Informasi dilarang keras mengungkapkan, menyebarluaskan, atau memanfaatkan Informasi Rahasia kepada pihak ketiga serta wajib menjaga kerahasiaannya sesuai kesepakatan tertulis ini.',
      isEnabled: true,
    },
    {
      id: 'nda-3',
      docType: 'NDA',
      title: 'Pelindungan Data Pribadi Para Pihak',
      content: 'Sesuai Pasal 20 ayat (2) huruf b jo. Pasal 36 UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP), pemrosesan Data Pribadi dilakukan dalam rangka pemenuhan perjanjian, dan Pengendali Data Pribadi wajib menjaga kerahasiaan Data Pribadi Para Pihak yang diperoleh selama pelaksanaan kerja sama ini.',
      isEnabled: true,
    },
    {
      id: 'nda-4',
      docType: 'NDA',
      title: 'Jangka Waktu Kerahasiaan',
      content: 'Kewajiban menjaga kerahasiaan ini berlaku efektif sejak tanggal penandatanganan dan tetap mengikat Para Pihak selama masa waktu yang telah disepakati setelah hubungan kerja sama berakhir.',
      isEnabled: true,
    },
    {
      id: 'nda-5',
      docType: 'NDA',
      title: 'Pengembalian & Pemusnahan Aset Data',
      content: 'Setelah pengerjaan proyek selesai atau atas permintaan tertulis Pemilik Informasi, Penerima Informasi wajib mengembalikan seluruh fisik dokumen dan memusnahkan/menghapus file digital yang mengandung Informasi Rahasia.',
      isEnabled: true,
    },
    {
      id: 'nda-6',
      docType: 'NDA',
      title: 'Sanksi Pelanggaran & Denda Finansial',
      content: 'Setiap bentuk kebocoran atau pelanggaran kerahasiaan dikenakan denda penalti finansial serta hak untuk menuntut ganti rugi materiil/immateriil sesuai ketentuan hukum perdata dan pidana yang berlaku.',
      isEnabled: true,
    },
    {
      id: 'nda-7',
      docType: 'NDA',
      title: 'Penyelesaian Sengketa',
      content: 'Setiap perselisihan yang timbul dari pelaksanaan NDA ini diselesaikan secara musyawarah untuk mufakat, dan apabila gagal, diselesaikan di forum hukum Pengadilan Negeri setempat.',
      isEnabled: true,
    },

    // --- PASAL-PASAL DOKUMEN BAST ---
    {
      id: 'bast-1',
      docType: 'BAST',
      title: 'Identitas & Referensi Kontrak Utama',
      content: 'Berita Acara ini diterbitkan sebagai bukti administratif sah yang merujuk pada kesepakatan Perjanjian Kerja Sama (SPK) Utama yang telah disepakati Para Pihak.',
      isEnabled: true,
    },
    {
      id: 'bast-2',
      docType: 'BAST',
      title: 'Pernyataan Serah Terima Pekerjaan',
      content: 'PIHAK PERTAMA menyatakan telah menyerahkan seluruh hasil pengerjaan proyek, dan PIHAK KEDUA menyatakan telah menerima pengerjaan tersebut secara resmi.',
      isEnabled: true,
    },
    {
      id: 'bast-3',
      docType: 'BAST',
      title: 'Hasil Pemeriksaan & Quality Check',
      content: 'PIHAK KEDUA telah melakukan pemeriksaan komprehensif terhadap seluruh fitur, desain, dan deliverables, serta mengonfirmasi bahwa hasil pekerjaan telah sesuai dengan standar spesifikasi teknis SPK.',
      isEnabled: true,
    },
    {
      id: 'bast-4',
      docType: 'BAST',
      title: 'Masa Garansi & Pemeliharaan Bug',
      content: 'PIHAK PERTAMA memberikan garansi pemeliharaan perbaikan kendala teknis / bug secara gratis selama masa garansi yang disepakati terhitung sejak penandatanganan BAST ini.',
      isEnabled: true,
    },
    {
      id: 'bast-5',
      docType: 'BAST',
      title: 'Pengesahan Pelunasan & Pengalihan Hak',
      content: 'Sesuai UU Hak Cipta & UU Paten, dengan ditandatanganinya BAST ini dan dilunasinya kewajiban pembayaran 100%, seluruh hasil pengerjaan resmi diserahterimakan dan hak penggunaan dialihkan kepada PIHAK KEDUA.',
      isEnabled: true,
    },
  ]);

  // ---------------------------------------------------------
  // PERBAIKAN RESET & RESTORE DRAF BERURUTAN (ISLOADED)
  // ---------------------------------------------------------

  // 1. Logika Reset & Restore Draf dalam SATU useEffect berurutan
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const isReset = urlParams.get('reset') === 'true';

    if (isReset) {
      // Bersihkan seluruh LocalStorage
      localStorage.clear();

      // Reset State React di Memori ke Nilai Default Kosong
      setDocsData({
        SPK: {
          docNumber: '001/SPK/IX/2026',
          docDate: new Date().toISOString().split('T')[0],
          projectTitle: '',
          freelancerName: '',
          freelancerEmail: '',
          freelancerWa: '',
          clientName: '',
          clientWa: '',
          signerFirstParty: '',
          signerSecondParty: '',
          signatureFirstParty: null,
          signatureSecondParty: null,
          projectAmount: '7500000',
          dpPercent: '50',
          bankInfo: '',
          ndaScope: '',
          ndaYears: '',
          ndaPenalty: '',
          bastRef: '',
          bastWarranty: '',
          bastDate: '',
        },
        NDA: {
          docNumber: '001/NDA/IX/2026',
          docDate: new Date().toISOString().split('T')[0],
          projectTitle: '',
          freelancerName: '',
          freelancerEmail: '',
          freelancerWa: '',
          clientName: '',
          clientWa: '',
          signerFirstParty: '',
          signerSecondParty: '',
          signatureFirstParty: null,
          signatureSecondParty: null,
          projectAmount: '',
          dpPercent: '',
          bankInfo: '',
          ndaScope: 'Source Code, Schema Database, Aset Desain Figma, & API Key',
          ndaYears: '2',
          ndaPenalty: '25000000',
          bastRef: '',
          bastWarranty: '',
          bastDate: '',
        },
        BAST: {
          docNumber: '001/BAST/IX/2026',
          docDate: new Date().toISOString().split('T')[0],
          projectTitle: '',
          freelancerName: '',
          freelancerEmail: '',
          freelancerWa: '',
          clientName: '',
          clientWa: '',
          signerFirstParty: '',
          signerSecondParty: '',
          signatureFirstParty: null,
          signatureSecondParty: null,
          projectAmount: '',
          dpPercent: '',
          bankInfo: '',
          ndaScope: '',
          ndaYears: '',
          ndaPenalty: '',
          bastRef: '001/SPK/IX/2026',
          bastWarranty: '14',
          bastDate: '2026-09-25',
        },
      });

      setReceiptEmail('');
      setReceiptName('');
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsLoaded(true);
      alert('Cache draf dan pembayaran berhasil dibersihkan otomatis!');
      return;
    }

    // Jika bukan reset, pulihkan draf dari LocalStorage
    const savedDraft = localStorage.getItem('spkinstan_form_draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.docsData && parsed.docsData.SPK && parsed.docsData.NDA && parsed.docsData.BAST) {
          setDocsData(parsed.docsData);
          if (parsed.clauses && Array.isArray(parsed.clauses)) {
            setClauses(parsed.clauses);
          }
        }
      } catch (e) {
        console.error('Gagal memulihkan draf:', e);
        localStorage.removeItem('spkinstan_form_draft');
      }
    }
    setIsLoaded(true);
  }, []);

  // 2. Simpan Draf HANYA jika proses restore/reset (isLoaded) sudah selesai
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      const draftData = { docsData, clauses };
      localStorage.setItem('spkinstan_form_draft', JSON.stringify(draftData));
    }
  }, [docsData, clauses, isLoaded]);

  // 3. Peringatan Browser Saat Refresh / Tutup Tab ketika Modal/Popup Aktif
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (showCheckoutModal || showDownloadPopup) {
        e.preventDefault();
        e.returnValue = ''; // Memicu konfirmasi dialog bawaan browser
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [showCheckoutModal, showDownloadPopup]);

  // 4. Simpan State Pembayaran Aktif ke localStorage Secara Real-Time dengan Timestamp
  useEffect(() => {
    if (showCheckoutModal && modalStep === 'qris' && paymentUrl && sessionId) {
      localStorage.setItem(
        'spkinstan_active_payment',
        JSON.stringify({
          sessionId,
          paymentUrl,
          paidDocTarget,
          receiptEmail,
          receiptName,
          createdAt: Date.now(),
        })
      );
    }
  }, [showCheckoutModal, modalStep, paymentUrl, sessionId, paidDocTarget, receiptEmail, receiptName]);

  // 5. Auto-Restore Sesi Pembayaran dengan Auto-Expire 15 Menit
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedActivePayment = localStorage.getItem('spkinstan_active_payment');
    if (savedActivePayment) {
      try {
        const data = JSON.parse(savedActivePayment);
        const currentTime = Date.now();
        const cacheAge = currentTime - (data.createdAt || 0);
        const MAX_AGE = 15 * 60 * 1000; // 15 Menit

        if (cacheAge > MAX_AGE) {
          localStorage.removeItem('spkinstan_active_payment');
          return;
        }

        if (data.sessionId && data.paymentUrl) {
          setSessionId(data.sessionId);
          setPaymentUrl(data.paymentUrl);
          setPaidDocTarget(data.paidDocTarget || 'SPK');
          if (data.receiptEmail) setReceiptEmail(data.receiptEmail);
          if (data.receiptName) setReceiptName(data.receiptName);

          setModalStep('qris');
          setShowCheckoutModal(true);

          startPollingStatus(data.sessionId);
        }
      } catch (e) {
        console.error('Gagal memulihkan sesi pembayaran:', e);
        localStorage.removeItem('spkinstan_active_payment');
      }
    }
  }, []);

  // Autofill Email Penerima Kuitansi (Tetap Kosongkan Nama Penerima Kuitansi untuk Input Manual)
  useEffect(() => {
    if (showCheckoutModal) {
      const currentDocDetails = docsData[activeDocTab];
      const defaultEmail = currentDocDetails.freelancerEmail.trim() || (currentDocDetails.clientName
        ? `${currentDocDetails.clientName.toLowerCase().replace(/[^a-z0-9]/g, '')}@spkinstan.com`
        : '');

      if (!receiptEmail) setReceiptEmail(defaultEmail);
    }
  }, [showCheckoutModal, activeDocTab, docsData]);

  // Sync Tanda Tangan Canvas saat Berganti Tab Dokumen maupun Step Wizard
  useEffect(() => {
    if (currentWizardStep !== 4) return;

    const currentSignature1 = docsData[activeDocTab].signatureFirstParty;
    const currentSignature2 = docsData[activeDocTab].signatureSecondParty;

    if (canvasRef1.current) {
      const ctx = canvasRef1.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef1.current.width, canvasRef1.current.height);
        if (currentSignature1) {
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0);
          img.src = currentSignature1;
        }
      }
    }

    if (canvasRef2.current) {
      const ctx = canvasRef2.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef2.current.width, canvasRef2.current.height);
        if (currentSignature2) {
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0);
          img.src = currentSignature2;
        }
      }
    }
  }, [activeDocTab, currentWizardStep, docsData]);

  // Restore State dari LocalStorage saat Mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedPaid = localStorage.getItem('spkinstan_paid_docs');
    const savedDownloaded = localStorage.getItem('spkinstan_downloaded_docs');
    const savedPackage = localStorage.getItem('spkinstan_package');
    const popupActive = localStorage.getItem('spkinstan_popup_active');

    if (savedPaid) {
      try {
        setPaidDocs(JSON.parse(savedPaid));
      } catch (e) {
        console.error('Failed to parse saved paid docs:', e);
      }
    }

    if (savedPackage === 'BUNDLING' || savedPackage === 'SINGLE') {
      setSelectedPackage(savedPackage as 'SINGLE' | 'BUNDLING');
    }

    if (savedDownloaded) {
      try {
        setDownloadedDocs(JSON.parse(savedDownloaded));
      } catch (e) {
        console.error('Failed to parse saved downloaded docs:', e);
      }
    }

    if (popupActive === 'true') {
      setShowDownloadPopup(true);
      window.history.pushState({ downloadPopup: true }, '');
    }
  }, []);

  // Listener Popstate (Mencegah Tombol Back Browser Menutup Popup)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const isPopupActive = localStorage.getItem('spkinstan_popup_active');
      if (isPopupActive === 'true') {
        window.history.pushState({ downloadPopup: true }, '');
        setShowDownloadPopup(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // BroadcastChannel & Cross-Tab Payment Sync
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const channel = new BroadcastChannel('spkinstan_payment_channel');
    channel.onmessage = (event) => {
      if (event.data?.type === 'PAYMENT_SUCCESS') {
        handlePaymentSuccess();
      }
    };

    return () => {
      channel.close();
    };
  }, [sessionId, selectedPackage, paidDocTarget]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'spkinstan_last_paid_session' && e.newValue) {
        handlePaymentSuccess();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [sessionId, selectedPackage, paidDocTarget]);

  // Sync Dinamis Variabel ke Dalam Teks Pasal Terkait
  useEffect(() => {
    const spkData = docsData.SPK;
    const ndaData = docsData.NDA;
    const bastData = docsData.BAST;

    setClauses((prev) =>
      prev.map((c) => {
        if (c.id === 'spk-1') {
          return {
            ...c,
            content: `Sesuai Pasal 1338 ayat (3) KUHPerdata jo. Pasal 3 & Pasal 18 UU ITE (UU No. 1 Tahun 2024), Para Pihak sepakat melaksanakan pekerjaan "${spkData.projectTitle || 'Pengembangan Aplikasi Web Dashboard'}" dengan iktikad baik, transparan, dan jelas sesuai acuan spesifikasi teknis dan deliverables yang disepakati.`,
          };
        }
        if (c.id === 'spk-3') {
          return {
            ...c,
            content: `Total imbalan jasa yang disepakati sebesar Rp ${formatRupiah(spkData.projectAmount || '7500000')}, dengan Uang Muka (DP) sebesar ${spkData.dpPercent || '50'}% wajib dibayarkan sebelum pengerjaan dimulai melalui transfer ke ${spkData.bankInfo || 'BCA 1234567890 a.n Budi Santoso'}.`,
          };
        }
        if (c.id === 'nda-1') {
          return {
            ...c,
            content: `Sesuai Pasal 1 angka 1 jo. Pasal 2 UU No. 30 Tahun 2000 tentang Rahasia Dagang, Informasi Rahasia mencakup seluruh data teknis, "${ndaData.ndaScope || 'Source Code, Skema Database, Aset Desain Figma, & API Key'}", kode sumber, strategi pemasaran, serta data finansial yang diberikan oleh Pemilik Informasi.`,
          };
        }
        if (c.id === 'nda-4') {
          return {
            ...c,
            content: `Kewajiban menjaga kerahasiaan ini berlaku efektif sejak tanggal penandatanganan dan tetap mengikat Para Pihak selama ${ndaData.ndaYears || '2'} (dua) tahun setelah hubungan kerja sama berakhir.`,
          };
        }
        if (c.id === 'nda-6') {
          return {
            ...c,
            content: `Setiap bentuk kebocoran atau pelanggaran kerahasiaan dikenakan denda penalti finansial sebesar Rp ${formatRupiah(ndaData.ndaPenalty || '25000000')} serta hak untuk menuntut ganti rugi materiil/immateriil sesuai ketentuan hukum perdata.`,
          };
        }
        if (c.id === 'bast-1') {
          return {
            ...c,
            content: `Berita Acara ini diterbitkan sebagai bukti administratif sah yang merujuk pada kesepakatan Perjanjian Kerja Sama (SPK) Utama dengan Nomor Referensi: "${bastData.bastRef || '001/SPK/IX/2026'}".`,
          };
        }
        if (c.id === 'bast-2') {
          return {
            ...c,
            content: `PIHAK PERTAMA menyatakan telah menyerahkan seluruh hasil pengerjaan proyek, dan PIHAK KEDUA menyatakan telah menerima pengerjaan tersebut secara resmi pada tanggal ${bastData.bastDate ? formatIndonesianDate(bastData.bastDate) : '25 September 2026'}.`,
          };
        }
        if (c.id === 'bast-4') {
          return {
            ...c,
            content: `PIHAK PERTAMA memberikan garansi pemeliharaan perbaikan kendala teknis / bug secara gratis selama ${bastData.bastWarranty || '14'} (empat belas) hari kerja terhitung sejak penandatanganan BAST ini.`,
          };
        }
        return c;
      })
    );
  }, [docsData]);

  const handleToggleClause = (id: string) => {
    setClauses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isEnabled: !c.isEnabled } : c))
    );
    setPaymentUrl(null);
    setMayarPaymentId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('spkinstan_active_payment');
    }
  };

  const handleUpdateClauseTitle = (id: string, title: string) => {
    setClauses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
    setPaymentUrl(null);
    setMayarPaymentId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('spkinstan_active_payment');
    }
  };

  const handleUpdateClauseContent = (id: string, content: string) => {
    setClauses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, content } : c))
    );
    setPaymentUrl(null);
    setMayarPaymentId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('spkinstan_active_payment');
    }
  };

  const handleAddCustomClause = () => {
    const newClause: Clause = {
      id: `custom-${Date.now()}`,
      docType: activeDocTab,
      title: 'Ketentuan Khusus Tambahan',
      content: '',
      isEnabled: true,
      isCustom: true,
    };
    setClauses((prev) => [...prev, newClause]);
    setPaymentUrl(null);
    setMayarPaymentId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('spkinstan_active_payment');
    }
  };

  const handleRemoveClause = (id: string) => {
    setClauses((prev) => prev.filter((c) => c.id !== id));
    setPaymentUrl(null);
    setMayarPaymentId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('spkinstan_active_payment');
    }
  };

  // Preset Dinamis Sesuai Active Tab
  const handleApplyPreset = (presetType: 'web' | 'design' | 'all') => {
    setActivePreset(presetType);
    setPaymentUrl(null);
    setMayarPaymentId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('spkinstan_active_payment');
    }

    setClauses((prev) =>
      prev.map((c) => {
        if (presetType === 'all') {
          return c.docType === activeDocTab ? { ...c, isEnabled: true } : c;
        }

        if (c.docType !== activeDocTab) return c;

        if (c.docType === 'SPK') {
          if (presetType === 'web') return { ...c, isEnabled: true };
          if (presetType === 'design') {
            if (c.id === 'spk-8') return { ...c, isEnabled: false };
            return { ...c, isEnabled: true };
          }
        }

        if (c.docType === 'NDA') {
          if (presetType === 'web') return { ...c, isEnabled: true };
          if (presetType === 'design') {
            if (c.id === 'nda-6') return { ...c, isEnabled: false };
            return { ...c, isEnabled: true };
          }
        }

        if (c.docType === 'BAST') {
          if (presetType === 'web') return { ...c, isEnabled: true };
          if (presetType === 'design') {
            if (c.id === 'bast-4') return { ...c, isEnabled: false };
            return { ...c, isEnabled: true };
          }
        }

        return c;
      })
    );
  };

  const activeClauses = clauses.filter((c) => c.docType === activeDocTab && c.isEnabled);
  const SPLIT_LIMIT = 4;
  const isClauseSplit = activeClauses.length > SPLIT_LIMIT;

  const page1Clauses = isClauseSplit ? activeClauses.slice(0, SPLIT_LIMIT) : activeClauses;
  const page2Clauses = isClauseSplit ? activeClauses.slice(SPLIT_LIMIT) : [];

  // Pemisahan Layout Fleksibel & Penyesuaian Ambang Batas MAX_PAGE_CONTENT_HEIGHT = 960
  useIsomorphicLayoutEffect(() => {
    if (isExporting) return;

    const MAX_PAGE_CONTENT_HEIGHT = 960;

    if (!heightNeedsPage2) {
      if (page1ContentRef.current) {
        const currentContentHeight = page1ContentRef.current.scrollHeight;
        if (currentContentHeight > MAX_PAGE_CONTENT_HEIGHT) {
          setHeightNeedsPage2(true);
        }
      }
    } else {
      if (page1MainContentRef.current && page2ContentRef.current) {
        const totalCombinedHeight =
          page1MainContentRef.current.scrollHeight + page2ContentRef.current.scrollHeight;
        if (totalCombinedHeight <= MAX_PAGE_CONTENT_HEIGHT && activeClauses.length <= SPLIT_LIMIT) {
          setHeightNeedsPage2(false);
        }
      }
    }
  }, [
    heightNeedsPage2,
    activeDocTab,
    clauses,
    docsData,
    isExporting
  ]);

  const needsPage2 = isClauseSplit || heightNeedsPage2;
  const totalPages = needsPage2 ? 2 : 1;

  const generateNewSessionId = () => {
    return 'SPK-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  };

  useEffect(() => {
    setSessionId(generateNewSessionId());
  }, []);

  // Fitur Proteksi Keamanan Draf
  useEffect(() => {
    const isPaid = paidDocs[activeDocTab];
    if (isPaid) return;

    if (process.env.NODE_ENV === 'development') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P' || e.key === 'a' || e.key === 'A')) ||
        (e.metaKey && (e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P' || e.key === 'a' || e.key === 'A'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        alert('Proteksi Keamanan: Fitur inspect dan simpan draf dibatasi. Silakan selesaikan pembayaran untuk mengunduh PDF Clean.');
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

  // FUNGSI BERSIH-BERSIH MODAL DITUTUP MANUAL
  const handleCloseModal = () => {
    setShowCheckoutModal(false);
    setPaymentUrl(null);
    setMayarPaymentId(null);
    setModalStep('download_choice');
    setEmailError('');
    stopPolling();

    if (typeof window !== 'undefined') {
      localStorage.removeItem('spkinstan_active_payment');
    }
  };

  // TRIGGER PEMBAYARAN SUKSES & AKTIVASI POPUP OVERLAY
  const handlePaymentSuccess = () => {
    stopPolling();

    if (typeof window !== 'undefined') {
      localStorage.removeItem('spkinstan_active_payment');
    }

    const updatedPaid = selectedPackage === 'BUNDLING'
      ? { SPK: true, NDA: true, BAST: true }
      : { ...paidDocs, [paidDocTarget]: true };

    setPaidDocs(updatedPaid);

    if (typeof window !== 'undefined') {
      localStorage.setItem('spkinstan_paid_docs', JSON.stringify(updatedPaid));
      localStorage.setItem('spkinstan_package', selectedPackage);
      localStorage.setItem('spkinstan_popup_active', 'true');
      window.history.pushState({ downloadPopup: true }, '');
    }

    setShowCheckoutModal(false);
    setShowDownloadPopup(true);

    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'Purchase', {
        value: selectedPackage === 'BUNDLING' ? 39999 : 19999,
        currency: 'IDR',
      });
    }
  };

  // SAKLAR EKSEKUSI PENUTUPAN MANUAL POPUP (KONSUMSI LISENSI)
  const handleManualClosePopup = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('spkinstan_popup_active');
    }

    if (sessionId) {
      await consumePaymentLicense(sessionId);
    }

    const resetPaid = { SPK: false, NDA: false, BAST: false };
    setPaidDocs(resetPaid);
    if (typeof window !== 'undefined') {
      localStorage.setItem('spkinstan_paid_docs', JSON.stringify(resetPaid));
    }

    setSessionId('');
    setShowDownloadPopup(false);
  };

  const switchTabAndAwaitRender = (targetDoc: DocType) => {
    return new Promise<void>((resolve) => {
      setActiveDocTab(targetDoc);
      setTimeout(() => {
        resolve();
      }, 500);
    });
  };

  // FUNGSI HELPER: GENERATE PDF BLOB WITH CLEAN FILE NAMING (<doctype>_<nama_pihak_pertama>.pdf)
  const generatePdfBlob = async (
    docType: DocType
  ): Promise<{ blob: Blob; fileName: string } | null> => {
    setIsExporting(true);
    setMobileViewMode('preview');

    if (activeDocTab !== docType) {
      await switchTabAndAwaitRender(docType);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.ready;
    }

    const element = document.getElementById('a4-document-preview');
    if (!element) {
      console.error('Elemen #a4-document-preview tidak ditemukan');
      setIsExporting(false);
      return null;
    }

    try {
      const html2canvasPro = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageElements = element.querySelectorAll('.a4-page');

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i] as HTMLElement;
        const isPaidDoc = paidDocs[docType] || (paidDocs.SPK && paidDocs.NDA && paidDocs.BAST);

        const watermarkElement = pageEl.querySelector('.watermark-layer') as HTMLElement;
        if (isPaidDoc && watermarkElement) {
          watermarkElement.style.display = 'none';
        }

        const originalWidth = pageEl.style.width;
        const originalHeight = pageEl.style.height;
        const originalMinHeight = pageEl.style.minHeight;

        pageEl.style.width = '794px';
        pageEl.style.minHeight = '1123px';
        pageEl.style.height = 'auto';
        pageEl.classList.add('export-pdf-mode');

        const canvas = await html2canvasPro(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          windowWidth: 794,
        });

        pageEl.style.width = originalWidth;
        pageEl.style.height = originalHeight;
        pageEl.style.minHeight = originalMinHeight;
        pageEl.classList.remove('export-pdf-mode');

        if (watermarkElement && !isPaidDoc) {
          watermarkElement.style.display = 'flex';
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (i > 0) pdf.addPage();

        if (imgHeight > pageHeight) {
          const ratio = pageHeight / imgHeight;
          const scaledWidth = imgWidth * ratio;
          const xCenterOffset = (imgWidth - scaledWidth) / 2;
          pdf.addImage(imgData, 'JPEG', xCenterOffset, 0, scaledWidth, pageHeight);
        } else {
          pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
        }
      }

      // Format Penamaan File Bersih: <doctype>_<nama_pihak_pertama>.pdf
      const cleanName = (docsData[docType].freelancerName || 'pihak_pertama')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');

      const fileName = `${docType.toLowerCase()}_${cleanName || 'pihak_pertama'}.pdf`;
      const blob = pdf.output('blob');

      return { blob, fileName };
    } catch (err) {
      console.error('Error generating PDF Blob:', err);
      return null;
    } finally {
      setIsExporting(false);
    }
  };

  // CAPTURE & EXPORT PDF
  const captureDocumentToPdf = async (docType: DocType) => {
    setProcessingDoc(docType);
    try {
      const pdfRes = await generatePdfBlob(docType);
      if (!pdfRes) {
        alert('Gagal mengekspor PDF. Pastikan browser memberikan izin unduh file.');
        return;
      }

      const { blob, fileName } = pdfRes;
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      setDownloadedDocs((prev) => {
        const nextState = { ...prev, [docType]: true };
        if (typeof window !== 'undefined') {
          localStorage.setItem('spkinstan_downloaded_docs', JSON.stringify(nextState));
        }
        return nextState;
      });
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Gagal mengekspor PDF.');
    } finally {
      setProcessingDoc(null);
    }
  };

  const handleDownloadAllBundling = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setProcessingDoc('ALL');
    setIsExporting(true);
    const docs: DocType[] = ['SPK', 'NDA', 'BAST'];

    try {
      for (const doc of docs) {
        await switchTabAndAwaitRender(doc);
        await captureDocumentToPdf(doc);
        await new Promise((res) => setTimeout(res, 800));
      }
    } catch (err) {
      console.error('Gagal mengunduh paket bundling:', err);
      alert('Terjadi kendala saat mengunduh paket bundling.');
    } finally {
      setIsExporting(false);
      setProcessingDoc(null);
    }
  };

  const handleIndividualDownload = async (docType: DocType, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    await captureDocumentToPdf(docType);
  };

  const handleManualCheckPayment = async () => {
    if (!sessionId || isVerifyingPayment) return;
    setIsVerifyingPayment(true);

    try {
      const res = await fetch(`/api/qris/status/${sessionId}?sessionId=${sessionId}`);

      if (res.ok) {
        const data = await res.json();
        if (data.isPaid === true && data.status === 'PAID') {
          handlePaymentSuccess();
          return;
        }
      }

      alert('Pembayaran belum terdeteksi. Silakan selesaikan transaksi pembayaran terlebih dahulu.');
    } catch (err) {
      console.error('Verifikasi pembayaran gagal:', err);
      alert('Gagal terhubung ke server verifikasi.');
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  const startPollingStatus = (currentSession: string) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/qris/status/${currentSession}?sessionId=${currentSession}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.isPaid === true && data.status === 'PAID') {
          handlePaymentSuccess();
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2500);
  };

  // PEMBAYARAN MAYAR EMBEDDED IFRAME
  const handleRequestQris = async () => {
    if (isLoadingQris) return;

    if (!receiptEmail.trim() || !isValidEmail(receiptEmail)) {
      setEmailError('Mohon masukkan alamat email yang valid (contoh: nama@email.com)');
      return;
    }

    setPaymentUrl(null);
    setMayarPaymentId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('spkinstan_active_payment');
    }

    setEmailError('');
    setIsLoadingQris(true);
    setPaidDocTarget(activeDocTab);

    setQrCodeData(null);

    const freshSessionId = generateNewSessionId();
    setSessionId(freshSessionId);
    setTimeLeft(899);

    const amount = selectedPackage === 'BUNDLING' ? 39999 : 19999;

    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        value: amount,
        currency: 'IDR',
      });
    }

    const currentDocDetails = docsData[activeDocTab];
    const targetName = receiptName.trim() || currentDocDetails.clientName || currentDocDetails.freelancerName || 'Pihak Kedua SPKInstan';
    const targetEmail = receiptEmail.trim();

    const targetMobile =
      currentDocDetails.clientWa.trim() ||
      currentDocDetails.freelancerWa.trim() ||
      '081234567890';

    try {
      const res = await fetch('/api/qris/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: freshSessionId,
          packageType: selectedPackage,
          amount,
          docType: activeDocTab,
          name: targetName,
          customerName: targetName,
          email: targetEmail,
          customerEmail: targetEmail,
          mobile: targetMobile,
          customerMobile: targetMobile,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const realMayarId = data.mayarPaymentId || data.paymentId || data.id || freshSessionId;
        setMayarPaymentId(realMayarId);

        if (data.paymentUrl) {
          setPaymentUrl(data.paymentUrl);
          setModalStep('qris');
          startPollingStatus(freshSessionId);
        }
      } else {
        console.error('Mayar Payment Error:', data.message);
        alert('Gagal membuat transaksi pembayaran: ' + (data.message || 'Terjadi kesalahan.'));
      }
    } catch (err) {
      console.error('Network error during Mayar payment generation:', err);
      alert('Gagal terhubung ke gateway pembayaran.');
    }
    setIsLoadingQris(false);
  };

  const formatRupiah = (val: string) => (val ? parseInt(val, 10).toLocaleString('id-ID') : '0');

  // HANDLER TANDA TANGAN DIGITAL PADA CANVAS
  const startDraw1 = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef1.current;
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
    setIsDrawing1(true);
  };

  const draw1 = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing1) return;
    const canvas = canvasRef1.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDraw1 = () => {
    if (isDrawing1 && canvasRef1.current) {
      handleDocInputChange(activeDocTab, 'signatureFirstParty', canvasRef1.current.toDataURL());
    }
    setIsDrawing1(false);
  };

  const clearSignature1 = () => {
    const canvas = canvasRef1.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    handleDocInputChange(activeDocTab, 'signatureFirstParty', null);
  };

  const startDraw2 = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef2.current;
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
    setIsDrawing2(true);
  };

  const draw2 = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing2) return;
    const canvas = canvasRef2.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDraw2 = () => {
    if (isDrawing2 && canvasRef2.current) {
      handleDocInputChange(activeDocTab, 'signatureSecondParty', canvasRef2.current.toDataURL());
    }
    setIsDrawing2(false);
  };

  const clearSignature2 = () => {
    const canvas = canvasRef2.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    handleDocInputChange(activeDocTab, 'signatureSecondParty', null);
  };

  const consumePaymentLicense = async (currentSessionId: string) => {
    try {
      await fetch('/api/qris/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId }),
      });
    } catch (err) {
      console.error('Gagal mengonsumsi lisensi di server:', err);
    }
  };

  const handleFreeDownload = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowCheckoutModal(false);
    captureDocumentToPdf(activeDocTab);
  };

  const handleFinishForm = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setMobileViewMode('preview');
    if (!paidDocs[activeDocTab]) {
      setModalStep('download_choice');
      setShowCheckoutModal(true);
    } else {
      setShowDownloadPopup(true);
    }
  };

  const wizardTitles = [
    'Identitas Para Pihak',
    'Detail Spesifik Dokumen',
    'Manajer Pasal Dinamis',
    'Legalisasi & Tanda Tangan'
  ];

  const isBundlingPackage = selectedPackage === 'BUNDLING' || (paidDocs.SPK && paidDocs.NDA && paidDocs.BAST);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans antialiased selection:bg-blue-100 selection:text-blue-700 pb-20 md:pb-0">

      <style>{`
        #a4-document-preview, .a4-page {
          font-family: 'Calibri', 'Carlito', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif !important;
        }

        @media print {
          body { display: none !important; }
        }
        ${!paidDocs[activeDocTab] ? `
        #a4-document-preview {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
        ` : ''}

        .a4-page.export-pdf-mode {
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          padding: 40px !important;
          box-sizing: border-box !important;
        }

        .a4-page.export-pdf-mode .space-y-4 > * + * {
          margin-top: 1rem !important;
        }
      `}</style>

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
              href={`https://wa.me/${adminWaNumber}?text=${encodeURIComponent("Halo Admin SPKInstan, saya butuh bantuan mengenai pembuatan dokumen.")}`}
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
        <section className="relative pt-8 pb-10 sm:pt-12 sm:pb-14 overflow-hidden bg-gradient-to-b from-white via-slate-50/50 to-slate-100/70 border-b border-slate-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.2] sm:leading-[1.15]">
                Generator Perjanjian Kerja Sama{' '}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Digital Resmi
                </span>
              </h1>

              <p className="text-slate-500 text-xs sm:text-sm md:text-base font-medium leading-relaxed max-w-xl mx-auto">
                SPKInstan adalah platform LegalTech berbasis web yang membantu freelancer, creator, dan agensi mikro membuat dokumen perjanjian kerja sama (SPK, NDA, dan BAST) berstandar hukum perdata Indonesia secara instan, tanpa perlu login atau registrasi.
              </p>

              <div className="pt-2 flex items-center justify-center">
                <div className="flex flex-col sm:flex-row p-1.5 bg-slate-200/70 rounded-2xl sm:rounded-full w-full sm:w-auto shadow-inner border border-slate-300/40 gap-1.5 sm:gap-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPackage('SINGLE');
                      setPaymentUrl(null);
                      setMayarPaymentId(null);
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('spkinstan_active_payment');
                      }
                    }}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl sm:rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 text-center ${
                      selectedPackage === 'SINGLE'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Dokumen Satuan — Rp 19.999
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPackage('BUNDLING');
                      setPaymentUrl(null);
                      setMayarPaymentId(null);
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('spkinstan_active_payment');
                      }
                    }}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl sm:rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                      selectedPackage === 'BUNDLING'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Paket Bundling Proteksi (3-in-1) — Rp 39.999</span>
                    <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider whitespace-nowrap">
                      HEMAT 33%
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Editor Workspace Section */}
        <section id="editor" className="py-8 sm:py-10 bg-slate-100/70 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

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
                </div>

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
                  {currentWizardStep === 1 && (
                    <div className="space-y-4">
                      {/* Grid Input Nomor Dokumen & Tanggal Kustom (Multi-Doc State Terisolasi) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nomor Dokumen / Surat ({activeDocTab})
                          </label>
                          <input
                            type="text"
                            autoComplete="off"
                            value={docsData[activeDocTab].docNumber}
                            onChange={(e) => handleDocInputChange(activeDocTab, 'docNumber', e.target.value)}
                            placeholder={`cth: 001/${activeDocTab}/IX/2026`}
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Tanggal Dokumen / Surat
                          </label>
                          <input
                            type="date"
                            autoComplete="off"
                            value={docsData[activeDocTab].docDate}
                            onChange={(e) => handleDocInputChange(activeDocTab, 'docDate', e.target.value)}
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                          />
                        </div>
                      </div>

                      {/* PIHAK PERTAMA */}
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                          <User className="w-3.5 h-3.5" /> Pihak Pertama ({activeDocTab})
                        </h4>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nama Lengkap / Nama Perusahaan
                          </label>
                          <input
                            type="text"
                            autoComplete="off"
                            value={docsData[activeDocTab].freelancerName}
                            onChange={(e) => handleDocInputChange(activeDocTab, 'freelancerName', e.target.value)}
                            placeholder="cth: Budi Santoso"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                          <input
                            type="email"
                            autoComplete="off"
                            value={docsData[activeDocTab].freelancerEmail}
                            onChange={(e) => handleDocInputChange(activeDocTab, 'freelancerEmail', e.target.value)}
                            placeholder="cth: budi@gmail.com"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor WhatsApp</label>
                          <input
                            type="text"
                            autoComplete="off"
                            value={docsData[activeDocTab].freelancerWa}
                            onChange={(e) => handleDocInputChange(activeDocTab, 'freelancerWa', e.target.value)}
                            placeholder="cth: 081234567890"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                          />
                        </div>
                      </div>

                      {/* PIHAK KEDUA */}
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" /> Pihak Kedua ({activeDocTab})
                        </h4>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nama Lengkap / Nama Perusahaan
                          </label>
                          <input
                            type="text"
                            autoComplete="off"
                            value={docsData[activeDocTab].clientName}
                            onChange={(e) => handleDocInputChange(activeDocTab, 'clientName', e.target.value)}
                            placeholder="cth: PT Digital Inovasi Nusantara"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor WhatsApp</label>
                          <input
                            type="text"
                            autoComplete="off"
                            value={docsData[activeDocTab].clientWa}
                            onChange={(e) => handleDocInputChange(activeDocTab, 'clientWa', e.target.value)}
                            placeholder="cth: 089876543210"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {currentWizardStep === 2 && (
                    <div className="space-y-4">
                      {activeDocTab === 'SPK' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Pekerjaan / Proyek (SPK)</label>
                            <input
                              type="text"
                              autoComplete="off"
                              value={docsData.SPK.projectTitle}
                              onChange={(e) => handleDocInputChange('SPK', 'projectTitle', e.target.value)}
                              placeholder="cth: Pengembangan Aplikasi Web Dashboard"
                              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">Nilai Imbalan (Rp)</label>
                              <input
                                type="number"
                                autoComplete="off"
                                value={docsData.SPK.projectAmount}
                                onChange={(e) => handleDocInputChange('SPK', 'projectAmount', e.target.value)}
                                placeholder="cth: 7500000"
                                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">Uang Muka DP (%)</label>
                              <input
                                type="number"
                                autoComplete="off"
                                value={docsData.SPK.dpPercent}
                                onChange={(e) => handleDocInputChange('SPK', 'dpPercent', e.target.value)}
                                placeholder="cth: 50"
                                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Rekening Tujuan Pelunasan</label>
                            <input
                              type="text"
                              autoComplete="off"
                              value={docsData.SPK.bankInfo}
                              onChange={(e) => handleDocInputChange('SPK', 'bankInfo', e.target.value)}
                              placeholder="cth: BCA 1234567890 a.n Budi Santoso"
                              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                            />
                          </div>
                        </div>
                      )}

                      {activeDocTab === 'NDA' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Judul / Perihal Kerahasiaan (NDA)</label>
                            <input
                              type="text"
                              autoComplete="off"
                              value={docsData.NDA.projectTitle}
                              onChange={(e) => handleDocInputChange('NDA', 'projectTitle', e.target.value)}
                              placeholder="cth: Kerahasiaan Source Code & Database"
                              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Cakupan Informasi Rahasia</label>
                            <input
                              type="text"
                              autoComplete="off"
                              value={docsData.NDA.ndaScope}
                              onChange={(e) => handleDocInputChange('NDA', 'ndaScope', e.target.value)}
                              placeholder="cth: Source Code, Skema Database, Aset Desain"
                              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">Masa Kerahasiaan (Tahun)</label>
                              <input
                                type="number"
                                autoComplete="off"
                                value={docsData.NDA.ndaYears}
                                onChange={(e) => handleDocInputChange('NDA', 'ndaYears', e.target.value)}
                                placeholder="cth: 2"
                                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">Denda Pelanggaran (Rp)</label>
                              <input
                                type="number"
                                autoComplete="off"
                                value={docsData.NDA.ndaPenalty}
                                onChange={(e) => handleDocInputChange('NDA', 'ndaPenalty', e.target.value)}
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
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Serah Terima (BAST)</label>
                            <input
                              type="text"
                              autoComplete="off"
                              value={docsData.BAST.projectTitle}
                              onChange={(e) => handleDocInputChange('BAST', 'projectTitle', e.target.value)}
                              placeholder="cth: Serah Terima Pekerjaan Web Dashboard"
                              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Referensi SPK Utama</label>
                            <input
                              type="text"
                              autoComplete="off"
                              value={docsData.BAST.bastRef}
                              onChange={(e) => handleDocInputChange('BAST', 'bastRef', e.target.value)}
                              placeholder="cth: 001/SPK/IX/2026"
                              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">Masa Garansi Bug (Hari)</label>
                              <input
                                type="number"
                                autoComplete="off"
                                value={docsData.BAST.bastWarranty}
                                onChange={(e) => handleDocInputChange('BAST', 'bastWarranty', e.target.value)}
                                placeholder="cth: 14"
                                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Serah Terima</label>
                              <input
                                type="date"
                                autoComplete="off"
                                value={docsData.BAST.bastDate}
                                onChange={(e) => handleDocInputChange('BAST', 'bastDate', e.target.value)}
                                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {currentWizardStep === 3 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                          3. Modifikasi Pasal ({activeDocTab})
                        </label>
                      </div>

                      <div className="p-2 bg-slate-100 rounded-2xl border border-slate-200/80 space-y-1.5">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block px-1 flex items-center gap-1">
                          <Sliders className="w-3 h-3 text-blue-600" /> Preset Akselerator:
                        </span>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            type="button"
                            onClick={() => handleApplyPreset('web')}
                            className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all ${
                              activePreset === 'web'
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            Preset Web/App
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPreset('design')}
                            className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all ${
                              activePreset === 'design'
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            Preset Desain
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPreset('all')}
                            className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all ${
                              activePreset === 'all'
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            Aktifkan Semua
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                        {clauses
                          .filter((c) => c.docType === activeDocTab)
                          .map((clause) => (
                            <div
                              key={clause.id}
                              className={`p-3 rounded-2xl border transition-all space-y-2 ${
                                clause.isEnabled
                                  ? 'bg-white border-slate-200 shadow-xs'
                                  : 'bg-slate-50/70 border-slate-200/60 opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={clause.isEnabled}
                                    onChange={() => handleToggleClause(clause.id)}
                                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                  />
                                  <span className="text-xs font-bold text-slate-900">
                                    {clause.isEnabled ? 'Aktif' : 'Nonaktif'}
                                  </span>
                                </label>
                                {clause.isCustom && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveClause(clause.id)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              <input
                                type="text"
                                autoComplete="off"
                                value={clause.title}
                                onChange={(e) => handleUpdateClauseTitle(clause.id, e.target.value)}
                                placeholder="Judul Pasal"
                                className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg"
                              />

                              <textarea
                                rows={2}
                                value={clause.content}
                                onChange={(e) => handleUpdateClauseContent(clause.id, e.target.value)}
                                placeholder="Isi pasal..."
                                className="w-full px-2.5 py-1.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg leading-relaxed"
                              />
                            </div>
                          ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleAddCustomClause}
                        className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-xl border border-blue-200 flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Tambah Pasal Khusus ({activeDocTab})</span>
                      </button>
                    </div>
                  )}

                  {currentWizardStep === 4 && (
                    <div className="space-y-5">
                      <div className="space-y-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                          <User className="w-3.5 h-3.5" /> Penandatangan Pihak Pertama ({activeDocTab})
                        </h4>
                        <div>
                          <input
                            type="text"
                            autoComplete="off"
                            value={docsData[activeDocTab].signerFirstParty}
                            onChange={(e) => handleDocInputChange(activeDocTab, 'signerFirstParty', e.target.value)}
                            placeholder={docsData[activeDocTab].freelancerName || 'cth: Budi Santoso'}
                            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium"
                          />
                        </div>

                        <div className="space-y-2 pt-1">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            TTD Pihak Pertama ({activeDocTab})
                          </label>
                          <canvas
                            ref={canvasRef1}
                            width={300}
                            height={100}
                            onMouseDown={startDraw1}
                            onMouseMove={draw1}
                            onMouseUp={stopDraw1}
                            onTouchStart={startDraw1}
                            onTouchMove={draw1}
                            onTouchEnd={stopDraw1}
                            className="w-full h-24 bg-white rounded-xl border border-slate-200 cursor-crosshair touch-none"
                          />
                          <div className="flex items-center justify-between text-xs">
                            <button type="button" onClick={clearSignature1} className="text-slate-500 hover:text-red-600 flex items-center gap-1 font-semibold text-[11px]">
                              <RotateCcw className="w-3 h-3" /> Hapus
                            </button>
                            <label className="cursor-pointer text-blue-600 hover:text-blue-800 font-bold text-[11px]">
                              <span>📁 Upload TTD</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => handleDocInputChange(activeDocTab, 'signatureFirstParty', event.target?.result as string);
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" /> Penandatangan Pihak Kedua ({activeDocTab})
                        </h4>
                        <div>
                          <input
                            type="text"
                            autoComplete="off"
                            value={docsData[activeDocTab].signerSecondParty}
                            onChange={(e) => handleDocInputChange(activeDocTab, 'signerSecondParty', e.target.value)}
                            placeholder={docsData[activeDocTab].clientName || 'cth: Nama Direktur'}
                            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium"
                          />
                        </div>

                        <div className="space-y-2 pt-1">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            TTD Pihak Kedua ({activeDocTab})
                          </label>
                          <canvas
                            ref={canvasRef2}
                            width={300}
                            height={100}
                            onMouseDown={startDraw2}
                            onMouseMove={draw2}
                            onMouseUp={stopDraw2}
                            onTouchStart={startDraw2}
                            onTouchMove={draw2}
                            onTouchEnd={stopDraw2}
                            className="w-full h-24 bg-white rounded-xl border border-slate-200 cursor-crosshair touch-none"
                          />
                          <div className="flex items-center justify-between text-xs">
                            <button type="button" onClick={clearSignature2} className="text-slate-500 hover:text-red-600 flex items-center gap-1 font-semibold text-[11px]">
                              <RotateCcw className="w-3 h-3" /> Hapus
                            </button>
                            <label className="cursor-pointer text-indigo-600 hover:text-indigo-800 font-bold text-[11px]">
                              <span>📁 Upload TTD</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => handleDocInputChange(activeDocTab, 'signatureSecondParty', event.target?.result as string);
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={currentWizardStep === 1}
                      onClick={() => setCurrentWizardStep((p) => p - 1)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                    >
                      Kembali
                    </button>
                    {currentWizardStep < 4 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentWizardStep((p) => p + 1)}
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                      >
                        Lanjut
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleFinishForm}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <Download className="w-4 h-4" />
                        <span>Selesai & Unduh Dokumen</span>
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* RIGHT COLUMN: Live Preview A4 Mutlak (794px x 1123px) */}
              <div
                className={`lg:col-span-7 space-y-4 ${
                  mobileViewMode === 'form' ? 'hidden lg:block' : 'block'
                }`}
              >
                <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Preview Dokumen ({totalPages} Halaman A4)
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    <Shield className="w-3 h-3 text-blue-600" />
                    Proteksi Active
                  </span>
                </div>

                <div className="w-full bg-slate-300/40 p-2 sm:p-6 rounded-3xl border border-slate-200 flex justify-center items-center overflow-x-auto pb-4">
                  <div
                    id="a4-document-preview"
                    className={`flex flex-col gap-8 items-center w-full max-w-[794px] ${
                      !paidDocs[activeDocTab] ? 'select-none' : ''
                    }`}
                  >
                    {/* HALAMAN 1 */}
                    <div className="a4-page w-full max-w-[794px] min-h-[1123px] h-auto bg-white text-slate-900 p-6 sm:p-8 relative flex flex-col justify-between shadow-xl rounded-xl border border-slate-200 shrink-0">
                      {!paidDocs[activeDocTab] && (
                        <div className="watermark-layer absolute inset-0 pointer-events-none z-20 flex items-center justify-center overflow-hidden">
                          <span className="text-4xl sm:text-6xl font-black tracking-[0.15em] text-slate-300/25 select-none -rotate-12 transform">
                            spkinstan.my.id
                          </span>
                        </div>
                      )}

                      <div
                        ref={needsPage2 ? page1MainContentRef : page1ContentRef}
                        className="space-y-3 sm:space-y-3.5 text-[12px] sm:text-[13px] leading-[1.5] text-slate-700 relative z-10"
                      >
                        <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 w-full rounded-full shadow-xs mb-3" />

                        {/* Standard Typo Header Metadata */}
                        <div className="flex items-start justify-between pb-2.5 border-b border-slate-200/80 gap-4">
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-bold tracking-widest text-blue-600 uppercase">
                              Pihak Pertama
                            </span>
                            <h1 className="text-[15px] sm:text-[16px] font-extrabold text-slate-900">
                              {docsData[activeDocTab].freelancerName || 'Nama Pihak Pertama'}
                            </h1>
                            {docsData[activeDocTab].freelancerEmail && <p className="text-[11px] text-slate-500">{docsData[activeDocTab].freelancerEmail}</p>}
                          </div>

                          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 sm:p-2.5 text-right space-y-0.5 min-w-[140px] sm:min-w-[170px]">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              Nomor Dokumen
                            </p>
                            <p className="font-mono text-[12px] sm:text-[13px] font-extrabold text-slate-900">
                              {docsData[activeDocTab].docNumber || `001/${activeDocTab}/IX/2026`}
                            </p>
                            <p className="text-[11px] text-slate-500 pt-0.5">
                              {formatIndonesianDate(docsData[activeDocTab].docDate)}
                            </p>
                          </div>
                        </div>

                        {/* Standard Typo Judul Utama Dokumen */}
                        <div className="border-l-4 border-blue-600 pl-3 sm:pl-4 py-0.5">
                          <h2 className="text-[18px] sm:text-[20px] font-extrabold tracking-wide text-slate-900 uppercase">
                            {activeDocTab === 'SPK' && 'PERJANJIAN KERJA SAMA PEKERJAAN JASA'}
                            {activeDocTab === 'NDA' && 'PERJANJIAN KERAHASIAAN INFORMASI (NDA)'}
                            {activeDocTab === 'BAST' && 'BERITA ACARA SERAH TERIMA PEKERJAAN (BAST)'}
                          </h2>
                        </div>

                        {/* Standard Typo Identitas Pihak */}
                        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-2.5 sm:p-3 space-y-1.5">
                          <p className="text-slate-700 text-[12px] sm:text-[13px]">
                            Pada hari ini, <strong>{formatIndonesianDate(docsData[activeDocTab].docDate)}</strong>, kami yang bertanda tangan di bawah ini secara sadar sepakat mengikatkan diri dalam perikatan hukum:
                          </p>
                          <div className="grid grid-cols-2 gap-2 pt-0.5">
                            <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                              <span className="text-[11px] font-bold text-blue-600 uppercase block">PIHAK PERTAMA</span>
                              <span className="font-semibold text-slate-900 text-[12px] sm:text-[13px]">{docsData[activeDocTab].freelancerName || '-'}</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                              <span className="text-[11px] font-bold text-indigo-600 uppercase block">PIHAK KEDUA</span>
                              <span className="font-semibold text-slate-900 text-[12px] sm:text-[13px]">{docsData[activeDocTab].clientName || '-'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Standard Typo Judul Pasal & Isi Teks */}
                        <div className="space-y-2 sm:space-y-2.5">
                          {page1Clauses.map((clause, index) => (
                            <div key={clause.id} className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                              <h3 className="text-[14px] sm:text-[15px] font-bold text-slate-900 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-600" />
                                {activeDocTab === 'BAST' ? `Poin ${index + 1} — ${clause.title}` : `Pasal ${index + 1} — ${clause.title}`}
                              </h3>
                              <p className="text-slate-700 pl-3.5 text-[12px] sm:text-[13px] leading-[1.5]">
                                {clause.content}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* RENDER AREA TTD BERSIH */}
                        {!needsPage2 && (
                          <div className="pt-2 sm:pt-3 grid grid-cols-2 gap-3 sm:gap-4 text-center">
                            <div className="p-2.5 sm:p-3 space-y-1.5 min-h-[100px] flex flex-col justify-between">
                              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                                PIHAK PERTAMA
                              </span>
                              <div className="h-10 sm:h-12 flex items-center justify-center">
                                {docsData[activeDocTab].signatureFirstParty && (
                                  <img src={docsData[activeDocTab].signatureFirstParty!} alt="TTD Pihak Pertama" className="max-h-8 sm:max-h-12 mx-auto object-contain" />
                                )}
                              </div>
                              <p className="font-bold underline text-slate-900 text-[12px] sm:text-[13px]">
                                {docsData[activeDocTab].signerFirstParty || docsData[activeDocTab].freelancerName || 'Pihak Pertama'}
                              </p>
                            </div>

                            <div className="p-2.5 sm:p-3 space-y-1.5 min-h-[100px] flex flex-col justify-between">
                              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
                                PIHAK KEDUA
                              </span>
                              <div className="h-10 sm:h-12 flex items-center justify-center">
                                {docsData[activeDocTab].signatureSecondParty && (
                                  <img src={docsData[activeDocTab].signatureSecondParty!} alt="TTD Pihak Kedua" className="max-h-8 sm:max-h-12 mx-auto object-contain" />
                                )}
                              </div>
                              <p className="font-bold underline text-slate-900 text-[12px] sm:text-[13px]">
                                {docsData[activeDocTab].signerSecondParty || docsData[activeDocTab].clientName || 'Pihak Kedua'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[10px] sm:text-[11px] text-slate-500 font-mono">
                        <span>Hal 1 dari {totalPages}</span>
                      </div>
                    </div>

                    {/* HALAMAN 2 */}
                    {needsPage2 && (
                      <div className="a4-page w-full max-w-[794px] min-h-[1123px] h-auto bg-white text-slate-900 p-6 sm:p-8 relative flex flex-col justify-between shadow-xl rounded-xl border border-slate-200 shrink-0">
                        {!paidDocs[activeDocTab] && (
                          <div className="watermark-layer absolute inset-0 pointer-events-none z-20 flex items-center justify-center overflow-hidden">
                            <span className="text-4xl sm:text-6xl font-black tracking-[0.15em] text-slate-300/25 select-none -rotate-12 transform">
                              spkinstan.my.id
                            </span>
                          </div>
                        )}

                        <div ref={page2ContentRef} className="space-y-3 sm:space-y-3.5 text-[12px] sm:text-[13px] leading-[1.5] text-slate-700 relative z-10">
                          <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 w-full rounded-full shadow-xs mb-4" />

                          {page2Clauses.length > 0 && (
                            <div className="space-y-2 sm:space-y-2.5 mb-4">
                              {page2Clauses.map((clause, index) => (
                                <div key={clause.id} className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                                  <h3 className="text-[14px] sm:text-[15px] font-bold text-slate-900 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                                    {activeDocTab === 'BAST' ? `Poin ${index + page1Clauses.length + 1} — ${clause.title}` : `Pasal ${index + page1Clauses.length + 1} — ${clause.title}`}
                                  </h3>
                                  <p className="text-slate-700 pl-3.5 text-[12px] sm:text-[13px] leading-[1.5]">
                                    {clause.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="bg-slate-50/80 p-3 sm:p-4 rounded-xl border border-slate-200/80 space-y-1">
                            <h3 className="text-[13px] sm:text-[14px] font-bold text-slate-900 uppercase">
                              LEMBAR PENGESAHAN & PENANDATANGANAN
                            </h3>
                            <p className="text-slate-700 text-[12px] sm:text-[13px]">
                              Demikian Perjanjian ini dibuat dan disepakati oleh Para Pihak dalam keadaan sadar tanpa paksaan untuk dipergunakan sebagaimana mestinya.
                            </p>
                          </div>

                          {/* RENDER AREA TTD BERSIH HALAMAN 2 */}
                          <div className="pt-4 sm:pt-6 grid grid-cols-2 gap-3 sm:gap-4 text-center">
                            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 min-h-[120px] flex flex-col justify-between">
                              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                                PIHAK PERTAMA
                              </span>
                              <div className="h-10 sm:h-14 flex items-center justify-center">
                                {docsData[activeDocTab].signatureFirstParty && (
                                  <img src={docsData[activeDocTab].signatureFirstParty!} alt="TTD Pihak Pertama" className="max-h-10 sm:max-h-14 mx-auto object-contain" />
                                )}
                              </div>
                              <p className="font-bold underline text-slate-900 text-[12px] sm:text-[13px]">
                                {docsData[activeDocTab].signerFirstParty || docsData[activeDocTab].freelancerName || 'Pihak Pertama'}
                              </p>
                            </div>

                            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 min-h-[120px] flex flex-col justify-between">
                              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
                                PIHAK KEDUA
                              </span>
                              <div className="h-10 sm:h-14 flex items-center justify-center">
                                {docsData[activeDocTab].signatureSecondParty && (
                                  <img src={docsData[activeDocTab].signatureSecondParty!} alt="TTD Pihak Kedua" className="max-h-10 sm:max-h-14 mx-auto object-contain" />
                                )}
                              </div>
                              <p className="font-bold underline text-slate-900 text-[12px] sm:text-[13px]">
                                {docsData[activeDocTab].signerSecondParty || docsData[activeDocTab].clientName || 'Pihak Kedua'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[10px] sm:text-[11px] text-slate-500 font-mono">
                          <span>Hal 2 dari 2</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="w-full sm:w-auto text-center sm:text-left">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Status Draf Dokumen
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
                      onClick={(e) => handleFreeDownload(e)}
                      className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-full text-xs flex items-center justify-center gap-1.5 border border-slate-300 transition-all"
                    >
                      <Download className="w-4 h-4 text-slate-600" />
                      <span>Download Draf Watermark</span>
                    </button>

                    {paidDocs[activeDocTab] ? (
                      <button
                        type="button"
                        onClick={() => setShowDownloadPopup(true)}
                        className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs shadow-md flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Download className="w-4 h-4" />
                        <span>Buka Pusat Unduhan PRO</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setModalStep('download_choice');
                          setShowCheckoutModal(true);
                        }}
                        className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs shadow-md flex items-center justify-center gap-1.5 transition-all"
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
                Forum Testimoni Pengguna
              </h3>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Ulasan Terverifikasi
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.length === 0 ? (
                <a
                  href={`https://wa.me/${adminWaNumber}?text=${encodeURIComponent("Halo Admin SPKInstan, saya ingin memberikan testimoni/ulasan penggunaan SPKInstan:\n\nNama/Usaha: \nRating (1-5): \nUlasan: ")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="md:col-span-3 bg-slate-50 hover:bg-blue-50/50 p-8 rounded-3xl border border-dashed border-slate-300 hover:border-blue-400 text-center space-y-2 max-w-xl mx-auto block cursor-pointer transition-all duration-200 group shadow-xs hover:shadow-md"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center mx-auto transition-colors duration-200">
                    <MessageSquarePlus className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                    Belum Ada Testimoni Pengguna
                  </h4>
                  <p className="text-xs text-slate-500 group-hover:text-slate-600 leading-relaxed">
                    Jadilah pengguna pertama yang membagikan ulasan setelah mengunduh dokumen legal Anda.{' '}
                    <span className="font-semibold text-blue-600 group-hover:underline block sm:inline mt-1 sm:mt-0">
                      Klik di sini untuk kirim ulasan via WhatsApp &rarr;
                    </span>
                  </p>
                </a>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-3">
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

      {/* POPUP OVERLAY PUSAT UNDUHAN PERSISTEN PASCA-BAYAR */}
      {showDownloadPopup && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-2xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 my-8 relative animate-in fade-in zoom-in-95 duration-200">

            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shrink-0">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    Status Pembayaran: LUNAS
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Watermark telah dilepas. Silakan unduh dokumen resmi Anda di bawah ini.
                  </p>
                </div>
              </div>
            </div>

            {/* BANNER CATATAN PERINGATAN PENTING */}
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-left space-y-1.5">
              <div className="flex items-center gap-2 font-extrabold text-amber-900 text-xs sm:text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>PENTING: Segera Unduh & Simpan Dokumen Anda!</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                Satu sesi transaksi berlaku khusus untuk mengunduh versi PDF Clean. Jangan klik tombol <strong>"Selesai & Tutup Dokumen"</strong> sebelum Anda selesai mengunduh seluruh berkas PDF yang dibutuhkan.
              </p>
              <p className="text-xs text-amber-900 font-semibold leading-relaxed border-t border-amber-200/60 pt-1.5 mt-1">
                ⚠️ <strong>PERHATIAN:</strong> Apabila Anda menutup jendela ini sebelum mengunduh, file PDF akan <strong>otomatis hangus</strong>. Admin <strong>tidak dapat mengirimkan file secara manual</strong> karena SPKInstan berbasis <em>Zero Database & Tanpa Login</em> sehingga data dokumen Anda tidak disimpan di server demi menjaga privasi penuh.
              </p>
            </div>

            {/* PUSAT UNDUHAN (BUNDLING / SATUAN) */}
            {isBundlingPackage ? (
              <div className="space-y-4">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={(e) => handleDownloadAllBundling(e)}
                  className="w-full py-4 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-extrabold rounded-2xl text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2.5 transition active:scale-[0.98]"
                >
                  {processingDoc === 'ALL' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>MENGUNDUH PAKET BUNDLING (SPK, NDA, BAST)...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>UNDUH SEMUA 3 DOKUMEN SEKALIGUS (BUNDLING)</span>
                    </>
                  )}
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Atau Unduh File Satu per Satu
                  </span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* SPK */}
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={(e) => handleIndividualDownload('SPK', e)}
                    className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
                      downloadedDocs.SPK
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                        : 'bg-slate-50 hover:bg-white border-slate-200 text-slate-800 shadow-xs'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" /> SPK
                    </span>
                    {processingDoc === 'SPK' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    ) : downloadedDocs.SPK ? (
                      <span className="text-emerald-700 font-bold">✓ Terunduh</span>
                    ) : (
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                    )}
                  </button>

                  {/* NDA */}
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={(e) => handleIndividualDownload('NDA', e)}
                    className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
                      downloadedDocs.NDA
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                        : 'bg-slate-50 hover:bg-white border-slate-200 text-slate-800 shadow-xs'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-indigo-600" /> NDA
                    </span>
                    {processingDoc === 'NDA' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    ) : downloadedDocs.NDA ? (
                      <span className="text-emerald-700 font-bold">✓ Terunduh</span>
                    ) : (
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                  </button>

                  {/* BAST */}
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={(e) => handleIndividualDownload('BAST', e)}
                    className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
                      downloadedDocs.BAST
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                        : 'bg-slate-50 hover:bg-white border-slate-200 text-slate-800 shadow-xs'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-purple-600" /> BAST
                    </span>
                    {processingDoc === 'BAST' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                    ) : downloadedDocs.BAST ? (
                      <span className="text-emerald-700 font-bold">✓ Terunduh</span>
                    ) : (
                      <Download className="w-3.5 h-3.5 text-purple-600" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* DOKUMEN SATUAN */
              <div>
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={(e) => handleIndividualDownload(paidDocTarget, e)}
                  className={`w-full py-4 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition border ${
                    downloadedDocs[paidDocTarget]
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg'
                  }`}
                >
                  {processingDoc === paidDocTarget ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memproses PDF {paidDocTarget}...</span>
                    </>
                  ) : downloadedDocs[paidDocTarget] ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-700" />
                      <span>✓ TERUNDUH — KLIK UNTUK UNDUH ULANG ({paidDocTarget})</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>UNDUH PDF CLEAN ({paidDocTarget})</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* KARTU AJAKAN TESTIMONI VIA WA */}
            <div className="pt-2">
              <a
                href={`https://wa.me/${adminWaNumber}?text=${encodeURIComponent("Halo Admin SPKInstan, saya ingin memberikan testimoni/ulasan penggunaan SPKInstan:\n\nNama/Usaha: \nRating (1-5): \nUlasan: ")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Star className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-700">Puas dengan Hasilnya?</h4>
                    <p className="text-xs text-slate-500">Bantu pengguna lain dengan memberikan testimoni singkat via WhatsApp</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-600 flex items-center gap-1 shrink-0 bg-white px-3 py-1.5 rounded-xl border border-blue-200 shadow-xs">
                  <MessageCircle className="w-4 h-4" /> Kirim Ulasan via WA &rarr;
                </span>
              </a>
            </div>

            {/* TOMBOL UNTUK MENUTUP POPUP */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleManualClosePopup}
                className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2"
              >
                <span>Selesai & Tutup Dokumen</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* INTEGRATED PAYMENT MODAL WITH EMBEDDED IFRAME */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-xl w-full rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 my-8 relative">

            {/* STEP 1: PEMILIHAN PAKET LISENSI & KONFIRMASI PEMBAYAR */}
            {modalStep === 'download_choice' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <span className="text-xs font-extrabold text-slate-900 uppercase">
                      Pilih Paket & Konfirmasi Pembayar
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* FORM KONFIRMASI EMAIL & NAMA PENERIMA KUITANSI */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-left">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Konfirmasi Penerima Nota/Kuitansi Pembayaran
                  </span>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-blue-600" /> Email Penerima Kuitansi Mayar <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      autoComplete="off"
                      value={receiptEmail}
                      onChange={(e) => {
                        setReceiptEmail(e.target.value);
                        setPaymentUrl(null);
                        setMayarPaymentId(null);
                        if (typeof window !== 'undefined') {
                          localStorage.removeItem('spkinstan_active_payment');
                        }
                        if (emailError) setEmailError('');
                      }}
                      placeholder="cth: emailpembayar@gmail.com"
                      className={`w-full px-3 py-2 text-xs bg-white border rounded-xl focus:outline-none transition ${
                        emailError ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600'
                      }`}
                    />
                    {emailError && (
                      <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                        ⚠ {emailError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                      <User className="w-3 h-3 text-blue-600" /> Nama Penerima Kuitansi / Invoice
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={receiptName}
                      onChange={(e) => {
                        setReceiptName(e.target.value);
                        setPaymentUrl(null);
                        setMayarPaymentId(null);
                        if (typeof window !== 'undefined') {
                          localStorage.removeItem('spkinstan_active_payment');
                        }
                      }}
                      placeholder="cth: Budi Santoso / PT Digital Inovasi"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl border-2 border-emerald-500/80 bg-emerald-50/40 space-y-3">
                    <div className="space-y-2 pt-1">
                      <div
                        onClick={() => {
                          setSelectedPackage('SINGLE');
                          setPaymentUrl(null);
                          setMayarPaymentId(null);
                          if (typeof window !== 'undefined') {
                            localStorage.removeItem('spkinstan_active_payment');
                          }
                        }}
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
                        <span className="font-extrabold text-slate-900 text-sm">Rp 19.999</span>
                      </div>

                      <div
                        onClick={() => {
                          setSelectedPackage('BUNDLING');
                          setPaymentUrl(null);
                          setMayarPaymentId(null);
                          if (typeof window !== 'undefined') {
                            localStorage.removeItem('spkinstan_active_payment');
                          }
                        }}
                        className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                          selectedPackage === 'BUNDLING'
                            ? 'bg-white border-emerald-600 font-bold shadow-sm'
                            : 'bg-white/60 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">Paket Bundling Proteksi 3-in-1</span>
                            <span className="bg-amber-500 text-white text-[9px] px-1 py-0.5 rounded font-black uppercase">
                              HEMAT 33%
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-normal">Unduh sekaligus 3 Dokumen (SPK + NDA + BAST)</span>
                        </div>
                        <span className="font-extrabold text-emerald-700 text-sm">Rp 39.999</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isLoadingQris || !receiptEmail.trim() || !isValidEmail(receiptEmail)}
                      onClick={handleRequestQris}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      {isLoadingQris ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Unlock className="w-4 h-4" />
                      )}
                      <span>
                        {isLoadingQris
                          ? 'Menyiapkan Pembayaran...'
                          : `Buka Tagihan Pembayaran (${selectedPackage === 'BUNDLING' ? 'Rp 39.999' : 'Rp 19.999'})`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: EMBEDDED MAYAR IFRAME & IN-PAGE VERIFICATION */}
            {modalStep === 'qris' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs font-extrabold text-slate-900 uppercase">
                      Pembayaran Mayar Gateway (In-Page)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* BANNER CATATAN PERINGATAN TEGAS */}
                <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-left space-y-1">
                  <div className="flex items-center gap-1.5 font-extrabold text-amber-900 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>PENTING: JANGAN TUTUP / REFRESH MODAL INI</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                    Selesaikan pembayaran langsung pada tampilan tagihan di bawah ini. Begitu pembayaran terkonfirmasi, modal akan otomatis tertutup dan halaman langsung membuka akses PDF Clean Anda.
                  </p>
                </div>

                {/* EMBEDDED IFRAME TAGIHAN MAYAR */}
                {paymentUrl ? (
                  <div className="w-full h-[460px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 relative">
                    <iframe
                      src={paymentUrl}
                      className="w-full h-full border-0"
                      title="Pembayaran Mayar Gateway"
                    />
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-xs text-slate-500 font-medium">Memuat Tagihan Mayar...</p>
                  </div>
                )}

                {/* CONTROLS VERIFIKASI STATUS */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalStep('download_choice')}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    &larr; Ganti Paket
                  </button>

                  <button
                    type="button"
                    disabled={isVerifyingPayment}
                    onClick={handleManualCheckPayment}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm"
                  >
                    {isVerifyingPayment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span>Cek Status Pembayaran Manual</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Floating WhatsApp Widget */}
      <a
        href={`https://wa.me/${adminWaNumber}?text=${encodeURIComponent("Halo Admin SPKInstan, saya butuh bantuan mengenai pembuatan dokumen.")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 md:bottom-6 right-6 z-50 bg-emerald-500 hover:bg-emerald-600 text-white p-3.5 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        aria-label="Chat WhatsApp Admin"
      >
        <MessageCircle className="w-6 h-6" />
      </a>

      {/* Mobile Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 z-30 shadow-lg flex gap-2">
        <button
          type="button"
          onClick={(e) => handleFreeDownload(e)}
          className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-full text-xs flex items-center justify-center gap-1 border border-slate-300"
        >
          <Download className="w-3.5 h-3.5 text-slate-600" />
          <span>Draf Watermark</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (paidDocs[activeDocTab]) {
              setShowDownloadPopup(true);
            } else {
              setModalStep('download_choice');
              setShowCheckoutModal(true);
            }
          }}
          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs shadow-md flex items-center justify-center gap-1"
        >
          <Unlock className="w-3.5 h-3.5" />
          <span>{paidDocs[activeDocTab] ? 'Pusat Unduhan PRO' : 'Versi Pro (Clean)'}</span>
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
                Platform generator perjanjian legal perdata instan bagi profesional & agensi mikro Indonesia.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
                Landasan Hukum
              </h4>
              <ul className="space-y-2 text-xs">
                <li>Pasal 1320 & 1338 KUHPerdata</li>
                <li>UU No. 28/2014 (Hak Cipta)</li>
                <li>UU No. 30/2000 (Rahasia Dagang)</li>
                <li>UU No. 27/2022 (Pelindungan Data)</li>
                <li>UU No. 1/2024 (ITE & Kontrak Digital)</li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
                Keamanan
              </h4>
              <ul className="space-y-2 text-xs">
                <li>Zero Database (Strict Local Privacy)</li>
                <li>Tanda Tangan Digital & Fisik Manual</li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
                Dukungan
              </h4>
              <a
                href={`https://wa.me/${adminWaNumber}?text=${encodeURIComponent("Halo Admin SPKInstan, saya butuh bantuan mengenai pembuatan dokumen.")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-xl text-xs font-semibold border border-emerald-500/30 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Hubungi CS WA</span>
              </a>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
            <p>© 2026 SPKInstan Platform.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}