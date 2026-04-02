import { useEffect } from 'react';
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Home from '@/pages/Home';
import Invite from '@/pages/Invite';
import Settings from '@/pages/Settings';

function ProtectedRoute({ children }) {
  const { accessToken } = useAuth();
  return accessToken ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { accessToken } = useAuth();
  return accessToken ? <Navigate to="/" replace /> : children;
}

export default function App() {
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuth();

  // Handle OAuth callback — extract tokens from URL and authenticate
  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const userId = searchParams.get('userId');

    if (accessToken && refreshToken && userId) {
      // Fetch user data with the access token
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      axios.get('/api/auth/me')
        .then(res => {
          setAuth(res.data.data.user, accessToken, refreshToken);
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch(() => {
          // Token might be invalid, clear and redirect to login
          window.location.href = '/login?error=oauth_callback_failed';
        });
    }
  }, [searchParams, setAuth]);

  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/invite/:code" element={<Invite />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
