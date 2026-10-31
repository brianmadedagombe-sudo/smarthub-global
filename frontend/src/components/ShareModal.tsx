import { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, Facebook, Twitter, Send, Mail, Link2, X } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui';
import { toast } from '@/components/Toast';

const APP_URL = typeof window !== 'undefined' ? window.location.origin : 'https://smarthub.global';
const SHARE_TEXT = 'Check out SmartHub Global — the 7-in-1 Super App for creators, gamers, and businesses. Invoicing, storefronts, AI tools, gaming rewards & more!';

interface ShareTarget {
  label: string;
  icon: typeof MessageCircle;
  color: string;
  bg: string;
  url: string;
}

const SHARE_TARGETS: ShareTarget[] = [
  {
    label: 'WhatsApp',
    icon: MessageCircle,
    color: 'text-white',
    bg: 'bg-[#25D366]',
    url: `https://wa.me/?text=${encodeURIComponent(SHARE_TEXT + ' ' + APP_URL)}`,
  },
  {
    label: 'Telegram',
    icon: Send,
    color: 'text-white',
    bg: 'bg-[#0088cc]',
    url: `https://t.me/share/url?url=${encodeURIComponent(APP_URL)}&text=${encodeURIComponent(SHARE_TEXT)}`,
  },
  {
    label: 'Facebook',
    icon: Facebook,
    color: 'text-white',
    bg: 'bg-[#1877F2]',
    url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(APP_URL)}&quote=${encodeURIComponent(SHARE_TEXT)}`,
  },
  {
    label: 'X (Twitter)',
    icon: Twitter,
    color: 'text-white',
    bg: 'bg-slate-900 dark:bg-slate-700',
    url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(APP_URL)}`,
  },
  {
    label: 'SMS',
    icon: MessageCircle,
    color: 'text-white',
    bg: 'bg-emerald-600',
    url: `sms:?body=${encodeURIComponent(SHARE_TEXT + ' ' + APP_URL)}`,
  },
  {
    label: 'Email',
    icon: Mail,
    color: 'text-white',
    bg: 'bg-blue-600',
    url: `mailto:?subject=${encodeURIComponent('SmartHub Global — 7-in-1 Super App')}&body=${encodeURIComponent(SHARE_TEXT + '\n\n' + APP_URL)}`,
  },
];

export function ShareButton({ onOpen, className = '' }: { onOpen: () => void; className?: string }) {
  return (
    <button
      onClick={onOpen}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 ${className}`}
      aria-label="Share app"
      title="Share SmartHub Global"
    >
      <Share2 className="h-5 w-5" />
    </button>
  );
}

export function ShareButtonLg({ onOpen }: { onOpen: () => void }) {
  return (
    <Button variant="secondary" onClick={onOpen} icon={<Share2 className="h-4 w-4" />} className="w-full">
      Share SmartHub Global
    </Button>
  );
}

export function ShareModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'SmartHub Global',
          text: SHARE_TEXT,
          url: APP_URL,
        });
        onClose();
      } catch {
        // User cancelled — no action needed
      }
    }
  };

  const copyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(APP_URL);
      } else {
        const ta = document.createElement('textarea');
        ta.value = APP_URL;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast('Link Copied! Share it anywhere.');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast('Could not copy. Long-press the link below to copy manually.', 'error');
    }
  };

  const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Share SmartHub Global"
      maxWidth="max-w-md"
      footer={
        <Button variant="ghost" onClick={onClose} icon={<X className="h-4 w-4" />}>Close</Button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Help grow the SmartHub community. Share the app with friends, clients, and fellow creators!
        </p>

        {hasNativeShare && (
          <button
            onClick={handleNativeShare}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
          >
            <Share2 className="h-5 w-5" />
            Share via Device
          </button>
        )}

        <div className="grid grid-cols-3 gap-2.5">
          {SHARE_TARGETS.map((target) => {
            const Icon = target.icon;
            return (
              <a
                key={target.label}
                href={target.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-col items-center gap-1.5 rounded-xl ${target.bg} px-2 py-3 text-xs font-semibold ${target.color} transition hover:opacity-90 hover:shadow-md`}
              >
                <Icon className="h-5 w-5" />
                {target.label}
              </a>
            );
          })}
        </div>

        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <Link2 className="h-3.5 w-3.5" /> App Link
          </div>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={APP_URL}
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={copyLink}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900'
              }`}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
