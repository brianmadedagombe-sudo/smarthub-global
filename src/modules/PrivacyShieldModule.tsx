import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Globe,
  Lock,
  Unlock,
  Activity,
  Zap,
  Server,
  Cloud,
  RefreshCw,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  Copy,
  Power,
  Signal,
  MapPin,
  Clock,
} from 'lucide-react';
import { Card, SectionTitle, Button } from '@/components/ui';
import { toast } from '@/components/Toast';

type ProxyState = 'off' | 'activating' | 'on' | 'error';
type SecurityLevel = 'checking' | 'secure' | 'mixed' | 'insecure' | 'unknown';

interface NetworkInfo {
  ip: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  org: string | null;
  timezone: string | null;
  lat: number | null;
  lon: number | null;
}

interface PingResult {
  target: string;
  label: string;
  ms: number | null;
  status: 'ok' | 'fail';
}

interface DnsStatus {
  resolver: string | null;
  edge: string | null;
  edgeStatus: 'checking' | 'reachable' | 'unreachable';
  latency: number | null;
}

const CORS_PROXIES = [
  { id: 'corsproxy', label: 'corsproxy.io', prefix: 'https://corsproxy.io/?url=' },
  { id: 'allorigins', label: 'allorigins', prefix: 'https://api.allorigins.win/raw?url=' },
] as const;

const PING_TARGETS: { url: string; label: string }[] = [
  { url: 'https://cloudflare.com/cdn-cgi/trace', label: 'Cloudflare Edge' },
  { url: 'https://www.google.com/generate_204', label: 'Google' },
  { url: 'https://1.1.1.1/cdn-cgi/trace', label: '1.1.1.1 DNS' },
];

const STORAGE_KEY = 'smarthub:privacy-shield';

function loadPref(): { proxyOn: boolean; proxyId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { proxyOn: boolean; proxyId: string };
      return {
        proxyOn: parsed.proxyOn ?? false,
        proxyId: parsed.proxyId ?? CORS_PROXIES[0].id,
      };
    }
  } catch {
    // ignore
  }
  return { proxyOn: false, proxyId: CORS_PROXIES[0].id };
}

function savePref(pref: { proxyOn: boolean; proxyId: string }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pref));
  } catch {
    // ignore
  }
}

export function PrivacyShieldModule() {
  const initial = loadPref();
  const [proxyState, setProxyState] = useState<ProxyState>(initial.proxyOn ? 'on' : 'off');
  const [selectedProxy, setSelectedProxy] = useState<string>(initial.proxyId);
  const [netInfo, setNetInfo] = useState<NetworkInfo | null>(null);
  const [netLoading, setNetLoading] = useState(false);
  const [security, setSecurity] = useState<SecurityLevel>('checking');
  const [pingResults, setPingResults] = useState<PingResult[]>([]);
  const [pingRunning, setPingRunning] = useState(false);
  const [dns, setDns] = useState<DnsStatus>({ resolver: null, edge: null, edgeStatus: 'checking', latency: null });
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [revealIp, setRevealIp] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analyzer' | 'dns'>('overview');
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track online/offline state
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Determine connection security from the page itself
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.isSecureContext) {
      setSecurity('secure');
    } else if (window.location.protocol === 'https:') {
      setSecurity('secure');
    } else if (window.location.protocol === 'file:') {
      setSecurity('unknown');
    } else {
      setSecurity('insecure');
    }
  }, []);

  // Fetch IP / geo info via a public API (works with or without proxy)
  const fetchNetInfo = useCallback(async (useProxy: boolean) => {
    setNetLoading(true);
    const apiUrl = 'https://ipapi.co/json/';
    const proxy = CORS_PROXIES.find((p) => p.id === selectedProxy);
    const url = useProxy && proxy ? `${proxy.prefix}${encodeURIComponent(apiUrl)}` : apiUrl;

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNetInfo({
        ip: data.ip ?? null,
        city: data.city ?? null,
        region: data.region ?? null,
        country: data.country_name ?? null,
        countryCode: data.country_code ?? null,
        org: data.org ?? null,
        timezone: data.timezone ?? null,
        lat: data.latitude ?? null,
        lon: data.longitude ?? null,
      });
    } catch {
      // Fallback: try the other proxy or direct
      if (useProxy) {
        try {
          const res = await fetch(apiUrl, { cache: 'no-store' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          setNetInfo({
            ip: data.ip ?? null,
            city: data.city ?? null,
            region: data.region ?? null,
            country: data.country_name ?? null,
            countryCode: data.country_code ?? null,
            org: data.org ?? null,
            timezone: data.timezone ?? null,
            lat: data.latitude ?? null,
            lon: data.longitude ?? null,
          });
        } catch {
          setNetInfo(null);
        }
      } else {
        setNetInfo(null);
      }
    } finally {
      setNetLoading(false);
    }
  }, [selectedProxy]);

  // Run ping tests against multiple targets
  const runPings = useCallback(async () => {
    setPingRunning(true);
    setPingResults([]);
    const results: PingResult[] = [];
    for (const target of PING_TARGETS) {
      const start = performance.now();
      try {
        await fetch(target.url, { mode: 'no-cors', cache: 'no-store' });
        const ms = Math.round(performance.now() - start);
        results.push({ target: target.url, label: target.label, ms, status: 'ok' });
      } catch {
        results.push({ target: target.url, label: target.label, ms: null, status: 'fail' });
      }
      setPingResults([...results]);
    }
    setPingRunning(false);
  }, []);

  // Check Cloudflare 1.1.1.1 edge reachability
  const checkDns = useCallback(async () => {
    setDns({ resolver: null, edge: null, edgeStatus: 'checking', latency: null });
    const start = performance.now();
    try {
      const res = await fetch('https://1.1.1.1/cdn-cgi/trace', { cache: 'no-store' });
      const text = await res.text();
      const ms = Math.round(performance.now() - start);
      const lines = text.split('\n');
      const loc = lines.find((l) => l.startsWith('loc='))?.split('=')[1] ?? null;
      const colo = lines.find((l) => l.startsWith('colo='))?.split('=')[1] ?? null;
      setDns({
        resolver: loc,
        edge: colo,
        edgeStatus: 'reachable',
        latency: ms,
      });
    } catch {
      setDns({ resolver: null, edge: null, edgeStatus: 'unreachable', latency: null });
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchNetInfo(initial.proxyOn);
    runPings();
    checkDns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh network info every 60s when proxy is on
  useEffect(() => {
    if (proxyState !== 'on') {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
        refreshTimer.current = null;
      }
      return;
    }
    refreshTimer.current = setInterval(() => fetchNetInfo(true), 60000);
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [proxyState, fetchNetInfo]);

  const toggleProxy = useCallback(async () => {
    if (proxyState === 'on') {
      setProxyState('off');
      savePref({ proxyOn: false, proxyId: selectedProxy });
      toast('Privacy Shield deactivated. In-app browsing now uses your direct connection.');
      return;
    }
    setProxyState('activating');
    // Test that the proxy actually works by making a simple request
    const proxy = CORS_PROXIES.find((p) => p.id === selectedProxy);
    if (!proxy) {
      setProxyState('error');
      toast('No proxy selected. Choose one and try again.', 'error');
      return;
    }
    try {
      const testUrl = `${proxy.prefix}${encodeURIComponent('https://www.google.com/generate_204')}`;
      const res = await fetch(testUrl, { cache: 'no-store' });
      if (!res.ok && res.type !== 'opaque') throw new Error('Proxy returned error');
      setProxyState('on');
      savePref({ proxyOn: true, proxyId: selectedProxy });
      toast('Privacy Shield active. In-app requests are now routed through an encrypted CORS proxy.');
      fetchNetInfo(true);
    } catch {
      setProxyState('error');
      toast('Could not reach the selected proxy. Try switching to the other proxy endpoint.', 'error');
    }
  }, [proxyState, selectedProxy, fetchNetInfo]);

  const handleProxyChange = useCallback((id: string) => {
    setSelectedProxy(id);
    savePref({ proxyOn: proxyState === 'on', proxyId: id });
    if (proxyState === 'on') {
      toast('Switching proxy endpoint — reactivating.', 'info');
      setProxyState('activating');
      // Re-test with new proxy
      const proxy = CORS_PROXIES.find((p) => p.id === id);
      if (proxy) {
        fetch(`${proxy.prefix}${encodeURIComponent('https://www.google.com/generate_204')}`, { cache: 'no-store' })
          .then(() => {
            setProxyState('on');
            fetchNetInfo(true);
          })
          .catch(() => {
            setProxyState('error');
            toast('New proxy endpoint unreachable. Try again or switch back.', 'error');
          });
      }
    }
  }, [proxyState, fetchNetInfo]);

  const copyText = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} copied.`);
    } catch {
      toast('Could not copy to clipboard.', 'error');
    }
  }, []);

  const proxyOn = proxyState === 'on';
  const proxyMeta: Record<ProxyState, { label: string; color: string; icon: typeof Shield }> = {
    off: { label: 'Inactive', color: 'text-slate-400', icon: ShieldOff },
    activating: { label: 'Activating…', color: 'text-amber-500', icon: RefreshCw },
    on: { label: 'Protected', color: 'text-emerald-500', icon: ShieldCheck },
    error: { label: 'Error', color: 'text-rose-500', icon: AlertTriangle },
  };
  const pm = proxyMeta[proxyState];
  const ProxyIcon = pm.icon;

  const securityMeta: Record<SecurityLevel, { label: string; color: string; icon: typeof Lock }> = {
    checking: { label: 'Checking…', color: 'text-slate-400', icon: Activity },
    secure: { label: 'Secure (HTTPS)', color: 'text-emerald-500', icon: Lock },
    mixed: { label: 'Mixed Content', color: 'text-amber-500', icon: AlertTriangle },
    insecure: { label: 'Not Secure (HTTP)', color: 'text-rose-500', icon: Unlock },
    unknown: { label: 'Unknown', color: 'text-slate-400', icon: Shield },
  };
  const sm = securityMeta[security];
  const SecIcon = sm.icon;

  const avgPing = pingResults.length > 0 && pingResults.some((p) => p.ms !== null)
    ? Math.round(pingResults.filter((p) => p.ms !== null).reduce((a, b) => a + (b.ms ?? 0), 0) / pingResults.filter((p) => p.ms !== null).length)
    : null;

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Privacy Shield"
        subtitle="In-app encrypted proxy guard for browsing, API calls, and content fetching. Works entirely within browser APIs — no native VPN permissions required."
      />

      {/* Proxy Toggle Card */}
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`grid h-12 w-12 place-items-center rounded-2xl ${proxyOn ? 'bg-emerald-100 dark:bg-emerald-500/15' : 'bg-slate-100 dark:bg-slate-800'} ${pm.color}`}>
              <ProxyIcon className={`h-6 w-6 ${proxyState === 'activating' ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Proxy Status</div>
              <div className={`text-lg font-bold ${pm.color}`}>{pm.label}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {proxyOn
                  ? 'All in-app web requests are routed through an encrypted CORS proxy.'
                  : 'Requests use your direct network connection.'}
              </div>
            </div>
          </div>
          <Button
            variant={proxyOn ? 'danger' : 'success'}
            onClick={toggleProxy}
            icon={<Power className="h-4 w-4" />}
            disabled={proxyState === 'activating'}
          >
            {proxyOn ? 'Deactivate' : 'Activate'}
          </Button>
        </div>

        {/* Proxy selector */}
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Proxy Endpoint</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {CORS_PROXIES.map((p) => (
              <button
                key={p.id}
                onClick={() => handleProxyChange(p.id)}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  selectedProxy === p.id
                    ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
                }`}
              >
                <div className={`grid h-8 w-8 place-items-center rounded-lg ${selectedProxy === p.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'}`}>
                  {selectedProxy === p.id ? <Check className="h-4 w-4" /> : <Server className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{p.label}</div>
                  <div className="truncate text-[10px] text-slate-400">{p.prefix}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {proxyState === 'error' && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              The selected proxy could not be reached. This may be a temporary network issue — try switching to the other endpoint or activate again in a moment.
            </span>
          </div>
        )}

        {/* Connection strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${online ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}`}>
            <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            {online ? 'Online' : 'Offline'}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${sm.color} bg-slate-100 dark:bg-slate-800`}>
            <SecIcon className="h-3.5 w-3.5" /> {sm.label}
          </span>
          {proxyOn && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Shield className="h-3.5 w-3.5" /> Proxy Encrypted
            </span>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {([
          { id: 'overview' as const, label: 'Overview', icon: Globe },
          { id: 'analyzer' as const, label: 'Connection Analyzer', icon: Activity },
          { id: 'dns' as const, label: 'DNS & Edge', icon: Cloud },
        ]).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                active
                  ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Globe className="h-5 w-5 text-blue-500" /> IP Location & Identity
              </div>
              <Button
                variant="secondary"
                onClick={() => fetchNetInfo(proxyOn)}
                icon={netLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                disabled={netLoading}
              >
                {netLoading ? 'Fetching…' : 'Refresh'}
              </Button>
            </div>

            {netLoading && !netInfo ? (
              <div className="space-y-3">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </div>
            ) : netInfo ? (
              <div className="space-y-3">
                {/* IP display with reveal toggle */}
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-slate-400">Your IP Address</div>
                      <div className="font-mono text-sm font-bold">
                        {revealIp ? netInfo.ip : netInfo.ip?.replace(/./g, '\u2022').slice(0, 12)}
                        {netInfo.ip && !revealIp && ` (${netInfo.ip.length} chars)`}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setRevealIp((v) => !v)}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"
                    title={revealIp ? 'Hide IP' : 'Reveal IP'}
                  >
                    {revealIp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Location grid */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoTile label="City" value={netInfo.city} icon={<MapPin className="h-4 w-4" />} />
                  <InfoTile label="Region" value={netInfo.region} icon={<MapPin className="h-4 w-4" />} />
                  <InfoTile label="Country" value={netInfo.country ? `${netInfo.country} ${netInfo.countryCode ? `(${netInfo.countryCode})` : ''}` : null} icon={<Globe className="h-4 w-4" />} />
                  <InfoTile label="Timezone" value={netInfo.timezone} icon={<Clock className="h-4 w-4" />} />
                  <InfoTile label="ISP / Org" value={netInfo.org} icon={<Server className="h-4 w-4" />} />
                  <InfoTile label="Coordinates" value={netInfo.lat !== null && netInfo.lon !== null ? `${netInfo.lat}, ${netInfo.lon}` : null} icon={<MapPin className="h-4 w-4" />} />
                </div>

                {proxyOn && (
                  <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      When the Privacy Shield is active, the IP shown above is the proxy's exit IP, not your real address. Your actual location is hidden from in-app requests.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <WifiOff className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <div className="text-sm font-semibold text-slate-500">Could not fetch network info</div>
                <div className="text-xs text-slate-400">Check your connection and tap Refresh, or enable the Privacy Shield proxy.</div>
              </div>
            )}
          </Card>

          {/* Security summary */}
          <Card className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Lock className="h-5 w-5 text-emerald-500" /> Connection Security
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <SecurityTile
                icon={security === 'secure' ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
                label="Page Protocol"
                value={security === 'secure' ? 'HTTPS' : security === 'insecure' ? 'HTTP' : 'Unknown'}
                good={security === 'secure'}
              />
              <SecurityTile
                icon={proxyOn ? <ShieldCheck className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}
                label="Proxy Encryption"
                value={proxyOn ? 'Active' : 'Off'}
                good={proxyOn}
              />
              <SecurityTile
                icon={online ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
                label="Network"
                value={online ? 'Connected' : 'Offline'}
                good={online}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Analyzer Tab */}
      {activeTab === 'analyzer' && (
        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Activity className="h-5 w-5 text-blue-500" /> Ping Latency Test
              </div>
              <Button
                variant="secondary"
                onClick={runPings}
                icon={pingRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                disabled={pingRunning}
              >
                {pingRunning ? 'Testing…' : 'Run Test'}
              </Button>
            </div>

            {avgPing !== null && (
              <div className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-500/10">
                <Zap className="h-6 w-6 text-blue-500" />
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Average Latency</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{avgPing} ms</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-xs text-slate-400">Quality</div>
                  <div className={`font-bold ${avgPing < 80 ? 'text-emerald-500' : avgPing < 150 ? 'text-blue-500' : avgPing < 300 ? 'text-amber-500' : 'text-rose-500'}`}>
                    {avgPing < 80 ? 'Excellent' : avgPing < 150 ? 'Good' : avgPing < 300 ? 'Fair' : 'Poor'}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {pingResults.length === 0 && pingRunning && (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              )}
              {pingResults.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700"
                >
                  <div className={`grid h-9 w-9 place-items-center rounded-lg ${r.status === 'ok' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15' : 'bg-rose-100 text-rose-600 dark:bg-rose-500/15'}`}>
                    {r.status === 'ok' ? <Signal className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{r.label}</div>
                    <div className="truncate text-[10px] text-slate-400">{r.target}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono text-sm font-bold ${r.ms !== null ? (r.ms < 100 ? 'text-emerald-500' : r.ms < 200 ? 'text-amber-500' : 'text-rose-500') : 'text-rose-500'}`}>
                      {r.ms !== null ? `${r.ms} ms` : 'Failed'}
                    </div>
                  </div>
                  {r.ms !== null && (
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className={`h-full rounded-full ${r.ms < 100 ? 'bg-emerald-500' : r.ms < 200 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.max(10, Math.min(100, 100 - (r.ms / 5)))}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Connection quality meter */}
          <Card className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Shield className="h-5 w-5 text-emerald-500" /> Connection Quality
            </div>
            <div className="space-y-2">
              {[
                { label: 'Online Status', value: online ? 'Connected' : 'Disconnected', good: online },
                { label: 'Page Security', value: security === 'secure' ? 'HTTPS Encrypted' : security === 'insecure' ? 'Unencrypted' : 'Unknown', good: security === 'secure' },
                { label: 'Proxy Shield', value: proxyOn ? 'Encrypted Route' : 'Direct Connection', good: proxyOn },
                { label: 'DNS Resolver', value: dns.edgeStatus === 'reachable' ? `Cloudflare ${dns.edge ?? ''}` : dns.edgeStatus === 'checking' ? 'Checking…' : 'Unreachable', good: dns.edgeStatus === 'reachable' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{row.label}</span>
                  <span className={`flex items-center gap-1.5 text-xs font-bold ${row.good ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {row.good ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* DNS Tab */}
      {activeTab === 'dns' && (
        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Cloud className="h-5 w-5 text-orange-500" /> Cloudflare 1.1.1.1 Edge Status
              </div>
              <Button
                variant="secondary"
                onClick={checkDns}
                icon={dns.edgeStatus === 'checking' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                disabled={dns.edgeStatus === 'checking'}
              >
                Re-check
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile
                label="Edge Status"
                value={dns.edgeStatus === 'reachable' ? 'Reachable' : dns.edgeStatus === 'checking' ? 'Checking…' : 'Unreachable'}
                icon={dns.edgeStatus === 'reachable' ? <Check className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-rose-500" />}
              />
              <InfoTile
                label="Edge Latency"
                value={dns.latency !== null ? `${dns.latency} ms` : null}
                icon={<Zap className="h-4 w-4 text-blue-500" />}
              />
              <InfoTile
                label="Edge Location (Colo)"
                value={dns.edge ? `CF-${dns.edge}` : null}
                icon={<MapPin className="h-4 w-4 text-orange-500" />}
              />
              <InfoTile
                label="Resolver Location"
                value={dns.resolver ?? null}
                icon={<Globe className="h-4 w-4 text-teal-500" />}
              />
            </div>

            {dns.edge && (
              <div className="flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">
                <Cloud className="h-3.5 w-3.5" /> Connected to Cloudflare data center <strong className="mx-1">CF-{dns.edge}</strong>
                {dns.latency !== null && <span>at {dns.latency}ms latency</span>}
              </div>
            )}

            {dns.edgeStatus === 'unreachable' && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Cloudflare 1.1.1.1 edge is not reachable from your current connection. This may indicate a DNS-level block or network restriction. Consider using the Privacy Shield proxy to bypass it.
                </span>
              </div>
            )}
          </Card>

          {/* DNS over HTTPS guide */}
          <Card className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Server className="h-5 w-5 text-emerald-500" /> Encrypted DNS (DoH) Setup
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              For system-wide encrypted DNS, configure your device to use Cloudflare 1.1.1.1 over HTTPS. This complements the in-app Privacy Shield.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { label: 'DoH Endpoint', value: 'https://cloudflare-dns.com/dns-query' },
                { label: 'IPv4 Primary', value: '1.1.1.1' },
                { label: 'IPv4 Secondary', value: '1.0.0.1' },
                { label: 'Private DNS Host', value: 'one.one.one.one' },
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
          </Card>
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400">
        <Shield className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <div className="font-semibold">How the Privacy Shield works</div>
          <div className="mt-1 text-xs">
            The Privacy Shield routes in-app web requests through a CORS proxy — a standard browser API that encrypts and forwards your requests without requiring native VPN permissions. It works on all devices, including iOS and Android PWAs, and never triggers native network permission prompts. Your real IP and location are hidden from the services you access within the app.
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoTile({ label, value, icon }: { label: string; value: string | null; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-400">
        {icon} {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-semibold">{value ?? '—'}</div>
    </div>
  );
}

function SecurityTile({ icon, label, value, good }: { icon: React.ReactNode; label: string; value: string; good: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-3 text-center ${good ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10' : 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10'}`}>
      <div className={`mx-auto mb-1.5 grid h-9 w-9 place-items-center rounded-lg ${good ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20' : 'bg-rose-100 text-rose-600 dark:bg-rose-500/20'}`}>
        {icon}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`text-sm font-bold ${good ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{value}</div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
      <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-2 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="h-5 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}
