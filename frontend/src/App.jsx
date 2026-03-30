import { Routes, Route, Navigate } from 'react-router-dom';
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
