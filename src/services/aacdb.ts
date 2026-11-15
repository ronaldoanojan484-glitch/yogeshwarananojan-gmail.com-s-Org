import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppSettings, OrderRecord } from '../types';

export const SUPABASE_CONFIG = {
  SUPABASE_URL: 'https://ofziqjnsdlrablvxwqvv.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_BoqmPVQN-BxcCiaKFh4G2g_JOioL3U4',
  DEFAULTS: {
    price_lkr: 600,
    whatsapp: '94750274368',
    license: 'AAC-REG-LK-2026/8841-B',
    title: 'AAC ROYAL ART CREATION',
    hero_tag: 'MASTER EDITION 2026',
    legal_notice:
      'WARNING: UNAUTHORIZED COPYING, SCREENSHOT CAPTURING, REDISTRIBUTION, OR MODIFICATION OF DIGITAL MATERIALS IS STRICTLY PROHIBITED. EVERY UNLOCKED COPY CONTAINS AN INDIVIDUAL CRYPTOGRAPHIC WATERMARK EMBEDDED WITH THE CUSTOMER IDENTITY AND VERIFIED PAYMENT ATTACHMENT REFERENCE NUMBER. VIOLATORS ARE PROSECUTED UNDER INTELLECTUAL PROPERTY ACT NO. 36 OF 2003.',
    bank: {
      bank: 'HNB BANK',
      branch: 'HATTON BRANCH',
      account_no: '015020222907',
      account_name: 'Y. ANOJAN',
    },
  } satisfies AppSettings,
};

const SETTINGS_CACHE_KEY = 'AAC_SETTINGS_CACHE_V1';
const SETTINGS_TTL_MS = 5 * 60 * 1000;

export interface DbResult<T> {
  ok: boolean;
  data: T | null;
  error: { message: string; code: string } | null;
}

const sb: SupabaseClient = createClient(
  SUPABASE_CONFIG.SUPABASE_URL,
  SUPABASE_CONFIG.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

export function normalizePhone(p: string): string {
  let digits = String(p || '').replace(/[\s+\-()]/g, '');
  if (/^94\d{9}$/.test(digits)) {
    digits = '0' + digits.slice(2);
  }
  return digits;
}

function ok<T>(data: T): DbResult<T> {
  return { ok: true, data, error: null };
}

function fail<T>(message: string, code = 'ERROR'): DbResult<T> {
  return { ok: false, data: null, error: { message, code } };
}

function isMissingRpcError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = 'code' in err ? String((err as { code: unknown }).code || '') : '';
  const msg = 'message' in err ? String((err as { message: unknown }).message || '') : '';
  return (
    code === 'PGRST202' ||
    /Could not find the function/i.test(msg) ||
    /schema cache/i.test(msg)
  );
}

function mapError<T>(err: unknown): DbResult<T> {
  if (!err) return fail('Unknown error');
  const msg = typeof err === 'object' && err !== null && 'message' in err
    ? String((err as { message: unknown }).message)
    : String(err);

  if (msg.includes('PHONE_NAME_MISMATCH')) {
    return fail(
      'This mobile number is already registered under a different name. Please use the same name or contact support.',
      'NAME_MISMATCH'
    );
  }
  if (msg.includes('not admin')) return fail('Admin access denied.', 'NOT_ADMIN');
  if (/JWT|expired|not authenticated/i.test(msg)) {
    return fail('Session expired. Please log in again.', 'SESSION');
  }
  if (/Failed to fetch|NetworkError/i.test(msg)) {
    return fail('Network error. Please check your internet connection.', 'NETWORK');
  }
  return fail(msg, 'DB');
}

export async function createOrder(input: {
  name: string;
  phone: string;
  school?: string;
}): Promise<DbResult<OrderRecord>> {
  const name = String(input.name || '').trim();
  const phone = normalizePhone(input.phone);
  const school = String(input.school || '').trim() || 'N/A';

  if (!name || !phone) {
    return fail('Name and mobile number are required.', 'VALIDATION');
  }
  if (!/^0\d{9}$/.test(phone) && !/^94\d{9}$/.test(phone)) {
    return fail('Invalid mobile number format (use 07XXXXXXXX).', 'VALIDATION');
  }

  try {
    const { data: existing, error: chkErr } = await sb
      .from('pck_orders')
      .select('name')
      .eq('phone', phone);
    if (!chkErr && Array.isArray(existing)) {
      const clash = existing.some(
        (r) => String(r.name || '').trim().toLowerCase() !== name.toLowerCase()
      );
      if (clash) {
        return fail(
          'This mobile number is already registered under a different name.',
          'NAME_MISMATCH'
        );
      }
    }
  } catch {
    // Proceed to insert; server-side trigger enforces if configured
  }

  const orderId = 'AAC-' + Math.floor(100000 + Math.random() * 900000);
  const paymentRef = 'PAY-ATTACH-' + Math.floor(10000000 + Math.random() * 90000000);

  const { error } = await sb.from('pck_orders').insert({
    id: orderId,
    payment_ref: paymentRef,
    name,
    phone,
    school,
    status: 'Pending',
  });

  if (error) return mapError(error);

  return ok({
    id: orderId,
    paymentRef,
    name,
    phone,
    school,
    status: 'Pending',
    createdAt: new Date().toISOString(),
  });
}

export interface ReaderCheckRow {
  id: string;
  name: string;
  payment_ref: string;
  status: 'Pending' | 'Approved' | 'Revoked';
}

function getPhoneVariants(raw: string): string[] {
  const normalized = normalizePhone(raw);
  const variants = new Set<string>();
  if (normalized) variants.add(normalized);
  if (/^0\d{9}$/.test(normalized)) {
    variants.add('94' + normalized.slice(1));
  } else if (/^94\d{9}$/.test(normalized)) {
    variants.add('0' + normalized.slice(2));
  }
  return Array.from(variants);
}

export async function checkReader(
  phoneRaw: string,
  nameRaw?: string
): Promise<DbResult<ReaderCheckRow>> {
  const variants = getPhoneVariants(phoneRaw);
  if (variants.length === 0) {
    return fail('Please enter your mobile number.', 'VALIDATION');
  }

  const trimmedName = String(nameRaw || '').trim().toLowerCase();
  const rows: ReaderCheckRow[] = [];
  let rpcMissing = false;

  for (const variant of variants) {
    const { data, error } = await sb.rpc('pck_reader_check', { p_phone: variant });
    if (error) {
      if (isMissingRpcError(error)) {
        rpcMissing = true;
        break;
      }
      return mapError(error);
    }
    if (Array.isArray(data)) {
      rows.push(...(data as ReaderCheckRow[]));
    } else if (data && typeof data === 'object') {
      rows.push(data as ReaderCheckRow);
    }
  }

  // Fallback to direct table select if pck_reader_check RPC is missing
  if (rpcMissing) {
    const { data: directRows, error: dirErr } = await sb
      .from('pck_orders')
      .select('id, name, payment_ref, status')
      .in('phone', variants)
      .order('created_at', { ascending: false });

    if (dirErr && !/permission|RLS/i.test(dirErr.message || '')) {
      return mapError(dirErr);
    }
    if (Array.isArray(directRows) && directRows.length > 0) {
      rows.push(...(directRows as ReaderCheckRow[]));
    } else {
      return fail(
        'Database setup incomplete: Supabase function pck_reader_check is missing. Please ask Admin to run the setup SQL in Supabase.',
        'RPC_MISSING'
      );
    }
  }

  if (rows.length === 0) {
    return fail('No order found for this number. Please place an order first.', 'NOT_FOUND');
  }

  let candidateRows = rows;
  if (trimmedName) {
    const nameMatched = rows.filter(
      (r) => String(r.name || '').trim().toLowerCase() === trimmedName
    );
    if (nameMatched.length === 0) {
      return fail(
        'Full Name and Mobile Number do not match our registered order record. Please enter the exact Name used when ordering.',
        'NAME_MISMATCH'
      );
    }
    candidateRows = nameMatched;
  }

  // If the customer has any Approved order matching their identity, prioritize it;
  // if Admin deactivates/revokes it, Approved disappears and the latest Revoked/Pending row is returned.
  const approvedRow = candidateRows.find((r) => r.status === 'Approved');
  return ok(approvedRow || candidateRows[0]);
}

export async function adminLogin(
  email: string,
  password: string
): Promise<DbResult<{ pinMode: 'verify' | 'create' }>> {
  const { error } = await sb.auth.signInWithPassword({
    email: String(email).trim(),
    password,
  });
  if (error) return fail('Login failed: ' + error.message, 'AUTH');

  const { data: isAdm, error: rErr } = await sb.rpc('pck_is_admin_account');
  if (rErr) return mapError(rErr);
  if (isAdm !== true) {
    await sb.auth.signOut();
    return fail('This account does not have admin privileges.', 'NOT_ADMIN');
  }

  const { data: status, error: sErr } = await sb.rpc('pck_admin_pin_status');
  if (sErr) return mapError(sErr);
  return ok({ pinMode: status === 'set' ? 'verify' : 'create' });
}

export async function adminSetPin(pin: string): Promise<DbResult<boolean>> {
  if (!/^\d{4,8}$/.test(pin)) return fail('PIN must be 4 to 8 digits.', 'VALIDATION');
  const { error } = await sb.rpc('pck_set_admin_pin', { p_pin: pin });
  if (error) return mapError(error);
  return ok(true);
}

export async function adminVerifyPin(pin: string): Promise<DbResult<boolean>> {
  const { data, error } = await sb.rpc('pck_verify_admin_pin', { p_pin: pin });
  if (error) return mapError(error);
  if (data === 'ok') return ok(true);
  if (data === 'locked') return fail('Too many wrong attempts. Wait 10 minutes.', 'LOCKED');
  return fail('Wrong PIN.', 'WRONG_PIN');
}

export async function adminChangePin(oldPin: string, newPin: string): Promise<DbResult<boolean>> {
  if (!/^\d{4,8}$/.test(newPin)) return fail('New PIN must be 4 to 8 digits.', 'VALIDATION');
  const { data, error } = await sb.rpc('pck_change_admin_pin', { p_old: oldPin, p_new: newPin });
  if (error) return mapError(error);
  if (data === 'ok') return ok(true);
  if (data === 'wrong') return fail('Current PIN is incorrect.', 'WRONG_PIN');
  if (data === 'invalid') return fail('New PIN format invalid.', 'VALIDATION');
  return fail('PIN change not allowed. Please log in again.', 'NOT_ADMIN');
}

export async function adminChangePassword(
  newPass: string,
  confirmPass: string
): Promise<DbResult<boolean>> {
  if (newPass.length < 8) return fail('Password must be at least 8 characters.', 'VALIDATION');
  if (newPass !== confirmPass) return fail('Passwords do not match.', 'VALIDATION');
  const { data: sess } = await sb.auth.getSession();
  if (!sess || !sess.session) return fail('Please log in again as admin.', 'SESSION');
  const { error } = await sb.auth.updateUser({ password: newPass });
  if (error) return mapError(error);
  return ok(true);
}

export async function adminLogout(): Promise<DbResult<boolean>> {
  try {
    await sb.rpc('pck_admin_logout');
  } catch {
    // Ignore RPC failure on logout
  }
  await sb.auth.signOut();
  return ok(true);
}

export async function isAdminSession(): Promise<boolean> {
  const { data: sess } = await sb.auth.getSession();
  if (!sess || !sess.session) return false;
  const { data } = await sb.rpc('pck_is_admin_account');
  return data === true;
}

export async function listOrders(searchQuery = '', limitCount = 200): Promise<DbResult<OrderRecord[]>> {
  let q = sb
    .from('pck_orders')
    .select('id, payment_ref, name, phone, school, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limitCount);

  const safeTerm = String(searchQuery || '').replace(/[,%()]/g, '').trim();
  if (safeTerm) {
    q = q.or(
      `name.ilike.%${safeTerm}%,phone.ilike.%${safeTerm}%,id.ilike.%${safeTerm}%,payment_ref.ilike.%${safeTerm}%`
    );
  }

  const { data, error } = await q;
  if (error) return mapError(error);
  return ok(
    (data || []).map((o) => ({
      id: o.id,
      paymentRef: o.payment_ref,
      name: o.name,
      phone: o.phone,
      school: o.school || 'N/A',
      status: o.status,
      createdAt: o.created_at,
    }))
  );
}

async function logAudit(
  action: string,
  target: string,
  oldStatus: string | null,
  newStatus: string | null
) {
  try {
    await sb.from('pck_audit_logs').insert({
      action,
      target,
      old_status: oldStatus,
      new_status: newStatus,
    });
  } catch {
    // Non-blocking audit log
  }
}

export async function grantAccess(orderId: string): Promise<DbResult<boolean>> {
  const { data, error } = await sb.rpc('pck_grant_access', { p_order_id: orderId });
  if (error) {
    if (isMissingRpcError(error)) {
      const { data: updated, error: upErr } = await sb
        .from('pck_orders')
        .update({ status: 'Approved' })
        .eq('id', orderId)
        .select('id, status');
      if (upErr) return mapError(upErr);
      if (!updated || updated.length === 0) {
        return fail(
          'Approve blocked by database permissions (missing pck_grant_access RPC). Run the Supabase SQL setup once.',
          'RPC_MISSING'
        );
      }
      await logAudit('STATUS_CHANGE', orderId, 'Pending', 'Approved');
      return ok(true);
    }
    return mapError(error);
  }
  if (data !== 'ok') return fail('Approve failed: ' + data, 'DB');
  await logAudit('STATUS_CHANGE', orderId, 'Pending', 'Approved');
  return ok(true);
}

export async function revokeAccess(orderId: string): Promise<DbResult<boolean>> {
  const { data, error } = await sb.rpc('pck_revoke_access', { p_order_id: orderId });
  if (error) {
    if (isMissingRpcError(error)) {
      const { data: updated, error: upErr } = await sb
        .from('pck_orders')
        .update({ status: 'Revoked' })
        .eq('id', orderId)
        .select('id, status');
      if (upErr) return mapError(upErr);
      if (!updated || updated.length === 0) {
        return fail(
          'Deactivate blocked by database permissions (missing pck_revoke_access RPC). Run the Supabase SQL setup once.',
          'RPC_MISSING'
        );
      }
      await logAudit('STATUS_CHANGE', orderId, 'Approved', 'Revoked');
      return ok(true);
    }
    return mapError(error);
  }
  if (data !== 'ok') return fail('Revoke failed: ' + data, 'DB');
  await logAudit('STATUS_CHANGE', orderId, 'Approved', 'Revoked');
  return ok(true);
}

export async function deleteOrder(orderId: string): Promise<DbResult<boolean>> {
  try {
    await revokeAccess(orderId);
  } catch {
    // Continue deletion
  }
  const { error } = await sb.from('pck_orders').delete().eq('id', orderId);
  if (error) return mapError(error);
  await logAudit('ORDER_DELETED', orderId, null, null);
  return ok(true);
}

export async function getSettings(forceRefresh = false): Promise<DbResult<AppSettings>> {
  const d = SUPABASE_CONFIG.DEFAULTS;
  const out: AppSettings = {
    price_lkr: d.price_lkr,
    whatsapp: d.whatsapp,
    license: d.license,
    title: d.title,
    hero_tag: d.hero_tag,
    legal_notice: d.legal_notice,
    bank: { ...d.bank },
  };

  if (!forceRefresh) {
    try {
      const cached = JSON.parse(localStorage.getItem(SETTINGS_CACHE_KEY) || 'null');
      if (cached && cached.data && Date.now() - cached.ts < SETTINGS_TTL_MS) {
        return ok(cached.data);
      }
    } catch {
      // Ignore invalid cache
    }
  }

  try {
    const { data, error } = await sb.from('pck_settings').select('key, value');
    if (error) return mapError(error);

    (data || []).forEach((r: { key: string; value: Record<string, unknown> }) => {
      if (r.key === 'bank' && r.value) {
        out.bank = { ...out.bank, ...(r.value as Partial<AppSettings['bank']>) };
      }
      if (r.key === 'contact' && r.value && typeof r.value.whatsapp === 'string') {
        out.whatsapp = r.value.whatsapp;
      }
      if (r.key === 'app' && r.value) {
        if (r.value.price_lkr) out.price_lkr = Number(r.value.price_lkr);
        if (typeof r.value.license === 'string') out.license = r.value.license;
        if (typeof r.value.title === 'string') out.title = r.value.title;
        if (typeof r.value.hero_tag === 'string') out.hero_tag = r.value.hero_tag;
        if (typeof r.value.legal_notice === 'string') out.legal_notice = r.value.legal_notice;
      }
    });

    try {
      localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: out }));
    } catch {
      // Ignore storage quota errors
    }
    return ok(out);
  } catch (err) {
    return mapError(err);
  }
}

export async function saveSettings(s: AppSettings): Promise<DbResult<boolean>> {
  const now = new Date().toISOString();
  const rows = [
    {
      key: 'bank',
      value: {
        bank: s.bank.bank || '',
        branch: s.bank.branch || '',
        account_no: s.bank.account_no || '',
        account_name: s.bank.account_name || '',
      },
      updated_at: now,
    },
    {
      key: 'contact',
      value: {
        whatsapp: normalizePhone(s.whatsapp),
        email: 'aacroyalartcreation@gmail.com',
        location: 'Hatton, Sri Lanka',
      },
      updated_at: now,
    },
    {
      key: 'app',
      value: {
        title: s.title || SUPABASE_CONFIG.DEFAULTS.title,
        license: s.license || SUPABASE_CONFIG.DEFAULTS.license,
        price_lkr: Number(s.price_lkr) || SUPABASE_CONFIG.DEFAULTS.price_lkr,
        hero_tag: s.hero_tag || SUPABASE_CONFIG.DEFAULTS.hero_tag,
        legal_notice: s.legal_notice || SUPABASE_CONFIG.DEFAULTS.legal_notice,
      },
      updated_at: now,
    },
  ];

  const { error } = await sb.from('pck_settings').upsert(rows);
  if (error) return mapError(error);
  try {
    localStorage.removeItem(SETTINGS_CACHE_KEY);
  } catch {
    // Ignore
  }
  await logAudit('SETTINGS_UPDATED', 'settings', null, 'Saved');
  return ok(true);
}
