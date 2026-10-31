import { useState } from 'react';
import { Crown, Heart, Coffee, Gem, Sparkles, Pin, PinOff, Trash2, Settings, Send, X, Printer, FileText, Flame, ThumbsUp } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import type { RespectTheme, Language, RespectReactionType } from '@/lib/types';
import { Card, Button, inputClass, Field } from '@/components/ui';
import { toast } from '@/components/Toast';
import { translate } from '@/lib/i18n';
import { sanitize } from '@/lib/security';
import { printDocument, buildPrintDocument } from '@/lib/print';
import { useWallet } from '@/hooks/useWallet';
import { spendHubCoins, WalletError } from '@/lib/wallet';

interface FounderFrameProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export function FounderAvatarFrame({ name, size = 'md' }: FounderFrameProps) {
  const dim = size === 'sm' ? 'h-9 w-9 text-sm' : size === 'lg' ? 'h-16 w-16 text-2xl' : 'h-12 w-12 text-lg';
  const crown = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  return (
    <div className="founder-frame relative inline-grid place-items-center">
      <div className={`founder-glow ${dim} grid place-items-center rounded-full bg-gradient-to-br from-slate-900 to-slate-700 font-bold text-amber-300 dark:from-slate-800 dark:to-slate-900`}>
        {name.charAt(0).toUpperCase()}
      </div>
      <span className="founder-crown absolute -top-2 -right-1 grid place-items-center rounded-full bg-amber-400 text-amber-950 shadow-md shadow-amber-500/40" title="Founder · Verified">
        <Crown className={crown} />
      </span>
    </div>
  );
}

export function FounderName({ name }: { name: string }) {
  return <span className="founder-name font-bold tracking-tight">{name}</span>;
}

const THEME_COLORS: Record<RespectTheme, { ring: string; bg: string; text: string; dot: string }> = {
  gold: { ring: 'ring-amber-400/40', bg: 'from-amber-500/10 to-yellow-500/5', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-400' },
  cyan: { ring: 'ring-cyan-400/40', bg: 'from-cyan-500/10 to-blue-500/5', text: 'text-cyan-600 dark:text-cyan-400', dot: 'bg-cyan-400' },
  rose: { ring: 'ring-rose-400/40', bg: 'from-rose-500/10 to-pink-500/5', text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-400' },
  emerald: { ring: 'ring-emerald-400/40', bg: 'from-emerald-500/10 to-green-500/5', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-400' },
};

const THEME_KEYS: RespectTheme[] = ['gold', 'cyan', 'rose', 'emerald'];

const REACTIONS: { type: RespectReactionType; icon: typeof Heart; cls: string; key: string }[] = [
  { type: 'heart', icon: Heart, cls: 'text-rose-500', key: 'founder.reactHeart' },
  { type: 'fire', icon: Flame, cls: 'text-orange-500', key: 'founder.reactFire' },
  { type: 'clap', icon: ThumbsUp, cls: 'text-blue-500', key: 'founder.reactClap' },
  { type: 'crown', icon: Crown, cls: 'text-amber-500', key: 'founder.reactCrown' },
];

function themeLabel(theme: RespectTheme, lang: Language): string {
  const map: Record<RespectTheme, string> = {
    gold: translate('founder.themeGold', lang),
    cyan: translate('founder.themeCyan', lang),
    rose: translate('founder.themeRose', lang),
    emerald: translate('founder.themeEmerald', lang),
  };
  return map[theme];
}

export function FounderAppreciationCard({ api, fromName }: { api: AppApi; fromName: string }) {
  const lang = api.state.language;
  const { snapshot, refresh: refreshWallet } = useWallet();
  const coins = snapshot?.hubCoins ?? 0;
  const cfg = api.state.respectWallConfig;
  const [showSettings, setShowSettings] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMsg, setCustomMsg] = useState('');
  const [customColor, setCustomColor] = useState<RespectTheme>('gold');
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null);

  const thanks = () => {
    const msg = lang === 'sw' ? 'Asante kwa msaada wako!' : 'Thank you for your work!';
    api.sendRespect(fromName || (lang === 'sw' ? 'Mgumiaji' : 'Member'), sanitize(msg), 'gold');
    toast(translate('founder.respectSent', lang));
  };

  const tip = async (amount: number, kind: 'coffee' | 'crown') => {
    if (coins < amount) {
      toast(translate('founder.insufficientCoins', lang), 'error');
      return;
    }
    try {
      await spendHubCoins(amount, 'tip');
    } catch (err) {
      toast(err instanceof WalletError ? err.message : translate('founder.insufficientCoins', lang), 'error');
      void refreshWallet();
      return;
    }
    api.recordTip(fromName || 'Member', amount, kind);
    void refreshWallet();
    toast(translate('founder.tipped', lang));
  };

  const sendCustom = () => {
    const msg = sanitize(customMsg);
    if (!msg) {
      toast(translate('founder.respectMessageRequired', lang), 'error');
      return;
    }
    api.sendRespect(sanitize(customName) || fromName || (lang === 'sw' ? 'Mgumiaji' : 'Member'), msg, customColor);
    toast(translate('founder.respectSent', lang));
    setCustomMsg('');
    setShowCustom(false);
  };

  const react = (entryId: string, type: RespectReactionType) => {
    api.addRespectReaction(entryId, type, fromName || (lang === 'sw' ? 'Mgumiaji' : 'Member'));
    setShowReactionsFor(null);
  };

  const sorted = [...api.state.respect].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  const exportPrint = () => {
    if (sorted.length === 0) {
      toast(translate('founder.exportEmpty', lang), 'error');
      return;
    }
    const rows = sorted.map((r) => `
      <tr>
        <td>${r.fromName}</td>
        <td>${r.message}</td>
        <td>${r.reactions.length}</td>
        <td>${r.pinned ? translate('founder.exportYes', lang) : translate('founder.exportNo', lang)}</td>
        <td>${new Date(r.createdAt).toLocaleString(lang === 'sw' ? 'sw-KE' : 'en-US')}</td>
      </tr>
    `).join('');
    const body = `
      <h1>${sanitize(cfg.title || translate('founder.respectWall', lang))}</h1>
      <p class="subtitle">${sorted.length} ${lang === 'sw' ? 'maingizo' : 'entries'} · ${new Date().toLocaleDateString(lang === 'sw' ? 'sw-KE' : 'en-US')}</p>
      <table>
        <thead>
          <tr>
            <th>${translate('founder.exportFrom', lang)}</th>
            <th>${translate('founder.exportMessage', lang)}</th>
            <th>${translate('founder.reactions', lang)}</th>
            <th>${translate('founder.exportPinned', lang)}</th>
            <th>${translate('founder.exportDate', lang)}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    printDocument({ html: buildPrintDocument(cfg.title || translate('founder.respectWall', lang), body) })
      .then(() => toast(translate('founder.exportSuccess', lang)))
      .catch(() => toast(translate('founder.exportEmpty', lang), 'error'));
  };

  const exportCsv = () => {
    if (sorted.length === 0) {
      toast(translate('founder.exportEmpty', lang), 'error');
      return;
    }
    const headers = [
      translate('founder.exportFrom', lang),
      translate('founder.exportMessage', lang),
      translate('founder.reactions', lang),
      translate('founder.exportPinned', lang),
      translate('founder.exportDate', lang),
    ];
    const escapeCsv = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines = [headers.map(escapeCsv).join(',')];
    sorted.forEach((r) => {
      lines.push([
        escapeCsv(r.fromName),
        escapeCsv(r.message),
        escapeCsv(String(r.reactions.length)),
        escapeCsv(r.pinned ? translate('founder.exportYes', lang) : translate('founder.exportNo', lang)),
        escapeCsv(new Date(r.createdAt).toLocaleString(lang === 'sw' ? 'sw-KE' : 'en-US')),
      ].join(','));
    });
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respect-wall-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(translate('founder.exportSuccess', lang));
  };

  return (
    <Card className="founder-card space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h3 className="founder-name text-base font-bold">{translate('founder.appreciation', lang)}</h3>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={thanks}
          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-400 active:scale-95"
        >
          <Heart className="h-4 w-4" /> {translate('founder.sendThanks', lang)} (+1 Respect)
        </button>
        <button
          onClick={() => tip(50, 'coffee')}
          disabled={coins < 50}
          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-amber-950 transition hover:bg-amber-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Coffee className="h-4 w-4" /> {translate('founder.tipCoffee', lang)}
        </button>
        <button
          onClick={() => tip(200, 'crown')}
          disabled={coins < 200}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Gem className="h-4 w-4" /> {translate('founder.tipCrown', lang)}
        </button>
      </div>

      {/* Respect Wall */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Heart className="h-3.5 w-3.5" />
            {cfg.title || translate('founder.respectWall', lang)}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setShowCustom((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
            >
              <Send className="h-3 w-3" /> {translate('founder.respectSendCustom', lang)}
            </button>
            <button
              onClick={exportPrint}
              title={translate('founder.exportPrint', lang)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Printer className="h-3 w-3" /> {translate('founder.exportPrint', lang)}
            </button>
            <button
              onClick={exportCsv}
              title={translate('founder.exportCsv', lang)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <FileText className="h-3 w-3" /> CSV
            </button>
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Settings className="h-3 w-3" /> {translate('founder.respectWallSettings', lang)}
            </button>
          </div>
        </div>

        {/* Custom respect form */}
        {showCustom && (
          <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">{translate('founder.respectSendCustom', lang)}</span>
              <button onClick={() => setShowCustom(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className={inputClass}
                placeholder={translate('founder.respectYourName', lang)}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <div className="flex items-center gap-1.5">
                {THEME_KEYS.map((th) => (
                  <button
                    key={th}
                    onClick={() => setCustomColor(th)}
                    title={themeLabel(th, lang)}
                    className={`h-8 w-8 rounded-full transition ring-2 ${THEME_COLORS[th].dot} ${
                      customColor === th ? 'ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-110' : 'ring-transparent opacity-50'
                    }`}
                  />
                ))}
              </div>
            </div>
            <input
              className={inputClass}
              placeholder={translate('founder.respectMessage', lang)}
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              maxLength={120}
            />
            <Button onClick={sendCustom} className="px-3 py-1.5 text-xs" icon={<Send className="h-3.5 w-3.5" />}>
              {translate('founder.respectSend', lang)}
            </Button>
          </div>
        )}

        {/* Wall settings panel */}
        {showSettings && (
          <div className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">{translate('founder.respectWallSettings', lang)}</span>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <Field label={translate('founder.respectWallTitle', lang)}>
              <input
                className={inputClass}
                value={cfg.title}
                maxLength={40}
                onChange={(e) => api.setRespectWallConfig({ title: e.target.value })}
              />
            </Field>
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {translate('founder.respectWallTheme', lang)}
              </div>
              <div className="flex gap-2">
                {THEME_KEYS.map((th) => (
                  <button
                    key={th}
                    onClick={() => api.setRespectWallConfig({ theme: th })}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      cfg.theme === th
                        ? 'bg-slate-900 text-white dark:bg-blue-600'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${THEME_COLORS[th].dot}`} />
                    {themeLabel(th, lang)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">{translate('founder.respectWallAvatars', lang)}</span>
              <button
                onClick={() => api.setRespectWallConfig({ showAvatars: !cfg.showAvatars })}
                className={`relative h-6 w-11 rounded-full transition ${cfg.showAvatars ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${cfg.showAvatars ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
            <Field label={translate('founder.respectWallMaxEntries', lang)}>
              <input
                className={inputClass}
                type="number"
                min={5}
                max={100}
                value={cfg.maxEntries}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (Number.isFinite(v)) api.setRespectWallConfig({ maxEntries: Math.max(5, Math.min(100, v)) });
                }}
              />
            </Field>
          </div>
        )}

        {/* Wall entries */}
        {sorted.length === 0 ? (
          <p className="py-3 text-center text-xs text-slate-400">{translate('founder.respectWallEmpty', lang)}</p>
        ) : (
          <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {sorted.map((r) => {
              const colors = THEME_COLORS[r.color] ?? THEME_COLORS.gold;
              return (
                <li
                  key={r.id}
                  className={`group rounded-lg bg-gradient-to-r ${colors.bg} px-3 py-2 ring-1 ${colors.ring} ${r.pinned ? 'ring-2' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {cfg.showAvatars && (
                      <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${colors.dot} text-[10px] font-bold text-white`}>
                        {r.fromName.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold">{r.fromName}</span>
                        {r.pinned && (
                          <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold ${colors.text}`}>
                            <Pin className="h-2.5 w-2.5" /> {translate('founder.respectPinned', lang)}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{r.message}</p>

                      {/* Reaction display + picker */}
                      <div className="mt-1 flex items-center gap-1.5">
                        {r.reactions.length > 0 && (
                          <div className="flex items-center gap-0.5">
                            {REACTIONS.map((rxn) => {
                              const count = r.reactions.filter((x) => x.type === rxn.type).length;
                              if (count === 0) return null;
                              const RxnIcon = rxn.icon;
                              return (
                                <span key={rxn.type} className={`inline-flex items-center gap-0.5 text-[9px] font-bold ${rxn.cls}`}>
                                  <RxnIcon className="h-2.5 w-2.5" /> {count}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <button
                          onClick={() => setShowReactionsFor(showReactionsFor === r.id ? null : r.id)}
                          className="text-[10px] font-semibold text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          + {lang === 'sw' ? 'Jiel' : 'React'}
                        </button>
                      </div>

                      {/* Reaction picker popover */}
                      {showReactionsFor === r.id && (
                        <div className="mt-1 flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                          {REACTIONS.map((rxn) => {
                            const RxnIcon = rxn.icon;
                            return (
                              <button
                                key={rxn.type}
                                onClick={() => react(r.id, rxn.type)}
                                title={translate(rxn.key, lang)}
                                className={`rounded-md p-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-700 ${rxn.cls}`}
                              >
                                <RxnIcon className="h-3.5 w-3.5" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => api.toggleRespectPin(r.id)}
                        title={r.pinned ? translate('founder.respectUnpin', lang) : translate('founder.respectPin', lang)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"
                      >
                        {r.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={() => api.deleteRespect(r.id)}
                        title={translate('founder.respectDelete', lang)}
                        className="rounded p-1 text-rose-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
