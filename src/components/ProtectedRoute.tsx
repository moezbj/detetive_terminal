import React from "react";
import { Navigate } from "react-router-dom";
import { useGame } from "../hooks/useGame";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useGame();

  if (!user) {
    // User is not authenticated, redirect to the login page
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;