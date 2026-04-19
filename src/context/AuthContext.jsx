import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [onboardingDone, setOnboardingDone] = useState(() => {
    return localStorage.getItem('onboardingDone') === 'true';
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      Promise.all([
        api.get('/auth/me'),
        api.get('/onboarding'),
      ])
        .then(([meRes, obRes]) => {
          setUser(meRes.data);
          localStorage.setItem('user', JSON.stringify(meRes.data));
          const done = obRes.data?.completed === true || obRes.data?.completed === 1;
          setOnboardingDone(done);
          localStorage.setItem('onboardingDone', done);
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
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
