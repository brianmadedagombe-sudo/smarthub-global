import { useMemo } from 'react';
import { TrendingUp, DollarSign, ShoppingBag, Radio, ArrowDownRight } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import { Card } from '@/components/ui';
import { MPESA_PAYOUT_NUMBER, OWNER_NAME } from '@/lib/config';

const KES_TO_USD = 1 / 130;

export function CreatorAnalytics({ api }: { api: AppApi }) {
  const stats = useMemo(() => {
    const successful = api.state.sales.filter((s) => s.status === 'success');
    const totalEarningsKes = successful.reduce((sum, s) => sum + s.amountKes, 0);
    const salesVolume = successful.length;
    const avgOrder = salesVolume > 0 ? totalEarningsKes / salesVolume : 0;

    // Last 7 days trend
    const now = new Date();
    const days: { label: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayTotal = successful
        .filter((s) => s.createdAt.slice(0, 10) === key)
        .reduce((sum, s) => sum + s.amountKes, 0);
      days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), total: dayTotal });
    }
    const maxDay = Math.max(1, ...days.map((d) => d.total));

    // Top products
    const productMap = new Map<string, { title: string; count: number; revenue: number }>();
    for (const s of successful) {
      const existing = productMap.get(s.productId) ?? { title: s.productTitle, count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += s.amountKes;
      productMap.set(s.productId, existing);
    }
    const topProducts = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    return {
      totalEarningsKes,
      totalEarningsUsd: totalEarningsKes * KES_TO_USD,
      salesVolume,
      avgOrder,
      days,
      maxDay,
      topProducts,
    };
  }, [api.state.sales]);

  return (
    <div className="space-y-4">
      {/* KPI tiles */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <DollarSign className="h-4 w-4 text-emerald-500" /> Total Earnings
          </div>
          <div className="text-2xl font-bold">KES {stats.totalEarningsKes.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div className="text-xs text-slate-400">${stats.totalEarningsUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD</div>
        </Card>
        <Card className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <ShoppingBag className="h-4 w-4 text-blue-500" /> Sales Volume
          </div>
          <div className="text-2xl font-bold">{stats.salesVolume}</div>
          <div className="text-xs text-slate-400">Avg KES {stats.avgOrder.toLocaleString(undefined, { maximumFractionDigits: 0 })} / order</div>
        </Card>
        <Card className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <TrendingUp className="h-4 w-4 text-cyan-500" /> 7-Day Trend
          </div>
          <div className="flex h-8 items-end gap-1">
            {stats.days.map((d, i) => (
              <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-500 to-cyan-400 transition-all" style={{ height: `${Math.max(4, (d.total / stats.maxDay) * 100)}%` }} title={`KES ${d.total}`} />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400">
            {stats.days.map((d, i) => <span key={i}>{d.label}</span>)}
          </div>
        </Card>
      </div>

      {/* M-Pesa routing widget */}
      <Card className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-500/10 dark:to-cyan-500/10">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500 text-white">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Automated Payout Routing</div>
            <div className="font-bold">{OWNER_NAME}</div>
            <div className="text-sm text-slate-600 dark:text-slate-300">{MPESA_PAYOUT_NUMBER}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Live · Auto-routing active</span>
        </div>
      </Card>

      {/* Top products */}
      {stats.topProducts.length > 0 ? (
        <Card>
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Top products</div>
          <ul className="space-y-2">
            {stats.topProducts.map((p, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700">
                <span className="truncate font-medium">{p.title}</span>
                <span className="flex items-center gap-3">
                  <span className="text-slate-400">{p.count} sold</span>
                  <span className="font-bold">KES {p.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="py-8 text-center">
          <ArrowDownRight className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-400">No sales yet. Publish products and share your store link to start earning.</p>
        </Card>
      )}

      {/* Recent sales log */}
      {api.state.sales.length > 0 && (
        <Card>
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Recent sales</div>
          <ul className="space-y-1.5 text-sm">
            {api.state.sales.slice(0, 8).map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                <span className="truncate">{s.productTitle}</span>
                <span className="flex items-center gap-2">
                  <span className="text-slate-500">KES {s.amountKes.toLocaleString()}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    s.method === 'mpesa'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
                  }`}>{s.method}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    s.status === 'success'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                      : s.status === 'pending'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400'
                  }`}>{s.status}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
