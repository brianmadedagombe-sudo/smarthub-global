import { useState } from 'react';
import { Smartphone, ShieldCheck, Clock, CheckCircle2, XCircle, History, Receipt, Printer } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button, Field, inputClass } from '@/components/ui';
import { toast } from '@/components/Toast';
import { sanitize } from '@/lib/security';
import { translate } from '@/lib/i18n';
import { printDocument, buildPrintDocument } from '@/lib/print';
import { requestPayout, WalletError } from '@/lib/wallet';
import type { Language, MpesaPayout } from '@/lib/types';

interface MpesaPayoutModalProps {
  open: boolean;
  onClose: () => void;
  language: Language;
  balanceKes: number;
  payouts: MpesaPayout[];
  onPaid: () => void;
}

function normalizeMpesaPhone(raw: string): string | null {
  let p = sanitize(raw).replace(/\s/g, '');
  if (p.startsWith('+254')) p = '0' + p.slice(4);
  else if (p.startsWith('254')) p = '0' + p.slice(3);
  if (/^07\d{8}$/.test(p) || /^01\d{8}$/.test(p)) return p;
  return null;
}

const STATUS_STYLES: Record<MpesaPayout['status'], { icon: typeof Clock; cls: string }> = {
  pending: { icon: Clock, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
  success: { icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  failed: { icon: XCircle, cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' },
};

export function MpesaPayoutModal({ open, onClose, language, balanceKes, payouts, onPaid }: MpesaPayoutModalProps) {
  const lang = language;
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [receiptFor, setReceiptFor] = useState<MpesaPayout | null>(null);

  const submit = async () => {
    const normalized = normalizeMpesaPhone(phone);
    if (!normalized) {
      toast(translate('wallet.mpesaInvalidPhone', lang), 'error');
      return;
    }
    const kes = parseInt(sanitize(amount), 10);
    if (!Number.isFinite(kes) || kes < 500) {
      toast(translate('wallet.mpesaInvalidAmount', lang), 'error');
      return;
    }
    if (balanceKes < kes) {
      toast(translate('wallet.mpesaInsufficient', lang), 'error');
      return;
    }

    setProcessing(true);
    try {
      const result = await requestPayout(kes, normalized);
      if (result.status === 'failed') {
        toast(translate('wallet.mpesaFailed', lang), 'error');
      } else if (result.status === 'success') {
        toast(translate('wallet.mpesaSuccess', lang));
      } else if (result.simulation) {
        toast(lang === 'sw' ? 'Ombi la malipo limewasilishwa (Simulation Mode). Linasubiri kuthibitishwa.' : 'Payout request submitted (Simulation Mode). It is pending confirmation.', 'info');
      } else {
        toast(lang === 'sw' ? 'Ombi la malipo limewasilishwa. Linasubiri kuthibitishwa.' : 'Payout request submitted. It is pending confirmation.', 'info');
      }
      setPhone('');
      setAmount('');
      onPaid();
      onClose();
    } catch (err) {
      toast(err instanceof WalletError ? err.message : translate('wallet.mpesaFailed', lang), 'error');
    } finally {
      setProcessing(false);
    }
  };

  const printReceipt = (p: MpesaPayout) => {
    const statusLabel = translate(`wallet.mpesaStatus${p.status.charAt(0).toUpperCase()}${p.status.slice(1)}`, lang);
    const body = `
      <h1>${translate('wallet.receiptTitle', lang)}</h1>
      <div class="stat-row">
        <div class="stat-box"><div class="lbl">${translate('wallet.receiptRef', lang)}</div><div class="num" style="font-size:14px">${p.reference}</div></div>
        <div class="stat-box"><div class="lbl">${translate('wallet.receiptCode', lang)}</div><div class="num" style="font-size:14px">${p.receiptCode ?? 'N/A'}</div></div>
      </div>
      <div class="grid">
        <div class="card"><div class="label">${translate('wallet.receiptAmount', lang)}</div><div class="value">KES ${p.amountKes.toLocaleString()}</div></div>
        <div class="card"><div class="label">${translate('wallet.receiptPhone', lang)}</div><div class="value" style="font-size:16px">${p.phone}</div></div>
      </div>
      <div class="grid">
        <div class="card"><div class="label">${translate('wallet.receiptDate', lang)}</div><div class="value" style="font-size:14px">${new Date(p.createdAt).toLocaleString(lang === 'sw' ? 'sw-KE' : 'en-US')}</div></div>
        <div class="card"><div class="label">${translate('wallet.receiptStatus', lang)}</div><div class="value" style="font-size:16px">${statusLabel}</div></div>
      </div>
      <div class="footer" style="margin-top:24px">SmartHub Global · M-Pesa Daraja · ${new Date().toLocaleDateString()}</div>
    `;
    printDocument({ html: buildPrintDocument(translate('wallet.receiptTitle', lang), body) })
      .then(() => toast(translate('wallet.receiptGenerated', lang)))
      .catch(() => toast(translate('wallet.receiptGenerated', lang), 'error'));
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={translate('wallet.mpesaTitle', lang)}
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>{lang === 'sw' ? 'Funga' : 'Close'}</Button>
            <Button onClick={submit} disabled={processing} loading={processing} icon={!processing ? <Smartphone className="h-4 w-4" /> : undefined}>
              {processing ? translate('wallet.mpesaProcessing', lang) : translate('wallet.mpesaSubmit', lang)}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>{translate('wallet.mpesaSubtitle', lang)}</span>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 dark:border-emerald-500/20 dark:bg-emerald-500/5">
            <div className="text-xs uppercase tracking-wide text-slate-400">{translate('wallet.cash', lang)}</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              KES {balanceKes.toLocaleString()}
            </div>
          </div>

          <Field label={translate('wallet.mpesaPhone', lang)} hint={translate('wallet.mpesaPhoneHint', lang)}>
            <input
              className={inputClass}
              value={phone}
              maxLength={15}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712345678"
              inputMode="tel"
            />
          </Field>

          <Field label={translate('wallet.mpesaAmount', lang)}>
            <input
              className={inputClass}
              type="number"
              min={500}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500"
            />
          </Field>

          {/* Payout history */}
          {payouts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <History className="h-4 w-4 text-slate-400" />
                {translate('wallet.mpesaHistory', lang)}
              </div>
              <ul className="max-h-48 space-y-1.5 overflow-y-auto">
                {payouts.slice(0, 10).map((p) => {
                  const StatusIcon = STATUS_STYLES[p.status].icon;
                  return (
                    <li key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">KES {p.amountKes.toLocaleString()}</div>
                        <div className="truncate text-xs text-slate-400">
                          {translate('wallet.mpesaRef', lang)}: {p.reference} · {p.phone}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {p.status === 'success' && (
                          <button
                            onClick={() => setReceiptFor(p)}
                            title={translate('wallet.viewReceipt', lang)}
                            className="rounded-md p-1.5 text-blue-500 transition hover:bg-blue-50 dark:hover:bg-blue-500/10"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[p.status].cls}`}>
                          <StatusIcon className="h-3 w-3" />
                          {translate(`wallet.mpesaStatus${p.status.charAt(0).toUpperCase()}${p.status.slice(1)}`, lang)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </Modal>

      {/* Receipt modal */}
      <Modal
        open={!!receiptFor}
        onClose={() => setReceiptFor(null)}
        title={translate('wallet.receiptTitle', lang)}
        maxWidth="max-w-sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReceiptFor(null)}>{lang === 'sw' ? 'Funga' : 'Close'}</Button>
            {receiptFor && (
              <Button onClick={() => printReceipt(receiptFor)} icon={<Printer className="h-4 w-4" />}>
                {translate('wallet.receiptPrint', lang)}
              </Button>
            )}
          </>
        }
      >
        {receiptFor && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span className="font-semibold">{translate('wallet.receiptTitle', lang)}</span>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <ReceiptRow label={translate('wallet.receiptRef', lang)} value={receiptFor.reference} />
              <ReceiptRow label={translate('wallet.receiptCode', lang)} value={receiptFor.receiptCode ?? 'N/A'} mono />
              <ReceiptRow label={translate('wallet.receiptAmount', lang)} value={`KES ${receiptFor.amountKes.toLocaleString()}`} bold />
              <ReceiptRow label={translate('wallet.receiptPhone', lang)} value={receiptFor.phone} />
              <ReceiptRow label={translate('wallet.receiptDate', lang)} value={new Date(receiptFor.createdAt).toLocaleString(lang === 'sw' ? 'sw-KE' : 'en-US')} />
              <ReceiptRow label={translate('wallet.receiptStatus', lang)} value={translate(`wallet.mpesaStatus${receiptFor.status.charAt(0).toUpperCase()}${receiptFor.status.slice(1)}`, lang)} />
            </div>

            <p className="text-center text-[10px] text-slate-400">
              SmartHub Global · M-Pesa Daraja API
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}

function ReceiptRow({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`${bold ? 'text-base font-bold' : 'font-semibold'} ${mono ? 'font-mono text-xs' : ''} text-slate-700 dark:text-slate-200`}>
        {value}
      </span>
    </div>
  );
}
