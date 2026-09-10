import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, apiRequest } from '../services/api';
import { useWorkspace } from '../context/WorkspaceContext';
import type { Transaction, TransactionType } from '../types/api';

interface TransactionFormProps {
  transaction?: Transaction | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

interface FormValues {
  amount: string;
  type: TransactionType;
  category: string;
  date: string;
  notes: string;
}

const toDateInput = (value?: string): string => {
  if (!value) return new Date().toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
};

const initialValues = (transaction?: Transaction | null): FormValues => ({
  amount: transaction ? String(transaction.amount) : '',
  type: transaction?.type || 'expense',
  category: transaction?.category || '',
  date: toDateInput(transaction?.date),
  notes: transaction?.notes || '',
});

export function TransactionForm({ transaction, onClose, onSaved }: TransactionFormProps) {
  const { currencySymbol } = useWorkspace();
  const [values, setValues] = useState<FormValues>(() => initialValues(transaction));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setValues(initialValues(transaction));
    setError('');
  }, [transaction]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !isSubmitting) onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isSubmitting, onClose]);

  const update = (field: keyof FormValues, value: string) => {
    setValues(current => ({ ...current, [field]: value }));
    if (error) setError('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(values.amount);
    const category = values.category.trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Amount must be a positive number.');
      return;
    }
    if (!category) {
      setError('Category is required.');
      return;
    }
    if (!values.date || Number.isNaN(new Date(`${values.date}T00:00:00`).getTime())) {
      setError('A valid transaction date is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        amount,
        type: values.type,
        category,
        date: values.date,
        notes: values.notes.trim() || undefined,
      };
      await apiRequest<{ record: Transaction }>(transaction ? `/records/${transaction._id}` : '/records', {
        method: transaction ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      await onSaved();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Could not save this transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="transaction-form-title">
        <div className="modal-heading"><div><span className="section-eyebrow">Ledger entry</span><h2 id="transaction-form-title">{transaction ? 'Edit transaction' : 'Add transaction'}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close form">×</button></div>
        <form className="transaction-form" onSubmit={submit}>
          <div className="form-grid two-columns">
            <label>Amount <span className="currency-hint">{currencySymbol}</span><input type="number" min="0.01" step="0.01" inputMode="decimal" value={values.amount} onChange={event => update('amount', event.target.value)} placeholder="0.00" autoFocus required /></label>
            <label>Type<select value={values.type} onChange={event => update('type', event.target.value as TransactionType)}><option value="expense">Expense</option><option value="income">Income</option></select></label>
          </div>
          <div className="form-grid two-columns">
            <label>Category<input type="text" value={values.category} onChange={event => update('category', event.target.value)} placeholder="e.g. Rent" maxLength={120} required /></label>
            <label>Date<input type="date" value={values.date} onChange={event => update('date', event.target.value)} required /></label>
          </div>
          <label>Notes <span className="optional-label">optional</span><textarea value={values.notes} onChange={event => update('notes', event.target.value)} placeholder="Add context to this entry" rows={3} maxLength={500} /></label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button><button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : transaction ? 'Save changes' : 'Add transaction'} <span aria-hidden="true">→</span></button></div>
        </form>
      </section>
    </div>
  );
}
