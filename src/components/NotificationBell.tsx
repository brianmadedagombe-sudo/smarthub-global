import { useState } from 'react';
import { Bell, BellOff, Check, Settings, Send, Volume2 } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import type { Language } from '@/lib/types';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { translate } from '@/lib/i18n';
import { toast } from '@/components/Toast';

interface NotificationBellProps {
  api: AppApi;
  language: Language;
}

export function NotificationBell({ api, language }: NotificationBellProps) {
  const lang = language;
  const prefs = api.state.pushPrefs;
  const soundPrefs = api.state.soundPrefs;
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const { isSupported, permission, requestPermission, sendTestNotification } = usePushNotifications(prefs, lang);
  const { play } = useSoundEffects(soundPrefs);

  const notifications = api.state.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleEnable = async () => {
    if (!isSupported) {
      toast(translate('push.permissionUnsupported', lang), 'error');
      return;
    }
    const granted = await requestPermission();
    if (granted) {
      api.setPushPrefs({ enabled: true });
      play('success');
      toast(translate('push.enabled', lang));
    } else {
      play('error');
      toast(translate('push.permissionDenied', lang), 'error');
    }
  };

  const handleDisable = () => {
    api.setPushPrefs({ enabled: false });
    play('toggle');
    toast(translate('push.disabled', lang));
  };

  const handleTest = () => {
    play('notification');
    if (permission !== 'granted' || !prefs.enabled) {
      handleEnable().then(() => {
        setTimeout(() => sendTestNotification(), 500);
      });
      return;
    }
    sendTestNotification();
    toast(translate('push.testSent', lang));
  };

  const markAllRead = () => {
    play('click');
    api.patch((p) => ({
      ...p,
      notifications: p.notifications.map((n) => ({ ...n, read: true })),
    }));
  };

  const togglePref = (key: 'walletAlerts' | 'providerUpdates' | 'communityUpdates') => {
    play('toggle');
    api.setPushPrefs({ [key]: !prefs[key] } as Partial<typeof prefs>);
  };

  const toggleSoundEnabled = () => {
    const newVal = !soundPrefs.enabled;
    api.setSoundPrefs({ enabled: newVal });
    if (newVal) play('success');
  };

  const handleVolumeChange = (v: number) => {
    api.setSoundPrefs({ volume: v });
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((v) => !v); play('click'); }}
        className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label={translate('push.title', lang)}
        title={translate('push.title', lang)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {prefs.enabled && (
          <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setShowSettings(false); setShowSoundSettings(false); }} />
          <div className="fixed right-2 top-14 z-[70] w-80 max-w-[calc(100vw-1rem)] rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-bold">{translate('push.title', lang)}</span>
                {prefs.enabled ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                    {translate('push.enabledBadge', lang)}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {translate('push.disabledBadge', lang)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setShowSoundSettings((v) => !v); setShowSettings(false); play('click'); }}
                  className={`rounded-md p-1 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 ${showSoundSettings ? 'text-blue-500' : 'text-slate-400'}`}
                  title={translate('sounds.title', lang)}
                >
                  <Volume2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setShowSettings((v) => !v); setShowSoundSettings(false); play('click'); }}
                  className={`rounded-md p-1 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 ${showSettings ? 'text-blue-500' : 'text-slate-400'}`}
                  title={translate('push.preferences', lang)}
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>

            {showSoundSettings ? (
              /* Sound settings panel */
              <div className="space-y-3 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">{translate('sounds.enable', lang)}</span>
                  <button
                    onClick={toggleSoundEnabled}
                    className={`relative h-6 w-11 rounded-full transition ${soundPrefs.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${soundPrefs.enabled ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">{translate('sounds.volume', lang)}</span>
                    <span className="text-[10px] text-slate-400">{Math.round(soundPrefs.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={soundPrefs.volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-full accent-blue-600"
                    disabled={!soundPrefs.enabled}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => play('click')}
                    disabled={!soundPrefs.enabled}
                    className="rounded-lg bg-slate-100 py-2 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    {translate('sounds.testClick', lang)}
                  </button>
                  <button
                    onClick={() => play('success')}
                    disabled={!soundPrefs.enabled}
                    className="rounded-lg bg-emerald-100 py-2 text-[10px] font-semibold text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-40 dark:bg-emerald-500/15 dark:text-emerald-400"
                  >
                    {translate('sounds.testSuccess', lang)}
                  </button>
                  <button
                    onClick={() => play('notification')}
                    disabled={!soundPrefs.enabled}
                    className="rounded-lg bg-blue-100 py-2 text-[10px] font-semibold text-blue-700 transition hover:bg-blue-200 disabled:opacity-40 dark:bg-blue-500/15 dark:text-blue-400"
                  >
                    {translate('sounds.testNotification', lang)}
                  </button>
                </div>
              </div>
            ) : showSettings ? (
              /* Settings panel */
              <div className="space-y-3 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">{translate('push.enable', lang)}</span>
                  <button
                    onClick={prefs.enabled ? handleDisable : handleEnable}
                    className={`relative h-6 w-11 rounded-full transition ${prefs.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${prefs.enabled ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>

                <PrefRow
                  label={translate('push.walletAlerts', lang)}
                  desc={translate('push.walletAlertsDesc', lang)}
                  checked={prefs.walletAlerts}
                  onChange={() => togglePref('walletAlerts')}
                />
                <PrefRow
                  label={translate('push.providerUpdates', lang)}
                  desc={translate('push.providerUpdatesDesc', lang)}
                  checked={prefs.providerUpdates}
                  onChange={() => togglePref('providerUpdates')}
                />
                <PrefRow
                  label={translate('push.communityUpdates', lang)}
                  desc={translate('push.communityUpdatesDesc', lang)}
                  checked={prefs.communityUpdates}
                  onChange={() => togglePref('communityUpdates')}
                />

                <button
                  onClick={handleTest}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
                >
                  <Send className="h-3.5 w-3.5" /> {translate('push.testNotification', lang)}
                </button>
              </div>
            ) : (
              /* Notifications list */
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <BellOff className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                    <p className="text-xs text-slate-400">{translate('push.noNotifications', lang)}</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.slice(0, 15).map((n) => (
                      <li
                        key={n.id}
                        className={`flex items-start gap-2 px-4 py-2.5 ${n.read ? '' : 'bg-blue-50/50 dark:bg-blue-500/5'}`}
                      >
                        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-blue-500'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{n.title}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{n.body}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {notifications.length > 0 && !showSettings && !showSoundSettings && (
              <button
                onClick={markAllRead}
                className="flex w-full items-center justify-center gap-1 border-t border-slate-200 py-2 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-50 dark:border-slate-800 dark:text-blue-400 dark:hover:bg-blue-500/10"
              >
                <Check className="h-3 w-3" /> {translate('push.markAllRead', lang)}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PrefRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-2 rounded-lg p-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</div>
        <div className="text-[10px] text-slate-400">{desc}</div>
      </div>
      <button
        onClick={onChange}
        type="button"
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${checked ? 'left-4' : 'left-0.5'}`} />
      </button>
    </label>
  );
}
