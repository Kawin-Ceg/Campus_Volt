import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Field } from '../components/ui';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY_FORM = { fullName: '', email: '', password: '', confirmPassword: '' };

function validate(form, mode) {
  const errors = {};
  if (mode === 'register' && !form.fullName.trim()) errors.fullName = 'Enter your full name';
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Enter a valid email address';
  if (!form.password) errors.password = 'Enter your password';
  else if (mode === 'register' && form.password.length < 8) errors.password = 'Use at least 8 characters';
  if (mode === 'register' && form.confirmPassword !== form.password) errors.confirmPassword = 'Passwords do not match';
  return errors;
}

export default function LoginPage() {
  const { login, register, sessionMessage } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === 'register';
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const switchMode = (next) => {
    setMode(next);
    setErrors({});
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(form, mode);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    setServerError('');
    try {
      const email = form.email.trim();
      if (isRegister) await register({ fullName: form.fullName.trim(), email, password: form.password });
      else await login({ email, password: form.password });
    } catch (err) {
      setServerError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-intro">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">CV</span>
          <div>
            <div className="brand-name">CampusVolt</div>
            <div className="brand-sub">EV Fleet Intelligence</div>
          </div>
        </div>
        <h1>Campus shuttle operations in one place.</h1>
        <ul className="login-points">
          <li>Fleet, routes and stop assignments</li>
          <li>Trip status with simulated vehicle tracking</li>
          <li>Passenger occupancy and operational alerts</li>
        </ul>
      </section>

      <section className="login-card">
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={!isRegister} className={!isRegister ? 'tab active' : 'tab'} onClick={() => switchMode('login')}>Sign in</button>
          <button role="tab" aria-selected={isRegister} className={isRegister ? 'tab active' : 'tab'} onClick={() => switchMode('register')}>Create student account</button>
        </div>

        {sessionMessage && !serverError && <div className="banner banner-info">{sessionMessage}</div>}
        {serverError && <div className="banner banner-error" role="alert">{serverError}</div>}

        <form onSubmit={handleSubmit} noValidate className="form-stack">
          {isRegister && (
            <Field label="Full name" error={errors.fullName}>
              <input value={form.fullName} onChange={update('fullName')} autoComplete="name" />
            </Field>
          )}
          <Field label="Email" error={errors.email}>
            <input type="email" value={form.email} onChange={update('email')} autoComplete="email" />
          </Field>
          <Field label="Password" error={errors.password} hint={isRegister ? 'At least 8 characters' : ''}>
            <input type="password" value={form.password} onChange={update('password')}
              autoComplete={isRegister ? 'new-password' : 'current-password'} />
          </Field>
          {isRegister && (
            <Field label="Confirm password" error={errors.confirmPassword}>
              <input type="password" value={form.confirmPassword} onChange={update('confirmPassword')} autoComplete="new-password" />
            </Field>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <p className="login-footnote">
          {isRegister ? 'New accounts get student access. Administrators are set up by the transport office.' : 'Use your campus email to sign in.'}
        </p>
      </section>
    </div>
  );
}
