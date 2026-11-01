import { ShieldCheck, BadgeCheck, TrendingUp, AlertCircle } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import { Card } from '@/components/ui';

interface TrustBadgeProps {
  api: AppApi;
  compact?: boolean;
}

type TrustLevel = 'new' | 'rising' | 'established' | 'verified';

function computeTrust(api: AppApi): {
  level: TrustLevel;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof ShieldCheck;
  description: string;
} {
  const sales = api.state.sales.filter((s) => s.status === 'success');
  const positiveTx = sales.length;
  const invoices = api.state.invoices.filter((i) => i.status === 'paid').length;
  const totalTx = positiveTx + invoices;
  const hasProfile = !!api.state.bio.displayName;
  const hasLinks = api.state.bio.links.length > 0;

  let level: TrustLevel = 'new';
  if (totalTx >= 20 && hasProfile && hasLinks) level = 'verified';
  else if (totalTx >= 10) level = 'established';
  else if (totalTx >= 3) level = 'rising';

  const config = {
    new: {
      label: 'New Hustler',
      color: 'text-slate-500',
      bgColor: 'bg-slate-100 dark:bg-slate-800',
      borderColor: 'border-slate-200 dark:border-slate-700',
      icon: AlertCircle,
      description: 'Account created — complete your profile and make your first sale to build trust.',
    },
    rising: {
      label: 'Rising Hustler',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-500/10',
      borderColor: 'border-blue-200 dark:border-blue-500/30',
      icon: TrendingUp,
      description: 'Building a track record — a few successful transactions completed.',
    },
    established: {
      label: 'Established Hustler',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
      borderColor: 'border-emerald-200 dark:border-emerald-500/30',
      icon: BadgeCheck,
      description: 'Trusted creator with a solid history of completed transactions.',
    },
    verified: {
      label: 'Verified Hustler',
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-50 dark:bg-violet-500/10',
      borderColor: 'border-violet-200 dark:border-violet-500/30',
      icon: ShieldCheck,
      description: 'Top-tier trust — 20+ successful transactions, complete profile, and active storefront.',
    },
  };

  return { level, ...config[level] };
}

export function TrustBadge({ api, compact = false }: TrustBadgeProps) {
  const trust = computeTrust(api);
  const Icon = trust.icon;

  const sales = api.state.sales.filter((s) => s.status === 'success').length;
  const paidInvoices = api.state.invoices.filter((i) => i.status === 'paid').length;
  const totalTx = sales + paidInvoices;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${trust.bgColor} ${trust.borderColor} ${trust.color}`}>
        <Icon className="h-3.5 w-3.5" />
        {trust.label}
      </div>
    );
  }

  return (
    <Card className={`border-2 ${trust.borderColor} ${trust.bgColor}`}>
      <div className="flex items-start gap-3">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${trust.bgColor} ${trust.color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className={`text-base font-bold ${trust.color}`}>{trust.label}</span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${trust.borderColor} ${trust.bgColor} ${trust.color}`}>
              <ShieldCheck className="h-3 w-3" /> Verified
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">{trust.description}</p>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <Stat label="Transactions" value={totalTx} />
            <Stat label="Sales" value={sales} />
            <Stat label="Paid Invoices" value={paidInvoices} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/70 px-2.5 py-1.5 text-center dark:bg-slate-900/50">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}
