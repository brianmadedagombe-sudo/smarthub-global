import { useMemo, useState } from 'react';
import { Users, Plus, Trash2, FileText, Download, UserCircle, Wallet } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import type { Employee } from '@/lib/types';
import { uid, sanitize } from '@/lib/security';
import { Button, Card, Field, inputClass, SectionTitle } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { toast } from '@/components/Toast';
import { OWNER_NAME, MPESA_PAYOUT_NUMBER } from '@/lib/config';
import { printDocument, buildPrintDocument } from '@/lib/print';

const PAYROLL_CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'NGN'];

function emptyEmployee(): Employee {
  return {
    id: uid('emp'),
    name: '',
    role: '',
    phone: '',
    email: '',
    grossSalary: 0,
    deductionNssf: 0,
    deductionNhif: 0,
    deductionTax: 0,
    deductionCustom: 0,
    currency: 'KES',
    createdAt: new Date().toISOString(),
  };
}

function netPay(emp: Employee): number {
  const deductions = emp.deductionNssf + emp.deductionNhif + emp.deductionTax + emp.deductionCustom;
  return Math.max(0, emp.grossSalary - deductions);
}

function totalDeductions(emp: Employee): number {
  return emp.deductionNssf + emp.deductionNhif + emp.deductionTax + emp.deductionCustom;
}

export function PayrollModule({ api }: { api: AppApi }) {
  const [draft, setDraft] = useState<Employee>(() => emptyEmployee());
  const [payslipFor, setPayslipFor] = useState<Employee | null>(null);
  const [exporting, setExporting] = useState(false);

  const set = <K extends keyof Employee>(k: K, v: Employee[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    if (!sanitize(draft.name)) {
      toast('Employee name is required.', 'error');
      return;
    }
    if (draft.grossSalary <= 0) {
      toast('Enter a gross salary greater than zero.', 'error');
      return;
    }
    api.patch((p) => ({ ...p, employees: [draft, ...p.employees] }));
    toast(`${draft.name} added to the payroll registry.`);
    setDraft(emptyEmployee());
  };

  const remove = (id: string) =>
    api.patch((p) => ({ ...p, employees: p.employees.filter((e) => e.id !== id) }));

  const generatePayslip = (emp: Employee) => {
    const payslip = {
      id: uid('payslip'),
      employeeId: emp.id,
      employeeName: emp.name,
      grossPay: emp.grossSalary,
      totalDeductions: totalDeductions(emp),
      netPay: netPay(emp),
      currency: emp.currency,
      period: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      createdAt: new Date().toISOString(),
    };
    api.patch((p) => ({ ...p, payslips: [payslip, ...p.payslips] }));
    setPayslipFor(emp);
    toast('Payslip generated.');
  };

  const exportPayslip = async (emp: Employee) => {
    setExporting(true);
    try {
      const deductions = totalDeductions(emp);
      const net = netPay(emp);
      const period = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const extraStyles = '.section{margin-top:24px}.net{font-size:22px;font-weight:bold}';
      const body = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start"><div><h1>SmartHub Payroll</h1><div class="muted">Payslip for ${esc(period)}</div></div><div style="text-align:right"><div style="font-weight:bold;font-size:16px">${esc(OWNER_NAME)}</div><div class="muted">${esc(MPESA_PAYOUT_NUMBER)}</div></div></div>
        <div class="section"><table><tr><th>Employee</th><th>Role</th></tr><tr><td>${esc(emp.name)}</td><td>${esc(emp.role || '—')}</td></tr></table></div>
        <div class="section"><table><tr><th>Earnings</th><th class="right">Amount (${esc(emp.currency)})</th></tr><tr><td>Gross Salary</td><td class="right">${emp.grossSalary.toFixed(2)}</td></tr></table></div>
        <div class="section"><table><tr><th>Deductions</th><th class="right">Amount (${esc(emp.currency)})</th></tr><tr><td>NSSF</td><td class="right">${emp.deductionNssf.toFixed(2)}</td></tr><tr><td>NHIF/SHIF</td><td class="right">${emp.deductionNhif.toFixed(2)}</td></tr><tr><td>PAYE Tax</td><td class="right">${emp.deductionTax.toFixed(2)}</td></tr><tr><td>Custom</td><td class="right">${emp.deductionCustom.toFixed(2)}</td></tr><tr><td><b>Total Deductions</b></td><td class="right"><b>${deductions.toFixed(2)}</b></td></tr></table></div>
        <div class="section" style="border-top:2px solid #0f172a;padding-top:16px"><table><tr><td><b>Net Pay</b></td><td class="right net">${emp.currency} ${net.toFixed(2)}</td></tr></table></div>
      `;
      const html = buildPrintDocument(`Payslip - ${emp.name}`, body, extraStyles);
      await printDocument({ html });
      toast('Payslip ready — use print to save as PDF.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed.';
      toast(msg, 'error');
    } finally {
      setExporting(false);
    }
  };

  const totals = useMemo(() => {
    const gross = api.state.employees.reduce((s, e) => s + e.grossSalary, 0);
    const deductions = api.state.employees.reduce((s, e) => s + totalDeductions(e), 0);
    const net = api.state.employees.reduce((s, e) => s + netPay(e), 0);
    return { gross, deductions, net };
  }, [api.state.employees]);

  return (
    <div className="space-y-5">
      <SectionTitle title="Payroll & Employee Management" subtitle="Register employees, configure salaries and deductions, and generate itemized payslips." />

      {/* Payroll summary tiles */}
      {api.state.employees.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Wallet className="h-4 w-4 text-blue-500" /> Total Gross Payroll
            </div>
            <div className="text-2xl font-bold">KES {totals.gross.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </Card>
          <Card className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <UserCircle className="h-4 w-4 text-amber-500" /> Total Deductions
            </div>
            <div className="text-2xl font-bold">KES {totals.deductions.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </Card>
          <Card className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Users className="h-4 w-4 text-emerald-500" /> Total Net Payroll
            </div>
            <div className="text-2xl font-bold">KES {totals.net.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </Card>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Employee form */}
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Plus className="h-4 w-4 text-blue-500" /> Add / Edit Employee
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <input className={inputClass} value={draft.name} onChange={(e) => set('name', sanitize(e.target.value))} placeholder="Jane Wanjiku" />
            </Field>
            <Field label="Role / Position">
              <input className={inputClass} value={draft.role} onChange={(e) => set('role', sanitize(e.target.value))} placeholder="Designer" />
            </Field>
            <Field label="Phone">
              <input className={inputClass} value={draft.phone} onChange={(e) => set('phone', sanitize(e.target.value))} placeholder="+254…" />
            </Field>
            <Field label="Email">
              <input className={inputClass} value={draft.email} onChange={(e) => set('email', sanitize(e.target.value))} placeholder="jane@company.com" />
            </Field>
            <Field label="Currency">
              <select className={inputClass} value={draft.currency} onChange={(e) => set('currency', e.target.value)}>
                {PAYROLL_CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Gross salary">
              <input type="number" min={0} className={inputClass} value={draft.grossSalary || ''} onChange={(e) => set('grossSalary', Number(e.target.value) || 0)} placeholder="e.g. 85000" />
            </Field>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Deductions ({draft.currency})</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="NSSF">
                <input type="number" min={0} className={inputClass} value={draft.deductionNssf || ''} onChange={(e) => set('deductionNssf', Number(e.target.value) || 0)} placeholder="0" />
              </Field>
              <Field label="NHIF/SHIF">
                <input type="number" min={0} className={inputClass} value={draft.deductionNhif || ''} onChange={(e) => set('deductionNhif', Number(e.target.value) || 0)} placeholder="0" />
              </Field>
              <Field label="PAYE Tax">
                <input type="number" min={0} className={inputClass} value={draft.deductionTax || ''} onChange={(e) => set('deductionTax', Number(e.target.value) || 0)} placeholder="0" />
              </Field>
              <Field label="Custom">
                <input type="number" min={0} className={inputClass} value={draft.deductionCustom || ''} onChange={(e) => set('deductionCustom', Number(e.target.value) || 0)} placeholder="0" />
              </Field>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
            <span className="text-sm text-slate-500">Net pay</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {draft.currency} {netPay(draft).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>

          <Button fullWidth onClick={save} icon={<Users className="h-4 w-4" />}>Save Employee</Button>
        </Card>

        {/* Employee registry */}
        <Card className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-slate-500" /> Employee Registry ({api.state.employees.length})
          </div>
          {api.state.employees.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              No employees yet. Add your first team member using the form.
            </div>
          ) : (
            <ul className="space-y-2">
              {api.state.employees.map((emp) => (
                <li key={emp.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{emp.name}</div>
                      <div className="text-xs text-slate-400">{emp.role || '—'}</div>
                    </div>
                    <button onClick={() => remove(emp.id)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10" aria-label="Remove employee">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <div>
                      <div className="text-slate-500">Gross: <span className="font-medium">{emp.currency} {emp.grossSalary.toLocaleString()}</span></div>
                      <div className="text-slate-500">Net: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{emp.currency} {netPay(emp).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => generatePayslip(emp)} icon={<FileText className="h-3.5 w-3.5" />}>
                        Payslip
                      </Button>
                      <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => exportPayslip(emp)} loading={exporting} icon={<Download className="h-3.5 w-3.5" />}>
                        Export
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Payslip confirmation modal */}
      <Modal
        open={!!payslipFor}
        onClose={() => setPayslipFor(null)}
        title="Payslip Generated"
        maxWidth="max-w-sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPayslipFor(null)}>Close</Button>
            {payslipFor && (
              <Button onClick={() => { if (payslipFor) exportPayslip(payslipFor); setPayslipFor(null); }} loading={exporting} icon={<Download className="h-4 w-4" />}>
                Download PDF
              </Button>
            )}
          </>
        }
      >
        {payslipFor && (
          <div className="space-y-2 text-sm">
            <p>Payslip for <span className="font-semibold">{payslipFor.name}</span> has been recorded.</p>
            <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
              <span className="text-slate-500">Net Pay</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{payslipFor.currency} {netPay(payslipFor).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
