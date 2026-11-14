import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Home,
  Lock,
  Package,
  Presentation,
  ShieldAlert,
  ShoppingCart,
  Unlock,
  X,
} from 'lucide-react';
import { AdminPortal } from './components/AdminPortal';
import { OfflineIndicator, PWAInstallButton } from './components/PWAWidgets';
import { ReaderView } from './components/ReaderView';
import { RoyalLogo } from './components/RoyalLogo';
import {
  CHAPTERS,
  EXCEL_TEMPLATES,
  PPT_TEMPLATES,
  WORD_TEMPLATES,
  buildAll59TemplatesString,
} from './data/bookData';
import { I18N } from './data/i18n';
import {
  SUPABASE_CONFIG,
  checkReader,
  createOrder,
  getSettings,
  normalizePhone,
} from './services/aacdb';
import type {
  AppSettings,
  CustomerSession,
  LanguageCode,
  OrderRecord,
  PageView,
  ReaderCategory,
  StoreTab,
  TemplateItem,
  ToastMessage,
} from './types';

const LANG_KEY = 'AAC_LANG_PREF';
const READER_SESSION_KEY = 'AAC_READER_SESSION_V1';
const PREVIEW_TEMPLATE_LIMIT = 2;

function loadSavedCustomer(): CustomerSession | null {
  try {
    const raw = localStorage.getItem(READER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CustomerSession> | null;
    if (
      parsed &&
      typeof parsed.id === 'string' &&
      typeof parsed.name === 'string' &&
      typeof parsed.phone === 'string' &&
      typeof parsed.paymentRef === 'string' &&
      parsed.status === 'Approved'
    ) {
      return {
        id: parsed.id,
        name: parsed.name,
        phone: parsed.phone,
        paymentRef: parsed.paymentRef,
        status: 'Approved',
      };
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

function saveCustomerSession(sess: CustomerSession | null) {
  try {
    if (sess && sess.status === 'Approved') {
      localStorage.setItem(READER_SESSION_KEY, JSON.stringify(sess));
    } else {
      localStorage.removeItem(READER_SESSION_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export default function App() {
  const [page, setPage] = useState<PageView>('home');
  const [lang, setLang] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY) as LanguageCode | null;
      return saved && I18N[saved] ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  const [settings, setSettings] = useState<AppSettings>(SUPABASE_CONFIG.DEFAULTS);
  const [activeCustomer, setActiveCustomer] = useState<CustomerSession | null>(() =>
    loadSavedCustomer()
  );
  const [previewMode, setPreviewMode] = useState(false);

  // Reader navigation targets
  const [readerCategory, setReaderCategory] = useState<ReaderCategory>('book');
  const [readerTplIdx, setReaderTplIdx] = useState(0);
  const [readerStartPage, setReaderStartPage] = useState(1);

  // Store state
  const [storeTab, setStoreTab] = useState<StoreTab>('book');
  const [modalTemplate, setModalTemplate] = useState<{
    item: TemplateItem;
    cat: 'word' | 'excel' | 'ppt';
    idx: number;
  } | null>(null);
  const [showReadmeModal, setShowReadmeModal] = useState(false);

  // Order form state
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custSchool, setCustSchool] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<OrderRecord | null>(null);
  const [orderError, setOrderError] = useState('');
  const [copiedBankAcc, setCopiedBankAcc] = useState(false);

  // Reader Auth state
  const [authName, setAuthName] = useState(() => loadSavedCustomer()?.name || '');
  const [authPhone, setAuthPhone] = useState(() => loadSavedCustomer()?.phone || '');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [pendingRow, setPendingRow] = useState<{
    id: string;
    payment_ref: string;
    status: string;
  } | null>(null);

  // Admin state
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);

  // Security states
  const [securityBanner, setSecurityBanner] = useState(false);
  const [privacyShield, setPrivacyShield] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const logoTapRef = useRef<{ count: number; lastTap: number }>({ count: 0, lastTap: 0 });
  const t = I18N[lang] || I18N.en;

  const showToast = useCallback((text: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev.slice(-2), { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3600);
  }, []);

  // Load settings from Supabase on mount
  useEffect(() => {
    getSettings().then((res) => {
      if (res.ok && res.data) {
        setSettings(res.data);
      }
    });
  }, []);

  // Sync document title
  useEffect(() => {
    document.title = `${settings.title} | PC Master Kit 2026 & 59 Templates`;
  }, [settings.title]);

  // Language change persistence
  const handleLanguageChange = (nextLang: LanguageCode) => {
    setLang(nextLang);
    try {
      localStorage.setItem(LANG_KEY, nextLang);
    } catch {
      // Ignore storage error
    }
  };

  // Anti-Inspect Keyboard Deterrent + Ctrl+Shift+A Admin Shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        openAdminPortal();
        return;
      }
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) ||
        (e.ctrlKey && ['u', 'U', 'p', 'P'].includes(e.key))
      ) {
        e.preventDefault();
        setSecurityBanner(true);
        setTimeout(() => setSecurityBanner(false), 3000);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Privacy Blur Shield when reader is active and window loses focus/visibility
  useEffect(() => {
    if (page !== 'reader-view') {
      setPrivacyShield(false);
      return;
    }
    const onVisChange = () => {
      if (document.hidden) setPrivacyShield(true);
    };
    const onBlur = () => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'SELECT') return;
      setPrivacyShield(true);
    };
    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('blur', onBlur);
    };
  }, [page]);

  // Live Supabase verification for permanently unlocked sessions (on mount, focus, online, and every 20s)
  const verifyActiveCustomerLive = useCallback(async () => {
    if (!activeCustomer) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    const res = await checkReader(activeCustomer.phone, activeCustomer.name);

    if (res.ok && res.data) {
      if (res.data.status !== 'Approved') {
        saveCustomerSession(null);
        setActiveCustomer(null);
        setPreviewMode(false);
        setAuthName(activeCustomer.name);
        setAuthPhone(activeCustomer.phone);
        setPendingRow(res.data);
        setAuthError(
          'Your access was deactivated by Admin. It will unlock automatically once Admin re-activates your order.'
        );
        setPage((curr) => (curr === 'reader-view' ? 'reader-auth' : curr));
        showToast(
          'Access deactivated by Admin. Re-activation is required to continue.',
          'error'
        );
        return;
      }

      if (
        res.data.id !== activeCustomer.id ||
        res.data.payment_ref !== activeCustomer.paymentRef ||
        res.data.name !== activeCustomer.name
      ) {
        const synced: CustomerSession = {
          id: res.data.id,
          name: res.data.name,
          phone: activeCustomer.phone,
          paymentRef: res.data.payment_ref,
          status: 'Approved',
        };
        saveCustomerSession(synced);
        setActiveCustomer(synced);
      }
      return;
    }

    if (
      !res.ok &&
      (res.error?.code === 'NOT_FOUND' || res.error?.code === 'NAME_MISMATCH')
    ) {
      saveCustomerSession(null);
      setActiveCustomer(null);
      setPreviewMode(false);
      setAuthName(activeCustomer.name);
      setAuthPhone(activeCustomer.phone);
      setPendingRow(null);
      setAuthError(res.error.message);
      setPage((curr) => (curr === 'reader-view' ? 'reader-auth' : curr));
      showToast('Access cancelled or removed by Admin.', 'error');
    }
  }, [activeCustomer, showToast]);

  useEffect(() => {
    if (!activeCustomer) return;
    verifyActiveCustomerLive();

    const timer = setInterval(() => {
      if (!document.hidden) {
        verifyActiveCustomerLive();
      }
    }, 20000);

    const onFocusOrOnline = () => {
      if (!document.hidden) verifyActiveCustomerLive();
    };
    window.addEventListener('focus', onFocusOrOnline);
    window.addEventListener('online', onFocusOrOnline);
    document.addEventListener('visibilitychange', onFocusOrOnline);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocusOrOnline);
      window.removeEventListener('online', onFocusOrOnline);
      document.removeEventListener('visibilitychange', onFocusOrOnline);
    };
  }, [activeCustomer, verifyActiveCustomerLive]);

  // Auto-poll every 15s on reader-auth when order is pending/revoked
  useEffect(() => {
    if (page !== 'reader-auth' || !pendingRow || !authPhone.trim() || !authName.trim()) {
      return;
    }
    const timer = setInterval(() => {
      if (!document.hidden) {
        verifyReaderCustomer(true);
      }
    }, 15000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pendingRow, authName, authPhone]);

  const gotoPage = (target: PageView) => {
    if (target === 'reader-auth' && activeCustomer?.status === 'Approved') {
      setPreviewMode(false);
      setPage('reader-view');
      void verifyActiveCustomerLive();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (target === 'reader-view' && !previewMode && activeCustomer?.status !== 'Approved') {
      showToast(
        `Reader Access Locked: Enter your registered Name & Mobile Number or order PC Master Kit 2026 (LKR ${settings.price_lkr}).`,
        'info'
      );
      setPage('reader-auth');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setPage(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAdminPortal = () => {
    setAdminAuthenticated(false);
    setPage('admin-login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogoTap = () => {
    const now = Date.now();
    if (now - logoTapRef.current.lastTap > 2500) {
      logoTapRef.current.count = 1;
    } else {
      logoTapRef.current.count += 1;
    }
    logoTapRef.current.lastTap = now;

    if (logoTapRef.current.count >= 5) {
      logoTapRef.current.count = 0;
      openAdminPortal();
    } else if (logoTapRef.current.count === 1) {
      gotoPage('home');
    }
  };

  const openPreview = () => {
    if (activeCustomer?.status === 'Approved') {
      setPreviewMode(false);
    } else {
      setPreviewMode(true);
    }
    setReaderCategory('book');
    setReaderStartPage(1);
    setPage('reader-view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const promptTemplateLock = () => {
    showToast(
      `Locked: Order & activate PC Master Kit 2026 (LKR ${settings.price_lkr}) to unlock all 122 pages and 59 templates.`,
      'info'
    );
    gotoPage('reader-auth');
  };

  const copyTextSafely = async (text: string, msg = 'Copied to clipboard!') => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        showToast(msg, 'success');
        return;
      }
    } catch {
      // Fallback below
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(msg, 'success');
    } catch {
      showToast('Copy failed. Please copy manually.', 'error');
    }
    document.body.removeChild(ta);
  };

  const copyAll59 = () => {
    if (activeCustomer?.status !== 'Approved') {
      promptTemplateLock();
      return;
    }
    copyTextSafely(buildAll59TemplatesString(), 'All 59 Templates copied to clipboard!');
  };

  const handleCopyBankAcc = () => {
    copyTextSafely(settings.bank.account_no, `Copied Account No: ${settings.bank.account_no}`);
    setCopiedBankAcc(true);
    setTimeout(() => setCopiedBankAcc(false), 2000);
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError('');
    setCreatedOrder(null);
    setOrderSubmitting(true);

    const res = await createOrder({
      name: custName,
      phone: custPhone,
      school: custSchool,
    });

    setOrderSubmitting(false);
    if (!res.ok || !res.data) {
      setOrderError(res.error?.message || 'Failed to submit order.');
      return;
    }

    setCreatedOrder(res.data);
    setAuthName(res.data.name);
    setAuthPhone(res.data.phone);
    showToast('Order created! Use the WhatsApp confirmation button below.', 'success');
  };

  const buildWhatsAppOrderUrl = (ord: OrderRecord) => {
    const waDigits = String(settings.whatsapp || '').replace(/\D/g, '');
    const intlWa = waDigits.startsWith('0') ? '94' + waDigits.slice(1) : waDigits;
    const msg = `*${settings.title} - OFFICIAL ORDER*
----------------------------------------
*Order ID:* ${ord.id}
*Payment Attachment Ref:* ${ord.paymentRef}
*Customer Name:* ${ord.name}
*Mobile Number:* ${ord.phone}
*Institute / School:* ${ord.school}
*Package:* PC Master Kit 2026 (122 Pages) + 59 Templates
*Price:* LKR ${settings.price_lkr}
*Bank Paid:* ${settings.bank.bank} (${settings.bank.branch}) - Acc: ${settings.bank.account_no}
*License Number:* ${settings.license}
----------------------------------------
I have submitted my order details. Please verify my payment slip and approve my full 122-page book and 59 templates access.`;
    return `https://wa.me/${intlWa}?text=${encodeURIComponent(msg)}`;
  };

  const verifyReaderCustomer = async (isAutoPoll = false) => {
    const trimmedName = authName.trim();
    const trimmedPhone = authPhone.trim();

    if (!isAutoPoll) {
      setAuthError('');
      setPendingRow(null);
      if (!trimmedName || !trimmedPhone) {
        setAuthError('Please enter both your Registered Full Name and Mobile Number.');
        return;
      }
      setAuthLoading(true);
    }

    const res = await checkReader(trimmedPhone, trimmedName);
    if (!isAutoPoll) setAuthLoading(false);

    if (!res.ok || !res.data) {
      if (!isAutoPoll) setAuthError(res.error?.message || 'Verification failed.');
      return;
    }

    const row = res.data;
    if (row.status !== 'Approved') {
      saveCustomerSession(null);
      setActiveCustomer(null);
      setPendingRow(row);
      return;
    }

    const nextSession: CustomerSession = {
      id: row.id,
      name: row.name,
      phone: normalizePhone(trimmedPhone),
      paymentRef: row.payment_ref,
      status: 'Approved',
    };

    setPendingRow(null);
    setAuthError('');
    saveCustomerSession(nextSession);
    setActiveCustomer(nextSession);
    setPreviewMode(false);
    setReaderCategory('book');
    setReaderStartPage(1);
    setPage('reader-view');
    showToast('Permanently Unlocked: Full 122-Page Book & 59 Templates Ready!', 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isUnlocked = activeCustomer?.status === 'Approved';

  const openStoreTemplateInReader = (cat: 'word' | 'excel' | 'ppt', idx: number) => {
    if (!isUnlocked && idx >= PREVIEW_TEMPLATE_LIMIT) {
      promptTemplateLock();
      return;
    }
    setModalTemplate(null);
    setPreviewMode(!isUnlocked);
    setReaderCategory(cat);
    setReaderTplIdx(idx);
    setPage('reader-view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const quickOpenChapter = (pageNum: number) => {
    if (!isUnlocked) {
      promptTemplateLock();
      return;
    }
    setPreviewMode(false);
    setReaderCategory('book');
    setReaderStartPage(pageNum);
    setPage('reader-view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    e.preventDefault();
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      onDragStart={(e) => e.preventDefault()}
      className="min-h-screen flex flex-col pb-[82px] md:pb-8"
    >
      {/* TOP HEADER */}
      <header className="sticky top-0 z-50 bg-[#070605]/95 backdrop-blur-lg border-b border-[#382c18] px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleLogoTap}
          className="flex items-center gap-3 text-left cursor-pointer shrink-0 bg-transparent border-0 p-0"
          title={settings.title}
        >
          <RoyalLogo className="w-10 h-10 sm:w-11 sm:h-11" />
          <div className="flex flex-col">
            <span className="font-black tracking-[1.4px] text-[#f7e4b2] text-xs sm:text-sm whitespace-nowrap">
              {settings.title}
            </span>
            <span className="text-[8px] text-[#d4ad5d] tracking-[2.4px] font-bold whitespace-nowrap">
              LEARN • CREATE • GROW
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <PWAInstallButton compact />

          <select
            aria-label="Language"
            value={lang}
            onChange={(e) => handleLanguageChange(e.target.value as LanguageCode)}
            className="bg-[#141009] text-[#f7e4b2] border border-[#6e552d] px-2.5 py-1.5 rounded-full text-xs font-bold outline-none cursor-pointer"
          >
            <option value="en">English</option>
            <option value="ta">தமிழ்</option>
            <option value="si">සිංහල</option>
          </select>

          <nav className="hidden md:flex items-center gap-1.5">
            {(
              [
                ['home', t.nav_home],
                ['store', t.nav_store],
                ['order', `${t.nav_order} (LKR ${settings.price_lkr})`],
                ['reader-auth', t.nav_reader],
              ] as [PageView, string][]
            ).map(([pId, label]) => (
              <button
                key={pId}
                type="button"
                onClick={() => gotoPage(pId)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap shrink-0 border transition cursor-pointer ${
                  page === pId
                    ? 'bg-[#261d0f] border-[#6e552d] text-[#f7e4b2]'
                    : 'bg-transparent border-transparent text-[#ded4bf] hover:bg-[#261d0f] hover:border-[#6e552d]'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 w-full max-w-[1160px] mx-auto px-4 py-5">
        {/* HOME PAGE */}
        {page === 'home' && (
          <section className="space-y-6">
            <div className="bg-gradient-to-br from-[#211a0d] to-[#0d0b08] border-2 border-[#d4ad5d] rounded-[18px] p-5 sm:p-7 shadow-[0_15px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(212,173,93,0.22)] grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-6 items-center">
              <div>
                <span className="inline-block gold-gradient-bg text-[#120e07] font-black text-[11px] px-3 py-1 rounded-full uppercase tracking-wider mb-3">
                  {settings.hero_tag}
                </span>

                <h1 className="font-royal text-3xl sm:text-[42px] text-white leading-[1.15] mb-2">
                  PC MASTER KIT <span className="gold-gradient-text">2026</span>
                </h1>

                <p className="text-[#f7e4b2] text-sm font-bold mb-3">{t.hero_sub}</p>
                <p className="text-[#a39886] text-[13px] leading-relaxed">{t.hero_desc}</p>

                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-4 text-[13px] text-[#f0e4cd]">
                  {[
                    'Computer Basics & Safe Computing',
                    'Microsoft Word – 100 Shortcuts',
                    'Microsoft Excel – 100 Shortcuts & 57 Functions',
                    'Microsoft PowerPoint – 100 Shortcuts',
                    'AI Tools & Online Services Prompts',
                    'Real Projects & Practical Worksheets',
                    'Practice Questions & Answer Key',
                    '122 Pages Complete Vertical Card System',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#34d399] shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-2.5 mt-5">
                  <button
                    type="button"
                    onClick={() => gotoPage('order')}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl gold-gradient-bg text-[#171107] font-extrabold text-[13px] shadow-[0_6px_18px_rgba(212,173,93,0.3)] cursor-pointer"
                  >
                    {t.btn_get_copy} (LKR {settings.price_lkr})
                  </button>
                  <button
                    type="button"
                    onClick={() => gotoPage('store')}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-[#6e552d] text-[#f7e4b2] text-[13px] font-semibold hover:bg-[#261d0f] cursor-pointer"
                  >
                    {t.btn_explore}
                  </button>
                  <button
                    type="button"
                    onClick={openPreview}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-[#f7e4b2]/60 text-[#f7e4b2] text-[13px] font-semibold hover:bg-[#261d0f] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{t.btn_preview5}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => gotoPage('reader-auth')}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-[#d4ad5d] text-[#f7e4b2] text-[13px] font-semibold hover:bg-[#261d0f] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {isUnlocked ? <Unlock className="w-4 h-4 text-[#34d399]" /> : <Lock className="w-4 h-4" />}
                    <span>{isUnlocked ? 'Open Unlocked Book (122 Pages)' : t.btn_unlock}</span>
                  </button>
                  <PWAInstallButton />
                </div>
              </div>

              {/* 3D Book Stage */}
              <div className="book-stage flex justify-center items-center min-h-[260px] sm:min-h-[300px]">
                <div className="book-3d">
                  <div className="absolute left-0 top-0 bottom-0 w-3.5 bg-gradient-to-r from-[#ebd394] to-[#875c1d] rounded-l" />
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1f160a] via-[#422e0e] to-[#130e06] border-2 border-[#ebd394] rounded-r-[14px] rounded-l-[4px] flex flex-col justify-between p-4 text-center shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
                    <div className="flex justify-center">
                      <RoyalLogo className="w-11 h-11" />
                    </div>
                    <span className="text-[9px] tracking-[1.5px] text-[#d4ad5d] font-bold">
                      ROYAL ART CREATION
                    </span>
                    <h4 className="font-royal text-[19px] text-[#f7e4b2] leading-tight">
                      PC MASTER KIT
                      <br />
                      <span className="text-white">2026</span>
                    </h4>
                    <span className="text-[8px] text-[#d5c29a] tracking-wider">
                      122 PAGES • 59 TEMPLATES
                    </span>
                    <span className="text-[9px] border border-[#ebd394] px-2 py-0.5 rounded-full text-[#ebd394] font-bold">
                      LKR {settings.price_lkr} BUNDLE
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Contact Bar */}
            <div className="rounded-2xl border border-[#382c18] bg-[#12100d] p-4 sm:p-5 grid grid-cols-2 lg:grid-cols-4 gap-4 text-center shadow-lg">
              <div>
                <span className="text-[11px] text-[#a39886] block">Direct WhatsApp</span>
                <b className="font-mono-code text-[#f7e4b2] text-sm">
                  {normalizePhone(settings.whatsapp)}
                </b>
              </div>
              <div>
                <span className="text-[11px] text-[#a39886] block">Official Support Email</span>
                <b className="text-[#f7e4b2] text-xs sm:text-[13px] break-all">
                  aacroyalartcreation@gmail.com
                </b>
              </div>
              <div>
                <span className="text-[11px] text-[#a39886] block">Publisher Location</span>
                <b className="text-[#f7e4b2] text-[13px]">Hatton, Sri Lanka</b>
              </div>
              <div>
                <span className="text-[11px] text-[#a39886] block">Delivery Guarantee</span>
                <b className="text-[#34d399] text-[13px]">Instant Digital Access</b>
              </div>
            </div>
          </section>
        )}

        {/* STORE / PACKAGE PAGE */}
        {page === 'store' && (
          <section className="rounded-2xl border border-[#382c18] bg-[#12100d] p-5 shadow-xl">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <span className="text-[11px] text-[#d4ad5d] border border-[#382c18] px-2.5 py-0.5 rounded-lg font-bold">
                  COMPLETE MASTER PACKAGE
                </span>
                <h2 className="font-royal text-xl text-[#f7e4b2] mt-2">{t.store_title}</h2>
                <p className="text-xs text-[#a39886]">
                  All resources unlocked together for LKR {settings.price_lkr} upon Admin approval.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => gotoPage('order')}
                  className="min-h-[42px] px-4 py-2 rounded-xl gold-gradient-bg text-[#171107] font-extrabold text-xs cursor-pointer"
                >
                  {t.btn_order_now} (LKR {settings.price_lkr})
                </button>
                <button
                  type="button"
                  onClick={openPreview}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl border border-[#6e552d] text-[#f7e4b2] text-xs font-semibold hover:bg-[#261d0f] cursor-pointer"
                >
                  5-Page Preview
                </button>
                <button
                  type="button"
                  onClick={copyAll59}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl bg-gradient-to-br from-[#ffd700] to-[#b8860b] text-[#171107] font-bold text-xs cursor-pointer"
                >
                  Copy All 59 Templates
                </button>
                <button
                  type="button"
                  onClick={() => setShowReadmeModal(true)}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl border border-[#6e552d] text-[#f7e4b2] text-xs font-semibold hover:bg-[#261d0f] cursor-pointer"
                >
                  Instructions Guide
                </button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 my-4">
              {(
                [
                  ['book', 'Book (122 Pages • 25 Sections)', BookOpen],
                  ['word', 'Word Templates (20)', FileText],
                  ['excel', 'Excel Templates (20)', FileSpreadsheet],
                  ['ppt', 'PowerPoint Decks (19)', Presentation],
                ] as const
              ).map(([tabId, label, Icon]) => (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => setStoreTab(tabId)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap shrink-0 border transition cursor-pointer ${
                    storeTab === tabId
                      ? 'bg-[#352611] border-[#d4ad5d] text-[#f7e4b2]'
                      : 'bg-[#15110a] border-[#382c18] text-[#c4b69b] hover:border-[#6e552d]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-3">
              {storeTab === 'book' &&
                CHAPTERS.map((c) => (
                  <div
                    key={c.p}
                    className="bg-[#0e0c09] border border-[#382c18] hover:border-[#d4ad5d] rounded-xl p-4 flex flex-col justify-between transition"
                  >
                    <div>
                      <h4 className="text-sm text-[#f7e4b2] font-bold mb-1">
                        Page {c.p}: {c.title}
                      </h4>
                      <p className="text-xs text-[#a39886]">Complete 122-Page Card System</p>
                    </div>
                    <div className="mt-3 flex justify-between items-center gap-2">
                      <span
                        className={`text-[10px] font-bold ${
                          isUnlocked ? 'text-[#34d399]' : 'text-[#d4ad5d]'
                        }`}
                      >
                        {isUnlocked ? '✓ Unlocked' : `Included in LKR ${settings.price_lkr} Pack`}
                      </span>
                      <button
                        type="button"
                        onClick={() => quickOpenChapter(c.p)}
                        className="px-3 py-1.5 rounded-lg border border-[#6e552d] text-[#f7e4b2] text-[11px] font-semibold hover:bg-[#261d0f] cursor-pointer"
                      >
                        {isUnlocked ? 'Read Page ▶' : 'Locked'}
                      </button>
                    </div>
                  </div>
                ))}

              {storeTab !== 'book' &&
                (storeTab === 'word'
                  ? WORD_TEMPLATES
                  : storeTab === 'excel'
                    ? EXCEL_TEMPLATES
                    : PPT_TEMPLATES
                ).map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-[#0e0c09] border border-[#382c18] hover:border-[#d4ad5d] rounded-xl p-4 flex flex-col justify-between transition"
                  >
                    <div>
                      <h4 className="text-sm text-[#f7e4b2] font-bold mb-1">{item.title}</h4>
                      <p className="text-xs text-[#a39886]">{item.desc}</p>
                    </div>
                    <div className="mt-3 flex justify-between items-center gap-2 flex-wrap">
                      {isUnlocked ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setModalTemplate({ item, cat: storeTab, idx })}
                            className="px-3 py-1.5 rounded-lg gold-gradient-bg text-[#171107] font-bold text-[11px] cursor-pointer"
                          >
                            Preview &amp; Copy
                          </button>
                          <button
                            type="button"
                            onClick={() => openStoreTemplateInReader(storeTab, idx)}
                            className="px-3 py-1.5 rounded-lg border border-[#6e552d] text-[#f7e4b2] text-[11px] font-semibold hover:bg-[#261d0f] cursor-pointer"
                          >
                            Open in Reader ▶
                          </button>
                        </>
                      ) : idx < PREVIEW_TEMPLATE_LIMIT ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setModalTemplate({ item, cat: storeTab, idx })}
                            className="px-3 py-1.5 rounded-lg gold-gradient-bg text-[#171107] font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Free Sample Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openStoreTemplateInReader(storeTab, idx)}
                            className="px-3 py-1.5 rounded-lg border border-[#d4ad5d]/60 text-[#f7e4b2] text-[11px] font-semibold hover:bg-[#261d0f] cursor-pointer"
                          >
                            Open Sample ▶
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={promptTemplateLock}
                            className="px-3 py-1.5 rounded-lg gold-gradient-bg text-[#171107] font-bold text-[11px] cursor-pointer"
                          >
                            Locked (LKR {settings.price_lkr})
                          </button>
                          <span className="text-[10px] text-[#f87171] font-bold">
                            Approval Required
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* ORDER PAGE WITH PROMINENT BANK DETAILS */}
        {page === 'order' && (
          <section className="max-w-[580px] mx-auto my-3">
            <div className="rounded-2xl border border-[#382c18] bg-[#12100d] p-5 sm:p-6 shadow-2xl">
              <h2 className="font-royal text-xl text-[#f7e4b2] mb-1.5">
                {t.order_title} (LKR {settings.price_lkr})
              </h2>
              <p className="text-xs text-[#a39886] mb-4 leading-relaxed">{t.order_desc}</p>

              {/* BANK TRANSFER DETAILS CARD (Consistent Royal Dark Gold Theme & Fully Responsive) */}
              <div className="bg-[#17130b] border border-[#d4ad5d]/60 rounded-xl p-4 mb-5 select-text">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-[#382c18]">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#f7e4b2]">
                    Bank Transfer Details
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyBankAcc}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#6e552d] bg-[#12100d] text-[#f7e4b2] text-[11px] font-bold hover:border-[#d4ad5d] cursor-pointer"
                  >
                    {copiedBankAcc ? <Check className="w-3 h-3 text-[#34d399]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedBankAcc ? 'Copied' : 'Copy Acc No'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-[#a39886] block text-[11px]">Bank</span>
                    <b className="text-[#f7f2e7] text-sm">{settings.bank.bank}</b>
                  </div>
                  <div>
                    <span className="text-[#a39886] block text-[11px]">Branch</span>
                    <b className="text-[#f7f2e7] text-sm">{settings.bank.branch}</b>
                  </div>
                  <div>
                    <span className="text-[#a39886] block text-[11px]">Account Number</span>
                    <b className="font-mono-code text-[#f7e4b2] text-[15px] tracking-wider tabular-nums">
                      {settings.bank.account_no}
                    </b>
                  </div>
                  <div>
                    <span className="text-[#a39886] block text-[11px]">Account Name</span>
                    <b className="text-[#f7f2e7] text-sm">{settings.bank.account_name}</b>
                  </div>
                </div>
              </div>

              <form onSubmit={handleOrderSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#d4ad5d] mb-1.5">
                    {t.lbl_name}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-3 rounded-xl text-sm outline-none focus:border-[#d4ad5d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#d4ad5d] mb-1.5">
                    {t.lbl_phone}
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={16}
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="07XXXXXXXX"
                    className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-3 rounded-xl text-sm outline-none focus:border-[#d4ad5d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#d4ad5d] mb-1.5">
                    {t.lbl_school}
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={custSchool}
                    onChange={(e) => setCustSchool(e.target.value)}
                    placeholder="School, College or Workplace"
                    className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-3 rounded-xl text-sm outline-none focus:border-[#d4ad5d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#d4ad5d] mb-1.5">
                    Package Details
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`PC Master Kit 2026 (122 Pages) + 59 Templates - LKR ${settings.price_lkr}`}
                    className="w-full bg-[#0a0907] border border-[#382c18] text-[#f7e4b2] font-bold px-3.5 py-3 rounded-xl text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={orderSubmitting}
                  className="w-full min-h-[46px] rounded-xl gold-gradient-bg text-[#171107] font-extrabold text-sm cursor-pointer disabled:opacity-60"
                >
                  {orderSubmitting ? 'Submitting Order...' : t.btn_submit_order}
                </button>
              </form>

              {orderError && (
                <div className="mt-4 bg-[#450a0a]/60 border border-[#f87171]/60 rounded-xl p-3.5 text-xs text-[#fecaca]">
                  {orderError}
                </div>
              )}

              {createdOrder && (
                <div className="mt-4 bg-[#17130b] border border-[#d4ad5d] rounded-xl p-4 text-xs text-[#ded4bf] space-y-2.5">
                  <div className="text-[#34d399] font-bold text-sm">
                    Order Created Successfully!
                  </div>
                  <div>
                    Order ID: <b className="text-[#f7e4b2]">{createdOrder.id}</b> · Ref:{' '}
                    <b className="font-mono-code text-[#f7e4b2]">{createdOrder.paymentRef}</b>
                  </div>
                  <p className="text-[#a39886]">
                    Send your bank transfer slip on WhatsApp to activate your book &amp; 59
                    templates:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={buildWhatsAppOrderUrl(createdOrder)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[42px] px-4 py-2 rounded-xl gold-gradient-bg text-[#171107] font-extrabold text-xs inline-flex items-center justify-center"
                    >
                      Open WhatsApp ({normalizePhone(settings.whatsapp)})
                    </a>
                    <button
                      type="button"
                      onClick={() => gotoPage('reader-auth')}
                      className="min-h-[42px] px-4 py-2 rounded-xl border border-[#6e552d] text-[#f7e4b2] text-xs font-semibold hover:bg-[#261d0f] cursor-pointer"
                    >
                      Go to Activation Page
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* READER AUTHENTICATION PAGE */}
        {page === 'reader-auth' && (
          <section className="max-w-[480px] mx-auto my-6">
            <div className="rounded-2xl border border-[#382c18] bg-[#12100d] p-6 shadow-2xl">
              <h2 className="font-royal text-xl text-[#f7e4b2] mb-1.5">{t.auth_title}</h2>
              <p className="text-xs text-[#a39886] mb-5">{t.auth_desc}</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#d4ad5d] mb-1.5">
                    {t.lbl_reg_name}
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-3 rounded-xl text-sm outline-none focus:border-[#d4ad5d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#d4ad5d] mb-1.5">
                    {t.lbl_reg_phone}
                  </label>
                  <input
                    type="tel"
                    maxLength={16}
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    placeholder="07XXXXXXXX"
                    className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-3 rounded-xl text-sm outline-none focus:border-[#d4ad5d]"
                  />
                </div>

                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => verifyReaderCustomer(false)}
                  className="w-full min-h-[46px] rounded-xl gold-gradient-bg text-[#171107] font-extrabold text-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{authLoading ? 'Checking Activation...' : t.btn_activate_reader}</span>
                </button>

                <button
                  type="button"
                  onClick={openPreview}
                  className="w-full min-h-[42px] rounded-xl border border-[#6e552d] text-[#f7e4b2] text-xs font-semibold hover:bg-[#261d0f] cursor-pointer"
                >
                  {t.btn_preview5}
                </button>
              </div>

              {authError && (
                <div className="mt-4 text-xs text-[#f87171] font-medium">{authError}</div>
              )}

              {pendingRow && (
                <div className="mt-4 bg-[#17130b] border border-[#f87171]/60 rounded-xl p-3.5 text-xs text-[#ded4bf] leading-relaxed">
                  Your Order (<b>{pendingRow.id}</b>) is currently{' '}
                  <b className="text-[#f5d482]">{pendingRow.status.toUpperCase()}</b>.
                  <br />
                  Payment Ref: <b className="font-mono-code">{pendingRow.payment_ref}</b>
                  <br />
                  Waiting for Admin approval — this page checks automatically every 15s while open.
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-dashed border-[#382c18] text-center">
                <p className="text-xs text-[#a39886] mb-2">Haven&apos;t ordered your copy yet?</p>
                <button
                  type="button"
                  onClick={() => gotoPage('order')}
                  className="w-full min-h-[42px] rounded-xl gold-gradient-bg text-[#171107] font-bold text-xs cursor-pointer"
                >
                  Order PC Master Kit (LKR {settings.price_lkr})
                </button>
              </div>
            </div>
          </section>
        )}

        {/* READER VIEW PAGE */}
        {page === 'reader-view' && (
          <div className={privacyShield ? 'blur-[18px] pointer-events-none transition' : ''}>
            <ReaderView
              activeCustomer={activeCustomer}
              previewMode={previewMode}
              settings={settings}
              initialCategory={readerCategory}
              initialTemplateIdx={readerTplIdx}
              initialPage={readerStartPage}
              onExit={() => gotoPage('home')}
              onGoOrder={() => gotoPage('order')}
              onGoAuth={() => gotoPage('reader-auth')}
              onLockedPrompt={promptTemplateLock}
              onToast={showToast}
            />
          </div>
        )}

        {/* ADMIN LOGIN / DASHBOARD */}
        {(page === 'admin-login' || page === 'admin-dash') && (
          <AdminPortal
            settings={settings}
            adminAuthenticated={adminAuthenticated}
            onAdminAuthenticated={(authed) => {
              setAdminAuthenticated(authed);
              setPage(authed ? 'admin-dash' : 'admin-login');
            }}
            onSettingsUpdated={(next) => setSettings(next)}
            onExit={() => {
              setAdminAuthenticated(false);
              gotoPage('home');
            }}
            onToast={showToast}
          />
        )}
      </main>

      {/* STORE TEMPLATE PREVIEW MODAL */}
      {modalTemplate && (
        <div className="fixed inset-0 z-[220] bg-black/85 backdrop-blur-sm p-4 overflow-y-auto flex items-center justify-center">
          <div className="w-full max-w-[760px] max-h-[90vh] flex flex-col rounded-2xl border-2 border-[#d4ad5d] bg-[#12100d] p-5 shadow-2xl">
            <div className="flex justify-between items-start gap-3 border-b border-[#382c18] pb-3 mb-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-[#d4ad5d] border border-[#382c18] px-2 py-0.5 rounded font-bold uppercase">
                    {modalTemplate.cat.toUpperCase()} #{modalTemplate.idx + 1}
                  </span>
                  {!isUnlocked && (
                    <span className="text-[10px] text-[#f7e4b2] border border-[#d4ad5d]/60 bg-[#271d0c] px-2 py-0.5 rounded font-bold uppercase">
                      Free Sample Preview (Read Only)
                    </span>
                  )}
                </div>
                <h3 className="font-royal text-lg text-[#f7e4b2] mt-1">
                  {modalTemplate.item.title}
                </h3>
                <p className="text-xs text-[#a39886]">{modalTemplate.item.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalTemplate(null)}
                className="p-2 rounded-lg border border-[#6e552d] text-[#f7e4b2] hover:bg-[#261d0f] cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  if (!isUnlocked) {
                    setModalTemplate(null);
                    promptTemplateLock();
                    return;
                  }
                  copyTextSafely(modalTemplate.item.text);
                }}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl gold-gradient-bg text-[#171107] font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                {isUnlocked ? <Copy className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{isUnlocked ? '1-Click Copy' : '1-Click Copy (Locked)'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isUnlocked) {
                    setModalTemplate(null);
                    promptTemplateLock();
                    return;
                  }
                  const blob = new Blob([modalTemplate.item.text], {
                    type: 'text/plain;charset=utf-8;',
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${modalTemplate.item.title.replace(/\s+/g, '_')}.txt`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#6e552d] text-[#f7e4b2] text-xs font-semibold hover:bg-[#261d0f] inline-flex items-center gap-1.5 cursor-pointer"
              >
                {isUnlocked ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{isUnlocked ? 'Download .txt' : 'Download .txt (Locked)'}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  openStoreTemplateInReader(modalTemplate.cat, modalTemplate.idx)
                }
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#d4ad5d] text-[#f7e4b2] text-xs font-semibold hover:bg-[#261d0f] cursor-pointer"
              >
                {isUnlocked ? 'Open in Full Reader' : 'Open Sample in Reader'}
              </button>
              {!isUnlocked && (
                <button
                  type="button"
                  onClick={() => {
                    setModalTemplate(null);
                    gotoPage('order');
                  }}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#34d399]/70 text-[#34d399] text-xs font-bold hover:bg-[#0f3d23]/40 cursor-pointer"
                >
                  Unlock All 59 (Order LKR {settings.price_lkr})
                </button>
              )}
            </div>

            <pre
              className={`flex-1 overflow-y-auto bg-[#090806] border border-[#382c18] rounded-xl p-4 font-mono-code text-[13px] leading-relaxed text-[#ded4bf] whitespace-pre-wrap ${
                isUnlocked ? 'select-text' : 'select-none'
              }`}
            >
              {modalTemplate.item.text}
            </pre>
          </div>
        </div>
      )}

      {/* README OFFICIAL INSTRUCTIONS MODAL */}
      {showReadmeModal && (
        <div className="fixed inset-0 z-[220] bg-black/85 backdrop-blur-sm p-4 overflow-y-auto flex items-center justify-center">
          <div className="w-full max-w-[700px] max-h-[85vh] flex flex-col rounded-2xl border-2 border-[#d4ad5d] bg-[#12100d] p-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#382c18] pb-3 mb-3">
              <h3 className="font-royal text-lg text-[#f7e4b2]">
                59 Templates Official Instructions
              </h3>
              <button
                type="button"
                onClick={() => setShowReadmeModal(false)}
                className="p-2 rounded-lg border border-[#6e552d] text-[#f7e4b2] hover:bg-[#261d0f] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="flex-1 overflow-y-auto bg-[#090806] border border-[#382c18] rounded-xl p-4 font-mono-code text-[13px] leading-relaxed text-[#ded4bf] whitespace-pre-wrap">
              {`AAC ROYAL ART CREATION - 59 TEMPLATES
======================================================================
Word       : Open > Edit [brackets] > Save As New Copy (.docx or .pdf)
Excel      : Yellow / input cells only edit, formulas calculate auto:
             =SUM, =AVERAGE, =IF, =COUNTIF, =VLOOKUP
PowerPoint : 16:9 Widescreen, Navy Blue #0A1F44 + Royal Gold #FFD700 + White
Design     : Navy Blue + Royal Gold

TOTAL TEMPLATES:
• 20 Microsoft Word Templates
• 20 Microsoft Excel Templates (with automated formulas)
• 19 Microsoft PowerPoint Presentation Decks
TOTAL = 20 + 20 + 19 = 59

Published under Official License: ${settings.license}
Support WhatsApp: ${normalizePhone(settings.whatsapp)} | Hatton, Sri Lanka`}
            </pre>
            <div className="mt-3 flex justify-between items-center gap-2">
              <button
                type="button"
                onClick={copyAll59}
                className="min-h-[42px] px-4 py-2 rounded-xl gold-gradient-bg text-[#171107] font-bold text-xs cursor-pointer"
              >
                Copy All 59 Templates
              </button>
              <button
                type="button"
                onClick={() => setShowReadmeModal(false)}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-[#6e552d] text-[#f7e4b2] text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIGH-SECURITY PRIVACY SHIELD OVERLAY */}
      {privacyShield && page === 'reader-view' && (
        <div className="fixed inset-0 z-[400] bg-[#070605]/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
          <div className="max-w-md rounded-2xl border-2 border-[#d4ad5d] bg-[#12100d] p-6 shadow-2xl">
            <h3 className="font-royal text-lg text-[#f7e4b2] mb-2">SECURITY SHIELD ACTIVE</h3>
            <p className="text-xs text-[#a39886] mb-5 leading-relaxed">
              Book content is hidden while outside this window to protect licensed material.
            </p>
            <button
              type="button"
              onClick={() => setPrivacyShield(false)}
              className="min-h-[44px] px-6 py-2.5 rounded-xl gold-gradient-bg text-[#171107] font-extrabold text-sm cursor-pointer"
            >
              Resume Reading
            </button>
          </div>
        </div>
      )}

      {/* SECURITY BANNER */}
      {securityBanner && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[450] bg-gradient-to-r from-[#450a0a] to-[#2b0a0a] border border-[#ef4444] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#f87171]" />
          <span>Security notice: Unauthorized copy, print &amp; inspect disabled.</span>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      {toasts.length > 0 && (
        <div className="fixed top-20 right-4 z-[460] space-y-2 max-w-xs w-full pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-xl px-4 py-3 text-xs font-semibold shadow-2xl border backdrop-blur-md ${
                toast.type === 'success'
                  ? 'bg-[#064e3b]/95 border-[#34d399] text-[#ecfdf5]'
                  : toast.type === 'error'
                    ? 'bg-[#450a0a]/95 border-[#f87171] text-[#fee2e2]'
                    : 'bg-[#1a140b]/95 border-[#d4ad5d] text-[#f7e4b2]'
              }`}
            >
              {toast.text}
            </div>
          ))}
        </div>
      )}

      <OfflineIndicator />

      {/* FOOTER */}
      <footer className="border-t border-[#382c18] px-5 pt-6 pb-24 md:pb-8 text-center text-xs text-[#a39886] mt-8">
        <div className="max-w-[1160px] mx-auto space-y-2">
          <p>
            <b className="text-[#f7e4b2]">
              {settings.title} — SECURE DIGITAL PUBLISHING DIVISION
            </b>
          </p>
          <p>
            Official License Registration:{' '}
            <b className="text-[#f7e4b2]">{settings.license}</b> | Published in Hatton, Sri Lanka.
          </p>
          <p className="text-[#f87171] text-[11px] max-w-[850px] mx-auto leading-relaxed">
            {settings.legal_notice}
          </p>
        </div>
      </footer>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-[64px] bg-[#0c0a08]/95 backdrop-blur-lg border-t border-[#382c18] grid grid-cols-4 items-center px-1">
        {(
          [
            ['home', t.nav_home, Home],
            ['store', t.nav_package, Package],
            ['order', t.nav_order, ShoppingCart],
            ['reader-auth', t.nav_reader, BookOpen],
          ] as const
        ).map(([pId, label, Icon]) => {
          const isActive =
            page === pId || (pId === 'reader-auth' && page === 'reader-view');
          return (
            <button
              key={pId}
              type="button"
              onClick={() => gotoPage(pId)}
              className={`flex flex-col items-center justify-center h-full gap-1 text-[11px] font-semibold cursor-pointer ${
                isActive ? 'text-[#f7e4b2]' : 'text-[#a69880]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
