import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fleetApi, occupancyApi, tripApi } from '../services/api';
import { timeAgo } from '../services/format';
import { Badge, EmptyState, ErrorBanner, Loading, PageHeader, Panel } from '../components/ui';

const REFRESH_MS = 10000;

function Stat({ label, value, detail, tone }) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">{detail}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [errors, setErrors] = useState([]);

  const load = useCallback(async () => {
    const [vehicles, trips, occupancy, alerts] = await Promise.allSettled([
      fleetApi.vehicles(), tripApi.trips(), occupancyApi.list(), occupancyApi.alerts(),
    ]);
    const value = (r) => (r.status === 'fulfilled' ? r.value : null);
    setErrors([...new Set([vehicles, trips, occupancy, alerts]
      .filter((r) => r.status === 'rejected').map((r) => r.reason.message))]);
    setData({ vehicles: value(vehicles), trips: value(trips), occupancy: value(occupancy), alerts: value(alerts) });
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  if (!data) return <><PageHeader title="Dashboard" /><Loading label="Loading fleet overview…" /></>;

  const { vehicles, trips, alerts } = data;
  const fleetIds = vehicles && new Set(vehicles.map((v) => v.id));
  const occupancy = data.occupancy && fleetIds ? data.occupancy.filter((o) => fleetIds.has(o.vehicleId)) : data.occupancy;
  const activeVehicles = vehicles?.filter((v) => v.status === 'ACTIVE').length;
  const running = trips?.filter((t) => t.status === 'IN_PROGRESS') || [];
  const scheduled = trips?.filter((t) => t.status === 'SCHEDULED').length;
  const totalPassengers = occupancy?.reduce((sum, o) => sum + o.passengerCount, 0);
  const totalSeats = occupancy?.reduce((sum, o) => sum + o.capacity, 0);
  const overcrowded = occupancy?.filter((o) => o.level === 'OVERCROWDED').length;
  const activeAlerts = alerts?.alerts || [];
  const critical = activeAlerts.filter((a) => a.severity === 'CRITICAL').length;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Current fleet state across all campus services. Refreshes every 10 seconds." />
      {errors.map((message) => <ErrorBanner key={message} message={message} onRetry={load} />)}

      <div className="stat-grid">
        <Stat label="Vehicles" value={vehicles ? vehicles.length : '—'}
          detail={vehicles ? `${activeVehicles} active` : 'Fleet data unavailable'} />
        <Stat label="Trips in progress" value={trips ? running.length : '—'}
          detail={trips ? `${scheduled} scheduled` : 'Trip data unavailable'} />
        <Stat label="Fleet occupancy"
          value={occupancy && totalSeats ? `${Math.round((totalPassengers / totalSeats) * 100)}%` : '—'}
          detail={occupancy ? (occupancy.length ? `${totalPassengers} of ${totalSeats} seats · ${overcrowded} overcrowded` : 'No counts reported yet') : 'Occupancy data unavailable'}
          tone={overcrowded ? 'danger' : undefined} />
        <Stat label="Active alerts" value={alerts ? activeAlerts.length : '—'}
          detail={alerts ? `${critical} critical` : 'Alert data unavailable'} tone={critical ? 'danger' : undefined} />
      </div>

      <div className="two-column">
        <Panel title="Trips in progress" action={<Link to="/trips" className="link">Open tracking</Link>} flush>
          {!trips ? <EmptyState title="Trip data unavailable" />
            : running.length === 0 ? <EmptyState title="No trips running">Start a scheduled trip from Trip Tracking.</EmptyState>
            : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Vehicle</th><th>Route</th><th>Progress</th><th>ETA</th><th>Updated</th></tr></thead>
                  <tbody>
                    {running.map((t) => (
                      <tr key={t.id}>
                        <td className="strong">{t.vehicleName}</td>
                        <td>{t.routeName}</td>
                        <td>{t.progressPercent != null ? `${t.progressPercent}%` : '—'}</td>
                        <td>{t.etaMinutes != null ? `~${t.etaMinutes} min` : <span className="muted">Unavailable</span>}</td>
                        <td className={t.trackingStale ? 'text-danger' : 'muted'}>{timeAgo(t.lastLocationUpdate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </Panel>

        <Panel title="Active alerts" action={<Link to="/occupancy" className="link">View all</Link>}>
          {!alerts ? <EmptyState title="Alert data unavailable" />
            : activeAlerts.length === 0 ? <EmptyState title="No active alerts">All vehicles are within normal limits.</EmptyState>
            : (
              <ul className="alert-list">
                {activeAlerts.slice(0, 6).map((a) => (
                  <li key={a.id} className="alert-item">
                    <Badge value={a.severity} />
                    <div>
                      <div className="alert-message">{a.message}</div>
                      <div className="muted small">{a.type.replace('_', ' ').toLowerCase()} · {timeAgo(a.createdAt)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </Panel>
      </div>
    </>
  );
}
