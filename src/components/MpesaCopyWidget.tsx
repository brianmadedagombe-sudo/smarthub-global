import { useState } from 'react';
import { Copy, Check, Smartphone, Building2 } from 'lucide-react';
import { Card } from '@/components/ui';
import { toast } from '@/components/Toast';

interface MpesaCopyWidgetProps {
  tillNumber?: string;
  paybillNumber?: string;
  accountName?: string;
  displayName?: string;
}

export function MpesaCopyWidget({
  tillNumber = '856421',
  paybillNumber = '247247',
  accountName,
  displayName,
}: MpesaCopyWidgetProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copy = async (value: string, label: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast(`${label} copied: ${value}`, 'success');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast(`Could not copy. Long-press to copy manually: ${value}`, 'error');
    }
  };

  const name = accountName || displayName || 'your business';

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 text-white">
          <Smartphone className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-bold">M-Pesa Quick Pay</div>
          <div className="text-xs text-slate-400">Copy a number and pay instantly via M-Pesa</div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {/* Till */}
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            <Smartphone className="h-3 w-3" /> Buy Goods (Till)
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <code className="font-mono text-lg font-bold">{tillNumber}</code>
            <button
              onClick={() => copy(tillNumber, 'Till number', 'till')}
              className="shrink-0 rounded-lg bg-emerald-600 p-2 text-white transition hover:bg-emerald-500"
              title="Copy till number"
            >
              {copiedField === 'till' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-1 text-xs text-slate-400">Account: {name}</div>
        </div>

        {/* Paybill */}
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            <Building2 className="h-3 w-3" /> Pay Bill
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <code className="font-mono text-lg font-bold">{paybillNumber}</code>
            <button
              onClick={() => copy(paybillNumber, 'Paybill number', 'paybill')}
              className="shrink-0 rounded-lg bg-emerald-600 p-2 text-white transition hover:bg-emerald-500"
              title="Copy paybill number"
            >
              {copiedField === 'paybill' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-1 text-xs text-slate-400">Account: {name}</div>
        </div>
      </div>

      <p className="text-center text-[10px] text-slate-400">
        Go to M-Pesa &gt; Send Money, paste the number, and confirm. Fast, secure, no app needed.
      </p>
    </Card>
  );
}
