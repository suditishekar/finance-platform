import { FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../services/api';

export function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const registered = (location.state as { registered?: boolean } | null)?.registered;

  if (user) return <Navigate to="/dashboard" replace />;
  if (isLoading) return <div className="route-loading">Loading your workspace...</div>;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-art" aria-label="Finance">
        <div className="art-grid" />
        <div className="login-brand"><div className="brand-mark large">F</div><span>Finance</span></div>
        <div className="art-copy"><span className="section-eyebrow light">Clearer money decisions</span><h1>Make your money<br /><em>legible.</em></h1><p>A calm, focused workspace for understanding the movement behind your numbers.</p></div>
        <div className="art-footer"><span>Private workspace</span><span>●</span><span>Live data</span></div>
      </section>
      <section className="login-panel">
        <div className="login-form-wrap">
          <span className="section-eyebrow">Welcome back</span>
          <h2>Sign in to your workspace</h2>
          <p className="form-intro">Use your Finance account to continue.</p>
          {registered && <div className="success-message" role="status">Account created. You can sign in now.</div>}
          <form onSubmit={submit} className="login-form">
            <label htmlFor="email">Email address<input id="email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" required /></label>
            <label htmlFor="password">Password<input id="password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" required /></label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="primary-button full-width" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Sign in'} <span aria-hidden="true">→</span></button>
          </form>
          <p className="login-footnote">Don't have an account? <Link to="/register">Create one</Link></p>
        </div>
      </section>
    </main>
  );
}
