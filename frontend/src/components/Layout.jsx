import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/fleet', label: 'Fleet & Routes' },
  { to: '/trips', label: 'Trip Tracking' },
  { to: '/occupancy', label: 'Occupancy & Alerts' },
  { to: '/profile', label: 'Profile' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">CV</span>
          <div>
            <div className="brand-name">CampusVolt</div>
            <div className="brand-sub">EV Fleet Intelligence</div>
          </div>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
            {menuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
        <nav className="nav" onClick={() => setMenuOpen(false)}>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-user-name">{user.fullName}</div>
          <div className="sidebar-user-role">{user.role === 'ADMIN' ? 'Administrator' : 'Student'}</div>
          <button className="btn btn-sidebar" onClick={() => logout()}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
