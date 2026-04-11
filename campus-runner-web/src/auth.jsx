import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { verifyToken } from './lib/api.js';

const TOKEN_KEY = 'campus_runner_token';
const USER_KEY = 'campus_runner_user';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => window.localStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState(() => readStoredUser());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      if (!token) {
        if (active) {
          setReady(true);
        }
        return;
      }

      try {
        const profile = await verifyToken(token);
        if (!active) {
          return;
        }
        setUser(profile);
        window.localStorage.setItem(USER_KEY, JSON.stringify(profile));
      } catch {
        if (!active) {
          return;
        }
        setToken('');
        setUser(null);
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(USER_KEY);
      } finally {
        if (active) {
          setReady(true);
        }
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, [token]);

  const value = useMemo(() => ({
    ready,
    token,
    user,
    login(nextToken, nextUser) {
      setToken(nextToken);
      setUser(nextUser);
      window.localStorage.setItem(TOKEN_KEY, nextToken);
      window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    },
    logout() {
      setToken('');
      setUser(null);
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
    },
    updateUser(nextUser) {
      setUser(nextUser);
      window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    }
  }), [ready, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
