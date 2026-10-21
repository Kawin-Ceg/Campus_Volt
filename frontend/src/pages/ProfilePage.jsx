import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../services/format';
import { Badge, PageHeader, Panel } from '../components/ui';

const PERMISSIONS = {
  ADMIN: ['Add, edit and delete vehicles and routes', 'Schedule, start, complete and cancel trips', 'Report passenger counts', 'View tracking, occupancy and alerts'],
  STUDENT: ['View vehicles, routes and stops', 'Follow trips and simulated vehicle positions', 'View occupancy and active alerts'],
};

export default function ProfilePage() {
  const { user, logout } = useAuth();
  return (
    <>
      <PageHeader title="Profile" subtitle="Your account and what it can access." />
      <div className="two-column">
        <Panel title="Account">
          <dl className="detail-grid single">
            <div><dt>Name</dt><dd>{user.fullName}</dd></div>
            <div><dt>Email</dt><dd>{user.email}</dd></div>
            <div><dt>Role</dt><dd><Badge value={user.role} /></dd></div>
            <div><dt>Member since</dt><dd>{formatDateTime(user.createdAt)}</dd></div>
          </dl>
          <div className="form-actions start">
            <button className="btn btn-secondary" onClick={() => logout('You have signed out.')}>Sign out</button>
          </div>
        </Panel>
        <Panel title="Access">
          <ul className="plain-list">
            {PERMISSIONS[user.role].map((item) => <li key={item}>{item}</li>)}
          </ul>
        </Panel>
      </div>
    </>
  );
}
