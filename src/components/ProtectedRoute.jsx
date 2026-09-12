import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ADMIN_EMAIL } from '../utils/constants';

/**
 * ProtectedRoute — wraps pages that require authentication.
 * For role 'admin': strictly checks BOTH Firestore userRole === 'admin'
 * AND currentUser.email === ADMIN_EMAIL.
 * Optionally restricts by other roles (e.g. "shopOwner").
 */
function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen" id="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Strict Admin Gate: Firestore role must be 'admin' AND email must match the master admin email
  if (requiredRole === 'admin') {
    const isAuthorizedAdmin =
      userRole === 'admin' &&
      currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    if (!isAuthorizedAdmin) {
      return <Navigate to="/" replace />;
    }
  } else if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
