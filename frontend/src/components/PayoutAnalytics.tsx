import { useMemo, useState } from 'react';
import { TrendingUp, CheckCircle2, Clock, XCircle, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui';
import { translate } from '@/lib/i18n';
import type { MpesaPayout, Language } from '@/lib/types';

type TimeRange = '7' | '30' | '90' | 'all';

interface PayoutAnalyticsProps {
  payouts: MpesaPayout[];
  language: Language;
}

function dayLabel(date: Date, lang: Language): string {
  return date.toLocaleDateString(lang === 'sw' ? 'sw-KE' : 'en-US', { weekday: 'short' });
}

function dateLabel(date: Date, lang: Language): string {
  return date.toLocaleDateString(lang === 'sw' ? 'sw-KE' : 'en-US', { month: 'short', day: 'numeric' });
}

const RANGE_DAYS: Record<TimeRange, number> = { '7': 7, '30': 30, '90': 90, all: 0 };

export function PayoutAnalytics({ payouts, language }: PayoutAnalyticsProps) {
  const lang = language;
  const [range, setRange] = useState<TimeRange>('7');

  const rangeFiltered = useMemo(() => {
    if (range === 'all') return payouts;
    const days = RANGE_DAYS[range];
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return payouts.filter((p) => new Date(p.createdAt).getTime() >= cutoff);
  }, [payouts, range]);

  const stats = useMemo(() => {
    const success = rangeFiltered.filter((p) => p.status === 'success');
    const pending = rangeFiltered.filter((p) => p.status === 'pending');
    const failed = rangeFiltered.filter((p) => p.status === 'failed');
    const totalPaidOut = success.reduce((sum, p) => sum + p.amountKes, 0);
    const avgAmount = success.length > 0 ? Math.round(totalPaidOut / success.length) : 0;
    return { success, pending, failed, totalPaidOut, avgAmount, total: rangeFiltered.length };
  }, [rangeFiltered]);

  const chartBuckets = useMemo(() => {
    if (range === 'all') {
      // Group by month for all-time view
      const months: { label: string; total: number; count: number }[] = [];
      const byMonth: Record<string, { total: number; count: number; label: string }> = {};
      rangeFiltered
        .filter((p) => p.status === 'success')
        .forEach((p) => {
          const d = new Date(p.createdAt);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          const label = d.toLocaleDateString(lang === 'sw' ? 'sw-KE' : 'en-US', { month: 'short', year: '2-digit' });
          if (!byMonth[key]) byMonth[key] = { total: 0, count: 0, label };
          byMonth[key].total += p.amountKes;
          byMonth[key].count += 1;
        });
      const keys = Object.keys(byMonth).sort();
      keys.slice(-8).forEach((k) => months.push(byMonth[k]));
      if (months.length === 0) {
        for (let i = 7; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          months.push({ label: d.toLocaleDateString(lang === 'sw' ? 'sw-KE' : 'en-US', { month: 'short' }), total: 0, count: 0 });
        }
      }
      return months;
    }

    const numDays = RANGE_DAYS[range];
    const useWeekly = numDays > 14;
    const buckets: { label: string; total: number; count: number }[] = [];
    const bucketSize = useWeekly ? 7 : 1;
    const numBuckets = Math.min(8, Math.ceil(numDays / bucketSize));
    const actualBucketSize = Math.ceil(numDays / numBuckets);

    for (let i = numBuckets - 1; i >= 0; i--) {
      const bucketEnd = new Date();
      bucketEnd.setDate(bucketEnd.getDate() - i * actualBucketSize);
      const bucketStart = new Date(bucketEnd);
      bucketStart.setDate(bucketStart.getDate() - (actualBucketSize - 1));
      const startStr = bucketStart.toDateString();
      const endStr = bucketEnd.toDateString();
      const bucketPayouts = rangeFiltered.filter((p) => {
        if (p.status !== 'success') return false;
        const d = new Date(p.createdAt).toDateString();
        return d >= startStr && d <= endStr;
      });
      const label = actualBucketSize > 1
        ? `${dateLabel(bucketStart, lang)}`
        : dayLabel(bucketEnd, lang);
      buckets.push({
        label,
        total: bucketPayouts.reduce((s, p) => s + p.amountKes, 0),
        count: bucketPayouts.length,
      });
    }
    return buckets;
  }, [rangeFiltered, range, lang]);

  const maxBar = Math.max(...chartBuckets.map((d) => d.total), 1);

  const rangeOptions: { value: TimeRange; key: string }[] = [
    { value: '7', key: 'wallet.payoutRange7' },
    { value: '30', key: 'wallet.payoutRange30' },
    { value: '90', key: 'wallet.payoutRange90' },
    { value: 'all', key: 'wallet.payoutRangeAll' },
  ];

  if (payouts.length === 0) {
    return (
      <Card className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <BarChart3 className="h-4 w-4 text-blue-500" />
          {translate('wallet.payoutAnalytics', lang)}
        </div>
        <p className="py-4 text-center text-xs text-slate-400">{translate('wallet.payoutNoData', lang)}</p>
      </Card>
    );
  }

  const statCards = [
    { icon: TrendingUp, label: translate('wallet.payoutTotal', lang), value: `KES ${stats.totalPaidOut.toLocaleString()}`, cls: 'text-emerald-600 dark:text-emerald-400' },
    { icon: CheckCircle2, label: translate('wallet.payoutSuccess', lang), value: stats.success.length, cls: 'text-emerald-500' },
    { icon: Clock, label: translate('wallet.payoutPending', lang), value: stats.pending.length, cls: 'text-amber-500' },
    { icon: XCircle, label: translate('wallet.payoutFailed', lang), value: stats.failed.length, cls: 'text-rose-500' },
    { icon: BarChart3, label: translate('wallet.payoutAvgAmount', lang), value: `KES ${stats.avgAmount.toLocaleString()}`, cls: 'text-blue-500' },
  ];

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <BarChart3 className="h-4 w-4 text-blue-500" />
          {translate('wallet.payoutAnalytics', lang)}
        </div>
        {/* Time range selector */}
        <div className="flex flex-wrap gap-1">
          {rangeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                range === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {translate(opt.key, lang)}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-center gap-1.5">
                <Icon className={`h-3.5 w-3.5 ${s.cls}`} />
                <span className="text-[10px] uppercase tracking-wide text-slate-400">{s.label}</span>
              </div>
              <div className={`mt-1 text-sm font-bold ${s.cls}`}>{s.value}</div>
            </div>
          );
        })}
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-slate-400">{translate('wallet.payoutCount', lang)}</span>
          </div>
          <div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{stats.total}</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {range === 'all' ? translate('wallet.payoutRangeAll', lang) : translate(`wallet.payoutRange${range}`, lang)}
          </div>
        </div>
        <div className="flex items-end justify-between gap-1.5" style={{ height: '120px' }}>
          {chartBuckets.map((d, i) => {
            const heightPct = d.total > 0 ? Math.max(4, (d.total / maxBar) * 100) : 0;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    className={`w-full max-w-[36px] rounded-t-md transition-all duration-500 ${
                      d.total > 0
                        ? 'bg-gradient-to-t from-blue-600 to-blue-400'
                        : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                    style={{ height: `${heightPct}%` }}
                    title={d.total > 0 ? `KES ${d.total.toLocaleString()} · ${d.count} payout(s)` : undefined}
                  />
                </div>
                <span className="text-[9px] font-medium text-slate-400">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
