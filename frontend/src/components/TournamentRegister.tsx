import { useState } from 'react';
import { Gamepad2, Trophy, Trash2, ChevronDown, Loader2 } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import { useTournamentRegistrations } from '@/hooks/useTournamentRegistrations';
import { sanitize } from '@/lib/security';
import { Button, Card, Field, inputClass } from '@/components/ui';
import { toast } from '@/components/Toast';
import { GAME_GENRES } from '@/lib/games';

export function TournamentRegister({ api }: { api: AppApi }) {
  const g = api.state.gamer;
  const { registrations, loading, error, reload, add, remove } = useTournamentRegistrations();
  const [game, setGame] = useState(g.primaryGame || '');
  const [playerId, setPlayerId] = useState('');
  const [squadId, setSquadId] = useState('');
  const [ign, setIgn] = useState(g.ign || '');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const setG = (patch: Partial<typeof g>) =>
    api.patch((p) => ({ ...p, gamer: { ...p.gamer, ...patch } }));

  const submit = async () => {
    const cleanGame = sanitize(game);
    const cleanPlayerId = sanitize(playerId);
    const cleanSquad = sanitize(squadId);
    const cleanIgn = sanitize(ign);
    const cleanContact = sanitize(contact);

    if (!cleanGame) {
      toast('Select a game first.', 'error');
      return;
    }
    if (!cleanIgn) {
      toast('Enter your in-game name (IGN).', 'error');
      return;
    }
    if (!cleanPlayerId && !cleanSquad) {
      toast('Enter your Player ID or Squad ID.', 'error');
      return;
    }
    if (!cleanContact || !/^\+?\d{8,15}$/.test(cleanContact)) {
      toast('Enter a valid contact number (8-15 digits).', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await add({
        game: cleanGame,
        ign: cleanIgn,
        playerId: cleanPlayerId,
        squadId: cleanSquad,
        contact: cleanContact,
      });
      setG({ ign: cleanIgn });
      setPlayerId('');
      setSquadId('');
      setContact('');
      toast('Tournament registration submitted!');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save your registration.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await remove(id);
      toast('Registration removed.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not remove your registration.', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2 font-semibold">
        <Trophy className="h-5 w-5 text-cyan-500" /> Custom Tournament Register
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Register for upcoming weekly community matches. Select your game, enter your in-game name and Player/Squad ID for prize verification.
      </p>

      <div className="space-y-3">
        <Field label="Game title">
          <div className="relative">
            <select
              value={game}
              onChange={(e) => setGame(sanitize(e.target.value))}
              className={`${inputClass} appearance-none pr-10 ${!game ? 'text-slate-400' : ''}`}
            >
              <option value="">Select your game…</option>
              {GAME_GENRES.map((genre) => (
                <optgroup key={genre.label} label={genre.label}>
                  {genre.games.map((gm) => (
                    <option key={gm.id} value={gm.id}>
                      {gm.id} — Rewards: {gm.currency}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </div>
        </Field>

        <Field label="In-game name (IGN)">
          <input
            className={inputClass}
            value={ign}
            onChange={(e) => setIgn(sanitize(e.target.value))}
            placeholder="e.g. MadedaSniper"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Player ID" hint="Your unique in-game player ID">
            <input
              className={inputClass}
              value={playerId}
              onChange={(e) => setPlayerId(sanitize(e.target.value))}
              placeholder="e.g. 5123890456"
            />
          </Field>
          <Field label="Squad ID" hint="For squad-based tournaments">
            <input
              className={inputClass}
              value={squadId}
              onChange={(e) => setSquadId(sanitize(e.target.value))}
              placeholder="e.g. SQ-8842"
            />
          </Field>
        </div>

        <Field label="Contact number" hint="Used to notify you about match schedules.">
          <input
            className={inputClass}
            value={contact}
            onChange={(e) => setContact(sanitize(e.target.value))}
            placeholder="e.g. +254757834883"
          />
        </Field>

        <Button
          fullWidth
          onClick={submit}
          disabled={submitting}
          icon={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gamepad2 className="h-4 w-4" />}
        >
          {submitting ? 'Submitting…' : 'Register for tournament'}
        </Button>
      </div>

      {loading && registrations.length === 0 && (
        <div className="text-sm text-slate-500">Loading your registrations…</div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <span>{error}</span>
          <button onClick={() => void reload()} className="font-semibold underline underline-offset-2">
            Try again
          </button>
        </div>
      )}

      {registrations.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Your registrations ({registrations.length})
          </div>
          <ul className="space-y-1.5">
            {registrations.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{t.ign}</div>
                  <div className="text-xs text-slate-500">
                    {t.game}
                    {t.playerId && ` · Player: ${t.playerId}`}
                    {t.squadId && ` · Squad: ${t.squadId}`}
                  </div>
                </div>
                <button
                  onClick={() => void handleRemove(t.id)}
                  disabled={removingId === t.id}
                  className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-500/10"
                  aria-label="Remove registration"
                >
                  {removingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
