import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppSettings, CustomBook, MainBookLockMode, OrderRecord } from '../types';

export const SUPABASE_CONFIG = {
  SUPABASE_URL: 'https://qgfbqewqhueryzoydwrq.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_vsXU0jP3fJCVBGBQLXM8OA_P7q-CnTM',
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
    mainBookLock: 'preview_5' as MainBookLockMode,
    books: [] as CustomBook[],
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

export function normalizeName(n: string): string {
  return String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();
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
      const normalizedNewName = normalizeName(name);
      const clash = existing.some(
        (r) => normalizeName(String(r.name || '')) !== normalizedNewName
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

  const trimmedName = normalizeName(nameRaw || '');
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
      (r) => normalizeName(String(r.name || '')) === trimmedName
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
  const cleanEmail = String(email).trim();
  const { error } = await sb.auth.signInWithPassword({
    email: cleanEmail,
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

export async function adminResumePinMode(): Promise<
  DbResult<{ email: string; pinMode: 'verify' | 'create' } | null>
> {
  const { data: sess } = await sb.auth.getSession();
  if (!sess || !sess.session) return ok(null);

  const { data: isAdm, error: rErr } = await sb.rpc('pck_is_admin_account');
  if (rErr || isAdm !== true) return ok(null);

  const { data: status, error: sErr } = await sb.rpc('pck_admin_pin_status');
  if (sErr) return ok(null);

  return ok({
    email: sess.session.user?.email || 'Admin',
    pinMode: status === 'set' ? 'verify' : 'create',
  });
}

export async function adminSendPasswordReset(email: string): Promise<DbResult<boolean>> {
  const clean = String(email || '').trim();
  if (!clean || !clean.includes('@')) {
    return fail('Enter your admin email address first.', 'VALIDATION');
  }
  const { error } = await sb.auth.resetPasswordForEmail(clean);
  if (error) return mapError(error);
  return ok(true);
}

export function buildAdminSetupSql(emailInput: string): string {
  const safeEmail = String(emailInput || 'ronaldoanojan484@gmail.com')
    .trim()
    .toLowerCase()
    .replace(/'/g, "''");
  const emails = Array.from(
    new Set([
      'ronaldoanojan484@gmail.com',
      'yogeshwarananojan@gmail.com',
      ...(safeEmail && safeEmail.includes('@') ? [safeEmail] : []),
    ])
  )
    .map((e) => `'${e}'`)
    .join(', ');

  return `-- Run once in Supabase SQL Editor (Project: qgfbqewqhueryzoydwrq)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.pck_orders (
  id text PRIMARY KEY,
  payment_ref text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  school text DEFAULT 'N/A',
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Revoked')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pck_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pck_admin_pin (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pck_audit_logs (
  id bigserial PRIMARY KEY,
  action text NOT NULL,
  target text,
  old_status text,
  new_status text,
  actor_email text DEFAULT coalesce(auth.jwt() ->> 'email', ''),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.pck_is_admin_account()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) IN (${emails});
$$;

CREATE OR REPLACE FUNCTION public.pck_check_phone_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm_new text := lower(regexp_replace(trim(NEW.name), '\\s+', ' ', 'g'));
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.pck_orders o
    WHERE o.phone = NEW.phone
      AND lower(regexp_replace(trim(o.name), '\\s+', ' ', 'g')) <> v_norm_new
  ) THEN
    RAISE EXCEPTION 'PHONE_NAME_MISMATCH';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pck_check_phone_name ON public.pck_orders;
CREATE TRIGGER trg_pck_check_phone_name
  BEFORE INSERT ON public.pck_orders
  FOR EACH ROW EXECUTE FUNCTION public.pck_check_phone_name();

ALTER TABLE public.pck_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pck_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pck_admin_pin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pck_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pck_orders_insert_pending ON public.pck_orders;
CREATE POLICY pck_orders_insert_pending ON public.pck_orders
  FOR INSERT TO anon, authenticated WITH CHECK (status = 'Pending');

DROP POLICY IF EXISTS pck_orders_admin_all ON public.pck_orders;
CREATE POLICY pck_orders_admin_all ON public.pck_orders
  FOR ALL TO authenticated
  USING (public.pck_is_admin_account())
  WITH CHECK (public.pck_is_admin_account());

DROP POLICY IF EXISTS pck_settings_public_read ON public.pck_settings;
CREATE POLICY pck_settings_public_read ON public.pck_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS pck_settings_admin_write ON public.pck_settings;
CREATE POLICY pck_settings_admin_write ON public.pck_settings
  FOR ALL TO authenticated
  USING (public.pck_is_admin_account())
  WITH CHECK (public.pck_is_admin_account());

DROP POLICY IF EXISTS pck_audit_admin_all ON public.pck_audit_logs;
CREATE POLICY pck_audit_admin_all ON public.pck_audit_logs
  FOR ALL TO authenticated
  USING (public.pck_is_admin_account())
  WITH CHECK (public.pck_is_admin_account());

CREATE OR REPLACE FUNCTION public.pck_reader_check(p_phone text)
RETURNS TABLE(id text, name text, payment_ref text, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.name, o.payment_ref, o.status
  FROM public.pck_orders o
  WHERE o.phone = p_phone
  ORDER BY o.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.pck_admin_pin_status()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT public.pck_is_admin_account() THEN 'not_admin'
    WHEN EXISTS (SELECT 1 FROM public.pck_admin_pin WHERE user_id = auth.uid()) THEN 'set'
    ELSE 'unset'
  END;
$$;

CREATE OR REPLACE FUNCTION public.pck_set_admin_pin(p_pin text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.pck_is_admin_account() THEN RETURN 'not admin'; END IF;
  IF p_pin !~ '^[0-9]{4,8}$' THEN RETURN 'invalid'; END IF;
  INSERT INTO public.pck_admin_pin (user_id, pin_hash, failed_attempts, locked_until, updated_at)
  VALUES (auth.uid(), crypt(p_pin, gen_salt('bf')), 0, NULL, now())
  ON CONFLICT (user_id) DO UPDATE
  SET pin_hash = EXCLUDED.pin_hash, failed_attempts = 0, locked_until = NULL, updated_at = now();
  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.pck_verify_admin_pin(p_pin text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row public.pck_admin_pin%ROWTYPE;
BEGIN
  IF NOT public.pck_is_admin_account() THEN RETURN 'not admin'; END IF;
  SELECT * INTO v_row FROM public.pck_admin_pin WHERE user_id = auth.uid();
  IF NOT FOUND THEN RETURN 'unset'; END IF;
  IF v_row.locked_until IS NOT NULL AND v_row.locked_until > now() THEN RETURN 'locked'; END IF;
  IF v_row.pin_hash = crypt(p_pin, v_row.pin_hash) THEN
    UPDATE public.pck_admin_pin SET failed_attempts = 0, locked_until = NULL WHERE user_id = auth.uid();
    RETURN 'ok';
  END IF;
  UPDATE public.pck_admin_pin
  SET failed_attempts = failed_attempts + 1,
      locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN now() + interval '10 minutes' ELSE NULL END
  WHERE user_id = auth.uid();
  RETURN 'wrong';
END;
$$;

CREATE OR REPLACE FUNCTION public.pck_change_admin_pin(p_old text, p_new text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row public.pck_admin_pin%ROWTYPE;
BEGIN
  IF NOT public.pck_is_admin_account() THEN RETURN 'not admin'; END IF;
  IF p_new !~ '^[0-9]{4,8}$' THEN RETURN 'invalid'; END IF;
  SELECT * INTO v_row FROM public.pck_admin_pin WHERE user_id = auth.uid();
  IF NOT FOUND OR v_row.pin_hash <> crypt(p_old, v_row.pin_hash) THEN RETURN 'wrong'; END IF;
  UPDATE public.pck_admin_pin
  SET pin_hash = crypt(p_new, gen_salt('bf')), failed_attempts = 0, locked_until = NULL, updated_at = now()
  WHERE user_id = auth.uid();
  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.pck_admin_logout()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$ SELECT; $$;

CREATE OR REPLACE FUNCTION public.pck_grant_access(p_order_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.pck_is_admin_account() THEN RETURN 'not admin'; END IF;
  UPDATE public.pck_orders SET status = 'Approved' WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.pck_revoke_access(p_order_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.pck_is_admin_account() THEN RETURN 'not admin'; END IF;
  UPDATE public.pck_orders SET status = 'Revoked' WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.pck_admin_pin_status() FROM anon;
REVOKE ALL ON FUNCTION public.pck_set_admin_pin(text) FROM anon;
REVOKE ALL ON FUNCTION public.pck_verify_admin_pin(text) FROM anon;
REVOKE ALL ON FUNCTION public.pck_change_admin_pin(text, text) FROM anon;
REVOKE ALL ON FUNCTION public.pck_admin_logout() FROM anon;
GRANT EXECUTE ON FUNCTION public.pck_is_admin_account() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pck_reader_check(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pck_grant_access(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pck_revoke_access(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pck_admin_pin_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pck_set_admin_pin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pck_verify_admin_pin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pck_change_admin_pin(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pck_admin_logout() TO authenticated;`;
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
  if (data !== 'ok' && data !== true && data !== null && data !== undefined) {
    return fail('Approve failed: ' + String(data), 'DB');
  }
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
  if (data !== 'ok' && data !== true && data !== null && data !== undefined) {
    return fail('Revoke failed: ' + String(data), 'DB');
  }
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

function sanitizeBooksList(raw: unknown): CustomBook[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((b): b is Record<string, unknown> => Boolean(b && typeof b === 'object'))
    .map((b, idx) => {
      const lockRaw = String(b.lockMode || 'paid');
      const lockMode: CustomBook['lockMode'] =
        lockRaw === 'free' || lockRaw === 'full_lock' ? lockRaw : 'paid';
      const rawPages = Array.isArray(b.pages) ? b.pages : [];
      const pages = rawPages
        .filter((p): p is Record<string, unknown> => Boolean(p && typeof p === 'object'))
        .map((p, pIdx) => ({
          title: String(p.title || `Page ${pIdx + 1}`),
          content: String(p.content || ''),
        }));
      return {
        id: String(b.id || `book-${idx + 1}`),
        title: String(b.title || 'Untitled Book'),
        subtitle: String(b.subtitle || ''),
        description: String(b.description || ''),
        badge: String(b.badge || 'NEW EDITION'),
        lockMode,
        previewPages: Math.max(0, Number(b.previewPages ?? 1) || 0),
        pages,
        createdAt: String(b.createdAt || new Date().toISOString()),
      };
    });
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
    mainBookLock: d.mainBookLock,
    books: [],
  };

  if (!forceRefresh) {
    try {
      const cached = JSON.parse(localStorage.getItem(SETTINGS_CACHE_KEY) || 'null');
      if (cached && cached.data && Date.now() - cached.ts < SETTINGS_TTL_MS) {
        return ok({
          ...out,
          ...cached.data,
          bank: { ...out.bank, ...(cached.data.bank || {}) },
          books: sanitizeBooksList(cached.data.books),
        });
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
        if (
          r.value.main_book_lock === 'preview_5' ||
          r.value.main_book_lock === 'strict_lock' ||
          r.value.main_book_lock === 'free_all'
        ) {
          out.mainBookLock = r.value.main_book_lock;
        }
      }
      if (r.key === 'books' && r.value) {
        out.books = sanitizeBooksList(r.value.items);
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
        main_book_lock: s.mainBookLock || 'preview_5',
      },
      updated_at: now,
    },
    {
      key: 'books',
      value: {
        items: sanitizeBooksList(s.books),
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

export async function saveBooksAndLocks(
  books: CustomBook[],
  mainBookLock: MainBookLockMode,
  currentSettings: AppSettings
): Promise<DbResult<AppSettings>> {
  const next: AppSettings = {
    ...currentSettings,
    mainBookLock,
    books: sanitizeBooksList(books),
  };
  const res = await saveSettings(next);
  if (!res.ok) return fail(res.error?.message || 'Failed to save books.', res.error?.code);
  return ok(next);
}
