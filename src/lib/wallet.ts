import type { MpesaPayout } from '@/lib/types';

export type LedgerBucket = 'hub_coins' | 'earned_cash';

export interface WalletLedgerEntry {
  id: string;
  bucket: LedgerBucket;
  amount: number;
  balanceAfter: number;
  kind: string;
  reference: string | null;
  createdAt: string;
}

export interface WalletSnapshot {
  hubCoins: number;
  earnedCashKes: number;
  ledger: WalletLedgerEntry[];
  payouts: MpesaPayout[];
}

interface WalletCredentials {
  walletId: string;
  hmacKey: string;
}

export class WalletError extends Error {}

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1`;
const ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';
const CREDENTIALS_KEY = 'smarthub_wallet_v1';
const GENERIC_ERROR = 'Something went wrong. Please try again.';

let credentialsReady: Promise<void> | null = null;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function signRequest(hmacKey: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(hmacKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return toHex(new Uint8Array(signature));
}

function isCredentials(value: unknown): value is WalletCredentials {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.walletId === 'string' && typeof v.hmacKey === 'string';
}

function loadCredentials(): WalletCredentials | null {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCredentials(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function clearCredentials(): void {
  try {
    localStorage.removeItem(CREDENTIALS_KEY);
  } catch {
    /* ignore */
  }
}

async function postWallet(action: string, payload: Record<string, unknown>, signed: boolean, fn = 'wallet'): Promise<unknown> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
  };
  const body = JSON.stringify({ action, ...payload });

  if (signed) {
    const creds = loadCredentials();
    if (!creds) throw new WalletError('Your wallet is not ready yet. Please try again.');
    const ts = String(Date.now());
    const nonce = toHex(crypto.getRandomValues(new Uint8Array(16)));
    headers['X-Wallet-Id'] = creds.walletId;
    headers['X-Wallet-Ts'] = ts;
    headers['X-Wallet-Nonce'] = nonce;
    headers['X-Wallet-Signature'] = await signRequest(creds.hmacKey, `${ts}.${nonce}.${body}`);
  }

  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_BASE}/${fn}`, { method: 'POST', headers, body });
  } catch {
    throw new WalletError('Network error. Check your connection and try again.');
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message =
      data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : GENERIC_ERROR;
    if (signed && res.status === 401) {
      clearCredentials();
      throw new WalletError('Your wallet session expired. Please try again.');
    }
    throw new WalletError(message);
  }
  if (data === null || typeof data !== 'object') throw new WalletError(GENERIC_ERROR);
  return data;
}

export async function callSignedFunction(fn: string, action: string, payload: Record<string, unknown>): Promise<unknown> {
  await ensureCredentials();
  try {
    return await postWallet(action, payload, true, fn);
  } catch (err) {
    if (err instanceof WalletError && err.message.includes('expired')) {
      await createCredentials();
      return postWallet(action, payload, true, fn);
    }
    throw err;
  }
}

async function createCredentials(): Promise<void> {
  const data = await postWallet('create', {}, false);
  if (!isCredentials(data)) throw new WalletError(GENERIC_ERROR);
  try {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify({ walletId: data.walletId, hmacKey: data.hmacKey }));
  } catch {
    /* storage full or unavailable — non-fatal */
  }
}

function ensureCredentials(): Promise<void> {
  if (loadCredentials()) return Promise.resolve();
  if (!credentialsReady) {
    credentialsReady = createCredentials().finally(() => {
      credentialsReady = null;
    });
  }
  return credentialsReady;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function parseLedgerEntry(item: unknown): WalletLedgerEntry | null {
  const r = asRecord(item);
  if (!r || typeof r.id !== 'string' || typeof r.amount !== 'number' || typeof r.balance_after !== 'number') return null;
  if (r.bucket !== 'hub_coins' && r.bucket !== 'earned_cash') return null;
  return {
    id: r.id,
    bucket: r.bucket,
    amount: r.amount,
    balanceAfter: r.balance_after,
    kind: typeof r.kind === 'string' ? r.kind : 'other',
    reference: typeof r.reference === 'string' ? r.reference : null,
    createdAt: typeof r.created_at === 'string' ? r.created_at : new Date(0).toISOString(),
  };
}

function parsePayout(item: unknown): MpesaPayout | null {
  const r = asRecord(item);
  if (!r || typeof r.id !== 'string' || typeof r.amount_kes !== 'number' || typeof r.phone !== 'string') return null;
  const status = r.status === 'success' || r.status === 'failed' ? r.status : 'pending';
  return {
    id: r.id,
    amountKes: r.amount_kes,
    phone: r.phone,
    status,
    reference: typeof r.reference === 'string' ? r.reference : '',
    receiptCode: typeof r.receipt_code === 'string' && r.receipt_code ? r.receipt_code : undefined,
    createdAt: typeof r.created_at === 'string' ? r.created_at : new Date(0).toISOString(),
  };
}

function parseSnapshot(raw: unknown): WalletSnapshot {
  const r = asRecord(raw);
  if (!r || typeof r.hubCoins !== 'number' || typeof r.earnedCashKes !== 'number') {
    throw new WalletError(GENERIC_ERROR);
  }
  const ledger = Array.isArray(r.ledger) ? r.ledger : [];
  const payouts = Array.isArray(r.payouts) ? r.payouts : [];
  return {
    hubCoins: r.hubCoins,
    earnedCashKes: r.earnedCashKes,
    ledger: ledger.map(parseLedgerEntry).filter((e): e is WalletLedgerEntry => e !== null),
    payouts: payouts.map(parsePayout).filter((p): p is MpesaPayout => p !== null),
  };
}

export async function fetchWalletSnapshot(): Promise<WalletSnapshot> {
  await ensureCredentials();
  try {
    return parseSnapshot(await postWallet('state', {}, true));
  } catch (err) {
    if (err instanceof WalletError && err.message.includes('expired')) {
      await createCredentials();
      return parseSnapshot(await postWallet('state', {}, true));
    }
    throw err;
  }
}

export async function spendHubCoins(amount: number, purpose: 'tip' | 'tournament_entry'): Promise<number> {
  await ensureCredentials();
  const data = asRecord(await postWallet('spend_hub_coins', { amount, purpose }, true));
  if (!data || typeof data.hubCoins !== 'number') throw new WalletError(GENERIC_ERROR);
  return data.hubCoins;
}

export async function requestPayout(amountKes: number, phone: string): Promise<{ reference: string; status: 'pending' | 'success' | 'failed'; simulation: boolean }> {
  await ensureCredentials();
  const data = asRecord(await postWallet('request_payout', { amountKes, phone }, true));
  if (!data || typeof data.reference !== 'string') throw new WalletError(GENERIC_ERROR);
  const status = data.status === 'success' || data.status === 'failed' ? data.status : 'pending';
  const simulation = data.simulation === true;
  return { reference: data.reference, status, simulation };
}

export async function creditEarnings(amountKes: number, kind: 'sale' | 'reward' | 'referral_bonus', reference?: string): Promise<number> {
  await ensureCredentials();
  const data = asRecord(await postWallet('credit_earnings', { amountKes, kind, reference: reference ?? null }, true));
  if (!data || typeof data.earnedCashKes !== 'number') throw new WalletError(GENERIC_ERROR);
  return data.earnedCashKes;
}

export async function topUpHubCoins(amount: number, gateway: 'paystack' | 'pesapal' | 'mpesa_stk', reference?: string): Promise<number> {
  await ensureCredentials();
  const data = asRecord(await postWallet('topup', { amount, gateway, reference: reference ?? null }, true));
  if (!data || typeof data.hubCoins !== 'number') throw new WalletError(GENERIC_ERROR);
  return data.hubCoins;
}

export async function schedulePayout(
  amountKes: number,
  phone: string,
  scheduledFor: string | null
): Promise<{ reference: string; status: 'pending'; scheduledFor: string | null }> {
  await ensureCredentials();
  const data = asRecord(await postWallet('schedule_payout', { amountKes, phone, scheduledFor }, true));
  if (!data || typeof data.reference !== 'string') throw new WalletError(GENERIC_ERROR);
  return { reference: data.reference, status: 'pending', scheduledFor: typeof data.scheduledFor === 'string' ? data.scheduledFor : null };
}

export async function checkPayoutStatus(payoutId: string): Promise<{ status: 'pending' | 'success' | 'failed'; reference: string }> {
  await ensureCredentials();
  const data = asRecord(await postWallet('check_payout_status', { payoutId }, true));
  if (!data || typeof data.status !== 'string' || typeof data.reference !== 'string') throw new WalletError(GENERIC_ERROR);
  const status = data.status === 'success' || data.status === 'failed' ? data.status : 'pending';
  return { status, reference: data.reference };
}
