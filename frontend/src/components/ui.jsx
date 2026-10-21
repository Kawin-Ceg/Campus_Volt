import { useEffect } from 'react';
import { humanize } from '../services/format';

export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}

const BADGE_TONES = {
  ACTIVE: 'success', IN_PROGRESS: 'success', NORMAL: 'success', COMPLETED: 'neutral',
  SCHEDULED: 'info', CHARGING: 'info', ADMIN: 'info', STUDENT: 'neutral',
  NEAR_CAPACITY: 'warning', WARNING: 'warning', MAINTENANCE: 'warning',
  OVERCROWDED: 'danger', CRITICAL: 'danger', OUT_OF_SERVICE: 'danger', CANCELLED: 'neutral',
};

export function Badge({ value, label }) {
  return <span className={`badge badge-${BADGE_TONES[value] || 'neutral'}`}>{label || humanize(value)}</span>;
}

export function Panel({ title, action, children, flush }) {
  return (
    <section className="panel">
      {(title || action) && (
        <div className="panel-head">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      <div className={flush ? 'panel-body flush' : 'panel-body'}>{children}</div>
    </section>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="banner banner-error" role="alert">
      <span>{message}</span>
      {onRetry && <button className="btn btn-small btn-ghost" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="empty-state">
      <div className="empty-title">{title}</div>
      {children && <div className="empty-text">{children}</div>}
    </div>
  );
}

export function Loading({ label = 'Loading…' }) {
  return <div className="loading-row"><span className="spinner" aria-hidden="true" />{label}</div>;
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-small" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, error, hint, children }) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Meter({ percent, level }) {
  const width = Math.min(100, Math.max(0, percent || 0));
  return (
    <div className="meter" aria-label={`${percent}%`}>
      <div className={`meter-fill meter-${level || 'NORMAL'}`} style={{ width: `${width}%` }} />
    </div>
  );
}
