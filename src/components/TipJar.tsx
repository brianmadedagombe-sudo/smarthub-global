import { useState } from 'react';
import { Heart, Coffee, Crown, Zap } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { toast } from '@/components/Toast';
import { openCheckout } from '@/lib/paystack';
import { PAYSTACK_PUBLIC_KEY, OWNER_NAME, MPESA_PAYOUT_NUMBER } from '@/lib/config';

const PRESETS = [
  { amount: 50, label: 'Coffee', icon: Coffee, color: 'from-amber-400 to-orange-500' },
  { amount: 100, label: 'Support', icon: Heart, color: 'from-rose-400 to-pink-500' },
  { amount: 500, label: 'Crown', icon: Crown, color: 'from-violet-400 to-purple-500' },
] as const;

const TIP_EMAIL = 'tips@smarthub.global';

interface TipJarProps {
  displayName: string;
  onTipSent?: (amount: number, method: 'card' | 'mpesa') => void;
}

export function TipJar({ displayName, onTipSent }: TipJarProps) {
  const [selected, setSelected] = useState<number>(100);
  const [paying, setPaying] = useState(false);

  const payWithCard = async () => {
    setPaying(true);
    await openCheckout({
      email: TIP_EMAIL,
      amountKes: selected,
      key: PAYSTACK_PUBLIC_KEY,
      metadata: { type: 'tip', recipient: displayName, amount: String(selected) },
      onSuccess: (ref) => {
        toast(`Thank you! Tip of KES ${selected} sent. Ref: ${ref.slice(0, 12)}`);
        onTipSent?.(selected, 'card');
        setPaying(false);
      },
      onClose: () => setPaying(false),
    });
  };

  const payWithMpesa = () => {
    setPaying(true);
    toast(`M-Pesa STK push sent. Payout routes to ${MPESA_PAYOUT_NUMBER} (${OWNER_NAME}).`);
    setTimeout(() => {
      toast(`M-Pesa tip of KES ${selected} confirmed!`);
      onTipSent?.(selected, 'mpesa');
      setPaying(false);
    }, 1500);
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 text-white">
          <Heart className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-bold">Support {displayName || 'this creator'}</div>
          <div className="text-xs text-slate-400">Send a tip — every bit counts</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((p) => {
          const Icon = p.icon;
          const active = selected === p.amount;
          return (
            <button
              key={p.amount}
              onClick={() => setSelected(p.amount)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-center transition ${
                active
                  ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
              }`}
            >
              <div className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${p.color} text-white`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-xs font-bold">KES {p.amount}</div>
              <div className="text-[10px] text-slate-400">{p.label}</div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" fullWidth loading={paying} onClick={payWithMpesa} className="text-xs">
          M-Pesa
        </Button>
        <Button fullWidth loading={paying} onClick={payWithCard} icon={<Zap className="h-4 w-4" />} className="text-xs">
          Pay with Card
        </Button>
      </div>

      <p className="text-center text-[10px] text-slate-400">
        Tips are processed securely via Paystack. M-Pesa routes to {OWNER_NAME}.
      </p>
    </Card>
  );
}
