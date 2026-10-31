import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2, Crown } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700 shadow-sm shadow-blue-600/30',
  secondary:
    'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  danger:
    'bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 shadow-sm shadow-rose-600/30',
  success:
    'bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 shadow-sm shadow-emerald-600/30',
};

export function Button({
  variant = 'primary',
  loading,
  icon,
  fullWidth,
  className = '',
  children,
  disabled,
  ...rest
}: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label ?? 'Working…'}
    </div>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
  );
}

export function OwnerBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const pad = size === 'sm' ? 'px-1.5 py-0.5 text-[9px] gap-1' : 'px-2 py-1 text-[11px] gap-1.5';
  const icon = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';
  return (
    <span
      className={`inline-flex items-center rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 font-bold text-amber-950 shadow-sm shadow-amber-500/30 ${pad}`}
      title="SmartHub Global App Owner & Creator"
    >
      <Crown className={icon} />
      {size === 'sm' ? 'Owner' : 'Super App Owner'}
    </span>
  );
}
