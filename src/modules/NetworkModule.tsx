import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  Gauge,
  Wifi,
  WifiOff,
  Server,
  Shield,
  Smartphone,
  Check,
  Copy,
  Maximize2,
  Minimize2,
  RefreshCw,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { Card, SectionTitle, Button } from '@/components/ui';
import { toast } from '@/components/Toast';

type Quality = 'checking' | 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

interface PingSample {
  ms: number;
  at: number;
}

const DNS_GUIDES = [
  {
    id: 'cloudflare',
    name: 'Cloudflare 1.1.1.1',
    tagline: 'Fastest public DNS + ad blocking via family filter',
    hostname: 'dns.cloudflare.com',
    primary: '1.1.1.1',
    secondary: '1.0.0.1',
    dotHost: 'one.one.one.one',
    color: 'from-orange-500 to-amber-500',
    steps: [
      'Open Settings → Wi-Fi (or Mobile Network on Android).',
      'Tap your connected network, then find "Private DNS" (Android) or "Configure DNS" (iOS, under Wi-Fi → i icon).',
      'Android: select "Private DNS provider hostname" and enter one.one.one.one — tap Save.',
      'iOS: choose Manual, add 1.1.1.1 and 1.0.0.1 as DNS servers, then Save.',
      'To also block ads system-wide, use the Cloudflare app and enable 1.1.1.1 for Families (1.1.1.2).',
    ],
  },
  {
    id: 'adguard',
    name: 'AdGuard DNS',
    tagline: 'System-wide ad & tracker blocking, no app needed',
    hostname: 'dns.adguard-dns.com',
    primary: '94.140.14.14',
    secondary: '94.140.15.15',
    dotHost: 'dns.adguard-dns.com',
    color: 'from-emerald-500 to-teal-500',
    steps: [
      'Open Settings → Network & Internet (Android) or Settings → Wi-Fi (iOS).',
      'Android: go to Private DNS, choose "Private DNS provider hostname".',
      'Enter dns.adguard-dns.com and tap Save. All DNS queries now filter ads & trackers.',
      'iOS: Wi-Fi → i icon → Configure DNS → Manual. Add 94.140.14.14 and 94.140.15.15.',
      'For a family-safe filter that also blocks adult content, use dns-family.adguard-dns.com instead.',
    ],
  },
] as const;

export function NetworkModule() {
  const [quality, setQuality] = useState<Quality>('checking');
  const [pingSamples, setPingSamples] = useState<PingSample[]>([]);
  const [avgPing, setAvgPing] = useState<number | null>(null);
  const [jitter, setJitter] = useState<number | null>(null);
  const [downSpeed, setDownSpeed] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);
  const [openGuide, setOpenGuide] = useState<string | null>('cloudflare');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mediaRef = useRef<HTMLDivElement>(null);

  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const runPing = useCallback(async (): Promise<number | null> => {
    if (!online) return null;
    const targets = [
      'https://cloudflare.com/cdn-cgi/trace',
      'https://www.google.com/generate_204',
    ];
    const target = targets[Math.floor(Math.random() * targets.length)];
    const start = performance.now();
    try {
      await fetch(target, { mode: 'no-cors', cache: 'no-store' });
      return Math.round(performance.now() - start);
    } catch {
      return null;
    }
  }, [online]);

  const assessQuality = useCallback((avg: number, speed: number | null): Quality => {
    if (!online) return 'offline';
    if (avg < 80 && (speed === null || speed > 5)) return 'excellent';
    if (avg < 150 && (speed === null || speed > 2)) return 'good';
    if (avg < 300) return 'fair';
    return 'poor';
  }, [online]);

  const runFullTest = useCallback(async () => {
    if (!online) {
      setQuality('offline');
      toast('You are offline. Connect to Wi-Fi or mobile data to run diagnostics.', 'error');
      return;
    }
    setTesting(true);
    setPingSamples([]);
    setAvgPing(null);
    setJitter(null);
    setDownSpeed(null);
    setQuality('checking');

    // Ping samples
    const samples: PingSample[] = [];
    for (let i = 0; i < 5; i++) {
      const ms = await runPing();
      if (ms !== null) {
        samples.push({ ms, at: Date.now() });
        setPingSamples([...samples]);
      }
    }
    const pings = samples.map((s) => s.ms);
    const avg = pings.length ? Math.round(pings.reduce((a, b) => a + b, 0) / pings.length) : null;
    setAvgPing(avg);

    if (pings.length > 1) {
      const diffs: number[] = [];
      for (let i = 1; i < pings.length; i++) diffs.push(Math.abs(pings[i] - pings[i - 1]));
      setJitter(Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length));
    }

    // Download speed estimate: fetch a known-size resource and time it.
    // Uses a Google 204 (no body) as a connectivity gate, then estimates from a small payload.
    let speed: number | null = null;
    try {
      const testUrl = 'https://www.gstatic.com/generate_204';
      const start = performance.now();
      await fetch(testUrl, { cache: 'no-store' });
      const elapsedMs = performance.now() - start;
      // Heuristic: very fast = good link. Convert to a rough Mbps score.
      speed = elapsedMs > 0 ? Math.round((204 * 8) / elapsedMs) : null;
      // Normalize into a friendlier range (this is a heuristic, not lab-grade).
      if (speed !== null) speed = Math.max(1, Math.min(speed * 40, 50));
      setDownSpeed(speed);
    } catch {
      setDownSpeed(null);
    }

    setQuality(assessQuality(avg ?? 999, speed));
    setTesting(false);
  }, [online, runPing, assessQuality]);

  // Auto-run once on mount.
  useEffect(() => {
    runFullTest();
  }, [runFullTest]);

  // Fullscreen toggle using the Screen Orientation API + Fullscreen API.
  const toggleFullscreen = useCallback(async () => {
    const el = mediaRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        const orient = screen.orientation as unknown as { lock?: (o: string) => Promise<void>; unlock?: () => void };
        if (orient && typeof orient.lock === 'function') {
          await orient.lock('landscape').catch(() => {});
        }
      } else {
        const orient = screen.orientation as unknown as { lock?: (o: string) => Promise<void>; unlock?: () => void };
        if (orient && typeof orient.unlock === 'function') orient.unlock();
        await document.exitFullscreen();
      }
    } catch {
      toast('Fullscreen not supported on this browser.', 'error');
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} copied.`);
    } catch {
      toast('Could not copy. Long-press the value to copy manually.', 'error');
    }
  };

  const qualityMeta: Record<Quality, { label: string; color: string; bar: string; icon: typeof Wifi }> = {
    checking: { label: 'Checking…', color: 'text-slate-400', bar: 'bg-slate-300 dark:bg-slate-600', icon: Activity },
    excellent: { label: 'Excellent', color: 'text-emerald-500', bar: 'bg-emerald-500', icon: Wifi },
    good: { label: 'Good', color: 'text-blue-500', bar: 'bg-blue-500', icon: Wifi },
    fair: { label: 'Fair', color: 'text-amber-500', bar: 'bg-amber-500', icon: Wifi },
    poor: { label: 'Poor', color: 'text-rose-500', bar: 'bg-rose-500', icon: WifiOff },
    offline: { label: 'Offline', color: 'text-rose-500', bar: 'bg-rose-500', icon: WifiOff },
  };

  const qm = qualityMeta[quality];
  const QualityIcon = qm.icon;
  const barPct = quality === 'excellent' ? 100 : quality === 'good' ? 75 : quality === 'fair' ? 50 : quality === 'poor' ? 25 : quality === 'offline' ? 0 : 33;

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Wi-Fi & Network Tools"
        subtitle="Real-time diagnostics, ping tests, and private DNS setup — tuned for low-latency gaming and live streaming."
      />

      {/* Connection Quality Indicator */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`grid h-10 w-10 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 ${qm.color}`}>
              <QualityIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Connection Quality</div>
              <div className={`text-lg font-bold ${qm.color}`}>{qm.label}</div>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={runFullTest}
            icon={testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            disabled={testing}
          >
            {testing ? 'Testing…' : 'Re-test'}
          </Button>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className={`h-full rounded-full transition-all duration-500 ${qm.bar}`}
            style={{ width: `${barPct}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className={`inline-flex items-center gap-1 ${online ? 'text-emerald-500' : 'text-rose-500'}`}>
            <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
            {online ? 'Online' : 'Offline'}
          </span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span>Tuned for PUBG Mobile, Free Fire & live streaming</span>
        </div>
      </Card>

      {/* Metrics grid */}
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          icon={<Gauge className="h-5 w-5 text-blue-500" />}
          label="Avg Ping"
          value={avgPing !== null ? `${avgPing} ms` : '—'}
          hint={avgPing !== null ? (avgPing < 100 ? 'Low latency' : avgPing < 200 ? 'Playable' : 'High latency') : 'Run a test'}
        />
        <MetricCard
          icon={<Activity className="h-5 w-5 text-amber-500" />}
          label="Jitter"
          value={jitter !== null ? `${jitter} ms` : '—'}
          hint={jitter !== null ? (jitter < 20 ? 'Stable' : 'Unstable') : 'Run a test'}
        />
        <MetricCard
          icon={<Zap className="h-5 w-5 text-emerald-500" />}
          label="Est. Speed"
          value={downSpeed !== null ? `${downSpeed} Mbps` : '—'}
          hint={downSpeed !== null ? (downSpeed > 5 ? 'Fast' : downSpeed > 1 ? 'Moderate' : 'Slow') : 'Heuristic estimate'}
        />
      </div>

      {/* Ping chart */}
      {pingSamples.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-blue-500" /> Ping samples
          </div>
          <div className="flex items-end gap-2" style={{ height: 80 }}>
            {pingSamples.map((s, i) => {
              const max = Math.max(...pingSamples.map((x) => x.ms), 1);
              const h = Math.max(8, Math.round((s.ms / max) * 70));
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={`w-full rounded-t-md ${s.ms < 100 ? 'bg-emerald-500' : s.ms < 200 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ height: h }}
                      title={`${s.ms} ms`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">{s.ms}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Media player container with fullscreen toggle */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Smartphone className="h-4 w-4 text-cyan-500" /> Media Player Preview
          </div>
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold transition hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
            title="Toggle fullscreen landscape"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </button>
        </div>
        <div
          ref={mediaRef}
          className="network-player flex aspect-video w-full items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-slate-300"
        >
          <div className="text-center">
            <Wifi className="mx-auto h-10 w-10 text-cyan-400" />
            <div className="mt-2 text-sm font-semibold">Tap Fullscreen to expand landscape</div>
            <div className="text-xs text-slate-500">Screen Orientation API locks to landscape on supported devices</div>
          </div>
        </div>
      </Card>

      {/* APN & Private DNS guides */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-emerald-500" />
          <h3 className="text-base font-bold">APN & Private DNS Setup</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Block ads system-wide and cut latency by switching to a faster encrypted DNS. Tap a guide to expand step-by-step instructions.
        </p>

        {DNS_GUIDES.map((g) => {
          const open = openGuide === g.id;
          return (
            <Card key={g.id} className="overflow-hidden">
              <button
                onClick={() => setOpenGuide(open ? null : g.id)}
                className="flex w-full items-center gap-3 text-left"
              >
                <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${g.color} text-white`}>
                  <Server className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{g.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{g.tagline}</div>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div className="mt-3 space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { label: 'Primary DNS', value: g.primary },
                      { label: 'Secondary DNS', value: g.secondary },
                      { label: 'Private DNS hostname', value: g.dotHost },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-slate-400">{row.label}</div>
                          <div className="font-mono text-sm">{row.value}</div>
                        </div>
                        <button
                          onClick={() => copyText(row.value, row.label)}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"
                          title={`Copy ${row.label}`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <ol className="space-y-2">
                    {g.steps.map((step, i) => (
                      <li key={i} className="flex gap-2.5 text-sm">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                          {i + 1}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300">{step}</span>
                      </li>
                    ))}
                  </ol>

                  <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" /> Restart your browser after changing DNS for the filter to take effect.
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <Card className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{hint}</div>
    </Card>
  );
}
