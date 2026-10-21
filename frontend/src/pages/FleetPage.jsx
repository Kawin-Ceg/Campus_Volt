import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fleetApi } from '../services/api';
import { humanize } from '../services/format';
import { Badge, EmptyState, ErrorBanner, Field, Loading, Modal, PageHeader, Panel } from '../components/ui';

const STATUSES = ['ACTIVE', 'CHARGING', 'MAINTENANCE', 'OUT_OF_SERVICE'];
const EMPTY_VEHICLE = { registrationNumber: '', name: '', capacity: '', status: 'ACTIVE', batteryLevel: '', routeId: '' };
const EMPTY_STOP = { name: '', latitude: '', longitude: '' };

function VehicleForm({ vehicle, routes, onSaved, onClose }) {
  const [form, setForm] = useState(vehicle ? { ...vehicle, routeId: vehicle.routeId ?? '' } : EMPTY_VEHICLE);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.registrationNumber.trim()) found.registrationNumber = 'Required';
    if (!form.name.trim()) found.name = 'Required';
    const capacity = Number(form.capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 120) found.capacity = 'Whole number from 1 to 120';
    const battery = Number(form.batteryLevel);
    if (form.batteryLevel === '' || !Number.isInteger(battery) || battery < 0 || battery > 100) found.batteryLevel = 'Whole number from 0 to 100';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    setError('');
    const body = { ...form, capacity, batteryLevel: battery, routeId: form.routeId ? Number(form.routeId) : null };
    try {
      await (vehicle ? fleetApi.updateVehicle(vehicle.id, body) : fleetApi.createVehicle(body));
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={vehicle ? `Edit ${vehicle.name}` : 'Add vehicle'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="form-stack">
        <ErrorBanner message={error} />
        <div className="form-grid">
          <Field label="Vehicle name" error={errors.name}><input value={form.name} onChange={set('name')} placeholder="Shuttle D" /></Field>
          <Field label="Registration number" error={errors.registrationNumber}><input value={form.registrationNumber} onChange={set('registrationNumber')} placeholder="TN09EV1004" /></Field>
          <Field label="Seating capacity" error={errors.capacity}><input type="number" min="1" value={form.capacity} onChange={set('capacity')} /></Field>
          <Field label="Battery level (%)" error={errors.batteryLevel}><input type="number" min="0" max="100" value={form.batteryLevel} onChange={set('batteryLevel')} /></Field>
          <Field label="Status">
            <select value={form.status} onChange={set('status')}>
              {STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </select>
          </Field>
          <Field label="Assigned route">
            <select value={form.routeId} onChange={set('routeId')}>
              <option value="">Not assigned</option>
              {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save vehicle'}</button>
        </div>
      </form>
    </Modal>
  );
}

function RouteForm({ route, onSaved, onClose }) {
  const [form, setForm] = useState(route
    ? { name: route.name, description: route.description || '', distanceKm: route.manualDistanceKm ?? '', stops: route.stops.map((s) => ({ name: s.name, latitude: s.latitude, longitude: s.longitude })) }
    : { name: '', description: '', distanceKm: '', stops: [{ ...EMPTY_STOP }, { ...EMPTY_STOP }] });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const setStop = (index, field, value) =>
    setForm({ ...form, stops: form.stops.map((s, i) => (i === index ? { ...s, [field]: value } : s)) });
  const moveStop = (index, direction) => {
    const stops = [...form.stops];
    [stops[index], stops[index + direction]] = [stops[index + direction], stops[index]];
    setForm({ ...form, stops });
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.name.trim()) found.name = 'Required';
    if (form.distanceKm !== '' && !(Number(form.distanceKm) > 0)) found.distanceKm = 'Must be greater than 0';
    form.stops.forEach((s, i) => {
      const lat = Number(s.latitude), lng = Number(s.longitude);
      if (!s.name.trim() || s.latitude === '' || s.longitude === '' || Math.abs(lat) > 90 || Math.abs(lng) > 180 || Number.isNaN(lat) || Number.isNaN(lng)) {
        found[`stop${i}`] = 'Each stop needs a name, latitude (−90 to 90) and longitude (−180 to 180)';
      }
    });
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    setError('');
    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      distanceKm: form.distanceKm === '' ? null : Number(form.distanceKm),
      stops: form.stops.map((s) => ({ name: s.name.trim(), latitude: Number(s.latitude), longitude: Number(s.longitude) })),
    };
    try {
      await (route ? fleetApi.updateRoute(route.id, body) : fleetApi.createRoute(body));
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const stopError = Object.entries(errors).find(([key]) => key.startsWith('stop'))?.[1];

  return (
    <Modal title={route ? `Edit ${route.name}` : 'Add route'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="form-stack">
        <ErrorBanner message={error} />
        <div className="form-grid">
          <Field label="Route name" error={errors.name}><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Distance (km)" error={errors.distanceKm} hint="Leave blank to estimate from stop coordinates">
            <input type="number" step="0.1" min="0" value={form.distanceKm} onChange={(e) => setForm({ ...form, distanceKm: e.target.value })} />
          </Field>
        </div>
        <Field label="Description"><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>

        <div>
          <div className="field-label">Stops, in travel order</div>
          <div className="stop-editor">
            {form.stops.map((stop, i) => (
              <div className={`stop-row ${errors[`stop${i}`] ? 'has-error' : ''}`} key={i}>
                <span className="stop-index">{i + 1}</span>
                <input aria-label={`Stop ${i + 1} name`} placeholder="Stop name" value={stop.name} onChange={(e) => setStop(i, 'name', e.target.value)} />
                <input aria-label={`Stop ${i + 1} latitude`} placeholder="Latitude" type="number" step="any" value={stop.latitude} onChange={(e) => setStop(i, 'latitude', e.target.value)} />
                <input aria-label={`Stop ${i + 1} longitude`} placeholder="Longitude" type="number" step="any" value={stop.longitude} onChange={(e) => setStop(i, 'longitude', e.target.value)} />
                <div className="stop-actions">
                  <button type="button" className="btn btn-ghost btn-small" disabled={i === 0} onClick={() => moveStop(i, -1)} aria-label="Move up">Up</button>
                  <button type="button" className="btn btn-ghost btn-small" disabled={i === form.stops.length - 1} onClick={() => moveStop(i, 1)} aria-label="Move down">Down</button>
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => setForm({ ...form, stops: form.stops.filter((_, j) => j !== i) })}>Remove</button>
                </div>
              </div>
            ))}
          </div>
          {stopError && <span className="field-error">{stopError}</span>}
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setForm({ ...form, stops: [...form.stops, { ...EMPTY_STOP }] })}>Add stop</button>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save route'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function FleetPage() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('vehicles');
  const [vehicles, setVehicles] = useState(null);
  const [routes, setRoutes] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      const [v, r] = await Promise.all([fleetApi.vehicles(), fleetApi.routes()]);
      setVehicles(v);
      setRoutes(r);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (kind, item) => {
    const warning = kind === 'route' && item.vehicleCount
      ? ` ${item.vehicleCount} vehicle(s) will be unassigned.` : '';
    if (!window.confirm(`Delete ${item.name}?${warning}`)) return;
    try {
      await (kind === 'route' ? fleetApi.deleteRoute(item.id) : fleetApi.deleteVehicle(item.id));
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onSaved = () => { setEditing(null); load(); };

  return (
    <>
      <PageHeader title="Fleet & Routes" subtitle="Vehicles, their operating status and the routes they serve.">
        {isAdmin && tab === 'vehicles' && <button className="btn btn-primary" onClick={() => setEditing({ kind: 'vehicle' })}>Add vehicle</button>}
        {isAdmin && tab === 'routes' && <button className="btn btn-primary" onClick={() => setEditing({ kind: 'route' })}>Add route</button>}
      </PageHeader>

      <div className="tabs tabs-page" role="tablist">
        <button role="tab" aria-selected={tab === 'vehicles'} className={tab === 'vehicles' ? 'tab active' : 'tab'} onClick={() => setTab('vehicles')}>
          Vehicles {vehicles && <span className="tab-count">{vehicles.length}</span>}
        </button>
        <button role="tab" aria-selected={tab === 'routes'} className={tab === 'routes' ? 'tab active' : 'tab'} onClick={() => setTab('routes')}>
          Routes {routes && <span className="tab-count">{routes.length}</span>}
        </button>
      </div>

      <ErrorBanner message={error} onRetry={load} />

      {!vehicles && !error && <Loading />}

      {vehicles && tab === 'vehicles' && (
        <Panel flush>
          {vehicles.length === 0 ? <EmptyState title="No vehicles yet">{isAdmin ? 'Add the first vehicle to start planning trips.' : 'The transport office has not added vehicles yet.'}</EmptyState> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Vehicle</th><th>Status</th><th className="num">Capacity</th><th>Battery</th><th>Route</th>{isAdmin && <th className="actions-col">Actions</th>}</tr></thead>
                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v.id}>
                      <td><div className="strong">{v.name}</div><div className="muted small mono">{v.registrationNumber}</div></td>
                      <td><Badge value={v.status} /></td>
                      <td className="num">{v.capacity} seats</td>
                      <td>
                        <div className="battery"><div className={`battery-fill ${v.batteryLevel < 25 ? 'low' : ''}`} style={{ width: `${v.batteryLevel}%` }} /></div>
                        <span className="small">{v.batteryLevel}%</span>
                      </td>
                      <td>{v.routeName || <span className="muted">Not assigned</span>}</td>
                      {isAdmin && (
                        <td className="actions-col">
                          <button className="btn btn-ghost btn-small" onClick={() => setEditing({ kind: 'vehicle', item: v })}>Edit</button>
                          <button className="btn btn-ghost btn-small text-danger" onClick={() => remove('vehicle', v)}>Delete</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {routes && tab === 'routes' && (
        <Panel flush>
          {routes.length === 0 ? <EmptyState title="No routes yet">{isAdmin ? 'Create a route with its stops, then assign vehicles to it.' : 'No routes have been published.'}</EmptyState> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Route</th><th>Stops</th><th className="num">Distance</th><th className="num">Vehicles</th>{isAdmin && <th className="actions-col">Actions</th>}</tr></thead>
                <tbody>
                  {routes.map((r) => (
                    <tr key={r.id}>
                      <td><div className="strong">{r.name}</div>{r.description && <div className="muted small">{r.description}</div>}</td>
                      <td>
                        {r.stops.length === 0 ? <span className="muted">No stops</span> : (
                          <ol className="stop-chain">{r.stops.map((s) => <li key={s.id}>{s.name}</li>)}</ol>
                        )}
                      </td>
                      <td className="num">
                        {r.distanceKm != null ? `${r.distanceKm} km` : <span className="muted">Unknown</span>}
                        {r.distanceEstimated && <div className="muted small">estimated from stops</div>}
                      </td>
                      <td className="num">{r.vehicleCount}</td>
                      {isAdmin && (
                        <td className="actions-col">
                          <button className="btn btn-ghost btn-small" onClick={() => setEditing({ kind: 'route', item: r })}>Edit</button>
                          <button className="btn btn-ghost btn-small text-danger" onClick={() => remove('route', r)}>Delete</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {editing?.kind === 'vehicle' && <VehicleForm vehicle={editing.item} routes={routes || []} onSaved={onSaved} onClose={() => setEditing(null)} />}
      {editing?.kind === 'route' && <RouteForm route={editing.item} onSaved={onSaved} onClose={() => setEditing(null)} />}
    </>
  );
}
