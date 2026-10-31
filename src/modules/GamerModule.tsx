import { useState } from 'react';
import { Gamepad2, Check, Trophy, Gift, Crown, Star, Target, BarChart3, Swords, Play } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import type { GameRewardRequest } from '@/lib/types';
import { sanitize, uid } from '@/lib/security';
import { Button, Card, Field, inputClass, SectionTitle } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { toast } from '@/components/Toast';
import { WeeklyLeaderboard } from '@/components/WeeklyLeaderboard';
import { TournamentRegister } from '@/components/TournamentRegister';
import { GameDirectory } from '@/components/GameDirectory';
import { TournamentEngine } from '@/components/TournamentEngine';
import { RewardedAds } from '@/components/RewardedAds';
import { getGameCurrency } from '@/lib/games';
import { creditEarnings } from '@/lib/wallet';

const TIERS = [
  { name: 'Bronze', min: 0, color: 'text-amber-700' },
  { name: 'Silver', min: 300, color: 'text-slate-400' },
  { name: 'Gold', min: 700, color: 'text-amber-500' },
  { name: 'Platinum', min: 1200, color: 'text-cyan-400' },
  { name: 'Diamond', min: 2000, color: 'text-sky-400' },
  { name: 'Ultimate Legend', min: 3000, color: 'text-fuchsia-500' },
];

function tierFor(xp: number) {
  let tier = TIERS[0];
  for (const t of TIERS) if (xp >= t.min) tier = t;
  return tier;
}
function nextTier(xp: number) {
  return TIERS.find((t) => t.min > xp);
}

type Tab = 'directory' | 'challenges' | 'leaderboard' | 'tournaments' | 'rewards';

export function GamerModule({ api }: { api: AppApi }) {
  const g = api.state.gamer;
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimAmount, setClaimAmount] = useState('');
  const [tab, setTab] = useState<Tab>('directory');
  const [ignInput, setIgnInput] = useState(g.ign);

  const setG = (patch: Partial<typeof g>) => api.patch((p) => ({ ...p, gamer: { ...p.gamer, ...patch } }));

  const toggleChallenge = (id: string) =>
    setG({
      challenges: g.challenges.map((c) => (c.id === id ? { ...c, done: !c.done } : c)),
      xp: g.challenges.find((c) => c.id === id && !c.done) ? g.xp + g.challenges.find((c) => c.id === id)!.xp : g.xp,
    });

  const claimReward = async () => {
    if (!sanitize(claimAmount) || !/^\d+(\.\d+)?$/.test(claimAmount)) {
      toast('Enter a valid amount.', 'error');
      return;
    }
    const req: GameRewardRequest = {
      id: uid('rw'),
      game: g.primaryGame,
      amount: claimAmount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setG({ rewards: [req, ...g.rewards] });
    setClaimOpen(false);
    setClaimAmount('');
    toast('Reward request created — status: pending verification.');
    try {
      const amountKes = Math.round(parseFloat(claimAmount));
      if (amountKes > 0) {
        await creditEarnings(amountKes, 'reward', `Reward: ${g.primaryGame}`);
        toast('Reward credited to your Earned Cash.');
      }
    } catch {
      // Earnings credit is best-effort — reward request is already recorded
    }
  };

  const tier = tierFor(g.xp);
  const next = nextTier(g.xp);
  const progress = next ? Math.min(100, Math.round(((g.xp - tier.min) / (next.min - tier.min)) * 100)) : 100;
  const currency = getGameCurrency(g.primaryGame);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'directory', label: 'Games', icon: <Gamepad2 className="h-4 w-4" /> },
    { id: 'challenges', label: 'Challenges', icon: <Target className="h-4 w-4" /> },
    { id: 'tournaments', label: 'Tournaments', icon: <Swords className="h-4 w-4" /> },
    { id: 'leaderboard', label: 'Ranks', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'rewards', label: 'Rewards', icon: <Play className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-5">
      <SectionTitle title="Gamer Hub & Tournament Engine" subtitle="Browse games, enter tournaments, watch ads for rewards, and climb the global leaderboards." />

      {/* Rank + XP card — always visible */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`grid h-12 w-12 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 ${tier.color}`}>
              {tier.name === 'Ultimate Legend' ? <Crown className="h-6 w-6" /> : <Trophy className="h-6 w-6" />}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Current rank</div>
              <div className={`text-lg font-bold ${tier.color}`}>{tier.name}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-slate-400">Total XP</div>
            <div className="text-lg font-bold">{g.xp.toLocaleString()}</div>
          </div>
        </div>
        {next && (
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>{tier.name}</span>
              <span>{next.name}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        {/* IGN input */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <Field label="In-game name (IGN)">
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  value={ignInput}
                  maxLength={30}
                  onChange={(e) => setIgnInput(sanitize(e.target.value))}
                  placeholder="e.g. MadedaSniper"
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    const clean = sanitize(ignInput).trim();
                    if (!clean) { toast('Enter your IGN.', 'error'); return; }
                    setG({ ign: clean });
                    toast('IGN saved.');
                  }}
                >
                  Save
                </Button>
              </div>
            </Field>
          </div>
          {g.primaryGame && (
            <Button variant="success" onClick={() => setClaimOpen(true)} icon={<Gift className="h-4 w-4" />}>
              Claim {currency}
            </Button>
          )}
        </div>
      </Card>

      {/* Tab navigation */}
      <div className="grid grid-cols-5 gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
              tab === t.id
                ? 'bg-white text-cyan-600 shadow dark:bg-slate-900 dark:text-cyan-400'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'directory' && <GameDirectory api={api} />}

      {tab === 'challenges' && (
        <>
          {g.primaryGame ? (
            <>
              <Card className="space-y-3">
                <div className="flex items-center gap-2 font-semibold">
                  <Target className="h-5 w-5 text-emerald-500" /> Daily challenges
                </div>
                <ul className="space-y-2">
                  {g.challenges.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => toggleChallenge(c.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${c.done ? 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        <span className={`grid h-5 w-5 place-items-center rounded-md border ${c.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                          {c.done && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className={`flex-1 text-sm ${c.done ? 'text-slate-500 line-through' : ''}`}>{c.label}</span>
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                          <Star className="h-3.5 w-3.5 fill-amber-400" /> +{c.xp} XP
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>

              {g.rewards.length > 0 && (
                <Card>
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Gift className="h-5 w-5 text-cyan-500" /> Reward requests
                  </div>
                  <ul className="space-y-2 text-sm">
                    {g.rewards.map((r) => (
                      <li key={r.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                        <span className="truncate">{r.game} · {r.amount} {getGameCurrency(r.game)}</span>
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                          {r.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </>
          ) : (
            <Card className="py-8 text-center text-sm text-slate-400">
              Lock in a primary game in the Games tab to unlock daily challenges.
            </Card>
          )}
        </>
      )}

      {tab === 'tournaments' && <TournamentEngine api={api} />}

      {tab === 'leaderboard' && (
        <>
          <WeeklyLeaderboard api={api} />
          <TournamentRegister api={api} />
        </>
      )}

      {tab === 'rewards' && <RewardedAds api={api} />}

      {/* Claim reward modal */}
      <Modal
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        title={`Claim ${currency} reward`}
        maxWidth="max-w-sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setClaimOpen(false)}>Cancel</Button>
            <Button variant="success" onClick={claimReward}>Create pending request</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl bg-cyan-50 px-3 py-2 text-sm text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
            <Gamepad2 className="h-4 w-4" />
            Game: <strong>{g.primaryGame}</strong>
          </div>
          <Field label={`Amount (${currency})`}>
            <input className={inputClass} value={claimAmount} onChange={(e) => setClaimAmount(sanitize(e.target.value))} placeholder="e.g. 60" />
          </Field>
          <p className="text-xs text-slate-400">
            Submitting creates a verified pending request. Pro accounts get faster processing.
          </p>
        </div>
      </Modal>
    </div>
  );
}
