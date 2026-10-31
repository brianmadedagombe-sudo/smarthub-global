import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from './ui';
import { toast } from './Toast';
import { canCallAi, generate } from '@/lib/ai';
import type { AppApi } from '@/hooks/useApp';

interface AiButtonProps {
  api: AppApi;
  prompt: string;
  system: string;
  onResult: (text: string) => void;
  children: React.ReactNode;
  label?: string;
}

// Shared AI action button: enforces free-tier limit, records usage, and routes to
// the paywall when the daily free quota is exhausted.
export function AiButton({ api, prompt, system, onResult, children, label = 'Generate' }: AiButtonProps) {
  const [loading, setLoading] = useState(false);

  const run = async () => {
    const gate = canCallAi(api.state.profile.daily, api.state.profile.isPro);
    if (!gate.ok) {
      toast('Daily free AI uses are up. Upgrade to Pro for unlimited.', 'info');
      window.dispatchEvent(new CustomEvent('smarthub:open-paywall'));
      return;
    }
    setLoading(true);
    try {
      const text = await generate(prompt, system);
      api.recordAiUse();
      onResult(text);
    } catch {
      toast('Generation failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="primary" loading={loading} onClick={run} icon={<Sparkles className="h-4 w-4" />}>
      {children ?? label}
    </Button>
  );
}
