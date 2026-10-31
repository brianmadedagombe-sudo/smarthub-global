import { useState } from 'react';
import { Check, CreditCard, Sparkles, X } from 'lucide-react';
import { Modal } from './Modal';
import { Button, inputClass } from './ui';
import { toast } from './Toast';
import { MPESA_PAYOUT_NUMBER } from '@/lib/config';

interface PaywallProps {
  open: boolean;
  onClose: () => void;
  onProActivated: () => void;
}

export function PaywallModal({ open, onClose, onProActivated }: PaywallProps) {
  const [cardTab, setCardTab] = useState<'mpesa' | 'card'>('mpesa');
  const [phone, setPhone] = useState(MPESA_PAYOUT_NUMBER);
  const [card, setCard] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleMpesa = () => {
    if (!/^\+?\d{10,15}$/.test(phone)) {
      toast('Enter a valid phone number.', 'error');
      return;
    }
    setProcessing(true);
    // Simulated STK confirmation — no real money movement in this sandbox.
    setTimeout(() => {
      setProcessing(false);
      onProActivated();
      onClose();
      toast('Pro activated via M-Pesa. Thank you!');
    }, 1400);
  };

  const handleCard = () => {
    if (card.replace(/\s/g, '').length < 12) {
      toast('Enter a valid card number.', 'error');
      return;
    }
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      onProActivated();
      onClose();
      toast('Pro activated. Welcome to SmartHub Pro!');
    }, 1400);
  };

  return (
    <Modal open={open} onClose={onClose} title="Upgrade to Pro" maxWidth="max-w-md">
      <div className="mb-4 flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
        <Sparkles className="h-4 w-4" />
        Unlimited AI generation, PDF exports, and verified reward requests.
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button
          onClick={() => setCardTab('mpesa')}
          className={`rounded-lg py-2 text-sm font-semibold transition ${cardTab === 'mpesa' ? 'bg-white text-emerald-600 shadow dark:bg-slate-900 dark:text-emerald-400' : 'text-slate-500'}`}
        >
          M-Pesa (KES)
        </button>
        <button
          onClick={() => setCardTab('card')}
          className={`rounded-lg py-2 text-sm font-semibold transition ${cardTab === 'card' ? 'bg-white text-blue-600 shadow dark:bg-slate-900 dark:text-blue-400' : 'text-slate-500'}`}
        >
          Card ($5/mo)
        </button>
      </div>

      {cardTab === 'mpesa' ? (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              M-Pesa phone
            </span>
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <span className="mt-1 block text-xs text-slate-400">
              Payouts settle to {MPESA_PAYOUT_NUMBER} (account owner).
            </span>
          </label>
          <Button variant="success" fullWidth loading={processing} onClick={handleMpesa}>
            Send STK Push — KES 650/mo
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Card number
            </span>
            <input
              className={inputClass}
              placeholder="4242 4242 4242 4242"
              value={card}
              onChange={(e) => setCard(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input className={inputClass} placeholder="MM/YY" />
            <input className={inputClass} placeholder="CVC" />
          </div>
          <Button fullWidth loading={processing} onClick={handleCard} icon={<CreditCard className="h-4 w-4" />}>
            Pay $5/month
          </Button>
        </div>
      )}

      <ul className="mt-5 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        {['Unlimited AI uses every day', 'One-click PDF invoice export', 'Verified UC/Diamond reward requests', 'Priority support'].map(
          (f) => (
            <li key={f} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              {f}
            </li>
          )
        )}
      </ul>

      <button
        onClick={onClose}
        className="mt-4 flex w-full items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      >
        <X className="h-3 w-3" /> Maybe later
      </button>
    </Modal>
  );
}
