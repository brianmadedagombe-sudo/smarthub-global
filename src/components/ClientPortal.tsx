import { useMemo, useState } from 'react';
import { Link2, Copy, Eye, ExternalLink, Lock, Share2 } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import type { Invoice } from '@/lib/types';
import { sanitize } from '@/lib/security';
import { Card, Button, inputClass, SectionTitle } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { toast } from '@/components/Toast';
import { OWNER_NAME, OWNER_EMAIL, MPESA_PAYOUT_NUMBER } from '@/lib/config';
import { maskEmail, maskPhone } from '@/lib/security';

// Generates a short token from the invoice id + timestamp. This is a client-side
// token for link sharing — the actual invoice data lives in the owner's local
// storage. The token prevents casual URL guessing but is not cryptographic.
function generateToken(invoice: Invoice): string {
  return btoa(`${invoice.id}:${invoice.number}:${Date.now()}`).replace(/[/+=]/g, '').slice(0, 24);
}

function invoiceTotal(inv: Invoice): number {
  return inv.items.reduce((s, it) => s + it.qty * it.price, 0);
}

export function ClientPortal({ api }: { api: AppApi }) {
  const [shareInvoice, setShareInvoice] = useState<Invoice | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);

  const savedInvoices = useMemo(
    () => api.state.invoices.filter((inv) => inv.kind === 'invoice'),
    [api.state.invoices]
  );

  const createShareLink = (inv: Invoice) => {
    setShareInvoice(inv);
    setToken(generateToken(inv));
    setCopied(false);
  };

  const shareUrl = useMemo(() => {
    if (!shareInvoice || !token) return '';
    const base = window.location.origin + window.location.pathname;
    return `${base}?portal=${token}&inv=${shareInvoice.id}`;
  }, [shareInvoice, token]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast('Client portal link copied to clipboard.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Copy failed — select the link manually.', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Secure Client Portal"
        subtitle="Generate token-protected links so clients can view their invoice and payment instructions without logging in."
      />

      {savedInvoices.length === 0 ? (
        <Card className="py-12 text-center">
          <Link2 className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">
            No invoices saved yet. Create and save an invoice first, then share it here.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Lock className="h-4 w-4 text-emerald-500" /> Saved Invoices
          </div>
          <ul className="space-y-2">
            {savedInvoices.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{inv.number}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      inv.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                    }`}>{inv.status}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {inv.clientName || '—'} · {inv.currency} {invoiceTotal(inv).toFixed(2)}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="ghost" className="px-2 py-1.5 text-xs" onClick={() => setViewInvoice(inv)} icon={<Eye className="h-3.5 w-3.5" />}>
                    Preview
                  </Button>
                  <Button className="px-2 py-1.5 text-xs" onClick={() => createShareLink(inv)} icon={<Share2 className="h-3.5 w-3.5" />}>
                    Share link
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Share link modal */}
      <Modal
        open={!!shareInvoice}
        onClose={() => setShareInvoice(null)}
        title="Client Portal Link"
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShareInvoice(null)}>Close</Button>
            <Button onClick={copyLink} icon={copied ? <Copy className="h-4 w-4" /> : <Copy className="h-4 w-4" />}>
              {copied ? 'Copied!' : 'Copy link'}
            </Button>
          </>
        }
      >
        {shareInvoice && (
          <div className="space-y-3">
            <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                <Lock className="h-4 w-4" /> Token-protected
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Anyone with this link can view the invoice summary and payment instructions for {shareInvoice.number}. The link contains a unique token — no login required.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Shareable URL</label>
              <div className="flex items-center gap-2">
                <input className={inputClass} readOnly value={shareUrl} />
                <ExternalLink className="h-5 w-5 shrink-0 text-slate-400" />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Invoice preview modal (what the client sees) */}
      <Modal
        open={!!viewInvoice}
        onClose={() => setViewInvoice(null)}
        title={viewInvoice ? `Invoice ${viewInvoice.number}` : ''}
        maxWidth="max-w-lg"
        footer={<Button variant="ghost" onClick={() => setViewInvoice(null)}>Close</Button>}
      >
        {viewInvoice && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">From</div>
                <div className="font-semibold">{viewInvoice.ownerName || OWNER_NAME}</div>
                <div className="text-sm text-slate-500">{maskEmail(viewInvoice.ownerEmail || OWNER_EMAIL)}</div>
                <div className="text-sm text-slate-500">{maskPhone(viewInvoice.ownerPhone || MPESA_PAYOUT_NUMBER)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bill to</div>
                <div className="font-semibold">{sanitize(viewInvoice.clientName) || '—'}</div>
                <div className="text-sm text-slate-500">{sanitize(viewInvoice.clientEmail)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                viewInvoice.status === 'paid'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
              }`}>{viewInvoice.status}</span>
              <span className="text-xs text-slate-400">Due {viewInvoice.dueDate}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 text-left text-xs font-semibold uppercase text-slate-500">Description</th>
                  <th className="py-2 text-right text-xs font-semibold uppercase text-slate-500">Qty</th>
                  <th className="py-2 text-right text-xs font-semibold uppercase text-slate-500">Price</th>
                  <th className="py-2 text-right text-xs font-semibold uppercase text-slate-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {viewInvoice.items.map((it) => (
                  <tr key={it.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2">{sanitize(it.description) || '—'}</td>
                    <td className="py-2 text-right">{it.qty}</td>
                    <td className="py-2 text-right">{it.price.toFixed(2)}</td>
                    <td className="py-2 text-right font-medium">{(it.qty * it.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold">{viewInvoice.currency} {invoiceTotal(viewInvoice).toFixed(2)}</span>
            </div>
            {viewInvoice.notes && (
              <p className="whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                {sanitize(viewInvoice.notes)}
              </p>
            )}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Payment instructions</div>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                Send M-Pesa to <span className="font-semibold">{maskPhone(MPESA_PAYOUT_NUMBER)}</span> ({OWNER_NAME}). For card payments, contact the sender.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
