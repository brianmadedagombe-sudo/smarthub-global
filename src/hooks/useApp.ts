import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadState, saveState, todayKey } from '@/lib/storage';
import type { AppState, Theme, Language, Currency, RespectEntry, TipRecord, RespectWallConfig, RespectTheme, RespectReactionType, PushNotificationPrefs, BookmarkFolder, ScheduledAlert, SoundEffectPrefs, AlertCadence } from '@/lib/types';
import { uid } from '@/lib/security';
import { canCallAi } from '@/lib/ai';

export function useApp() {
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [state.theme]);

  const patch = useCallback((updater: (prev: AppState) => AppState) => {
    setState((prev) => updater(prev));
  }, []);

  const toggleTheme = useCallback(() => {
    patch((p) => ({ ...p, theme: (p.theme === 'dark' ? 'light' : 'dark') as Theme }));
  }, [patch]);

  const aiUsage = useMemo(() => canCallAi(state.profile.daily, state.profile.isPro), [state.profile]);

  const recordAiUse = useCallback(() => {
    patch((p) => {
      if (p.profile.isPro) return p;
      const daily = { ...p.profile.daily };
      if (daily.date !== todayKey()) {
        daily.date = todayKey();
        daily.count = 0;
      }
      daily.count += 1;
      return { ...p, profile: { ...p.profile, daily } };
    });
  }, [patch]);

  const activatePro = useCallback(() => {
    patch((p) => ({ ...p, profile: { ...p.profile, isPro: true } }));
  }, [patch]);

  const setLanguage = useCallback((language: Language) => {
    patch((p) => ({ ...p, language }));
  }, [patch]);

  const setCurrency = useCallback((currency: Currency) => {
    patch((p) => ({ ...p, currency }));
  }, [patch]);

  const setRole = useCallback((role: 'member' | 'founder') => {
    patch((p) => ({ ...p, role }));
  }, [patch]);

  const sendRespect = useCallback((fromName: string, message: string, color: RespectTheme = 'gold') => {
    const entry: RespectEntry = { id: uid('rsc'), fromName, message, createdAt: new Date().toISOString(), pinned: false, color, reactions: [] };
    patch((p) => {
      const max = p.respectWallConfig?.maxEntries ?? 50;
      return { ...p, respect: [entry, ...p.respect].slice(0, max) };
    });
  }, [patch]);

  const addRespectReaction = useCallback((entryId: string, type: RespectReactionType, fromName: string) => {
    patch((p) => ({
      ...p,
      respect: p.respect.map((r) =>
        r.id === entryId
          ? { ...r, reactions: [...r.reactions, { id: uid('rxn'), type, fromName, createdAt: new Date().toISOString() }] }
          : r
      ),
    }));
  }, [patch]);

  const toggleBookmark = useCallback((serviceId: string) => {
    patch((p) => {
      const exists = p.bookmarkedServiceIds?.includes(serviceId) ?? false;
      const ids = exists ? (p.bookmarkedServiceIds ?? []).filter((id) => id !== serviceId) : [...(p.bookmarkedServiceIds ?? []), serviceId];
      return { ...p, bookmarkedServiceIds: ids };
    });
  }, [patch]);

  const toggleRespectPin = useCallback((id: string) => {
    patch((p) => ({ ...p, respect: p.respect.map((r) => (r.id === id ? { ...r, pinned: !r.pinned } : r)) }));
  }, [patch]);

  const deleteRespect = useCallback((id: string) => {
    patch((p) => ({ ...p, respect: p.respect.filter((r) => r.id !== id) }));
  }, [patch]);

  const setRespectWallConfig = useCallback((cfg: Partial<RespectWallConfig>) => {
    patch((p) => ({ ...p, respectWallConfig: { ...p.respectWallConfig, ...cfg } }));
  }, [patch]);

  const recordTip = useCallback((fromName: string, amount: number, kind: 'coffee' | 'crown') => {
    const record: TipRecord = { id: uid('tip'), fromName, amount, kind, createdAt: new Date().toISOString() };
    patch((p) => ({ ...p, tips: [record, ...p.tips].slice(0, 50) }));
  }, [patch]);

  const setPushPrefs = useCallback((prefs: Partial<PushNotificationPrefs>) => {
    patch((p) => ({ ...p, pushPrefs: { ...p.pushPrefs, ...prefs } }));
  }, [patch]);

  const addBookmarkFolder = useCallback((name: string, color: string) => {
    const folder: BookmarkFolder = { id: uid('bf'), name, color, serviceIds: [], createdAt: new Date().toISOString() };
    patch((p) => ({ ...p, bookmarkFolders: [...p.bookmarkFolders, folder] }));
  }, [patch]);

  const removeBookmarkFolder = useCallback((id: string) => {
    patch((p) => ({ ...p, bookmarkFolders: p.bookmarkFolders.filter((f) => f.id !== id) }));
  }, [patch]);

  const renameBookmarkFolder = useCallback((id: string, name: string) => {
    patch((p) => ({ ...p, bookmarkFolders: p.bookmarkFolders.map((f) => (f.id === id ? { ...f, name } : f)) }));
  }, [patch]);

  const toggleServiceInFolder = useCallback((folderId: string, serviceId: string) => {
    patch((p) => ({
      ...p,
      bookmarkFolders: p.bookmarkFolders.map((f) => {
        if (f.id !== folderId) return f;
        const exists = f.serviceIds.includes(serviceId);
        return { ...f, serviceIds: exists ? f.serviceIds.filter((id) => id !== serviceId) : [...f.serviceIds, serviceId] };
      }),
    }));
  }, [patch]);

  const addScheduledAlert = useCallback((title: string, message: string, time: string, cadence: AlertCadence) => {
    const alert: ScheduledAlert = { id: uid('sa'), title, message, time, cadence, enabled: true, lastFired: null, createdAt: new Date().toISOString() };
    patch((p) => ({ ...p, scheduledAlerts: [...p.scheduledAlerts, alert] }));
  }, [patch]);

  const removeScheduledAlert = useCallback((id: string) => {
    patch((p) => ({ ...p, scheduledAlerts: p.scheduledAlerts.filter((a) => a.id !== id) }));
  }, [patch]);

  const toggleScheduledAlert = useCallback((id: string) => {
    patch((p) => ({ ...p, scheduledAlerts: p.scheduledAlerts.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)) }));
  }, [patch]);

  const setSoundPrefs = useCallback((prefs: Partial<SoundEffectPrefs>) => {
    patch((p) => ({ ...p, soundPrefs: { ...p.soundPrefs, ...prefs } }));
  }, [patch]);

  return { state, patch, toggleTheme, aiUsage, recordAiUse, activatePro, setLanguage, setCurrency, setRole, sendRespect, addRespectReaction, toggleRespectPin, deleteRespect, setRespectWallConfig, recordTip, toggleBookmark, setPushPrefs, addBookmarkFolder, removeBookmarkFolder, renameBookmarkFolder, toggleServiceInFolder, addScheduledAlert, removeScheduledAlert, toggleScheduledAlert, setSoundPrefs };
}

export type AppApi = ReturnType<typeof useApp>;
