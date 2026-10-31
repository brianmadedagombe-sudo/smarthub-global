import { useEffect, useState } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info';
export interface ToastMsg {
  id: number;
  kind: ToastKind;
  text: string;
}

let counter = 0;
type Listener = (t: ToastMsg) => void;
const listeners = new Set<Listener>();

export function toast(text: string, kind: ToastKind = 'success') {
  const t: ToastMsg = { id: ++counter, kind, text };
  listeners.forEach((l) => l(t));
}

export function ToastHost() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => {
    const l: Listener = (t) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 3200);
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  return (
    <div className="fixed top-4 inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {items.map((t) => {
        const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? XCircle : Info;
        const tone =
          t.kind === 'success'
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
            : t.kind === 'error'
            ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
            : 'border-sky-500/40 bg-sky-500/10 text-sky-200';
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm shadow-lg backdrop-blur-md ${tone}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="max-w-xs">{t.text}</span>
          </div>
        );
      })}
    </div>
  );
}
