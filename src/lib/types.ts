export type ModuleId =
  | 'dashboard'
  | 'invoicing'
  | 'vidipesa'
  | 'biolink'
  | 'services'
  | 'qr'
  | 'pitch'
  | 'gamer'
  | 'network'
  | 'privacy'
  | 'community'
  | 'chat';

export type Theme = 'light' | 'dark';

export type Language = 'en' | 'sw';

export type UserRole = 'member' | 'founder';

export type Currency = 'KES' | 'USD' | 'EUR' | 'GBP' | 'NGN' | 'ZAR';

export const CURRENCIES: Currency[] = ['KES', 'USD', 'EUR', 'GBP', 'NGN', 'ZAR'];

// Heuristic FX rates relative to KES (base). Adjusted for display only.
export const FX_TO_KES: Record<Currency, number> = {
  KES: 1,
  USD: 129,
  EUR: 140,
  GBP: 164,
  NGN: 0.31,
  ZAR: 7.1,
};

export type MpesaPayoutStatus = 'pending' | 'success' | 'failed';

export interface MpesaPayout {
  id: string;
  amountKes: number;
  phone: string;
  status: MpesaPayoutStatus;
  reference: string;
  createdAt: string;
  receiptCode?: string;
  receiptPrinted?: boolean;
}

export type RespectTheme = 'gold' | 'cyan' | 'rose' | 'emerald';

export interface RespectWallConfig {
  title: string;
  theme: RespectTheme;
  showAvatars: boolean;
  maxEntries: number;
}

export type RespectReactionType = 'heart' | 'fire' | 'clap' | 'crown';

export interface RespectReaction {
  id: string;
  type: RespectReactionType;
  fromName: string;
  createdAt: string;
}

export interface RespectEntry {
  id: string;
  fromName: string;
  message: string;
  createdAt: string;
  pinned: boolean;
  color: RespectTheme;
  reactions: RespectReaction[];
}

export interface TipRecord {
  id: string;
  fromName: string;
  amount: number; // in Hub Coins
  kind: 'coffee' | 'crown';
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  qty: number;
  price: number;
}

export interface Invoice {
  id: string;
  kind: 'invoice' | 'quote';
  number: string;
  date: string;
  dueDate: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  currency: string;
  items: InvoiceItem[];
  notes: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  status: 'paid' | 'pending';
}

export interface BioLink {
  id: string;
  label: string;
  url: string;
  kind: 'social' | 'product' | 'payment';
  price?: string;
}

export type ServiceTier = 'standard' | 'premium' | 'elite';

export interface ServiceEntry {
  id: string;
  name: string;
  trade: string;
  location: string;
  phone: string;
  whatsapp: string;
  rating: number;
  verified: boolean;
  tier: ServiceTier;
  trustScore: number;
}

export interface Challenge {
  id: string;
  label: string;
  xp: number;
  done: boolean;
}

export interface GameRewardRequest {
  id: string;
  game: string;
  amount: string;
  status: 'pending';
  createdAt: string;
}

export interface TournamentRegistration {
  id: string;
  tournamentRef: string | null;
  game: string;
  playerId: string;
  squadId: string;
  ign: string;
  contact: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  id: string;
  ign: string;
  game: string;
  xp: number;
  country?: string;
}

export type TournamentStatus = 'upcoming' | 'registration' | 'live' | 'completed';
export type TournamentFormat = 'solo' | 'squad' | 'duo';

export interface Tournament {
  id: string;
  title: string;
  game: string;
  format: TournamentFormat;
  entryFee: number;
  prizePool: number;
  maxPlayers: number;
  registeredCount: number;
  status: TournamentStatus;
  startsAt: string;
  description: string;
}

export interface TournamentStanding {
  rank: number;
  ign: string;
  game: string;
  xp: number;
  country: string;
  kills: number;
  wins: number;
  matches: number;
}

export type AdRewardType = 'bonus_coins' | 'streak_protection' | 'xp_boost';

export interface AdRewardLog {
  id: string;
  type: AdRewardType;
  reward: number;
  watchedAt: string;
}

export type RankBadge = 'global_top100' | 'country_top1' | 'country_top3' | 'country_top10' | 'rising_star';

export interface RankConsistency {
  currentStreak: number;
  longestStreak: number;
  lastAdWatchedAt: string | null;
  streakProtectedThisWeek: boolean;
  badges: RankBadge[];
  adRewards: AdRewardLog[];
  country: string;
}

export interface DigitalProduct {
  id: string;
  title: string;
  description: string;
  category: 'video' | 'ebook' | 'template' | 'service' | 'course';
  priceKes: number;
  fileName: string;
  fileSize: number;
  published: boolean;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  grossSalary: number;
  deductionNssf: number;
  deductionNhif: number;
  deductionTax: number;
  deductionCustom: number;
  currency: string;
  createdAt: string;
}

export interface Payslip {
  id: string;
  employeeId: string;
  employeeName: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  currency: string;
  period: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  productId: string;
  productTitle: string;
  amountKes: number;
  method: 'card' | 'mpesa';
  status: 'success' | 'pending' | 'failed';
  buyerEmail: string;
  createdAt: string;
}

export interface DailyUsage {
  date: string;
  count: number;
}

export interface UserProfile {
  isPro: boolean;
  daily: DailyUsage;
}

export type NotificationKind = 'status' | 'comment' | 'vote' | 'system';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  reportId?: string;
}

export interface EmailSubscription {
  email: string;
  events: { statusChange: boolean; newComment: boolean; voteMilestone: boolean };
}

export type ExportFormat = 'csv' | 'pdf' | 'json';

export type ScheduleCadence = 'daily' | 'weekly' | 'monthly';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
}

export interface ScheduledExport {
  id: string;
  name: string;
  format: ExportFormat;
  cadence: ScheduleCadence;
  recipients: string;
  templateId: string;
  createdAt: string;
  lastRun: string | null;
  nextRun: string;
  enabled: boolean;
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: { statusChange: boolean; newComment: boolean; voteMilestone: boolean };
  enabled: boolean;
  createdAt: string;
}

export interface PushNotificationPrefs {
  enabled: boolean;
  walletAlerts: boolean;
  providerUpdates: boolean;
  communityUpdates: boolean;
}

export interface BookmarkFolder {
  id: string;
  name: string;
  color: string;
  serviceIds: string[];
  createdAt: string;
}

export type AlertCadence = 'once' | 'daily' | 'weekly';

export interface ScheduledAlert {
  id: string;
  title: string;
  message: string;
  time: string;
  cadence: AlertCadence;
  enabled: boolean;
  lastFired: string | null;
  createdAt: string;
}

export type SoundEffectType = 'click' | 'success' | 'error' | 'notification' | 'bookmark' | 'toggle';

export interface SoundEffectPrefs {
  enabled: boolean;
  volume: number;
}

export interface DailyStreak {
  lastClaimDate: string | null;
  currentStreak: number;
  longestStreak: number;
  totalClaims: number;
  totalCoinsEarned: number;
}

export interface AnalyticsCounters {
  profileViews: number;
  bioLinkClicks: number;
  invoiceViews: number;
  tipJarViews: number;
  lastUpdated: string;
}

export interface ReferralState {
  referralCode: string;
  totalReferrals: number;
  totalCoinsEarned: number;
  linkCopied: boolean;
  referredBy: string | null;
}

export interface AppState {
  theme: Theme;
  language: Language;
  currency: Currency;
  role: UserRole;
  respect: RespectEntry[];
  respectWallConfig: RespectWallConfig;
  tips: TipRecord[];
  profile: UserProfile;
  invoices: Invoice[];
  products: DigitalProduct[];
  sales: Sale[];
  employees: Employee[];
  payslips: Payslip[];
  bio: {
    handle: string;
    displayName: string;
    tagline: string;
    avatarColor: string;
    links: BioLink[];
  };
  services: ServiceEntry[];
  bookmarkedServiceIds: string[];
  gamer: {
    primaryGame: string;
    ign: string;
    xp: number;
    challenges: Challenge[];
    rewards: GameRewardRequest[];
    adRewards: AdRewardLog[];
    streak: number;
    longestStreak: number;
    lastAdWatchedAt: string | null;
    streakProtectedThisWeek: boolean;
    rankBadges: RankBadge[];
    country: string;
  };
  reports: ReportSubmission[];
  claimedBadges: ImpactBadge[];
  notifications: AppNotification[];
  emailSubscriptions: EmailSubscription[];
  emailTemplates: EmailTemplate[];
  scheduledExports: ScheduledExport[];
  webhooks: WebhookConfig[];
  pushPrefs: PushNotificationPrefs;
  bookmarkFolders: BookmarkFolder[];
  scheduledAlerts: ScheduledAlert[];
  soundPrefs: SoundEffectPrefs;
  dailyStreak: DailyStreak;
  analyticsCounters: AnalyticsCounters;
  referral: ReferralState;
}

export type ReportCategory = 'Bug Report' | 'Feature Suggestion';

export type ImpactBadge = 'Beta Pioneer' | 'Top Bug Hunter' | 'Master Innovator';

export type ReportStatus = 'Open' | 'Under Review' | 'Resolved' | 'Declined';

export const REPORT_STATUSES: ReportStatus[] = ['Open', 'Under Review', 'Resolved', 'Declined'];

export interface ReportComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface ReportSubmission {
  id: string;
  category: ReportCategory;
  subject: string;
  details: string;
  contact: string;
  authorName: string;
  createdAt: string;
  status: ReportStatus;
  votes: number;
  voted?: boolean;
  comments: ReportComment[];
}

export interface Contributor {
  id: string;
  name: string;
  badge: ImpactBadge;
  xp: number;
  reports: number;
}
