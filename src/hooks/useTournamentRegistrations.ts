import { useCallback, useEffect, useState } from 'react';
import type { TournamentRegistration } from '@/lib/types';
import { listRegistrations, registerForTournament, removeRegistration, type NewRegistration } from '@/lib/tournaments';

export function useTournamentRegistrations() {
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRegistrations(await listRegistrations());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your registrations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const add = useCallback(async (input: NewRegistration) => {
    const created = await registerForTournament(input);
    setRegistrations((prev) => [created, ...prev]);
    return created;
  }, []);

  const remove = useCallback(async (id: string) => {
    await removeRegistration(id);
    setRegistrations((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { registrations, loading, error, reload, add, remove };
}
