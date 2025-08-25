import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './store';

export default function Protected() {
  const token = useAuth((s) => s.token);
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
