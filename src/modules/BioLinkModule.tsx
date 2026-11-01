import { useState } from 'react';
import { ExternalLink, Plus, Trash2, Link2, ShoppingBag, CreditCard, Smartphone, QrCode } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import type { BioLink } from '@/lib/types';
import { isSafeUrl, sanitize, uid } from '@/lib/security';
import { Button, Card, Field, inputClass, SectionTitle } from '@/components/ui';
import { QrCodeDisplay } from '@/components/QrCodeDisplay';
import { TipJar } from '@/components/TipJar';
import { MpesaCopyWidget } from '@/components/MpesaCopyWidget';
import { PitchExporter } from '@/components/PitchExporter';
import { TrustBadge } from '@/components/TrustBadge';
import { toast } from '@/components/Toast';

const KINDS = [
  { id: 'social', label: 'Social', icon: Link2 },
  { id: 'product', label: 'Product', icon: ShoppingBag },
  { id: 'payment', label: 'Payment', icon: CreditCard },
] as const;

export function BioLinkModule({ api }: { api: AppApi }) {
  const bio = api.state.bio;
  const [draft, setDraft] = useState<BioLink>({ id: uid('bl'), label: '', url: '', kind: 'social' });

  const setBio = (patch: Partial<typeof bio>) => api.patch((p) => ({ ...p, bio: { ...p.bio, ...patch } }));

  const addLink = () => {
    if (!sanitize(draft.label) || !isSafeUrl(draft.url)) {
      toast('Add a label and a valid http(s)/tel/mailto URL.', 'error');
      return;
    }
    setBio({ links: [...bio.links, { ...draft, id: uid('bl') }] });
    setDraft({ id: uid('bl'), label: '', url: '', kind: 'social' });
    toast('Link added to your storefront.');
  };

  const removeLink = (id: string) =>
    setBio({ links: bio.links.filter((l) => l.id !== id) });

  const linkIcon = (kind: BioLink['kind']) =>
    kind === 'product' ? ShoppingBag : kind === 'payment' ? CreditCard : Link2;

  return (
    <div className="space-y-5">
      <SectionTitle title="Bio-Link Storefront" subtitle="Build a creator profile with social links, products, and payment links — preview live on a phone." />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Builder */}
        <div className="space-y-4">
          <Card className="space-y-3">
            <Field label="Display name">
              <input className={inputClass} value={bio.displayName} onChange={(e) => setBio({ displayName: sanitize(e.target.value) })} placeholder="Your name" />
            </Field>
            <Field label="Handle / tagline">
              <input className={inputClass} value={bio.tagline} onChange={(e) => setBio({ tagline: sanitize(e.target.value) })} placeholder="Creator · Nairobi" />
            </Field>
            <Field label="Avatar color">
              <input type="color" className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700" value={bio.avatarColor} onChange={(e) => setBio({ avatarColor: e.target.value })} />
            </Field>
          </Card>

          <Card className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add a link</div>
            <div className="grid grid-cols-3 gap-2">
              {KINDS.map((k) => {
                const Icon = k.icon;
                const active = draft.kind === k.id;
                return (
                  <button
                    key={k.id}
                    onClick={() => setDraft({ ...draft, kind: k.id })}
                    className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-medium ${active ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}
                  >
                    <Icon className="h-4 w-4" /> {k.label}
                  </button>
                );
              })}
            </div>
            <Field label="Label">
              <input className={inputClass} value={draft.label} onChange={(e) => setDraft({ ...draft, label: sanitize(e.target.value) })} placeholder="My TikTok / Buy eBook / M-Pesa Pay" />
            </Field>
            <Field label="URL" hint="https://, tel:, or mailto: are allowed.">
              <input className={inputClass} value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://…" />
            </Field>
            {draft.kind === 'product' && (
              <Field label="Price (optional)">
                <input className={inputClass} value={draft.price ?? ''} onChange={(e) => setDraft({ ...draft, price: sanitize(e.target.value) })} placeholder="KES 500" />
              </Field>
            )}
            <Button fullWidth onClick={addLink} icon={<Plus className="h-4 w-4" />}>Add link</Button>
          </Card>

          {bio.links.length > 0 && (
            <Card>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Your links</div>
              <ul className="space-y-2">
                {bio.links.map((l) => {
                  const Icon = linkIcon(l.kind);
                  return (
                    <li key={l.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                      <Icon className="h-4 w-4 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{l.label}</div>
                        <div className="truncate text-xs text-slate-400">{l.url}</div>
                      </div>
                      {l.price && <span className="text-xs font-semibold text-emerald-600">{l.price}</span>}
                      <button onClick={() => removeLink(l.id)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10" aria-label="Remove">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <TipJar
            displayName={bio.displayName}
            onTipSent={(amount, method) => {
              api.trackAnalytics('tipJarViews', 1);
              toast(`Tip of KES ${amount} via ${method === 'mpesa' ? 'M-Pesa' : 'card'} received!`);
            }}
          />

          <MpesaCopyWidget displayName={bio.displayName} accountName={bio.displayName} />

          <TrustBadge api={api} />

          <PitchExporter api={api} />
        </div>

        {/* Live preview */}
        <div className="flex justify-center lg:sticky lg:top-20 lg:self-start">
          <div className="w-[300px]">
            <div className="relative rounded-[2.5rem] border-8 border-slate-800 bg-slate-900 p-2 shadow-2xl dark:border-slate-700">
              <div className="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-slate-800 dark:bg-slate-700" />
              <div className="h-[560px] overflow-y-auto rounded-[2rem] bg-gradient-to-b from-slate-50 to-white px-4 pb-6 pt-10 dark:from-slate-900 dark:to-slate-950">
                <div className="flex flex-col items-center text-center">
                  <div
                    className="grid h-20 w-20 place-items-center rounded-full text-2xl font-bold text-white shadow-lg"
                    style={{ backgroundColor: bio.avatarColor }}
                  >
                    {(bio.displayName || 'S').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{bio.displayName || 'Your name'}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{bio.tagline || 'Your tagline'}</div>
                </div>

                <div className="mt-5 space-y-2.5">
                  {bio.links.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
                      Add links to see them here.
                    </div>
                  )}
                  {bio.links.map((l) => {
                    const Icon = linkIcon(l.kind);
                    return (
                      <a
                        key={l.id}
                        href={isSafeUrl(l.url) ? l.url : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-xl bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition active:scale-95 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <Icon className="h-4 w-4" style={{ color: bio.avatarColor }} />
                        <span className="flex-1 truncate">{l.label}</span>
                        {l.price && <span className="text-xs text-emerald-600">{l.price}</span>}
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                      </a>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center justify-center gap-1 text-xs text-slate-400">
                  <Smartphone className="h-3.5 w-3.5" /> SmartHub Bio
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* QR Code for storefront */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <QrCode className="h-5 w-5 text-blue-500" /> Storefront QR Code
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Share this QR code so customers can scan to view your bio-link storefront instantly.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          <QrCodeDisplay
            value={bio.links.length > 0 ? (bio.links[0].url || window.location.origin) : window.location.origin}
            label="Scan to view storefront"
            downloadName="smarthub-bio-qr"
          />
          <div className="flex-1 space-y-2 text-sm">
            <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
              <div className="text-[10px] uppercase tracking-wide text-slate-400">Storefront Link</div>
              <div className="truncate font-mono text-xs">{bio.links.length > 0 ? bio.links[0].url : window.location.origin}</div>
            </div>
            <p className="text-xs text-slate-400">Download and print this QR code to display at your shop, on flyers, or share on social media.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
