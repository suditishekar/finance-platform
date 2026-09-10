import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { PeriodSelector, currentMonthRange, type DateRange } from '../components/PeriodSelector';
import { StatCard } from '../components/StatCard';
import { useWorkspace } from '../context/WorkspaceContext';
import { ApiError, apiRequest } from '../services/api';
import type { CategoryAnalysisRow, DailySummaryRow, MonthlySummaryRow, Summary, TrendRow } from '../types/api';

const displayDate = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`));
const displayMonth = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(`${value}-01T00:00:00`));

interface AnalyticsData {
  summary: Summary;
  daily: DailySummaryRow[];
  monthly: MonthlySummaryRow[];
  categories: CategoryAnalysisRow[];
  trends: TrendRow[];
}

const rangeDays = (range: DateRange) => Math.round((new Date(`${range.to}T00:00:00`).getTime() - new Date(`${range.from}T00:00:00`).getTime()) / 86400000) + 1;

export function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>(currentMonthRange);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { formatCurrency } = useWorkspace();
  const isLongRange = rangeDays(range) > 62;

  const loadAnalytics = useCallback(async () => {
    const query = new URLSearchParams({ from: range.from, to: range.to }).toString();
    setLoading(true);
    setError('');
    try {
      const [summary, periodRows, categories, trends] = await Promise.all([
        apiRequest<Summary>(`/dashboard/summary?${query}`),
        isLongRange ? apiRequest<{ summaries: MonthlySummaryRow[] }>(`/dashboard/monthly-summary?${query}`) : apiRequest<{ summaries: DailySummaryRow[] }>(`/dashboard/daily-summary?${query}`),
        apiRequest<{ categories: CategoryAnalysisRow[] }>(`/dashboard/category-analysis?${query}`),
        apiRequest<{ trends: TrendRow[] }>(`/dashboard/trend-analysis?${query}`),
      ]);
      setData({ summary, daily: isLongRange ? [] : (periodRows as { summaries: DailySummaryRow[] }).summaries, monthly: isLongRange ? (periodRows as { summaries: MonthlySummaryRow[] }).summaries : [], categories: categories.categories, trends: trends.trends });
    } catch (requestError) {
      setData(null);
      setError(requestError instanceof ApiError ? requestError.message : 'Could not load analytics for this period.');
    } finally {
      setLoading(false);
    }
  }, [isLongRange, range]);

  useEffect(() => { void loadAnalytics(); }, [loadAnalytics]);

  const periodRows = data ? (isLongRange ? data.monthly.map(row => ({ label: displayMonth(row.month), income: row.totalIncome, expense: row.totalExpense, net: row.netAmount })) : data.daily.map(row => ({ label: displayDate(row.date), income: row.totalIncome, expense: row.totalExpense, net: row.netAmount }))) : [];
  const maxPeriodValue = Math.max(...periodRows.flatMap(row => [row.income, row.expense, Math.abs(row.net)]), 1);
  const maxCategoryValue = Math.max(...(data?.categories.map(row => row.totalAmount) || [1]), 1);
  const change = useMemo(() => {
    if (!data?.trends.length || data.trends.length < 2) return null;
    const first = data.trends[0];
    const last = data.trends[data.trends.length - 1];
    const firstNet = first.net;
    if (firstNet === 0) return null;
    return ((last.net - firstNet) / Math.abs(firstNet)) * 100;
  }, [data]);

  return <div className="page-stack analytics-page">
    <PageHeader eyebrow="Patterns" title="Analytics" description="See how income, expenses, and categories move across your selected period." action={<PeriodSelector value={range} onChange={setRange} />} />
    {error && <div className="alert error analytics-error" role="alert"><span>{error}</span><button className="text-button" type="button" onClick={() => void loadAnalytics()}>Retry</button></div>}
    {loading ? <div className="analytics-loading"><div className="loading-lines"><span /><span /><span /><span /></div></div> : !data || (data.trends.length === 0 && data.categories.length === 0) ? <section className="surface"><EmptyState title="No financial activity for this period." message="Try another date range or add a transaction to begin seeing patterns." /><div className="empty-action"><Link className="primary-button" to="/transactions">Open transactions <span aria-hidden="true">→</span></Link></div></section> : <>
      <section className="stats-grid" aria-label="Analytics summary"><StatCard label="Total income" value={formatCurrency(data.summary.totalIncome, { maximumFractionDigits: 0 })} detail={`${data.summary.incomeCount} income records`} tone="green" /><StatCard label="Total expenses" value={formatCurrency(data.summary.totalExpenses, { maximumFractionDigits: 0 })} detail={`${data.summary.expenseCount} expense records`} tone="rose" /><StatCard label="Net balance" value={formatCurrency(data.summary.netBalance, { maximumFractionDigits: 0 })} detail={change === null ? `${data.summary.transactionCount || data.summary.totalRecords} transactions` : `${change >= 0 ? '+' : ''}${change.toFixed(1)}% across period`} tone="ink" /></section>
      <section className="surface analytics-trend-card"><div className="surface-heading"><div><span className="section-eyebrow">Financial movement</span><h2>{isLongRange ? 'Monthly trend' : 'Daily trend'}</h2></div><span className="muted-label">{periodRows.length} periods</span></div>{periodRows.length === 0 ? <EmptyState title="No trend data" message="There is no activity in this period." /> : <div className="trend-chart">{periodRows.map(row => <div className="trend-column" key={row.label}><div className="trend-bars"><span className="trend-bar income" style={{ height: `${Math.max((row.income / maxPeriodValue) * 100, row.income ? 4 : 0)}%` }} title={`Income ${formatCurrency(row.income)}`} /><span className="trend-bar expense" style={{ height: `${Math.max((row.expense / maxPeriodValue) * 100, row.expense ? 4 : 0)}%` }} title={`Expenses ${formatCurrency(row.expense)}`} /></div><span className="trend-label">{row.label}</span></div>)}</div>}<div className="chart-legend"><span><i className="legend-dot income" />Income</span><span><i className="legend-dot expense" />Expenses</span><span className="legend-note">Hover bars for exact values</span></div></section>
      <section className="analytics-grid"><div className="surface category-card"><div className="surface-heading"><div><span className="section-eyebrow">Distribution</span><h2>By category</h2></div><span className="muted-label">{data.categories.length} categories</span></div><div className="category-list">{data.categories.slice(0, 8).map(row => <div className="category-row" key={row.category}><div className="category-copy"><strong>{row.category}</strong><span>{row.transactionCount} transactions · {formatCurrency(row.totalAmount)}</span></div><div className="category-track"><span style={{ width: `${(row.totalAmount / maxCategoryValue) * 100}%` }} /></div><div className="category-breakdown"><span className="income">+{formatCurrency(row.income.total)}</span><span className="expense">-{formatCurrency(row.expense.total)}</span></div></div>)}</div></div><div className="surface insight-card"><span className="section-eyebrow">Trend signal</span><h2>{change === null ? 'The story is still forming.' : change >= 0 ? 'Net movement is improving.' : 'Net movement needs attention.'}</h2><p>{change === null ? 'More activity is needed before a meaningful period comparison can be shown.' : `Net movement changed ${Math.abs(change).toFixed(1)}% from the first to the last period in this range.`}</p><div className="signal-line"><span className={`signal-arrow ${change !== null && change >= 0 ? 'positive' : 'negative'}`}>{change !== null && change >= 0 ? '↗' : '↘'}</span><span>Based only on recorded activity</span></div></div></section>
      <section className="surface trend-table-card"><div className="surface-heading"><div><span className="section-eyebrow">Detail</span><h2>Period breakdown</h2></div></div><div className="analytics-table-wrap"><table><thead><tr><th>Period</th><th className="align-right">Income</th><th className="align-right">Expenses</th><th className="align-right">Net</th></tr></thead><tbody>{data.trends.slice(-8).map(row => <tr key={row.period}><td>{displayDate(row.period)}</td><td className="align-right income">+{formatCurrency(row.income)}</td><td className="align-right expense">-{formatCurrency(row.expense)}</td><td className={`align-right table-amount ${row.net >= 0 ? 'income' : 'expense'}`}>{row.net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(row.net))}</td></tr>)}</tbody></table></div></section>
    </>}
  </div>;
}
