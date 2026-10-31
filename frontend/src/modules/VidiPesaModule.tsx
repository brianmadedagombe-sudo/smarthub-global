import { useState } from 'react';
import { Video, Twitter, Linkedin, Youtube, ShoppingBag, BarChart3, UploadCloud, Sparkles, Receipt, MonitorPlay } from 'lucide-react';
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

type Tab = 'store' | 'repurposer' | 'analytics' | 'cms' | 'transactions' | 'media';

type Target = 'tiktok' | 'shorts' | 'thread' | 'linkedin';

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
  });

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
          <span className="text-xs text-slate-400">Use the Generate button on each format below.</span>
        </div>
      </Card>

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
