import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import FleetPage from './pages/FleetPage';
import TripsPage from './pages/TripsPage';
import OccupancyPage from './pages/OccupancyPage';
import ProfilePage from './pages/ProfilePage';

function RequireAuth({ children }) {
  const { user, checking } = useAuth();
  if (checking) return <div className="page-loading">Checking your session…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="fleet" element={<FleetPage />} />
        <Route path="trips" element={<TripsPage />} />
        <Route path="occupancy" element={<OccupancyPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
