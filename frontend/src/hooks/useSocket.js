import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

/**
 * Returns a stable ref to a Socket.IO instance authenticated with the given token.
 * Disconnects automatically when the component unmounts or the token changes.
 */
export function useSocket(token) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL || '/', {
      auth: { token },
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return socketRef;
}
