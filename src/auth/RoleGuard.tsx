import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './store';
import type { Role } from './types';

export default function RoleGuard({ allow }: { allow: Role[] }) {
  const profile = useAuth((s) => s.profile);
  if (!profile) return <Navigate to="/login" replace />;
  return allow.includes(profile.role) ? <Outlet /> : <Navigate to="/login" replace />;
}
