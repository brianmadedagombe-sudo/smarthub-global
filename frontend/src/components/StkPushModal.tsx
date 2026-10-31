import { useState } from 'react';
import { ShieldCheck, Smartphone } from 'lucide-react';
import { Modal } from './Modal';
import { Button, inputClass } from './ui';
import { toast } from './Toast';
import { MPESA_PAYOUT_NUMBER } from '@/lib/config';

interface StkProps {
  open: boolean;
  onClose: () => void;
  amount: string;
  label: string;
  onConfirmed?: () => void;
}

export function StkPushModal({ open, onClose, amount, label, onConfirmed }: StkProps) {
  const [phone, setPhone] = useState(MPESA_PAYOUT_NUMBER);
  const [processing, setProcessing] = useState(false);

  const confirm = () => {
    if (!/^\+?\d{10,15}$/.test(phone)) {
      toast('Enter a valid phone number.', 'error');
      return;
    }
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      onConfirmed?.();
      onClose();
      toast('STK push sent. Check your phone to complete payment.');
    }, 1500);
  };

  return (
    <Modal open={open} onClose={onClose} title="M-Pesa STK Push" maxWidth="max-w-sm">
      <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
        <ShieldCheck className="h-4 w-4" />
        Secured by M-Pesa Daraja. Payouts settle to the account owner.
      </div>
      <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700">
        <span className="text-sm text-slate-500">{label}</span>
        <span className="font-bold">{amount}</span>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Phone to charge
        </span>
        <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <Button variant="success" fullWidth className="mt-4" loading={processing} onClick={confirm} icon={<Smartphone className="h-4 w-4" />}>
        Confirm & Send STK Push
      </Button>
    </Modal>
  );
}
