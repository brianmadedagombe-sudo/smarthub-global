import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchRecentMessages, isChatMessage, sendChatMessage, type ChatMessage } from '@/lib/chat';

const MAX_HISTORY = 200;

export function useGlobalChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const rows = await fetchRecentMessages();
      setMessages(rows);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Chat messages could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const channel = supabase.channel('global-chat', {
      config: { presence: { key: crypto.randomUUID() } },
    });

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const row = payload.new;
        if (!isChatMessage(row)) return;
        setMessages((prev) =>
          prev.some((m) => m.id === row.id) ? prev : [...prev.slice(-(MAX_HISTORY - 1)), row]
        );
      })
      .on('presence', { event: 'sync' }, () => {
        setOnlineCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const send = useCallback(
    async (displayName: string, body: string) => {
      await sendChatMessage(displayName, body);
      await refresh();
    },
    [refresh]
  );

  return { messages, loading, loadError, onlineCount, send, refresh };
}
