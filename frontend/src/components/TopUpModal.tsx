import { useState, type FormEvent } from 'react';
import { Smartphone, CreditCard, Coins, Calendar, Zap } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button, Field, inputClass } from '@/components/ui';
import { toast } from '@/components/Toast';
import { openCheckout } from '@/lib/paystack';
import { PAYSTACK_PUBLIC_KEY, MPESA_PAYOUT_NUMBER } from '@/lib/config';
import { topUpHubCoins, schedulePayout, WalletError } from '@/lib/wallet';

type Gateway = 'paystack' | 'mpesa_stk';

const PRESET_AMOUNTS = [100, 250, 500, 1000];

function nextWeeklyDate(): string {
  const now = new Date();
  const friday = new Date(now);
  const day = friday.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  friday.setDate(friday.getDate() + daysUntilFriday);
  friday.setHours(10, 0, 0, 0);
  return friday.toISOString();
}

function formatWeeklyDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

interface TopUpModalProps {
  open: boolean;
  onClose: () => void;
  email: string;
  onToppedUp: () => void;
  onScheduledPayout: () => void;
}

export function TopUpModal({ open, onClose, email, onToppedUp, onScheduledPayout }: TopUpModalProps) {
  const [amount, setAmount] = useState('');
  const [gateway, setGateway] = useState<Gateway>('paystack');
  const [phone, setPhone] = useState(MPESA_PAYOUT_NUMBER);
  const [mode, setMode] = useState<'topup' | 'withdraw'>('topup');
  const [processing, setProcessing] = useState(false);

  const kes = parseInt(amount, 10);
  const validAmount = Number.isFinite(kes) && kes >= 1;

  const handlePaystack = async () => {
    if (!validAmount) {
      toast('Enter a valid amount.', 'error');
      return;
    }
    setProcessing(true);
    await openCheckout({
      email: email || 'guest@smarthub.global',
      amountKes: kes,
      key: PAYSTACK_PUBLIC_KEY,
      metadata: { purpose: 'hub_coins_topup', amount: String(kes) },
      onSuccess: async (ref) => {
        try {
          await topUpHubCoins(kes, 'paystack', ref);
          toast(`Added ${kes} Hub Coins to your wallet.`);
          onToppedUp();
          onClose();
        } catch (err) {
          toast(err instanceof WalletError ? err.message : 'Payment succeeded but coins could not be credited. Contact support.', 'error');
        } finally {
          setProcessing(false);
        }
      },
      onClose: () => {
        setProcessing(false);
        toast('Checkout was cancelled.', 'info');
      },
    });
  };

  const handleMpesaStk = async () => {
    if (!validAmount) {
      toast('Enter a valid amount.', 'error');
      return;
    }
    if (!/^(\+?254|0)[17]\d{8}$/.test(phone.replace(/\s+/g, ''))) {
      toast('Enter a valid Safaricom M-Pesa number.', 'error');
      return;
    }
    setProcessing(true);
    try {
      await topUpHubCoins(kes, 'mpesa_stk');
      toast(`STK push sent to ${phone}. Coins will appear once payment is confirmed.`);
      onToppedUp();
      onClose();
    } catch (err) {
      toast(err instanceof WalletError ? err.message : 'STK push could not be sent.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleScheduleWithdraw = async (e: FormEvent) => {
    e.preventDefault();
    if (!validAmount || kes < 500) {
      toast('Minimum withdrawal is KES 500.', 'error');
      return;
    }
    if (!/^(\+?254|0)[17]\d{8}$/.test(phone.replace(/\s+/g, ''))) {
      toast('Enter a valid Safaricom M-Pesa number.', 'error');
      return;
    }
    setProcessing(true);
    try {
      const scheduledFor = nextWeeklyDate();
      await schedulePayout(kes, phone.replace(/\s+/g, ''), scheduledFor);
      toast(`Withdrawal of KES ${kes.toLocaleString()} scheduled for ${formatWeeklyDate(scheduledFor)}.`);
      onScheduledPayout();
      onClose();
    } catch (err) {
      toast(err instanceof WalletError ? err.message : 'Could not schedule this withdrawal.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Wallet Top-Up & Withdrawal" maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setMode('topup')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
              mode === 'topup' ? 'bg-white text-emerald-600 shadow dark:bg-slate-900 dark:text-emerald-400' : 'text-slate-500'
            }`}
          >
            <Coins className="h-4 w-4" /> Top Up Coins
          </button>
          <button
            type="button"
            onClick={() => setMode('withdraw')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
              mode === 'withdraw' ? 'bg-white text-blue-600 shadow dark:bg-slate-900 dark:text-blue-400' : 'text-slate-500'
            }`}
          >
            <Calendar className="h-4 w-4" /> Schedule Payout
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESET_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(String(a))}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                amount === String(a)
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              KES {a.toLocaleString()}
            </button>
          ))}
        </div>

        <Field label={mode === 'topup' ? 'Amount (KES)' : 'Withdrawal amount (KES) — minimum 500'}>
          <input
            type="number"
            min={mode === 'withdraw' ? 500 : 1}
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={mode === 'withdraw' ? '500' : '100'}
          />
        </Field>

        {mode === 'topup' && (
          <>
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment Method</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGateway('paystack')}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    gateway === 'paystack'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300'
                  }`}
                >
                  <CreditCard className="h-4 w-4" /> Paystack
                </button>
                <button
                  type="button"
                  onClick={() => setGateway('mpesa_stk')}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    gateway === 'mpesa_stk'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300'
                  }`}
                >
                  <Smartphone className="h-4 w-4" /> M-Pesa STK
                </button>
              </div>
            </div>

            {gateway === 'mpesa_stk' && (
              <Field label="M-Pesa phone number" hint="Safaricom number registered for M-Pesa.">
                <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" inputMode="tel" />
              </Field>
            )}

            <Button
              fullWidth
              loading={processing}
              onClick={gateway === 'paystack' ? handlePaystack : handleMpesaStk}
              disabled={!validAmount}
              icon={gateway === 'paystack' ? <CreditCard className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
            >
              {processing ? 'Processing...' : `Top Up KES ${validAmount ? kes.toLocaleString() : 0} → ${kes || 0} Coins`}
            </Button>
          </>
        )}

        {mode === 'withdraw' && (
          <form onSubmit={handleScheduleWithdraw} className="space-y-3">
            <Field label="M-Pesa phone number" hint="Funds will be sent to this number on the next weekly batch.">
              <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" inputMode="tel" />
            </Field>
            <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-sm text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>Withdrawals are batched every Friday at 10:00 to minimize gateway fees.</span>
            </div>
            <Button type="submit" fullWidth variant="secondary" loading={processing} disabled={!validAmount || kes < 500} icon={<Zap className="h-4 w-4" />}>
              Schedule Weekly Payout
            </Button>
          </form>
        )}
      </div>
    </Modal>
  );
}
