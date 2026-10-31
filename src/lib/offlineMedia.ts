const CACHE_NAME = 'vidipesa-offline-v1';
const MAX_OFFLINE_BYTES = 800 * 1024 * 1024;
const PLAYABLE_TYPES = ['video/', 'audio/'];

export function isOfflineCacheSupported(): boolean {
  return typeof caches !== 'undefined';
}

export async function saveForOffline(url: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, { mode: 'cors', credentials: 'omit' });
  } catch {
    throw new Error('This video could not be downloaded. The host may not allow saving it offline.');
  }
  if (!res.ok) throw new Error('This video could not be downloaded.');

  const type = res.headers.get('content-type') ?? '';
  if (!PLAYABLE_TYPES.some((prefix) => type.startsWith(prefix))) {
    throw new Error('Only single video or audio files (such as MP4) can be saved offline.');
  }
  const size = Number(res.headers.get('content-length') ?? 0);
  if (size > MAX_OFFLINE_BYTES) {
    throw new Error('This file is too large to save offline.');
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.put(url, res);
}

export async function listOffline(): Promise<string[]> {
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  return requests.map((r) => r.url);
}

export async function getOfflineObjectUrl(url: string): Promise<string | null> {
  const cache = await caches.open(CACHE_NAME);
  const res = await cache.match(url);
  if (!res) return null;
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function removeOffline(url: string): Promise<void> {
  const cache = await caches.open(CACHE_NAME);
  await cache.delete(url);
}
