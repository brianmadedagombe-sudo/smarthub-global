import { useState } from 'react';
import { Bell, Plus, Trash2, Clock, Calendar, AlertCircle, Power } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import type { AlertCadence, Language, ScheduledAlert } from '@/lib/types';
import { Button, Card, Field, inputClass } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { toast } from '@/components/Toast';
import { translate } from '@/lib/i18n';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { sanitize } from '@/lib/security';

interface ScheduledAlertsModalProps {
  open: boolean;
  onClose: () => void;
  api: AppApi;
  language: Language;
}

export function ScheduledAlertsModal({ open, onClose, api, language }: ScheduledAlertsModalProps) {
  const lang = language;
  const alerts = api.state.scheduledAlerts ?? [];
  const { play } = useSoundEffects(api.state.soundPrefs);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [time, setTime] = useState('09:00');
  const [cadence, setCadence] = useState<AlertCadence>('once');

  const handleCreate = () => {
    const t = sanitize(title).trim();
    const m = sanitize(message).trim();
    if (!t) {
      toast(lang === 'sw' ? 'Weka kichwa cha arifa.' : 'Enter an alert title.', 'error');
      return;
    }
    api.addScheduledAlert(t, m || t, time, cadence);
    play('success');
    setTitle('');
    setMessage('');
    setTime('09:00');
    setCadence('once');
    setAdding(false);
    toast(lang === 'sw' ? 'Arifa imeundwa.' : 'Alert created.');
  };

  const handleDelete = (id: string) => {
    api.removeScheduledAlert(id);
    play('toggle');
    toast(lang === 'sw' ? 'Arifa imefutwa.' : 'Alert deleted.');
  };

  const handleToggle = (id: string) => {
    api.toggleScheduledAlert(id);
    play('click');
  };

  const cadenceLabel = (c: AlertCadence) => {
    if (c === 'once') return translate('alerts.cadenceOnce', lang);
    if (c === 'daily') return translate('alerts.cadenceDaily', lang);
    return translate('alerts.cadenceWeekly', lang);
  };

  const cadenceIcon = (c: AlertCadence) => {
    if (c === 'daily') return <Clock className="h-3.5 w-3.5" />;
    if (c === 'weekly') return <Calendar className="h-3.5 w-3.5" />;
    return <AlertCircle className="h-3.5 w-3.5" />;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={translate('alerts.title', lang)}
      maxWidth="max-w-lg"
      footer={
        <Button variant="ghost" onClick={onClose}>{lang === 'sw' ? 'Funga' : 'Close'}</Button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">{translate('alerts.subtitle', lang)}</p>

        <Button
          variant="secondary"
          onClick={() => setAdding((v) => !v)}
          icon={<Plus className="h-4 w-4" />}
        >
          {translate('alerts.add', lang)}
        </Button>

        {adding && (
          <Card className="space-y-3">
            <Field label={translate('alerts.alertTitle', lang)}>
              <input
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(sanitize(e.target.value))}
                placeholder={lang === 'sw' ? 'Kumbuka kulipa bili' : 'Remember to pay bills'}
                maxLength={60}
              />
            </Field>
            <Field label={translate('alerts.alertMessage', lang)}>
              <textarea
                className={`${inputClass} min-h-[60px] resize-y`}
                value={message}
                onChange={(e) => setMessage(sanitize(e.target.value))}
                placeholder={lang === 'sw' ? 'Maelezo ya arifa...' : 'Alert details...'}
                maxLength={200}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={translate('alerts.alertTime', lang)}>
                <input
                  type="time"
                  className={inputClass}
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </Field>
              <Field label={translate('alerts.alertCadence', lang)}>
                <select className={inputClass} value={cadence} onChange={(e) => setCadence(e.target.value as AlertCadence)}>
                  <option value="once">{translate('alerts.cadenceOnce', lang)}</option>
                  <option value="daily">{translate('alerts.cadenceDaily', lang)}</option>
                  <option value="weekly">{translate('alerts.cadenceWeekly', lang)}</option>
                </select>
              </Field>
            </div>
            <Button onClick={handleCreate} icon={<Bell className="h-4 w-4" />}>{translate('alerts.create', lang)}</Button>
          </Card>
        )}

        {alerts.length === 0 ? (
          <Card className="text-center text-sm text-slate-400">{translate('alerts.noAlerts', lang)}</Card>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <AlertRow
                key={a.id}
                alert={a}
                lang={lang}
                onToggle={() => handleToggle(a.id)}
                onDelete={() => handleDelete(a.id)}
                cadenceLabel={cadenceLabel(a.cadence)}
                cadenceIcon={cadenceIcon(a.cadence)}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function AlertRow({
  alert,
  lang,
  onToggle,
  onDelete,
  cadenceLabel,
  cadenceIcon,
}: {
  alert: ScheduledAlert;
  lang: Language;
  onToggle: () => void;
  onDelete: () => void;
  cadenceLabel: string;
  cadenceIcon: React.ReactNode;
}) {
  return (
    <Card className={`flex items-start justify-between gap-3 ${alert.enabled ? '' : 'opacity-50'}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{alert.title}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {cadenceIcon} {cadenceLabel}
          </span>
        </div>
        {alert.message && alert.message !== alert.title && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{alert.message}</p>
        )}
        <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
          <Clock className="h-3 w-3" /> {alert.time}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={onToggle}
          title={alert.enabled ? (lang === 'sw' ? 'Zima' : 'Disable') : (lang === 'sw' ? 'Washa' : 'Enable')}
          className={`rounded-lg p-1.5 transition ${alert.enabled ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <Power className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          title={lang === 'sw' ? 'Futa' : 'Delete'}
          className="rounded-lg p-1.5 text-rose-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}
