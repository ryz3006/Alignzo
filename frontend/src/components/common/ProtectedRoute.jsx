import { useAuth } from "../../contexts/AuthContext";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, isAdmin, isAppLoading } = useAuth();
  if (isAppLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/unauthorized" />;
  return children;
};

export default ProtectedRoute; 