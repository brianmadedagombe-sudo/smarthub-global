import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Music2, Signal } from 'lucide-react';

export interface PlayerSettings {
  dataSaver: boolean;
  audioOnly: boolean;
}

interface MediaPlayerProps extends PlayerSettings {
  src: string;
  onError: (message: string) => void;
}

const DATA_SAVER_MAX_HEIGHT = 480;

function pickCapIndex(levels: Hls['levels'], settings: PlayerSettings): number {
  if (levels.length === 0) return -1;
  const lowest = levels.reduce((best, l, i) => (l.bitrate < levels[best].bitrate ? i : best), 0);
  if (settings.audioOnly) return lowest;
  if (!settings.dataSaver) return -1;
  let best = -1;
  levels.forEach((l, i) => {
    if (l.height <= DATA_SAVER_MAX_HEIGHT && (best === -1 || l.bitrate > levels[best].bitrate)) best = i;
  });
  return best === -1 ? lowest : best;
}

export function MediaPlayer({ src, dataSaver, audioOnly, onError }: MediaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const settingsRef = useRef<PlayerSettings>({ dataSaver, audioOnly });
  const onErrorRef = useRef(onError);
  const [qualityLabel, setQualityLabel] = useState('');

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    settingsRef.current = { dataSaver, audioOnly };
    const hls = hlsRef.current;
    if (!hls) return;
    hls.autoLevelCapping = pickCapIndex(hls.levels, settingsRef.current);
  }, [dataSaver, audioOnly]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setQualityLabel('');

    const isHls = /\.m3u8(\?|$)/i.test(src);
    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ capLevelToPlayerSize: false });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        hls.autoLevelCapping = pickCapIndex(hls.levels, settingsRef.current);
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const level = hls.levels[data.level];
        if (level?.height) setQualityLabel(`${level.height}p`);
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          onErrorRef.current('This stream could not be played. Check the link and try again.');
          hls.destroy();
          hlsRef.current = null;
        }
      });
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (isHls && !video.canPlayType('application/vnd.apple.mpegurl')) {
      onErrorRef.current('Your browser cannot play this stream.');
      return;
    }

    video.src = src;
    const handleError = () => onErrorRef.current('This video could not be played. Check the link and try again.');
    video.addEventListener('error', handleError);
    return () => {
      video.removeEventListener('error', handleError);
      video.removeAttribute('src');
      video.load();
    };
  }, [src]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          controls
          playsInline
          preload="metadata"
          className={`aspect-video w-full ${audioOnly ? 'hidden' : 'block'}`}
        />
        {audioOnly && (
          <div className="grid aspect-video place-items-center bg-gradient-to-br from-slate-900 to-rose-950 text-rose-200">
            <div className="flex flex-col items-center gap-2">
              <Music2 className="h-10 w-10" />
              <p className="text-sm font-semibold">Audio-only mode</p>
              <p className="text-xs text-rose-300/80">Video is paused to save data. Audio keeps playing.</p>
            </div>
          </div>
        )}
      </div>
      {qualityLabel && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Signal className="h-3.5 w-3.5" /> Streaming at {qualityLabel}
        </p>
      )}
    </div>
  );
}
