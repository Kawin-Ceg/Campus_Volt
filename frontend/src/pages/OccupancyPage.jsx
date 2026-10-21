import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fleetApi, occupancyApi } from '../services/api';
import { humanize, timeAgo } from '../services/format';
import { Badge, EmptyState, ErrorBanner, Loading, Meter, PageHeader, Panel } from '../components/ui';

function CountEditor({ vehicle, current, onSaved }) {
  const [value, setValue] = useState(current ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setValue(current ?? ''); }, [current]);

  const save = async (e) => {
    e.preventDefault();
    const count = Number(value);
    if (value === '' || !Number.isInteger(count) || count < 0) {
      setError('Enter a whole number, 0 or more');
      return;
    }
    if (count > vehicle.capacity * 2) {
      setError(`More than ${vehicle.capacity * 2} is not plausible`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await occupancyApi.update(vehicle.id, count);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="count-editor" onSubmit={save} noValidate>
      <input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} aria-label={`Passengers on ${vehicle.name}`} />
      <button className="btn btn-secondary btn-small" disabled={saving || String(value) === String(current ?? '')}>{saving ? 'Saving' : 'Save'}</button>
      {error && <div className="field-error">{error}</div>}
    </form>
  );
}

export default function OccupancyPage() {
  const { isAdmin } = useAuth();
  const [vehicles, setVehicles] = useState(null);
  const [occupancy, setOccupancy] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [showResolved, setShowResolved] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [v, o, a] = await Promise.all([fleetApi.vehicles(), occupancyApi.list(), occupancyApi.alerts(showResolved)]);
      setVehicles(v);
      setOccupancy(o);
      setAlerts(a);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [showResolved]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

  const byVehicle = Object.fromEntries(occupancy.map((o) => [o.vehicleId, o]));

  return (
    <>
      <PageHeader title="Occupancy & Alerts" subtitle="Passenger counts against seating capacity, plus alerts for overcrowding, delays and stale tracking." />
      <ErrorBanner message={error} onRetry={load} />
      {!vehicles && !error && <Loading />}

      {vehicles && (
        <Panel title="Passenger occupancy" flush>
          {vehicles.length === 0 ? <EmptyState title="No vehicles in the fleet" /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Vehicle</th><th className="num">Passengers</th><th className="occupancy-col">Occupancy</th><th>Level</th><th>Last reported</th>{isAdmin && <th>Update count</th>}</tr></thead>
                <tbody>
                  {vehicles.map((v) => {
                    const o = byVehicle[v.id];
                    return (
                      <tr key={v.id}>
                        <td><div className="strong">{v.name}</div><div className="muted small">{v.capacity} seats</div></td>
                        <td className="num">{o ? `${o.passengerCount} / ${o.capacity}` : <span className="muted">—</span>}</td>
                        <td className="occupancy-col">
                          {o ? <div className="meter-row"><Meter percent={o.occupancyPercent} level={o.level} /><span className="small">{o.occupancyPercent}%</span></div>
                            : <span className="muted small">No count reported</span>}
                        </td>
                        <td>{o ? <Badge value={o.level} /> : <span className="muted">—</span>}</td>
                        <td className="muted small">{o ? `${timeAgo(o.updatedAt)}` : '—'}</td>
                        {isAdmin && <td><CountEditor vehicle={v} current={o?.passengerCount} onSaved={load} /></td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {alerts && (
        <Panel title="Operational alerts" action={
          <label className="checkbox">
            <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
            Include resolved
          </label>
        }>
          {!alerts.tripDataAvailable && <div className="banner banner-warning">Trip service is unreachable, so delay and stale-tracking alerts may be out of date.</div>}
          {alerts.alerts.length === 0 ? <EmptyState title={showResolved ? 'No alerts recorded' : 'No active alerts'}>Alerts appear when a vehicle is over capacity, a trip runs more than 5 minutes late, or tracking stops updating.</EmptyState> : (
            <ul className="alert-list">
              {alerts.alerts.map((a) => (
                <li key={a.id} className={`alert-item ${a.active ? '' : 'resolved'}`}>
                  <Badge value={a.active ? a.severity : 'COMPLETED'} label={a.active ? humanize(a.severity) : 'Resolved'} />
                  <div>
                    <div className="alert-message">{a.message}</div>
                    <div className="muted small">
                      {humanize(a.type)} · raised {timeAgo(a.createdAt)}{a.resolvedAt && ` · resolved ${timeAgo(a.resolvedAt)}`}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </>
  );
}
