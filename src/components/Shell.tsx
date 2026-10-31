import { type ReactNode, useState } from 'react';
import {
  Banknote,
  Crown,
  Gamepad2,
  Globe,
  LayoutGrid,
  Link2,
  LifeBuoy,
  ListChecks,
  Menu,
  Moon,
  QrCode,
  Share2,
  Sparkles,
  Sun,
  Users,
  Video,
  Wifi,
  X,
  LogIn,
  UserCircle,
  AlarmClock,
  MessagesSquare,
} from 'lucide-react';
import type { ModuleId, Theme, Language, UserRole } from '@/lib/types';
import { isOwnerEmail } from '@/lib/config';
import { translate } from '@/lib/i18n';
import { NotificationBell } from '@/components/NotificationBell';
import type { AppApi } from '@/hooks/useApp';

interface NavItem {
  id: ModuleId;
  label: string;
  icon: typeof LayoutGrid;
  desc: string;
  accent: string;
}

export const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, desc: 'Overview', accent: 'text-blue-500' },
  { id: 'invoicing', label: 'BillSync', icon: Banknote, desc: 'Invoices & quotes', accent: 'text-emerald-500' },
  { id: 'vidipesa', label: 'VidiPesa', icon: Video, desc: 'AI repurposer', accent: 'text-rose-500' },
  { id: 'biolink', label: 'Bio-Link', icon: Link2, desc: 'Storefront', accent: 'text-sky-500' },
  { id: 'services', label: 'Services', icon: Users, desc: 'Local directory', accent: 'text-amber-500' },
  { id: 'qr', label: 'QR Studio', icon: QrCode, desc: 'QR generator', accent: 'text-violet-500' },
  { id: 'pitch', label: 'AI Pitch', icon: ListChecks, desc: 'Proposals & reminders', accent: 'text-fuchsia-500' },
  { id: 'gamer', label: 'Gamer Hub', icon: Gamepad2, desc: 'Challenges & rewards', accent: 'text-cyan-500' },
  { id: 'network', label: 'Network Tools', icon: Wifi, desc: 'Speed, ping & DNS', accent: 'text-teal-500' },
  { id: 'chat', label: 'Global Chat', icon: MessagesSquare, desc: 'Live community chat', accent: 'text-sky-500' },
  { id: 'community', label: 'Community', icon: Users, desc: 'Reports & support', accent: 'text-fuchsia-500' },
];

interface ShellProps {
  current: ModuleId;
  onNavigate: (m: ModuleId) => void;
  theme: Theme;
  onToggleTheme: () => void;
  language: Language;
  onSetLanguage: (l: Language) => void;
  role: UserRole;
  isPro: boolean;
  remainingAi: number;
  onOpenPaywall: () => void;
  loggedIn: boolean;
  userName: string | null;
  userEmail: string | null;
  onOpenAuth: () => void;
  onOpenAccount: () => void;
  onOpenShare: () => void;
  onOpenSupport: () => void;
  onOpenAlerts: () => void;
  api: AppApi;
  children: ReactNode;
}

export function Shell({
  current,
  onNavigate,
  theme,
  onToggleTheme,
  language,
  onSetLanguage,
  role,
  isPro,
  remainingAi,
  onOpenPaywall,
  loggedIn,
  userName,
  userEmail,
  onOpenAuth,
  onOpenAccount,
  onOpenShare,
  onOpenSupport,
  onOpenAlerts,
  api,
  children,
}: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const isFounder = role === 'founder';

  const go = (m: ModuleId) => {
    onNavigate(m);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 safe-area-left safe-area-right safe-area-top">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <button onClick={() => go('dashboard')} className="flex min-w-0 items-center gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-md shadow-blue-600/30">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 text-left leading-tight">
                <div className={`truncate text-sm font-bold tracking-tight ${isFounder ? 'founder-name' : ''}`}>SmartHub Global</div>
                <div className="truncate text-[10px] uppercase tracking-wider text-slate-400">{translate('header.tagline', language)}</div>
              </div>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              onClick={onOpenPaywall}
              className="hidden items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold sm:flex dark:border-slate-700"
              title="AI uses left today"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              {isPro ? (
                <span className="text-emerald-600 dark:text-emerald-400">{translate('header.proUnlimited', language)}</span>
              ) : (
                <span>{remainingAi} {translate('header.freeLeft', language)}</span>
              )}
            </button>
            <NotificationBell api={api} language={language} />
            <div className="relative shrink-0">
              <button
                onClick={() => setLangOpen((v) => !v)}
                className="flex items-center gap-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={translate('header.language', language)}
                title={translate('header.language', language)}
              >
                <Globe className="h-5 w-5" />
                <span className="hidden text-[10px] font-bold uppercase sm:inline">{language}</span>
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full z-[70] mt-1 w-32 rounded-xl border border-slate-200 bg-white py-1 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                  {(['en', 'sw'] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => { onSetLanguage(l); setLangOpen(false); }}
                      className={`flex w-full items-center justify-between px-3 py-1.5 text-xs font-semibold transition ${language === l ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                    >
                      {l === 'en' ? 'English' : 'Kiswahili'}
                      {language === l && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={onOpenAlerts}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={translate('alerts.title', language)}
              title={translate('alerts.title', language)}
            >
              <AlarmClock className="h-5 w-5" />
            </button>
            <button
              onClick={onOpenSupport}
              className="hidden rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 sm:block dark:hover:bg-slate-800"
              aria-label={translate('support.title', language)}
              title={translate('support.title', language)}
            >
              <LifeBuoy className="h-5 w-5" />
            </button>
            <button
              onClick={onToggleTheme}
              className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 sm:block dark:hover:bg-slate-800"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={onOpenShare}
              className="hidden rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 sm:block dark:hover:bg-slate-800"
              aria-label="Share app"
              title="Share SmartHub Global"
            >
              <Share2 className="h-5 w-5" />
            </button>
            {loggedIn ? (
              <button
                onClick={onOpenAccount}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold dark:border-slate-700 ${isFounder ? 'founder-frame border-amber-400/40' : 'border-slate-200'}`}
                title={translate('header.account', language)}
              >
                {isFounder ? (
                  <span className="founder-crown grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-amber-950">
                    <Crown className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <UserCircle className="h-4 w-4 text-blue-500" />
                )}
                <span className={`hidden truncate sm:inline ${isFounder ? 'founder-name' : ''}`}>{userName ?? 'Account'}</span>
                {userEmail && isOwnerEmail(userEmail) && !isFounder && (
                  <Crown className="h-3.5 w-3.5 text-amber-500" aria-label="App Owner" />
                )}
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>{translate('header.login', language)}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Desktop sidebar */}
        <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-60 shrink-0 border-r border-slate-200 p-3 lg:block dark:border-slate-800">
          <nav className="space-y-1">
            {NAV.map((n) => (
              <NavButton key={n.id} item={n} active={current === n.id} onClick={() => go(n.id)} />
            ))}
          </nav>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] overflow-y-auto border-r border-slate-200 bg-white p-3 shadow-2xl safe-area-top dark:border-slate-800 dark:bg-slate-900">
              <nav className="space-y-1">
                {NAV.map((n) => (
                  <NavButton key={n.id} item={n} active={current === n.id} onClick={() => go(n.id)} />
                ))}
              </nav>
              <div className="mt-4 space-y-1 border-t border-slate-200 pt-3 dark:border-slate-800">
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Actions</div>
                <button
                  onClick={() => { onToggleTheme(); setMobileOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  <span className="font-semibold">{theme === 'dark' ? (language === 'sw' ? 'Mwanga' : 'Light Mode') : (language === 'sw' ? 'Giza' : 'Dark Mode')}</span>
                </button>
                <button
                  onClick={() => { onOpenShare(); setMobileOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Share2 className="h-5 w-5" />
                  <span className="font-semibold">Share App</span>
                </button>
                <button
                  onClick={() => { onOpenSupport(); setMobileOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <LifeBuoy className="h-5 w-5" />
                  <span className="font-semibold">{translate('support.title', language)}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main */}
        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 pb-28 lg:pb-6 safe-area-left safe-area-right">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 w-full border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden safe-area-bottom dark:border-slate-800 dark:bg-slate-950/95" style={{ boxSizing: 'border-box' }}>
        <div className="grid grid-cols-5 gap-1 px-2 py-1.5">
          {NAV.slice(0, 4).map((n) => {
            const Icon = n.icon;
            const active = current === n.id;
            return (
              <button
                key={n.id}
                onClick={() => go(n.id)}
                className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium ${active ? n.accent : 'text-slate-400'}`}
              >
                <Icon className="h-5 w-5" />
                {n.label.split(' ')[0]}
              </button>
            );
          })}
          <button
            onClick={() => setMobileOpen(true)}
            className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium ${NAV.slice(0, 4).some((n) => n.id === current) ? 'text-slate-400' : 'text-blue-500'}`}
          >
            <Menu className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>
    </div>
  );
}

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
        active
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? '' : item.accent}`} />
      <span className="flex-1">
        <span className="block font-semibold leading-tight">{item.label}</span>
        <span className="block text-[11px] text-slate-400">{item.desc}</span>
      </span>
    </button>
  );
}


