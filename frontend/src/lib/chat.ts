import { supabase } from '@/lib/supabase';

export const CHAT_MAX_BODY = 500;
export const CHAT_MAX_NAME = 24;
const CHAT_MIN_INTERVAL_MS = 1500;
const GUEST_KEY_STORAGE = 'smarthub_chat_guest_key';
const CHAT_COLUMNS = 'id, display_name, body, sender_role, created_at';

export type ChatSenderRole = 'member' | 'founder';

export interface ChatMessage {
  id: string;
  display_name: string;
  body: string;
  sender_role: ChatSenderRole;
  created_at: string;
}

export function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.display_name === 'string' &&
    typeof row.body === 'string' &&
    (row.sender_role === 'member' || row.sender_role === 'founder') &&
    typeof row.created_at === 'string'
  );
}

function getGuestKey(): string {
  let key = localStorage.getItem(GUEST_KEY_STORAGE);
  if (!key || key.length < 16 || key.length > 64) {
    key = crypto.randomUUID();
    localStorage.setItem(GUEST_KEY_STORAGE, key);
  }
  return key;
}

export async function fetchRecentMessages(limit = 60): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(CHAT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error('Chat messages could not be loaded. Please refresh the page.');
  return (data ?? []).filter(isChatMessage).reverse();
}

let lastSentAt = 0;

export async function sendChatMessage(displayName: string, body: string): Promise<void> {
  const now = Date.now();
  if (now - lastSentAt < CHAT_MIN_INTERVAL_MS) {
    throw new Error('Wait a moment before sending another message.');
  }
  lastSentAt = now;

  const { error } = await supabase.from('chat_messages').insert({
    display_name: displayName,
    body,
    guest_key: getGuestKey(),
  });
  if (error) {
    if (error.message.toLowerCase().includes('rate limit')) {
      throw new Error('You are sending messages too quickly. Wait a few seconds and try again.');
    }
    throw new Error('Your message could not be sent. Please try again.');
  }
}
