import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../services/api';

export function RegisterPage() {
  const { user, register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;
  if (isLoading) return <div className="route-loading">Loading your workspace...</div>;

  const update = (field: keyof typeof values, value: string) => { setValues(current => ({ ...current, [field]: value })); setError(''); };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const name = values.name.trim();
    const email = values.email.trim();
    if (name.length < 2) return setError('Name must be at least 2 characters.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.');
    if (values.password.length < 6) return setError('Password must be at least 6 characters.');
    if (values.password !== values.confirmPassword) return setError('Passwords do not match.');

    setIsSubmitting(true);
    try {
      await register(name, email, values.password);
      navigate('/login', { replace: true, state: { registered: true } });
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to create your account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return <main className="login-page">
    <section className="login-art" aria-label="Finance"><div className="art-grid" /><div className="login-brand"><div className="brand-mark large">F</div><span>Finance</span></div><div className="art-copy"><span className="section-eyebrow light">A clearer starting point</span><h1>Begin with<br /><em>intention.</em></h1><p>Create your private workspace and make the movement behind your money easier to understand.</p></div><div className="art-footer"><span>Private workspace</span><span>●</span><span>Safe by default</span></div></section>
    <section className="login-panel"><div className="login-form-wrap"><span className="section-eyebrow">Create your workspace</span><h2>Start with Finance</h2><p className="form-intro">Your account begins with a standard viewer role.</p><form onSubmit={submit} className="login-form"><label htmlFor="register-name">Full name<input id="register-name" type="text" autoComplete="name" value={values.name} onChange={event => update('name', event.target.value)} placeholder="Your name" required /></label><label htmlFor="register-email">Email address<input id="register-email" type="email" autoComplete="email" value={values.email} onChange={event => update('email', event.target.value)} placeholder="you@example.com" required /></label><label htmlFor="register-password">Password<input id="register-password" type="password" autoComplete="new-password" value={values.password} onChange={event => update('password', event.target.value)} placeholder="At least 6 characters" required /></label><label htmlFor="register-confirm">Confirm password<input id="register-confirm" type="password" autoComplete="new-password" value={values.confirmPassword} onChange={event => update('confirmPassword', event.target.value)} placeholder="Repeat your password" required /></label>{error && <div className="form-error" role="alert">{error}</div>}<button className="primary-button full-width" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Create account'} <span aria-hidden="true">→</span></button></form><p className="login-footnote">Already have an account? <Link to="/login">Sign in</Link></p></div></section>
  </main>;
}
