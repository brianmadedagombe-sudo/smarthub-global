import { useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Clock, Download, TrendingUp } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import { Card, Button } from '@/components/ui';
import { toast } from '@/components/Toast';
import { printDocument, buildPrintDocument } from '@/lib/print';

const KES_TO_USD = 1 / 130;

interface MonthlyAgg {
  key: string;
  label: string;
  paid: number;
  pending: number;
  count: number;
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function RevenueSummary({ api }: { api: AppApi }) {
  const [exporting, setExporting] = useState(false);
  const invoices = api.state.invoices.filter((i) => i.kind === 'invoice');

  const months = useMemo<MonthlyAgg[]>(() => {
    const map = new Map<string, MonthlyAgg>();
    for (const inv of invoices) {
      const key = monthKey(inv.date);
      if (!map.has(key)) {
        map.set(key, { key, label: monthLabel(key), paid: 0, pending: 0, count: 0 });
      }
      const agg = map.get(key)!;
      const total = inv.items.reduce((s, it) => s + it.qty * it.price, 0);
      if (inv.status === 'paid') agg.paid += total;
      else agg.pending += total;
      agg.count += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key)).slice(-6);
  }, [invoices]);

  const totals = useMemo(() => {
    let paidKes = 0;
    let pendingKes = 0;
    for (const inv of invoices) {
      const total = inv.items.reduce((s, it) => s + it.qty * it.price, 0);
      // Normalize currencies to KES using rough static rates for the summary.
      const inKes = toKes(total, inv.currency);
      if (inv.status === 'paid') paidKes += inKes;
      else pendingKes += inKes;
    }
    return {
      paidKes,
      pendingKes,
      paidUsd: paidKes * KES_TO_USD,
      pendingUsd: pendingKes * KES_TO_USD,
    };
  }, [invoices]);

  const maxBar = Math.max(1, ...months.map((m) => m.paid + m.pending));

  const toggleStatus = (id: string) => {
    api.patch((p) => ({
      ...p,
      invoices: p.invoices.map((inv) =>
        inv.id === id
          ? { ...inv, status: inv.status === 'paid' ? 'pending' : 'paid' }
          : inv
      ),
    }));
  };

  const exportReport = async () => {
    setExporting(true);
    try {
      const rows = months
        .map(
          (m) =>
            `<tr><td>${escapeHtml(m.label)}</td><td class="right">${m.count}</td><td class="right">KES ${m.paid.toFixed(2)}</td><td class="right">KES ${m.pending.toFixed(2)}</td><td class="right">KES ${(m.paid + m.pending).toFixed(2)}</td></tr>`
        )
        .join('');
      const now = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const extraStyles = '.summary{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0}';
      const body = `
        <h1>SmartHub Global — Revenue Summary</h1>
        <div class="muted">End-of-month report · ${escapeHtml(now)}</div>
        <div class="summary">
          <div class="card"><div class="label">Paid (KES)</div><div class="value">KES ${totals.paidKes.toFixed(2)}</div></div>
          <div class="card"><div class="label">Paid (USD est.)</div><div class="value">${totals.paidUsd.toFixed(2)}</div></div>
          <div class="card"><div class="label">Pending (KES)</div><div class="value">KES ${totals.pendingKes.toFixed(2)}</div></div>
          <div class="card"><div class="label">Pending (USD est.)</div><div class="value">${totals.pendingUsd.toFixed(2)}</div></div>
        </div>
        <h2>Monthly breakdown</h2>
        <table><thead><tr><th>Month</th><th class="right">Invoices</th><th class="right">Paid</th><th class="right">Pending</th><th class="right">Total</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="tot">Total revenue: KES ${(totals.paidKes + totals.pendingKes).toFixed(2)} (${((totals.paidKes + totals.pendingKes) * KES_TO_USD).toFixed(2)})</div>
      `;
      const html = buildPrintDocument(`Revenue Summary — ${now}`, body, extraStyles);
      await printDocument({ html });
      toast('Revenue report ready — use the print dialog to save.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed.';
      toast(msg, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <BarChart3 className="h-5 w-5 text-emerald-500" /> Monthly Revenue Summary
        </div>
        <Button variant="secondary" onClick={exportReport} loading={exporting} icon={<Download className="h-4 w-4" />}>
          Export report
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label="Paid (KES)" value={`KES ${totals.paidKes.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} tone="emerald" />
        <StatTile label="Paid (USD)" value={`$${totals.paidUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} icon={<TrendingUp className="h-4 w-4 text-blue-500" />} tone="blue" />
        <StatTile label="Pending (KES)" value={`KES ${totals.pendingKes.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={<Clock className="h-4 w-4 text-amber-500" />} tone="amber" />
        <StatTile label="Pending (USD)" value={`$${totals.pendingUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} icon={<Clock className="h-4 w-4 text-slate-400" />} tone="slate" />
      </div>

      {months.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last 6 months</div>
          <div className="space-y-2">
            {months.map((m) => (
              <div key={m.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{m.label}</span>
                  <span>KES {(m.paid + m.pending).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex h-6 w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${(m.paid / maxBar) * 100}%` }}
                    title={`Paid: KES ${m.paid.toFixed(0)}`}
                  />
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${(m.pending / maxBar) * 100}%` }}
                    title={`Pending: KES ${m.pending.toFixed(0)}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400">No invoices yet. Save an invoice to see your revenue breakdown here.</p>
      )}

      {invoices.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice status (tap to toggle)</div>
          <ul className="space-y-1.5">
            {invoices.slice(0, 6).map((inv) => (
              <li key={inv.id}>
                <button
                  onClick={() => toggleStatus(inv.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm transition hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                >
                  <span className="truncate">{inv.number} · {inv.clientName || '—'}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-slate-500">{inv.currency} {inv.items.reduce((s, it) => s + it.qty * it.price, 0).toFixed(0)}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        inv.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function StatTile({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: 'emerald' | 'blue' | 'amber' | 'slate' }) {
  const tones = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10',
    blue: 'bg-blue-50 dark:bg-blue-500/10',
    amber: 'bg-amber-50 dark:bg-amber-500/10',
    slate: 'bg-slate-100 dark:bg-slate-800',
  };
  return (
    <div className={`rounded-xl p-3 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {icon} {label}
      </div>
      <div className="mt-1 text-base font-bold">{value}</div>
    </div>
  );
}

// Rough static conversion to KES for the summary view. Not financial advice.
function toKes(amount: number, currency: string): number {
  const rates: Record<string, number> = {
    KES: 1,
    USD: 130,
    EUR: 140,
    GBP: 165,
    NGN: 1 / 1700 * 130,
    TZS: 1 / 2100 * 130,
    UGX: 1 / 3800 * 130,
  };
  return amount * (rates[currency] ?? 1);
}
