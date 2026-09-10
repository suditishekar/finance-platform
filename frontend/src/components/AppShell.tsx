import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { CURRENCIES, useWorkspace } from '../context/WorkspaceContext';

const navigation = [
  { label: 'Overview', path: '/dashboard', icon: '●', roles: ['admin', 'analyst', 'viewer'] },
  { label: 'Transactions', path: '/transactions', icon: '↕', roles: ['admin', 'analyst'] },
  { label: 'Analytics', path: '/analytics', icon: '▥', roles: ['admin', 'analyst'] },
  { label: 'User Management', path: '/users', icon: '◎', roles: ['admin'] },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const { currency, setCurrency } = useWorkspace();
  const [sidebarPreferencesOpen, setSidebarPreferencesOpen] = useState(false);
  const [topbarPreferencesOpen, setTopbarPreferencesOpen] = useState(false);
  const sidebarPreferencesRef = useRef<HTMLDivElement>(null);
  const topbarPreferencesRef = useRef<HTMLDivElement>(null);
  const initials = user?.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase() || 'Z';

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (sidebarPreferencesRef.current && !sidebarPreferencesRef.current.contains(target)) setSidebarPreferencesOpen(false);
      if (topbarPreferencesRef.current && !topbarPreferencesRef.current.contains(target)) setTopbarPreferencesOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const currencyOptions = CURRENCIES.map(item => <option key={item.code} value={item.code}>{item.code} · {item.symbol}</option>);
  const setSelectedCurrency = (value: string) => setCurrency(value as typeof currency);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-lockup"><div className="brand-mark">F</div><div><strong>Finance</strong><span>Finance workspace</span></div></div>
      <div className="sidebar-section-label">Workspace</div>
      <nav className="primary-nav" aria-label="Primary navigation">{navigation.filter(item => item.roles.includes(user?.role || 'viewer')).map(item => <NavLink key={item.path} to={item.path} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}</NavLink>)}</nav>
      <div className="sidebar-footer">
        <div className="security-note"><span className="status-dot" /> API connected</div>
        <div className="preferences-wrap" ref={sidebarPreferencesRef}>
          <button className="preferences-button" type="button" onClick={() => { setSidebarPreferencesOpen(current => !current); setTopbarPreferencesOpen(false); }} aria-expanded={sidebarPreferencesOpen}>Workspace preferences <span aria-hidden="true">⚙</span></button>
          {sidebarPreferencesOpen && <div className="preferences-popover"><span className="popover-label">Workspace currency</span><p>Amounts are displayed in this currency. No conversion is applied.</p><select value={currency} onChange={event => setSelectedCurrency(event.target.value)}>{currencyOptions}</select></div>}
        </div>
        <button className="logout-button" onClick={logout} type="button">Sign out <span aria-hidden="true">↗</span></button>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <div className="mobile-brand"><div className="brand-mark">F</div><strong>Finance</strong></div>
        <div className="topbar-context"><span className="eyebrow">Personal finance</span><span className="topbar-divider" /> <span>Live workspace</span></div>
        <div className="topbar-actions">
          <div className="topbar-preferences" ref={topbarPreferencesRef}>
            <button className="topbar-settings" type="button" onClick={() => { setTopbarPreferencesOpen(current => !current); setSidebarPreferencesOpen(false); }} aria-expanded={topbarPreferencesOpen} aria-label="Open workspace currency preferences">{currency}</button>
            {topbarPreferencesOpen && <div className="preferences-popover topbar-popover"><span className="popover-label">Workspace currency</span><p>Amounts are displayed in this currency. No conversion is applied.</p><select value={currency} onChange={event => setSelectedCurrency(event.target.value)}>{currencyOptions}</select></div>}
          </div>
          <div className="profile-chip"><div className="avatar">{initials}</div><div className="profile-copy"><strong>{user?.name}</strong><span>{user?.role} · {currency}</span></div></div>
          <button className="mobile-logout" type="button" onClick={logout} aria-label="Sign out">↗</button>
        </div>
      </header>
      <div className="page-content"><Outlet /></div>
    </main>
  </div>;
}
