import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessagesSquare, Send, Users, RefreshCw } from 'lucide-react';
import { useGlobalChat } from '@/hooks/useGlobalChat';
import { Button, Card, SectionTitle } from '@/components/ui';
import { ChatMessageRow } from '@/components/ChatMessageRow';
import { toast } from '@/components/Toast';
import { useSession } from '@/hooks/useSession';
import { isSupabaseConfigured } from '@/lib/supabase';
import { CHAT_MAX_BODY, CHAT_MAX_NAME } from '@/lib/chat';

const NAME_STORAGE = 'smarthub_chat_name';

export function ChatModule() {
  const { messages, loading, loadError, onlineCount, send, refresh } = useGlobalChat();
  const { profile } = useSession();
  const signedInName = profile?.displayName.trim() ?? '';

  const [guestName, setGuestName] = useState(() => localStorage.getItem(NAME_STORAGE) ?? '');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  const displayName = (signedInName || guestName.trim()).slice(0, CHAT_MAX_NAME);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!displayName) {
      toast('Enter a name to join the chat.', 'error');
      return;
    }
    if (!text) return;

    setSending(true);
    try {
      if (!signedInName) localStorage.setItem(NAME_STORAGE, displayName);
      await send(displayName, text);
      setBody('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Your message could not be sent.', 'error');
    } finally {
      setSending(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <Card>
        <SectionTitle title="Global Chat" subtitle="Live community chat" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Global Chat is not connected yet. Once the app is connected to its backend, the live chat will appear here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-sky-500/15 text-sky-500">
            <MessagesSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Global Chat</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Talk with people across SmartHub Global</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <Users className="h-3.5 w-3.5" />
            {onlineCount} online
          </span>
          <button
            type="button"
            onClick={() => refresh()}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Refresh messages"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </Card>

      <Card className="flex h-[65vh] min-h-[360px] flex-col gap-3 p-0 sm:p-0">
        {loading ? (
          <div className="grid flex-1 place-items-center text-sm text-slate-500">Loading messages...</div>
        ) : loadError ? (
          <div className="grid flex-1 place-items-center p-6 text-center">
            <div>
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{loadError}</p>
              <Button variant="secondary" className="mt-3" onClick={() => refresh()}>Try again</Button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="grid flex-1 place-items-center p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No messages yet. Say hello and start the conversation.
          </div>
        ) : (
          <ul ref={listRef} className="flex-1 space-y-1 overflow-y-auto p-3 sm:p-4">
            {messages.map((m) => (
              <ChatMessageRow key={m.id} message={m} />
            ))}
          </ul>
        )}

        <form onSubmit={onSubmit} className="space-y-2 border-t border-slate-200 p-3 dark:border-white/10 sm:p-4">
          {!signedInName && (
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value.slice(0, CHAT_MAX_NAME))}
              placeholder="Your display name"
              maxLength={CHAT_MAX_NAME}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
            />
          )}
          <div className="flex items-center gap-2">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, CHAT_MAX_BODY))}
              placeholder="Write a message..."
              maxLength={CHAT_MAX_BODY}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
            />
            <Button type="submit" disabled={sending || !body.trim() || !displayName}>
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">{sending ? 'Sending...' : 'Send'}</span>
            </Button>
          </div>
          <p className="text-right text-[11px] text-slate-400">{body.length}/{CHAT_MAX_BODY}</p>
        </form>
      </Card>
    </div>
  );
}
