import { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { TransactionForm } from '../components/TransactionForm';
import { ConfirmModal } from '../components/Modal';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { ApiError, apiRequest } from '../services/api';
import type { RecordsData, Transaction, TransactionType } from '../types/api';

const date = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
const PAGE_SIZE = 10;

type FilterState = { type: 'all' | TransactionType; category: string; from: string; to: string };
const initialFilters: FilterState = { type: 'all', category: '', from: '', to: '' };

export function TransactionsPage() {
  const { user } = useAuth();
  const { formatCurrency } = useWorkspace();
  const isAdmin = user?.role === 'admin';
  const [records, setRecords] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<RecordsData['pagination']>({ total: 0, page: 1, limit: PAGE_SIZE, pages: 0 });
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(initialFilters);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [formTransaction, setFormTransaction] = useState<Transaction | null | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

  const loadRecords = useCallback(async (requestedPage = page, requestedFilters = appliedFilters) => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(requestedPage), limit: String(PAGE_SIZE) });
    if (requestedFilters.type !== 'all') params.set('type', requestedFilters.type);
    if (requestedFilters.category.trim()) params.set('category', requestedFilters.category.trim());
    if (requestedFilters.from) params.set('from', requestedFilters.from);
    if (requestedFilters.to) params.set('to', requestedFilters.to);

    try {
      const data = await apiRequest<RecordsData>(`/records?${params.toString()}`);
      setRecords(data.records);
      setPagination(data.pagination);
      if (data.records.length === 0 && requestedPage > 1 && data.pagination.pages > 0) setPage(data.pagination.pages);
    } catch (requestError) {
      setRecords([]);
      setError(requestError instanceof ApiError ? requestError.message : 'Could not load transactions.');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page]);

  useEffect(() => { void loadRecords(); }, [loadRecords]);

  const applyFilters = () => { setAppliedFilters(filters); setPage(1); };
  const clearFilters = () => { setFilters(initialFilters); setAppliedFilters(initialFilters); setPage(1); };
  const refreshAfterSave = async () => { setFormTransaction(undefined); await loadRecords(page, appliedFilters); };

  const deleteTransaction = async () => {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete._id);
    setError('');
    try {
      await apiRequest<{ message: string }>(`/records/${pendingDelete._id}`, { method: 'DELETE' });
      setPendingDelete(null);
      await loadRecords(page, appliedFilters);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Could not delete this transaction.');
    } finally {
      setDeletingId(null);
    }
  };

  const filterActive = appliedFilters.type !== 'all' || Boolean(appliedFilters.category || appliedFilters.from || appliedFilters.to);
  const rangeStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const rangeEnd = Math.min(pagination.page * pagination.limit, pagination.total);

  return <div className="page-stack">
    <PageHeader eyebrow="Ledger" title="Transactions" description="Review and manage the active financial records in your workspace." action={isAdmin ? <button className="primary-button" type="button" onClick={() => setFormTransaction(null)}>New transaction <span aria-hidden="true">＋</span></button> : undefined} />
    <section className="filter-surface surface">
      <div className="filter-bar"><div><span className="section-eyebrow">Find a record</span><strong>{filterActive ? 'Filtered activity' : 'All active activity'}</strong></div><button className="secondary-button filter-toggle" type="button" onClick={() => setShowFilters(current => !current)}>{showFilters ? 'Hide filters' : 'Filter records'} <span aria-hidden="true">⌄</span></button></div>
      {showFilters && <div className="filter-controls"><label>Type<select value={filters.type} onChange={event => setFilters(current => ({ ...current, type: event.target.value as FilterState['type'] }))}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option></select></label><label>Category<input type="search" value={filters.category} onChange={event => setFilters(current => ({ ...current, category: event.target.value }))} placeholder="Search category" /></label><label>From<input type="date" value={filters.from} onChange={event => setFilters(current => ({ ...current, from: event.target.value }))} /></label><label>To<input type="date" value={filters.to} onChange={event => setFilters(current => ({ ...current, to: event.target.value }))} /></label><div className="filter-actions"><button className="primary-button" type="button" onClick={applyFilters}>Apply</button><button className="text-button" type="button" onClick={clearFilters}>Clear</button></div></div>}
    </section>
    {error && <div className="alert error" role="alert">{error}</div>}
    <section className="surface table-surface"><div className="table-heading"><div><span className="section-eyebrow">Records</span><h2>Active transactions</h2></div><span className="muted-label">{loading ? 'Loading...' : pagination.total === 0 ? 'No results' : `${rangeStart}-${rangeEnd} of ${pagination.total}`}</span></div>{loading ? <div className="loading-lines"><span /><span /><span /><span /></div> : records.length === 0 ? <EmptyState title="No transactions found" message={filterActive ? 'Try adjusting your filters or clear them to see all activity.' : 'Add your first transaction to begin building the ledger.'} /> : <div className="table-wrap"><table><thead><tr><th>Transaction</th><th>Date</th><th>Type</th><th className="align-right">Amount</th>{isAdmin && <th className="actions-heading">Actions</th>}</tr></thead><tbody>{records.map(record => <tr key={record._id}><td><div className="table-primary">{record.category}</div><div className="table-secondary">{record.notes || 'No description'}</div></td><td>{date(record.date)}</td><td><span className={`type-pill ${record.type}`}>{record.type}</span></td><td className={`align-right table-amount ${record.type}`}>{record.type === 'income' ? '+' : '-'}{formatCurrency(record.amount)}</td>{isAdmin && <td className="row-actions"><button className="row-action" type="button" onClick={() => setFormTransaction(record)} aria-label={`Edit ${record.category}`}>Edit</button><button className="row-action danger" type="button" onClick={() => setPendingDelete(record)} disabled={deletingId === record._id} aria-label={`Delete ${record.category}`}>{deletingId === record._id ? '...' : 'Delete'}</button></td>}</tr>)}</tbody></table></div>}
      {!loading && pagination.pages > 0 && <div className="pagination"><span className="muted-label">Page {pagination.page} of {pagination.pages}</span><div className="pagination-actions"><button className="secondary-button" type="button" disabled={pagination.page <= 1} onClick={() => setPage(current => current - 1)}>← Previous</button><button className="secondary-button" type="button" disabled={pagination.page >= pagination.pages} onClick={() => setPage(current => current + 1)}>Next →</button></div></div>}
    </section>
    {isAdmin && formTransaction !== undefined && <TransactionForm transaction={formTransaction} onClose={() => setFormTransaction(undefined)} onSaved={refreshAfterSave} />}
    {pendingDelete && <ConfirmModal title="Delete transaction?" message={`Are you sure you want to delete ${pendingDelete.category}? This will remove it from the active ledger.`} confirmLabel="Delete transaction" busy={deletingId === pendingDelete._id} onCancel={() => setPendingDelete(null)} onConfirm={() => void deleteTransaction()} />}
  </div>;
}
