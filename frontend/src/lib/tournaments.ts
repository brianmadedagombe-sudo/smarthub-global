import { callSignedFunction, WalletError } from '@/lib/wallet';
import type { TournamentRegistration } from '@/lib/types';

export interface NewRegistration {
  tournamentRef?: string;
  game: string;
  ign: string;
  playerId: string;
  squadId: string;
  contact: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function parseRegistration(item: unknown): TournamentRegistration | null {
  const r = asRecord(item);
  if (!r || typeof r.id !== 'string' || typeof r.game !== 'string' || typeof r.ign !== 'string') return null;
  return {
    id: r.id,
    tournamentRef: typeof r.tournament_ref === 'string' ? r.tournament_ref : null,
    game: r.game,
    ign: r.ign,
    playerId: typeof r.player_id === 'string' ? r.player_id : '',
    squadId: typeof r.squad_id === 'string' ? r.squad_id : '',
    contact: typeof r.contact === 'string' ? r.contact : '',
    createdAt: typeof r.created_at === 'string' ? r.created_at : new Date(0).toISOString(),
  };
}

const GENERIC_ERROR = 'Something went wrong. Please try again.';

export async function listRegistrations(): Promise<TournamentRegistration[]> {
  const data = asRecord(await callSignedFunction('tournament-registrations', 'list', {}));
  if (!data || !Array.isArray(data.registrations)) throw new WalletError(GENERIC_ERROR);
  return data.registrations
    .map(parseRegistration)
    .filter((r): r is TournamentRegistration => r !== null);
}

export async function registerForTournament(input: NewRegistration): Promise<TournamentRegistration> {
  const data = asRecord(
    await callSignedFunction('tournament-registrations', 'register', {
      tournamentRef: input.tournamentRef ?? null,
      game: input.game,
      ign: input.ign,
      playerId: input.playerId,
      squadId: input.squadId,
      contact: input.contact,
    }),
  );
  const registration = parseRegistration(data?.registration);
  if (!registration) throw new WalletError(GENERIC_ERROR);
  return registration;
}

export async function removeRegistration(id: string): Promise<void> {
  await callSignedFunction('tournament-registrations', 'remove', { id });
}
