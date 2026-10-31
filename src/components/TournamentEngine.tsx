import { useState, useMemo } from 'react';
import { Trophy, Users, Coins, Crown, Clock, Check, Lock, ChevronRight, Medal } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import type { Tournament, TournamentStatus } from '@/lib/types';
import { Card, Button } from '@/components/ui';
import { toast } from '@/components/Toast';
import { TOURNAMENTS, TOURNAMENT_STANDINGS, getGameDef, getCountry } from '@/lib/games';
import { spendHubCoins } from '@/lib/wallet';
import { removeRegistration } from '@/lib/tournaments';
import { useTournamentRegistrations } from '@/hooks/useTournamentRegistrations';

const STATUS_STYLES: Record<TournamentStatus, { label: string; color: string; dot: string }> = {
  upcoming: { label: 'Upcoming', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800', dot: 'bg-slate-400' },
  registration: { label: 'Open', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10', dot: 'bg-emerald-500' },
  live: { label: 'Live', color: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10', dot: 'bg-rose-500 animate-pulse' },
  completed: { label: 'Done', color: 'text-slate-400 bg-slate-100 dark:bg-slate-800', dot: 'bg-slate-400' },
};

function formatCountdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Started';
  const days = Math.floor(diff / 864e5);
  const hours = Math.floor((diff % 864e5) / 36e5);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % 36e5) / 6e4);
  return `${hours}h ${mins}m`;
}

export function TournamentEngine({ api }: { api: AppApi }) {
  const g = api.state.gamer;
  const [selectedTour, setSelectedTour] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TournamentStatus | 'all'>('all');
  const { registrations, loading: loadingRegistrations, error: registrationsError, reload, add } = useTournamentRegistrations();

  const enteredIds = useMemo(
    () => new Set(registrations.map((r) => r.tournamentRef).filter((ref): ref is string => !!ref)),
    [registrations],
  );

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return TOURNAMENTS;
    return TOURNAMENTS.filter((t) => t.status === statusFilter);
  }, [statusFilter]);

  const selected = TOURNAMENTS.find((t) => t.id === selectedTour) ?? null;

  const handleEnter = async (tour: Tournament) => {
    if (!g.ign) {
      toast('Set your in-game name first in the challenges tab.', 'error');
      return;
    }
    if (tour.status !== 'registration') {
      toast(tour.status === 'live' ? 'This tournament is already live.' : 'Registration is closed.', 'error');
      return;
    }
    if (enteredIds.has(tour.id)) {
      toast('You are already registered for this tournament.', 'error');
      return;
    }
    setEntering(true);
    const charge = tour.entryFee > 0 && !api.state.profile.isPro;
    let registrationId: string | null = null;
    try {
      const created = await add({ tournamentRef: tour.id, game: tour.game, ign: g.ign, playerId: '', squadId: '', contact: '' });
      registrationId = created.id;
      if (charge) {
        await spendHubCoins(tour.entryFee, 'tournament_entry');
      }
      registrationId = null;
      toast(`Registered for ${tour.title}!${charge ? ` ${tour.entryFee} Hub Coins deducted.` : ' Free entry for Pro.'}`);
      setSelectedTour(null);
    } catch (err) {
      if (registrationId) {
        await removeRegistration(registrationId).catch(() => undefined);
        await reload();
      }
      toast(err instanceof Error ? err.message : 'Could not enter tournament. Check your Hub Coin balance.', 'error');
    } finally {
      setEntering(false);
    }
  };

  return (
    <div className="space-y-4">
      {registrationsError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <span>{registrationsError}</span>
          <button onClick={() => void reload()} className="font-semibold underline underline-offset-2">
            Try again
          </button>
        </div>
      )}
      {loadingRegistrations && registrations.length === 0 && !registrationsError && (
        <div className="text-sm text-slate-500">Loading your registrations…</div>
      )}
      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All</FilterChip>
        <FilterChip active={statusFilter === 'registration'} onClick={() => setStatusFilter('registration')}>Open</FilterChip>
        <FilterChip active={statusFilter === 'live'} onClick={() => setStatusFilter('live')}>Live</FilterChip>
        <FilterChip active={statusFilter === 'upcoming'} onClick={() => setStatusFilter('upcoming')}>Upcoming</FilterChip>
        <FilterChip active={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')}>Completed</FilterChip>
      </div>

      {/* Tournament cards */}
      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.map((tour) => {
          const st = STATUS_STYLES[tour.status];
          const gameDef = getGameDef(tour.game);
          const entered = enteredIds.has(tour.id);
          const fillPct = Math.round((tour.registeredCount / tour.maxPlayers) * 100);
          return (
            <Card key={tour.id} className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-bold">{tour.title}</h3>
                    {entered && <Check className="h-4 w-4 shrink-0 text-emerald-500" />}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">{tour.game} · {tour.format.toUpperCase()}</div>
                </div>
                <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${st.color}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                  {st.label}
                </span>
              </div>

              {/* Color strip */}
              {gameDef && <div className={`h-1.5 rounded-full bg-gradient-to-r ${gameDef.color}`} />}

              <p className="text-xs text-slate-500 dark:text-slate-400">{tour.description}</p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat icon={<Coins className="h-4 w-4 text-amber-500" />} label="Entry" value={api.state.profile.isPro ? 'FREE' : `${tour.entryFee}`} />
                <Stat icon={<Trophy className="h-4 w-4 text-cyan-500" />} label="Prize" value={`${tour.prizePool.toLocaleString()}`} />
                <Stat icon={<Users className="h-4 w-4 text-slate-400" />} label="Slots" value={`${tour.registeredCount}/${tour.maxPlayers}`} />
              </div>

              {/* Fill bar */}
              <div>
                <div className="mb-1 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{fillPct}% full</span>
                  {tour.status === 'registration' && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {formatCountdown(tour.startsAt)}</span>}
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className={`h-full rounded-full ${tour.status === 'live' ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${fillPct}%` }} />
                </div>
              </div>

              {/* Action */}
              {tour.status === 'registration' && !entered && (
                <Button fullWidth onClick={() => handleEnter(tour)} loading={entering} icon={<Lock className="h-4 w-4" />}>
                  Enter {api.state.profile.isPro ? '(Pro free)' : `· ${tour.entryFee} coins`}
                </Button>
              )}
              {entered && (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <Check className="h-4 w-4" /> Registered
                </div>
              )}
              {tour.status === 'live' && (
                <Button fullWidth variant="danger" onClick={() => setSelectedTour(tour.id)} icon={<Trophy className="h-4 w-4" />}>
                  View Live Standings
                </Button>
              )}
              {tour.status === 'completed' && (
                <Button fullWidth variant="secondary" onClick={() => setSelectedTour(tour.id)} icon={<Medal className="h-4 w-4" />}>
                  View Results
                </Button>
              )}
              {tour.status === 'upcoming' && (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 py-2.5 text-sm font-semibold text-slate-500 dark:bg-slate-800/50">
                  <Clock className="h-4 w-4" /> Opens in {formatCountdown(tour.startsAt)}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card className="py-8 text-center text-sm text-slate-400">
          No tournaments in this category right now.
        </Card>
      )}

      {/* Standings modal */}
      {selected && (
        <StandingsOverlay
          tournament={selected}
          onClose={() => setSelectedTour(null)}
        />
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2 dark:bg-slate-800/50">
      <div className="flex items-center justify-center">{icon}</div>
      <div className="mt-0.5 text-sm font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
        active
          ? 'bg-cyan-600 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

function StandingsOverlay({ tournament, onClose }: { tournament: Tournament; onClose: () => void }) {
  const isCompleted = tournament.status === 'completed';
  const standings = TOURNAMENT_STANDINGS;

  const prizeDistribution = [
    { place: 1, pct: 50 },
    { place: 2, pct: 25 },
    { place: 3, pct: 15 },
    { place: 4, pct: 10 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`h-2 bg-gradient-to-r ${getGameDef(tournament.game)?.color ?? 'from-cyan-500 to-blue-600'}`} />
        <div className="flex items-center justify-between p-4 pb-3">
          <div>
            <h3 className="text-lg font-bold">{tournament.title}</h3>
            <p className="text-xs text-slate-500">{tournament.game} · {isCompleted ? 'Final Results' : 'Live Standings'}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <ChevronRight className="h-5 w-5 rotate-180" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-4 pb-4">
          {/* Prize pool distribution */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {prizeDistribution.map((p) => (
              <div key={p.place} className={`rounded-xl border p-3 text-center ${p.place === 1 ? 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-center justify-center">
                  {p.place === 1 ? <Crown className="h-5 w-5 text-amber-500" /> : <Medal className="h-5 w-5 text-slate-400" />}
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-500">#{p.place}</div>
                <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {Math.round(tournament.prizePool * p.pct / 100).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400">{p.pct}% pool</div>
              </div>
            ))}
          </div>

          {/* Standings table */}
          <div className="space-y-1.5">
            {standings.map((s) => {
              const country = getCountry(s.country);
              return (
                <div
                  key={s.rank}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                    s.rank <= 3
                      ? 'border-amber-200 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/5'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                    s.rank === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                    : s.rank === 2 ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                    : s.rank === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {s.rank}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-semibold">{s.ign}</span>
                      <span className="text-sm">{country.flag}</span>
                    </div>
                    <div className="text-xs text-slate-500">{s.game}</div>
                  </div>
                  <div className="flex gap-3 text-center text-xs">
                    <div>
                      <div className="font-bold text-rose-500">{s.kills}</div>
                      <div className="text-[9px] uppercase text-slate-400">Kills</div>
                    </div>
                    <div>
                      <div className="font-bold text-emerald-500">{s.wins}</div>
                      <div className="text-[9px] uppercase text-slate-400">Wins</div>
                    </div>
                    <div>
                      <div className="font-bold">{s.xp.toLocaleString()}</div>
                      <div className="text-[9px] uppercase text-slate-400">XP</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
