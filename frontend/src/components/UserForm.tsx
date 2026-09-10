import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, apiRequest } from '../services/api';
import { Modal } from './Modal';
import type { User, UserRole } from '../types/api';

interface UserFormProps {
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export function UserForm({ onClose, onSaved }: UserFormProps) {
  const [values, setValues] = useState({ name: '', email: '', password: '', role: 'viewer' as UserRole });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !isSubmitting) onClose(); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [isSubmitting, onClose]);

  const update = (field: keyof typeof values, value: string) => {
    setValues(current => ({ ...current, [field]: value }));
    setError('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const name = values.name.trim();
    const email = values.email.trim();
    if (name.length < 2) return setError('Name must be at least 2 characters.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.');
    if (values.password.length < 6) return setError('Password must be at least 6 characters.');

    setIsSubmitting(true);
    try {
      await apiRequest<{ user: User }>('/users', { method: 'POST', body: JSON.stringify({ name, email, password: values.password, role: values.role }) });
      await onSaved();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Could not create this user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return <Modal title="Create user" eyebrow="User management" onClose={isSubmitting ? () => undefined : onClose} labelledBy="create-user-title"><form className="transaction-form" onSubmit={submit}><div className="form-grid two-columns"><label>Full name<input type="text" autoComplete="name" value={values.name} onChange={event => update('name', event.target.value)} placeholder="Full name" required /></label><label>Email address<input type="email" autoComplete="email" value={values.email} onChange={event => update('email', event.target.value)} placeholder="user@example.com" required /></label></div><div className="form-grid two-columns"><label>Password<input type="password" autoComplete="new-password" value={values.password} onChange={event => update('password', event.target.value)} placeholder="At least 6 characters" required /></label><label>Role<select value={values.role} onChange={event => update('role', event.target.value)}><option value="viewer">Viewer</option><option value="analyst">Analyst</option><option value="admin">Admin</option></select></label></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button><button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create user'} <span aria-hidden="true">→</span></button></div></form></Modal>;
}
