import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

export default function Invite() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const [status, setStatus] = useState('joining'); // joining | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!accessToken) {
      // Not logged in — send to login, then back here
      navigate(`/login?redirect=/invite/${code}`, { replace: true });
      return;
    }

    axios.get(`/api/servers/join/${code}`)
      .then(res => {
        setStatus('success');
        setMessage(res.data.message || 'Joined!');
        setTimeout(() => navigate('/', { replace: true }), 1500);
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Invalid or expired invite link.');
      });
  }, [code, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #1a0106 0%, #2c040f 100%)' }}>
      <div className="text-center px-8 py-12 rounded-3xl max-w-sm w-full"
        style={{ backgroundColor: 'rgba(53,8,20,0.9)', border: '1px solid rgba(107,57,66,0.4)' }}>

        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, #ff8d87, #ff7670)' }}>
          <span className="material-symbols-outlined text-3xl" style={{ color: '#65000a' }}>flare</span>
        </div>

        {status === 'joining' && (
          <>
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
              style={{ borderColor: '#ff8d87 transparent transparent transparent' }} />
            <p className="text-lg font-bold" style={{ color: '#ffdde1' }}>Joining server…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <span className="material-symbols-outlined text-5xl mb-3 block" style={{ color: '#4ade80' }}>check_circle</span>
            <p className="text-lg font-bold mb-1" style={{ color: '#ffdde1' }}>You're in!</p>
            <p className="text-sm" style={{ color: '#db9aa4' }}>{message}</p>
            <p className="text-xs mt-3" style={{ color: '#9f656f' }}>Redirecting…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <span className="material-symbols-outlined text-5xl mb-3 block" style={{ color: '#ff7351' }}>error</span>
            <p className="text-lg font-bold mb-1" style={{ color: '#ffdde1' }}>Couldn't join</p>
            <p className="text-sm mb-6" style={{ color: '#db9aa4' }}>{message}</p>
            <button onClick={() => navigate('/')}
              className="px-6 py-3 rounded-full font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #ff8d87, #ff7670)', color: '#65000a' }}>
              Go Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
