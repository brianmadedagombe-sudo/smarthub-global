import { useCallback, useEffect, useRef, useState } from 'react';
import type { PushNotificationPrefs } from '@/lib/types';

export interface PushEvent {
  id: string;
  title: string;
  body: string;
  tag?: string;
  at: number;
}

export function usePushEngine(prefs: PushNotificationPrefs) {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [supported] = useState(typeof Notification !== 'undefined');
  const [history, setHistory] = useState<PushEvent[]>([]);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch {
      return false;
    }
  }, [supported]);

  const notify = useCallback(
    (title: string, body: string, opts?: { tag?: string; requireEnabled?: boolean }) => {
      const p = prefsRef.current;
      if (!supported || permission !== 'granted') return;
      if (opts?.requireEnabled !== false && !p.enabled) return;

      const event: PushEvent = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title,
        body,
        tag: opts?.tag,
        at: Date.now(),
      };
      setHistory((h) => [event, ...h].slice(0, 20));

      try {
        const n = new Notification(title, {
          body,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: opts?.tag,
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch {
        // non-fatal
      }
    },
    [supported, permission]
  );

  const requestAndEnable = useCallback(async (): Promise<boolean> => {
    const granted = await requestPermission();
    return granted;
  }, [requestPermission]);

  // Auto-request permission on mount if prefs already enabled
  useEffect(() => {
    if (supported && prefs.enabled && Notification.permission === 'default') {
      requestPermission();
    }
  }, [supported, prefs.enabled, requestPermission]);

  return {
    supported,
    permission,
    requestPermission: requestAndEnable,
    notify,
    history,
    markAllRead: () => setHistory((h) => h.map((e) => ({ ...e }))),
  };
}
