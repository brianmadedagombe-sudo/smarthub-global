import { useMemo, useState } from 'react';
import { Banknote, FileText, Plus, Sparkles, Trash2, Download, Users, Link2 } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import type { Invoice, InvoiceItem } from '@/lib/types';
import { uid, sanitize } from '@/lib/security';
import { Button, Card, Field, inputClass, SectionTitle } from '@/components/ui';
import { AiButton } from '@/components/AiButton';
import { toast } from '@/components/Toast';
import { OWNER_EMAIL, MPESA_PAYOUT_NUMBER } from '@/lib/config';
import { RevenueSummary } from '@/components/RevenueSummary';
import { PayrollModule } from '@/components/PayrollModule';
import { ClientPortal } from '@/components/ClientPortal';
import { printDocument, buildPrintDocument } from '@/lib/print';

const CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'NGN', 'TZS', 'UGX'];

type Tab = 'invoices' | 'payroll' | 'portal';

function emptyInvoice(): Invoice {
  return {
    id: uid('inv'),
    kind: 'invoice',
    number: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    currency: 'KES',
    items: [{ id: uid('it'), description: '', qty: 1, price: 0 }],
    notes: '',
    ownerName: '',
    ownerEmail: OWNER_EMAIL,
    ownerPhone: MPESA_PAYOUT_NUMBER,
    status: 'pending',
  };
}

export function InvoicingModule({ api }: { api: AppApi }) {
  const [tab, setTab] = useState<Tab>('invoices');

  return (
    <div className="space-y-5">
      <SectionTitle
        title="BillSync Engine"
        subtitle="Multi-currency invoicing, payroll management, and secure client portal links."
      />

      {/* Tab navigation */}
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <TabButton active={tab === 'invoices'} onClick={() => setTab('invoices')} icon={<Banknote className="h-4 w-4" />}>Invoices</TabButton>
        <TabButton active={tab === 'payroll'} onClick={() => setTab('payroll')} icon={<Users className="h-4 w-4" />}>Payroll</TabButton>
        <TabButton active={tab === 'portal'} onClick={() => setTab('portal')} icon={<Link2 className="h-4 w-4" />}>Client Portal</TabButton>
      </div>

      {tab === 'invoices' && <InvoiceFormTab api={api} />}
      {tab === 'payroll' && <PayrollModule api={api} />}
      {tab === 'portal' && <ClientPortal api={api} />}
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
        active
          ? 'bg-white text-emerald-600 shadow dark:bg-slate-900 dark:text-emerald-400'
          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </button>
  );
}

function InvoiceFormTab({ api }: { api: AppApi }) {
  const [draft, setDraft] = useState<Invoice>(() => emptyInvoice());
  const [exporting, setExporting] = useState(false);

  const total = useMemo(
    () => draft.items.reduce((s, it) => s + it.qty * it.price, 0),
    [draft.items]
  );

  const set = <K extends keyof Invoice>(k: K, v: Invoice[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const setItem = (id: string, patch: Partial<InvoiceItem>) =>
    setDraft((d) => ({
      ...d,
      items: d.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));

  const addItem = () =>
    setDraft((d) => ({
      ...d,
      items: [...d.items, { id: uid('it'), description: '', qty: 1, price: 0 }],
    }));

  const removeItem = (id: string) =>
    setDraft((d) => ({ ...d, items: d.items.filter((it) => it.id !== id) }));

  const save = () => {
    if (!sanitize(draft.clientName)) {
      toast('Add a client name first.', 'error');
      return;
    }
    api.patch((p) => ({ ...p, invoices: [draft, ...p.invoices] }));
    toast('Invoice saved to your records.');
    setDraft(emptyInvoice());
  };

  const expand = (id: string, text: string) => {
    setItem(id, { description: text });
    toast('Description expanded.');
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      const rows = draft.items
        .map(
          (it) => `<tr><td>${escape(sanitize(it.description))}</td><td class="right">${it.qty}</td><td class="right">${it.price.toFixed(2)}</td><td class="right">${(it.qty * it.price).toFixed(2)}</td></tr>`
        )
        .join('');
      const body = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start"><div><h1>SmartHub</h1><div class="muted">${escape(draft.kind)}</div></div><div style="text-align:right"><div style="font-weight:bold;font-size:18px">${escape(draft.number)}</div><div class="muted">${escape(draft.date)}</div></div></div>
        <div class="grid"><div><div class="muted">From</div><div>${escape(draft.ownerName || 'Your name')}</div><div class="muted">${escape(draft.ownerEmail)}</div><div class="muted">${escape(draft.ownerPhone)}</div></div><div><div class="muted">Bill to</div><div>${escape(draft.clientName)}</div><div class="muted">${escape(draft.clientEmail)}</div><div class="muted">${escape(draft.clientPhone)}</div></div></div>
        <div style="margin-top:16px"><span class="badge">Due ${escape(draft.dueDate)}</span></div>
        <table><thead><tr><th>Description</th><th class="right">Qty</th><th class="right">Unit</th><th class="right">Total</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="tot">Total: ${draft.currency} ${total.toFixed(2)}</div>
        ${draft.notes ? `<p class="muted" style="margin-top:24px;white-space:pre-line">${escape(sanitize(draft.notes))}</p>` : ''}
      `;
      const html = buildPrintDocument(draft.number, body);
      await printDocument({ html });
      toast("PDF ready — use your browser's print dialog to save.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed.';
      toast(msg, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <RevenueSummary api={api} />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Document type">
              <select className={inputClass} value={draft.kind} onChange={(e) => set('kind', e.target.value as Invoice['kind'])}>
                <option value="invoice">Invoice</option>
                <option value="quote">Quote</option>
              </select>
            </Field>
            <Field label="Number">
              <input className={inputClass} value={draft.number} onChange={(e) => set('number', sanitize(e.target.value))} />
            </Field>
            <Field label="Date">
              <input type="date" className={inputClass} value={draft.date} onChange={(e) => set('date', e.target.value)} />
            </Field>
            <Field label="Due date">
              <input type="date" className={inputClass} value={draft.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Client name">
              <input className={inputClass} value={draft.clientName} onChange={(e) => set('clientName', sanitize(e.target.value))} />
            </Field>
            <Field label="Client email">
              <input className={inputClass} value={draft.clientEmail} onChange={(e) => set('clientEmail', sanitize(e.target.value))} />
            </Field>
            <Field label="Client phone">
              <input className={inputClass} value={draft.clientPhone} onChange={(e) => set('clientPhone', sanitize(e.target.value))} />
            </Field>
            <Field label="Currency">
              <select className={inputClass} value={draft.currency} onChange={(e) => set('currency', e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Line items</span>
              <Button variant="ghost" onClick={addItem} icon={<Plus className="h-4 w-4" />}>Add item</Button>
            </div>
            <div className="space-y-2">
              {draft.items.map((it) => (
                <div key={it.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-start gap-2">
                    <input
                      className={`${inputClass} flex-1`}
                      placeholder="Item description"
                      value={it.description}
                      onChange={(e) => setItem(it.id, { description: sanitize(e.target.value) })}
                    />
                    <AiButton
                      api={api}
                      prompt={it.description || 'professional service'}
                      system="Expand this into a polished 1-2 sentence professional service description for an invoice line item. Return only the description."
                      onResult={(t) => expand(it.id, t)}
                    >
                      <Sparkles className="h-4 w-4" /> AI
                    </AiButton>
                    <button onClick={() => removeItem(it.id)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10" aria-label="Remove item">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input type="number" min={0} className={inputClass} placeholder="Qty" value={it.qty} onChange={(e) => setItem(it.id, { qty: Number(e.target.value) || 0 })} />
                    <input type="number" min={0} className={inputClass} placeholder="Unit price" value={it.price} onChange={(e) => setItem(it.id, { price: Number(e.target.value) || 0 })} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Field label="Notes / terms">
            <textarea className={inputClass} rows={3} value={draft.notes} onChange={(e) => set('notes', sanitize(e.target.value))} />
          </Field>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-blue-500" /> Live summary
            </div>
            <dl className="space-y-2 text-sm">
              <Row k="Number" v={draft.number} />
              <Row k="Client" v={draft.clientName || '—'} />
              <Row k="Due" v={draft.dueDate} />
              <Row k="Currency" v={draft.currency} />
              <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-700">
                <dt className="text-slate-500">Total</dt>
                <dd className="text-xl font-bold">{draft.currency} {total.toFixed(2)}</dd>
              </div>
            </dl>
          </Card>

          <Card className="space-y-2">
            <Button fullWidth onClick={save} icon={<Banknote className="h-4 w-4" />}>Save to records</Button>
            <Button fullWidth variant="secondary" onClick={exportPdf} loading={exporting} icon={<Download className="h-4 w-4" />}>Export PDF</Button>
          </Card>

          {api.state.invoices.length > 0 && (
            <Card>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Recent records</div>
              <ul className="space-y-1.5 text-sm">
                {api.state.invoices.slice(0, 5).map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between">
                    <span className="truncate">{inv.number} · {inv.clientName || '—'}</span>
                    <span className="text-slate-500">{inv.currency} {inv.items.reduce((s, it) => s + it.qty * it.price, 0).toFixed(0)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function escape(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
