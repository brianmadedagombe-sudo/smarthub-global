import { useState } from 'react';
import { ListChecks, Mail } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import { sanitize } from '@/lib/security';
import { Card, SectionTitle, inputClass } from '@/components/ui';
import { AiButton } from '@/components/AiButton';
import { CopyButton } from '@/components/CopyButton';
import { toast } from '@/components/Toast';

export function PitchModule({ api }: { api: AppApi }) {
  const [project, setProject] = useState('');
  const [client, setClient] = useState('');
  const [amount, setAmount] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [proposal, setProposal] = useState('');
  const [reminder, setReminder] = useState('');

  return (
    <div className="space-y-5">
      <SectionTitle title="AI Pitch & Reminders" subtitle="Generate professional proposals and polite overdue payment reminders in seconds." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <ListChecks className="h-5 w-5 text-fuchsia-500" /> Project proposal
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Project brief</span>
            <textarea className={inputClass} rows={4} value={project} onChange={(e) => setProject(sanitize(e.target.value))} placeholder="e.g. Build a 5-page website for a beauty salon" />
          </label>
          <AiButton
            api={api}
            prompt={project}
            system="You are a freelance proposal writer. Turn the user's brief into a crisp, professional project proposal with Objective, Scope, Timeline, Investment, and Why-us sections. Return only the proposal text."
            onResult={(t) => { setProposal(t); toast('Proposal generated.'); }}
          >
            Generate proposal
          </AiButton>
          {proposal && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Result</span>
                <CopyButton text={proposal} />
              </div>
              <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm leading-relaxed dark:bg-slate-800/60">{proposal}</pre>
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <Mail className="h-5 w-5 text-sky-500" /> Overdue reminder
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Client name</span>
            <input className={inputClass} value={client} onChange={(e) => setClient(sanitize(e.target.value))} placeholder="Jane Doe" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</span>
              <input className={inputClass} value={amount} onChange={(e) => setAmount(sanitize(e.target.value))} placeholder="KES 12,000" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice #</span>
              <input className={inputClass} value={invoiceNo} onChange={(e) => setInvoiceNo(sanitize(e.target.value))} placeholder="INV-1024" />
            </label>
          </div>
          <AiButton
            api={api}
            prompt={`Client: ${client}. Amount: ${amount}. Invoice: ${invoiceNo}.`}
            system="You are a polite, professional collections assistant. Write a warm but clear overdue payment reminder email with subject and body. Use placeholders like {{client name}} only if names are missing. Keep it short and respectful. Return only the email."
            onResult={(t) => { setReminder(t); toast('Reminder generated.'); }}
          >
            Generate reminder
          </AiButton>
          {reminder && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Result</span>
                <CopyButton text={reminder} />
              </div>
              <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm leading-relaxed dark:bg-slate-800/60">{reminder}</pre>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
