import { useCallback, useEffect, useState } from 'react';
import type { PushNotificationPrefs, Language } from '@/lib/types';
import { translate } from '@/lib/i18n';

export function usePushNotifications(prefs: PushNotificationPrefs, lang: Language) {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  const isSupported = typeof Notification !== 'undefined';

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch {
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback(
    (title: string, body: string, opts?: { tag?: string }) => {
      if (!isSupported || permission !== 'granted' || !prefs.enabled) return;
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
        // Notifications may fail in some browsers — non-fatal.
      }
    },
    [isSupported, permission, prefs.enabled]
  );

  const sendTestNotification = useCallback(() => {
    sendNotification(translate('push.testTitle', lang), translate('push.testBody', lang), { tag: 'test' });
  }, [sendNotification, lang]);

  return { isSupported, permission, requestPermission, sendNotification, sendTestNotification };
}

export function usePushPermissionCheck(prefs: PushNotificationPrefs, lang: Language) {
  const { requestPermission, isSupported, sendNotification } = usePushNotifications(prefs, lang);

  useEffect(() => {
    if (prefs.enabled && isSupported && Notification.permission === 'default') {
      requestPermission();
    }
  }, [prefs.enabled, isSupported, requestPermission]);

  return { requestPermission, isSupported, sendNotification };
}
