import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { token, loading } = useAuth();

  if (loading) return <div style={{ padding: '2rem' }}>Cargando sesión de FitZone...</div>;

  return token ? <Outlet /> : <Navigate to="/login" replace />;
}