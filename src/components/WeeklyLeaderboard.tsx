import { useMemo } from 'react';
import { Trophy, Crown, Medal, Flag } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import { Card } from '@/components/ui';
import { getCountry, TOURNAMENT_STANDINGS } from '@/lib/games';

const EXTRA_RIVALS = [
  { id: 'rival_1', ign: 'GhostSniper', game: 'PUBG Mobile', xp: 2450, country: 'KE' },
  { id: 'rival_2', ign: 'BlazeQueen', game: 'Free Fire', xp: 1890, country: 'BR' },
  { id: 'rival_3', ign: 'ShadowNinja', game: 'Mobile Legends: Bang Bang', xp: 1675, country: 'PH' },
  { id: 'rival_4', ign: 'ProGamerKE', game: 'Call of Duty: Mobile', xp: 1320, country: 'KE' },
  { id: 'rival_5', ign: 'FireFox', game: 'Free Fire', xp: 980, country: 'NG' },
  { id: 'rival_6', ign: 'LegendKing', game: 'Clash of Clans', xp: 720, country: 'ZA' },
];

export function WeeklyLeaderboard({ api }: { api: AppApi }) {
  const g = api.state.gamer;

  const ranked = useMemo(() => {
    const entries = [...EXTRA_RIVALS, ...TOURNAMENT_STANDINGS.map((s) => ({ id: `ts_${s.rank}`, ign: s.ign, game: s.game, xp: s.xp, country: s.country }))];
    if (g.primaryGame) {
      entries.push({
        id: 'me',
        ign: g.ign || 'You',
        game: g.primaryGame,
        xp: g.xp,
        country: g.country,
      });
    }
    return entries.sort((a, b) => b.xp - a.xp).slice(0, 15);
  }, [g.primaryGame, g.ign, g.xp, g.country]);

  const maxXP = Math.max(1, ...ranked.map((r) => r.xp));
  const myCountry = getCountry(g.country);

  // Country-specific ranking
  const countryRanked = ranked.filter((e) => e.country === g.country);
  const myCountryRank = countryRanked.findIndex((e) => e.id === 'me') + 1;

  return (
    <div className="space-y-4">
      {/* Global leaderboard */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2 font-semibold">
          <Trophy className="h-5 w-5 text-amber-500" /> Global Leaderboard
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Top gamers ranked by XP earned this week. Lock in a primary game to join the board.
        </p>

        <div className="space-y-2">
          {ranked.map((entry, i) => {
            const isMe = entry.id === 'me';
            const rank = i + 1;
            const country = getCountry(entry.country);
            return (
              <div
                key={entry.id}
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition ${
                  isMe
                    ? 'border-cyan-500/50 bg-cyan-50 dark:bg-cyan-500/10'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${
                  rank === 1
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                    : rank === 2
                    ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                    : rank === 3
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {rank === 1 ? <Crown className="h-4 w-4" /> : rank === 2 || rank === 3 ? <Medal className="h-4 w-4" /> : rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{entry.ign}</span>
                    <span className="text-sm" title={country.name}>{country.flag}</span>
                    {isMe && <span className="rounded-full bg-cyan-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">You</span>}
                  </div>
                  <div className="text-xs text-slate-500">{entry.game}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{entry.xp.toLocaleString()}</div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">XP</div>
                </div>
                <div className="hidden h-2 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 sm:block">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
                    style={{ width: `${(entry.xp / maxXP) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Country leaderboard */}
      {g.primaryGame && countryRanked.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <Flag className="h-5 w-5 text-emerald-500" />
            {myCountry.name} Leaderboard
            <span className="text-lg">{myCountry.flag}</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your rank in {myCountry.name}: <strong className="text-cyan-600 dark:text-cyan-400">#{myCountryRank || '—'}</strong>
          </p>
          <div className="space-y-1.5">
            {countryRanked.map((entry, i) => {
              const isMe = entry.id === 'me';
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                    isMe
                      ? 'border-cyan-500/50 bg-cyan-50 dark:bg-cyan-500/10'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="w-6 text-center text-xs font-bold text-slate-400">#{i + 1}</span>
                  <span className="flex-1 truncate font-medium">{entry.ign}</span>
                  <span className="text-xs text-slate-500">{entry.game}</span>
                  <span className="font-bold">{entry.xp.toLocaleString()} XP</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
