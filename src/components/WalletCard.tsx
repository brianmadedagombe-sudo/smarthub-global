import { Wallet as WalletIcon, Coins, Banknote, ArrowDownToLine, Lock, Sparkles, RefreshCw, History, PlusCircle } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import type { Currency } from '@/lib/types';
import { CURRENCIES, FX_TO_KES } from '@/lib/types';
import { Card, Button } from '@/components/ui';
import { translate } from '@/lib/i18n';
import { useState } from 'react';
import { MpesaPayoutModal } from '@/components/MpesaPayoutModal';
import { TopUpModal } from '@/components/TopUpModal';
import { PayoutAnalytics } from '@/components/PayoutAnalytics';
import { useWallet } from '@/hooks/useWallet';
import type { WalletLedgerEntry } from '@/lib/wallet';
import { useSession } from '@/hooks/useSession';

const MIN_WITHDRAW_KES = 500;

const KIND_LABELS: Record<string, string> = {
  tip: 'Tip sent',
  tournament_entry: 'Tournament entry',
  payout: 'Withdrawal to M-Pesa',
};

function formatMoney(kes: number, currency: Currency): string {
  const value = kes / (FX_TO_KES[currency] ?? 1);
  const decimals = currency === 'KES' ? 0 : 2;
  return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function formatLedgerAmount(entry: WalletLedgerEntry, currency: Currency): string {
  const sign = entry.amount > 0 ? '+' : '-';
  if (entry.bucket === 'hub_coins') return `${sign}${Math.abs(entry.amount).toLocaleString()} coins`;
  return `${sign}${formatMoney(Math.abs(entry.amount), currency)}`;
}

export function WalletCard({ api }: { api: AppApi }) {
  const { session } = useSession();
  const lang = api.state.language;
  const currency = api.state.currency;
  const { snapshot, loading, error, refresh } = useWallet();
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);

  if (!snapshot) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <WalletIcon className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-bold tracking-tight">{translate('wallet.title', lang)}</h2>
        </div>
        <Card className="space-y-3 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {loading ? 'Loading your wallet…' : error ?? 'Could not load your wallet.'}
          </p>
          {!loading && (
            <Button variant="secondary" onClick={() => void refresh()} icon={<RefreshCw className="h-4 w-4" />}>
              Try again
            </Button>
          )}
        </Card>
      </div>
    );
  }

  const cashKes = snapshot.earnedCashKes;
  const progress = Math.min(100, Math.round((cashKes / MIN_WITHDRAW_KES) * 100));
  const canWithdraw = cashKes >= MIN_WITHDRAW_KES;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <WalletIcon className="h-5 w-5 text-blue-500" />
        <h2 className="text-lg font-bold tracking-tight">{translate('wallet.title', lang)}</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 dark:bg-emerald-500/15">
              <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">{translate('wallet.cash', lang)}</div>
              <div className="text-xl font-bold">{formatMoney(cashKes, currency)}</div>
            </div>
          </div>
          <div className="flex items-start gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <ArrowDownToLine className="h-3 w-3 shrink-0 mt-0.5" />
            <span>Withdrawable earnings from gifts and prizes.</span>
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 dark:bg-amber-500/15">
              <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">{translate('wallet.coins', lang)}</div>
              <div className="text-xl font-bold">{snapshot.hubCoins.toLocaleString()}</div>
            </div>
          </div>
          <div className="flex items-start gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <Lock className="h-3 w-3 shrink-0 mt-0.5" />
            <span>{translate('wallet.utilityOnly', lang)}</span>
          </div>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <ArrowDownToLine className="h-4 w-4 text-blue-500" /> {translate('wallet.withdraw', lang)}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{translate('wallet.minWithdraw', lang)}</div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">{translate('wallet.progress', lang)}</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {formatMoney(Math.min(cashKes, MIN_WITHDRAW_KES), currency)} / {formatMoney(MIN_WITHDRAW_KES, currency)}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${canWithdraw ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => setTopUpOpen(true)} fullWidth variant="secondary" icon={<PlusCircle className="h-4 w-4" />}>
            Top Up Coins
          </Button>
          <Button onClick={() => setPayoutOpen(true)} disabled={!canWithdraw} fullWidth>
            {translate('wallet.withdraw', lang)}
          </Button>
        </div>
        {!canWithdraw && (
          <p className="text-[11px] text-slate-400">{translate('wallet.withdrawHint', lang)}</p>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <History className="h-4 w-4 text-slate-500" /> Recent activity
        </div>
        {snapshot.ledger.length === 0 ? (
          <p className="text-xs text-slate-400">No wallet activity yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {snapshot.ledger.slice(0, 10).map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{KIND_LABELS[entry.kind] ?? 'Balance update'}</div>
                  <div className="text-[11px] text-slate-400">
                    {entry.bucket === 'hub_coins' ? 'Hub Coins' : 'Earned Cash'} · {new Date(entry.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className={`shrink-0 text-right font-semibold ${entry.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
                  {formatLedgerAmount(entry, currency)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <PayoutAnalytics payouts={snapshot.payouts} language={lang} />

      <Card className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-violet-500" /> {translate('wallet.currency', lang)}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CURRENCIES.map((c) => (
            <button
              key={c}
              onClick={() => api.setCurrency(c)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                currency === c ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </Card>

      <MpesaPayoutModal
        open={payoutOpen}
        onClose={() => setPayoutOpen(false)}
        language={lang}
        balanceKes={cashKes}
        payouts={snapshot.payouts}
        onPaid={() => void refresh()}
      />

      <TopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        email={session?.user.email ?? ''}
        onToppedUp={() => void refresh()}
        onScheduledPayout={() => void refresh()}
      />
    </div>
  );
}
