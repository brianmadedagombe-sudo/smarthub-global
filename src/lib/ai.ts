import { sanitize } from './security';
import { todayKey } from './storage';

// AI calls are proxied through a Supabase Edge Function so the Gemini API key
// stays server-side. The function falls back to a deterministic local generator
// if the server isn't configured or returns an error.
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

export const isAiLive = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

interface RateLimitResult {
  ok: boolean;
  remaining: number;
}

const MIN_INTERVAL_MS = 1200;
let lastCall = 0;

// Non-blocking throttle: resolves after the remaining interval so the UI stays
// responsive (the loading spinner can paint) instead of freezing the main thread.
export function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const wait = MIN_INTERVAL_MS - (now - lastCall);
  if (wait <= 0) {
    lastCall = Date.now();
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    setTimeout(() => {
      lastCall = Date.now();
      resolve();
    }, wait);
  });
}

export function canCallAi(daily: { date: string; count: number }, isPro: boolean): RateLimitResult {
  if (isPro) return { ok: true, remaining: Infinity };
  // Reset stale counts from a previous day so users on long-open tabs get
  // their fresh 3 free uses at midnight without needing a page reload.
  const today = todayKey();
  const count = daily.date === today ? daily.count : 0;
  const remaining = Math.max(0, 3 - count);
  return { ok: remaining > 0, remaining };
}

export async function generate(prompt: string, system: string): Promise<string> {
  await enforceRateLimit();
  const cleanPrompt = sanitize(prompt).slice(0, 4000);
  if (!cleanPrompt) throw new Error('Empty prompt.');
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/gemini-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ prompt: cleanPrompt, system }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.text === 'string' && data.text.trim()) {
          return data.text.trim();
        }
      }
      // Non-OK or malformed response — fall through to local generator.
      return localGenerate(cleanPrompt, system);
    } catch {
      // Network error — fall through to local generator so the user always gets a result.
      return localGenerate(cleanPrompt, system);
    }
  }
  return localGenerate(cleanPrompt, system);
}

// Local fallback generator: deterministic, no network. Produces useful, structured
// templates so every module works even without an API key.
function localGenerate(prompt: string, system: string): string {
  if (system.includes('tiktok')) {
    return [
      `🎬 TIKTOK SCRIPT — Hook in 3 seconds`,
      ``,
      `[0:00-0:03] HOOK: "Stop scrolling — here's what nobody told you about ${prompt.slice(0, 60)}.`,
      ``,
      `[0:03-0:10] SETUP: Cut to the core problem. One sentence, one pain point.`,
      ``,
      `[0:10-0:25] VALUE: 3 rapid-fire tips. On-screen captions for each.`,
      ``,
      `[0:25-0:30] CTA: "Follow for part 2 — comment 'YES' if this helped."`,
      ``,
      `💡 Shot list: close-up hook, b-roll of the tip, end-screen face cam.`,
    ].join('\n');
  }
  if (system.includes('shorts')) {
    return [
      `📺 SHORTS IDEA PACK`,
      ``,
      `1. "3 mistakes you're making with ${prompt.slice(0, 40)}" — list format, 45s.`,
      `2. "I tried ${prompt.slice(0, 40)} for 7 days" — vlog style, 60s.`,
      `3. "POV: you finally understand ${prompt.slice(0, 40)}" — trending audio.`,
      `4. "Rate these 5 ${prompt.slice(0, 30)} setups" — engagement bait, 30s.`,
      `5. "The ${prompt.slice(0, 30)} hack that saves 10 hours/week" — tutorial, 55s.`,
    ].join('\n');
  }
  if (system.includes('thread') || system.includes('x ')) {
    return [
      `🧵 X THREAD — 6 posts`,
      ``,
      `1/ I spent way too long on ${prompt.slice(0, 60)}. Here's the shortcut 🧵`,
      ``,
      `2/ First, the problem most people skip 👇`,
      ``,
      `3/ The fix is simpler than you think. 3 steps:`,
      ``,
      `4/ Step 1 — start before you're ready. Step 2 — ship ugly. Step 3 — iterate.`,
      ``,
      `5/ The result? Less overthinking, more output.`,
      ``,
      `6/ If this helped, repost the first tweet. Follow for more.`,
    ].join('\n');
  }
  if (system.includes('linkedin')) {
    return [
      `💼 LINKEDIN POST`,
      ``,
      `Here's something I learned about ${prompt.slice(0, 80)} that took me too long to admit:`,
      ``,
      `We overcomplicate the start and under-invest in the follow-through.`,
      ``,
      `Three shifts that helped:`,
      `→ Ship before it's perfect.`,
      `→ Measure outcomes, not hours.`,
      `→ Ask for feedback early, not after launch.`,
      ``,
      `What's one thing you'd add?`,
      ``,
      `#productivity #growth #lessonslearned`,
    ].join('\n');
  }
  if (system.includes('proposal') || system.includes('pitch')) {
    return [
      `📋 PROJECT PROPOSAL`,
      ``,
      `Project: ${prompt.slice(0, 80)}`,
      ``,
      `Objective`,
      `Deliver a measurable outcome that solves the client's core pain point within scope and budget.`,
      ``,
      `Scope of Work`,
      `1. Discovery & requirements alignment`,
      `2. Design and implementation`,
      `3. Review cycles and handover`,
      ``,
      `Timeline`,
      `Week 1: discovery. Weeks 2-3: build. Week 4: review & launch.`,
      ``,
      `Investment`,
      `Quoted separately based on final scope. Milestone billing available.`,
      ``,
      `Why us`,
      `Proven delivery, clear communication, and a focus on outcomes over output.`,
    ].join('\n');
  }
  if (system.includes('reminder') || system.includes('overdue')) {
    return [
      `📧 OVERDUE PAYMENT REMINDER`,
      ``,
      `Subject: Friendly reminder — invoice past due`,
      ``,
      `Hi {{client name}},`,
      ``,
      `I hope you're doing well. This is a gentle reminder that invoice {{number}} for {{amount}} is now past its due date.`,
      ``,
      `If payment has already been sent, please disregard this note. If you need a copy of the invoice or more time, just reply and I'll be happy to help.`,
      ``,
      `Thank you for your business.`,
      ``,
      `Warm regards,`,
      `{{your name}}`,
    ].join('\n');
  }
  if (system.includes('whatsapp')) {
    return [
      `💬 WHATSAPP STATUS CAPTIONS`,
      ``,
      `Caption 1:`,
      `Stop scrolling! 🛑 This changed everything about ${prompt.slice(0, 50)} 👀✨`,
      ``,
      `---`,
      ``,
      `Caption 2:`,
      `POV: you just discovered the ${prompt.slice(0, 40)} hack nobody talks about 🤯🔥`,
      ``,
      `---`,
      ``,
      `Caption 3:`,
      `3 things I wish I knew about ${prompt.slice(0, 40)} sooner 🧵👇 Share if this helped! 💯`,
    ].join('\n');
  }
  if (system.includes('email') && system.includes('pitch')) {
    return [
      `📧 EMAIL PITCH`,
      ``,
      `Subject: Quick idea that could move the needle for ${prompt.slice(0, 50)}`,
      ``,
      `Hi {{name}},`,
      ``,
      `I noticed you're working on ${prompt.slice(0, 60)}. I help teams like yours ship faster without sacrificing quality. Here's a 15-minute idea that could save your team 10+ hours a week.`,
      ``,
      `Worth a quick chat this week?`,
      ``,
      `Best,`,
      `{{your name}}`,
    ].join('\n');
  }
  if (system.includes('description') || system.includes('expand')) {
    return [
      `Expanded description for "${prompt.slice(0, 60)}":`,
      ``,
      `Professional-grade ${prompt.slice(0, 40)} service delivered with attention to detail. Includes consultation, implementation, quality assurance, and a clear handover. Suitable for one-off projects or ongoing engagements, with flexible terms and transparent pricing.`,
    ].join('\n');
  }
  return [
    `Generated draft for: ${prompt.slice(0, 120)}`,
    ``,
    `This is a local template (no API key configured). Connect a Gemini key to unlock full AI generation.`,
  ].join('\n');
}
