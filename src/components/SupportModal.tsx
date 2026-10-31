import { useState } from 'react';
import { LifeBuoy, Send } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button, Field, inputClass } from '@/components/ui';
import { toast } from '@/components/Toast';
import { sanitize } from '@/lib/security';
import type { Language } from '@/lib/types';
import { translate } from '@/lib/i18n';

interface SupportModalProps {
  open: boolean;
  onClose: () => void;
  language: Language;
}

const API_URL = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/support-submit`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export function SupportModal({ open, onClose, language }: SupportModalProps) {
  const [name, setName] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const s = sanitize(subject);
    const m = sanitize(message);
    if (!s || !m) {
      toast(language === 'sw' ? 'Mada na ujumbe vinahitajika.' : 'Subject and message are required.', 'error');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ANON_KEY}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({
          name: sanitize(name),
          replyTo: sanitize(replyTo),
          subject: s,
          message: m,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (!data?.ok) throw new Error('Bad response');
      toast(translate('support.sent', language));
      setName('');
      setReplyTo('');
      setSubject('');
      setMessage('');
      onClose();
    } catch {
      toast(translate('support.failed', language), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={translate('support.title', language)}
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{language === 'sw' ? 'Ghairi' : 'Cancel'}</Button>
          <Button onClick={submit} disabled={sending} icon={sending ? undefined : <Send className="h-4 w-4" />}>
            {sending ? translate('support.sending', language) : translate('support.send', language)}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-sm text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
          <LifeBuoy className="h-4 w-4 shrink-0" />
          <span>{translate('support.subtitle', language)}</span>
        </div>
        <Field label={translate('support.name', language)}>
          <input
            className={inputClass}
            value={name}
            maxLength={80}
            onChange={(e) => setName(sanitize(e.target.value))}
            placeholder={language === 'sw' ? 'Jina lako' : 'Your name or handle'}
          />
        </Field>
        <Field label={translate('support.email', language)}>
          <input
            className={inputClass}
            value={replyTo}
            maxLength={120}
            onChange={(e) => setReplyTo(sanitize(e.target.value))}
            placeholder="you@example.com"
            type="email"
          />
        </Field>
        <Field label={translate('support.subject', language)}>
          <input
            className={inputClass}
            value={subject}
            maxLength={120}
            onChange={(e) => setSubject(sanitize(e.target.value))}
            placeholder={language === 'sw' ? 'Mada fupi' : 'Brief topic'}
          />
        </Field>
        <Field label={translate('support.message', language)}>
          <textarea
            className={inputClass}
            rows={4}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(sanitize(e.target.value))}
            placeholder={language === 'sw' ? 'Eleza tatizo lako…' : 'Describe your issue…'}
          />
        </Field>
      </div>
    </Modal>
  );
}
