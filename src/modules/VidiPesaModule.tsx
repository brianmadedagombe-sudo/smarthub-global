import { useState } from 'react';
import { Video, Twitter, Linkedin, Youtube, ShoppingBag, BarChart3, UploadCloud, Sparkles, Receipt, MonitorPlay, MessageCircle, Mail, Zap, Check } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import { sanitize } from '@/lib/security';
import { Card, SectionTitle, inputClass, Button } from '@/components/ui';
import { AiButton } from '@/components/AiButton';
import { CopyButton } from '@/components/CopyButton';
import { Storefront } from '@/components/Storefront';
import { CreatorAnalytics } from '@/components/CreatorAnalytics';
import { CmsUploader } from '@/components/CmsUploader';
import { TransactionHistory } from '@/components/TransactionHistory';
import { MediaHub } from '@/components/MediaHub';
import { generate } from '@/lib/ai';
import { toast } from '@/components/Toast';

type Tab = 'store' | 'repurposer' | 'analytics' | 'cms' | 'transactions' | 'media';

type Target = 'tiktok' | 'shorts' | 'thread' | 'linkedin' | 'whatsapp' | 'email';

type QuickTarget = 'tiktok' | 'whatsapp' | 'email';

const TARGETS: { id: Target; label: string; icon: typeof Video; system: string; accent: string }[] = [
  {
    id: 'tiktok',
    label: 'TikTok script',
    icon: Video,
    accent: 'text-rose-500',
    system:
      "You are a viral TikTok scriptwriter. Turn the user's notes into a punchy 30-second TikTok script with hook, setup, value beats, and CTA. Use timestamps and on-screen caption cues. Return only the script.",
  },
  {
    id: 'shorts',
    label: 'Shorts ideas',
    icon: Youtube,
    accent: 'text-rose-600',
    system:
      "You are a YouTube Shorts strategist. Generate 5 high-retention Short ideas from the user's notes, each with a working title, format, and target length. Return only the list.",
  },
  {
    id: 'thread',
    label: 'X thread',
    icon: Twitter,
    accent: 'text-sky-500',
    system:
      "You are a ghostwriter for X. Turn the user's notes into a 6-post thread with a strong hook and a repost-worthy closing line. Number each post. Return only the thread.",
  },
  {
    id: 'linkedin',
    label: 'LinkedIn post',
    icon: Linkedin,
    accent: 'text-blue-600',
    system:
      "You are a LinkedIn ghostwriter. Turn the user's notes into a polished, scannable post with a hook, 3 takeaways, and a soft CTA. Add 2-3 relevant hashtags. Return only the post.",
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp Status',
    icon: MessageCircle,
    accent: 'text-emerald-500',
    system:
      "You are a WhatsApp Status copywriter. Turn the user's notes into 3 punchy, emoji-rich WhatsApp Status captions under 200 characters each. Make them scroll-stopping and shareable. Return only the 3 captions, separated by '---'.",
  },
  {
    id: 'email',
    label: 'Email Pitch',
    icon: Mail,
    accent: 'text-indigo-500',
    system:
      "You are a cold email copywriter. Turn the user's notes into a concise, persuasive email pitch with a compelling subject line, a 3-sentence body, and a clear CTA. Return only the email with subject line first.",
  },
];

const QUICK_TARGETS: { id: QuickTarget; label: string }[] = [
  { id: 'tiktok', label: 'TikTok Script' },
  { id: 'whatsapp', label: 'WhatsApp Status' },
  { id: 'email', label: 'Email Pitch' },
];

export function VidiPesaModule({ api }: { api: AppApi }) {
  const [tab, setTab] = useState<Tab>('store');

  return (
    <div className="space-y-5">
      <SectionTitle
        title="VidiPesa Storefront & Creator Engine"
        subtitle="Sell digital products, repurpose content with AI, track earnings, and manage your catalog — all in one place."
      />

      {/* Tab navigation */}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 sm:grid-cols-6">
        <TabButton active={tab === 'store'} onClick={() => setTab('store')} icon={<ShoppingBag className="h-4 w-4" />}>Storefront</TabButton>
        <TabButton active={tab === 'repurposer'} onClick={() => setTab('repurposer')} icon={<Sparkles className="h-4 w-4" />}>AI Repurposer</TabButton>
        <TabButton active={tab === 'analytics'} onClick={() => setTab('analytics')} icon={<BarChart3 className="h-4 w-4" />}>Analytics</TabButton>
        <TabButton active={tab === 'transactions'} onClick={() => setTab('transactions')} icon={<Receipt className="h-4 w-4" />}>Transactions</TabButton>
        <TabButton active={tab === 'cms'} onClick={() => setTab('cms')} icon={<UploadCloud className="h-4 w-4" />}>CMS</TabButton>
        <TabButton active={tab === 'media'} onClick={() => setTab('media')} icon={<MonitorPlay className="h-4 w-4" />}>Media Hub</TabButton>
      </div>

      {tab === 'store' && <Storefront api={api} />}
      {tab === 'repurposer' && <Repurposer api={api} />}
      {tab === 'analytics' && <CreatorAnalytics api={api} />}
      {tab === 'transactions' && <TransactionHistory api={api} />}
      {tab === 'cms' && <CmsUploader api={api} />}
      {tab === 'media' && <MediaHub />}
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
        active
          ? 'bg-white text-rose-600 shadow dark:bg-slate-900 dark:text-rose-400'
          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </button>
  );
}

function Repurposer({ api }: { api: AppApi }) {
  const [notes, setNotes] = useState('');
  const [results, setResults] = useState<Record<Target, string>>({
    tiktok: '',
    shorts: '',
    thread: '',
    linkedin: '',
    whatsapp: '',
    email: '',
  });
  const [multiGen, setMultiGen] = useState(false);
  const [activeQuickTab, setActiveQuickTab] = useState<QuickTarget>('tiktok');

  const oneClickRepurpose = async () => {
    if (!notes.trim()) {
      toast('Paste your notes or transcript first.', 'error');
      return;
    }
    const gate = api.aiUsage;
    if (!gate.ok) {
      toast('Daily free AI uses are up. Upgrade to Pro for unlimited.', 'info');
      window.dispatchEvent(new CustomEvent('smarthub:open-paywall'));
      return;
    }
    setMultiGen(true);
    const targets: QuickTarget[] = ['tiktok', 'whatsapp', 'email'];
    for (const t of targets) {
      const target = TARGETS.find((x) => x.id === t);
      if (!target) continue;
      try {
        const text = await generate(notes, target.system);
        api.recordAiUse();
        setResults((p) => ({ ...p, [t]: text }));
      } catch {
        // Continue with remaining targets even if one fails
      }
    }
    setMultiGen(false);
    toast('1-Click Repurpose complete! All 3 formats are ready.', 'success');
  };

  return (
    <div className="space-y-4">
      <Card>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Your notes / transcript
        </label>
        <textarea
          className={inputClass}
          rows={6}
          placeholder="Paste a talk, meeting notes, a blog draft, anything…"
          value={notes}
          onChange={(e) => setNotes(sanitize(e.target.value))}
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">{notes.length} chars</span>
          <Button
            onClick={oneClickRepurpose}
            loading={multiGen}
            variant="success"
            icon={<Zap className="h-4 w-4" />}
          >
            1-Click Repurpose
          </Button>
        </div>
      </Card>

      {/* 1-Click results tabs */}
      {(results.tiktok || results.whatsapp || results.email) && (
        <Card className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Zap className="h-4 w-4 text-emerald-500" /> 1-Click Repurpose Results
          </div>
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {QUICK_TARGETS.map((qt) => {
              const target = TARGETS.find((t) => t.id === qt.id);
              if (!target) return null;
              const Icon = target.icon;
              const active = activeQuickTab === qt.id;
              const hasResult = !!results[qt.id];
              return (
                <button
                  key={qt.id}
                  onClick={() => setActiveQuickTab(qt.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? 'bg-white text-emerald-600 shadow dark:bg-slate-900 dark:text-emerald-400'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${target.accent}`} />
                  <span className="hidden sm:inline">{qt.label}</span>
                  {hasResult && <Check className="h-3 w-3 text-emerald-500" />}
                </button>
              );
            })}
          </div>

          {(() => {
            const target = TARGETS.find((t) => t.id === activeQuickTab);
            if (!target) return null;
            const text = results[activeQuickTab];
            const Icon = target.icon;
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold">
                    <Icon className={`h-5 w-5 ${target.accent}`} /> {target.label}
                  </div>
                  {text && <CopyButton text={text} />}
                </div>
                {multiGen && !text ? (
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-400 dark:bg-slate-800/60">
                    <Sparkles className="h-4 w-4 animate-pulse" /> Generating…
                  </div>
                ) : text ? (
                  <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm leading-relaxed dark:bg-slate-800/60">{text}</pre>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
                    Run 1-Click Repurpose to generate all 3 formats at once.
                  </div>
                )}
              </div>
            );
          })()}
        </Card>
      )}

      {/* Individual format cards */}
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">All formats</div>
      <div className="grid gap-4 md:grid-cols-2">
        {TARGETS.map((t) => {
          const Icon = t.icon;
          const text = results[t.id];
          return (
            <Card key={t.id} className="flex flex-col">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  <Icon className={`h-5 w-5 ${t.accent}`} /> {t.label}
                </div>
                {text && <CopyButton text={text} />}
              </div>
              {text ? (
                <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm leading-relaxed dark:bg-slate-800/60">{text}</pre>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
                  <span>Nothing here yet.</span>
                  <AiButton
                    api={api}
                    prompt={notes}
                    system={t.system}
                    onResult={(r) => setResults((p) => ({ ...p, [t.id]: r }))}
                  >
                    Generate {t.label}
                  </AiButton>
                </div>
              )}
              {text && (
                <Button
                  variant="ghost"
                  className="mt-3 self-start"
                  onClick={() => setResults((p) => ({ ...p, [t.id]: '' }))}
                >
                  Clear
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
