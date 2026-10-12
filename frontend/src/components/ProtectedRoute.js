import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, allowedRoles, allowGuest = false }) {
  const { isAuthenticated, isGuest, role } = useAuth();

  // Check if user is authenticated or if guest access is allowed
  const hasAccess = isAuthenticated || (allowGuest && isGuest);

  if (!hasAccess) {
    // Redirect guests to guest login, authenticated users to regular login
    return <Navigate to={isGuest ? "/guest-login" : "/login"} replace />;
  }

  // Check role-based permissions for authenticated users
  if (isAuthenticated && allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}

export default ProtectedRoute;
