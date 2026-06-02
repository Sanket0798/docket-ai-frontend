import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [onboardingDone, setOnboardingDone] = useState(() => {
    const val = localStorage.getItem('onboardingDone');
    return val === 'true' || val === '1';
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setLoading(true);
      Promise.all([
        api.get('/auth/me'),
        api.get('/onboarding'),
      ])
        .then(([meRes, obRes]) => {
          setUser(meRes.data);
          localStorage.setItem('user', JSON.stringify(meRes.data));
          
          // Strict boolean check
          const done = obRes.data?.completed === true || obRes.data?.completed === 1;
          setOnboardingDone(done);
          if (done) {
            localStorage.setItem('onboardingDone', 'true');
          } else {
            localStorage.removeItem('onboardingDone');
          }
        })
        .catch(() => {
          // If it fails, we clear session
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user?.id]); // Re-run when user ID changes (e.g. after login)

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData); // This triggers the useEffect above
  };

  const completeOnboarding = () => {
    setOnboardingDone(true);
    localStorage.setItem('onboardingDone', 'true');
  };

  const logout = () => {
    // Fire-and-forget — backend call to invalidate token server-side (if blacklist is implemented)
    const token = localStorage.getItem('token');
    if (token) {
      api.post('/auth/logout').catch(() => {}); // silent — client clears regardless
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('onboardingDone');
    setUser(null);
    setOnboardingDone(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, onboardingDone, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
