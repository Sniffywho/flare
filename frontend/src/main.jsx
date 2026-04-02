import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from '@/context/AuthContext';
import App from './App';
import './index.css';

// In production the frontend (Vercel) and backend (Render) are on different domains.
// Set baseURL so all axios('/api/...') calls resolve to the correct backend.
if (import.meta.env.VITE_SOCKET_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_SOCKET_URL;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
