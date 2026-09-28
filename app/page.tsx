'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
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
  Hash,
  AlertTriangle,
  Sliders
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

interface Clause {
  id: string;
  docType: 'SPK' | 'NDA' | 'BAST';
  title: string;
  content: string;
  isEnabled: boolean;
  isCustom?: boolean;
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function Home() {
  // Pengaturan Terpusat Nomor WA Admin via Env Variable
  const adminWaNumber = process.env.NEXT_PUBLIC_ADMIN_WA_NUMBER || '62881027908462';

  // ---------------------------------------------------------
  // DEKLARASI ALL STATES & REFS
  // ---------------------------------------------------------
  const [activeDocTab, setActiveDocTab] = useState<'SPK' | 'NDA' | 'BAST'>('SPK');
  const [selectedPackage, setSelectedPackage] = useState<'SINGLE' | 'BUNDLING'>('SINGLE');
  const [currentWizardStep, setCurrentWizardStep] = useState(1);

  // State Preset Akselerator
  const [activePreset, setActivePreset] = useState<'web' | 'design' | 'all' | null>(null);

  // Per-document Payment License state
  const [paidDocs, setPaidDocs] = useState<{ SPK: boolean; NDA: boolean; BAST: boolean }>({
    SPK: false,
    NDA: false,
    BAST: false,
  });

  // State Tracking Unduhan Individual per File
  const [downloadedDocs, setDownloadedDocs] = useState<{ SPK: boolean; NDA: boolean; BAST: boolean }>({
    SPK: false,
    NDA: false,
    BAST: false,
  });

  // State Tracking Proses Unduh Individual
  const [processingDoc, setProcessingDoc] = useState<'SPK' | 'NDA' | 'BAST' | 'ALL' | null>(null);

  const [paidDocTarget, setPaidDocTarget] = useState<'SPK' | 'NDA' | 'BAST'>('SPK');
  const [shouldAutoDownload, setShouldAutoDownload] = useState(false);
  const [, setAutoDownloadStatus] = useState<string>('');

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalStep, setModalStep] = useState<'download_choice' | 'qris'>('download_choice');
  const [mobileViewMode, setMobileViewMode] = useState<'form' | 'preview'>('form');
  const [isExporting, setIsExporting] = useState(false);

  const [sessionId, setSessionId] = useState('');
  const [mayarPaymentId, setMayarPaymentId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(899);

  // Mayar API & Polling States
  const [, setQrCodeData] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [isLoadingQris, setIsLoadingQris] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [isProcessingSuccess, setIsProcessingSuccess] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Form State - Identitas Para Pihak
  const [freelancerName, setFreelancerName] = useState('');
  const [freelancerEmail, setFreelancerEmail] = useState('');
  const [freelancerWa, setFreelancerWa] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientWa, setClientWa] = useState('');

  // Multi-State Nomor Dokumen Terpisah per Jenis Dokumen (Anti-Terganti)
  const [docNumbers, setDocNumbers] = useState({
    SPK: '001/SPK/IX/2026',
    NDA: '001/NDA/IX/2026',
    BAST: '001/BAST/IX/2026',
  });

  // Signatory Customization Fields (Step 4)
  const [signerFirstParty, setSignerFirstParty] = useState('');
  const [signerSecondParty, setSignerSecondParty] = useState('');

  // Signature Pad Canvas States & Refs
  const canvasRef1 = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing1, setIsDrawing1] = useState(false);
  const [signatureFirstParty, setSignatureFirstParty] = useState<string | null>(null);

  const canvasRef2 = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing2, setIsDrawing2] = useState(false);
  const [signatureSecondParty, setSignatureSecondParty] = useState<string | null>(null);

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

  // Layout & Review States
  const [reviews] = useState<Review[]>([]);
  const page1ContentRef = useRef<HTMLDivElement | null>(null);
  const page1MainContentRef = useRef<HTMLDivElement | null>(null);
  const page2ContentRef = useRef<HTMLDivElement | null>(null);
  const [heightNeedsPage2, setHeightNeedsPage2] = useState(false);

  // ARRAY-BASED CLAUSE MANAGER STATE & LOGIC
  const [clauses, setClauses] = useState<Clause[]>([
    // SPK Clauses Bawaan
    {
      id: 'spk-1',
      docType: 'SPK',
      title: 'Ruang Lingkup Pekerjaan',
      content: 'PIHAK PERTAMA berkewajiban melaksanakan pengerjaan proyek sesuai dengan acuan spesifikasi teknis dan deliverables yang telah disepakati bersama PIHAK KEDUA.',
      isEnabled: true,
    },
    {
      id: 'spk-2',
      docType: 'SPK',
      title: 'Jangka Waktu & Timeline Pekerjaan',
      content: 'Pelaksanaan pekerjaan dimulai sejak Uang Muka (DP) diterima oleh PIHAK PERTAMA. Timeline pekerjaan, milestone penyerahan, dan tanggal penyelesaian proyek wajib dipatuhi oleh Para Pihak.',
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
      title: 'Ketentuan Revisi & SLA Feedback',
      content: 'Revisi pekerjaan dibatasi maksimal 2 (dua) kali sesuai cakupan kesepakatan awal. Evaluasi atau feedback dari PIHAK KEDUA wajib diberikan maksimal 5 (lima) hari kerja; jika melebihi batas waktu tersebut, pekerjaan dianggap disetujui secara otomatis (auto-approved).',
      isEnabled: true,
    },
    {
      id: 'spk-5',
      docType: 'SPK',
      title: 'Retensi Hak Milik & Master File',
      content: 'Seluruh file master, aset Figma, serta Source Code aplikasi tetap menjadi hak milik PIHAK PERTAMA dan baru akan diserahkan secara penuh kepada PIHAK KEDUA setelah sisa pembayaran dilunasi 100%.',
      isEnabled: true,
    },
    {
      id: 'spk-6',
      docType: 'SPK',
      title: 'Pembatalan & DP Non-Refundable',
      content: 'Sesuai ketentuan Pasal 1464 KUHPerdata, apabila pembatalan perjanjian dilakukan secara sepihak oleh PIHAK KEDUA, maka Uang Muka (DP) yang telah dibayarkan dianggap hangus dan tidak dapat ditarik kembali (non-refundable).',
      isEnabled: true,
    },
    {
      id: 'spk-7',
      docType: 'SPK',
      title: 'Keadaan Memaksa (Force Majeure)',
      content: 'Segala keterlambatan atau kegagalan pelaksanaan kewajiban akibat peristiwa di luar kendali wajar Para Pihak (seperti bencana alam, perang, pandemi, atau regulasi resmi pemerintah) dibebaskan dari tuntutan ganti rugi.',
      isEnabled: true,
    },
    {
      id: 'spk-8',
      docType: 'SPK',
      title: 'Akses Server & Layanan Pihak Ketiga',
      content: 'PIHAK KEDUA wajib menyediakan akses kredensial server/hosting/API yang diperlukan. Seluruh biaya lisensi layanan pihak ketiga berbayar (seperti domain, hosting, API premium, atau plugin) berada di luar nilai imbalan SPK dan ditanggung penuh oleh PIHAK KEDUA.',
      isEnabled: true,
    },
    {
      id: 'spk-9',
      docType: 'SPK',
      title: 'Hak Cipta Portofolio & Penyelesaian Sengketa',
      content: 'PIHAK PERTAMA berhak menampilkan hasil karya visual/desain sebagai portofolio profesional selama tidak melanggar kerahasiaan NDA. Setiap sengketa akan diselesaikan secara musyawarah, dan apabila tidak tercapai kesepakatan, diselesaikan melalui domisili Pengadilan Negeri yang berwenang.',
      isEnabled: true,
    },

    // NDA Clauses Bawaan
    {
      id: 'nda-1',
      docType: 'NDA',
      title: 'Definisi Informasi Rahasia',
      content: 'Sesuai UU No. 30 Tahun 2000 tentang Rahasia Dagang, Informasi Rahasia mencakup seluruh data teknis, kode sumber, skema database, aset desain, strategi pemasaran, serta data finansial yang diberikan oleh Pemilik Informasi.',
      isEnabled: true,
    },
    {
      id: 'nda-2',
      docType: 'NDA',
      title: 'Kewajiban & Pembatasan Kerahasiaan',
      content: 'Penerima Informasi dilarang keras mengungkapkan, menggandakan, menyebarluaskan, atau memanfaatkan Informasi Rahasia kepada pihak ketiga mana pun tanpa persetujuan tertulis terlebih dahulu dari Pemilik Informasi.',
      isEnabled: true,
    },
    {
      id: 'nda-3',
      docType: 'NDA',
      title: 'Pengecualian Kerahasiaan',
      content: 'Kewajiban kerahasiaan tidak berlaku atas informasi yang: (a) telah menjadi milik umum (public domain) tanpa pelanggaran NDA; (b) telah diketahui sebelumnya secara sah; atau (c) wajib dibuka berdasarkan perintah hukum / keputusan Pengadilan.',
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
      content: 'Setiap bentuk kebocoran atau pelanggaran kerahasiaan dikenakan denda penalti finansial serta hak untuk menuntut ganti rugi materiil/immateriil sesuai ketentuan hukum perdata.',
      isEnabled: true,
    },
    {
      id: 'nda-7',
      docType: 'NDA',
      title: 'Penyelesaian Sengketa',
      content: 'Setiap perselisihan yang timbul dari pelaksanaan NDA ini diselesaikan melalui musyawarah untuk mufakat, dan apabila gagal, diselesaikan di forum hukum Pengadilan Negeri setempat.',
      isEnabled: true,
    },

    // BAST Clauses Bawaan
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
      title: 'Pengesahan Hak Pelunasan Pembayaran',
      content: 'Dengan ditandatanganinya BAST ini, kewajiban pengerjaan PIHAK PERTAMA dinyatakan selesai sempurna, dan PIHAK PERTAMA berhak penuh atas pencairan pelunasan 100% dari PIHAK KEDUA.',
      isEnabled: true,
    },
  ]);

  const handleDocNumberChange = (value: string) => {
    setDocNumbers((prev) => ({
      ...prev,
      [activeDocTab]: value,
    }));
  };

  // PHASE 1: Pemulihan & Rehidrasi State Modal & Lisensi Pembayaran dari LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPaid = localStorage.getItem('spkinstan_paid_docs');
      const savedModal = localStorage.getItem('spkinstan_show_success_modal');
      const savedDownloaded = localStorage.getItem('spkinstan_downloaded_docs');
      const savedPackage = localStorage.getItem('spkinstan_package');

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

      if (savedModal === 'true') {
        setShowSuccessModal(true);
      }

      if (savedDownloaded) {
        try {
          setDownloadedDocs(JSON.parse(savedDownloaded));
        } catch (e) {
          console.error('Failed to parse saved downloaded docs:', e);
        }
      }
    }
  }, []);

  // Simpan State Form ke LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const formData = {
        freelancerName,
        freelancerEmail,
        freelancerWa,
        clientName,
        clientWa,
        docNumbers,
        signerFirstParty,
        signerSecondParty,
        projectTitle,
        projectAmount,
        dpPercent,
        bankInfo,
        ndaScope,
        ndaYears,
        ndaPenalty,
        bastRef,
        bastWarranty,
        bastDate,
        signatureFirstParty,
        signatureSecondParty,
        clauses,
      };
      localStorage.setItem('spkinstan_form_draft', JSON.stringify(formData));
    }
  }, [
    freelancerName, freelancerEmail, freelancerWa, clientName, clientWa,
    docNumbers, signerFirstParty, signerSecondParty, projectTitle, projectAmount,
    dpPercent, bankInfo, ndaScope, ndaYears, ndaPenalty, bastRef, bastWarranty,
    bastDate, signatureFirstParty, signatureSecondParty, clauses
  ]);

  // Pulihkan State Form dari LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDraft = localStorage.getItem('spkinstan_form_draft');
      if (savedDraft) {
        try {
          const data = JSON.parse(savedDraft);
          if (data.freelancerName) setFreelancerName(data.freelancerName);
          if (data.freelancerEmail) setFreelancerEmail(data.freelancerEmail);
          if (data.freelancerWa) setFreelancerWa(data.freelancerWa);
          if (data.clientName) setClientName(data.clientName);
          if (data.clientWa) setClientWa(data.clientWa);
          if (data.docNumbers) setDocNumbers(data.docNumbers);
          if (data.signerFirstParty) setSignerFirstParty(data.signerFirstParty);
          if (data.signerSecondParty) setSignerSecondParty(data.signerSecondParty);
          if (data.projectTitle) setProjectTitle(data.projectTitle);
          if (data.projectAmount) setProjectAmount(data.projectAmount);
          if (data.dpPercent) setDpPercent(data.dpPercent);
          if (data.bankInfo) setBankInfo(data.bankInfo);
          if (data.ndaScope) setNdaScope(data.ndaScope);
          if (data.ndaYears) setNdaYears(data.ndaYears);
          if (data.ndaPenalty) setNdaPenalty(data.ndaPenalty);
          if (data.bastRef) setBastRef(data.bastRef);
          if (data.bastWarranty) setBastWarranty(data.bastWarranty);
          if (data.bastDate) setBastDate(data.bastDate);
          if (data.signatureFirstParty) setSignatureFirstParty(data.signatureFirstParty);
          if (data.signatureSecondParty) setSignatureSecondParty(data.signatureSecondParty);
          if (data.clauses) setClauses(data.clauses);
        } catch (e) {
          console.error('Gagal memulihkan draf form:', e);
        }
      }
    }
  }, []);

  // Sinkronisasi Input Form ke Teks Pasal
  useEffect(() => {
    setClauses((prev) =>
      prev.map((c) => {
        if (c.id === 'spk-1') {
          return {
            ...c,
            content: `PIHAK PERTAMA berkewajiban melaksanakan pekerjaan "${projectTitle || 'Pengembangan Aplikasi Web & API Integration'}" sesuai dengan acuan spesifikasi teknis dan deliverables yang telah disepakati bersama PIHAK KEDUA.`,
          };
        }
        if (c.id === 'spk-3') {
          return {
            ...c,
            content: `Total imbalan jasa yang disepakati sebesar Rp ${formatRupiah(projectAmount || '7500000')}, dengan Uang Muka (DP) sebesar ${dpPercent || '50'}% wajib dibayarkan sebelum pengerjaan dimulai melalui transfer ke ${bankInfo || 'BCA 1234567890 a.n budi'}.`,
          };
        }
        if (c.id === 'nda-1') {
          return {
            ...c,
            content: `Sesuai UU No. 30 Tahun 2000 tentang Rahasia Dagang, Informasi Rahasia mencakup seluruh data teknis, "${ndaScope || 'Source Code, Skema Database, Aset Desain Figma, & Strategi Bisnis'}", kode sumber, strategi pemasaran, serta data finansial yang diberikan oleh Pemilik Informasi.`,
          };
        }
        if (c.id === 'nda-4') {
          return {
            ...c,
            content: `Kewajiban menjaga kerahasiaan ini berlaku efektif sejak tanggal penandatanganan dan tetap mengikat Para Pihak selama ${ndaYears || '2'} (dua) tahun setelah hubungan kerja sama berakhir.`,
          };
        }
        if (c.id === 'nda-6') {
          return {
            ...c,
            content: `Setiap bentuk kebocoran atau pelanggaran kerahasiaan dikenakan denda penalti finansial sebesar Rp ${formatRupiah(ndaPenalty || '25000000')} serta hak untuk menuntut ganti rugi materiil/immateriil sesuai ketentuan hukum perdata.`,
          };
        }
        if (c.id === 'bast-1') {
          return {
            ...c,
            content: `Berita Acara ini diterbitkan sebagai bukti administratif sah yang merujuk pada kesepakatan Perjanjian Kerja Sama (SPK) Utama dengan Nomor Referensi: "${bastRef || '001/SPK/IX/2026'}".`,
          };
        }
        if (c.id === 'bast-2') {
          return {
            ...c,
            content: `PIHAK PERTAMA menyatakan telah menyerahkan seluruh hasil pengerjaan proyek, dan PIHAK KEDUA menyatakan telah menerima pengerjaan tersebut secara resmi pada tanggal ${bastDate || '25 September 2026'}.`,
          };
        }
        if (c.id === 'bast-4') {
          return {
            ...c,
            content: `PIHAK PERTAMA memberikan garansi pemeliharaan perbaikan kendala teknis / bug secara gratis selama ${bastWarranty || '14'} (empat belas) hari kerja terhitung sejak penandatanganan BAST ini.`,
          };
        }
        return c;
      })
    );
  }, [projectTitle, projectAmount, dpPercent, bankInfo, ndaScope, ndaYears, ndaPenalty, bastRef, bastDate, bastWarranty]);

  // Handler Manajemen Pasal
  const handleToggleClause = (id: string) => {
    setClauses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isEnabled: !c.isEnabled } : c))
    );
  };

  const handleUpdateClauseTitle = (id: string, title: string) => {
    setClauses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
  };

  const handleUpdateClauseContent = (id: string, content: string) => {
    setClauses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, content } : c))
    );
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
  };

  const handleRemoveClause = (id: string) => {
    setClauses((prev) => prev.filter((c) => c.id !== id));
  };

  // Logika Preset SPK, NDA, & BAST
  const handleApplyPreset = (presetType: 'web' | 'design' | 'all') => {
    setActivePreset(presetType);

    setClauses((prev) =>
      prev.map((c) => {
        if (presetType === 'all') {
          return { ...c, isEnabled: true };
        }

        if (c.docType !== activeDocTab) {
          return c;
        }

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

  // DYNAMIC CLAUSE PARTITIONING & HALAMAN A4 (MAX_PAGE_CONTENT_HEIGHT = 960)
  const activeClauses = clauses.filter((c) => c.docType === activeDocTab && c.isEnabled);
  const SPLIT_LIMIT = 4;
  const isClauseSplit = activeClauses.length > SPLIT_LIMIT;

  const page1Clauses = isClauseSplit ? activeClauses.slice(0, SPLIT_LIMIT) : activeClauses;
  const page2Clauses = isClauseSplit ? activeClauses.slice(SPLIT_LIMIT) : [];

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
    projectTitle,
    projectAmount,
    dpPercent,
    bankInfo,
    ndaScope,
    ndaYears,
    ndaPenalty,
    bastRef,
    bastWarranty,
    bastDate,
    signerFirstParty,
    signerSecondParty,
    signatureFirstParty,
    signatureSecondParty,
    freelancerName,
    clientName,
    isExporting
  ]);

  const needsPage2 = isClauseSplit || heightNeedsPage2;
  const totalPages = needsPage2 ? 2 : 1;

  const generateNewSessionId = () => {
    return 'SPK-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  useEffect(() => {
    setSessionId(generateNewSessionId());
  }, []);

  // Proteksi Anti-Inspect & Shortcut Keyboard
  useEffect(() => {
    const isPaid = paidDocs[activeDocTab];
    if (isPaid) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P' || e.key === 'a' || e.key === 'A')) ||
        (e.metaKey && (e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P' || e.key === 'a' || e.key === 'A'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        alert('Proteksi Keamanan: Fitur inspect, cetak langsung, salin teks, dan simpan draf dibatasi. Silakan lakukan pembayaran untuk mendapatkan PDF HD Clean tanpa watermark.');
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

  // Eksekusi Kelunasan & Pencabutan Watermark (Menyimpan State di LocalStorage)
  const handlePaymentSuccess = () => {
    stopPolling();
    setIsProcessingSuccess(true);

    const updatedPaid = selectedPackage === 'BUNDLING'
      ? { SPK: true, NDA: true, BAST: true }
      : { ...paidDocs, [paidDocTarget]: true };

    setPaidDocs(updatedPaid);

    if (typeof window !== 'undefined') {
      localStorage.setItem('spkinstan_paid_docs', JSON.stringify(updatedPaid));
      localStorage.setItem('spkinstan_show_success_modal', 'true');
      localStorage.setItem('spkinstan_package', selectedPackage);
    }

    setTimeout(() => {
      setIsProcessingSuccess(false);
      setMobileViewMode('preview');
      setShowCheckoutModal(false);
      setShowSuccessModal(true);
      setShouldAutoDownload(true);
      setAutoDownloadStatus('Memproses pencabutan watermark & menyiapkan PDF...');
    }, 1500);

    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'Purchase', {
        value: selectedPackage === 'SINGLE' ? 1000 : 1000,
        currency: 'IDR',
      });
    }
  };

  // Helper Switch Tab dengan Delay Rendering DOM React
  const switchTabAndAwaitRender = (targetDoc: 'SPK' | 'NDA' | 'BAST') => {
    return new Promise<void>((resolve) => {
      setActiveDocTab(targetDoc);
      setTimeout(() => {
        resolve();
      }, 500);
    });
  };

  // PHASE 2 & 3: GENERATOR PDF DENGAN PENAMAAN STERIL ASCII, AUTO-PREVIEW SWITCH, & SAFARI OPTIMIZATION
  const captureDocumentToPdf = async (
    docType: 'SPK' | 'NDA' | 'BAST',
    shouldConsumeLicense = true
  ) => {
    setProcessingDoc(docType);
    setIsExporting(true);

    // Beralih otomatis ke mode preview jika sebelumnya berada di mode form (Mencegah elemen 0px x 0px)
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
      setProcessingDoc(null);
      return;
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
        const isPaidDoc = paidDocs[docType] || paidDocs[activeDocTab];

        const watermarkElement = pageEl.querySelector('.watermark-layer') as HTMLElement;
        if (isPaidDoc && watermarkElement) {
          watermarkElement.style.display = 'none';
        }

        const originalWidth = pageEl.style.width;
        const originalHeight = pageEl.style.height;
        const originalMinHeight = pageEl.style.minHeight;
        const originalPosition = pageEl.style.position;

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
        pageEl.style.position = originalPosition;
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

      const isPaidDoc = paidDocs[docType] || paidDocs[activeDocTab];
      const fileSuffix = isPaidDoc ? 'CLEAN' : 'WATERMARKED_DRAFT';
      // Pembersihan Karakter Khusus Menjadi Format ASCII Steril
      const cleanName = (freelancerName || 'PihakPertama')
        .trim()
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_');
      const fileName = `SPKInstan_${docType}_${cleanName}_${fileSuffix}.pdf`;

      // METODE NATIVE jsPDF.save() — Mencegah Isu Teks tambahan di Safari
      pdf.save(fileName);

      setDownloadedDocs((prev) => {
        const nextState = { ...prev, [docType]: true };
        if (typeof window !== 'undefined') {
          localStorage.setItem('spkinstan_downloaded_docs', JSON.stringify(nextState));
        }
        return nextState;
      });

      if (shouldConsumeLicense && isPaidDoc && sessionId) {
        await consumePaymentLicense(sessionId);
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Gagal mengekspor PDF.');
    } finally {
      setIsExporting(false);
      setProcessingDoc(null);
    }
  };

  // PHASE 3: HANDLER BATCH DOWNLOADER BUNDLING DENGAN DELAY 800MS UNTUK MENCEGAH POP-UP BLOCKER
  const handleDownloadAllBundling = async () => {
    setProcessingDoc('ALL');
    setIsExporting(true);
    const docs: ('SPK' | 'NDA' | 'BAST')[] = ['SPK', 'NDA', 'BAST'];

    try {
      for (const doc of docs) {
        await switchTabAndAwaitRender(doc);
        await captureDocumentToPdf(doc, false);
        // Delay 800ms mencegah pencegatan Pop-up Blocker di Android & Safari
        await new Promise((res) => setTimeout(res, 800));
      }

      if (sessionId) {
        await consumePaymentLicense(sessionId);
      }
    } catch (err) {
      console.error('Gagal mengunduh paket bundling:', err);
      alert('Terjadi kendala saat mengunduh paket bundling.');
    } finally {
      setIsExporting(false);
      setProcessingDoc(null);
    }
  };

  // Handler Unduh Individual
  const handleIndividualDownload = async (docType: 'SPK' | 'NDA' | 'BAST') => {
    await captureDocumentToPdf(docType, true);
  };

  // PHASE 1: HANDLER MENUTUP MODAL SUKSES SECARA EKSPLISIT (PEMBERSIHAN SESSION LOCALSTORAGE)
  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('spkinstan_show_success_modal');
      localStorage.removeItem('spkinstan_paid_docs');
      localStorage.removeItem('spkinstan_downloaded_docs');
      localStorage.removeItem('spkinstan_package');
    }
  };

  useEffect(() => {
    if (shouldAutoDownload) {
      setShouldAutoDownload(false);
      setAutoDownloadStatus('Pembayaran berhasil! Silakan klik tombol unduh di bawah ini.');
    }
  }, [shouldAutoDownload]);

  // Verifikasi Pembayaran via Server Redis
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

      alert('Pembayaran belum terdeteksi di server. Silakan selesaikan proses transfer/scan QRIS terlebih dahulu.');
    } catch (err) {
      console.error('Verifikasi pembayaran gagal:', err);
      alert('Gagal terhubung ke server verifikasi. Silakan periksa koneksi internet Anda.');
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  // Polling Real-time ke Server Redis
  const startPollingStatus = (currentSession: string, _mayarId?: string) => {
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
    }, 3000);
  };

  // PostMessage Event Listener dari Mayar Gateway
  useEffect(() => {
    const handleMayarMessage = (event: MessageEvent) => {
      if (!event.data) return;

      let payload = event.data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch (e) {
          // ignore
        }
      }

      if (
        payload?.type === 'MAYAR_PAYMENT_SUCCESS' ||
        payload?.type === 'mayar_payment_success' ||
        payload?.status === 'success' ||
        (payload?.event === 'payment.received' && payload?.status === 'PAID')
      ) {
        handlePaymentSuccess();
      }
    };

    window.addEventListener('message', handleMayarMessage);
    return () => window.removeEventListener('message', handleMayarMessage);
  }, [paidDocTarget, selectedPackage, mayarPaymentId, sessionId]);

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

    const amount = selectedPackage === 'SINGLE' ? 1000 : 1000;

    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        value: amount,
        currency: 'IDR',
      });
    }

    const targetName = clientName || freelancerName || 'Pihak Kedua SPKInstan';
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
    }
    setIsLoadingQris(false);
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

  // Canvas Drawing Handlers - PIHAK PERTAMA
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
      setSignatureFirstParty(canvasRef1.current.toDataURL());
    }
    setIsDrawing1(false);
  };

  const clearSignature1 = () => {
    const canvas = canvasRef1.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureFirstParty(null);
  };

  // Canvas Drawing Handlers - PIHAK KEDUA
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
      setSignatureSecondParty(canvasRef2.current.toDataURL());
    }
    setIsDrawing2(false);
  };

  const clearSignature2 = () => {
    const canvas = canvasRef2.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureSecondParty(null);
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

  const handleFreeDownload = () => {
    setShowCheckoutModal(false);
    captureDocumentToPdf(activeDocTab);
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
      text = `Halo ${clientName || 'Pihak Kedua'},\n\nBerikut dikirimkan draf resmi *Paket Perjanjian Kerja Sama (SPK, NDA, & BAST)* untuk proyek "${projectTitle || 'Pekerjaan Jasa'}" yang telah diterbitkan secara legal.\n\n*Pihak Pertama:* ${freelancerName || 'budi'}\n*Status Dokumen:* Sah (Terverifikasi Pelunasan PRO)\n\nMohon diperiksa dan ditandatangan kembali. Terima kasih!`;
    } else {
      text = `Halo ${clientName || 'Pihak Kedua'},\n\nBerikut dikirimkan draf resmi *${targetDoc} Perjanjian Kerja Sama* untuk proyek "${projectTitle || 'Pekerjaan Jasa'}" yang telah diterbitkan secara legal.\n\n*Pihak Pertama:* ${freelancerName || 'budi'}\n*Status Dokumen:* Sah (Terverifikasi Pelunasan)\n\nMohon diperiksa dan ditandatangan kembali. Terima kasih!`;
    }

    const waTarget = clientWa || adminWaNumber;
    window.open(`https://wa.me/${waTarget}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const wizardTitles = [
    'Identitas Para Pihak',
    'Detail Spesifik Dokumen',
    'Manajer Pasal Dinamis',
    'Legalisasi & Tanda Tangan'
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans antialiased selection:bg-blue-100 selection:text-blue-700 pb-20 md:pb-0">
      
      {/* CSS Typography Calibri Standard & Responsive Rules */}
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
              href={`https://wa.me/${adminWaNumber}?text=${encodeURIComponent("Halo Admin SPKInstan, saya ingin Kirim Testimoni")}`}
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
                SPKInstan adalah platform LegalTech berbasis web yang membantu freelancer, creator, dan agensi mikro membuat dokumen perjanjian kerja sama (SPK, NDA, dan BAST) berstandar hukum perdata Indonesia secara instan, tanpa perlu login atau registrasi.
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
                    <span>Paket Bundling Proteksi (3-in-1) — Rp 1.000</span>
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
                Solusi Perlindungan Hukum Legalitas Khusus Profesional & Agensi Mikro:
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
                  {/* STEP 1: Identitas Para Pihak */}
                  {currentWizardStep === 1 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                          <Hash className="w-3.5 h-3.5 text-blue-600" /> Nomor Dokumen / Surat ({activeDocTab})
                        </label>
                        <input
                          type="text"
                          value={docNumbers[activeDocTab]}
                          onChange={(e) => handleDocNumberChange(e.target.value)}
                          placeholder={`cth: 001/${activeDocTab}/IX/2026`}
                          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono font-medium"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Format baku Indonesia: <code>[Nomor]/[Kode]/[Bulan Romawi]/[Tahun]</code>
                        </p>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                          <User className="w-3.5 h-3.5" /> Pihak Pertama
                        </h4>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nama Lengkap / Nama Perusahaan
                          </label>
                          <input
                            type="text"
                            value={freelancerName}
                            onChange={(e) => setFreelancerName(e.target.value)}
                            placeholder="cth: budi"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={freelancerEmail}
                            onChange={(e) => setFreelancerEmail(e.target.value)}
                            placeholder="cth: budi@gmail.com"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nomor WhatsApp
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
                          <Building2 className="w-3.5 h-3.5" /> Pihak Kedua
                        </h4>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nama Lengkap / Nama Perusahaan
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
                            Nomor WhatsApp
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

                  {/* STEP 2: Detail Spesifik Dokumen */}
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
                              placeholder="cth: BCA 1234567890 a.n budi"
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
                              placeholder="cth: 001/SPK/IX/2026"
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

                  {/* STEP 3: MANAJER PASAL DINAMIS */}
                  {currentWizardStep === 3 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                          3. Pengaturan & Modifikasi Pasal ({activeDocTab})
                        </label>
                      </div>

                      {/* Preset Accelerator Pills */}
                      <div className="p-2 bg-slate-100 rounded-2xl border border-slate-200/80 space-y-1.5">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block px-1 flex items-center gap-1">
                          <Sliders className="w-3 h-3 text-blue-600" /> Preset Akselerator Cepat ({activeDocTab}):
                        </span>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            type="button"
                            onClick={() => handleApplyPreset('web')}
                            className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all shadow-2xs ${
                              activePreset === 'web'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            Preset Web/App
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApplyPreset('design')}
                            className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all shadow-2xs ${
                              activePreset === 'design'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            Preset Desain
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApplyPreset('all')}
                            className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all shadow-2xs ${
                              activePreset === 'all'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white hover:bg-slate-50 text-blue-600 border-blue-200'
                            }`}
                          >
                            Aktifkan Semua
                          </button>
                        </div>
                      </div>

                      {/* Daftar Pasal Dinamis */}
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

                                <div className="flex items-center gap-1">
                                  {clause.isCustom && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveClause(clause.id)}
                                      className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition-all"
                                      title="Hapus Pasal Ini"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <input
                                type="text"
                                value={clause.title}
                                onChange={(e) => handleUpdateClauseTitle(clause.id, e.target.value)}
                                placeholder="Judul Pasal"
                                className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />

                              <textarea
                                rows={2}
                                value={clause.content}
                                onChange={(e) => handleUpdateClauseContent(clause.id, e.target.value)}
                                placeholder="Isi kalimat pasal..."
                                className="w-full px-2.5 py-1.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
                              />
                            </div>
                          ))}
                      </div>

                      {/* Tombol Tambah Pasal Khusus */}
                      <button
                        type="button"
                        onClick={handleAddCustomClause}
                        className="w-full py-2.5 bg-blue-50 hover:bg-blue-100/80 text-blue-600 font-bold text-xs rounded-xl border border-blue-200 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Tambah Pasal Khusus ({activeDocTab})</span>
                      </button>
                    </div>
                  )}

                  {/* STEP 4: Legalisasi & Tanda Tangan */}
                  {currentWizardStep === 4 && (
                    <div className="space-y-5">
                      {/* TANDA TANGAN PIHAK PERTAMA */}
                      <div className="space-y-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                          <User className="w-3.5 h-3.5" /> Penandatangan Pihak Pertama
                        </h4>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nama Penandatangan
                          </label>
                          <input
                            type="text"
                            value={signerFirstParty}
                            onChange={(e) => setSignerFirstParty(e.target.value)}
                            placeholder={freelancerName || 'cth: budi'}
                            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">
                            Kosongkan jika sama dengan Pihak Pertama ({freelancerName || '-'}).
                          </p>
                        </div>

                        {/* Pad Coretan & Upload Gambar TTD Pihak Pertama */}
                        <div className="space-y-2 pt-1">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Coretan / Gambar TTD Pihak Pertama
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
                            className="w-full h-24 bg-white rounded-xl border border-slate-200 cursor-crosshair touch-none mx-auto"
                          />
                          <div className="flex items-center justify-between text-xs pt-0.5">
                            <button
                              type="button"
                              onClick={clearSignature1}
                              className="text-slate-500 hover:text-red-600 flex items-center gap-1 font-semibold text-[11px]"
                            >
                              <RotateCcw className="w-3 h-3" /> Hapus Coretan
                            </button>
                            <label className="cursor-pointer text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 text-[11px]">
                              <span>📁 Upload TTD (PNG/JPG)</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      setSignatureFirstParty(event.target?.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* TANDA TANGAN PIHAK KEDUA */}
                      <div className="space-y-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" /> Penandatangan Pihak Kedua
                        </h4>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nama Penandatangan
                          </label>
                          <input
                            type="text"
                            value={signerSecondParty}
                            onChange={(e) => setSignerSecondParty(e.target.value)}
                            placeholder={clientName || 'cth: Nama Direktur'}
                            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">
                            Kosongkan jika sama dengan Pihak Kedua ({clientName || '-'}).
                          </p>
                        </div>

                        {/* Pad Coretan & Upload Gambar TTD Pihak Kedua */}
                        <div className="space-y-2 pt-1">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Coretan / Gambar TTD Pihak Kedua
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
                            className="w-full h-24 bg-white rounded-xl border border-slate-200 cursor-crosshair touch-none mx-auto"
                          />
                          <div className="flex items-center justify-between text-xs pt-0.5">
                            <button
                              type="button"
                              onClick={clearSignature2}
                              className="text-slate-500 hover:text-red-600 flex items-center gap-1 font-semibold text-[11px]"
                            >
                              <RotateCcw className="w-3 h-3" /> Hapus Coretan
                            </button>
                            <label className="cursor-pointer text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 text-[11px]">
                              <span>📁 Upload TTD (PNG/JPG)</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      setSignatureSecondParty(event.target?.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 italic">
                        *Jika kolom TTD tidak diisi/diunggah, area tanda tangan pada dokumen A4 akan dibiarkan bersih untuk ditandatangani fisik.
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

              {/* RIGHT COLUMN: SPKInstan Live Preview A4 */}
              <div
                className={`lg:col-span-7 space-y-4 ${
                  mobileViewMode === 'form' ? 'hidden lg:block' : 'block'
                }`}
              >
                {/* Security Status Bar */}
                <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Preview Dokumen ({totalPages} Halaman A4)
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    <Shield className="w-3 h-3 text-blue-600" />
                    Proteksi Anti-Inspect Active
                  </span>
                </div>

                {/* Wrapper Responsif UI + Presisi Mutlak A4 (794px x 1123px) */}
                <div className="w-full bg-slate-300/40 p-2 sm:p-6 rounded-3xl border border-slate-200 flex justify-center items-center overflow-x-auto pb-4">
                  <div
                    id="a4-document-preview"
                    onContextMenu={(e) => e.preventDefault()}
                    onCopy={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    className={`flex flex-col gap-8 items-center w-full max-w-[794px] ${
                      !paidDocs[activeDocTab] ? 'select-none' : ''
                    }`}
                  >
                    {/* HALAMAN 1 */}
                    <div
                      className="a4-page w-full max-w-[794px] min-h-[1123px] h-auto bg-white text-slate-900 p-6 sm:p-8 relative flex flex-col justify-between shadow-xl rounded-xl border border-slate-200 shrink-0"
                    >
                      {/* Watermark Overlay Halaman 1 */}
                      {!paidDocs[activeDocTab] && (
                        <div className="watermark-layer absolute inset-0 pointer-events-none z-20 flex items-center justify-center overflow-hidden">
                          <span className="text-5xl sm:text-7xl font-black tracking-[0.25em] text-slate-300/25 uppercase select-none -rotate-12 transform">
                            SPKINSTAN
                          </span>
                        </div>
                      )}

                      {/* Konten Halaman 1 */}
                      <div
                        ref={needsPage2 ? page1MainContentRef : page1ContentRef}
                        className="space-y-3 sm:space-y-3.5 text-[12px] sm:text-[13px] leading-[1.5] text-slate-700 relative z-10"
                      >
                        {/* Header Top Accent Bar */}
                        <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 w-full rounded-full shadow-xs mb-3" />

                        {/* Brand Header & Metadata Box */}
                        <div className="flex items-start justify-between pb-2.5 border-b border-slate-200/80 gap-4">
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-bold tracking-widest text-blue-600 uppercase">
                              Pihak Pertama
                            </span>
                            <h1 className="text-[15px] sm:text-[16px] font-extrabold text-slate-900 tracking-tight leading-tight">
                              {freelancerName || 'Nama Pihak Pertama'}
                            </h1>
                            {freelancerEmail && (
                              <p className="text-[11px] text-slate-500">{freelancerEmail}</p>
                            )}
                          </div>

                          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 sm:p-2.5 text-right space-y-0.5 min-w-[140px] sm:min-w-[170px]">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              Nomor Dokumen
                            </p>
                            <p className="font-mono text-[12px] sm:text-[13px] font-extrabold text-slate-900">
                              {docNumbers[activeDocTab] || `001/${activeDocTab}/IX/2026`}
                            </p>
                            <p className="text-[11px] text-slate-500 pt-0.5">{getTodayFormattedDate()}</p>
                          </div>
                        </div>

                        {/* Document Title Block (18px-20px Bold Standard Calibri) */}
                        <div className="border-l-4 border-blue-600 pl-3 sm:pl-4 py-0.5">
                          <h2 className="text-[18px] sm:text-[20px] font-extrabold tracking-wide text-slate-900 uppercase leading-[1.2]">
                            {activeDocTab === 'SPK' && 'PERJANJIAN KERJA SAMA PEKERJAAN JASA'}
                            {activeDocTab === 'NDA' && 'PERJANJIAN KERAHASIAAN INFORMASI (NDA)'}
                            {activeDocTab === 'BAST' && 'BERITA ACARA SERAH TERIMA PEKERJAAN (BAST)'}
                          </h2>
                          <p className="text-[11px] font-semibold text-slate-500">
                            Dokumen Hukum Perikatan Perdata Resmi (KUHPerdata & UU Terkait)
                          </p>
                        </div>

                        {/* Parties Identification Paragraph (12px-13px Regular Standard) */}
                        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-2.5 sm:p-3 space-y-1.5">
                          <p className="text-slate-700 text-[12px] sm:text-[13px] leading-[1.5]">
                            Pada hari ini, <strong>{getTodayFormattedDate()}</strong>, kami yang bertanda tangan di bawah ini secara sadar dan tanpa paksaan sepakat mengikatkan diri dalam perikatan hukum perdata:
                          </p>
                          <div className="grid grid-cols-2 gap-2 pt-0.5">
                            <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                              <span className="text-[11px] font-bold text-blue-600 uppercase block">PIHAK PERTAMA</span>
                              <span className="font-semibold text-slate-900 text-[12px] sm:text-[13px]">{freelancerName || '-'}</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                              <span className="text-[11px] font-bold text-indigo-600 uppercase block">PIHAK KEDUA</span>
                              <span className="font-semibold text-slate-900 text-[12px] sm:text-[13px]">{clientName || '-'}</span>
                            </div>
                          </div>
                        </div>

                        {/* RENDER PASAL HALAMAN 1 (14px-15px Title, 12px-13px Content) */}
                        <div className="space-y-2 sm:space-y-2.5">
                          {page1Clauses.map((clause, index) => (
                            <div key={clause.id} className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                              <h3 className="text-[14px] sm:text-[15px] font-bold text-slate-900 flex items-center gap-1.5">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    activeDocTab === 'SPK'
                                      ? 'bg-blue-600'
                                      : activeDocTab === 'NDA'
                                      ? 'bg-indigo-600'
                                      : 'bg-purple-600'
                                  }`}
                                />
                                {activeDocTab === 'BAST'
                                  ? `Poin ${index + 1} — ${clause.title}`
                                  : `Pasal ${index + 1} — ${clause.title}`}
                              </h3>
                              <p className="text-slate-700 pl-3.5 text-[12px] sm:text-[13px] leading-[1.5] font-normal">
                                {clause.content}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Kolom Tanda Tangan Utama di Halaman 1 (Jika Tidak Butuh Hal 2) */}
                        {!needsPage2 && (
                          <div className="pt-2 sm:pt-3 grid grid-cols-2 gap-3 sm:gap-4 text-center">
                            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 sm:p-3 space-y-1.5">
                              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                                PIHAK PERTAMA
                              </span>
                              <div className="h-8 sm:h-12 flex items-center justify-center">
                                {signatureFirstParty ? (
                                  <img src={signatureFirstParty} alt="Tanda Tangan Pihak Pertama" className="max-h-8 sm:max-h-12 mx-auto object-contain" />
                                ) : isExporting ? (
                                  <div className="h-8 sm:h-12 w-full" />
                                ) : (
                                  <div className="w-20 sm:w-28 h-6 sm:h-8 border border-dashed border-slate-300/80 rounded-lg flex items-center justify-center text-[10px] text-slate-400">
                                    [Tanda Tangan]
                                  </div>
                                )}
                              </div>
                              <p className="font-bold underline text-slate-900 text-[12px] sm:text-[13px]">
                                {signerFirstParty || freelancerName || 'Pihak Pertama'}
                              </p>
                            </div>

                            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 sm:p-3 space-y-1.5">
                              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
                                PIHAK KEDUA
                              </span>
                              <div className="h-8 sm:h-12 flex items-center justify-center">
                                {signatureSecondParty ? (
                                  <img src={signatureSecondParty} alt="Tanda Tangan Pihak Kedua" className="max-h-8 sm:max-h-12 mx-auto object-contain" />
                                ) : isExporting ? (
                                  <div className="h-8 sm:h-12 w-full" />
                                ) : (
                                  <div className="w-20 sm:w-28 h-6 sm:h-8 border border-dashed border-slate-300/80 rounded-lg flex items-center justify-center text-[10px] text-slate-400">
                                    [Tanda Tangan]
                                  </div>
                                )}
                              </div>
                              <p className="font-bold underline text-slate-900 text-[12px] sm:text-[13px]">
                                {signerSecondParty || clientName || 'Pihak Kedua'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Halaman 1 */}
                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[10px] sm:text-[11px] text-slate-500 font-normal relative z-10">
                        <span className="flex items-center gap-1 font-mono">
                          Paraf I: [ {signatureFirstParty ? <img src={signatureFirstParty} alt="Paraf I" className="h-3 sm:h-4 inline-block object-contain" /> : '___'} ]
                          &nbsp;|&nbsp;
                          Paraf II: [ {signatureSecondParty ? <img src={signatureSecondParty} alt="Paraf II" className="h-3 sm:h-4 inline-block object-contain" /> : '___'} ]
                        </span>
                        <span className="font-mono">Hal 1 dari {totalPages}</span>
                      </div>
                    </div>

                    {/* HALAMAN 2 */}
                    {needsPage2 && (
                      <div
                        className="a4-page w-full max-w-[794px] min-h-[1123px] h-auto bg-white text-slate-900 p-6 sm:p-8 relative flex flex-col justify-between shadow-xl rounded-xl border border-slate-200 shrink-0"
                      >
                        {/* Watermark Overlay Halaman 2 */}
                        {!paidDocs[activeDocTab] && (
                          <div className="watermark-layer absolute inset-0 pointer-events-none z-20 flex items-center justify-center overflow-hidden">
                            <span className="text-5xl sm:text-7xl font-black tracking-[0.25em] text-slate-300/25 uppercase select-none -rotate-12 transform">
                              SPKINSTAN
                            </span>
                          </div>
                        )}

                        <div
                          ref={page2ContentRef}
                          className="space-y-3 sm:space-y-3.5 text-[12px] sm:text-[13px] leading-[1.5] text-slate-700 relative z-10"
                        >
                          {/* Header Top Accent Bar */}
                          <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 w-full rounded-full shadow-xs mb-4" />

                          {/* RENDER PASAL SISA DI HALAMAN 2 */}
                          {page2Clauses.length > 0 && (
                            <div className="space-y-2 sm:space-y-2.5 mb-4">
                              {page2Clauses.map((clause, index) => (
                                <div key={clause.id} className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                                  <h3 className="text-[14px] sm:text-[15px] font-bold text-slate-900 flex items-center gap-1.5">
                                    <span
                                      className={`w-2 h-2 rounded-full ${
                                        activeDocTab === 'SPK'
                                          ? 'bg-blue-600'
                                          : activeDocTab === 'NDA'
                                          ? 'bg-indigo-600'
                                          : 'bg-purple-600'
                                      }`}
                                    />
                                    {activeDocTab === 'BAST'
                                      ? `Poin ${index + page1Clauses.length + 1} — ${clause.title}`
                                      : `Pasal ${index + page1Clauses.length + 1} — ${clause.title}`}
                                  </h3>
                                  <p className="text-slate-700 pl-3.5 text-[12px] sm:text-[13px] leading-[1.5] font-normal">
                                    {clause.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Lembar Pengesahan Header */}
                          <div className="bg-slate-50/80 p-3 sm:p-4 rounded-xl border border-slate-200/80 space-y-1">
                            <h3 className="text-[13px] sm:text-[14px] font-bold text-slate-900 uppercase tracking-wide">
                              LEMBAR PENGESAHAN & PENANDATANGANAN
                            </h3>
                            <p className="text-slate-700 text-[12px] sm:text-[13px] leading-[1.5] font-normal">
                              Demikian Perjanjian ini dibuat dan disepakati oleh Para Pihak dalam keadaan sadar tanpa paksaan dari pihak manapun untuk dipergunakan sebagaimana mestinya.
                            </p>
                          </div>

                          {/* Signature Enclosure Boxes Halaman 2 */}
                          <div className="pt-4 sm:pt-6 grid grid-cols-2 gap-3 sm:gap-4 text-center">
                            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3">
                              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                                PIHAK PERTAMA
                              </span>
                              <div className="h-10 sm:h-14 flex items-center justify-center">
                                {signatureFirstParty ? (
                                  <img src={signatureFirstParty} alt="Tanda Tangan Pihak Pertama" className="max-h-10 sm:max-h-14 mx-auto object-contain" />
                                ) : isExporting ? (
                                  <div className="h-10 sm:h-14 w-full" />
                                ) : (
                                  <div className="w-20 sm:w-28 h-7 sm:h-9 border border-dashed border-slate-300/80 rounded-lg flex items-center justify-center text-[10px] text-slate-400">
                                    [Tanda Tangan]
                                  </div>
                                )}
                              </div>
                              <p className="font-bold underline text-slate-900 text-[12px] sm:text-[13px]">
                                {signerFirstParty || freelancerName || 'Pihak Pertama'}
                              </p>
                            </div>

                            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3">
                              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
                                PIHAK KEDUA
                              </span>
                              <div className="h-10 sm:h-14 flex items-center justify-center">
                                {signatureSecondParty ? (
                                  <img src={signatureSecondParty} alt="Tanda Tangan Pihak Kedua" className="max-h-10 sm:max-h-14 mx-auto object-contain" />
                                ) : isExporting ? (
                                  <div className="h-10 sm:h-14 w-full" />
                                ) : (
                                  <div className="w-20 sm:w-28 h-7 sm:h-9 border border-dashed border-slate-300/80 rounded-lg flex items-center justify-center text-[10px] text-slate-400">
                                    [Tanda Tangan]
                                  </div>
                                )}
                              </div>
                              <p className="font-bold underline text-slate-900 text-[12px] sm:text-[13px]">
                                {signerSecondParty || clientName || 'Pihak Kedua'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Footer Halaman 2 */}
                        <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[10px] sm:text-[11px] text-slate-500 font-normal relative z-10">
                          <span className="flex items-center gap-1 font-mono">
                            Paraf I: [ {signatureFirstParty ? <img src={signatureFirstParty} alt="Paraf I" className="h-3 sm:h-4 inline-block object-contain" /> : '___'} ]
                            &nbsp;|&nbsp;
                            Paraf II: [ {signatureSecondParty ? <img src={signatureSecondParty} alt="Paraf II" className="h-3 sm:h-4 inline-block object-contain" /> : '___'} ]
                          </span>
                          <span className="font-mono">Hal 2 dari 2</span>
                        </div>
                      </div>
                    )}

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
                        onClick={() => handleIndividualDownload(activeDocTab)}
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
                Forum Testimoni Pengguna
              </h3>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Ulasan Terverifikasi
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
                    Jadilah pengguna pertama yang membagikan ulasan setelah mengunduh dokumen legal Anda. Ulasan terverifikasi akan ditampilkan di sini.
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
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
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
                            <span className="bg-amber-500 text-white text-[9px] px-1 py-0.5 rounded font-black uppercase">
                              -60%
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-normal">Unduh sekaligus 3 Dokumen (SPK + NDA + BAST)</span>
                        </div>
                        <span className="font-extrabold text-emerald-700 text-sm">Rp 1.000</span>
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
                          : 'Bayar via Mayar Payment Gateway (Rp 1.000)'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Payment Process View dengan Portal Eksternal & Banner Peringatan */}
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
                    Rp 1.000
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Paket: <strong>{selectedPackage === 'SINGLE' ? `Single Document (${activeDocTab})` : 'Bundling (SPK + NDA + BAST)'}</strong>
                  </p>
                </div>

                {/* BANNER PERINGATAN KUNING / AMBER TEGAS */}
                <div className="bg-amber-50 border-2 border-amber-300 text-amber-900 p-3.5 rounded-2xl text-[11px] text-left leading-relaxed font-medium space-y-1 shadow-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="uppercase tracking-wider text-[10px]">Peringatan Penting Pembayaran</span>
                  </div>
                  <p>
                    <strong>Mohon jangan menutup atau me-refresh tab ini setelah melakukan pembayaran.</strong> Tunggu beberapa saat hingga sistem memverifikasi transaksi secara otomatis dan menampilkan tombol unduh dokumen Anda di halaman ini.
                  </p>
                </div>

                {/* Direct Link Pembayaran Portal Resmi Mayar (Bebas Masalah Iframe Redirection) */}
                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 w-full space-y-4 text-center">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Portal Pembayaran Resmi Mayar
                    </span>
                    <p className="text-xs text-slate-600">
                      Klik tombol di bawah ini untuk membuka halaman pembayaran resmi Mayar (QRIS, VA, E-Wallet) di tab baru.
                    </p>
                  </div>

                  {paymentUrl ? (
                    <a
                      href={paymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition"
                    >
                      <span>BUKA PORTAL PEMBAYARAN MAYAR (TAB BARU)</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <div className="w-full py-4 rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-500 font-bold gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Menyiapkan Link Pembayaran Mayar...</span>
                    </div>
                  )}

                  <span className="block text-[10px] font-bold text-slate-400">
                    Secured by Mayar Payment Gateway (QRIS, Bank Transfer, E-Wallet)
                  </span>
                </div>

                {/* Indikator Status Pelunasan */}
                {isProcessingSuccess ? (
                  <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg text-center space-y-1">
                    <div className="flex items-center justify-center gap-2 font-black text-sm">
                      <CheckCircle className="w-5 h-5" />
                      <span>Pembayaran Terdeteksi!</span>
                    </div>
                    <p className="text-xs text-emerald-100 font-medium">
                      Sedang memproses verifikasi & menyiapkan dokumen, mohon tunggu sebentar...
                    </p>
                  </div>
                ) : (
                  <div className="text-[11px] text-emerald-600 font-semibold flex items-center justify-center gap-2 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>Sistem memverifikasi pelunasan secara real-time...</span>
                  </div>
                )}

                {/* Tombol Verifikasi Server Redis */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    disabled={isVerifyingPayment || isProcessingSuccess}
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

      {/* PHASE 2 & 4: Modal Sukses Ringkas (Download Hub Steril Tanpa Spinner Berputar) */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 text-center my-8 max-h-[90vh] overflow-y-auto relative">

            {/* Header Modal Sukses & Tombol X Close */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-left">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-extrabold text-slate-900 uppercase">
                  Pusat Unduhan Dokumen Legal
                </span>
              </div>
              <button
                type="button"
                onClick={handleCloseSuccessModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Header Status Sukses */}
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Pembayaran Terverifikasi Lunas!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Watermark telah dicabut. Silakan unduh dokumen Anda di bawah ini:
              </p>
            </div>

            {/* BOX PERINGATAN ZERO DATABASE */}
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 text-left space-y-1">
              <div className="flex items-center gap-1.5 font-extrabold text-amber-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>PENTING: Segera Unduh & Simpan Dokumen!</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                Platform ini berjalan <strong>tanpa database & tanpa login</strong>. Jika Tab ini ditutup, Anda <strong>tidak bisa mengunduh ulang</strong> dan Admin juga tidak menyimpan/memiliki riwayat file Anda.
              </p>
            </div>

            {/* PUSAT UNDUHAN BUNDLING (3 FILE TERPISAH + TOMBOL BATCH) */}
            {selectedPackage === 'BUNDLING' ? (
              <div className="space-y-3 pt-1 text-left">
                {/* Tombol Unduh Sekaligus Semua File */}
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleDownloadAllBundling}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition"
                >
                  {processingDoc === 'ALL' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>MENGUNDUH PAKET BUNDLING (SPK, NDA, BAST)...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>UNDUH SEMUA 3 DOKUMEN SEKALIGUS</span>
                    </>
                  )}
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-2 text-[10px] text-slate-400 font-bold uppercase">
                    Atau Unduh File Satu per Satu
                  </span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <div className="space-y-2">
                  {/* Tombol 1 - SPK */}
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => handleIndividualDownload('SPK')}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
                      downloadedDocs.SPK
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>1. Perjanjian Kerja Sama (SPK)</span>
                    </div>
                    <span className="font-extrabold flex items-center gap-1 text-[11px]">
                      {processingDoc === 'SPK' ? (
                        <span className="text-blue-600 flex items-center gap-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memproses...
                        </span>
                      ) : downloadedDocs.SPK ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> ✓ Terunduh
                        </span>
                      ) : (
                        <span className="text-blue-600 flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" /> Unduh PDF
                        </span>
                      )}
                    </span>
                  </button>

                  {/* Tombol 2 - NDA */}
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => handleIndividualDownload('NDA')}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
                      downloadedDocs.NDA
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-indigo-600" />
                      <span>2. Perjanjian Kerahasiaan (NDA)</span>
                    </div>
                    <span className="font-extrabold flex items-center gap-1 text-[11px]">
                      {processingDoc === 'NDA' ? (
                        <span className="text-indigo-600 flex items-center gap-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memproses...
                        </span>
                      ) : downloadedDocs.NDA ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> ✓ Terunduh
                        </span>
                      ) : (
                        <span className="text-indigo-600 flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" /> Unduh PDF
                        </span>
                      )}
                    </span>
                  </button>

                  {/* Tombol 3 - BAST */}
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => handleIndividualDownload('BAST')}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
                      downloadedDocs.BAST
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-purple-600" />
                      <span>3. Berita Acara Serah Terima (BAST)</span>
                    </div>
                    <span className="font-extrabold flex items-center gap-1 text-[11px]">
                      {processingDoc === 'BAST' ? (
                        <span className="text-purple-600 flex items-center gap-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memproses...
                        </span>
                      ) : downloadedDocs.BAST ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> ✓ Terunduh
                        </span>
                      ) : (
                        <span className="text-purple-600 flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" /> Unduh PDF
                        </span>
                      )}
                    </span>
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 text-center pt-1">
                  *Pengguna Apple/Safari: Anda dapat mengunduh file satu per satu kapan saja. Modal tidak akan tertutup secara otomatis.
                </p>
              </div>
            ) : (
              /* DOKUMEN SATUAN */
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleIndividualDownload(paidDocTarget)}
                  className={`w-full py-3.5 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition border ${
                    downloadedDocs[paidDocTarget]
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30'
                  }`}
                >
                  {processingDoc === paidDocTarget ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memproses PDF {paidDocTarget}...</span>
                    </>
                  ) : downloadedDocs[paidDocTarget] ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
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

            {/* Bagian Bantuan & Kirim WA */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleShareWhatsApp()}
                className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Draf ke WhatsApp Pihak Kedua</span>
              </button>
            </div>

            {/* Bagian Ulasan WA */}
            <div className="pt-1 border-t border-slate-100">
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3 text-center space-y-1.5">
                <div className="text-xs font-extrabold text-slate-900 flex items-center justify-center gap-1.5">
                  <MessageSquarePlus className="w-4 h-4 text-emerald-600" />
                  <span>Berikan Ulasan & Kritik via WhatsApp</span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 max-w-xs mx-auto">
                  Pengalaman Anda sangat berharga. Kirim kesan atau masukan Anda langsung ke WhatsApp Admin Business kami.
                </p>
                <a
                  href={`https://wa.me/${adminWaNumber}?text=${encodeURIComponent("Halo Admin SPKInstan, saya baru saja membuat dokumen dan ingin memberikan ulasan/kritik:")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat WA Admin Business</span>
                </a>
              </div>
            </div>

            {/* Tombol Selesai & Pembersihan Explicit */}
            <button
              type="button"
              onClick={handleCloseSuccessModal}
              className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition"
            >
              Selesai & Tutup Modal
            </button>

          </div>
        </div>
      )}

      {/* Floating WhatsApp Chat Widget */}
      <a
        href={`https://wa.me/${adminWaNumber}?text=${encodeURIComponent("Halo Admin SPKInstan, saya butuh bantuan mengenai pembuatan dokumen.")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 md:bottom-6 right-6 z-50 bg-emerald-500 hover:bg-emerald-600 text-white p-3.5 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        aria-label="Chat WhatsApp Admin"
      >
        <MessageCircle className="w-6 h-6" />
      </a>

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
              handleIndividualDownload(activeDocTab);
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
                Platform generator perjanjian legal perdata instan bagi profesional & agensi mikro Indonesia.
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
                <li>UU No. 30 Tahun 2000 (Rahasia Dagang)</li>
                <li>UU No. 28 Tahun 2014 (Hak Cipta)</li>
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
                href={`https://wa.me/${adminWaNumber}?text=${encodeURIComponent("Halo Admin SPKInstan, saya butuh bantuan")}`}
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