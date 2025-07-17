import { useAdminAuth } from "../../contexts/AdminAuthContext";
import { Navigate } from "react-router-dom";

const AdminProtectedRoute = ({ children }) => {
  const { adminToken } = useAdminAuth();
  if (!adminToken) return <Navigate to="/admin/login" />;
  return children;
};

export default AdminProtectedRoute; 