import { useCallback, useEffect, useState } from 'react';
import { fetchWalletSnapshot, type WalletSnapshot } from '@/lib/wallet';

export function useWallet() {
  const [snapshot, setSnapshot] = useState<WalletSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSnapshot(await fetchWalletSnapshot());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your wallet.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { snapshot, loading, error, refresh };
}

export type WalletHook = ReturnType<typeof useWallet>;
