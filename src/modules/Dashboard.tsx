import { ArrowRight, Sparkles, ShieldCheck, Zap, MessageCircle, Facebook, LifeBuoy, Share2 } from 'lucide-react';
import { NAV } from '@/components/Shell';
import type { ModuleId, Language } from '@/lib/types';
import type { AppApi } from '@/hooks/useApp';
import { Card } from '@/components/ui';
import { FounderAppreciationCard, FounderAvatarFrame, FounderName } from '@/components/FounderVIP';
import { WalletCard } from '@/components/WalletCard';
import { DailyStreakWidget } from '@/components/DailyStreakWidget';
import { ReferralCard } from '@/components/ReferralCard';
import { translate } from '@/lib/i18n';
import { COMMUNITY_LINKS } from '@/lib/config';

interface DashboardProps {
  onNavigate: (m: ModuleId) => void;
  isPro: boolean;
  remainingAi: number;
  onOpenShare: () => void;
  onOpenSupport: () => void;
  language: Language;
  api: AppApi;
}

export function Dashboard({ onNavigate, isPro, remainingAi, onOpenShare, onOpenSupport, language, api }: DashboardProps) {
  const lang = language;
  const isFounder = api.state.role === 'founder';
  const ownerName = api.state.bio.displayName || (lang === 'sw' ? 'Mwanzilishi' : 'Founder');

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-sky-600 p-6 text-white sm:p-10">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-8 h-56 w-56 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> {translate('header.tagline', lang)} · PWA
          </div>
          <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            {translate('dash.heroTitle', lang)}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-blue-100 sm:text-base">
            {translate('dash.heroSub', lang)}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('invoicing')}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-700 shadow-lg transition hover:bg-blue-50"
            >
              {translate('dash.startInvoice', lang)} <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNavigate('vidipesa')}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/25"
            >
              {translate('dash.repurpose', lang)} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Status strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={Zap} label={translate('dash.aiUses', lang)} value={isPro ? (lang === 'sw' ? 'Isiyokuwa kikomo' : 'Unlimited') : `${remainingAi} / 3`} accent="text-amber-500" />
        <StatCard icon={ShieldCheck} label={translate('dash.plan', lang)} value={isPro ? 'Pro' : 'Free'} accent="text-emerald-500" />
        <StatCard icon={Sparkles} label={translate('dash.modules', lang)} value={String(NAV.filter((n) => n.id !== 'dashboard').length)} accent="text-blue-500" />
      </div>

      {/* Wallet quick view */}
      <WalletCard api={api} />

      {/* Daily streak check-in */}
      <DailyStreakWidget api={api} />

      {/* Viral referral engine */}
      <ReferralCard api={api} />

      {/* Founder profile + appreciation (server-verified role only) */}
      {isFounder && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-50 to-cyan-50 p-4 dark:from-amber-500/10 dark:to-cyan-500/10">
            <FounderAvatarFrame name={ownerName} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <FounderName name={ownerName} />
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950">
                  {translate('founder.verified', lang)}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'sw' ? 'Mwanzilishi anayethibitishwa — asante kwa kuunga mkono SmartHub.' : 'Verified founder — thank you for backing SmartHub.'}
              </div>
            </div>
          </div>
          <FounderAppreciationCard api={api} fromName={ownerName} />
        </div>
      )}

      {/* Module grid */}
      <div>
        <h2 className="mb-3 text-lg font-bold tracking-tight">{translate('dash.yourTools', lang)}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NAV.filter((n) => n.id !== 'dashboard' && n.id !== 'community').map((n) => {
            const Icon = n.icon;
            return (
              <button key={n.id} onClick={() => onNavigate(n.id)} className="group text-left">
                <Card className="h-full transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-11 w-11 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 ${n.accent}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{n.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{n.desc}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      </div>

      {/* Community & Support — masked contacts */}
      <div>
        <h2 className="mb-3 text-lg font-bold tracking-tight">{translate('dash.communitySupport', lang)}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CommunityLink
            href={COMMUNITY_LINKS.whatsapp}
            icon={<MessageCircle className="h-5 w-5 text-emerald-500" />}
            label={translate('dash.whatsapp', lang)}
            hint={lang === 'sw' ? 'Jiunge na jumuiya' : 'Join the community'}
          />
          <CommunityLink
            href={COMMUNITY_LINKS.facebook}
            icon={<Facebook className="h-5 w-5 text-blue-600" />}
            label={translate('dash.facebook', lang)}
            hint={lang === 'sw' ? 'Ungana na wanachama' : 'Connect with members'}
          />
          {/* Support is now an in-app modal — no raw email/phone exposed */}
          <button onClick={onOpenSupport} className="group text-left">
            <Card className="h-full transition group-hover:-translate-y-0.5 group-hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  <LifeBuoy className="h-5 w-5 text-rose-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{translate('dash.support', lang)}</div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">{translate('dash.openSupport', lang)}</div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
              </div>
            </Card>
          </button>
          <button onClick={onOpenShare} className="group text-left">
            <Card className="h-full transition group-hover:-translate-y-0.5 group-hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  <Share2 className="h-5 w-5 text-cyan-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{translate('dash.shareApp', lang)}</div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">{lang === 'sw' ? 'Sambaza' : 'Spread the word'}</div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
              </div>
            </Card>
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof Sparkles; label: string; value: string; accent: string }) {
  return (
    <Card className="flex items-center gap-3">
      <div className={`grid h-10 w-10 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
        <div className="font-bold">{value}</div>
      </div>
    </Card>
  );
}

function CommunityLink({ href, icon, label, hint }: { href: string; icon: React.ReactNode; label: string; hint: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="group block">
      <Card className="h-full transition group-hover:-translate-y-0.5 group-hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{label}</div>
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">{hint}</div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
        </div>
      </Card>
    </a>
  );
}
