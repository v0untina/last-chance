import { Navigate, useLocation } from "react-router-dom";
import { type ReactNode } from "react";
import { useAuth } from "@/stores/auth";
import { Spinner } from "@/components/ui/Button";
import type { Role } from "@/types/api";

interface Props {
  children: ReactNode;
  roles?: Role[];
}

export function RequireAuth({ children, roles }: Props) {
  const { user, initialized, loading } = useAuth();
  const location = useLocation();

  if (!initialized || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/catalog" replace />;
  return <>{children}</>;
}
