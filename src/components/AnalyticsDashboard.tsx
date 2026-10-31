import { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, FileText, ThumbsUp, MessageSquare, Bug, Lightbulb, Clock, Award, Activity } from 'lucide-react';
import type { ReportSubmission, ReportStatus, ReportCategory } from '@/lib/types';
import { REPORT_STATUSES } from '@/lib/types';
import { Card, Button } from '@/components/ui';
import { toast } from '@/components/Toast';
import { printDocument, buildPrintDocument } from '@/lib/print';

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const STATUS_COLORS: Record<ReportStatus, string> = {
  Open: '#0ea5e9',
  'Under Review': '#f59e0b',
  Resolved: '#10b981',
  Declined: '#f43f5e',
};

export function AnalyticsDashboard({ reports }: { reports: ReportSubmission[] }) {
  const [range, setRange] = useState<'7' | '30' | '90' | 'all' | 'custom'>('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const analytics = useMemo(() => {
    const now = new Date();
    let scoped: ReportSubmission[];
    if (range === 'all') {
      scoped = reports;
    } else if (range === 'custom') {
      const fromTime = customFrom ? new Date(customFrom).getTime() : 0;
      const toTime = customTo ? new Date(customTo).getTime() + 24 * 60 * 60 * 1000 - 1 : now.getTime();
      scoped = reports.filter((r) => {
        const t = new Date(r.createdAt).getTime();
        return t >= fromTime && t <= toTime;
      });
    } else {
      const cutoff = now.getTime() - parseInt(range) * 24 * 60 * 60 * 1000;
      scoped = reports.filter((r) => new Date(r.createdAt).getTime() >= cutoff);
    }

    const total = scoped.length;
    const byStatus: Record<ReportStatus, number> = { Open: 0, 'Under Review': 0, Resolved: 0, Declined: 0 };
    const byCategory: Record<ReportCategory, number> = { 'Bug Report': 0, 'Feature Suggestion': 0 };
    let totalVotes = 0;
    let totalComments = 0;
    const authorMap = new Map<string, number>();
    const dailyMap = new Map<string, number>();

    for (const r of scoped) {
      byStatus[r.status]++;
      byCategory[r.category]++;
      totalVotes += r.votes;
      totalComments += r.comments.length;
      authorMap.set(r.authorName, (authorMap.get(r.authorName) ?? 0) + 1);
      const day = new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
    }

    const topAuthors = Array.from(authorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const dailyTrend = Array.from(dailyMap.entries()).slice(-14);

    const avgVotes = total > 0 ? (totalVotes / total).toFixed(1) : '0';
    const avgComments = total > 0 ? (totalComments / total).toFixed(1) : '0';
    const resolutionRate = total > 0 ? Math.round((byStatus.Resolved / total) * 100) : 0;

    return { total, byStatus, byCategory, totalVotes, totalComments, topAuthors, dailyTrend, avgVotes, avgComments, resolutionRate };
  }, [reports, range, customFrom, customTo]);

  const maxDaily = Math.max(1, ...analytics.dailyTrend.map(([, v]) => v));
  const maxAuthor = Math.max(1, ...analytics.topAuthors.map(([, v]) => v));

  const handleExportAnalyticsPdf = async () => {
    try {
      const statusBars = REPORT_STATUSES.map((s) => {
        const count = analytics.byStatus[s];
        const pct = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0;
        return `<div class="bar-row"><div class="bar-label">${s}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${STATUS_COLORS[s]}">${count}</div></div></div>`;
      }).join('');

      const catBars = (['Bug Report', 'Feature Suggestion'] as const).map((c) => {
        const count = analytics.byCategory[c];
        const pct = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0;
        const color = c === 'Bug Report' ? '#f43f5e' : '#f59e0b';
        return `<div class="bar-row"><div class="bar-label">${c}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}">${count}</div></div></div>`;
      }).join('');

      const trendBars = analytics.dailyTrend
        .map(([day, count]) => {
          const h = Math.max(4, Math.round((count / maxDaily) * 60));
          return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1"><div style="width:100%;max-width:28px;height:${h}px;background:#2563eb;border-radius:4px 4px 0 0"></div><div style="font-size:9px;color:#64748b;transform:rotate(-45deg);white-space:nowrap">${day}</div></div>`;
        })
        .join('');

      const authorRows = analytics.topAuthors
        .map(
          ([name, count], i) =>
            `<tr><td>${i + 1}</td><td>${escapeHtml(name)}</td><td style="text-align:right">${count}</td></tr>`
        )
        .join('') || '<tr><td colspan="3" style="text-align:center;color:#94a3b8">No data</td></tr>';

      const body = `
        <h1>Community Analytics Dashboard</h1>
        <p class="subtitle">Range: Last ${range === 'all' ? 'all time' : range + ' days'} · ${analytics.total} submissions · Exported ${new Date().toLocaleString()}</p>

        <div class="stat-row">
          <div class="stat-box"><div class="num">${analytics.total}</div><div class="lbl">Total Submissions</div></div>
          <div class="stat-box"><div class="num">${analytics.totalVotes}</div><div class="lbl">Total Votes</div></div>
          <div class="stat-box"><div class="num">${analytics.totalComments}</div><div class="lbl">Total Comments</div></div>
          <div class="stat-box"><div class="num">${analytics.resolutionRate}%</div><div class="lbl">Resolution Rate</div></div>
        </div>

        <div class="grid">
          <div class="card">
            <h2>Status Breakdown</h2>
            <div class="bar-chart">${statusBars}</div>
          </div>
          <div class="card">
            <h2>Category Breakdown</h2>
            <div class="bar-chart">${catBars}</div>
          </div>
        </div>

        <div class="section">
          <h2>Submission Trend (Last ${analytics.dailyTrend.length} active days)</h2>
          <div style="display:flex;align-items:flex-end;gap:4px;height:80px;padding:12px 0 24px;border-bottom:1px solid #e2e8f0">${trendBars}</div>
        </div>

        <div class="section">
          <h2>Top Contributors</h2>
          <table><thead><tr><th>Rank</th><th>Author</th><th style="text-align:right">Submissions</th></tr></thead><tbody>${authorRows}</tbody></table>
        </div>

        <div class="grid-3">
          <div class="card"><div class="label">Avg Votes/Submission</div><div class="value">${analytics.avgVotes}</div></div>
          <div class="card"><div class="label">Avg Comments/Submission</div><div class="value">${analytics.avgComments}</div></div>
          <div class="card"><div class="label">Active Authors</div><div class="value">${analytics.topAuthors.length}</div></div>
        </div>
      `;
      await printDocument({ html: buildPrintDocument('Community Analytics', body) });
      toast('Analytics PDF ready to print or save.');
    } catch {
      toast('Analytics export failed. Please try again.', 'error');
    }
  };

  const rangeOptions: Array<{ key: '7' | '30' | '90' | 'all' | 'custom'; label: string }> = [
    { key: '7', label: '7 days' },
    { key: '30', label: '30 days' },
    { key: '90', label: '90 days' },
    { key: 'all', label: 'All time' },
    { key: 'custom', label: 'Custom' },
  ];

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <BarChart3 className="h-5 w-5 text-blue-500" /> Analytics Dashboard
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            {rangeOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRange(opt.key)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                  range === opt.key
                    ? 'bg-white text-slate-800 shadow dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {range === 'custom' && (
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                title="From date"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                title="To date"
              />
            </div>
          )}
          <Button onClick={handleExportAnalyticsPdf} className="px-3 py-2 text-xs" icon={<FileText className="h-3.5 w-3.5" />}>
            Export PDF
          </Button>
        </div>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
            <Activity className="h-3.5 w-3.5" /> Submissions
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{analytics.total}</div>
        </div>
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
            <ThumbsUp className="h-3.5 w-3.5" /> Votes
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{analytics.totalVotes}</div>
        </div>
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
            <MessageSquare className="h-3.5 w-3.5" /> Comments
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{analytics.totalComments}</div>
        </div>
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
            <Award className="h-3.5 w-3.5" /> Resolved
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{analytics.resolutionRate}%</div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Status breakdown */}
        <div className="space-y-2.5">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <TrendingUp className="h-4 w-4 text-blue-500" /> Status Breakdown
          </h3>
          {analytics.total === 0 ? (
            <p className="py-3 text-center text-xs text-slate-400">No data for this range.</p>
          ) : (
            REPORT_STATUSES.map((status) => {
              const count = analytics.byStatus[status];
              const pct = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0;
              return (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{status}</span>
                    <span className="text-slate-400">{count} · {pct}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[status] }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Category breakdown */}
        <div className="space-y-2.5">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Bug className="h-4 w-4 text-rose-500" /> Category Breakdown
          </h3>
          {analytics.total === 0 ? (
            <p className="py-3 text-center text-xs text-slate-400">No data for this range.</p>
          ) : (
            (['Bug Report', 'Feature Suggestion'] as const).map((cat) => {
              const count = analytics.byCategory[cat];
              const pct = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0;
              const color = cat === 'Bug Report' ? '#f43f5e' : '#f59e0b';
              const Icon = cat === 'Bug Report' ? Bug : Lightbulb;
              return (
                <div key={cat}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                      <Icon className="h-3 w-3" /> {cat}
                    </span>
                    <span className="text-slate-400">{count} · {pct}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Daily trend mini-chart */}
      {analytics.dailyTrend.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Clock className="h-4 w-4 text-blue-500" /> Submission Trend
          </h3>
          <div className="flex items-end gap-1.5 rounded-xl border border-slate-200 p-3 dark:border-slate-700" style={{ height: '80px' }}>
            {analytics.dailyTrend.map(([day, count]) => {
              const h = Math.max(4, Math.round((count / maxDaily) * 56));
              return (
                <div key={day} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full max-w-[24px] rounded-t bg-blue-500 transition-all duration-500 dark:bg-blue-400"
                    style={{ height: `${h}px` }}
                    title={`${day}: ${count} submission${count === 1 ? '' : 's'}`}
                  />
                  <span className="text-[8px] text-slate-400">{day}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top contributors */}
      {analytics.topAuthors.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Award className="h-4 w-4 text-amber-500" /> Top Contributors
          </h3>
          <div className="space-y-1.5">
            {analytics.topAuthors.map(([name, count], i) => (
              <div key={name} className="flex items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${Math.round((count / maxAuthor) * 100)}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Averages */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 p-2.5 text-center dark:border-slate-700">
          <div className="text-xs font-semibold uppercase text-slate-400">Avg Votes</div>
          <div className="mt-0.5 text-lg font-bold text-slate-800 dark:text-slate-100">{analytics.avgVotes}</div>
        </div>
        <div className="rounded-xl border border-slate-200 p-2.5 text-center dark:border-slate-700">
          <div className="text-xs font-semibold uppercase text-slate-400">Avg Comments</div>
          <div className="mt-0.5 text-lg font-bold text-slate-800 dark:text-slate-100">{analytics.avgComments}</div>
        </div>
        <div className="rounded-xl border border-slate-200 p-2.5 text-center dark:border-slate-700">
          <div className="text-xs font-semibold uppercase text-slate-400">Authors</div>
          <div className="mt-0.5 text-lg font-bold text-slate-800 dark:text-slate-100">{analytics.topAuthors.length}</div>
        </div>
      </div>
    </Card>
  );
}
