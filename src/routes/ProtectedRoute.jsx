import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (roles && Array.isArray(roles) && roles.length > 0) {
    const userRole = (user.role || "").toLowerCase().trim();
    const isAllowed = roles.some((r) => r.toLowerCase().trim() === userRole);
    // Admin always has full access
    if (!isAllowed && userRole !== "admin") {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

