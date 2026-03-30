import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [accessToken, setAccessToken] = useState(
    () => localStorage.getItem('accessToken') || null
  );

  // Keep axios Authorization header in sync
  useEffect(() => {
    if (accessToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [accessToken]);

  // Auto-refresh access token on 401 responses
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      res => res,
      async err => {
        const original = err.config;
        if (err.response?.status === 401 && !original._retry) {
          original._retry = true;
          const storedRefresh = localStorage.getItem('refreshToken');
          if (storedRefresh) {
            try {
              const res = await axios.post(
                '/api/auth/refresh-token',
                { refreshToken: storedRefresh },
                { _retry: true }
              );
              const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data;
              setAccessToken(newAccess);
              localStorage.setItem('accessToken', newAccess);
              if (newRefresh) localStorage.setItem('refreshToken', newRefresh);
              axios.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
              original.headers['Authorization'] = `Bearer ${newAccess}`;
              return axios(original);
            } catch (_) {
              // Refresh failed — clear session
              setUser(null);
              setAccessToken(null);
              localStorage.removeItem('user');
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              delete axios.defaults.headers.common['Authorization'];
            }
          }
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const setAuth = useCallback((userData, token, refreshToken) => {
    setUser(userData);
    setAccessToken(token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('accessToken', token);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (_) {}
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
