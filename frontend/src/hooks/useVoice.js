import { useState, useEffect, useRef, useCallback } from 'react';
import SimplePeer from 'simple-peer';

export function useVoice(socketRef) {
  const [inVoiceChannel, setInVoiceChannel] = useState(null); // channelId or null
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({}); // socketId → { stream, user }
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [error, setError] = useState('');

  const peersRef = useRef({}); // socketId → SimplePeer instance
  const localStreamRef = useRef(null);
  const channelRef = useRef(null);

  const destroyPeer = useCallback((socketId) => {
    if (peersRef.current[socketId]) {
      peersRef.current[socketId].destroy();
      delete peersRef.current[socketId];
    }
    setPeers(prev => {
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
  }, []);

  const destroyAll = useCallback(() => {
    Object.keys(peersRef.current).forEach(id => {
      peersRef.current[id].destroy();
    });
    peersRef.current = {};
    setPeers({});
  }, []);

  const createPeer = useCallback((socketId, userInfo, initiator, stream) => {
    const peer = new SimplePeer({ initiator, stream, trickle: true });

    peer.on('signal', data => {
      socketRef.current?.emit('voice:signal', { to: socketId, signal: data });
    });

    peer.on('stream', remoteStream => {
      setPeers(prev => ({
        ...prev,
        [socketId]: { stream: remoteStream, user: userInfo },
      }));
    });

    peer.on('error', () => destroyPeer(socketId));
    peer.on('close', () => destroyPeer(socketId));

    peersRef.current[socketId] = peer;
    // Add a placeholder so the participant shows up immediately
    setPeers(prev => ({
      ...prev,
      [socketId]: { stream: null, user: userInfo },
    }));

    return peer;
  }, [socketRef, destroyPeer]);

  // ── Socket listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // Server sends list of users already in the channel
    const onExistingUsers = ({ users }) => {
      const stream = localStreamRef.current;
      if (!stream) return;
      users.forEach(({ socketId, user: userInfo }) => {
        if (!peersRef.current[socketId]) {
          createPeer(socketId, userInfo, true, stream);
        }
      });
    };

    // A new user joined after us
    const onUserJoined = ({ socketId, user: userInfo }) => {
      const stream = localStreamRef.current;
      if (!stream) return;
      if (!peersRef.current[socketId]) {
        createPeer(socketId, userInfo, false, stream);
      }
    };

    // Relay WebRTC signal from a peer
    const onSignal = ({ from, signal }) => {
      const peer = peersRef.current[from];
      if (peer) {
        try { peer.signal(signal); } catch (_) {}
      }
    };

    // A user left the channel
    const onUserLeft = ({ socketId }) => {
      destroyPeer(socketId);
    };

    socket.on('voice:existing_users', onExistingUsers);
    socket.on('voice:user_joined', onUserJoined);
    socket.on('voice:signal', onSignal);
    socket.on('voice:user_left', onUserLeft);

    return () => {
      socket.off('voice:existing_users', onExistingUsers);
      socket.off('voice:user_joined', onUserJoined);
      socket.off('voice:signal', onSignal);
      socket.off('voice:user_left', onUserLeft);
    };
  }, [socketRef.current, createPeer, destroyPeer]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Join a voice channel ────────────────────────────────────────────────────
  const joinVoice = useCallback(async (channelId) => {
    if (inVoiceChannel === channelId) return;
    setError('');

    // Leave previous channel if any
    if (channelRef.current) {
      socketRef.current?.emit('voice:leave', { channelId: channelRef.current });
      destroyAll();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        setLocalStream(null);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsMuted(false);
      setIsDeafened(false);
      channelRef.current = channelId;
      setInVoiceChannel(channelId);
      socketRef.current?.emit('voice:join', { channelId });
    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Microphone permission denied'
        : 'Could not access microphone';
      setError(msg);
    }
  }, [inVoiceChannel, socketRef, destroyAll]);

  // ── Leave the voice channel ─────────────────────────────────────────────────
  const leaveVoice = useCallback(() => {
    if (!channelRef.current) return;
    socketRef.current?.emit('voice:leave', { channelId: channelRef.current });
    destroyAll();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    channelRef.current = null;
    setInVoiceChannel(null);
    setIsMuted(false);
    setIsDeafened(false);
  }, [socketRef, destroyAll]);

  // ── Toggle mute ─────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const enabled = stream.getAudioTracks().some(t => t.enabled);
    stream.getAudioTracks().forEach(t => { t.enabled = !enabled; });
    setIsMuted(enabled); // if was enabled → now muted
  }, []);

  // ── Toggle deafen (mute all remote audio elements) ──────────────────────────
  const toggleDeafen = useCallback(() => {
    setIsDeafened(prev => !prev);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyAll();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    inVoiceChannel,
    localStream,
    peers,
    isMuted,
    isDeafened,
    error,
    joinVoice,
    leaveVoice,
    toggleMute,
    toggleDeafen,
  };
}
