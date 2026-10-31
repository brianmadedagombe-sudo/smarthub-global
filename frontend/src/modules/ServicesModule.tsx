import { useMemo, useState } from 'react';
import { Search, MapPin, ShieldCheck, Star, Plus, Trash2, AlertTriangle, Phone, MessageCircle, Sparkles, X, BadgeCheck, Award, Crown, Filter, Bookmark, Send, Download, Folder, FolderPlus, FolderOpen, Check } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import type { ServiceEntry, ServiceTier, Language } from '@/lib/types';
import { phoneDigits, sanitize, uid } from '@/lib/security';
import { Button, Card, Field, inputClass, SectionTitle } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { toast } from '@/components/Toast';
import { translate } from '@/lib/i18n';
import { useSoundEffects } from '@/hooks/useSoundEffects';

const FOLDER_COLORS = ['amber', 'blue', 'emerald', 'rose', 'violet', 'cyan'];

const TRADES = ['Plumbing', 'Mechanic', 'Tailor', 'Electrician', 'Carpenter', 'Hairdresser', 'Tutor', 'Caterer'];

const SEED: ServiceEntry[] = [
  { id: uid('sv'), name: 'Joseph K.', trade: 'Plumbing', location: 'Nairobi, Ruaka', phone: '+254712345678', whatsapp: '+254712345678', rating: 4.8, verified: true, tier: 'premium', trustScore: 82 },
  { id: uid('sv'), name: 'Amina H.', trade: 'Tailor', location: 'Mombasa, Nyali', phone: '+254722998877', whatsapp: '+254722998877', rating: 4.9, verified: true, tier: 'elite', trustScore: 95 },
  { id: uid('sv'), name: 'Peter O.', trade: 'Mechanic', location: 'Kisumu, Milimani', phone: '+254733445566', whatsapp: '+254733445566', rating: 4.6, verified: true, tier: 'standard', trustScore: 71 },
  { id: uid('sv'), name: 'Faith W.', trade: 'Electrician', location: 'Nairobi, Westlands', phone: '+254700112233', whatsapp: '+254700112233', rating: 4.7, verified: true, tier: 'premium', trustScore: 85 },
  { id: uid('sv'), name: 'Dennis K.', trade: 'Carpenter', location: 'Eldoret, Town', phone: '+254711223344', whatsapp: '+254711223344', rating: 4.5, verified: false, tier: 'standard', trustScore: 0 },
];

const TIER_META: Record<ServiceTier, { icon: typeof ShieldCheck; key: string; cls: string }> = {
  standard: { icon: ShieldCheck, key: 'services.verifiedStandard', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  premium: { icon: BadgeCheck, key: 'services.verifiedPremium', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
  elite: { icon: Crown, key: 'services.verifiedElite', cls: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950' },
};

export function ServicesModule({ api }: { api: AppApi }) {
  const lang = api.state.language;
  const [roleQuery, setRoleQuery] = useState('');
  const [locQuery, setLocQuery] = useState('');
  const [tradeFilter, setTradeFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState<'all' | ServiceTier>('all');
  const [minRating, setMinRating] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'trust' | 'name'>('rating');
  const [showFilters, setShowFilters] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkQuery, setBookmarkQuery] = useState('');
  const [bookmarkTrade, setBookmarkTrade] = useState('all');
  const [bookmarkTier, setBookmarkTier] = useState<'all' | ServiceTier>('all');
  const [messageProvider, setMessageProvider] = useState<ServiceEntry | null>(null);
  const [messageText, setMessageText] = useState('');
  const [draft, setDraft] = useState<ServiceEntry>({
    id: uid('sv'),
    name: '',
    trade: 'Plumbing',
    location: '',
    phone: '',
    whatsapp: '',
    rating: 5,
    verified: false,
    tier: 'standard',
    trustScore: 0,
  });
  const [pendingContact, setPendingContact] = useState<ServiceEntry | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [showFolderPanel, setShowFolderPanel] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('amber');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const { play } = useSoundEffects(api.state.soundPrefs);

  const services = useMemo(() => (api.state.services.length ? api.state.services : SEED), [api.state.services]);
  const bookmarkedIds = useMemo(() => api.state.bookmarkedServiceIds ?? [], [api.state.bookmarkedServiceIds]);
  const hasSearch = roleQuery.trim() !== '' || locQuery.trim() !== '';
  const hasFilters = tradeFilter !== 'all' || tierFilter !== 'all' || minRating > 0 || verifiedOnly;

  const filtered = useMemo(() => {
    const r = roleQuery.trim().toLowerCase();
    const l = locQuery.trim().toLowerCase();
    let result = services.filter((s) => {
      const matchRole = !r || s.trade.toLowerCase().includes(r) || s.name.toLowerCase().includes(r);
      const matchLoc = !l || s.location.toLowerCase().includes(l);
      const matchTrade = tradeFilter === 'all' || s.trade === tradeFilter;
      const matchTier = tierFilter === 'all' || s.tier === tierFilter;
      const matchRating = s.rating >= minRating;
      const matchVerified = !verifiedOnly || s.verified;
      return matchRole && matchLoc && matchTrade && matchTier && matchRating && matchVerified;
    });
    result = [...result].sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'trust') return b.trustScore - a.trustScore;
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [services, roleQuery, locQuery, tradeFilter, tierFilter, minRating, verifiedOnly, sortBy]);

  const bookmarked = useMemo(() => services.filter((s) => bookmarkedIds.includes(s.id)), [services, bookmarkedIds]);
  const folders = useMemo(() => api.state.bookmarkFolders ?? [], [api.state.bookmarkFolders]);
  const activeFolder = useMemo(() => folders.find((f) => f.id === activeFolderId) ?? null, [folders, activeFolderId]);

  const folderServiceMap = useMemo(() => {
    const map = new Map<string, string[]>();
    folders.forEach((f) => f.serviceIds.forEach((sid) => {
      const arr = map.get(sid) ?? [];
      arr.push(f.id);
      map.set(sid, arr);
    }));
    return map;
  }, [folders]);

  const createFolder = () => {
    const name = sanitize(folderName).trim();
    if (!name) {
      toast(lang === 'sw' ? 'Weka jina la folda.' : 'Enter a folder name.', 'error');
      return;
    }
    api.addBookmarkFolder(name, folderColor);
    play('success');
    setFolderName('');
    setShowFolderPanel(false);
    toast(lang === 'sw' ? 'Folda limeundwa.' : 'Folder created.');
  };

  const deleteFolder = (id: string) => {
    api.removeBookmarkFolder(id);
    play('toggle');
    if (activeFolderId === id) setActiveFolderId(null);
    toast(lang === 'sw' ? 'Folda limefutwa.' : 'Folder deleted.');
  };

  const toggleServiceFolder = (folderId: string, serviceId: string) => {
    api.toggleServiceInFolder(folderId, serviceId);
    play('bookmark');
  };

  const filteredBookmarks = useMemo(() => {
    const q = bookmarkQuery.trim().toLowerCase();
    return bookmarked.filter((s) => {
      const matchQuery = !q || s.name.toLowerCase().includes(q) || s.trade.toLowerCase().includes(q) || s.location.toLowerCase().includes(q);
      const matchTrade = bookmarkTrade === 'all' || s.trade === bookmarkTrade;
      const matchTier = bookmarkTier === 'all' || s.tier === bookmarkTier;
      return matchQuery && matchTrade && matchTier;
    });
  }, [bookmarked, bookmarkQuery, bookmarkTrade, bookmarkTier]);

  const folderFilteredBookmarks = useMemo(() => {
    if (!activeFolder) return filteredBookmarks;
    return filteredBookmarks.filter((s) => activeFolder.serviceIds.includes(s.id));
  }, [filteredBookmarks, activeFolder]);

  const exportBookmarksCsv = () => {
    if (bookmarked.length === 0) {
      toast(translate('services.exportBookmarksEmpty', lang), 'error');
      return;
    }
    const header = ['Name', 'Trade', 'Location', 'Phone', 'WhatsApp', 'Rating', 'Verified', 'Tier', 'Trust Score'];
    const rows = bookmarked.map((s) => [
      s.name,
      s.trade,
      s.location,
      s.phone,
      s.whatsapp,
      s.rating.toFixed(1),
      s.verified ? 'Yes' : 'No',
      s.tier,
      String(s.trustScore),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bookmarked-providers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast(translate('services.exportBookmarksSuccess', lang));
  };

  const featured = useMemo(() => {
    const verified = services.filter((s) => s.verified).sort((a, b) => b.rating - a.rating);
    const pool = verified.slice(0, 6);
    const count = Math.min(3, Math.max(2, pool.length));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }, [services]);

  const addService = () => {
    if (!sanitize(draft.name) || !sanitize(draft.phone)) {
      toast(lang === 'sw' ? 'Ongeza jina na nambari ya simu.' : 'Add a name and phone number.', 'error');
      return;
    }
    api.patch((p) => ({ ...p, services: [{ ...draft, id: uid('sv'), name: sanitize(draft.name) }, ...p.services] }));
    setDraft({ ...draft, id: uid('sv'), name: '', location: '', phone: '', whatsapp: '' });
    setAdding(false);
    toast(lang === 'sw' ? 'Mtoa huduma ameongezwa.' : 'Service provider added.');
  };

  const remove = (id: string) =>
    api.patch((p) => ({ ...p, services: p.services.filter((s) => s.id !== id) }));

  const openContact = (s: ServiceEntry) => {
    setPendingContact(s);
    setContactOpen(true);
  };

  const closeContact = () => {
    setContactOpen(false);
    setPendingContact(null);
  };

  const openMessage = (s: ServiceEntry) => {
    setMessageProvider(s);
    setMessageText('');
  };

  const closeMessage = () => {
    setMessageProvider(null);
    setMessageText('');
  };

  const sendMessage = () => {
    if (!messageProvider) return;
    const msg = sanitize(messageText).trim();
    const text = msg || (lang === 'sw' ? 'Habari, nimeona wasifu wako kwenye SmartHub Global.' : 'Hello, I found your profile on SmartHub Global.');
    const wa = phoneDigits(messageProvider.whatsapp || messageProvider.phone).replace('+', '');
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    toast(translate('services.messageSent', lang));
    closeMessage();
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        title={translate('services.title', lang)}
        subtitle={translate('services.subtitle', lang)}
      />

      {/* Badge tier legend */}
      <Card className="flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span className="font-semibold">{translate('services.verifiedStandard', lang)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BadgeCheck className="h-4 w-4 text-blue-500" />
          <span className="font-semibold">{translate('services.verifiedPremium', lang)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Crown className="h-4 w-4 text-amber-500" />
          <span className="font-semibold">{translate('services.verifiedElite', lang)}</span>
        </div>
        <span className="text-slate-400">{translate('services.badgeInfo', lang)}</span>
      </Card>

      {/* Search + filters */}
      <Card className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClass} pl-9`}
              placeholder={translate('services.rolePlaceholder', lang)}
              value={roleQuery}
              onChange={(e) => setRoleQuery(sanitize(e.target.value))}
              aria-label={translate('services.role', lang)}
            />
          </div>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClass} pl-9`}
              placeholder={translate('services.locationPlaceholder', lang)}
              value={locQuery}
              onChange={(e) => setLocQuery(sanitize(e.target.value))}
              aria-label={translate('services.location', lang)}
            />
          </div>
        </div>
        {hasSearch && (
          <button
            onClick={() => { setRoleQuery(''); setLocQuery(''); }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            <X className="h-3.5 w-3.5" /> {translate('services.clear', lang)}
          </button>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setAdding((v) => !v)} icon={<Plus className="h-4 w-4" />}>
            {adding ? (lang === 'sw' ? 'Ghairi' : 'Cancel') : translate('services.addProvider', lang)}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowFilters((v) => !v)}
            icon={<Filter className="h-4 w-4" />}
            className={hasFilters ? 'ring-2 ring-blue-500/30' : ''}
          >
            {translate('services.filters', lang)}
            {hasFilters && <span className="ml-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] text-white">!</span>}
          </Button>
          {bookmarkedIds.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => setShowBookmarks((v) => !v)}
              icon={<Bookmark className="h-4 w-4 fill-amber-400 text-amber-400" />}
              className={showBookmarks ? 'ring-2 ring-amber-500/30' : ''}
            >
              {translate('services.bookmarks', lang)} ({bookmarkedIds.length})
            </Button>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-700">
            <Field label={translate('services.filterTrade', lang)}>
              <select className={inputClass} value={tradeFilter} onChange={(e) => setTradeFilter(e.target.value)}>
                <option value="all">{translate('services.filterAll', lang)}</option>
                {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label={translate('services.filterTier', lang)}>
              <select className={inputClass} value={tierFilter} onChange={(e) => setTierFilter(e.target.value as 'all' | ServiceTier)}>
                <option value="all">{translate('services.filterAll', lang)}</option>
                <option value="standard">{translate('services.verifiedStandard', lang)}</option>
                <option value="premium">{translate('services.verifiedPremium', lang)}</option>
                <option value="elite">{translate('services.verifiedElite', lang)}</option>
              </select>
            </Field>
            <Field label={translate('services.filterRating', lang)}>
              <select className={inputClass} value={minRating} onChange={(e) => setMinRating(parseInt(e.target.value, 10))}>
                <option value={0}>{translate('services.filterAll', lang)}</option>
                <option value={3}>3.0+</option>
                <option value={4}>4.0+</option>
                <option value={4.5}>4.5+</option>
              </select>
            </Field>
            <Field label={translate('services.sortBy', lang)}>
              <select className={inputClass} value={sortBy} onChange={(e) => setSortBy(e.target.value as 'rating' | 'trust' | 'name')}>
                <option value="rating">{translate('services.sortRating', lang)}</option>
                <option value="trust">{translate('services.sortTrust', lang)}</option>
                <option value="name">{translate('services.sortName', lang)}</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2 lg:col-span-4">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              {translate('services.filterVerifiedOnly', lang)}
            </label>
            {hasFilters && (
              <button
                onClick={() => { setTradeFilter('all'); setTierFilter('all'); setMinRating(0); setVerifiedOnly(false); }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400 sm:col-span-2 lg:col-span-4"
              >
                <X className="h-3.5 w-3.5" /> {translate('services.clear', lang)} {translate('services.filters', lang).toLowerCase()}
              </button>
            )}
          </div>
        )}

        {adding && (
          <div className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-2 dark:border-slate-700">
            <Field label={lang === 'sw' ? 'Jina' : 'Name'}>
              <input className={inputClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: sanitize(e.target.value) })} />
            </Field>
            <Field label={lang === 'sw' ? 'Kazi' : 'Trade'}>
              <select className={inputClass} value={draft.trade} onChange={(e) => setDraft({ ...draft, trade: e.target.value })}>
                {TRADES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label={translate('services.location', lang)}>
              <input className={inputClass} value={draft.location} onChange={(e) => setDraft({ ...draft, location: sanitize(e.target.value) })} />
            </Field>
            <Field label={lang === 'sw' ? 'Simu' : 'Phone'}>
              <input className={inputClass} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: sanitize(e.target.value) })} />
            </Field>
            <Field label="WhatsApp">
              <input className={inputClass} value={draft.whatsapp} onChange={(e) => setDraft({ ...draft, whatsapp: sanitize(e.target.value) })} />
            </Field>
            <Field label={lang === 'sw' ? 'Kiwango cha Uthibitisho' : 'Verification tier'}>
              <select
                className={inputClass}
                value={draft.tier}
                onChange={(e) => setDraft({ ...draft, tier: e.target.value as ServiceTier, verified: e.target.value !== 'standard' || draft.verified })}
              >
                <option value="standard">{translate('services.verifiedStandard', lang)}</option>
                <option value="premium">{translate('services.verifiedPremium', lang)}</option>
                <option value="elite">{translate('services.verifiedElite', lang)}</option>
              </select>
            </Field>
            <Button className="sm:col-span-2" onClick={addService}>{translate('services.saveProvider', lang)}</Button>
          </div>
        )}
      </Card>

      {/* Bookmarked providers */}
      {showBookmarks && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-amber-500" />
              <h3 className="text-base font-bold">{translate('services.bookmarks', lang)}</h3>
            </div>
            {bookmarked.length > 0 && (
              <Button
                variant="secondary"
                onClick={exportBookmarksCsv}
                icon={<Download className="h-4 w-4" />}
                className="text-xs"
              >
                {translate('services.exportBookmarks', lang)}
              </Button>
            )}
          </div>

          {bookmarked.length === 0 ? (
            <Card className="text-center text-sm text-slate-400">{translate('services.noBookmarks', lang)}</Card>
          ) : (
            <>
              {/* Bookmark folders bar */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => { setActiveFolderId(null); play('click'); }}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${!activeFolderId ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                >
                  <Bookmark className="h-3.5 w-3.5" /> {translate('services.allBookmarks', lang)}
                </button>
                {folders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { setActiveFolderId(activeFolderId === f.id ? null : f.id); play('click'); }}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${activeFolderId === f.id ? `bg-${f.color}-100 text-${f.color}-700 dark:bg-${f.color}-500/15 dark:text-${f.color}-400` : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                  >
                    {activeFolderId === f.id ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />}
                    {f.name} ({f.serviceIds.length})
                  </button>
                ))}
                <button
                  onClick={() => { setShowFolderPanel((v) => !v); play('click'); }}
                  className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-slate-400 hover:text-slate-600 dark:border-slate-600 dark:hover:border-slate-500"
                >
                  <FolderPlus className="h-3.5 w-3.5" /> {translate('services.createFolder', lang)}
                </button>
              </div>

              {/* Create folder panel */}
              {showFolderPanel && (
                <Card className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                  <Field label={translate('services.folderName', lang)}>
                    <input
                      className={inputClass}
                      value={folderName}
                      onChange={(e) => setFolderName(sanitize(e.target.value))}
                      placeholder={lang === 'sw' ? 'Mafundi Wangu' : 'My Tradespeople'}
                    />
                  </Field>
                  <Field label={translate('services.folderColor', lang)}>
                    <select className={inputClass} value={folderColor} onChange={(e) => setFolderColor(e.target.value)}>
                      {FOLDER_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <div className="flex items-end">
                    <Button onClick={createFolder} icon={<Plus className="h-4 w-4" />}>{translate('services.addFolder', lang)}</Button>
                  </div>
                </Card>
              )}

              {/* Active folder header with delete */}
              {activeFolder && (
                <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-500/10">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                    <FolderOpen className="h-4 w-4" /> {activeFolder.name}
                  </div>
                  <button
                    onClick={() => deleteFolder(activeFolder.id)}
                    className="inline-flex items-center gap-1 text-xs text-rose-500 hover:underline"
                  >
                    <Trash2 className="h-3 w-3" /> {translate('services.deleteFolder', lang)}
                  </button>
                </div>
              )}

              {/* Bookmark search + filter */}
              <Card className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className={`${inputClass} pl-9`}
                      placeholder={translate('services.searchBookmarks', lang)}
                      value={bookmarkQuery}
                      onChange={(e) => setBookmarkQuery(sanitize(e.target.value))}
                      aria-label={translate('services.searchBookmarks', lang)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className={inputClass}
                      value={bookmarkTrade}
                      onChange={(e) => setBookmarkTrade(e.target.value)}
                      aria-label={translate('services.filterTrade', lang)}
                    >
                      <option value="all">{translate('services.filterAll', lang)}</option>
                      {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select
                      className={inputClass}
                      value={bookmarkTier}
                      onChange={(e) => setBookmarkTier(e.target.value as 'all' | ServiceTier)}
                      aria-label={translate('services.filterTier', lang)}
                    >
                      <option value="all">{translate('services.filterAll', lang)}</option>
                      <option value="standard">{translate('services.verifiedStandard', lang)}</option>
                      <option value="premium">{translate('services.verifiedPremium', lang)}</option>
                      <option value="elite">{translate('services.verifiedElite', lang)}</option>
                    </select>
                  </div>
                </div>
                {(bookmarkQuery.trim() !== '' || bookmarkTrade !== 'all' || bookmarkTier !== 'all') && (
                  <button
                    onClick={() => { setBookmarkQuery(''); setBookmarkTrade('all'); setBookmarkTier('all'); }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <X className="h-3.5 w-3.5" /> {translate('services.clear', lang)}
                  </button>
                )}
                <div className="text-xs text-slate-400">
                  {filteredBookmarks.length} / {bookmarked.length}
                </div>
              </Card>

              {folderFilteredBookmarks.length === 0 ? (
                <Card className="text-center text-sm text-slate-400">{activeFolder ? translate('services.folderEmpty', lang) : translate('services.noResults', lang)}</Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {folderFilteredBookmarks.map((s) => (
                    <ProviderCard
                      key={s.id}
                      s={s}
                      lang={lang}
                      onContact={openContact}
                      onRemove={remove}
                      onMessage={openMessage}
                      onBookmark={(id) => { api.toggleBookmark(id); play('bookmark'); }}
                      isBookmarked={bookmarkedIds.includes(s.id)}
                      folders={folders}
                      folderIdsForService={folderServiceMap.get(s.id) ?? []}
                      onToggleFolder={(fid) => toggleServiceFolder(fid, s.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Featured when no search/filter active */}
      {!hasSearch && !hasFilters && !showBookmarks && featured.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h3 className="text-base font-bold">{translate('services.featured', lang)}</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{translate('services.featuredHint', lang)}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((s) => (
              <ProviderCard
                key={s.id}
                s={s}
                lang={lang}
                onContact={openContact}
                onRemove={remove}
                onMessage={openMessage}
                onBookmark={(id) => api.toggleBookmark(id)}
                isBookmarked={bookmarkedIds.includes(s.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Search/filter results */}
      {(hasSearch || hasFilters) && !showBookmarks && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {lang === 'sw' ? 'Matokeo' : 'Results'} ({filtered.length})
          </h3>
          {filtered.length === 0 ? (
            <Card className="text-center text-sm text-slate-400">{translate('services.noResults', lang)}</Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((s) => (
                <ProviderCard
                  key={s.id}
                  s={s}
                  lang={lang}
                  onContact={openContact}
                  onRemove={remove}
                  onMessage={openMessage}
                  onBookmark={(id) => { api.toggleBookmark(id); play('bookmark'); }}
                  isBookmarked={bookmarkedIds.includes(s.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Message modal */}
      <Modal
        open={!!messageProvider}
        onClose={closeMessage}
        title={translate('services.message', lang)}
        maxWidth="max-w-sm"
        footer={
          <>
            <Button variant="ghost" onClick={closeMessage}>{lang === 'sw' ? 'Funga' : 'Close'}</Button>
            <Button onClick={sendMessage} icon={<Send className="h-4 w-4" />}>{translate('services.send', lang)}</Button>
          </>
        }
      >
        {messageProvider && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-center gap-2 font-semibold">
                {messageProvider.name}
                {messageProvider.verified && <TierBadge tier={messageProvider.tier} lang={lang} />}
              </div>
              <div className="text-xs text-slate-500">{messageProvider.trade} · {messageProvider.location}</div>
            </div>
            <Field label={translate('services.message', lang)}>
              <textarea
                className={`${inputClass} min-h-[80px] resize-y`}
                placeholder={translate('services.messagePlaceholder', lang)}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                maxLength={500}
              />
            </Field>
            <p className="text-xs text-slate-400">
              {lang === 'sw' ? 'Ujumbe utatumiwa kupitia WhatsApp.' : 'Your message will be sent via WhatsApp.'}
            </p>
          </div>
        )}
      </Modal>

      {/* Safety disclaimer modal */}
      <Modal
        open={contactOpen}
        onClose={closeContact}
        title={translate('services.safetyTitle', lang)}
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={closeContact}>{lang === 'sw' ? 'Funga' : 'Close'}</Button>
            {pendingContact && (
              <div className="flex gap-2">
                <a
                  href={`tel:${phoneDigits(pendingContact.phone)}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  <Phone className="h-4 w-4" /> {translate('services.call', lang)}
                </a>
                <a
                  href={`https://wa.me/${phoneDigits(pendingContact.whatsapp || pendingContact.phone).replace('+', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  <MessageCircle className="h-4 w-4" /> {translate('services.whatsapp', lang)}
                </a>
              </div>
            )}
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-500/10">
            <AlertTriangle className="h-6 w-6 shrink-0 text-amber-500" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {translate('services.safetyBody', lang)}
            </p>
          </div>
          {pendingContact && (
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-center gap-2 font-semibold">
                {pendingContact.name}
                {pendingContact.verified && <TierBadge tier={pendingContact.tier} lang={lang} />}
              </div>
              <div className="text-xs text-slate-500">{pendingContact.trade} · {pendingContact.location}</div>
              {pendingContact.trustScore > 0 && (
                <div className="mt-1 flex items-center gap-1.5 text-xs">
                  <Award className="h-3 w-3 text-amber-500" />
                  <span className="text-slate-500 dark:text-slate-400">{lang === 'sw' ? 'Alama ya Kuaminisha' : 'Trust score'}: {pendingContact.trustScore}/100</span>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

function TierBadge({ tier, lang }: { tier: ServiceTier; lang: Language }) {
  const meta = TIER_META[tier];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${meta.cls}`}>
      <Icon className="h-3 w-3" /> {translate(meta.key, lang)}
    </span>
  );
}

function ProviderCard({
  s,
  lang,
  onContact,
  onRemove,
  onMessage,
  onBookmark,
  isBookmarked,
  folders,
  folderIdsForService,
  onToggleFolder,
}: {
  s: ServiceEntry;
  lang: Language;
  onContact: (s: ServiceEntry) => void;
  onRemove: (id: string) => void;
  onMessage: (s: ServiceEntry) => void;
  onBookmark: (id: string) => void;
  isBookmarked: boolean;
  folders?: { id: string; name: string; color: string }[];
  folderIdsForService?: string[];
  onToggleFolder?: (folderId: string) => void;
}) {
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-semibold">
            {s.name}
            {s.verified && <TierBadge tier={s.tier} lang={lang} />}
          </div>
          <div className="text-xs text-slate-500">{s.trade} · {s.location}</div>
          {s.trustScore > 0 && (
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
              <Award className="h-3 w-3" /> {s.trustScore}/100
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex items-center gap-1 text-xs font-semibold text-amber-500">
            <Star className="h-3.5 w-3.5 fill-amber-400" /> {s.rating.toFixed(1)}
          </div>
          {isBookmarked && folders && folders.length > 0 && onToggleFolder && (
            <div className="relative">
              <button
                onClick={() => setShowFolderMenu((v) => !v)}
                title={translate('services.moveToFolder', lang)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-blue-500 dark:hover:bg-slate-800"
              >
                <Folder className="h-4 w-4" />
              </button>
              {showFolderMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowFolderMenu(false)} />
                  <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400">{translate('services.folders', lang)}</div>
                    {folders.map((f) => {
                      const inFolder = (folderIdsForService ?? []).includes(f.id);
                      return (
                        <button
                          key={f.id}
                          onClick={() => { onToggleFolder(f.id); }}
                          className={`flex w-full items-center gap-1.5 px-2 py-1.5 text-xs font-medium transition ${inFolder ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                        >
                          <Folder className="h-3 w-3" style={{ color: `var(--color-${f.color}-500, #f59e0b)` }} />
                          {f.name}
                          {inFolder && <Check className="ml-auto h-3 w-3" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
          <button
            onClick={() => onBookmark(s.id)}
            title={isBookmarked ? translate('services.removeBookmark', lang) : translate('services.bookmark', lang)}
            className={`rounded-lg p-1.5 transition ${
              isBookmarked
                ? 'bg-amber-100 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400'
                : 'text-slate-400 hover:bg-slate-100 hover:text-amber-500 dark:hover:bg-slate-800'
            }`}
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-amber-400' : ''}`} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onContact(s)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          <Phone className="h-4 w-4" /> {translate('services.contact', lang)}
        </button>
        <button
          onClick={() => onMessage(s)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          <MessageCircle className="h-4 w-4" /> {translate('services.message', lang)}
        </button>
      </div>
      <button onClick={() => onRemove(s.id)} className="flex w-full items-center justify-center gap-1 text-xs text-rose-500 hover:underline">
        <Trash2 className="h-3 w-3" /> {lang === 'sw' ? 'Ondoa' : 'Remove'}
      </button>
    </Card>
  );
}
