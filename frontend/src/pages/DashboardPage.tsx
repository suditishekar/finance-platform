import { useEffect, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { currentMonthRange, PeriodSelector, type DateRange } from '../components/PeriodSelector';
import { StatCard } from '../components/StatCard';
import { useWorkspace } from '../context/WorkspaceContext';
import { ApiError, apiRequest } from '../services/api';
import type { Summary, Transaction } from '../types/api';

const date = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value));

export function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>(currentMonthRange);
  const { formatCurrency } = useWorkspace();

  useEffect(() => {
    const params = new URLSearchParams({ from: range.from, to: range.to });
    setLoading(true);
    setError('');
    Promise.all([
      apiRequest<Summary>(`/dashboard/summary?${params.toString()}`),
      apiRequest<{ records: Transaction[] }>('/dashboard/recent?limit=5'),
    ]).then(([summaryData, recentData]) => {
      setSummary(summaryData);
      setRecent(recentData.records);
    }).catch(requestError => setError(requestError instanceof ApiError ? requestError.message : 'Could not load your dashboard.'))
      .finally(() => setLoading(false));
  }, [range]);

  return <div className="page-stack">
    <PageHeader eyebrow="Overview" title="Good morning." description="Here is the latest shape of your financial activity." action={<PeriodSelector value={range} onChange={setRange} compact />} />
    {error && <div className="alert error" role="alert">{error}</div>}
    <section className="stats-grid" aria-label="Financial summary">
      <StatCard label="Net balance" value={loading ? '—' : formatCurrency(summary?.netBalance || 0, { maximumFractionDigits: 0 })} detail={loading ? 'Loading summary' : `${summary?.totalRecords || 0} active records`} tone="ink" />
      <StatCard label="Income" value={loading ? '—' : formatCurrency(summary?.totalIncome || 0, { maximumFractionDigits: 0 })} detail={loading ? 'Loading summary' : `${summary?.incomeCount || 0} income records`} tone="green" />
      <StatCard label="Expenses" value={loading ? '—' : formatCurrency(summary?.totalExpenses || 0, { maximumFractionDigits: 0 })} detail={loading ? 'Loading summary' : `${summary?.expenseCount || 0} expense records`} tone="rose" />
    </section>
    <section className="content-grid">
      <div className="surface recent-surface"><div className="surface-heading"><div><span className="section-eyebrow">Activity</span><h2>Recent transactions</h2></div><span className="muted-label">Last 5 records</span></div>
        {loading ? <div className="loading-lines"><span /><span /><span /></div> : recent.length === 0 ? <EmptyState title="No activity yet" message="Transactions will appear here once your workspace has data." /> : <div className="activity-list">{recent.map(item => <div className="activity-row" key={item._id}><div className={`activity-symbol ${item.type}`}>{item.type === 'income' ? '↓' : '↑'}</div><div className="activity-main"><strong>{item.category}</strong><span>{item.notes || 'No description'} · {date(item.date)}</span></div><strong className={item.type === 'income' ? 'amount income' : 'amount expense'}>{item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}</strong></div>)}</div>}
      </div>
      <div className="surface focus-surface"><span className="section-eyebrow">Workspace note</span><h2>Stay close to the signal.</h2><p>Your dashboard keeps the important movement visible. Use transactions for a detailed view and analytics for the patterns that emerge over time.</p><div className="focus-line"><span className="status-dot" /> Data is synced with your finance API</div></div>
    </section>
  </div>;
}
