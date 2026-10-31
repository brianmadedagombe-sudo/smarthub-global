import { FounderAvatarFrame, FounderName } from '@/components/FounderVIP';
import type { ChatMessage } from '@/lib/chat';

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatMessageRow({ message }: { message: ChatMessage }) {
  const isFounder = message.sender_role === 'founder';
  return (
    <li className="flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
      {isFounder ? (
        <FounderAvatarFrame name={message.display_name} size="sm" />
      ) : (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-200 text-sm font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
          {message.display_name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          {isFounder ? (
            <FounderName name={message.display_name} />
          ) : (
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{message.display_name}</span>
          )}
          {isFounder && (
            <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
              Founder
            </span>
          )}
          <time className="text-xs text-slate-500 dark:text-slate-400" dateTime={message.created_at}>
            {formatTime(message.created_at)}
          </time>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          {message.body}
        </p>
      </div>
    </li>
  );
}
