import { useMemo, useState } from 'react';
import { Receipt, Search, FileSpreadsheet, FileText, CreditCard, Smartphone, CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import type { Sale } from '@/lib/types';
import { sanitize } from '@/lib/security';
import { Card, Button, inputClass } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { toast } from '@/components/Toast';
import { printDocument, buildPrintDocument } from '@/lib/print';

type StatusFilter = 'all' | 'success' | 'pending' | 'failed';
type MethodFilter = 'all' | 'card' | 'mpesa';

const KES_TO_USD = 1 / 130;

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function csvCell(s: string): string {
  const v = String(s ?? '');
  return /["\n,]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function buildCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = buildCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_META: Record<Sale['status'], { icon: typeof CheckCircle2; label: string; color: string; bg: string }> = {
  success: { icon: CheckCircle2, label: 'Success', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/15' },
  pending: { icon: Clock, label: 'Pending', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/15' },
  failed: { icon: XCircle, label: 'Failed', color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-500/15' },
};

export function TransactionHistory({ api }: { api: AppApi }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailOpen, setDetailOpen] = useState<Sale | null>(null);

  const filtered = useMemo(() => {
    return api.state.sales.filter((s) => {
      if (search && !s.productTitle.toLowerCase().includes(search.toLowerCase()) && !s.buyerEmail.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (methodFilter !== 'all' && s.method !== methodFilter) return false;
      if (dateFrom) {
        const from = new Date(dateFrom).getTime();
        if (new Date(s.createdAt).getTime() < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1;
        if (new Date(s.createdAt).getTime() > to) return false;
      }
      return true;
    });
  }, [api.state.sales, search, statusFilter, methodFilter, dateFrom, dateTo]);

  const totals = useMemo(() => {
    const success = filtered.filter((s) => s.status === 'success');
    const revenue = success.reduce((sum, s) => sum + s.amountKes, 0);
    return {
      count: filtered.length,
      revenue,
      revenueUsd: revenue * KES_TO_USD,
      successCount: success.length,
      pendingCount: filtered.filter((s) => s.status === 'pending').length,
      failedCount: filtered.filter((s) => s.status === 'failed').length,
    };
  }, [filtered]);

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast('No transactions to export.', 'info');
      return;
    }
    const rows: string[][] = [
      ['Date', 'Product', 'Amount (KES)', 'Amount (USD)', 'Method', 'Status', 'Buyer Email', 'Transaction ID'],
      ...filtered.map((s) => [
        new Date(s.createdAt).toLocaleString(),
        s.productTitle,
        String(s.amountKes),
        (s.amountKes * KES_TO_USD).toFixed(2),
        s.method.toUpperCase(),
        s.status,
        s.buyerEmail,
        s.id,
      ]),
    ];
    downloadCsv(`smarthub-transactions-${Date.now()}.csv`, rows);
    toast(`Exported ${filtered.length} transactions to CSV.`);
  };

  const exportPdf = async () => {
    if (filtered.length === 0) {
      toast('No transactions to export.', 'info');
      return;
    }
    const rows = filtered
      .map(
        (s) =>
          `<tr><td>${escapeHtml(new Date(s.createdAt).toLocaleString())}</td><td>${escapeHtml(s.productTitle)}</td><td style="text-align:right">KES ${s.amountKes.toLocaleString()}</td><td>${escapeHtml(s.method.toUpperCase())}</td><td><span class="badge badge-${s.status === 'success' ? 'resolved' : s.status === 'pending' ? 'review' : 'declined'}">${s.status}</span></td><td>${escapeHtml(s.buyerEmail)}</td><td>${escapeHtml(s.id)}</td></tr>`
      )
      .join('');
    const summary = `
      <div class="stat-row">
        <div class="stat-box"><div class="num">${filtered.length}</div><div class="lbl">Transactions</div></div>
        <div class="stat-box"><div class="num">KES ${totals.revenue.toLocaleString()}</div><div class="lbl">Revenue</div></div>
        <div class="stat-box"><div class="num">${totals.successCount}</div><div class="lbl">Successful</div></div>
      </div>`;
    const body = `<h1>Transaction History</h1><p class="muted">${filtered.length} transaction${filtered.length === 1 ? '' : 's'} · Exported ${new Date().toLocaleString()}</p>${summary}<table><thead><tr><th>Date</th><th>Product</th><th style="text-align:right">Amount</th><th>Method</th><th>Status</th><th>Buyer</th><th>Txn ID</th></tr></thead><tbody>${rows}</tbody></table>`;
    try {
      await printDocument({ html: buildPrintDocument('Transaction History', body) });
      toast(`Exported ${filtered.length} transactions to PDF.`);
    } catch {
      toast('PDF export failed. Please try again.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary tiles */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Revenue</div>
          <div className="text-2xl font-bold">KES {totals.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div className="text-xs text-slate-400">${totals.revenueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD</div>
        </Card>
        <Card className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transactions</div>
          <div className="text-2xl font-bold">{totals.count}</div>
          <div className="text-xs text-slate-400">{totals.successCount} successful</div>
        </Card>
        <Card className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending</div>
          <div className="text-2xl font-bold text-amber-500">{totals.pendingCount}</div>
          <div className="text-xs text-slate-400">Awaiting confirmation</div>
        </Card>
        <Card className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Failed</div>
          <div className="text-2xl font-bold text-rose-500">{totals.failedCount}</div>
          <div className="text-xs text-slate-400">Declined / cancelled</div>
        </Card>
      </div>

      {/* Filters + export */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClass} pl-9`}
              placeholder="Search product or buyer email…"
              value={search}
              maxLength={100}
              onChange={(e) => setSearch(sanitize(e.target.value))}
            />
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            {(['all', 'success', 'pending', 'failed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold capitalize transition ${
                  statusFilter === s
                    ? 'bg-white text-slate-800 shadow dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            {(['all', 'card', 'mpesa'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold capitalize transition ${
                  methodFilter === m
                    ? 'bg-white text-slate-800 shadow dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {m === 'mpesa' ? 'M-Pesa' : m}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <div className="ml-auto flex gap-1.5">
            <Button variant="secondary" onClick={exportCsv} icon={<FileSpreadsheet className="h-4 w-4" />} className="px-3 py-2 text-xs">
              Export CSV
            </Button>
            <Button variant="secondary" onClick={exportPdf} icon={<FileText className="h-4 w-4" />} className="px-3 py-2 text-xs">
              Export PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Transaction list */}
      {filtered.length === 0 ? (
        <Card className="py-12 text-center">
          <Receipt className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">
            {api.state.sales.length === 0
              ? 'No transactions yet. Sales will appear here after customers purchase your products.'
              : 'No transactions match your filters.'}
          </p>
        </Card>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Buyer</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const StatusIcon = STATUS_META[s.status].icon;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setDetailOpen(s)}
                      className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium">{s.productTitle}</td>
                      <td className="px-4 py-3 text-right font-bold">KES {s.amountKes.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold">
                          {s.method === 'card' ? <CreditCard className="h-3.5 w-3.5 text-blue-500" /> : <Smartphone className="h-3.5 w-3.5 text-emerald-500" />}
                          {s.method === 'card' ? 'Card' : 'M-Pesa'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_META[s.status].bg} ${STATUS_META[s.status].color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {STATUS_META[s.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 truncate text-xs text-slate-500 dark:text-slate-400">{s.buyerEmail}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Transaction detail modal */}
      <Modal
        open={!!detailOpen}
        onClose={() => setDetailOpen(null)}
        title="Transaction Details"
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDetailOpen(null)}>Close</Button>
            <Button variant="secondary" onClick={() => detailOpen && exportSingleCsv(detailOpen)} icon={<FileSpreadsheet className="h-4 w-4" />}>
              Export This
            </Button>
          </>
        }
      >
        {detailOpen && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className={`grid h-11 w-11 place-items-center rounded-xl ${STATUS_META[detailOpen.status].bg}`}>
                {detailOpen.method === 'card' ? <CreditCard className="h-5 w-5 text-blue-500" /> : <Smartphone className="h-5 w-5 text-emerald-500" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{detailOpen.productTitle}</div>
                <div className="text-xs text-slate-400">{new Date(detailOpen.createdAt).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">KES {detailOpen.amountKes.toLocaleString()}</div>
                <div className="text-xs text-slate-400">${(detailOpen.amountKes * KES_TO_USD).toFixed(2)}</div>
              </div>
            </div>
            <DetailRow label="Transaction ID" value={detailOpen.id} />
            <DetailRow label="Payment method" value={detailOpen.method === 'card' ? 'Card (Paystack)' : 'M-Pesa STK Push'} />
            <DetailRow label="Status" value={STATUS_META[detailOpen.status].label} />
            <DetailRow label="Buyer email" value={detailOpen.buyerEmail} />
            <DetailRow label="Product ID" value={detailOpen.productId} />
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="truncate text-sm font-medium">{value}</span>
    </div>
  );
}

function exportSingleCsv(sale: Sale): void {
  const rows: string[][] = [
    ['Field', 'Value'],
    ['Transaction ID', sale.id],
    ['Date', new Date(sale.createdAt).toLocaleString()],
    ['Product', sale.productTitle],
    ['Product ID', sale.productId],
    ['Amount (KES)', String(sale.amountKes)],
    ['Amount (USD)', (sale.amountKes * KES_TO_USD).toFixed(2)],
    ['Method', sale.method.toUpperCase()],
    ['Status', sale.status],
    ['Buyer Email', sale.buyerEmail],
  ];
  downloadCsv(`smarthub-txn-${sale.id}.csv`, rows);
  toast('Transaction exported.');
}
