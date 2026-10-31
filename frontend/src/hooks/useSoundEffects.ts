import { useCallback, useRef } from 'react';
import type { SoundEffectType, SoundEffectPrefs } from '@/lib/types';

const SOUND_PATTERNS: Record<SoundEffectType, { freq: number; duration: number; type: OscillatorType; freqEnd?: number }> = {
  click: { freq: 800, duration: 0.05, type: 'sine' },
  success: { freq: 523, duration: 0.15, type: 'sine', freqEnd: 784 },
  error: { freq: 220, duration: 0.2, type: 'square', freqEnd: 180 },
  notification: { freq: 660, duration: 0.12, type: 'triangle', freqEnd: 880 },
  bookmark: { freq: 440, duration: 0.1, type: 'sine', freqEnd: 660 },
  toggle: { freq: 600, duration: 0.06, type: 'sine' },
};

export function useSoundEffects(prefs: SoundEffectPrefs) {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback((): AudioContext | null => {
    if (!prefs.enabled) return null;
    if (!ctxRef.current) {
      try {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        ctxRef.current = new Ctor();
      } catch {
        return null;
      }
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }, [prefs.enabled]);

  const play = useCallback((type: SoundEffectType) => {
    if (!prefs.enabled) return;
    const ctx = getCtx();
    if (!ctx) return;
    const pattern = SOUND_PATTERNS[type];
    const vol = Math.max(0, Math.min(1, prefs.volume));
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = pattern.type;
      osc.frequency.setValueAtTime(pattern.freq, ctx.currentTime);
      if (pattern.freqEnd) {
        osc.frequency.linearRampToValueAtTime(pattern.freqEnd, ctx.currentTime + pattern.duration);
      }
      gain.gain.setValueAtTime(vol * 0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + pattern.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + pattern.duration);
    } catch {
      // Audio may fail on some browsers — non-fatal.
    }
  }, [prefs, getCtx]);

  return { play };
}
