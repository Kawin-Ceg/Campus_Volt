import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi, TOKEN_KEY } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));
  const [sessionMessage, setSessionMessage] = useState('');

  const logout = useCallback((message = '') => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setSessionMessage(message);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    authApi.me()
      .then(setUser)
      .catch(() => logout())
      .finally(() => setChecking(false));
  }, [logout]);

  useEffect(() => {
    const onUnauthorized = () => logout('Your session has expired. Please sign in again.');
    window.addEventListener('campusvolt:unauthorized', onUnauthorized);
    return () => window.removeEventListener('campusvolt:unauthorized', onUnauthorized);
  }, [logout]);

  const startSession = ({ token, user: account }) => {
    localStorage.setItem(TOKEN_KEY, token);
    setSessionMessage('');
    setUser(account);
  };

  const value = {
    user,
    checking,
    sessionMessage,
    isAdmin: user?.role === 'ADMIN',
    login: async (credentials) => startSession(await authApi.login(credentials)),
    register: async (details) => startSession(await authApi.register(details)),
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
