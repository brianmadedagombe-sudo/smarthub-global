import { useState, useMemo } from 'react';
import { Search, Lock, Check, Flame, Users, Gamepad2 } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import { Card, inputClass } from '@/components/ui';
import { toast } from '@/components/Toast';
import { GAME_GENRES, ALL_GAMES, getGameCurrency, getGameDef } from '@/lib/games';
import { sanitize } from '@/lib/security';

export function GameDirectory({ api }: { api: AppApi }) {
  const g = api.state.gamer;
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState<string>('all');

  const setG = (patch: Partial<typeof g>) => api.patch((p) => ({ ...p, gamer: { ...p.gamer, ...patch } }));

  const filtered = useMemo(() => {
    return ALL_GAMES.filter((game) => {
      const matchesSearch = !search || game.id.toLowerCase().includes(search.toLowerCase()) || game.publisher.toLowerCase().includes(search.toLowerCase());
      const matchesGenre = genreFilter === 'all' || game.genre === genreFilter;
      return matchesSearch && matchesGenre;
    });
  }, [search, genreFilter]);

  const lockGame = (gameId: string) => {
    setG({ primaryGame: gameId });
    toast(`${gameId} locked in as your primary game.`);
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2 font-semibold">
        <Gamepad2 className="h-5 w-5 text-cyan-500" /> Game Directory
      </div>

      {/* Search + genre filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className={`${inputClass} pl-9`}
            value={search}
            maxLength={40}
            onChange={(e) => setSearch(sanitize(e.target.value))}
            placeholder="Search games or publishers…"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <GenreChip active={genreFilter === 'all'} onClick={() => setGenreFilter('all')}>All</GenreChip>
          {GAME_GENRES.map((genre) => (
            <GenreChip key={genre.label} active={genreFilter === genre.label} onClick={() => setGenreFilter(genre.label)}>
              {genre.label}
            </GenreChip>
          ))}
        </div>
      </div>

      {/* Game grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((game) => {
          const isLocked = g.primaryGame === game.id;
          const currency = getGameCurrency(game.id);
          return (
            <div
              key={game.id}
              className={`group relative overflow-hidden rounded-xl border transition-all ${
                isLocked
                  ? 'border-cyan-500/60 ring-2 ring-cyan-500/20'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
              }`}
            >
              {/* Color header */}
              <div className={`relative h-20 bg-gradient-to-br ${game.color}`}>
                <div className="absolute inset-0 flex items-center justify-between px-4">
                  <div className="text-lg font-bold text-white drop-shadow">{game.id}</div>
                  {isLocked ? (
                    <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase text-white backdrop-blur">
                      <Check className="h-3 w-3" /> Locked
                    </span>
                  ) : (
                    <button
                      onClick={() => lockGame(game.id)}
                      className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white opacity-0 backdrop-blur transition group-hover:opacity-100"
                    >
                      <Lock className="h-3 w-3" /> Lock in
                    </button>
                  )}
                </div>
                <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/30 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                  <Flame className="h-3 w-3 text-orange-400" /> {game.popularity}
                </div>
              </div>

              {/* Body */}
              <div className="space-y-2 p-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">{game.tagline}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{game.publisher}</span>
                  <span className="font-semibold text-cyan-600 dark:text-cyan-400">{currency}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Users className="h-3 w-3" /> {game.genre}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-8 text-center text-sm text-slate-400">
          No games found. Try a different search or filter.
        </div>
      )}

      {/* Currently locked game info */}
      {g.primaryGame && (
        <div className="flex items-center gap-2 rounded-xl bg-cyan-50 px-3 py-2.5 text-sm dark:bg-cyan-500/10">
          <Check className="h-4 w-4 text-cyan-500" />
          <span className="font-semibold text-cyan-700 dark:text-cyan-300">{g.primaryGame}</span>
          <span className="text-slate-500">· Rewards in {getGameCurrency(g.primaryGame)}</span>
          {getGameDef(g.primaryGame) && (
            <span className="text-slate-400">· {getGameDef(g.primaryGame)!.publisher}</span>
          )}
        </div>
      )}
    </Card>
  );
}

function GenreChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition ${
        active
          ? 'bg-cyan-600 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
}
