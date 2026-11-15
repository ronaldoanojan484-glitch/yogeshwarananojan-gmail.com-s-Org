import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Check,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  Lock,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Unlock,
  Upload,
} from 'lucide-react';
import {
  adminChangePassword,
  adminChangePin,
  adminLogin,
  adminLogout,
  adminResumePinMode,
  adminSendPasswordReset,
  adminSetPin,
  adminVerifyPin,
  buildAdminSetupSql,
  deleteOrder,
  grantAccess,
  listOrders,
  revokeAccess,
  saveBooksAndLocks,
  saveSettings,
} from '../services/aacdb';
import type {
  AppSettings,
  BookLockMode,
  CustomBook,
  CustomBookPage,
  MainBookLockMode,
  OrderRecord,
  OrderStatus,
} from '../types';

interface AdminPortalProps {
  settings: AppSettings;
  adminAuthenticated: boolean;
  onAdminAuthenticated: (authed: boolean) => void;
  onSettingsUpdated: (next: AppSettings) => void;
  onPreviewAsAdmin: (customBookId?: string) => void;
  onExit: () => void;
  onToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

type StatusFilter = 'ALL' | OrderStatus;

function splitTextIntoBookPages(rawText: string, defaultTitle = 'Section'): CustomBookPage[] {
  const normalized = rawText.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  if (/^---PAGE---$/m.test(normalized)) {
    return normalized
      .split(/^---PAGE---$/m)
      .map((chunk, idx) => {
        const lines = chunk.trim().split('\n');
        const firstLine = (lines[0] || '').trim();
        if (lines.length > 1 && firstLine.length > 0 && firstLine.length <= 65) {
          return {
            title: firstLine.replace(/^#+\s*/, ''),
            content: lines.slice(1).join('\n').trim(),
          };
        }
        return {
          title: `${defaultTitle} - Page ${idx + 1}`,
          content: chunk.trim(),
        };
      })
      .filter((p) => p.content.length > 0 || p.title.length > 0);
  }

  // Auto-split long plain text into clean mobile-friendly chunks (~850 chars by paragraph)
  const paragraphs = normalized.split(/\n{2,}/);
  const pages: CustomBookPage[] = [];
  let buffer = '';

  for (const para of paragraphs) {
    if (buffer && buffer.length + para.length + 2 > 850) {
      pages.push({
        title: `${defaultTitle} - Page ${pages.length + 1}`,
        content: buffer.trim(),
      });
      buffer = para;
    } else {
      buffer = buffer ? `${buffer}\n\n${para}` : para;
    }
  }
  if (buffer.trim()) {
    pages.push({
      title: `${defaultTitle} - Page ${pages.length + 1}`,
      content: buffer.trim(),
    });
  }
  return pages;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  settings,
  adminAuthenticated,
  onAdminAuthenticated,
  onSettingsUpdated,
  onPreviewAsAdmin,
  onExit,
  onToast,
}) => {
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(!adminAuthenticated);
  const [loginError, setLoginError] = useState('');
  const [showSqlHelp, setShowSqlHelp] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [resetSending, setResetSending] = useState(false);

  const [pinMode, setPinMode] = useState<'create' | 'verify' | null>(null);
  const [resumedEmail, setResumedEmail] = useState<string>('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // Dashboard state
  const [activeTab, setActiveTab] = useState<'orders' | 'books' | 'settings'>('orders');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Settings form state
  const [formSettings, setFormSettings] = useState<AppSettings>(settings);
  const [savingSettings, setSavingSettings] = useState(false);

  // Books & Lock Manager state
  const [booksSaving, setBooksSaving] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [showBookForm, setShowBookForm] = useState(false);
  const [bookTitle, setBookTitle] = useState('');
  const [bookSubtitle, setBookSubtitle] = useState('');
  const [bookBadge, setBookBadge] = useState('NEW EDITION 2026');
  const [bookDesc, setBookDesc] = useState('');
  const [bookLockMode, setBookLockMode] = useState<BookLockMode>('paid');
  const [bookPreviewPages, setBookPreviewPages] = useState(1);
  const [bookPages, setBookPages] = useState<CustomBookPage[]>([
    { title: 'Page 1: Introduction', content: '' },
  ]);
  const [bulkText, setBulkText] = useState('');
  const [showBulkImporter, setShowBulkImporter] = useState(false);
  const [confirmDeleteBookId, setConfirmDeleteBookId] = useState<string | null>(null);

  // PIN & Password change
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState('');

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMsg, setPassMsg] = useState('');

  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  // Resume existing Supabase Admin session cleanly straight to PIN screen
  useEffect(() => {
    if (adminAuthenticated) {
      setCheckingSession(false);
      return;
    }
    let mounted = true;
    adminResumePinMode()
      .then((res) => {
        if (!mounted) return;
        if (res.ok && res.data) {
          setResumedEmail(res.data.email);
          setPinMode(res.data.pinMode);
        }
      })
      .finally(() => {
        if (mounted) setCheckingSession(false);
      });
    return () => {
      mounted = false;
    };
  }, [adminAuthenticated]);

  const fetchOrders = async (query = searchQuery, silent = false) => {
    if (!silent) setOrdersLoading(true);
    setOrdersError('');
    const res = await listOrders(query, 200);
    if (!silent) setOrdersLoading(false);
    if (res.ok && res.data) {
      setOrders(res.data);
    } else if (res.error) {
      setOrdersError(res.error.message);
      if (!silent) onToast(res.error.message, 'error');
    }
  };

  useEffect(() => {
    if (!adminAuthenticated) return;
    const timer = setTimeout(() => {
      fetchOrders(searchQuery);
    }, 240);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminAuthenticated, searchQuery]);

  // Auto-refresh orders every 20s while Admin Dashboard Orders tab is open
  useEffect(() => {
    if (!adminAuthenticated || activeTab !== 'orders') return;
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchOrders(searchQuery, true);
      }
    }, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminAuthenticated, activeTab, searchQuery]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!email.trim() || !password) {
      setLoginError('Please enter admin email and password.');
      return;
    }
    setLoginLoading(true);
    const res = await adminLogin(email, password);
    setLoginLoading(false);
    if (!res.ok || !res.data) {
      setLoginError(res.error?.message || 'Login failed.');
      if (res.error?.code === 'NOT_ADMIN' || res.error?.code === 'AUTH') {
        setShowSqlHelp(true);
      }
      return;
    }
    setResumedEmail(email.trim());
    setPinMode(res.data.pinMode);
    setPinInput('');
    setPinError('');
  };

  const handleSendPasswordReset = async () => {
    setLoginError('');
    setResetSending(true);
    const res = await adminSendPasswordReset(email);
    setResetSending(false);
    if (!res.ok) {
      setLoginError(res.error?.message || 'Could not send reset email.');
      return;
    }
    onToast('Password reset link sent to your admin email!', 'success');
  };

  const handleCopySql = async () => {
    const sql = buildAdminSetupSql(email);
    try {
      await navigator.clipboard.writeText(sql);
      setCopiedSql(true);
      onToast('Supabase Admin SQL copied!', 'success');
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      onToast('Copy failed. Please select and copy manually.', 'error');
    }
  };

  const handleSwitchAccount = async () => {
    await adminLogout();
    setPinMode(null);
    setResumedEmail('');
    setPinInput('');
    setPinError('');
    setPassword('');
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setPinLoading(true);
    const res =
      pinMode === 'create'
        ? await adminSetPin(pinInput.trim())
        : await adminVerifyPin(pinInput.trim());
    setPinLoading(false);

    if (!res.ok) {
      setPinError(res.error?.message || 'PIN verification failed.');
      return;
    }
    setPinInput('');
    setPinMode(null);
    onAdminAuthenticated(true);
    onToast('Admin Dashboard unlocked.', 'success');
  };

  const handleApprove = async (id: string, isReactivate = false) => {
    setBusyOrderId(id);
    const res = await grantAccess(id);
    setBusyOrderId(null);
    if (!res.ok) {
      onToast(res.error?.message || 'Approval failed', 'error');
      return;
    }
    onToast(isReactivate ? `Order ${id} re-activated.` : `Order ${id} approved!`, 'success');
    fetchOrders(searchQuery, true);
  };

  const handleRevoke = async (id: string) => {
    setBusyOrderId(id);
    const res = await revokeAccess(id);
    setBusyOrderId(null);
    if (!res.ok) {
      onToast(res.error?.message || 'Deactivation failed', 'error');
      return;
    }
    onToast(`Order ${id} deactivated.`, 'info');
    fetchOrders(searchQuery, true);
  };

  const handleDelete = async (id: string) => {
    setBusyOrderId(id);
    const res = await deleteOrder(id);
    setBusyOrderId(null);
    if (!res.ok) {
      onToast(res.error?.message || 'Remove failed', 'error');
      return;
    }
    setConfirmDeleteId(null);
    onToast(`Contact & order ${id} removed.`, 'info');
    fetchOrders(searchQuery, true);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    const res = await saveSettings(formSettings);
    setSavingSettings(false);
    if (!res.ok) {
      onToast(res.error?.message || 'Failed to save settings.', 'error');
      return;
    }
    onSettingsUpdated(formSettings);
    onToast('Portal settings saved to database!', 'success');
  };

  // Books & Lock Manager Handlers
  const currentBooks: CustomBook[] = settings.books || [];
  const currentMainLock: MainBookLockMode = settings.mainBookLock || 'preview_5';

  const handleMainLockChange = async (mode: MainBookLockMode) => {
    setBooksSaving(true);
    const res = await saveBooksAndLocks(currentBooks, mode, settings);
    setBooksSaving(false);
    if (!res.ok || !res.data) {
      onToast(res.error?.message || 'Failed to update main book lock.', 'error');
      return;
    }
    onSettingsUpdated(res.data);
    onToast('Master Book lock mode updated!', 'success');
  };

  const resetBookForm = () => {
    setEditingBookId(null);
    setBookTitle('');
    setBookSubtitle('');
    setBookBadge('NEW EDITION 2026');
    setBookDesc('');
    setBookLockMode('paid');
    setBookPreviewPages(1);
    setBookPages([{ title: 'Page 1: Introduction', content: '' }]);
    setBulkText('');
    setShowBulkImporter(false);
    setShowBookForm(false);
  };

  const startCreateNewBook = () => {
    resetBookForm();
    setShowBookForm(true);
  };

  const startEditBook = (b: CustomBook) => {
    setEditingBookId(b.id);
    setBookTitle(b.title);
    setBookSubtitle(b.subtitle);
    setBookBadge(b.badge || 'NEW EDITION 2026');
    setBookDesc(b.description);
    setBookLockMode(b.lockMode);
    setBookPreviewPages(b.previewPages);
    setBookPages(
      b.pages.length > 0
        ? b.pages.map((p) => ({ ...p }))
        : [{ title: 'Page 1', content: '' }]
    );
    setShowBulkImporter(false);
    setShowBookForm(true);
  };

  const handleBulkApply = () => {
    const parsed = splitTextIntoBookPages(bulkText, bookTitle.trim() || 'Book');
    if (parsed.length === 0) {
      onToast('Please paste some book text first.', 'error');
      return;
    }
    setBookPages(parsed);
    setBulkText('');
    setShowBulkImporter(false);
    onToast(`Imported ${parsed.length} pages cleanly!`, 'success');
  };

  const handleTxtFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      const baseTitle = file.name.replace(/\.[^.]+$/, '');
      if (!bookTitle.trim()) setBookTitle(baseTitle);
      const parsed = splitTextIntoBookPages(content, baseTitle);
      if (parsed.length === 0) {
        onToast('The uploaded file appears empty.', 'error');
      } else {
        setBookPages(parsed);
        setShowBulkImporter(false);
        onToast(`Loaded ${parsed.length} pages from ${file.name}!`, 'success');
      }
    } catch {
      onToast('Could not read file.', 'error');
    }
    e.target.value = '';
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = bookTitle.trim();
    if (!cleanTitle) {
      onToast('Book Title is required.', 'error');
      return;
    }
    const cleanPages = bookPages
      .map((p, idx) => ({
        title: p.title.trim() || `Page ${idx + 1}`,
        content: p.content.trim(),
      }))
      .filter((p) => p.content.length > 0);

    if (cleanPages.length === 0) {
      onToast('Please add content for at least 1 page.', 'error');
      return;
    }

    const nextBook: CustomBook = {
      id: editingBookId || `book-${Date.now()}`,
      title: cleanTitle,
      subtitle: bookSubtitle.trim() || 'Digital Self-Study Edition',
      description: bookDesc.trim() || `${cleanPages.length}-page digital learning book.`,
      badge: bookBadge.trim() || 'NEW EDITION 2026',
      lockMode: bookLockMode,
      previewPages: bookLockMode === 'paid' ? Math.max(0, Number(bookPreviewPages) || 0) : 0,
      pages: cleanPages,
      createdAt:
        (editingBookId && currentBooks.find((b) => b.id === editingBookId)?.createdAt) ||
        new Date().toISOString(),
    };

    const nextBooks = editingBookId
      ? currentBooks.map((b) => (b.id === editingBookId ? nextBook : b))
      : [nextBook, ...currentBooks];

    setBooksSaving(true);
    const res = await saveBooksAndLocks(nextBooks, currentMainLock, settings);
    setBooksSaving(false);
    if (!res.ok || !res.data) {
      onToast(res.error?.message || 'Could not save book to database.', 'error');
      return;
    }
    onSettingsUpdated(res.data);
    resetBookForm();
    onToast(editingBookId ? 'Book updated & synced!' : 'New book added & synced live!', 'success');
  };

  const handleToggleBookLock = async (bookId: string, nextMode: BookLockMode) => {
    const nextBooks = currentBooks.map((b) =>
      b.id === bookId ? { ...b, lockMode: nextMode } : b
    );
    setBooksSaving(true);
    const res = await saveBooksAndLocks(nextBooks, currentMainLock, settings);
    setBooksSaving(false);
    if (!res.ok || !res.data) {
      onToast(res.error?.message || 'Failed to update book lock.', 'error');
      return;
    }
    onSettingsUpdated(res.data);
    const label =
      nextMode === 'paid' ? 'Paid Lock (Approved Only)' : nextMode === 'full_lock' ? 'Full Lock (Closed)' : 'Free Open';
    onToast(`Book set to: ${label}`, 'success');
  };

  const handleDeleteBook = async (bookId: string) => {
    const nextBooks = currentBooks.filter((b) => b.id !== bookId);
    setBooksSaving(true);
    const res = await saveBooksAndLocks(nextBooks, currentMainLock, settings);
    setBooksSaving(false);
    if (!res.ok || !res.data) {
      onToast(res.error?.message || 'Delete failed.', 'error');
      return;
    }
    setConfirmDeleteBookId(null);
    onSettingsUpdated(res.data);
    onToast('Book removed from library.', 'info');
  };

  const handleChangePin = async () => {
    setPinChangeMsg('');
    if (newPin !== confirmPin) {
      setPinChangeMsg('New PIN confirmation does not match.');
      return;
    }
    const res = await adminChangePin(oldPin.trim(), newPin.trim());
    if (!res.ok) {
      setPinChangeMsg(res.error?.message || 'PIN update failed.');
      return;
    }
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    setPinChangeMsg('Admin PIN updated successfully!');
    onToast('Admin PIN updated.', 'success');
  };

  const handleChangePassword = async () => {
    setPassMsg('');
    const res = await adminChangePassword(newPass, confirmPass);
    if (!res.ok) {
      setPassMsg(res.error?.message || 'Password update failed.');
      return;
    }
    setNewPass('');
    setConfirmPass('');
    setPassMsg('Admin password updated successfully!');
    onToast('Admin password updated.', 'success');
  };

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings: formSettings,
      orders,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AAC_Royal_Orders_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onToast('Exported JSON database backup.', 'success');
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imp = JSON.parse(text);
      if (imp.settings) {
        const next: AppSettings = {
          ...formSettings,
          ...imp.settings,
          bank: { ...formSettings.bank, ...(imp.settings.bank || {}) },
        };
        setFormSettings(next);
        const res = await saveSettings(next);
        if (res.ok) {
          onSettingsUpdated(next);
          onToast('Imported & saved settings from JSON!', 'success');
        } else {
          onToast(res.error?.message || 'Import save failed.', 'error');
        }
      } else {
        onToast('Invalid settings JSON structure.', 'error');
      }
    } catch {
      onToast('Invalid JSON file.', 'error');
    }
    e.target.value = '';
  };

  const handleLogout = async () => {
    await adminLogout();
    onAdminAuthenticated(false);
    setPinMode(null);
    setResumedEmail('');
    setPassword('');
    onExit();
  };

  if (!adminAuthenticated) {
    return (
      <section className="max-w-[440px] mx-auto my-8">
        <div className="rounded-2xl border border-[#382c18] bg-[#12100d] p-6 text-center shadow-2xl">
          <h2 className="font-royal text-xl text-[#f7e4b2] mb-2">Admin Login</h2>
          <p className="text-xs text-[#a39886] mb-5">
            Enter admin email and password to unlock Master Control Center.
          </p>

          {checkingSession ? (
            <div className="py-8 text-xs text-[#a39886]">Checking active admin session...</div>
          ) : !pinMode ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3 text-left">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Admin email"
                autoComplete="email"
                className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-3 rounded-xl text-sm outline-none focus:border-[#d4ad5d]"
              />
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  maxLength={64}
                  autoComplete="current-password"
                  className="w-full bg-[#0a0907] border border-[#382c18] text-white pl-3.5 pr-11 py-3 rounded-xl text-sm outline-none focus:border-[#d4ad5d]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#a39886] hover:text-[#f7e4b2] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full min-h-[44px] rounded-xl gold-gradient-bg text-[#171107] font-extrabold text-sm cursor-pointer disabled:opacity-60"
              >
                {loginLoading ? 'Verifying...' : 'Unlock Admin Dashboard'}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  disabled={resetSending}
                  onClick={handleSendPasswordReset}
                  className="text-[11px] text-[#d4ad5d] hover:underline cursor-pointer disabled:opacity-50"
                >
                  {resetSending ? 'Sending...' : 'Forgot Password? Send Reset Email'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlHelp((v) => !v)}
                  className="text-[11px] text-[#a39886] hover:text-[#f7e4b2] underline cursor-pointer"
                >
                  {showSqlHelp ? 'Hide Setup Help' : 'Supabase Setup Help'}
                </button>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-[#450a0a]/60 border border-[#f87171]/60 text-xs text-[#fecaca] text-center">
                  {loginError}
                </div>
              )}

              {showSqlHelp && (
                <div className="mt-3 p-3.5 rounded-xl bg-[#17130b] border border-[#d4ad5d]/50 text-left space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#f7e4b2] flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#d4ad5d]" />
                      Fix Admin Login in Supabase
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="px-2.5 py-1 rounded-lg gold-gradient-bg text-[#171107] text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-[#a39886] leading-relaxed">
                    1. In Supabase Dashboard → <b>Authentication → Users</b>, create your email
                    with <b>Auto Confirm User</b> enabled.
                    <br />
                    2. Paste this SQL in <b>SQL Editor</b> to authorize your email as Admin:
                  </p>
                  <pre className="bg-[#090806] border border-[#382c18] rounded-lg p-2.5 text-[10px] font-mono-code text-[#ded4bf] overflow-x-auto whitespace-pre-wrap select-text">
                    {buildAdminSetupSql(email)}
                  </pre>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={handlePinSubmit} className="space-y-3">
              {resumedEmail && (
                <div className="text-[11px] text-[#34d399] font-semibold">
                  Signed in as {resumedEmail}
                </div>
              )}
              <h3 className="font-royal text-base text-[#f7e4b2]">
                {pinMode === 'create' ? 'Create Admin PIN' : 'Enter Admin PIN'}
              </h3>
              <p className="text-xs text-[#a39886]">
                {pinMode === 'create'
                  ? 'Set a 4 to 8 digit security PIN for your admin account.'
                  : 'Enter your 4 to 8 digit admin PIN.'}
              </p>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="PIN"
                autoComplete="off"
                className="w-full bg-[#0a0907] border border-[#382c18] text-[#f7e4b2] px-3 py-3 rounded-xl text-2xl tracking-[10px] text-center outline-none focus:border-[#d4ad5d]"
              />
              <button
                type="submit"
                disabled={pinLoading}
                className="w-full min-h-[44px] rounded-xl gold-gradient-bg text-[#171107] font-extrabold text-sm cursor-pointer disabled:opacity-60"
              >
                {pinLoading ? 'Checking...' : 'Confirm PIN'}
              </button>
              {pinError && <p className="text-xs text-[#f87171]">{pinError}</p>}
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="text-[11px] text-[#a39886] underline hover:text-[#f7e4b2] cursor-pointer"
              >
                Switch Admin Account
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={onExit}
            className="mt-4 text-xs text-[#a39886] underline hover:text-[#f7e4b2] cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </section>
    );
  }

  const pendingCount = orders.filter((o) => o.status === 'Pending').length;
  const approvedCount = orders.filter((o) => o.status === 'Approved').length;
  const revokedCount = orders.filter((o) => o.status === 'Revoked').length;
  const filteredOrders =
    statusFilter === 'ALL' ? orders : orders.filter((o) => o.status === statusFilter);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="font-royal text-xl text-[#f7e4b2]">Master Control Center</h2>
          <span className="text-xs text-[#a39886]">
            Manage Orders, Approvals, Deactivations, New Books &amp; Locks
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onPreviewAsAdmin()}
            className="min-h-[38px] px-3 py-1.5 rounded-xl gold-gradient-bg text-[#171107] text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview Full Book</span>
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="min-h-[38px] px-3 py-1.5 rounded-xl border border-[#6e552d] text-[#f7e4b2] text-xs font-semibold hover:bg-[#261d0f] cursor-pointer"
          >
            Export JSON DB
          </button>
          <label className="min-h-[38px] px-3 py-1.5 rounded-xl border border-[#6e552d] text-[#f7e4b2] text-xs font-semibold hover:bg-[#261d0f] cursor-pointer inline-flex items-center">
            Import JSON Settings
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
          <button
            type="button"
            onClick={handleLogout}
            className="min-h-[38px] px-3 py-1.5 rounded-xl border border-[#f87171]/60 text-[#f87171] text-xs font-semibold hover:bg-[#450a0a]/40 cursor-pointer"
          >
            Log out
          </button>
          <button
            type="button"
            onClick={onExit}
            className="min-h-[38px] px-3 py-1.5 rounded-xl border border-[#6e552d] text-[#f7e4b2] text-xs font-semibold hover:bg-[#261d0f] cursor-pointer"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-[#352611] border-[#d4ad5d] text-[#f7e4b2]'
              : 'bg-[#15110a] border-[#382c18] text-[#c4b69b]'
          }`}
        >
          Orders &amp; Approvals {pendingCount > 0 ? `(${pendingCount} Pending)` : ''}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('books')}
          className={`px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'books'
              ? 'bg-[#352611] border-[#d4ad5d] text-[#f7e4b2]'
              : 'bg-[#15110a] border-[#382c18] text-[#c4b69b]'
          }`}
        >
          Books &amp; Lock Manager ({currentBooks.length + 1})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-[#352611] border-[#d4ad5d] text-[#f7e4b2]'
              : 'bg-[#15110a] border-[#382c18] text-[#c4b69b]'
          }`}
        >
          App Customizer
        </button>
      </div>

      {/* TAB 1: ORDERS & APPROVALS */}
      {activeTab === 'orders' && (
        <div className="rounded-2xl border border-[#382c18] bg-[#12100d] p-5 shadow-xl space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-[#f7e4b2]">
                Customer Orders (Latest 200 &amp; Auto-Refresh)
              </h3>
              <p className="text-[11px] text-[#a39886]">
                Approve new orders to unlock, or Deactivate anytime to immediately lock customer
                access.
              </p>
            </div>
            <div className="flex gap-2 items-center w-full sm:w-auto">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Name, Phone, Ref..."
                className="flex-1 sm:w-60 bg-[#0a0907] border border-[#382c18] text-white px-3 py-2 rounded-lg text-xs outline-none focus:border-[#d4ad5d]"
              />
              <button
                type="button"
                onClick={() => fetchOrders()}
                className="px-3 py-2 rounded-lg border border-[#6e552d] text-xs text-[#f7e4b2] hover:bg-[#261d0f] inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['ALL', `All (${orders.length})`],
                ['Pending', `Pending (${pendingCount})`],
                ['Approved', `Approved (${approvedCount})`],
                ['Revoked', `Deactivated (${revokedCount})`],
              ] as [StatusFilter, string][]
            ).map(([st, label]) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#261d0f] border-[#d4ad5d] text-[#f7e4b2]'
                    : 'bg-[#0e0c09] border-[#382c18] text-[#a39886]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {ordersError && (
            <div className="p-3 rounded-xl bg-[#450a0a]/60 border border-[#f87171]/60 text-xs text-[#fecaca]">
              Error loading orders: {ordersError}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-[#382c18]">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#16120b] text-[#f7e4b2]">
                  <th className="p-3 border-b border-[#382c18]">Order ID</th>
                  <th className="p-3 border-b border-[#382c18]">Payment Ref</th>
                  <th className="p-3 border-b border-[#382c18]">Customer</th>
                  <th className="p-3 border-b border-[#382c18]">Mobile</th>
                  <th className="p-3 border-b border-[#382c18]">Status</th>
                  <th className="p-3 border-b border-[#382c18]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ordersLoading ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-[#a39886]">
                      Loading orders...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-[#a39886]">
                      No customer records found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const isBusy = busyOrderId === order.id;
                    return (
                      <tr key={order.id} className="border-b border-[#382c18] hover:bg-[#1a150e]">
                        <td className="p-3 font-bold tabular-nums">{order.id}</td>
                        <td className="p-3 font-mono-code text-[#f7e4b2] tabular-nums">
                          {order.paymentRef}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-[#f7f2e7]">{order.name}</div>
                          {order.school && order.school !== 'N/A' && (
                            <div className="text-[11px] text-[#a39886]">{order.school}</div>
                          )}
                        </td>
                        <td className="p-3 font-mono-code tabular-nums">{order.phone}</td>
                        <td className="p-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              order.status === 'Approved'
                                ? 'bg-[#0f3d23] text-[#34d399]'
                                : order.status === 'Revoked'
                                  ? 'bg-[#450a0a] text-[#f87171]'
                                  : 'bg-[#423010] text-[#f5d482]'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {order.status === 'Pending' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleApprove(order.id, false)}
                                className="px-2.5 py-1.5 rounded-lg gold-gradient-bg text-[#171107] font-bold text-[11px] cursor-pointer disabled:opacity-50"
                              >
                                {isBusy ? 'Saving...' : 'Approve'}
                              </button>
                            )}
                            {order.status === 'Approved' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleRevoke(order.id)}
                                className="px-2.5 py-1.5 rounded-lg border border-[#f87171]/60 text-[#f87171] font-semibold text-[11px] hover:bg-[#450a0a]/40 cursor-pointer disabled:opacity-50"
                              >
                                {isBusy ? 'Saving...' : 'Deactivate'}
                              </button>
                            )}
                            {order.status === 'Revoked' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleApprove(order.id, true)}
                                className="px-2.5 py-1.5 rounded-lg gold-gradient-bg text-[#171107] font-bold text-[11px] cursor-pointer disabled:opacity-50"
                              >
                                {isBusy ? 'Saving...' : 'Re-active'}
                              </button>
                            )}

                            {confirmDeleteId === order.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleDelete(order.id)}
                                  className="px-2 py-1 rounded bg-[#dc2626] text-white font-bold text-[11px] cursor-pointer disabled:opacity-50"
                                >
                                  Confirm Remove
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 rounded border border-[#382c18] text-[#a39886] text-[11px] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => setConfirmDeleteId(order.id)}
                                className="px-2.5 py-1.5 rounded-lg border border-[#6e552d] text-[#ded4bf] text-[11px] hover:bg-[#261d0f] cursor-pointer disabled:opacity-50"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: BOOKS & LOCK MANAGER */}
      {activeTab === 'books' && (
        <div className="space-y-5">
          {/* Master Book Lock Control */}
          <div className="rounded-2xl border border-[#382c18] bg-[#12100d] p-5 shadow-xl space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="font-royal text-base text-[#f7e4b2]">
                  Main Book Lock Control: PC Master Kit 2026 (122 Pages + 59 Templates)
                </h3>
                <p className="text-xs text-[#a39886]">
                  Control how visitors and unpaid users view the main 122-page book.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onPreviewAsAdmin()}
                className="px-3 py-1.5 rounded-lg border border-[#6e552d] text-xs text-[#f7e4b2] font-semibold hover:bg-[#261d0f] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Main Book</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(
                [
                  [
                    'preview_5',
                    'Paid Lock + 5-Page Preview',
                    'Visitors preview 5 pages & 2 sample templates; Paid/Approved users unlock all 122 pages.',
                    Lock,
                  ],
                  [
                    'strict_lock',
                    'Strict Lock (0 Preview)',
                    'Preview locked completely. Only Approved customers can open the book.',
                    ShieldAlert,
                  ],
                  [
                    'free_all',
                    'Unlocked for All (Free)',
                    'Everyone can read all 122 pages without ordering.',
                    Unlock,
                  ],
                ] as const
              ).map(([mode, title, desc, Icon]) => {
                const active = currentMainLock === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    disabled={booksSaving}
                    onClick={() => handleMainLockChange(mode)}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer disabled:opacity-60 ${
                      active
                        ? 'bg-[#261d0f] border-[#d4ad5d] shadow-[0_0_15px_rgba(212,173,93,0.18)]'
                        : 'bg-[#0c0a08] border-[#382c18] hover:border-[#6e552d]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-[#f7e4b2] mb-1">
                      <Icon className="w-3.5 h-3.5 text-[#d4ad5d]" />
                      <span>{title}</span>
                    </div>
                    <p className="text-[11px] text-[#a39886] leading-relaxed">{desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Added Books Section */}
          <div className="rounded-2xl border border-[#382c18] bg-[#12100d] p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="font-royal text-base text-[#f7e4b2]">
                  New Books Library ({currentBooks.length})
                </h3>
                <p className="text-xs text-[#a39886]">
                  Add new books &amp; control Lock/Unlock status per book anytime.
                </p>
              </div>
              {!showBookForm && (
                <button
                  type="button"
                  onClick={startCreateNewBook}
                  className="min-h-[40px] px-4 py-2 rounded-xl gold-gradient-bg text-[#171107] font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Book</span>
                </button>
              )}
            </div>

            {showBookForm && (
              <form
                onSubmit={handleSaveBook}
                className="rounded-xl border border-[#d4ad5d]/60 bg-[#0c0a08] p-4 sm:p-5 space-y-4"
              >
                <div className="flex justify-between items-center border-b border-[#382c18] pb-2.5">
                  <h4 className="font-royal text-sm text-[#f7e4b2]">
                    {editingBookId ? 'Edit Book' : 'Create & Publish New Book'}
                  </h4>
                  <button
                    type="button"
                    onClick={resetBookForm}
                    className="text-xs text-[#a39886] hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#d4ad5d] mb-1">
                      Book Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={bookTitle}
                      onChange={(e) => setBookTitle(e.target.value)}
                      placeholder="e.g. AI Tools & Prompts Mastery 2026"
                      className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#d4ad5d] mb-1">
                      Subtitle / Tagline
                    </label>
                    <input
                      type="text"
                      value={bookSubtitle}
                      onChange={(e) => setBookSubtitle(e.target.value)}
                      placeholder="e.g. Complete Self-Study Guide"
                      className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#d4ad5d] mb-1">
                      Badge Label
                    </label>
                    <input
                      type="text"
                      value={bookBadge}
                      onChange={(e) => setBookBadge(e.target.value)}
                      placeholder="NEW EDITION 2026"
                      className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#d4ad5d] mb-1">
                      Lock Setting
                    </label>
                    <select
                      value={bookLockMode}
                      onChange={(e) => setBookLockMode(e.target.value as BookLockMode)}
                      className="w-full bg-[#0a0907] border border-[#382c18] text-[#f7e4b2] font-bold px-3 py-2.5 rounded-xl text-sm"
                    >
                      <option value="paid">🔐 Paid Lock (Approved Customers Only)</option>
                      <option value="full_lock">⛔ Full Lock (Closed for Everyone)</option>
                      <option value="free">🔓 Free Open (Readable by All)</option>
                    </select>
                  </div>
                </div>

                {bookLockMode === 'paid' && (
                  <div className="max-w-xs">
                    <label className="block text-xs font-bold text-[#d4ad5d] mb-1">
                      Free Preview Pages (0 = Completely Locked)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={bookPreviewPages}
                      onChange={(e) => setBookPreviewPages(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3 py-2 rounded-xl text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#d4ad5d] mb-1">
                    Short Description
                  </label>
                  <textarea
                    rows={2}
                    value={bookDesc}
                    onChange={(e) => setBookDesc(e.target.value)}
                    placeholder="What will readers learn in this book?"
                    className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3 py-2 rounded-xl text-sm"
                  />
                </div>

                {/* Pages Builder + Quick Importer */}
                <div className="border-t border-[#382c18] pt-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#f7e4b2]">
                      Book Pages ({bookPages.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <label className="px-3 py-1.5 rounded-lg border border-[#6e552d] text-[#f7e4b2] text-[11px] font-semibold hover:bg-[#261d0f] inline-flex items-center gap-1.5 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload .txt Book</span>
                        <input
                          type="file"
                          accept=".txt,.md"
                          onChange={handleTxtFileUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowBulkImporter((v) => !v)}
                        className="px-3 py-1.5 rounded-lg border border-[#6e552d] text-[#f7e4b2] text-[11px] font-semibold hover:bg-[#261d0f] cursor-pointer"
                      >
                        {showBulkImporter ? 'Close Paste Box' : 'Paste & Auto-Split Pages'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setBookPages((prev) => [
                            ...prev,
                            { title: `Page ${prev.length + 1}`, content: '' },
                          ])
                        }
                        className="px-3 py-1.5 rounded-lg gold-gradient-bg text-[#171107] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Page</span>
                      </button>
                    </div>
                  </div>

                  {showBulkImporter && (
                    <div className="p-3 rounded-xl bg-[#141009] border border-[#382c18] space-y-2">
                      <p className="text-[11px] text-[#a39886]">
                        Paste your book content below. Put <code className="text-[#f7e4b2]">---PAGE---</code> between pages, or paste continuous text to auto-split into mobile pages.
                      </p>
                      <textarea
                        rows={6}
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        placeholder="Paste book text here..."
                        className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3 py-2 rounded-xl text-xs font-mono-code"
                      />
                      <button
                        type="button"
                        onClick={handleBulkApply}
                        className="px-4 py-1.5 rounded-lg gold-gradient-bg text-[#171107] text-xs font-bold cursor-pointer"
                      >
                        Convert into Book Pages
                      </button>
                    </div>
                  )}

                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {bookPages.map((pg, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#141009] border border-[#382c18] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-[#d4ad5d]">
                            Page {idx + 1}
                          </span>
                          {bookPages.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setBookPages((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-[11px] text-[#f87171] hover:underline cursor-pointer"
                            >
                              Remove Page
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={pg.title}
                          onChange={(e) =>
                            setBookPages((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, title: e.target.value } : item
                              )
                            )
                          }
                          placeholder={`Page ${idx + 1} heading`}
                          className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3 py-2 rounded-lg text-xs font-bold"
                        />
                        <textarea
                          rows={3}
                          value={pg.content}
                          onChange={(e) =>
                            setBookPages((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, content: e.target.value } : item
                              )
                            )
                          }
                          placeholder="Enter page content..."
                          className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3 py-2 rounded-lg text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={booksSaving}
                    className="min-h-[42px] px-5 py-2 rounded-xl gold-gradient-bg text-[#171107] font-extrabold text-xs cursor-pointer disabled:opacity-60"
                  >
                    {booksSaving
                      ? 'Saving to Database...'
                      : editingBookId
                        ? 'Save Book Changes'
                        : 'Publish Book'}
                  </button>
                  <button
                    type="button"
                    onClick={resetBookForm}
                    className="min-h-[42px] px-4 py-2 rounded-xl border border-[#382c18] text-[#a39886] text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {currentBooks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#382c18] p-6 text-center text-xs text-[#a39886]">
                No extra books added yet. Click <b>Add New Book</b> above to publish another book
                and lock/unlock it anytime.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentBooks.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl border border-[#382c18] bg-[#0c0a08] p-4 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#1b1712] text-[#d4ad5d] border border-[#382c18]">
                          {b.badge || 'BOOK'} • {b.pages.length} Pages
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                            b.lockMode === 'free'
                              ? 'bg-[#0f3d23] text-[#34d399]'
                              : b.lockMode === 'full_lock'
                                ? 'bg-[#450a0a] text-[#f87171]'
                                : 'bg-[#423010] text-[#f5d482]'
                          }`}
                        >
                          {b.lockMode === 'free'
                            ? '🔓 Free Open'
                            : b.lockMode === 'full_lock'
                              ? '⛔ Full Lock'
                              : `🔐 Paid Lock (${b.previewPages}p Preview)`}
                        </span>
                      </div>
                      <h4 className="font-royal text-sm text-[#f7e4b2] flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#d4ad5d] shrink-0" />
                        <span>{b.title}</span>
                      </h4>
                      <p className="text-xs text-[#a39886] mt-1">{b.description}</p>
                    </div>

                    <div className="space-y-2 border-t border-[#382c18] pt-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          disabled={booksSaving}
                          onClick={() => handleToggleBookLock(b.id, 'paid')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                            b.lockMode === 'paid'
                              ? 'bg-[#423010] border-[#d4ad5d] text-[#f7e4b2]'
                              : 'border-[#382c18] text-[#a39886]'
                          }`}
                        >
                          🔐 Paid Lock
                        </button>
                        <button
                          type="button"
                          disabled={booksSaving}
                          onClick={() => handleToggleBookLock(b.id, 'full_lock')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                            b.lockMode === 'full_lock'
                              ? 'bg-[#450a0a] border-[#f87171] text-[#fecaca]'
                              : 'border-[#382c18] text-[#a39886]'
                          }`}
                        >
                          ⛔ Full Lock
                        </button>
                        <button
                          type="button"
                          disabled={booksSaving}
                          onClick={() => handleToggleBookLock(b.id, 'free')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                            b.lockMode === 'free'
                              ? 'bg-[#0f3d23] border-[#34d399] text-[#d1fae5]'
                              : 'border-[#382c18] text-[#a39886]'
                          }`}
                        >
                          🔓 Free Open
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => onPreviewAsAdmin(b.id)}
                            className="px-2.5 py-1 rounded-lg border border-[#6e552d] text-[#f7e4b2] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditBook(b)}
                            className="px-2.5 py-1 rounded-lg border border-[#6e552d] text-[#f7e4b2] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        </div>

                        {confirmDeleteBookId === b.id ? (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteBook(b.id)}
                              className="px-2 py-1 rounded bg-[#dc2626] text-white text-[10px] font-bold cursor-pointer"
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteBookId(null)}
                              className="px-2 py-1 rounded border border-[#382c18] text-[#a39886] text-[10px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteBookId(b.id)}
                            className="px-2.5 py-1 rounded-lg border border-[#f87171]/50 text-[#f87171] text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: APP CUSTOMIZER & ADMIN SECURITY */}
      {activeTab === 'settings' && (
        <div className="rounded-2xl border border-[#382c18] bg-[#12100d] p-5 shadow-xl space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <h3 className="font-royal text-lg text-[#f7e4b2]">Portal Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#d4ad5d] mb-1.5">
                  Portal Brand Title
                </label>
                <input
                  type="text"
                  value={formSettings.title}
                  onChange={(e) => setFormSettings({ ...formSettings, title: e.target.value })}
                  className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#d4ad5d] mb-1.5">
                  Admin WhatsApp Number (e.g. 94750274368)
                </label>
                <input
                  type="text"
                  value={formSettings.whatsapp}
                  onChange={(e) => setFormSettings({ ...formSettings, whatsapp: e.target.value })}
                  className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#d4ad5d] mb-1.5">
                  Official License Registration Number
                </label>
                <input
                  type="text"
                  value={formSettings.license}
                  onChange={(e) => setFormSettings({ ...formSettings, license: e.target.value })}
                  className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#d4ad5d] mb-1.5">
                  Hero Announcement Tag
                </label>
                <input
                  type="text"
                  value={formSettings.hero_tag}
                  onChange={(e) => setFormSettings({ ...formSettings, hero_tag: e.target.value })}
                  className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#d4ad5d] mb-1.5">
                Anti-Piracy Legal Notice Text
              </label>
              <textarea
                rows={3}
                value={formSettings.legal_notice}
                onChange={(e) => setFormSettings({ ...formSettings, legal_notice: e.target.value })}
                className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-2.5 rounded-xl text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#d4ad5d] mb-1.5">Bank Name</label>
                <input
                  type="text"
                  value={formSettings.bank.bank}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      bank: { ...formSettings.bank, bank: e.target.value },
                    })
                  }
                  className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#d4ad5d] mb-1.5">Branch</label>
                <input
                  type="text"
                  value={formSettings.bank.branch}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      bank: { ...formSettings.bank, branch: e.target.value },
                    })
                  }
                  className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#d4ad5d] mb-1.5">Account No</label>
                <input
                  type="text"
                  value={formSettings.bank.account_no}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      bank: { ...formSettings.bank, account_no: e.target.value },
                    })
                  }
                  className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#d4ad5d] mb-1.5">
                  Account Name
                </label>
                <input
                  type="text"
                  value={formSettings.bank.account_name}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      bank: { ...formSettings.bank, account_name: e.target.value },
                    })
                  }
                  className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="max-w-xs">
              <label className="block text-xs font-bold text-[#d4ad5d] mb-1.5">Price (LKR)</label>
              <input
                type="number"
                min={1}
                value={formSettings.price_lkr}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, price_lkr: Number(e.target.value) || 600 })
                }
                className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-2.5 rounded-xl text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="min-h-[44px] px-6 py-2.5 rounded-xl gold-gradient-bg text-[#171107] font-extrabold text-sm cursor-pointer disabled:opacity-60"
            >
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </form>

          {/* Change Admin PIN */}
          <div className="border-t border-dashed border-[#382c18] pt-5 space-y-3 max-w-md">
            <h4 className="text-sm font-bold text-[#d4ad5d]">Change Admin PIN</h4>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={oldPin}
              onChange={(e) => setOldPin(e.target.value)}
              placeholder="Current PIN"
              className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-2.5 rounded-xl text-sm tracking-[6px]"
            />
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="New PIN (4–8 digits)"
              className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-2.5 rounded-xl text-sm tracking-[6px]"
            />
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="Confirm new PIN"
              className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-2.5 rounded-xl text-sm tracking-[6px]"
            />
            <button
              type="button"
              onClick={handleChangePin}
              className="min-h-[42px] px-5 py-2 rounded-xl gold-gradient-bg text-[#171107] font-bold text-xs cursor-pointer"
            >
              Update PIN
            </button>
            {pinChangeMsg && <p className="text-xs text-[#f7e4b2]">{pinChangeMsg}</p>}
          </div>

          {/* Change Admin Password */}
          <div className="border-t border-dashed border-[#382c18] pt-5 space-y-3 max-w-md">
            <h4 className="text-sm font-bold text-[#d4ad5d]">
              Change Admin Password (min 8 characters)
            </h4>
            <input
              type="password"
              autoComplete="new-password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="New password"
              className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-2.5 rounded-xl text-sm"
            />
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Confirm new password"
              className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-2.5 rounded-xl text-sm"
            />
            <button
              type="button"
              onClick={handleChangePassword}
              className="min-h-[42px] px-5 py-2 rounded-xl gold-gradient-bg text-[#171107] font-bold text-xs cursor-pointer"
            >
              Update Password
            </button>
            {passMsg && <p className="text-xs text-[#f7e4b2]">{passMsg}</p>}
          </div>
        </div>
      )}
    </section>
  );
};
