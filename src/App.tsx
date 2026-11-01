import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/hooks/useApp';
import { Shell } from '@/components/Shell';
import { Dashboard } from '@/modules/Dashboard';
import { InvoicingModule } from '@/modules/InvoicingModule';
import { VidiPesaModule } from '@/modules/VidiPesaModule';
import { BioLinkModule } from '@/modules/BioLinkModule';
import { ServicesModule } from '@/modules/ServicesModule';
import { QrModule } from '@/modules/QrModule';
import { PitchModule } from '@/modules/PitchModule';
import { GamerModule } from '@/modules/GamerModule';
import { NetworkModule } from '@/modules/NetworkModule';
import { PrivacyShieldModule } from '@/modules/PrivacyShieldModule';
import { CommunityModule } from '@/components/CommunityModule';
import { ChatModule } from '@/modules/ChatModule';
import { SupportModal } from '@/components/SupportModal';
import { AuthModal } from '@/components/AuthModal';
import { AccountSettings } from '@/components/AccountSettings';
import { ScheduledAlertsModal } from '@/components/ScheduledAlertsModal';
import { ToastHost, toast } from '@/components/Toast';
import { PaywallModal } from '@/components/PaywallModal';
import { ShareModal } from '@/components/ShareModal';
import { useShareModal } from '@/lib/useShareModal';
import { isAiLive } from '@/lib/ai';
import { useSession } from '@/hooks/useSession';
import { usePushEngine } from '@/hooks/usePushEngine';
import { todayKey } from '@/lib/storage';
import type { ModuleId, UserRole } from '@/lib/types';

function App() {
  const api = useApp();
  const [current, setCurrent] = useState<ModuleId>('dashboard');
  const [paywall, setPaywall] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const shareModal = useShareModal();

  const { session, profile } = useSession();
  const accountName = profile?.displayName || (session?.user.user_metadata as { name?: string } | undefined)?.name || session?.user.email || null;
  const accountRole: UserRole = profile?.role === 'founder' ? 'founder' : 'member';
  const push = usePushEngine(api.state.pushPrefs);

  // Deep-link from ?m= query param (used by PWA app shortcuts).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get('m') as ModuleId | null;
    if (m && ['invoicing', 'vidipesa', 'biolink', 'services', 'qr', 'pitch', 'gamer', 'network', 'privacy', 'community', 'chat'].includes(m)) {
      setCurrent(m);
    }
  }, []);

  // Listen for paywall-open requests from AiButton when the free quota runs out.
  useEffect(() => {
    const handler = () => setPaywall(true);
    window.addEventListener('smarthub:open-paywall', handler);
    return () => window.removeEventListener('smarthub:open-paywall', handler);
  }, []);

  // Once per session: inform the user when AI is running on the local fallback.
  useEffect(() => {
    if (!isAiLive) toast('AI is running in offline template mode. Add a Gemini key for full generation.', 'info');
  }, []);

  // Push notification: alert when AI daily credits refresh (date change detected).
  const lastAiDateRef = useRef(api.state.profile.daily.date);
  useEffect(() => {
    const today = todayKey();
    if (lastAiDateRef.current !== today) {
      lastAiDateRef.current = today;
      if (api.state.pushPrefs.enabled) {
        push.notify('AI Credits Refreshed', 'Your 3 free AI generations are back! Tap to start creating.', { tag: 'ai-credits-refresh' });
      }
    }
  }, [api.state.profile.daily.date, api.state.pushPrefs.enabled, push]);

  // Push notification: alert when a new invoice is saved.
  const invoiceCountRef = useRef(api.state.invoices.length);
  useEffect(() => {
    if (api.state.invoices.length > invoiceCountRef.current && api.state.pushPrefs.enabled) {
      push.notify('Invoice Saved', 'Your invoice has been saved to records.', { tag: 'invoice-update' });
    }
    invoiceCountRef.current = api.state.invoices.length;
  }, [api.state.invoices.length, api.state.pushPrefs.enabled, push]);

  // Push notification: alert when a tournament registration is confirmed.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ game: string }>).detail;
      if (api.state.pushPrefs.enabled) {
        push.notify('Tournament Match Starting', `Your ${detail?.game ?? 'tournament'} match is about to start! Good luck!`, { tag: 'tournament-start' });
      }
    };
    window.addEventListener('smarthub:tournament-start', handler);
    return () => window.removeEventListener('smarthub:tournament-start', handler);
  }, [api.state.pushPrefs.enabled, push]);


  const navigate = (m: ModuleId) => {
    setCurrent(m);
    const url = new URL(window.location.href);
    if (m === 'dashboard') url.searchParams.delete('m');
    else url.searchParams.set('m', m);
    window.history.replaceState({}, '', url);
  };

  return (
    <>
      <Shell
        current={current}
        onNavigate={navigate}
        theme={api.state.theme}
        onToggleTheme={api.toggleTheme}
        language={api.state.language}
        onSetLanguage={api.setLanguage}
        role={accountRole}
        isPro={api.state.profile.isPro}
        remainingAi={api.aiUsage.remaining === Infinity ? 99 : api.aiUsage.remaining}
        onOpenPaywall={() => setPaywall(true)}
        loggedIn={!!session}
        userName={accountName}
        userEmail={session?.user.email ?? null}
        onOpenAuth={() => setAuthOpen(true)}
        onOpenAccount={() => setAccountOpen(true)}
        onOpenShare={() => shareModal.setOpen(true)}
        onOpenSupport={() => setSupportOpen(true)}
        onOpenAlerts={() => setAlertsOpen(true)}
        api={api}
      >
        {current === 'dashboard' && (
          <Dashboard onNavigate={navigate} isPro={api.state.profile.isPro} remainingAi={api.aiUsage.remaining === Infinity ? 99 : api.aiUsage.remaining} onOpenShare={() => shareModal.setOpen(true)} onOpenSupport={() => setSupportOpen(true)} language={api.state.language} api={api} />
        )}
        {current === 'invoicing' && <InvoicingModule api={api} />}
        {current === 'vidipesa' && <VidiPesaModule api={api} />}
        {current === 'biolink' && <BioLinkModule api={api} />}
        {current === 'services' && <ServicesModule api={api} />}
        {current === 'qr' && <QrModule />}
        {current === 'pitch' && <PitchModule api={api} />}
        {current === 'gamer' && <GamerModule api={api} />}
        {current === 'network' && <NetworkModule />}
        {current === 'privacy' && <PrivacyShieldModule />}
        {current === 'community' && <CommunityModule api={api} />}
        {current === 'chat' && <ChatModule />}
      </Shell>

      <ToastHost />
      <PaywallModal open={paywall} onClose={() => setPaywall(false)} onProActivated={api.activatePro} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      {session && profile && (
        <AccountSettings open={accountOpen} onClose={() => setAccountOpen(false)} email={session.user.email ?? ''} profile={profile} createdAt={session.user.created_at} />
      )}
      <ShareModal open={shareModal.open} onClose={() => shareModal.setOpen(false)} />
      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} language={api.state.language} />
      <ScheduledAlertsModal open={alertsOpen} onClose={() => setAlertsOpen(false)} api={api} language={api.state.language} />
    </>
  );
}

export default App;
