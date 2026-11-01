import { useState } from 'react';
import { Flame, Coins, Gift, Check } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import { Card, Button } from '@/components/ui';
import { toast } from '@/components/Toast';
import { todayKey } from '@/lib/storage';

export function DailyStreakWidget({ api }: { api: AppApi }) {
  const [claiming, setClaiming] = useState(false);
  const streak = api.state.dailyStreak;
  const today = todayKey();
  const alreadyClaimed = streak.lastClaimDate === today;

  const claim = async () => {
    setClaiming(true);
    try {
      const result = await api.claimDailyStreak();
      if (result.alreadyClaimed) {
        toast("You've already claimed today's check-in. Come back tomorrow!", 'info');
      } else if (result.success) {
        toast(`Day ${result.streak} claimed! +${result.coins} Hub Coins added to your wallet.`, 'success');
      } else {
        toast('Could not claim. Please try again.', 'error');
      }
    } catch {
      toast('Something went wrong. Please try again.', 'error');
    } finally {
      setClaiming(false);
    }
  };

  const coinsToday = Math.min(10 + streak.currentStreak * 5, 50);

  return (
    <Card className="space-y-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`grid h-11 w-11 place-items-center rounded-xl ${alreadyClaimed ? 'bg-emerald-100 dark:bg-emerald-500/15' : 'bg-orange-100 dark:bg-orange-500/15'}`}>
            <Flame className={`h-6 w-6 ${alreadyClaimed ? 'text-emerald-500' : 'text-orange-500'}`} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Daily Check-In</div>
            <div className="text-lg font-bold">
              {alreadyClaimed ? 'Claimed Today' : 'Ready to Claim'}
            </div>
          </div>
        </div>
        {streak.currentStreak > 0 && (
          <div className="text-right">
            <div className="text-2xl font-extrabold text-orange-500">{streak.currentStreak}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-400">Day Streak</div>
          </div>
        )}
      </div>

      {/* Streak visual */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 7 }).map((_, i) => {
          const dayNum = i + 1;
          const filled = streak.currentStreak >= dayNum;
          const isToday = streak.currentStreak === dayNum && !alreadyClaimed;
          return (
            <div
              key={i}
              className={`flex h-9 flex-1 flex-col items-center justify-center rounded-lg text-xs font-bold transition ${
                filled
                  ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white'
                  : isToday
                  ? 'border-2 border-orange-400 text-orange-500'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
              }`}
            >
              {filled ? <Check className="h-4 w-4" /> : dayNum}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-amber-500" />
          <div>
            <div className="text-xs text-slate-400">Today's Reward</div>
            <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
              +{alreadyClaimed ? coinsToday : Math.min(10 + streak.currentStreak * 5, 50)} Hub Coins
            </div>
          </div>
        </div>
        <Button
          onClick={claim}
          loading={claiming}
          disabled={alreadyClaimed}
          variant={alreadyClaimed ? 'secondary' : 'success'}
          icon={alreadyClaimed ? <Check className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
          className="text-xs"
        >
          {alreadyClaimed ? 'Claimed' : 'Claim'}
        </Button>
      </div>

      {(streak.longestStreak > 0 || streak.totalCoinsEarned > 0) && (
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-slate-50 py-2 dark:bg-slate-800/60">
            <div className="font-bold text-orange-500">{streak.longestStreak}</div>
            <div className="text-slate-400">Best Streak</div>
          </div>
          <div className="rounded-lg bg-slate-50 py-2 dark:bg-slate-800/60">
            <div className="font-bold text-amber-500">{streak.totalClaims}</div>
            <div className="text-slate-400">Total Claims</div>
          </div>
          <div className="rounded-lg bg-slate-50 py-2 dark:bg-slate-800/60">
            <div className="font-bold text-emerald-500">{streak.totalCoinsEarned}</div>
            <div className="text-slate-400">Coins Earned</div>
          </div>
        </div>
      )}
    </Card>
  );
}
