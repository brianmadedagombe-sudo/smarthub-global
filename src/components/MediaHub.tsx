import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Download, Headphones, Play, Trash2, Link2, WifiOff, Gauge } from 'lucide-react';
import { Button, Card, inputClass } from '@/components/ui';
import { toast } from '@/components/Toast';
import { MediaPlayer } from '@/components/MediaPlayer';
import { isSafeUrl } from '@/lib/security';
import {
  getOfflineObjectUrl,
  isOfflineCacheSupported,
  listOffline,
  removeOffline,
  saveForOffline,
} from '@/lib/offlineMedia';

interface ActiveSource {
  playUrl: string;
  remoteUrl: string | null;
  label: string;
}

function labelFromUrl(url: string): string {
  try {
    const { pathname, hostname } = new URL(url);
    const last = decodeURIComponent(pathname.split('/').filter(Boolean).pop() ?? '');
    return last || hostname;
  } catch {
    return url;
  }
}

function usePersistedFlag(key: string, defaultValue: boolean): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored === null ? defaultValue : stored === '1';
  });
  const update = (v: boolean) => {
    localStorage.setItem(key, v ? '1' : '0');
    setValue(v);
  };
  return [value, update];
}

function ToggleSwitch({ checked, onChange, label, icon }: { checked: boolean; onChange: (v: boolean) => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
        checked
          ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400'
          : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-white/10 dark:text-slate-300'
      }`}
    >
      {icon}
      {label}
      <span className={`ml-1 h-4 w-7 rounded-full p-0.5 transition ${checked ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
        <span className={`block h-3 w-3 rounded-full bg-white transition ${checked ? 'translate-x-3' : ''}`} />
      </span>
    </button>
  );
}

export function MediaHub() {
  const [input, setInput] = useState('');
  const [source, setSource] = useState<ActiveSource | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);
  const [dataSaver, setDataSaver] = usePersistedFlag('vidipesa_data_saver', true);
  const [audioOnly, setAudioOnly] = usePersistedFlag('vidipesa_audio_only', false);
  const [offlineUrls, setOfflineUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const blobUrlRef = useRef<string | null>(null);
  const offlineSupported = isOfflineCacheSupported();

  const replaceBlobUrl = (next: string | null) => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    blobUrlRef.current = next;
  };

  useEffect(() => () => replaceBlobUrl(null), []);

  const refreshOffline = async () => {
    if (!offlineSupported) return;
    try {
      setOfflineUrls(await listOffline());
    } catch {
      toast('Saved videos could not be loaded.', 'error');
    }
  };

  useEffect(() => {
    refreshOffline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playRemote = (raw: string) => {
    const url = raw.trim();
    if (!isSafeUrl(url) || !/^https?:\/\//i.test(url)) {
      toast('Enter a valid video link that starts with https://', 'error');
      return;
    }
    replaceBlobUrl(null);
    setPlayError(null);
    setSource({ playUrl: url, remoteUrl: url, label: labelFromUrl(url) });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    playRemote(input);
  };

  const playOffline = async (remoteUrl: string) => {
    try {
      const objectUrl = await getOfflineObjectUrl(remoteUrl);
      if (!objectUrl) {
        toast('That video is no longer saved on this device.', 'error');
        await refreshOffline();
        return;
      }
      replaceBlobUrl(objectUrl);
      setPlayError(null);
      setSource({ playUrl: objectUrl, remoteUrl: null, label: labelFromUrl(remoteUrl) });
    } catch {
      toast('Saved video could not be opened.', 'error');
    }
  };

  const onSaveOffline = async () => {
    if (!source?.remoteUrl) return;
    setSaving(true);
    try {
      await saveForOffline(source.remoteUrl);
      toast('Saved for offline viewing.');
      await refreshOffline();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'This video could not be saved.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onRemoveOffline = async (remoteUrl: string) => {
    try {
      await removeOffline(remoteUrl);
      toast('Removed from offline storage.');
      await refreshOffline();
    } catch {
      toast('This video could not be removed.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste an HLS (.m3u8) or MP4 video link"
              className={`${inputClass} pl-9`}
              type="url"
            />
          </div>
          <Button type="submit" disabled={!input.trim()}>
            <Play className="h-4 w-4" /> Play
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          <ToggleSwitch checked={dataSaver} onChange={setDataSaver} label="Data saver (480p)" icon={<Gauge className="h-4 w-4" />} />
          <ToggleSwitch checked={audioOnly} onChange={setAudioOnly} label="Audio only" icon={<Headphones className="h-4 w-4" />} />
        </div>

        {source ? (
          <div className="space-y-3">
            <MediaPlayer
              key={source.playUrl}
              src={source.playUrl}
              dataSaver={dataSaver}
              audioOnly={audioOnly}
              onError={setPlayError}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{source.label}</p>
              {source.remoteUrl && offlineSupported && !offlineUrls.includes(source.remoteUrl) && (
                <Button variant="secondary" loading={saving} onClick={onSaveOffline}>
                  <Download className="h-4 w-4" /> Save offline
                </Button>
              )}
            </div>
            {playError && <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{playError}</p>}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
            Paste a video link above to start streaming. Data saver keeps playback at 480p to use less data.
          </p>
        )}
      </Card>

      {offlineSupported && (
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-bold">Saved for offline</h3>
          </div>
          {offlineUrls.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Videos you save appear here and play without a connection.</p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-white/10">
              {offlineUrls.map((url) => (
                <li key={url} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 truncate text-sm text-slate-700 dark:text-slate-200">{labelFromUrl(url)}</span>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => playOffline(url)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-white/10"
                      aria-label="Play saved video"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveOffline(url)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                      aria-label="Remove saved video"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
