import { useEffect, useMemo, useState } from 'react';
import { Play, Coins, ShieldCheck, Zap, Flame, TrendingUp, Globe, Crown, Medal, Award, Check } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import type { AdRewardType, RankBadge } from '@/lib/types';
import { Card, Button } from '@/components/ui';
import { toast } from '@/components/Toast';
import { AD_REWARD_OPTIONS, RANK_BADGE_INFO, COUNTRIES, getCountry } from '@/lib/games';
import { uid } from '@/lib/security';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Coins, ShieldCheck, Zap, Globe, Crown, Medal, Award, TrendingUp,
};

const AD_DURATION = 5;

export function RewardedAds({ api }: { api: AppApi }) {
  const g = api.state.gamer;
  const [watching, setWatching] = useState(false);
  const [adType, setAdType] = useState<AdRewardType | null>(null);
  const [countdown, setCountdown] = useState(AD_DURATION);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);

  const setG = (patch: Partial<typeof g>) => api.patch((p) => ({ ...p, gamer: { ...p.gamer, ...patch } }));

  const today = new Date().toDateString();
  const watchedToday = useMemo(
    () => g.adRewards.filter((r) => new Date(r.watchedAt).toDateString() === today).length,
    [g.adRewards, today]
  );
  const dailyCap = 10;
  const canWatch = watchedToday < dailyCap;

  // Evaluate rank badges based on XP and country standings
  const evaluatedBadges = useMemo<RankBadge[]>(() => {
    const badges: RankBadge[] = [];
    if (g.xp >= 2000) badges.push('global_top100');
    if (g.xp >= 1500) badges.push('rising_star');
    // Simulated country ranking based on XP thresholds
    if (g.xp >= 3000) badges.push('country_top1');
    else if (g.xp >= 2000) badges.push('country_top3');
    else if (g.xp >= 1000) badges.push('country_top10');
    return [...new Set([...badges, ...g.rankBadges])];
  }, [g.xp, g.country, g.rankBadges]);

  const startAd = (type: AdRewardType) => {
    if (!canWatch) {
      toast(`Daily ad limit reached (${dailyCap}). Come back tomorrow!`, 'error');
      return;
    }
    setAdType(type);
    setCountdown(AD_DURATION);
    setWatching(true);
  };

  const finishAd = () => {
    if (!adType) return;
    const option = AD_REWARD_OPTIONS.find((o) => o.type === adType);
    if (!option) return;

    const now = new Date().toISOString();
    const newRewards = [...g.adRewards, { id: uid('ad'), type: adType, reward: option.reward, watchedAt: now }];

    const patch: Partial<typeof g> = {
      adRewards: newRewards,
      lastAdWatchedAt: now,
    };

    if (adType === 'xp_boost') {
      patch.xp = g.xp + option.reward;
      toast(`+${option.reward} XP gained from ad!`);
    } else if (adType === 'streak_protection') {
      patch.streakProtectedThisWeek = true;
      toast('Your streak is protected for today!');
    } else if (adType === 'bonus_coins') {
      toast(`+${option.reward} Hub Coins coming your way!`);
    }

    // Update streak — watching any ad maintains streak
    const newStreak = g.streak + 1;
    patch.streak = newStreak;
    patch.longestStreak = Math.max(g.longestStreak, newStreak);

    // Sync badges
    if (newStreak >= 7 && !evaluatedBadges.includes('rising_star')) {
      patch.rankBadges = [...new Set([...g.rankBadges, 'rising_star' as RankBadge])];
      toast('New badge unlocked: Rising Star!', 'info');
    } else if (patch.xp !== undefined) {
      const xpVal = patch.xp;
      const newBadges: RankBadge[] = [];
      if (xpVal >= 3000 && !g.rankBadges.includes('country_top1')) newBadges.push('country_top1');
      else if (xpVal >= 2000 && !g.rankBadges.includes('country_top3')) newBadges.push('country_top3');
      else if (xpVal >= 1000 && !g.rankBadges.includes('country_top10')) newBadges.push('country_top10');
      if (xpVal >= 2000 && !g.rankBadges.includes('global_top100')) newBadges.push('global_top100');
      if (newBadges.length > 0) {
        patch.rankBadges = [...new Set([...g.rankBadges, ...newBadges])];
        toast(`New badge${newBadges.length > 1 ? 's' : ''} unlocked!`, 'info');
      }
    }

    setG(patch);
    setWatching(false);
    setAdType(null);
  };

  useEffect(() => {
    if (!watching) return;
    if (countdown <= 0) {
      finishAd();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [watching, countdown]);

  const country = getCountry(g.country);

  return (
    <div className="space-y-4">
      {/* Streak + country header */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Ad Streak</div>
              <div className="text-lg font-bold">{g.streak} days</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-slate-400">Best</div>
            <div className="text-lg font-bold text-amber-500">{g.longestStreak}</div>
          </div>
          <button
            onClick={() => setCountryPickerOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <span className="text-lg">{country.flag}</span>
            <span className="font-semibold">{country.name}</span>
          </button>
        </div>

        {countryPickerOpen && (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {COUNTRIES.map((c) => (
              <button
                key={c.code}
                onClick={() => {
                  setG({ country: c.code });
                  setCountryPickerOpen(false);
                  toast(`Country set to ${c.name}.`);
                }}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                  c.code === g.country
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'
                }`}
              >
                <span>{c.flag}</span>
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
        )}

        {g.streakProtectedThisWeek && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4" /> Streak protected this week
          </div>
        )}
      </Card>

      {/* Rewarded ad options */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Play className="h-5 w-5 text-cyan-500" /> Watch to Earn
          </div>
          <span className="text-xs text-slate-400">{watchedToday}/{dailyCap} watched today</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {AD_REWARD_OPTIONS.map((opt) => {
            const Icon = ICONS[opt.icon] ?? Coins;
            return (
              <div
                key={opt.type}
                className="flex flex-col rounded-xl border border-slate-200 p-4 dark:border-slate-700"
              >
                <div className="mb-2 grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-sm font-bold">{opt.label}</div>
                <p className="mt-1 flex-1 text-xs text-slate-500 dark:text-slate-400">{opt.desc}</p>
                <Button
                  variant="secondary"
                  fullWidth
                  className="mt-3"
                  disabled={!canWatch || watching}
                  onClick={() => startAd(opt.type)}
                  icon={<Play className="h-4 w-4" />}
                >
                  {opt.reward > 0 ? `+${opt.reward}` : 'Protect'}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Rank badges */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <Award className="h-5 w-5 text-amber-500" /> Rank Badges
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Earn badges by climbing the global and country leaderboards. Watch ads to boost XP and protect your streak.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(RANK_BADGE_INFO).map(([key, info]) => {
            const earned = evaluatedBadges.includes(key as RankBadge);
            const Icon = ICONS[info.icon] ?? Award;
            return (
              <div
                key={key}
                className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                  earned
                    ? 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
                    : 'border-slate-200 opacity-60 dark:border-slate-700'
                }`}
              >
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${earned ? `bg-gradient-to-br ${info.color} text-white` : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                  {earned ? <Icon className="h-5 w-5" /> : <Award className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold">{info.label}</span>
                    {earned && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{info.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Ad reward history */}
      {g.adRewards.length > 0 && (
        <Card className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent rewards</div>
          <div className="space-y-1.5">
            {g.adRewards.slice(0, 6).map((r) => {
              const opt = AD_REWARD_OPTIONS.find((o) => o.type === r.type);
              return (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                  <span className="font-medium">{opt?.label ?? r.type}</span>
                  <div className="flex items-center gap-2">
                    {r.reward > 0 && <span className="font-bold text-cyan-600 dark:text-cyan-400">+{r.reward}</span>}
                    <span className="text-xs text-slate-400">{new Date(r.watchedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Ad playback overlay */}
      {watching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                <Play className="h-8 w-8" />
              </div>
            </div>
            <div className="text-lg font-bold">Ad playing…</div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {AD_REWARD_OPTIONS.find((o) => o.type === adType)?.label}
            </p>
            <div className="mx-auto mt-4 h-2 w-48 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-1000"
                style={{ width: `${((AD_DURATION - countdown) / AD_DURATION) * 100}%` }}
              />
            </div>
            <div className="mt-3 text-3xl font-bold text-cyan-600 dark:text-cyan-400">{countdown}s</div>
            <p className="mt-2 text-xs text-slate-400">Your reward will be credited when the ad finishes.</p>
          </div>
        </div>
      )}
    </div>
  );
}
