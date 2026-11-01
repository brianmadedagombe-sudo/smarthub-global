import { useEffect, useMemo, useState } from 'react';
import { Bug, Lightbulb, Send, Trophy, Shield, Award, Search, FileText, FileSpreadsheet, Mail, Gift, Check, X, ThumbsUp, ChevronDown, MessageSquare, ArrowUpDown, User, CheckSquare, Square, Bell, BellRing, Download, Trash2, Filter, CalendarClock, Pencil, Plus, Clock, FileClock, Webhook, Link2, Share2, MessageCircle, Facebook } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import type { Contributor, ImpactBadge, ReportCategory, ReportStatus, ReportSubmission, ReportComment, AppNotification, EmailSubscription, EmailTemplate, ScheduledExport, ExportFormat, ScheduleCadence, WebhookConfig } from '@/lib/types';
import { REPORT_STATUSES } from '@/lib/types';
import { sanitize, uid, isSafeUrl } from '@/lib/security';
import { Button, Card, Field, inputClass, SectionTitle } from '@/components/ui';
import { toast } from '@/components/Toast';
import { printDocument, buildPrintDocument } from '@/lib/print';
import { Modal } from '@/components/Modal';
import { COMMUNITY_LINKS } from '@/lib/config';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { ShareModal } from '@/components/ShareModal';
import { useShareModal } from '@/lib/useShareModal';

const STATUS_STYLES: Record<ReportStatus, string> = {
  Open: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  'Under Review': 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  Resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  Declined: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
};

const STATUS_BAR_COLORS: Record<ReportStatus, string> = {
  Open: 'bg-sky-500',
  'Under Review': 'bg-amber-500',
  Resolved: 'bg-emerald-500',
  Declined: 'bg-rose-500',
};

function csvCell(value: string): string {
  const v = String(value ?? '');
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function buildCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = buildCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

const AVATAR_COLORS = ['#2563eb', '#dc2626', '#ea580c', '#16a34a', '#9333ea', '#0891b2', '#ca8a04', '#db2777'];

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

async function exportReportsPdf(reports: ReportSubmission[]): Promise<void> {
  const rows = reports.length
    ? reports
        .map(
          (r) =>
            `<tr><td>${escapeHtml(new Date(r.createdAt).toLocaleString())}</td><td>${escapeHtml(r.category)}</td><td>${escapeHtml(r.status)}</td><td>${escapeHtml(r.subject)}</td><td>${escapeHtml(r.details)}</td><td>${escapeHtml(r.authorName)}</td><td>${escapeHtml(r.contact)}</td><td style="text-align:right">${r.votes}</td><td style="text-align:right">${r.comments.length}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="9" style="text-align:center;color:#94a3b8">No submissions match the current filters.</td></tr>';
  const body = `<h1>Community Report Submissions</h1><p class="muted">${reports.length} submission${reports.length === 1 ? '' : 's'} · Exported ${new Date().toLocaleString()}</p><table><thead><tr><th>Date</th><th>Category</th><th>Status</th><th>Subject</th><th>Details</th><th>Author</th><th>Contact</th><th style="text-align:right">Votes</th><th style="text-align:right">Comments</th></tr></thead><tbody>${rows}</tbody></table>`;
  await printDocument({ html: buildPrintDocument('Community Reports', body) });
}

async function exportLeaderboardPdf(contributors: Contributor[]): Promise<void> {
  const rows = contributors
    .map(
      (c, i) =>
        `<tr><td>${i + 1}</td><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.badge)}</td><td style="text-align:right">${c.reports}</td><td style="text-align:right">${c.xp}</td></tr>`
    )
    .join('');
  const body = `<h1>Contributor Leaderboard</h1><p class="muted">${contributors.length} contributors · Exported ${new Date().toLocaleString()}</p><table><thead><tr><th>Rank</th><th>Name</th><th>Badge</th><th style="text-align:right">Reports</th><th style="text-align:right">XP</th></tr></thead><tbody>${rows}</tbody></table>`;
  await printDocument({ html: buildPrintDocument('Contributor Leaderboard', body) });
}

function exportReportsCsv(reports: ReportSubmission[]): void {
  const rows: string[][] = [
    ['Date', 'Category', 'Status', 'Subject', 'Details', 'Author', 'Contact', 'Votes', 'Comments'],
    ...reports.map((r) => [new Date(r.createdAt).toLocaleString(), r.category, r.status, r.subject, r.details, r.authorName, r.contact, String(r.votes), String(r.comments.length)]),
  ];
  downloadCsv(`smarthub-reports-${Date.now()}.csv`, rows);
}

function exportReportsJson(reports: ReportSubmission[]): void {
  const json = JSON.stringify(reports, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `smarthub-reports-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAuthorCsv(reports: ReportSubmission[], author: string): void {
  const filtered = reports.filter((r) => r.authorName.toLowerCase() === author.toLowerCase());
  const rows: string[][] = [
    ['Date', 'Category', 'Status', 'Subject', 'Details', 'Votes', 'Comments'],
    ...filtered.map((r) => [new Date(r.createdAt).toLocaleString(), r.category, r.status, r.subject, r.details, String(r.votes), String(r.comments.length)]),
  ];
  downloadCsv(`smarthub-author-${author.replace(/\s+/g, '_').toLowerCase()}-${Date.now()}.csv`, rows);
}

async function exportDateRangePdf(reports: ReportSubmission[], from: string, to: string): Promise<void> {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);
  const ranged = reports.filter((r) => {
    const created = new Date(r.createdAt);
    return created >= fromDate && created <= toDate;
  });
  const rows = ranged.length
    ? ranged
        .map(
          (r) =>
            `<tr><td>${escapeHtml(new Date(r.createdAt).toLocaleString())}</td><td>${escapeHtml(r.category)}</td><td>${escapeHtml(r.status)}</td><td>${escapeHtml(r.subject)}</td><td>${escapeHtml(r.authorName)}</td><td style="text-align:right">${r.votes}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="6" style="text-align:center;color:#94a3b8">No submissions in this date range.</td></tr>';
  const body = `<h1>Submissions: ${from} to ${to}</h1><p class="muted">${ranged.length} submission${ranged.length === 1 ? '' : 's'} in range · Exported ${new Date().toLocaleString()}</p><table><thead><tr><th>Date</th><th>Category</th><th>Status</th><th>Subject</th><th>Author</th><th style="text-align:right">Votes</th></tr></thead><tbody>${rows}</tbody></table>`;
  await printDocument({ html: buildPrintDocument('Date Range Report', body) });
}

function exportLeaderboardCsv(contributors: Contributor[]): void {
  const rows: string[][] = [
    ['Rank', 'Name', 'Badge', 'Reports', 'XP'],
    ...contributors.map((c, i) => [String(i + 1), c.name, c.badge, String(c.reports), String(c.xp)]),
  ];
  downloadCsv(`smarthub-leaderboard-${Date.now()}.csv`, rows);
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tpl_weekly_digest',
    name: 'Weekly Digest',
    subject: 'SmartHub Weekly Community Digest — {{count}} submissions',
    body: 'Hi {{recipient}},\n\nHere is your weekly summary of community submissions. There are currently {{count}} submissions matching your filters.\n\n--- Export Data ---\n{{data}}\n\nGenerated by SmartHub Global on {{date}}',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tpl_status_report',
    name: 'Status Report',
    subject: 'SmartHub Status Report — {{date}}',
    body: 'Hello {{recipient}},\n\nPlease find below the latest community submission export.\n\nTotal submissions: {{count}}\n\n--- Export Data ---\n{{data}}\n\nRegards,\nSmartHub Global',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tpl_notification',
    name: 'Notification Alert',
    subject: 'SmartHub Alert: {{title}}',
    body: 'Hi {{recipient}},\n\n{{body}}\n\nTime: {{date}}\nGenerated by SmartHub Global',
    createdAt: new Date().toISOString(),
  },
];

function renderTemplate(tpl: EmailTemplate, vars: Record<string, string>): { subject: string; body: string } {
  const replace = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? '');
  return { subject: replace(tpl.subject), body: replace(tpl.body) };
}

function computeNextRun(cadence: ScheduleCadence, from = new Date()): string {
  const d = new Date(from);
  if (cadence === 'daily') d.setDate(d.getDate() + 1);
  else if (cadence === 'weekly') d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

function buildExportData(reports: ReportSubmission[], format: ExportFormat): string {
  if (format === 'json') return JSON.stringify(reports, null, 2);
  return buildCsv([
    ['Date', 'Category', 'Status', 'Subject', 'Details', 'Author', 'Contact', 'Votes', 'Comments'],
    ...reports.map((r) => [new Date(r.createdAt).toLocaleString(), r.category, r.status, r.subject, r.details, r.authorName, r.contact, String(r.votes), String(r.comments.length)]),
  ]);
}

const CATEGORIES: ReportCategory[] = ['Bug Report', 'Feature Suggestion'];

const BADGE_META: Record<ImpactBadge, { icon: typeof Award; color: string; perk: string; xpThreshold: number }> = {
  'Beta Pioneer': { icon: Shield, color: 'text-sky-500', perk: '+150 XP, priority support', xpThreshold: 0 },
  'Master Innovator': { icon: Lightbulb, color: 'text-amber-500', perk: '+80 XP per shipped suggestion, exclusive rewards', xpThreshold: 300 },
  'Top Bug Hunter': { icon: Bug, color: 'text-rose-500', perk: '+100 XP per confirmed bug, verified badge', xpThreshold: 800 },
};

const SEED_CONTRIBUTORS: Contributor[] = [
  { id: uid('ctb'), name: 'Brian G.', badge: 'Beta Pioneer', xp: 1820, reports: 14 },
  { id: uid('ctb'), name: 'Aisha M.', badge: 'Top Bug Hunter', xp: 1340, reports: 22 },
  { id: uid('ctb'), name: 'Kevin O.', badge: 'Master Innovator', xp: 980, reports: 11 },
  { id: uid('ctb'), name: 'Faith W.', badge: 'Beta Pioneer', xp: 760, reports: 6 },
  { id: uid('ctb'), name: 'Dennis K.', badge: 'Top Bug Hunter', xp: 540, reports: 9 },
];

const BADGE_ORDER: ImpactBadge[] = ['Beta Pioneer', 'Master Innovator', 'Top Bug Hunter'];

function badgeForXp(xp: number, reportCount: number): ImpactBadge {
  if (reportCount >= 10 || xp >= 800) return 'Top Bug Hunter';
  if (reportCount >= 3 || xp >= 300) return 'Master Innovator';
  return 'Beta Pioneer';
}

type SortMode = 'newest' | 'votes' | 'comments';

function AuthorAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-9 w-9 text-sm';
  return (
    <div
      className={`${dim} grid shrink-0 place-items-center rounded-full font-bold text-white`}
      style={{ backgroundColor: avatarColor(name) }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}

function StatusSummaryChart({ reports }: { reports: ReportSubmission[] }) {
  const total = reports.length;
  const counts = useMemo(() => {
    const map: Record<ReportStatus, number> = { Open: 0, 'Under Review': 0, Resolved: 0, Declined: 0 };
    for (const r of reports) map[r.status]++;
    return map;
  }, [reports]);

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2 font-semibold">
        <Award className="h-5 w-5 text-blue-500" /> Status Summary
      </div>
      {total === 0 ? (
        <p className="py-3 text-center text-sm text-slate-400">No submissions to summarize.</p>
      ) : (
        <div className="space-y-2.5">
          {REPORT_STATUSES.map((status) => {
            const count = counts[status];
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={status}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">{status}</span>
                  <span className="text-slate-400">{count} · {pct}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${STATUS_BAR_COLORS[status]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs font-semibold dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">Total</span>
            <span className="text-slate-700 dark:text-slate-200">{total}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

export function CommunityModule({ api }: { api: AppApi }) {
  const reports = api.state.reports;
  const claimedBadges = api.state.claimedBadges ?? [];
  const shareModal = useShareModal();
  const [category, setCategory] = useState<ReportCategory>('Bug Report');
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [contact, setContact] = useState('');
  const [authorName, setAuthorName] = useState(api.state.bio.displayName || '');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | ReportCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [emailModal, setEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState<string>(COMMUNITY_LINKS.supportEmail);
  const [emailNote, setEmailNote] = useState('');
  const [attachPdf, setAttachPdf] = useState(false);
  // Advanced search filters
  const [authorFilter, setAuthorFilter] = useState('');
  const [minVotes, setMinVotes] = useState(0);
  const [commentFilter, setCommentFilter] = useState<'all' | 'has' | 'none'>('all');
  // Export tools
  const [exportOpen, setExportOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [authorExport, setAuthorExport] = useState('');
  // Email notification subscription
  const [subModal, setSubModal] = useState(false);
  const [subEmail, setSubEmail] = useState('');
  const [subEvents, setSubEvents] = useState({ statusChange: true, newComment: true, voteMilestone: false });
  // Custom email templates
  const [tplModal, setTplModal] = useState(false);
  const [editingTplId, setEditingTplId] = useState<string | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplSubject, setTplSubject] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [selectedTplId, setSelectedTplId] = useState('');
  // Scheduled exports
  const [schedModal, setSchedModal] = useState(false);
  const [schedName, setSchedName] = useState('');
  const [schedFormat, setSchedFormat] = useState<ExportFormat>('csv');
  const [schedCadence, setSchedCadence] = useState<ScheduleCadence>('weekly');
  const [schedRecipients, setSchedRecipients] = useState('');
  const [schedTplId, setSchedTplId] = useState('');
  // Webhook notifications
  const [webhookModal, setWebhookModal] = useState(false);
  const [whName, setWhName] = useState('');
  const [whUrl, setWhUrl] = useState('');
  const [whEvents, setWhEvents] = useState({ statusChange: true, newComment: true, voteMilestone: false });

  const notifications = api.state.notifications ?? [];
  const emailSubscriptions = api.state.emailSubscriptions ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const uniqueAuthors = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => set.add(r.authorName));
    return Array.from(set).sort();
  }, [reports]);

  const pushNotification = (notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    const full: AppNotification = {
      ...notif,
      id: uid('ntf'),
      createdAt: new Date().toISOString(),
      read: false,
    };
    api.patch((p) => ({ ...p, notifications: [full, ...(p.notifications ?? [])] }));
    // Trigger email notification for matching subscriptions
    const subs = api.state.emailSubscriptions ?? [];
    const matching = subs.filter((s) => {
      if (notif.kind === 'status' && s.events.statusChange) return true;
      if (notif.kind === 'comment' && s.events.newComment) return true;
      if (notif.kind === 'vote' && s.events.voteMilestone) return true;
      return false;
    });
    if (matching.length > 0) {
      const recipients = matching.map((s) => s.email).join(', ');
      const notifTpl = (api.state.emailTemplates ?? []).find((t) => t.id === 'tpl_notification');
      const rendered = notifTpl
        ? renderTemplate(notifTpl, { recipient: recipients, title: notif.title, body: notif.body, date: new Date().toLocaleString(), count: '', data: '' })
        : { subject: `SmartHub Notification: ${notif.title}`, body: `${notif.body}\n\nTime: ${new Date().toLocaleString()}\nGenerated by SmartHub Global` };
      const mailto = `mailto:${encodeURIComponent(recipients)}?subject=${encodeURIComponent(rendered.subject)}&body=${encodeURIComponent(rendered.body)}`;
      // Defer to avoid blocking the UI state update
      setTimeout(() => { window.location.href = mailto; }, 100);
    }
    // Fire webhook notifications for matching webhooks
    const hooks = api.state.webhooks ?? [];
    const matchingHooks = hooks.filter((h) => {
      if (!h.enabled) return false;
      if (notif.kind === 'status' && h.events.statusChange) return true;
      if (notif.kind === 'comment' && h.events.newComment) return true;
      if (notif.kind === 'vote' && h.events.voteMilestone) return true;
      return false;
    });
    for (const hook of matchingHooks) {
      fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: notif.kind,
          title: notif.title,
          body: notif.body,
          reportId: notif.reportId,
          timestamp: new Date().toISOString(),
          source: 'SmartHub Global',
        }),
        mode: 'no-cors',
      }).catch(() => {
        // Webhook failures are non-fatal — notifications still show in-app
      });
    }
  };

  const markAllRead = () => {
    api.patch((p) => ({ ...p, notifications: (p.notifications ?? []).map((n) => ({ ...n, read: true })) }));
  };

  const clearNotifications = () => {
    api.patch((p) => ({ ...p, notifications: [] }));
  };

  const addSubscription = () => {
    const email = sanitize(subEmail).trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast('Enter a valid email address.', 'error');
      return;
    }
    if (emailSubscriptions.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
      toast('This email is already subscribed.', 'info');
      return;
    }
    const sub: EmailSubscription = { email, events: subEvents };
    api.patch((p) => ({ ...p, emailSubscriptions: [...(p.emailSubscriptions ?? []), sub] }));
    setSubEmail('');
    toast('Email notification subscription added.');
  };

  const removeSubscription = (email: string) => {
    api.patch((p) => ({ ...p, emailSubscriptions: (p.emailSubscriptions ?? []).filter((s) => s.email !== email) }));
    toast('Subscription removed.');
  };

  const toggleSubEvent = (email: string, key: keyof EmailSubscription['events']) => {
    api.patch((p) => ({
      ...p,
      emailSubscriptions: (p.emailSubscriptions ?? []).map((s) =>
        s.email === email ? { ...s, events: { ...s.events, [key]: !s.events[key] } } : s
      ),
    }));
  };

  const emailTemplates = api.state.emailTemplates ?? [];
  const scheduledExports = api.state.scheduledExports ?? [];

  const ensureDefaultTemplates = () => {
    if (emailTemplates.length === 0) {
      api.patch((p) => ({ ...p, emailTemplates: DEFAULT_TEMPLATES }));
    }
  };

  const openTplModal = (tpl: EmailTemplate | null) => {
    if (tpl) {
      setEditingTplId(tpl.id);
      setTplName(tpl.name);
      setTplSubject(tpl.subject);
      setTplBody(tpl.body);
    } else {
      setEditingTplId(null);
      setTplName('');
      setTplSubject('');
      setTplBody('');
    }
    setTplModal(true);
  };

  const saveTemplate = () => {
    const name = sanitize(tplName).trim();
    const subject = sanitize(tplSubject).trim();
    const body = sanitize(tplBody).trim();
    if (!name || !subject || !body) {
      toast('Template name, subject, and body are required.', 'error');
      return;
    }
    if (name.length > 40) {
      toast('Template name must be under 40 characters.', 'error');
      return;
    }
    if (editingTplId) {
      api.patch((p) => ({
        ...p,
        emailTemplates: (p.emailTemplates ?? []).map((t) =>
          t.id === editingTplId ? { ...t, name, subject, body } : t
        ),
      }));
      toast('Email template updated.');
    } else {
      const tpl: EmailTemplate = {
        id: uid('tpl'),
        name,
        subject,
        body,
        createdAt: new Date().toISOString(),
      };
      api.patch((p) => ({ ...p, emailTemplates: [...(p.emailTemplates ?? []), tpl] }));
      toast('Email template created.');
    }
    setTplModal(false);
  };

  const deleteTemplate = (id: string) => {
    api.patch((p) => ({ ...p, emailTemplates: (p.emailTemplates ?? []).filter((t) => t.id !== id) }));
    toast('Template deleted.');
  };

  const addScheduledExport = () => {
    const name = sanitize(schedName).trim();
    const recipients = sanitize(schedRecipients).trim();
    if (!name || !recipients) {
      toast('Name and recipients are required.', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipients)) {
      toast('Enter a valid recipient email.', 'error');
      return;
    }
    const sched: ScheduledExport = {
      id: uid('sch'),
      name,
      format: schedFormat,
      cadence: schedCadence,
      recipients,
      templateId: schedTplId,
      createdAt: new Date().toISOString(),
      lastRun: null,
      nextRun: computeNextRun(schedCadence),
      enabled: true,
    };
    api.patch((p) => ({ ...p, scheduledExports: [...(p.scheduledExports ?? []), sched] }));
    setSchedName('');
    setSchedRecipients('');
    setSchedModal(false);
    toast('Scheduled export created.');
  };

  const toggleSchedEnabled = (id: string) => {
    api.patch((p) => ({
      ...p,
      scheduledExports: (p.scheduledExports ?? []).map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      ),
    }));
  };

  const deleteScheduledExport = (id: string) => {
    api.patch((p) => ({ ...p, scheduledExports: (p.scheduledExports ?? []).filter((s) => s.id !== id) }));
    toast('Scheduled export removed.');
  };

  const webhooks = api.state.webhooks ?? [];

  const addWebhook = () => {
    const name = sanitize(whName).trim();
    const url = sanitize(whUrl).trim();
    if (!name || !url) {
      toast('Webhook name and URL are required.', 'error');
      return;
    }
    if (!isSafeUrl(url) || !url.startsWith('https://')) {
      toast('Webhook URL must be a valid https:// URL.', 'error');
      return;
    }
    if (webhooks.some((w) => w.url === url)) {
      toast('This webhook URL is already configured.', 'info');
      return;
    }
    const hook: WebhookConfig = {
      id: uid('wh'),
      name,
      url,
      events: whEvents,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    api.patch((p) => ({ ...p, webhooks: [...(p.webhooks ?? []), hook] }));
    setWhName('');
    setWhUrl('');
    setWhEvents({ statusChange: true, newComment: true, voteMilestone: false });
    setWebhookModal(false);
    toast('Webhook added.');
  };

  const toggleWebhookEnabled = (id: string) => {
    api.patch((p) => ({
      ...p,
      webhooks: (p.webhooks ?? []).map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w)),
    }));
  };

  const toggleWebhookEvent = (id: string, key: keyof WebhookConfig['events']) => {
    api.patch((p) => ({
      ...p,
      webhooks: (p.webhooks ?? []).map((w) =>
        w.id === id ? { ...w, events: { ...w.events, [key]: !w.events[key] } } : w
      ),
    }));
  };

  const deleteWebhook = (id: string) => {
    api.patch((p) => ({ ...p, webhooks: (p.webhooks ?? []).filter((w) => w.id !== id) }));
    toast('Webhook removed.');
  };

  const testWebhook = async (hook: WebhookConfig) => {
    toast(`Sending test request to "${hook.name}"…`);
    try {
      await fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test',
          title: 'SmartHub Webhook Test',
          body: `This is a test notification from webhook "${hook.name}". If you received this, your webhook is configured correctly.`,
          reportId: null,
          timestamp: new Date().toISOString(),
          source: 'SmartHub Global',
        }),
        mode: 'no-cors',
      });
      toast(`Test sent to "${hook.name}". Check your service for delivery.`);
    } catch {
      toast(`Test failed for "${hook.name}". Check the URL and try again.`, 'error');
    }
  };

  const submit = () => {
    const s = sanitize(subject);
    const d = sanitize(details);
    const c = sanitize(contact);
    const a = sanitize(authorName) || 'Anonymous';
    if (!s || !d) {
      toast('Subject and details are required.', 'error');
      return;
    }
    if (s.length > 80 || d.length > 600) {
      toast('Keep subject under 80 and details under 600 characters.', 'error');
      return;
    }
    const report: ReportSubmission = {
      id: uid('rp'),
      category,
      subject: s,
      details: d,
      contact: c,
      authorName: a,
      createdAt: new Date().toISOString(),
      status: 'Open',
      votes: 0,
      comments: [],
    };
    api.patch((p) => ({ ...p, reports: [report, ...p.reports] }));
    setSubject('');
    setDetails('');
    setContact('');
    toast('Report submitted. Thank you for helping improve SmartHub!');
  };

  const contributors = useMemo(() => {
    const userReports = reports.length;
    const userXp = api.state.gamer.xp + userReports * 20;
    const user: Contributor = {
      id: 'you',
      name: `${api.state.bio.displayName || 'You'} (You)`,
      badge: badgeForXp(userXp, userReports),
      xp: userXp,
      reports: userReports,
    };
    return [...SEED_CONTRIBUTORS, user].sort((a, b) => b.xp - a.xp);
  }, [reports, api.state.gamer.xp, api.state.bio.displayName]);

  const filteredReports = useMemo(() => {
    const q = sanitize(search).toLowerCase();
    const authorQ = sanitize(authorFilter).toLowerCase();
    const now = new Date();
    const result = reports.filter((r) => {
      if (filter !== 'all' && r.category !== filter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (authorQ && !r.authorName.toLowerCase().includes(authorQ)) return false;
      if (minVotes > 0 && r.votes < minVotes) return false;
      if (commentFilter === 'has' && r.comments.length === 0) return false;
      if (commentFilter === 'none' && r.comments.length > 0) return false;
      if (q) {
        const haystack = `${r.subject} ${r.details} ${r.category} ${r.contact} ${r.authorName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (dateFilter !== 'all') {
        const created = new Date(r.createdAt);
        const days = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        if (dateFilter === 'today' && days > 1) return false;
        if (dateFilter === 'week' && days > 7) return false;
        if (dateFilter === 'month' && days > 30) return false;
      }
      return true;
    });
    const sorted = [...result];
    if (sortMode === 'votes') sorted.sort((a, b) => b.votes - a.votes || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sortMode === 'comments') sorted.sort((a, b) => b.comments.length - a.comments.length || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sorted;
  }, [reports, search, filter, statusFilter, dateFilter, sortMode, authorFilter, minVotes, commentFilter]);

  const hasAdvancedFilters = authorFilter !== '' || minVotes > 0 || commentFilter !== 'all';

  const runScheduledExportNow = (sched: ScheduledExport) => {
    const tpl = emailTemplates.find((t) => t.id === sched.templateId);
    const data = buildExportData(filteredReports, sched.format);
    const rendered = tpl
      ? renderTemplate(tpl, {
          recipient: sched.recipients,
          count: String(filteredReports.length),
          data,
          date: new Date().toLocaleString(),
          title: sched.name,
        })
      : { subject: `SmartHub Scheduled Export — ${sched.name}`, body: data };
    const mailto = `mailto:${encodeURIComponent(sched.recipients)}?subject=${encodeURIComponent(rendered.subject)}&body=${encodeURIComponent(rendered.body)}`;
    window.location.href = mailto;
    api.patch((p) => ({
      ...p,
      scheduledExports: (p.scheduledExports ?? []).map((s) =>
        s.id === sched.id ? { ...s, lastRun: new Date().toISOString(), nextRun: computeNextRun(s.cadence) } : s
      ),
    }));
    toast(`Scheduled export "${sched.name}" triggered.`);
  };

  // Scheduler: check every 60s for due scheduled exports
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const due = (api.state.scheduledExports ?? []).filter(
        (s) => s.enabled && new Date(s.nextRun) <= now
      );
      if (due.length > 0) {
        due.forEach((sched) => runScheduledExportNow(sched));
      }
    }, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredReports, emailTemplates]);

  const handleAdvancedExport = async (type: 'json' | 'datePdf' | 'authorCsv') => {
    try {
      if (type === 'json') {
        if (filteredReports.length === 0) { toast('No submissions match the current filters.', 'info'); return; }
        exportReportsJson(filteredReports);
        toast(`${filteredReports.length} submission${filteredReports.length === 1 ? '' : 's'} exported as JSON.`);
        setExportOpen(false);
      } else if (type === 'datePdf') {
        if (!dateFrom || !dateTo) { toast('Select both from and to dates.', 'error'); return; }
        if (new Date(dateFrom) > new Date(dateTo)) { toast('From date must be before to date.', 'error'); return; }
        await exportDateRangePdf(reports, dateFrom, dateTo);
        toast('Date-range PDF ready to print or save.');
        setExportOpen(false);
      } else {
        if (!sanitize(authorExport)) { toast('Enter an author name to export.', 'error'); return; }
        const matching = reports.filter((r) => r.authorName.toLowerCase() === sanitize(authorExport).toLowerCase());
        if (matching.length === 0) { toast('No submissions found for that author.', 'info'); return; }
        exportAuthorCsv(reports, sanitize(authorExport));
        toast(`${matching.length} submission${matching.length === 1 ? '' : 's'} by ${sanitize(authorExport)} exported as CSV.`);
        setExportOpen(false);
      }
    } catch {
      toast('Export failed. Please try again.', 'error');
    }
  };

  const handleExportReports = async (format: 'csv' | 'pdf') => {
    if (filteredReports.length === 0) {
      toast('No submissions match the current filters.', 'info');
      return;
    }
    try {
      if (format === 'csv') {
        exportReportsCsv(filteredReports);
        toast(`${filteredReports.length} report${filteredReports.length === 1 ? '' : 's'} exported as CSV.`);
      } else {
        await exportReportsPdf(filteredReports);
        toast('Reports PDF ready to print or save.');
      }
    } catch {
      toast('Export failed. Please try again.', 'error');
    }
  };

  const handleExportLeaderboard = async (format: 'csv' | 'pdf') => {
    try {
      if (format === 'csv') {
        exportLeaderboardCsv(contributors);
        toast('Leaderboard CSV downloaded.');
      } else {
        await exportLeaderboardPdf(contributors);
        toast('Leaderboard PDF ready to print or save.');
      }
    } catch {
      toast('Export failed. Please try again.', 'error');
    }
  };

  const earnedBadges = useMemo(() => {
    const userReports = reports.length;
    const userXp = api.state.gamer.xp + userReports * 20;
    return BADGE_ORDER.filter(
      (badge) => (userReports >= (badge === 'Beta Pioneer' ? 0 : badge === 'Master Innovator' ? 3 : 10)) || userXp >= BADGE_META[badge].xpThreshold
    );
  }, [reports, api.state.gamer.xp]);

  const claimBadge = (badge: ImpactBadge) => {
    if (claimedBadges.includes(badge)) {
      toast('This badge reward has already been claimed.', 'info');
      return;
    }
    const xpReward = badge === 'Beta Pioneer' ? 150 : badge === 'Master Innovator' ? 80 : 100;
    api.patch((p) => ({
      ...p,
      claimedBadges: [...(p.claimedBadges ?? []), badge],
      gamer: { ...p.gamer, xp: p.gamer.xp + xpReward },
    }));
    toast(`${badge} badge claimed! +${xpReward} XP added to your Gamer Hub.`);
  };

  const setReportStatus = (id: string, status: ReportStatus) => {
    const report = reports.find((r) => r.id === id);
    const oldStatus = report?.status;
    api.patch((p) => ({
      ...p,
      reports: p.reports.map((r) => (r.id === id ? { ...r, status } : r)),
    }));
    if (report && oldStatus !== status) {
      pushNotification({
        kind: 'status',
        title: `Status updated: ${report.subject}`,
        body: `"${report.subject}" changed from ${oldStatus} to ${status}.`,
        reportId: id,
      });
    }
  };

  const toggleVote = (id: string) => {
    const report = reports.find((r) => r.id === id);
    const wasVoted = report?.voted ?? false;
    const oldVotes = report?.votes ?? 0;
    api.patch((p) => ({
      ...p,
      reports: p.reports.map((r) =>
        r.id === id ? { ...r, votes: r.voted ? Math.max(0, r.votes - 1) : r.votes + 1, voted: !r.voted } : r
      ),
    }));
    if (report && !wasVoted) {
      const newVotes = oldVotes + 1;
      if (newVotes === 5 || newVotes === 10 || newVotes === 25 || newVotes === 50) {
        pushNotification({
          kind: 'vote',
          title: `Vote milestone: ${report.subject}`,
          body: `"${report.subject}" reached ${newVotes} votes.`,
          reportId: id,
        });
      }
    }
  };

  const addComment = (reportId: string) => {
    const text = sanitize(commentDrafts[reportId] ?? '').trim();
    if (!text) {
      toast('Comment cannot be empty.', 'error');
      return;
    }
    if (text.length > 300) {
      toast('Keep comments under 300 characters.', 'error');
      return;
    }
    const comment: ReportComment = {
      id: uid('cm'),
      author: api.state.bio.displayName || 'You',
      text,
      createdAt: new Date().toISOString(),
    };
    api.patch((p) => ({
      ...p,
      reports: p.reports.map((r) => (r.id === reportId ? { ...r, comments: [...r.comments, comment] } : r)),
    }));
    setCommentDrafts((prev) => ({ ...prev, [reportId]: '' }));
    const report = reports.find((r) => r.id === reportId);
    if (report) {
      pushNotification({
        kind: 'comment',
        title: `New comment on: ${report.subject}`,
        body: `${comment.author} commented: "${text.slice(0, 80)}${text.length > 80 ? '…' : ''}"`,
        reportId,
      });
    }
    toast('Comment added.');
  };

  const toggleComments = (id: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Bulk selection
  const visibleIds = filteredReports.map((r) => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const bulkSetStatus = (status: ReportStatus) => {
    if (selectedIds.size === 0) {
      toast('Select at least one submission first.', 'info');
      return;
    }
    const changed = reports.filter((r) => selectedIds.has(r.id) && r.status !== status);
    api.patch((p) => ({
      ...p,
      reports: p.reports.map((r) => (selectedIds.has(r.id) ? { ...r, status } : r)),
    }));
    changed.forEach((r) => {
      pushNotification({
        kind: 'status',
        title: `Status updated: ${r.subject}`,
        body: `"${r.subject}" changed from ${r.status} to ${status}.`,
        reportId: r.id,
      });
    });
    toast(`Updated ${selectedIds.size} submission${selectedIds.size === 1 ? '' : 's'} to "${status}".`);
    setSelectedIds(new Set());
  };
  const clearSelection = () => setSelectedIds(new Set());

  const sendExportEmail = async () => {
    const to = sanitize(emailTo);
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      toast('Enter a valid email address.', 'error');
      return;
    }
    if (filteredReports.length === 0) {
      toast('No submissions match the current filters to send.', 'info');
      return;
    }
    const csv = buildCsv([
      ['Date', 'Category', 'Status', 'Subject', 'Details', 'Author', 'Contact', 'Votes', 'Comments'],
      ...filteredReports.map((r) => [new Date(r.createdAt).toLocaleString(), r.category, r.status, r.subject, r.details, r.authorName, r.contact, String(r.votes), String(r.comments.length)]),
    ]);
    if (attachPdf) {
      try {
        await exportReportsPdf(filteredReports);
      } catch {
        toast('PDF generation failed, sending CSV only.', 'error');
      }
    }
    const note = sanitize(emailNote);
    const attachmentNote = attachPdf ? '\n\nA PDF copy of this export has been generated and downloaded. Please attach it to this email before sending.\n' : '';
    const tpl = (api.state.emailTemplates ?? []).find((t) => t.id === selectedTplId);
    const { subject: subjectLine, body } = tpl
      ? renderTemplate(tpl, { recipient: to, count: String(filteredReports.length), data: csv, date: new Date().toLocaleString(), title: '', body: '' })
      : { subject: `SmartHub Community Report Export — ${filteredReports.length} submission${filteredReports.length === 1 ? '' : 's'}`, body: `${note ? note + '\n\n' : ''}--- CSV Data ---\n${csv}${attachmentNote}\n\nGenerated by SmartHub Global on ${new Date().toLocaleString()}` };
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setEmailModal(false);
    toast(attachPdf ? 'PDF downloaded. Your email app should open — attach the PDF file before sending.' : 'Your email app should open with the export attached in the body.');
  };

  const sortLabels: Record<SortMode, string> = { newest: 'Newest', votes: 'Top Voted', comments: 'Most Discussed' };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Community & Support Hub"
        subtitle="Report issues, suggest features, and climb the contributor leaderboard for exclusive Gamer Hub perks."
      />

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <a
            href={COMMUNITY_LINKS.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp Group
          </a>
          <a
            href={COMMUNITY_LINKS.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-[#1877F2] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            <Facebook className="h-4 w-4" /> Facebook Group
          </a>
        </div>
        <Button variant="secondary" onClick={() => shareModal.setOpen(true)} icon={<Share2 className="h-4 w-4" />}>
          Share SmartHub
        </Button>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <AnalyticsDashboard reports={reports} />
        </div>

        {/* Report / Suggestion form */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 font-semibold">
            <Send className="h-5 w-5 text-blue-500" /> Report a Problem or Suggestion
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {CATEGORIES.map((cat) => {
              const Icon = cat === 'Bug Report' ? Bug : Lightbulb;
              const active = category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-white text-blue-600 shadow dark:bg-slate-900 dark:text-blue-400'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {cat}
                </button>
              );
            })}
          </div>

          <Field label="Your name" hint="Shown on your submission as the author.">
            <input
              className={inputClass}
              value={authorName}
              maxLength={40}
              onChange={(e) => setAuthorName(sanitize(e.target.value))}
              placeholder="Your name or handle"
            />
          </Field>
          <Field label="Subject">
            <input
              className={inputClass}
              value={subject}
              maxLength={80}
              onChange={(e) => setSubject(sanitize(e.target.value))}
              placeholder="Brief summary"
            />
          </Field>
          <Field label="Details">
            <textarea
              className={inputClass}
              rows={4}
              maxLength={600}
              value={details}
              onChange={(e) => setDetails(sanitize(e.target.value))}
              placeholder="Describe the bug or your suggestion…"
            />
          </Field>
          <Field label="Contact (optional)" hint="Email or phone so we can follow up.">
            <input
              className={inputClass}
              value={contact}
              maxLength={60}
              onChange={(e) => setContact(sanitize(e.target.value))}
              placeholder="you@example.com"
            />
          </Field>
          <Button onClick={submit} fullWidth icon={<Send className="h-4 w-4" />}>
            Submit {category}
          </Button>
        </Card>

        {/* Contributor leaderboard + badges */}
        <div className="space-y-4">
          <StatusSummaryChart reports={reports} />

          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold">
                {unreadCount > 0 ? <BellRing className="h-5 w-5 text-amber-500" /> : <Bell className="h-5 w-5 text-slate-400" />} Notifications
                {unreadCount > 0 && (
                  <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unreadCount}</span>
                )}
              </div>
              {notifications.length > 0 && (
                <div className="flex gap-1.5">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
                      Mark all read
                    </button>
                  )}
                  <button onClick={clearNotifications} title="Clear all" className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-400">No notifications yet. You'll see updates here when submissions change status, get comments, or hit vote milestones.</p>
            ) : (
              <ul className="max-h-48 space-y-1.5 overflow-y-auto">
                {notifications.slice(0, 20).map((n) => (
                  <li key={n.id} className={`rounded-lg px-2.5 py-2 text-xs ${n.read ? 'bg-slate-50 dark:bg-slate-800/30' : 'bg-blue-50 dark:bg-blue-500/10'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{n.title}</span>
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />}
                    </div>
                    <p className="mt-0.5 text-slate-500 dark:text-slate-400">{n.body}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <Mail className="h-5 w-5 text-emerald-500" /> Email Notifications
              </div>
              <button
                onClick={() => setSubModal(true)}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
              >
                <Bell className="h-3.5 w-3.5" /> Subscribe
              </button>
            </div>
            {emailSubscriptions.length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-400">No email subscriptions yet. Subscribe to get email alerts when submissions change.</p>
            ) : (
              <ul className="space-y-2">
                {emailSubscriptions.map((s) => (
                  <li key={s.email} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{s.email}</span>
                      <button
                        onClick={() => removeSubscription(s.email)}
                        className="shrink-0 text-xs font-semibold text-rose-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {(['statusChange', 'newComment', 'voteMilestone'] as const).map((key) => {
                        const label = key === 'statusChange' ? 'Status' : key === 'newComment' ? 'Comments' : 'Votes';
                        const active = s.events[key];
                        return (
                          <button
                            key={key}
                            onClick={() => toggleSubEvent(s.email, key)}
                            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
                              active
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                            }`}
                          >
                            {label} {active ? 'On' : 'Off'}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <FileText className="h-5 w-5 text-blue-500" /> Email Templates
              </div>
              <button
                onClick={() => { ensureDefaultTemplates(); openTplModal(null); }}
                className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500"
              >
                <Plus className="h-3.5 w-3.5" /> New Template
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Use variables <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{`{{recipient}}`}</code>, <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{`{{count}}`}</code>, <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{`{{data}}`}</code>, <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{`{{date}}`}</code>, <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{`{{title}}`}</code>, <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{`{{body}}`}</code> in subject and body.
            </p>
            {emailTemplates.length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-400">No templates yet. Create one or load defaults.</p>
            ) : (
              <ul className="space-y-2">
                {emailTemplates.map((tpl) => (
                  <li key={tpl.id} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-semibold">{tpl.name}</span>
                        <p className="truncate text-xs text-slate-400">{tpl.subject}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => openTplModal(tpl)} title="Edit" className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteTemplate(tpl.id)} title="Delete" className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-rose-500 transition hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-500/15">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {emailTemplates.length === 0 && (
              <button onClick={ensureDefaultTemplates} className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
                Load default templates
              </button>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <CalendarClock className="h-5 w-5 text-violet-500" /> Scheduled Exports
              </div>
              <button
                onClick={() => setSchedModal(true)}
                className="flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500"
              >
                <Plus className="h-3.5 w-3.5" /> New Schedule
              </button>
            </div>
            {scheduledExports.length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-400">No scheduled exports yet. Set up recurring exports delivered to your email.</p>
            ) : (
              <ul className="space-y-2">
                {scheduledExports.map((sched) => (
                  <li key={sched.id} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold">{sched.name}</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${sched.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                            {sched.enabled ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-slate-400">
                          <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {sched.cadence}</span>
                          <span className="flex items-center gap-0.5"><FileClock className="h-3 w-3" /> {sched.format.toUpperCase()}</span>
                          <span className="truncate">{sched.recipients}</span>
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          Next: {new Date(sched.nextRun).toLocaleString()}
                          {sched.lastRun && ` · Last: ${new Date(sched.lastRun).toLocaleString()}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button onClick={() => runScheduledExportNow(sched)} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                          Run now
                        </button>
                        <button onClick={() => toggleSchedEnabled(sched.id)} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                          {sched.enabled ? 'Pause' : 'Resume'}
                        </button>
                        <button onClick={() => deleteScheduledExport(sched.id)} className="rounded-md bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-500 transition hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20">
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <Webhook className="h-5 w-5 text-cyan-500" /> Webhook Notifications
              </div>
              <button
                onClick={() => setWebhookModal(true)}
                className="flex items-center gap-1 rounded-lg bg-cyan-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-500"
              >
                <Plus className="h-3.5 w-3.5" /> Add Webhook
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Send POST requests to external services (Slack, Discord, Zapier, etc.) when community events fire.
            </p>
            {webhooks.length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-400">No webhooks configured. Add one to push notifications to external services.</p>
            ) : (
              <ul className="space-y-2">
                {webhooks.map((hook) => (
                  <li key={hook.id} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold">{hook.name}</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${hook.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                            {hook.enabled ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">
                          <Link2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{hook.url}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => testWebhook(hook)}
                          title="Send test notification"
                          className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                        >
                          Test
                        </button>
                        <button
                          onClick={() => toggleWebhookEnabled(hook.id)}
                          title={hook.enabled ? 'Disable' : 'Enable'}
                          className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${hook.enabled ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400'}`}
                        >
                          {hook.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => deleteWebhook(hook.id)}
                          title="Delete"
                          className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-rose-500 transition hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-500/15"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {(['statusChange', 'newComment', 'voteMilestone'] as const).map((key) => {
                        const label = key === 'statusChange' ? 'Status' : key === 'newComment' ? 'Comments' : 'Votes';
                        const active = hook.events[key];
                        return (
                          <button
                            key={key}
                            onClick={() => toggleWebhookEvent(hook.id, key)}
                            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
                              active
                                ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                            }`}
                          >
                            {label} {active ? 'On' : 'Off'}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <Trophy className="h-5 w-5 text-amber-500" /> Impact Badge Rewards
            </div>
            <ul className="space-y-2">
              {BADGE_ORDER.map((badge) => {
                const meta = BADGE_META[badge];
                const Icon = meta.icon;
                const earned = earnedBadges.includes(badge);
                const claimed = claimedBadges.includes(badge);
                const xpReward = badge === 'Beta Pioneer' ? 150 : badge === 'Master Innovator' ? 80 : 100;
                return (
                  <li key={badge} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700">
                    <div className={`grid h-9 w-9 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800 ${meta.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-semibold">
                        {badge}
                        {claimed && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                      </div>
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">{meta.perk}</div>
                    </div>
                    {earned && !claimed && (
                      <button
                        onClick={() => claimBadge(badge)}
                        className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                      >
                        <Gift className="h-3.5 w-3.5" /> +{xpReward} XP
                      </button>
                    )}
                    {!earned && (
                      <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-400 dark:bg-slate-800">
                        Locked
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <Award className="h-5 w-5 text-cyan-500" /> Contributor Leaderboard
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleExportLeaderboard('csv')}
                  title="Export as CSV"
                  className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleExportLeaderboard('pdf')}
                  title="Export as PDF"
                  className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <FileText className="h-4 w-4" />
                </button>
              </div>
            </div>
            <ol className="space-y-2">
              {contributors.map((c, i) => {
                const isYou = c.id === 'you';
                return (
                  <li
                    key={c.id}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                      isYou ? 'border border-blue-400 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10' : 'border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{c.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {c.reports} reports · {c.xp} XP
                      </div>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold ${BADGE_META[c.badge].color}`}>{c.badge}</span>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>
      </div>

      {/* Past submissions with search + category + date + sort filters */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-semibold">
            <Bug className="h-5 w-5 text-slate-400" /> Your submissions
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {filteredReports.length} of {reports.length}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1.5">
              <button
                onClick={() => handleExportReports('csv')}
                title="Export filtered as CSV"
                className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <FileSpreadsheet className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleExportReports('pdf')}
                title="Export filtered as PDF"
                className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <FileText className="h-4 w-4" />
              </button>
              <button
                onClick={() => setEmailModal(true)}
                title="Send export via email"
                className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <Mail className="h-4 w-4" />
              </button>
              <button
                onClick={() => setExportOpen((v) => !v)}
                title="Advanced export tools"
                className={`grid h-8 w-8 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 ${exportOpen ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800'}`}
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter row: search + category + date + sort */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[160px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClass} pl-9`}
              value={search}
              maxLength={100}
              onChange={(e) => setSearch(sanitize(e.target.value))}
              placeholder="Search subject, details, author, contact…"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            {(['all', ...CATEGORIES] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                  filter === f
                    ? 'bg-white text-slate-800 shadow dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {f === 'all' ? 'All' : f === 'Bug Report' ? 'Bugs' : 'Ideas'}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            {(['all', 'today', 'week', 'month'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDateFilter(d)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold capitalize transition ${
                  dateFilter === d
                    ? 'bg-white text-slate-800 shadow dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {d === 'all' ? 'All time' : d === 'today' ? 'Today' : d === 'week' ? '7 days' : '30 days'}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            <ArrowUpDown className="ml-1.5 mr-0.5 h-4 w-4 self-center text-slate-400" />
            {(['newest', 'votes', 'comments'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSortMode(m)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                  sortMode === m
                    ? 'bg-white text-slate-800 shadow dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {sortLabels[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
          {(['all', ...REPORT_STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === s
                  ? 'bg-white text-slate-800 shadow dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {s === 'all' ? 'All statuses' : s}
            </button>
          ))}
        </div>

        {/* Advanced search filters */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
          <Filter className="h-4 w-4 shrink-0 text-slate-400" />
          <div className="relative min-w-[120px] flex-1">
            <User className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClass} py-1.5 pl-8 text-xs`}
              value={authorFilter}
              maxLength={40}
              list="author-list"
              onChange={(e) => setAuthorFilter(sanitize(e.target.value))}
              placeholder="Filter by author…"
            />
            <datalist id="author-list">
              {uniqueAuthors.map((a) => <option key={a} value={a} />)}
            </datalist>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Min votes</label>
            <input
              type="number"
              min={0}
              max={999}
              value={minVotes}
              onChange={(e) => setMinVotes(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            {(['all', 'has', 'none'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCommentFilter(c)}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                  commentFilter === c
                    ? 'bg-white text-slate-800 shadow dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {c === 'all' ? 'All' : c === 'has' ? 'Has comments' : 'No comments'}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced export tools panel */}
        {exportOpen && (
          <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-500/30 dark:bg-blue-500/5">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
              <Download className="h-4 w-4" /> Advanced Export Tools
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Export as JSON</span>
                <p className="text-[11px] text-slate-400">Full data dump of filtered submissions.</p>
                <Button onClick={() => handleAdvancedExport('json')} className="px-3 py-2 text-xs" icon={<Download className="h-3.5 w-3.5" />}>Export JSON</Button>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Date-range PDF</span>
                <p className="text-[11px] text-slate-400">Printable PDF for a custom date range.</p>
                <div className="flex items-center gap-1">
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                </div>
                <Button onClick={() => handleAdvancedExport('datePdf')} className="px-3 py-2 text-xs" icon={<FileText className="h-3.5 w-3.5" />}>Generate PDF</Button>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Per-author CSV</span>
                <p className="text-[11px] text-slate-400">All submissions by one author.</p>
                <input
                  className={inputClass}
                  value={authorExport}
                  maxLength={40}
                  list="author-list"
                  onChange={(e) => setAuthorExport(sanitize(e.target.value))}
                  placeholder="Author name…"
                />
                <Button onClick={() => handleAdvancedExport('authorCsv')} className="px-3 py-2 text-xs" icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>Export</Button>
              </div>
            </div>
          </div>
        )}

        {(search || filter !== 'all' || statusFilter !== 'all' || dateFilter !== 'all' || hasAdvancedFilters) && (
          <button
            onClick={() => { setSearch(''); setFilter('all'); setStatusFilter('all'); setDateFilter('all'); setAuthorFilter(''); setMinVotes(0); setCommentFilter('all'); }}
            className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            Clear all filters
          </button>
        )}

        {/* Bulk selection bar */}
        {filteredReports.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
            >
              {allVisibleSelected ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
              {allVisibleSelected ? 'Deselect all' : 'Select all'}
            </button>
            {selectedIds.size > 0 && (
              <>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {selectedIds.size} selected
                </span>
                <div className="flex items-center gap-1">
                  {REPORT_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => bulkSetStatus(s)}
                      className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${STATUS_STYLES[s]} hover:opacity-80`}
                    >
                      Set {s}
                    </button>
                  ))}
                </div>
                <button
                  onClick={clearSelection}
                  className="ml-auto text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        )}

        {filteredReports.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            {reports.length === 0 ? 'No submissions yet. Send your first report above.' : 'No submissions match the current filters.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {filteredReports.map((r) => {
              const isSelected = selectedIds.has(r.id);
              const commentsOpen = expandedComments.has(r.id);
              return (
                <li key={r.id} className={`rounded-xl border px-3.5 py-3 transition ${isSelected ? 'border-blue-400 bg-blue-50/50 dark:border-blue-500/40 dark:bg-blue-500/5' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => toggleSelect(r.id)}
                      className="mt-0.5 shrink-0 rounded p-0.5 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {isSelected ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
                    </button>
                    <AuthorAvatar name={r.authorName} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold">{r.subject}</span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              r.category === 'Bug Report'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                            }`}
                          >
                            {r.category}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[r.status]}`}>
                            {r.status}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{r.details}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> {r.authorName}
                        </span>
                        {r.contact && <span>Contact: {r.contact}</span>}
                        <span>{new Date(r.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 pl-10">
                    <div className="relative">
                      <select
                        value={r.status}
                        onChange={(e) => setReportStatus(r.id, e.target.value as ReportStatus)}
                        className={`appearance-none rounded-lg py-1 pl-2.5 pr-7 text-xs font-semibold transition ${STATUS_STYLES[r.status]} cursor-pointer`}
                      >
                        {REPORT_STATUSES.map((s) => (
                          <option key={s} value={s} className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">{s}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-70" />
                    </div>
                    <button
                      onClick={() => toggleVote(r.id)}
                      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                        r.voted
                          ? 'bg-blue-600 text-white hover:bg-blue-500'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" /> {r.votes}
                    </button>
                    <button
                      onClick={() => toggleComments(r.id)}
                      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                        commentsOpen
                          ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> {r.comments.length}
                    </button>
                  </div>

                  {commentsOpen && (
                    <div className="mt-2.5 space-y-2 pl-10">
                      {r.comments.length > 0 ? (
                        <ul className="space-y-1.5">
                          {r.comments.map((c) => (
                            <li key={c.id} className="flex items-start gap-2 rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-800/50">
                              <AuthorAvatar name={c.author} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{c.author}</span>
                                  <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300">{c.text}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400">No comments yet. Be the first to respond.</p>
                      )}
                      <div className="flex items-end gap-2">
                        <input
                          className={`${inputClass} flex-1`}
                          value={commentDrafts[r.id] ?? ''}
                          maxLength={300}
                          onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [r.id]: sanitize(e.target.value) }))}
                          placeholder="Write a comment…"
                        />
                        <Button onClick={() => addComment(r.id)} className="px-3 py-2 text-xs" icon={<Send className="h-3.5 w-3.5" />}>
                          Reply
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Email export modal */}
      <Modal
        open={emailModal}
        onClose={() => setEmailModal(false)}
        title="Send Export via Email"
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEmailModal(false)}>Cancel</Button>
            <Button onClick={sendExportEmail} icon={<Mail className="h-4 w-4" />}>Open Email App</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-sm text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            <FileSpreadsheet className="h-4 w-4 shrink-0" />
            <span>{filteredReports.length} filtered submission{filteredReports.length === 1 ? '' : 's'} will be included as CSV in the email body.</span>
          </div>
          <Field label="Send to">
            <input
              className={inputClass}
              value={emailTo}
              maxLength={80}
              onChange={(e) => setEmailTo(sanitize(e.target.value))}
              placeholder="recipient@example.com"
            />
          </Field>
          <Field label="Email template (optional)" hint="Select a template to auto-fill the subject and body.">
            <select
              value={selectedTplId}
              onChange={(e) => setSelectedTplId(e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">No template (default format)</option>
              {emailTemplates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Message (optional)" hint="Adds a personal note above the CSV data (ignored when using a template).">
            <textarea
              className={inputClass}
              rows={3}
              maxLength={300}
              value={emailNote}
              onChange={(e) => setEmailNote(sanitize(e.target.value))}
              placeholder="Hi, here are the community reports from SmartHub…"
            />
          </Field>
          <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
            <input
              type="checkbox"
              checked={attachPdf}
              onChange={() => setAttachPdf((v) => !v)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="text-sm font-semibold">Generate PDF attachment</div>
              <div className="text-xs text-slate-400">Downloads a styled PDF of the filtered submissions to attach before sending.</div>
            </div>
          </label>
          <p className="text-xs text-slate-400">
            This opens your device's default email app with the CSV data pre-filled in the message body.
          </p>
        </div>
      </Modal>

      {/* Email notification subscription modal */}
      <Modal
        open={subModal}
        onClose={() => setSubModal(false)}
        title="Subscribe to Email Notifications"
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSubModal(false)}>Cancel</Button>
            <Button onClick={addSubscription} icon={<Bell className="h-4 w-4" />}>Add Subscription</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Get email alerts when submissions change. Your email app opens with a pre-filled notification message.
          </p>
          <Field label="Email address">
            <input
              className={inputClass}
              value={subEmail}
              maxLength={80}
              onChange={(e) => setSubEmail(sanitize(e.target.value))}
              placeholder="you@example.com"
            />
          </Field>
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Notify me about</span>
            {([
              ['statusChange', 'Status changes', 'When a submission is moved to a new status'],
              ['newComment', 'New comments', 'When someone comments on a submission'],
              ['voteMilestone', 'Vote milestones', 'When a submission hits 5, 10, 25, or 50 votes'],
            ] as const).map(([key, label, desc]) => (
              <label key={key} className="flex items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={subEvents[key]}
                  onChange={() => setSubEvents((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="text-xs text-slate-400">{desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </Modal>

      {/* Email template editor modal */}
      <Modal
        open={tplModal}
        onClose={() => setTplModal(false)}
        title={editingTplId ? 'Edit Email Template' : 'New Email Template'}
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTplModal(false)}>Cancel</Button>
            <Button onClick={saveTemplate} icon={<Check className="h-4 w-4" />}>Save Template</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Use <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{`{{recipient}}`}</code>, <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{`{{count}}`}</code>, <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{`{{data}}`}</code>, <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{`{{date}}`}</code> as placeholders.
          </p>
          <Field label="Template name">
            <input
              className={inputClass}
              value={tplName}
              maxLength={40}
              onChange={(e) => setTplName(sanitize(e.target.value))}
              placeholder="e.g. Weekly Digest"
            />
          </Field>
          <Field label="Subject line">
            <input
              className={inputClass}
              value={tplSubject}
              maxLength={120}
              onChange={(e) => setTplSubject(sanitize(e.target.value))}
              placeholder="e.g. SmartHub Weekly Digest — {{count}} submissions"
            />
          </Field>
          <Field label="Body" hint="Use {{data}} where the export content should appear.">
            <textarea
              className={inputClass}
              rows={6}
              maxLength={1000}
              value={tplBody}
              onChange={(e) => setTplBody(sanitize(e.target.value))}
              placeholder={'Hi {{recipient}},\n\nHere is your export with {{count}} submissions.\n\n--- Export Data ---\n{{data}}\n\nGenerated on {{date}}'}
            />
          </Field>
        </div>
      </Modal>

      {/* Scheduled export modal */}
      <Modal
        open={schedModal}
        onClose={() => setSchedModal(false)}
        title="New Scheduled Export"
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSchedModal(false)}>Cancel</Button>
            <Button onClick={addScheduledExport} icon={<CalendarClock className="h-4 w-4" />}>Create Schedule</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Set up a recurring export that automatically opens your email app with the export data at the chosen cadence.
          </p>
          <Field label="Schedule name">
            <input
              className={inputClass}
              value={schedName}
              maxLength={40}
              onChange={(e) => setSchedName(sanitize(e.target.value))}
              placeholder="e.g. Weekly Community Digest"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Export format">
              <select
                value={schedFormat}
                onChange={(e) => setSchedFormat(e.target.value as ExportFormat)}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="pdf">PDF</option>
              </select>
            </Field>
            <Field label="Cadence">
              <select
                value={schedCadence}
                onChange={(e) => setSchedCadence(e.target.value as ScheduleCadence)}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </Field>
          </div>
          <Field label="Recipient email">
            <input
              className={inputClass}
              value={schedRecipients}
              maxLength={80}
              onChange={(e) => setSchedRecipients(sanitize(e.target.value))}
              placeholder="recipient@example.com"
            />
          </Field>
          <Field label="Email template (optional)">
            <select
              value={schedTplId}
              onChange={(e) => setSchedTplId(e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">No template (default format)</option>
              {emailTemplates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
              ))}
            </select>
          </Field>
          <p className="text-xs text-slate-400">
            The first run happens at the next scheduled time (9:00 AM). You can also trigger it manually with "Run now".
          </p>
        </div>
      </Modal>

      {/* Webhook configuration modal */}
      <Modal
        open={webhookModal}
        onClose={() => setWebhookModal(false)}
        title="Add Webhook Notification"
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setWebhookModal(false)}>Cancel</Button>
            <Button onClick={addWebhook} icon={<Webhook className="h-4 w-4" />}>Add Webhook</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure a webhook to receive POST requests when community events fire. Works with Slack, Discord, Zapier, and other automation tools.
          </p>
          <Field label="Webhook name">
            <input
              className={inputClass}
              value={whName}
              maxLength={40}
              onChange={(e) => setWhName(sanitize(e.target.value))}
              placeholder="e.g. Slack #community"
            />
          </Field>
          <Field label="Webhook URL" hint="Must be a valid https:// URL.">
            <input
              className={inputClass}
              value={whUrl}
              maxLength={300}
              onChange={(e) => setWhUrl(sanitize(e.target.value))}
              placeholder="https://hooks.slack.com/services/…"
            />
          </Field>
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Notify on</span>
            {([
              ['statusChange', 'Status changes', 'When a submission is moved to a new status'],
              ['newComment', 'New comments', 'When someone comments on a submission'],
              ['voteMilestone', 'Vote milestones', 'When a submission hits 5, 10, 25, or 50 votes'],
            ] as const).map(([key, label, desc]) => (
              <label key={key} className="flex items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={whEvents[key]}
                  onChange={() => setWhEvents((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <div>
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="text-xs text-slate-400">{desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </Modal>

      <ShareModal open={shareModal.open} onClose={() => shareModal.setOpen(false)} />
    </div>
  );
}
