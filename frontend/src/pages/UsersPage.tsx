import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { UserForm } from '../components/UserForm';
import { useAuth } from '../auth/AuthContext';
import { ApiError, apiRequest } from '../services/api';
import type { User, UserRole } from '../types/api';

const roleLabels: Record<UserRole, string> = { admin: 'Admin', analyst: 'Analyst', viewer: 'Viewer' };
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : '—';
const userId = (user: User | null) => user?.id || user?._id || '';

interface PendingStatusChange { type: 'deactivate' | 'activate'; user: User; }
interface PendingRoleChange { user: User; role: UserRole; }

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const currentId = userId(currentUser);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [roleBusyId, setRoleBusyId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true); setError('');
    try { setUsers((await apiRequest<{ users: User[] }>('/users')).users); }
    catch (requestError) { setUsers([]); setError(requestError instanceof ApiError ? requestError.message : 'Could not load users.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const sortedUsers = useMemo(() => [...users].sort((a, b) => {
    if (userId(a) === currentId) return -1;
    if (userId(b) === currentId) return 1;
    return a.name.localeCompare(b.name);
  }), [currentId, users]);

  const refreshUsers = async () => { setShowCreate(false); await loadUsers(); };

  const updateRole = async () => {
    if (!pendingRoleChange) return;
    const { user: target, role } = pendingRoleChange;
    const id = userId(target);
    if (!id || id === currentId || role === target.role) return;
    setRoleBusyId(id); setError('');
    try { await apiRequest<{ user: User }>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) }); setPendingRoleChange(null); await loadUsers(); }
    catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Could not update this user role.'); }
    finally { setRoleBusyId(null); }
  };

  const changeStatus = async () => {
    if (!pendingStatusChange) return;
    const id = userId(pendingStatusChange.user);
    if (!id || id === currentId) return;
    setBusyId(id); setError('');
    try { await apiRequest<{ user: User }>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ status: pendingStatusChange.type === 'activate' ? 'active' : 'inactive' }) }); setPendingStatusChange(null); await loadUsers(); }
    catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Could not update this account status.'); }
    finally { setBusyId(null); }
  };

  const deleteUser = async () => {
    if (!pendingDelete) return;
    const id = userId(pendingDelete);
    if (!id || id === currentId) return;
    setBusyId(id); setError('');
    try { await apiRequest<{ message: string }>(`/users/${id}`, { method: 'DELETE' }); setPendingDelete(null); await loadUsers(); }
    catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Could not delete this user.'); }
    finally { setBusyId(null); }
  };

  return <div className="page-stack users-page">
    <PageHeader eyebrow="Administration" title="User Management" description="Manage users, roles, and account access." action={<button className="primary-button" type="button" onClick={() => setShowCreate(true)}>Create user <span aria-hidden="true">+</span></button>} />
    {error && <div className="alert error" role="alert">{error}<button className="text-button" type="button" onClick={() => void loadUsers()}>Retry</button></div>}
    <section className="surface user-table-surface"><div className="table-heading"><div><span className="section-eyebrow">Accounts</span><h2>All users</h2></div><span className="muted-label">{loading ? 'Loading...' : `${users.length} ${users.length === 1 ? 'user' : 'users'}`}</span></div>{loading ? <div className="loading-lines"><span /><span /><span /><span /></div> : sortedUsers.length === 0 ? <EmptyState title="No users found" message="Create a user to begin managing workspace access." /> : <div className="table-wrap"><table className="users-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Created</th><th className="actions-heading">Actions</th></tr></thead><tbody>{sortedUsers.map(target => { const id = userId(target); const isSelf = id === currentId; const isInactive = target.status === 'inactive'; const isBusy = busyId === id || roleBusyId === id; return <tr key={id}><td><div className="user-cell"><div className="user-avatar">{target.name.slice(0, 1).toUpperCase()}</div><div><div className="table-primary">{target.name} {isSelf && <span className="you-badge">You</span>}</div><div className="table-secondary">{target.email}</div></div></div></td><td><select className="role-select" value={target.role} disabled={isSelf || isBusy} onChange={event => setPendingRoleChange({ user: target, role: event.target.value as UserRole })} aria-label={`Role for ${target.name}`}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td><span className={`status-pill ${isInactive ? 'inactive' : 'active'}`}>{isInactive ? 'Inactive' : 'Active'}</span></td><td>{formatDate(target.createdAt)}</td><td className="row-actions">{isSelf ? <span className="protected-label">Protected</span> : <><button className="row-action" type="button" disabled={isBusy} onClick={() => setPendingStatusChange({ type: isInactive ? 'activate' : 'deactivate', user: target })}>{isBusy ? 'Working...' : isInactive ? 'Activate' : 'Deactivate'}</button><button className="row-action danger" type="button" disabled={isBusy} onClick={() => setPendingDelete(target)}>Delete</button></>}</td></tr>; })}</tbody></table></div>}</section>
    {showCreate && <UserForm onClose={() => setShowCreate(false)} onSaved={refreshUsers} />}
    {pendingRoleChange && <ConfirmModal title="Change user role?" message={`Change ${pendingRoleChange.user.name}'s role to ${roleLabels[pendingRoleChange.role]}? Their account permissions will update immediately.`} confirmLabel="Change role" busy={roleBusyId === userId(pendingRoleChange.user)} onCancel={() => setPendingRoleChange(null)} onConfirm={() => void updateRole()} />}
    {pendingStatusChange && <ConfirmModal title={pendingStatusChange.type === 'deactivate' ? 'Deactivate user?' : 'Activate user?'} message={pendingStatusChange.type === 'deactivate' ? `Deactivate ${pendingStatusChange.user.name}? They will no longer be able to sign in.` : `Reactivate ${pendingStatusChange.user.name}'s account? They will be able to sign in again.`} confirmLabel={pendingStatusChange.type === 'deactivate' ? 'Deactivate user' : 'Activate user'} busy={busyId === userId(pendingStatusChange.user)} onCancel={() => setPendingStatusChange(null)} onConfirm={() => void changeStatus()} />}
    {pendingDelete && <ConfirmModal title="Delete user?" message={`Permanently delete ${pendingDelete.name}? This cannot be undone.`} confirmLabel="Delete user" busy={busyId === userId(pendingDelete)} onCancel={() => setPendingDelete(null)} onConfirm={() => void deleteUser()} />}
  </div>;
}
