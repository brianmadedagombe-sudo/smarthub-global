import type { AppState, DailyUsage, ReportStatus, ReportComment, Language, Currency, UserRole, RespectEntry, TipRecord, RespectWallConfig, AdRewardLog, RankBadge } from './types';

function backfillRespect(entries: RespectEntry[]): RespectEntry[] {
  return entries.map((r) => ({
    ...r,
    pinned: (r as { pinned?: boolean }).pinned ?? false,
    color: (r as { color?: RespectWallConfig['theme'] }).color ?? 'gold',
    reactions: (r as { reactions?: RespectEntry['reactions'] }).reactions ?? [],
  }));
}

const KEY = 'smarthub_global_v1';

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const defaultState: AppState = {
  theme: 'dark',
  language: 'en',
  currency: 'KES',
  role: 'member',
  respect: [],
  respectWallConfig: { title: 'Respect Wall', theme: 'gold', showAvatars: true, maxEntries: 50 },
  tips: [],
  profile: { isPro: false, daily: { date: todayKey(), count: 0 } },
  invoices: [],
  products: [],
  sales: [],
  employees: [],
  payslips: [],
  bio: {
    handle: '',
    displayName: '',
    tagline: '',
    avatarColor: '#2563eb',
    links: [],
  },
  services: [],
  gamer: {
    primaryGame: '',
    ign: '',
    xp: 0,
    challenges: [],
    rewards: [],
    adRewards: [],
    streak: 0,
    longestStreak: 0,
    lastAdWatchedAt: null,
    streakProtectedThisWeek: false,
    rankBadges: [],
    country: 'KE',
  },
  reports: [],
  claimedBadges: [],
  notifications: [],
  emailSubscriptions: [],
  emailTemplates: [],
  scheduledExports: [],
  webhooks: [],
  bookmarkedServiceIds: [],
  pushPrefs: { enabled: false, walletAlerts: true, providerUpdates: true, communityUpdates: false },
  bookmarkFolders: [],
  scheduledAlerts: [],
  soundPrefs: { enabled: true, volume: 0.5 },
  dailyStreak: { lastClaimDate: null, currentStreak: 0, longestStreak: 0, totalClaims: 0, totalCoinsEarned: 0 },
  analyticsCounters: { profileViews: 0, bioLinkClicks: 0, invoiceViews: 0, tipJarViews: 0, lastUpdated: new Date().toISOString() },
  referral: { referralCode: '', totalReferrals: 0, totalCoinsEarned: 0, linkCopied: false, referredBy: null },
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw) as AppState;
    // Backfill new fields on older saved states.
    const invoices = (parsed.invoices ?? []).map((inv) =>
      inv.status ? inv : { ...inv, status: 'pending' as const }
    );
    const gamer = {
      ...parsed.gamer,
      adRewards: (parsed.gamer as unknown as { adRewards?: AdRewardLog[] }).adRewards ?? [],
      streak: (parsed.gamer as { streak?: number }).streak ?? 0,
      longestStreak: (parsed.gamer as { longestStreak?: number }).longestStreak ?? 0,
      lastAdWatchedAt: (parsed.gamer as { lastAdWatchedAt?: string | null }).lastAdWatchedAt ?? null,
      streakProtectedThisWeek: (parsed.gamer as { streakProtectedThisWeek?: boolean }).streakProtectedThisWeek ?? false,
      rankBadges: (parsed.gamer as unknown as { rankBadges?: RankBadge[] }).rankBadges ?? [],
      country: (parsed.gamer as { country?: string }).country ?? 'KE',
    };
    const products = parsed.products ?? [];
    const sales = parsed.sales ?? [];
    const employees = parsed.employees ?? [];
    const payslips = parsed.payslips ?? [];
    const services = (parsed.services ?? []).map((s) => ({
      ...s,
      tier: (s as { tier?: 'standard' | 'premium' | 'elite' }).tier ?? (s.verified ? 'standard' : 'standard'),
      trustScore: (s as { trustScore?: number }).trustScore ?? (s.verified ? 75 : 0),
    }));
    const reports = (parsed.reports ?? []).map((r) => ({
      ...r,
      status: (r as { status?: ReportStatus }).status ?? 'Open',
      votes: (r as { votes?: number }).votes ?? 0,
      authorName: (r as { authorName?: string }).authorName ?? 'Anonymous',
      comments: (r as { comments?: ReportComment[] }).comments ?? [],
    }));
    const claimedBadges = parsed.claimedBadges ?? [];
    const notifications = parsed.notifications ?? [];
    const emailSubscriptions = parsed.emailSubscriptions ?? [];
    const emailTemplates = parsed.emailTemplates ?? [];
    const scheduledExports = parsed.scheduledExports ?? [];
    const webhooks = parsed.webhooks ?? [];
    const bookmarkedServiceIds = (parsed as { bookmarkedServiceIds?: string[] }).bookmarkedServiceIds ?? [];
    const pushPrefs = (parsed as { pushPrefs?: AppState['pushPrefs'] }).pushPrefs ?? { enabled: false, walletAlerts: true, providerUpdates: true, communityUpdates: false };
    const bookmarkFolders = (parsed as { bookmarkFolders?: AppState['bookmarkFolders'] }).bookmarkFolders ?? [];
    const scheduledAlerts = (parsed as { scheduledAlerts?: AppState['scheduledAlerts'] }).scheduledAlerts ?? [];
    const soundPrefs = (parsed as { soundPrefs?: AppState['soundPrefs'] }).soundPrefs ?? { enabled: true, volume: 0.5 };
  const dailyStreak = (parsed as { dailyStreak?: AppState['dailyStreak'] }).dailyStreak ?? { lastClaimDate: null, currentStreak: 0, longestStreak: 0, totalClaims: 0, totalCoinsEarned: 0 };
  const analyticsCounters = (parsed as { analyticsCounters?: AppState['analyticsCounters'] }).analyticsCounters ?? { profileViews: 0, bioLinkClicks: 0, invoiceViews: 0, tipJarViews: 0, lastUpdated: new Date().toISOString() };
  const referral = (parsed as { referral?: AppState['referral'] }).referral ?? { referralCode: '', totalReferrals: 0, totalCoinsEarned: 0, linkCopied: false, referredBy: null };
    const language: Language = (parsed as { language?: Language }).language ?? 'en';
    const currency: Currency = (parsed as { currency?: Currency }).currency ?? 'KES';
    const role: UserRole = (parsed as { role?: UserRole }).role ?? 'member';
    const respect = backfillRespect((parsed as { respect?: RespectEntry[] }).respect ?? []);
    const tips = (parsed as { tips?: TipRecord[] }).tips ?? [];
    const respectWallConfig: RespectWallConfig = (parsed as { respectWallConfig?: RespectWallConfig }).respectWallConfig ?? { title: 'Respect Wall', theme: 'gold', showAvatars: true, maxEntries: 50 };
    // Reset daily AI usage at local midnight.
    const daily: DailyUsage = parsed.profile?.daily ?? { date: todayKey(), count: 0 };
    if (daily.date !== todayKey()) {
      daily.date = todayKey();
      daily.count = 0;
    }
    return { ...structuredClone(defaultState), ...parsed, invoices, gamer, products, sales, employees, payslips, services, reports, claimedBadges, notifications, emailSubscriptions, emailTemplates, scheduledExports, webhooks, bookmarkedServiceIds, pushPrefs, bookmarkFolders, scheduledAlerts, soundPrefs, dailyStreak, analyticsCounters, referral, language, currency, role, respect, respectWallConfig, tips, profile: { ...parsed.profile, daily } };
  } catch {
    return structuredClone(defaultState);
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — non-fatal for an ephemeral session.
  }
}
