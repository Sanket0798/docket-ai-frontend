import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading, onboardingDone } = useAuth();
  const location = useLocation();

  // Safety timeout — if auth check takes more than 10s, stop spinning
  // and redirect to login so the user isn't stuck forever.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading && !timedOut) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-brand-color border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#787889]">Loading your workspace...</p>
      </div>
    );
  }

  // Timed out or not authenticated
  if (timedOut || !user) return <Navigate to="/login" replace />;

  // If onboarding not done, only allow onboarding routes
  const isOnboardingRoute =
    location.pathname.startsWith('/onboarding') ||
    location.pathname === '/get-started';

  if (!onboardingDone && !isOnboardingRoute) {
    return <Navigate to="/onboarding/step1" replace />;
  }

  return children;
};

export default ProtectedRoute;
