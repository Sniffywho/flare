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
    console.log('[Voice] createPeer called:', { socketId, username: userInfo?.username, initiator });

    if (!stream) {
      console.error('[Voice] Cannot create peer: no stream');
      return null;
    }
    if (!socketRef.current) {
      console.error('[Voice] Cannot create peer: no socket');
      return null;
    }

    try {
      console.log('[Voice] Creating SimplePeer instance...');
      const peer = new SimplePeer({
        initiator,
        stream,
        config: {
          iceServers: [
            { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
          ]
        }
      });
      console.log('[Voice] SimplePeer instance created successfully');

      peer.on('signal', data => {
        console.log('[Voice] Signal event from peer:', socketId);
        if (socketRef.current) {
          socketRef.current.emit('voice:signal', { to: socketId, signal: data });
        }
      });

      peer.on('stream', remoteStream => {
        console.log('[Voice] Remote stream received from:', socketId);
        setPeers(prev => ({
          ...prev,
          [socketId]: { stream: remoteStream, user: userInfo },
        }));
      });

      peer.on('error', (err) => {
        console.error('[Voice] Peer error:', err);
        destroyPeer(socketId);
      });
      peer.on('close', () => {
        console.log('[Voice] Peer closed:', socketId);
        destroyPeer(socketId);
      });

      peersRef.current[socketId] = peer;
      console.log('[Voice] Added peer to peersRef, now setting placeholder state');

      // Add a placeholder so the participant shows up immediately
      setPeers(prev => {
        const next = {
          ...prev,
          [socketId]: { stream: null, user: userInfo },
        };
        console.log('[Voice] Peers state after placeholder:', Object.keys(next));
        return next;
      });

      console.log('[Voice] Peer creation completed for:', socketId);
      return peer;
    } catch (err) {
      console.error('[Voice] Error creating peer:', err);
      return null;
    }
  }, [socketRef, destroyPeer]);

  // ── Socket listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // Server sends list of users already in the channel
    const onExistingUsers = ({ users }) => {
      console.log('[Voice] Existing users event received:', users);
      const stream = localStreamRef.current;
      console.log('[Voice] localStream available?', !!stream, stream?.getAudioTracks().length);
      if (!stream) {
        console.warn('[Voice] No local stream yet, cannot create peers');
        return;
      }
      users.forEach(({ socketId, user: userInfo }) => {
        console.log('[Voice] Processing user:', userInfo?.username, 'socketId:', socketId);
        if (!peersRef.current[socketId]) {
          console.log('[Voice] Creating initiator peer for:', userInfo?.username);
          const result = createPeer(socketId, userInfo, true, stream);
          console.log('[Voice] createPeer returned:', !!result);
        } else {
          console.log('[Voice] Peer already exists for:', socketId);
        }
      });
    };

    // A new user joined after us
    const onUserJoined = ({ socketId, user: userInfo }) => {
      console.log('[Voice] User joined:', userInfo?.username, socketId);
      const stream = localStreamRef.current;
      if (!stream) {
        console.warn('[Voice] No local stream yet');
        return;
      }
      if (!peersRef.current[socketId]) {
        console.log('[Voice] Creating non-initiator peer for:', userInfo?.username);
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
  }, []);

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
