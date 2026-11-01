import { useState } from 'react';
import { Gift, Copy, Check, Users, Coins, Share2, UserPlus } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import { Card, Button } from '@/components/ui';
import { toast } from '@/components/Toast';

export function ReferralCard({ api }: { api: AppApi }) {
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const code = api.ensureReferralCode();
  const referral = api.state.referral;
  const link = `${window.location.origin}?ref=${code}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      api.recordReferralCopy();
      toast('Referral link copied! Share it to earn Hub Coins.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Could not copy. Long-press the link to copy manually.', 'error');
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SmartHub Global',
          text: 'Join me on SmartHub Global — the all-in-one super app for creators and businesses!',
          url: link,
        });
        api.recordReferralCopy();
      } catch {
        /* user cancelled share */
      }
    } else {
      copyLink();
    }
  };

  const simulateSignup = async () => {
    setSimulating(true);
    setTimeout(async () => {
      const result = await api.simulateReferralSignup();
      if (result.success) {
        toast(`Referral bonus! +${result.coins} Hub Coins added to your wallet.`, 'success');
      } else {
        toast('Could not process referral bonus. Try again.', 'error');
      }
      setSimulating(false);
    }, 1200);
  };

  return (
    <Card className="space-y-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <Gift className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Invite &amp; Earn</div>
            <div className="text-lg font-bold">Refer Friends, Earn Coins</div>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
          <Coins className="h-3.5 w-3.5" /> +25 per referral
        </div>
      </div>

      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
        <div className="text-[10px] uppercase tracking-wide text-slate-400">Your unique referral link</div>
        <div className="mt-1 flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-white px-2.5 py-1.5 font-mono text-xs dark:bg-slate-900">{link}</code>
          <button
            onClick={copyLink}
            className="shrink-0 rounded-lg bg-blue-600 p-2 text-white transition hover:bg-blue-500"
            title="Copy link"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" fullWidth onClick={shareLink} icon={<Share2 className="h-4 w-4" />} className="text-xs">
          Share Link
        </Button>
        <Button fullWidth onClick={simulateSignup} loading={simulating} icon={<UserPlus className="h-4 w-4" />} className="text-xs">
          Simulate Signup
        </Button>
      </div>

      {(referral.totalReferrals > 0 || referral.totalCoinsEarned > 0) && (
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="rounded-lg bg-slate-50 py-2.5 dark:bg-slate-800/60">
            <div className="flex items-center justify-center gap-1 font-bold text-blue-500">
              <Users className="h-3.5 w-3.5" /> {referral.totalReferrals}
            </div>
            <div className="text-slate-400">Friends Referred</div>
          </div>
          <div className="rounded-lg bg-slate-50 py-2.5 dark:bg-slate-800/60">
            <div className="flex items-center justify-center gap-1 font-bold text-amber-500">
              <Coins className="h-3.5 w-3.5" /> {referral.totalCoinsEarned}
            </div>
            <div className="text-slate-400">Coins Earned</div>
          </div>
        </div>
      )}

      <p className="text-center text-[10px] text-slate-400">
        When someone joins SmartHub using your link, you both earn 25 Hub Coins as a bonus.
      </p>
    </Card>
  );
}
