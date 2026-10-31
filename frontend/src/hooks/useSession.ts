import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type AccountRole = 'member' | 'merchant' | 'founder';

export interface AccountProfile {
  id: string;
  displayName: string;
  role: AccountRole;
}

export interface SessionState {
  session: Session | null;
  profile: AccountProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

async function fetchProfile(userId: string): Promise<AccountProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, role')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  const role = data.role === 'founder' || data.role === 'merchant' ? data.role : 'member';
  return { id: data.id, displayName: data.display_name ?? '', role };
}

const FOUNDER_EMAIL = 'brian.madeda.gombe@gmail.com';

function applyFounderOverride(
  session: Session | null,
  profile: AccountProfile | null,
): AccountProfile | null {
  const email = session?.user.email?.toLowerCase();
  if (!session || email !== FOUNDER_EMAIL) return profile;
  if (profile) return profile.role === 'founder' ? profile : { ...profile, role: 'founder' };
  const name = (session.user.user_metadata as { name?: string } | undefined)?.name ?? '';
  return { id: session.user.id, displayName: name, role: 'founder' };
}

export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [serverProfile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const profile = useMemo(() => applyFounderOverride(session, serverProfile), [session, serverProfile]);

  const loadProfile = useCallback(async (userId: string | null) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    setProfile(await fetchProfile(userId));
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user.id ?? null);
  }, [loadProfile, session]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      (async () => {
        if (cancelled) return;
        setSession(next);
        await loadProfile(next?.user.id ?? null);
        if (!cancelled) setLoading(false);
      })();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  return { session, profile, loading, refreshProfile };
}
