import React, { useEffect, useState } from 'react';
import {
  adminChangePassword,
  adminChangePin,
  adminLogin,
  adminLogout,
  adminSetPin,
  adminVerifyPin,
  deleteOrder,
  grantAccess,
  listOrders,
  revokeAccess,
  saveSettings,
} from '../services/aacdb';
import type { AppSettings, OrderRecord } from '../types';

interface AdminPortalProps {
  settings: AppSettings;
  adminAuthenticated: boolean;
  onAdminAuthenticated: (authed: boolean) => void;
  onSettingsUpdated: (next: AppSettings) => void;
  onExit: () => void;
  onToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  settings,
  adminAuthenticated,
  onAdminAuthenticated,
  onSettingsUpdated,
  onExit,
  onToast,
}) => {
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [pinMode, setPinMode] = useState<'create' | 'verify' | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // Dashboard state
  const [activeTab, setActiveTab] = useState<'orders' | 'settings'>('orders');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Settings form state
  const [formSettings, setFormSettings] = useState<AppSettings>(settings);
  const [savingSettings, setSavingSettings] = useState(false);

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

  const fetchOrders = async (query = searchQuery) => {
    setOrdersLoading(true);
    const res = await listOrders(query, 200);
    setOrdersLoading(false);
    if (res.ok && res.data) {
      setOrders(res.data);
    } else if (res.error) {
      onToast(res.error.message, 'error');
    }
  };

  useEffect(() => {
    if (!adminAuthenticated) return;
    const timer = setTimeout(() => {
      fetchOrders(searchQuery);
    }, 280);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminAuthenticated, searchQuery]);

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
      return;
    }
    setPinMode(res.data.pinMode);
    setPinInput('');
    setPinError('');
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
    const res = await grantAccess(id);
    if (!res.ok) {
      onToast(res.error?.message || 'Approval failed', 'error');
      return;
    }
    onToast(isReactivate ? `Order ${id} re-activated.` : `Order ${id} approved!`, 'success');
    fetchOrders();
  };

  const handleRevoke = async (id: string) => {
    const res = await revokeAccess(id);
    if (!res.ok) {
      onToast(res.error?.message || 'Deactivation failed', 'error');
      return;
    }
    onToast(`Order ${id} deactivated.`, 'info');
    fetchOrders();
  };

  const handleDelete = async (id: string) => {
    const res = await deleteOrder(id);
    if (!res.ok) {
      onToast(res.error?.message || 'Remove failed', 'error');
      return;
    }
    setConfirmDeleteId(null);
    onToast(`Contact & order ${id} removed.`, 'info');
    fetchOrders();
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
    setPassword('');
    onExit();
  };

  if (!adminAuthenticated) {
    return (
      <section className="max-w-[420px] mx-auto my-8">
        <div className="rounded-2xl border border-[#382c18] bg-[#12100d] p-6 text-center shadow-2xl">
          <h2 className="font-royal text-xl text-[#f7e4b2] mb-2">Admin Login</h2>
          <p className="text-xs text-[#a39886] mb-5">
            Enter admin email and password to unlock Master Control Center.
          </p>

          {!pinMode ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3 text-left">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Admin email"
                className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-3 rounded-xl text-sm outline-none focus:border-[#d4ad5d]"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                maxLength={64}
                autoComplete="current-password"
                className="w-full bg-[#0a0907] border border-[#382c18] text-white px-3.5 py-3 rounded-xl text-sm outline-none focus:border-[#d4ad5d]"
              />
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full min-h-[44px] rounded-xl gold-gradient-bg text-[#171107] font-extrabold text-sm cursor-pointer disabled:opacity-60"
              >
                {loginLoading ? 'Verifying...' : 'Unlock Admin Dashboard'}
              </button>
              {loginError && <p className="text-xs text-[#f87171] text-center">{loginError}</p>}
            </form>
          ) : (
            <form onSubmit={handlePinSubmit} className="space-y-3">
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

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="font-royal text-xl text-[#f7e4b2]">Master Control Center</h2>
          <span className="text-xs text-[#a39886]">
            Manage Orders, Approvals, Deactivations &amp; Portal Settings
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
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
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-full text-xs font-bold border cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-[#352611] border-[#d4ad5d] text-[#f7e4b2]'
              : 'bg-[#15110a] border-[#382c18] text-[#c4b69b]'
          }`}
        >
          Orders &amp; Approvals
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-full text-xs font-bold border cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-[#352611] border-[#d4ad5d] text-[#f7e4b2]'
              : 'bg-[#15110a] border-[#382c18] text-[#c4b69b]'
          }`}
        >
          App Customizer
        </button>
      </div>

      {activeTab === 'orders' ? (
        <div className="rounded-2xl border border-[#382c18] bg-[#12100d] p-5 shadow-xl">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <h3 className="text-base font-bold text-[#f7e4b2]">
              Customer Orders (Latest 200 &amp; Live Search)
            </h3>
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
                className="px-3 py-2 rounded-lg border border-[#6e552d] text-xs text-[#f7e4b2] hover:bg-[#261d0f] cursor-pointer"
              >
                Refresh
              </button>
            </div>
          </div>

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
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-[#a39886]">
                      No customer records found.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
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
                              onClick={() => handleApprove(order.id, false)}
                              className="px-2.5 py-1.5 rounded-lg gold-gradient-bg text-[#171107] font-bold text-[11px] cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {order.status === 'Approved' && (
                            <button
                              type="button"
                              onClick={() => handleRevoke(order.id)}
                              className="px-2.5 py-1.5 rounded-lg border border-[#f87171]/60 text-[#f87171] font-semibold text-[11px] hover:bg-[#450a0a]/40 cursor-pointer"
                            >
                              Deactivate
                            </button>
                          )}
                          {order.status === 'Revoked' && (
                            <button
                              type="button"
                              onClick={() => handleApprove(order.id, true)}
                              className="px-2.5 py-1.5 rounded-lg gold-gradient-bg text-[#171107] font-bold text-[11px] cursor-pointer"
                            >
                              Re-active
                            </button>
                          )}

                          {confirmDeleteId === order.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDelete(order.id)}
                                className="px-2 py-1 rounded bg-[#dc2626] text-white font-bold text-[11px] cursor-pointer"
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
                              onClick={() => setConfirmDeleteId(order.id)}
                              className="px-2.5 py-1.5 rounded-lg border border-[#6e552d] text-[#ded4bf] text-[11px] hover:bg-[#261d0f] cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
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
