import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fleetApi, tripApi } from '../services/api';
import { formatDateTime, timeAgo, toLocalInputValue } from '../services/format';
import { Badge, EmptyState, ErrorBanner, Field, Loading, Modal, PageHeader, Panel } from '../components/ui';
import RouteMap from '../components/RouteMap';

const REFRESH_MS = 5000;
const UNAVAILABLE = ['MAINTENANCE', 'OUT_OF_SERVICE'];

function TripForm({ vehicles, routes, onSaved, onClose }) {
  const available = vehicles.filter((v) => !UNAVAILABLE.includes(v.status));
  const [form, setForm] = useState({
    vehicleId: available[0]?.id ?? '',
    routeId: available[0]?.routeId ?? '',
    scheduledStart: toLocalInputValue(new Date(Date.now() + 10 * 60000)),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const chooseVehicle = (id) => {
    const vehicle = vehicles.find((v) => v.id === Number(id));
    setForm({ ...form, vehicleId: id, routeId: vehicle?.routeId ?? '' });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.vehicleId || !form.routeId || !form.scheduledStart) {
      setError('Choose a vehicle, a route and a start time.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await tripApi.createTrip({
        vehicleId: Number(form.vehicleId),
        routeId: Number(form.routeId),
        scheduledStart: new Date(form.scheduledStart).toISOString(),
      });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title="Schedule trip" onClose={onClose}>
      <form onSubmit={submit} noValidate className="form-stack">
        <ErrorBanner message={error} />
        {available.length === 0 ? <EmptyState title="No vehicles available">Vehicles in maintenance or out of service cannot be scheduled.</EmptyState> : (
          <>
            <Field label="Vehicle" hint="Vehicles in maintenance or out of service are hidden">
              <select value={form.vehicleId} onChange={(e) => chooseVehicle(e.target.value)}>
                {available.map((v) => <option key={v.id} value={v.id}>{v.name} · {v.registrationNumber}</option>)}
              </select>
            </Field>
            <Field label="Route" hint="Defaults to the vehicle's assigned route">
              <select value={form.routeId} onChange={(e) => setForm({ ...form, routeId: e.target.value })}>
                <option value="">Select a route</option>
                {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="Scheduled start">
              <input type="datetime-local" value={form.scheduledStart} onChange={(e) => setForm({ ...form, scheduledStart: e.target.value })} />
            </Field>
          </>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || available.length === 0}>{saving ? 'Scheduling…' : 'Schedule trip'}</button>
        </div>
      </form>
    </Modal>
  );
}

function TripDetail({ trip, route, isAdmin, onAction, busy }) {
  return (
    <Panel title={`Trip #${trip.id} · ${trip.vehicleName}`} action={<Badge value={trip.status} />}>
      <RouteMap stops={route?.stops} vehicle={trip.status === 'IN_PROGRESS' ? { ...trip, name: trip.vehicleName } : null} />
      {trip.trackingStale && <div className="banner banner-warning">No location update for over 2 minutes. Position may be out of date.</div>}
      {trip.simulationPaused && trip.status === 'IN_PROGRESS' && <div className="banner banner-info">Simulation paused. The vehicle is treated as stationary.</div>}
      <dl className="detail-grid">
        <div><dt>Route</dt><dd>{trip.routeName}</dd></div>
        <div><dt>ETA to final stop</dt><dd>{trip.etaMinutes != null ? `~${trip.etaMinutes} min` : <span className="muted">{trip.etaNote}</span>}</dd></div>
        <div><dt>Progress</dt><dd>{trip.progressPercent != null ? `${trip.progressPercent}% of ${trip.routeDistanceKm} km` : 'Route distance unknown'}</dd></div>
        <div><dt>Speed (simulated)</dt><dd>{trip.speedKmh != null ? `${trip.speedKmh} km/h` : '—'}</dd></div>
        <div><dt>Position (simulated)</dt><dd className="mono">{trip.latitude != null ? `${trip.latitude.toFixed(5)}, ${trip.longitude.toFixed(5)}` : '—'}</dd></div>
        <div><dt>Last location update</dt><dd className={trip.trackingStale ? 'text-danger' : ''}>{timeAgo(trip.lastLocationUpdate)}</dd></div>
        <div><dt>Scheduled start</dt><dd>{formatDateTime(trip.scheduledStart)}</dd></div>
        <div><dt>{trip.status === 'SCHEDULED' ? 'Delay' : 'Started'}</dt><dd>
          {trip.status === 'SCHEDULED' ? (trip.delayMinutes ? `${trip.delayMinutes} min late` : 'On time') : formatDateTime(trip.startedAt)}
        </dd></div>
      </dl>
      {isAdmin && (trip.status === 'SCHEDULED' || trip.status === 'IN_PROGRESS') && (
        <div className="form-actions start">
          {trip.status === 'SCHEDULED' && <button className="btn btn-primary" disabled={busy} onClick={() => onAction({ status: 'IN_PROGRESS' })}>Start trip</button>}
          {trip.status === 'IN_PROGRESS' && <button className="btn btn-primary" disabled={busy} onClick={() => onAction({ status: 'COMPLETED' })}>Mark completed</button>}
          {trip.status === 'IN_PROGRESS' && (
            <button className="btn btn-secondary" disabled={busy} onClick={() => onAction({ simulationPaused: !trip.simulationPaused })}>
              {trip.simulationPaused ? 'Resume simulation' : 'Pause simulation'}
            </button>
          )}
          <button className="btn btn-ghost text-danger" disabled={busy} onClick={() => window.confirm('Cancel this trip?') && onAction({ status: 'CANCELLED' })}>Cancel trip</button>
        </div>
      )}
    </Panel>
  );
}

export default function TripsPage() {
  const { isAdmin } = useAuth();
  const [trips, setTrips] = useState(null);
  const [fleet, setFleet] = useState({ vehicles: [], routes: [] });
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('OPEN');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadTrips = useCallback(async () => {
    try {
      setTrips(await tripApi.trips());
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadFleet = useCallback(async () => {
    try {
      const [vehicles, routes] = await Promise.all([fleetApi.vehicles(), fleetApi.routes()]);
      setFleet({ vehicles, routes });
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadTrips();
    loadFleet();
    const timer = setInterval(loadTrips, REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadTrips, loadFleet]);

  const visible = (trips || []).filter((t) => filter === 'ALL' || (filter === 'OPEN'
    ? t.status === 'SCHEDULED' || t.status === 'IN_PROGRESS' : t.status === filter));
  const selected = trips?.find((t) => t.id === selectedId) || visible.find((t) => t.status === 'IN_PROGRESS') || visible[0];
  const route = fleet.routes.find((r) => r.id === selected?.routeId);

  const act = async (changes) => {
    setBusy(true);
    try {
      await tripApi.updateTrip(selected.id, changes);
      await loadTrips();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Trip Tracking" subtitle="Trip schedule and simulated vehicle positions. Updates every 5 seconds.">
        {isAdmin && <button className="btn btn-primary" onClick={() => setCreating(true)}>Schedule trip</button>}
      </PageHeader>
      <ErrorBanner message={error} onRetry={loadTrips} />

      {!trips && !error && <Loading label="Loading trips…" />}

      {trips && (
        <div className="two-column wide-left">
          <Panel title="Trips" flush action={
            <select className="select-compact" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter trips">
              <option value="OPEN">Scheduled and running</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="ALL">All trips</option>
            </select>
          }>
            {visible.length === 0 ? <EmptyState title="No trips to show">{isAdmin ? 'Schedule a trip to begin tracking.' : 'Check back when trips are scheduled.'}</EmptyState> : (
              <div className="table-wrap">
                <table className="table table-select">
                  <thead><tr><th>Trip</th><th>Route</th><th>Scheduled</th><th>Status</th><th>ETA</th></tr></thead>
                  <tbody>
                    {visible.map((t) => (
                      <tr key={t.id} className={selected?.id === t.id ? 'selected' : ''} onClick={() => setSelectedId(t.id)} tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setSelectedId(t.id)}>
                        <td><div className="strong">{t.vehicleName}</div><div className="muted small">#{t.id}</div></td>
                        <td>{t.routeName}</td>
                        <td>{formatDateTime(t.scheduledStart)}{t.delayMinutes > 0 && t.status !== 'COMPLETED' && <div className="text-danger small">{t.delayMinutes} min late</div>}</td>
                        <td><Badge value={t.status} />{t.trackingStale && <div className="text-danger small">Stale location</div>}</td>
                        <td>{t.etaMinutes != null ? `~${t.etaMinutes} min` : <span className="muted">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          {selected ? <TripDetail trip={selected} route={route} isAdmin={isAdmin} onAction={act} busy={busy} />
            : <Panel title="Trip details"><EmptyState title="Select a trip">Choose a trip to see its position and ETA.</EmptyState></Panel>}
        </div>
      )}

      {creating && <TripForm vehicles={fleet.vehicles} routes={fleet.routes}
        onSaved={() => { setCreating(false); loadTrips(); }} onClose={() => setCreating(false)} />}
    </>
  );
}
