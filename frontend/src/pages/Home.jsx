import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format, isToday, isYesterday } from 'date-fns';
import EmojiPicker from 'emoji-picker-react';
import { getInitialTheme, applyTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { useVoice } from '@/hooks/useVoice';

// ── Theme palettes ────────────────────────────────────────────────────────────
const DARK = {
  rail: '#1a0106', sidebar: '#24020a', main: '#2c040f',
  headerBg: '#2c040f', footerBg: '#2c040f',
  border: 'rgba(107,57,66,0.35)',
  text: '#ffdde1', textMuted: '#db9aa4', textFaint: '#9f656f',
  accent: '#ff8d87', accentText: '#65000a',
  inputBg: '#350814', serverBtnBg: '#350814',
  chActiveText: '#ff8d87', chActiveBg: 'rgba(255,141,135,0.12)',
  chHoverBg: 'rgba(255,141,135,0.06)',
  reactionBg: '#350814', reactionBorder: 'rgba(107,57,66,0.5)',
  reactionActiveBg: 'rgba(255,141,135,0.18)', reactionActiveBorder: '#ff8d87',
  replyBg: 'rgba(53,8,20,0.85)',
  divider: 'rgba(107,57,66,0.25)', dateBadgeBg: '#350814',
  statusOnline: '#4ade80', statusOffline: '#9f656f',
  userPanelBg: '#1e0107', authorHighlight: '#4ade80',
  actionBarBg: '#350814', danger: '#ff7351',
  modalBg: '#2c040f', modalOverlay: 'rgba(0,0,0,0.7)',
};

const LIGHT = {
  rail: '#eceef4', sidebar: '#f2f3f9', main: '#ffffff',
  headerBg: '#ffffff', footerBg: '#ffffff',
  border: 'rgba(196,198,208,0.4)',
  text: '#1a2f4d', textMuted: '#485c7d', textFaint: '#637899',
  accent: '#ff8d87', accentText: '#65000a',
  inputBg: '#f2f3f9', serverBtnBg: '#e6e8ee',
  chActiveText: '#ff8d87', chActiveBg: 'rgba(255,141,135,0.1)',
  chHoverBg: 'rgba(0,0,0,0.03)',
  reactionBg: '#f2f3f9', reactionBorder: 'rgba(196,198,208,0.6)',
  reactionActiveBg: 'rgba(255,141,135,0.12)', reactionActiveBorder: '#ff8d87',
  replyBg: '#f2f3f9',
  divider: 'rgba(196,198,208,0.35)', dateBadgeBg: '#eceef4',
  statusOnline: '#22c55e', statusOffline: '#c4c6d0',
  userPanelBg: '#eceef4', authorHighlight: '#16a34a',
  actionBarBg: '#ffffff', danger: '#e53935',
  modalBg: '#ffffff', modalOverlay: 'rgba(0,0,0,0.5)',
};

const QUICK_EMOJIS = ['🔥', '❤️', '😂', '👍', '😮', '😢'];

const formatDate = (dateStr) => {
  if (!dateStr) return 'Today';
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
};

// ── Shared UI components ──────────────────────────────────────────────────────
function ThemeToggle({ isDark, onToggle }) {
  return (
    <button onClick={onToggle} title="Toggle theme"
      className="flex items-center justify-center w-9 h-9 rounded-full btn-theme"
      style={{ color: isDark ? '#db9aa4' : '#485c7d' }}>
      <span className="material-symbols-outlined text-xl">
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  );
}

function ServerRailBtn({ icon, label, active, c, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button title={label}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={onClick}
      className="w-12 h-12 flex items-center justify-center transition-all duration-150 active:scale-90 overflow-hidden text-sm font-black flex-shrink-0"
      style={{
        backgroundColor: active || hov ? c.accent : c.serverBtnBg,
        color: active || hov ? c.accentText : c.textMuted,
        borderRadius: active || hov ? '16px' : '9999px',
      }}>
      {icon
        ? <span className="material-symbols-outlined">{icon}</span>
        : <span>{label?.slice(0, 2).toUpperCase()}</span>}
    </button>
  );
}

function ChannelLink({ ch, active, c, onClick }) {
  const [hov, setHov] = useState(false);
  const iconMap = { text: 'numbers', voice: 'volume_up', announcement: 'campaign' };
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-left transition-colors duration-150"
      style={{
        backgroundColor: active ? c.chActiveBg : hov ? c.chHoverBg : 'transparent',
        color: active ? c.chActiveText : hov ? c.text : c.textMuted,
      }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <span className="material-symbols-outlined text-sm">{iconMap[ch.type] || 'numbers'}</span>
      <span className="flex-1 truncate">{ch.name}</span>
    </button>
  );
}

function Avatar({ src, name, size = 10, c }) {
  const [err, setErr] = useState(false);
  const initials = (name || '?').slice(0, 2).toUpperCase();
  const px = { 8: 'w-8 h-8', 10: 'w-10 h-10', 12: 'w-12 h-12' };
  const cls = px[size] || `w-${size} h-${size}`;
  if (!src || err) {
    return (
      <div className={`${cls} rounded-full flex items-center justify-center text-xs font-black flex-shrink-0`}
        style={{ backgroundColor: `${c.accent}30`, color: c.accent }}>
        {initials}
      </div>
    );
  }
  return (
    <img src={src} alt={name} onError={() => setErr(true)}
      className={`${cls} rounded-full object-cover flex-shrink-0`} />
  );
}

// ── Message action bar (appears on hover) ─────────────────────────────────────
function MessageActions({ msg, currentUserId, c, onReply, onEdit, onDelete, onReact }) {
  const [showPicker, setShowPicker] = useState(false);
  const isOwn = msg.sender?._id?.toString() === currentUserId?.toString();

  return (
    <div className="relative flex items-center gap-0.5">
      {/* Quick reaction picker */}
      {showPicker && (
        <div className="absolute bottom-full right-0 mb-1 flex items-center gap-1 px-2 py-1.5 rounded-xl shadow-lg z-20"
          style={{ backgroundColor: c.actionBarBg, border: `1px solid ${c.border}` }}>
          {QUICK_EMOJIS.map(e => (
            <button key={e} onClick={() => { onReact(e); setShowPicker(false); }}
              className="text-lg hover:scale-125 transition-transform leading-none px-0.5">
              {e}
            </button>
          ))}
        </div>
      )}

      <button onClick={() => setShowPicker(v => !v)} title="Add reaction"
        className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
        style={{ color: c.textMuted }}>
        <span className="material-symbols-outlined text-[18px]">add_reaction</span>
      </button>
      <button onClick={onReply} title="Reply"
        className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
        style={{ color: c.textMuted }}>
        <span className="material-symbols-outlined text-[18px]">reply</span>
      </button>
      {isOwn && !msg.isDeleted && (
        <>
          <button onClick={onEdit} title="Edit"
            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
            style={{ color: c.textMuted }}>
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button onClick={onDelete} title="Delete"
            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
            style={{ color: c.danger }}>
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </>
      )}
    </div>
  );
}

// ── Single message row ────────────────────────────────────────────────────────
function MessageRow({ msg, currentUserId, currentUser, c, isEditing, editContent,
  onSetEditContent, onEditSubmit, onEditCancel, onReply, onDelete, onReact }) {
  const [hovered, setHovered] = useState(false);
  const sender = msg.sender || {};
  const name = sender.displayName || sender.username || 'Unknown';
  const time = msg.createdAt ? format(new Date(msg.createdAt), 'h:mm a') : '';

  return (
    <div className="relative rounded-xl px-3 py-2 -mx-3 transition-colors"
      style={{ backgroundColor: hovered ? (c === DARK ? 'rgba(255,141,135,0.03)' : 'rgba(0,0,0,0.02)') : 'transparent' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>

      {/* Hover action bar */}
      {hovered && !msg.isDeleted && (
        <div className="absolute -top-4 right-3 z-10 rounded-lg shadow-md px-1 py-0.5 flex items-center"
          style={{ backgroundColor: c.actionBarBg, border: `1px solid ${c.border}` }}>
          <MessageActions msg={msg} currentUserId={currentUserId} c={c}
            onReply={onReply} onEdit={() => onSetEditContent(msg.content)}
            onDelete={onDelete} onReact={onReact} />
        </div>
      )}

      <div className="flex gap-3">
        <Avatar src={sender.avatar} name={name} size={10} c={c} />
        <div className="flex-1 min-w-0">
          {/* Reply indicator */}
          {msg.replyTo && (
            <div className="flex items-center gap-2 text-[11px] mb-1" style={{ color: c.textFaint }}>
              <span className="material-symbols-outlined text-sm" style={{ transform: 'scaleX(-1)' }}>reply</span>
              <span className="italic truncate">
                {msg.replyTo.sender?.displayName || msg.replyTo.sender?.username || 'someone'}:
                {' '}<span style={{ color: c.textMuted }}>{msg.replyTo.content?.slice(0, 60)}{msg.replyTo.content?.length > 60 ? '…' : ''}</span>
              </span>
            </div>
          )}

          {/* Author + time */}
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-bold text-sm" style={{ color: c.text }}>{name}</span>
            <span className="text-[10px]" style={{ color: c.textFaint }}>{time}</span>
            {msg.isEdited && !msg.isDeleted && (
              <span className="text-[10px] italic" style={{ color: c.textFaint }}>(edited)</span>
            )}
          </div>

          {/* Content or edit input */}
          {isEditing ? (
            <div className="mt-1 space-y-2">
              <textarea
                value={editContent}
                onChange={e => onSetEditContent(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEditSubmit(); }
                  if (e.key === 'Escape') onEditCancel();
                }}
                autoFocus
                rows={2}
                className="w-full rounded-xl px-4 py-2 text-sm resize-none focus:outline-none border"
                style={{ backgroundColor: c.inputBg, color: c.text, borderColor: c.accent }} />
              <div className="flex gap-2 text-xs">
                <button onClick={onEditSubmit}
                  className="px-3 py-1 rounded-full font-semibold"
                  style={{ backgroundColor: c.accent, color: c.accentText }}>Save</button>
                <button onClick={onEditCancel}
                  className="px-3 py-1 rounded-full font-semibold hover:opacity-70"
                  style={{ color: c.textMuted }}>Cancel</button>
                <span style={{ color: c.textFaint }}>• Enter to save, Esc to cancel</span>
              </div>
            </div>
          ) : msg.isDeleted ? (
            <p className="italic text-sm" style={{ color: c.textFaint }}>
              This message was deleted.
            </p>
          ) : (
            <p className="leading-relaxed text-[15px] break-words whitespace-pre-wrap"
              style={{ color: c.text }}>
              {msg.content}
            </p>
          )}

          {/* Reactions */}
          {!msg.isDeleted && msg.reactions?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {msg.reactions.map(r => {
                const reacted = r.users?.some(u =>
                  (u._id || u)?.toString() === currentUserId?.toString()
                );
                return (
                  <button key={r.emoji} onClick={() => onReact(r.emoji)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all hover:scale-105"
                    style={{
                      backgroundColor: reacted ? c.reactionActiveBg : c.reactionBg,
                      border: `1px solid ${reacted ? c.reactionActiveBorder : c.reactionBorder}`,
                      color: reacted ? c.accent : c.textMuted,
                    }}>
                    <span>{r.emoji}</span>
                    <span className="font-medium">{r.users?.length ?? 0}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Invite Modal ───────────────────────────────────────────────────────────────
function InviteModal({ server, currentUserId, c, onClose }) {
  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState(server.inviteCode || null);
  const [regenerating, setRegenerating] = useState(false);

  const canRegenerate = server.members?.some(m => {
    const mid = m.user?._id?.toString() || m.user?.toString();
    return mid === currentUserId?.toString() && (m.role === 'owner' || m.role === 'admin');
  });

  const link = inviteCode
    ? `${window.location.origin}/invite/${inviteCode}`
    : 'Generating link…';

  useEffect(() => {
    if (!inviteCode) {
      axios.post(`/api/servers/${server._id}/invite/regenerate`)
        .then(res => setInviteCode(res.data.data.inviteCode))
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await axios.post(`/api/servers/${server._id}/invite/regenerate`);
      setInviteCode(res.data.data.inviteCode);
    } catch (_) {}
    finally { setRegenerating(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: c.modalOverlay }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-8 shadow-2xl"
        style={{ backgroundColor: c.modalBg, border: `1px solid ${c.border}` }}
        onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-black mb-1" style={{ color: c.text }}>Invite People</h2>
        <p className="text-sm mb-5" style={{ color: c.textMuted }}>
          Share this link to invite friends to <strong>{server.name}</strong>.
        </p>
        <div className="flex gap-2 mb-4">
          <input readOnly value={link}
            className="flex-1 px-4 py-3 rounded-xl text-sm border focus:outline-none"
            style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }} />
          <button onClick={handleCopy} disabled={!inviteCode}
            className="px-4 py-3 rounded-xl font-bold text-sm flex-shrink-0 disabled:opacity-50"
            style={{ backgroundColor: c.accent, color: c.accentText }}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        {canRegenerate && (
          <button onClick={handleRegenerate} disabled={regenerating}
            className="text-xs flex items-center gap-1 hover:opacity-70 disabled:opacity-50"
            style={{ color: c.textFaint }}>
            <span className="material-symbols-outlined text-sm">refresh</span>
            {regenerating ? 'Regenerating…' : 'Generate new link'}
          </button>
        )}
        <div className="flex justify-end mt-6">
          <button onClick={onClose}
            className="px-5 py-2 rounded-full text-sm font-semibold hover:opacity-70"
            style={{ color: c.textMuted }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Create Server Modal ────────────────────────────────────────────────────────
function CreateServerModal({ c, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true); setErr('');
    try {
      const res = await axios.post('/api/servers', { name: name.trim() });
      onCreate(res.data.data.server);
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to create server');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: c.modalOverlay }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-8 shadow-2xl"
        style={{ backgroundColor: c.modalBg, border: `1px solid ${c.border}` }}
        onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-black mb-1" style={{ color: c.text }}>Create a Server</h2>
        <p className="text-sm mb-6" style={{ color: c.textMuted }}>
          Give your community a name and get chatting.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: c.textFaint }}>Server Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="My Awesome Server"
              autoFocus
              className="w-full px-5 py-3 rounded-full border focus:outline-none text-sm font-medium"
              style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }}
              onFocus={e => e.target.style.borderColor = c.accent}
              onBlur={e => e.target.style.borderColor = c.border} />
            {err && <p className="text-xs mt-1 ml-2" style={{ color: c.danger }}>{err}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={!name.trim() || loading}
              className="flex-1 py-3 rounded-full font-bold text-sm disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #ff8d87, #ff7670)', color: '#65000a' }}>
              {loading ? 'Creating…' : 'Create Server'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-3 rounded-full font-bold text-sm border hover:opacity-70"
              style={{ borderColor: c.border, color: c.textMuted }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Voice: attach remote stream to <audio> element ───────────────────────────
function PeerAudio({ stream, isDeafened }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline muted={isDeafened} />;
}

// ── Voice: prompt shown when viewing a voice channel but not yet joined ───────
function JoinVoicePrompt({ channel, c, onJoin, error }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5">
      <span className="material-symbols-outlined text-7xl" style={{ color: c.accent, opacity: 0.6 }}>
        volume_up
      </span>
      <div className="text-center">
        <h2 className="text-xl font-black mb-1" style={{ color: c.text }}>
          {channel.name}
        </h2>
        <p className="text-sm" style={{ color: c.textMuted }}>
          Voice channel — join to talk with others
        </p>
      </div>
      {error && (
        <p className="text-sm px-4 py-2 rounded-xl" style={{ color: c.danger, backgroundColor: `${c.danger}15` }}>
          {error}
        </p>
      )}
      <button onClick={onJoin}
        className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm"
        style={{ background: 'linear-gradient(135deg, #ff8d87, #ff7670)', color: '#65000a' }}>
        <span className="material-symbols-outlined text-base">call</span>
        Join Voice
      </button>
    </div>
  );
}

// ── Voice: active voice channel view ─────────────────────────────────────────
function VoiceChannelView({ channel, peers, localStream, isMuted, isDeafened, c, user, onLeave, onToggleMute, onToggleDeafen }) {
  const localVideoRef = useRef(null);
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const allParticipants = [
    { socketId: 'local', stream: localStream, user: { displayName: user?.displayName, username: user?.username, avatar: user?.avatar }, isLocal: true },
    ...Object.entries(peers).map(([socketId, info]) => ({ socketId, stream: info.stream, user: info.user, isLocal: false })),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Hidden audio elements for remote streams */}
      {Object.entries(peers).map(([socketId, info]) =>
        info.stream ? <PeerAudio key={socketId} stream={info.stream} isDeafened={isDeafened} /> : null
      )}

      {/* Channel name header */}
      <div className="flex items-center gap-2 px-6 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${c.border}` }}>
        <span className="material-symbols-outlined text-sm" style={{ color: c.accent }}>fiber_manual_record</span>
        <span className="text-sm font-bold" style={{ color: c.accent }}>Live — {channel.name}</span>
        <span className="text-xs ml-2" style={{ color: c.textFaint }}>{allParticipants.length} participant{allParticipants.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Participant grid */}
      <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'none' }}>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          {allParticipants.map(({ socketId, user: u, isLocal, stream: peerStream }) => {
            const name = u?.displayName || u?.username || (isLocal ? 'You' : 'User');
            const muted = isLocal && isMuted;
            return (
              <div key={socketId}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl"
                style={{ backgroundColor: c.inputBg, border: `1px solid ${c.border}` }}>
                {isLocal ? (
                  <div className="relative">
                    <audio ref={localVideoRef} muted autoPlay playsInline style={{ display: 'none' }} />
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black"
                      style={{ backgroundColor: `${c.accent}30`, color: c.accent }}>
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                    {muted && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: c.danger }}>
                        <span className="material-symbols-outlined text-white text-xs">mic_off</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black"
                      style={{ backgroundColor: `${c.accent}20`, color: c.accent }}>
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                    {!peerStream && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: c.border }}>
                        <span className="material-symbols-outlined text-xs" style={{ color: c.textFaint }}>hourglass_empty</span>
                      </div>
                    )}
                  </div>
                )}
                <span className="text-xs font-semibold truncate w-full text-center" style={{ color: c.text }}>
                  {isLocal ? `${name} (you)` : name}
                </span>
              </div>
            );
          })}
        </div>

        {allParticipants.length === 1 && (
          <p className="text-center text-sm mt-8" style={{ color: c.textFaint }}>
            Waiting for others to join…
          </p>
        )}
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-4 p-5 flex-shrink-0"
        style={{ borderTop: `1px solid ${c.border}`, backgroundColor: c.footerBg }}>
        <button onClick={onToggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: isMuted ? c.danger : c.inputBg, border: `1px solid ${c.border}` }}>
          <span className="material-symbols-outlined" style={{ color: isMuted ? '#fff' : c.textMuted }}>
            {isMuted ? 'mic_off' : 'mic'}
          </span>
        </button>
        <button onClick={onToggleDeafen}
          title={isDeafened ? 'Undeafen' : 'Deafen'}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: isDeafened ? c.danger : c.inputBg, border: `1px solid ${c.border}` }}>
          <span className="material-symbols-outlined" style={{ color: isDeafened ? '#fff' : c.textMuted }}>
            {isDeafened ? 'headset_off' : 'headphones'}
          </span>
        </button>
        <button onClick={onLeave}
          title="Leave voice"
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: c.danger }}>
          <span className="material-symbols-outlined text-white">call_end</span>
        </button>
      </div>
    </div>
  );
}

// ── Main chat layout ──────────────────────────────────────────────────────────
function ChatLayout({ isDark, onToggle }) {
  const c = isDark ? DARK : LIGHT;
  const navigate = useNavigate();
  const { user, accessToken, logout } = useAuth();
  const socketRef = useSocket(accessToken);
  const { inVoiceChannel, peers, localStream, isMuted, isDeafened, error: voiceError,
    joinVoice, leaveVoice, toggleMute, toggleDeafen } = useVoice(socketRef);

  // ── Data state ───────────────────────────────────────────────────────────
  const [servers, setServers] = useState([]);
  const [activeServer, setActiveServer] = useState(null);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [typing, setTyping] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newVoiceChannelName, setNewVoiceChannelName] = useState('');
  const [showCreateVoiceChannel, setShowCreateVoiceChannel] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // DM state
  const [dmMode, setDmMode] = useState(false);
  const [dms, setDms] = useState([]);
  const [dmSearch, setDmSearch] = useState('');
  const [dmSearchResults, setDmSearchResults] = useState([]);
  const [showNewDm, setShowNewDm] = useState(false);

  // Friends state
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addFriendInput, setAddFriendInput] = useState('');
  const [addFriendMsg, setAddFriendMsg] = useState(null);
  const [showFriendRequests, setShowFriendRequests] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  const typingTimeout = useRef(null);
  const prevChannelId = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesTopRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Permissions ───────────────────────────────────────────────────────────
  const myMember = activeServer?.members?.find(m => {
    const mid = m.user?._id?.toString() || m.user?.toString();
    return mid === user?._id?.toString();
  });
  const canManageChannels = myMember?.role === 'owner' || myMember?.role === 'admin';

  // ── Load friends + friend requests on mount ───────────────────────────────
  useEffect(() => {
    axios.get('/api/users/friends').then(r => setFriends(r.data.data.friends || [])).catch(() => {});
    axios.get('/api/users/friend-requests').then(r => setFriendRequests(r.data.data.friendRequests || [])).catch(() => {});
  }, []);

  // ── Load servers on mount ─────────────────────────────────────────────────
  useEffect(() => {
    axios.get('/api/servers')
      .then(res => {
        const list = res.data.data.servers || [];
        setServers(list);
        if (list.length > 0) setActiveServer(list[0]);
      })
      .catch(() => {});
  }, []);

  // ── Load channels when server changes ─────────────────────────────────────
  useEffect(() => {
    if (!activeServer) return;
    setChannels([]);
    setActiveChannel(null);
    setMessages([]);
    setShowCreateChannel(false);

    axios.get(`/api/channels/server/${activeServer._id}`)
      .then(res => {
        const list = res.data.data.channels || [];
        setChannels(list);
        const firstText = list.find(ch => ch.type === 'text');
        if (firstText) setActiveChannel(firstText);
      })
      .catch(() => {});

    socketRef.current?.emit('server:join', { serverId: activeServer._id });
    const mems = (activeServer.members || []).map(m => m.user).filter(Boolean);
    setMembers(mems);
  }, [activeServer]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load messages + join channel socket room ──────────────────────────────
  useEffect(() => {
    if (!activeChannel) return;
    if (activeChannel.type === 'voice') {
      setMessages([]);
      return;
    }
    const socket = socketRef.current;

    if (prevChannelId.current && prevChannelId.current !== activeChannel._id) {
      socket?.emit('chat:leave', { chatId: prevChannelId.current });
    }
    prevChannelId.current = activeChannel._id;
    socket?.emit('chat:join', { chatId: activeChannel._id });

    setLoadingMsgs(true);
    setMessages([]);
    setHasMore(false);
    setCursor(null);
    setReplyTo(null);
    setEditingId(null);

    const msgUrl = activeChannel.type === 'dm'
      ? `/api/messages/chat/${activeChannel._id}`
      : `/api/channels/${activeChannel._id}/messages`;

    axios.get(msgUrl)
      .then(res => {
        const { messages: msgs, hasMore: more, nextCursor } = res.data.data;
        setMessages(msgs || []);
        setHasMore(more || false);
        setCursor(nextCursor || null);
      })
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
  }, [activeChannel]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Socket event listeners ────────────────────────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onNew = ({ message: msg }) => {
      setMessages(prev => [...prev, msg]);
    };
    const onEdited = ({ messageId, content }) => {
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, content, isEdited: true } : m
      ));
    };
    const onDeleted = ({ messageId }) => {
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, isDeleted: true } : m
      ));
    };
    const onReaction = ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, reactions } : m
      ));
    };
    const onTypingStart = ({ userId: uid, username }) => {
      if (uid === user?._id?.toString()) return;
      setTyping(prev => prev.find(t => t.userId === uid) ? prev : [...prev, { userId: uid, username }]);
    };
    const onTypingStop = ({ userId: uid }) => {
      setTyping(prev => prev.filter(t => t.userId !== uid));
    };
    const onPresence = ({ userId: uid, status }) => {
      setMembers(prev => prev.map(m =>
        (m._id?.toString() === uid) ? { ...m, status } : m
      ));
    };

    const onFriendRequest = ({ from }) => {
      setFriendRequests(prev => [...prev, { from, createdAt: new Date() }]);
    };
    const onFriendAccepted = ({ user: u }) => {
      if (!u) return;
      setFriends(prev => prev.find(f => f._id === u._id) ? prev : [...prev, u]);
      setFriendRequests(prev => prev.filter(r => r.from._id !== u._id));
    };

    socket.on('message:new', onNew);
    socket.on('message:edited', onEdited);
    socket.on('message:deleted', onDeleted);
    socket.on('message:reaction', onReaction);
    socket.on('message:typing', onTypingStart);
    socket.on('message:stop_typing', onTypingStop);
    socket.on('presence:update', ({ userId, status }) => onPresence({ userId, status }));
    socket.on('friend:request', onFriendRequest);
    socket.on('friend:accepted', onFriendAccepted);

    return () => {
      socket.off('message:new', onNew);
      socket.off('message:edited', onEdited);
      socket.off('message:deleted', onDeleted);
      socket.off('message:reaction', onReaction);
      socket.off('message:typing', onTypingStart);
      socket.off('message:stop_typing', onTypingStop);
      socket.off('presence:update');
      socket.off('friend:request', onFriendRequest);
      socket.off('friend:accepted', onFriendAccepted);
    };
  }, [socketRef.current]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Load more on scroll to top ────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el || !hasMore || loadingMore || !cursor || !activeChannel) return;
    if (el.scrollTop < 100) {
      const prevHeight = el.scrollHeight;
      setLoadingMore(true);
      const loadMoreUrl = activeChannel.type === 'dm'
        ? `/api/messages/chat/${activeChannel._id}?before=${cursor}`
        : `/api/channels/${activeChannel._id}/messages?before=${cursor}`;
      axios.get(loadMoreUrl)
        .then(res => {
          const { messages: older, hasMore: more, nextCursor } = res.data.data;
          setMessages(prev => [...(older || []), ...prev]);
          setHasMore(more || false);
          setCursor(nextCursor || null);
          // Keep scroll position
          requestAnimationFrame(() => {
            if (el) el.scrollTop = el.scrollHeight - prevHeight;
          });
        })
        .catch(() => {})
        .finally(() => setLoadingMore(false));
    }
  }, [hasMore, loadingMore, cursor, activeChannel]);

  // ── DM: load list ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dmMode) return;
    axios.get('/api/chats').then(res => setDms(res.data.data.chats || [])).catch(() => {});
  }, [dmMode]);

  // ── DM: user search ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!dmSearch.trim() || dmSearch.length < 2) { setDmSearchResults([]); return; }
    const t = setTimeout(() => {
      axios.get(`/api/users/search?q=${encodeURIComponent(dmSearch)}`)
        .then(res => setDmSearchResults(res.data.data.users || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [dmSearch]);

  // ── DM: open or create a DM conversation ─────────────────────────────────
  const openDm = useCallback(async (userId) => {
    try {
      const res = await axios.get(`/api/chats/private/${userId}`);
      const chat = res.data.data.chat;
      const other = chat.participants.find(p => (p._id || p).toString() !== user?._id?.toString());
      // Re-use activeChannel slot with type 'dm' so existing message logic works unchanged
      setActiveChannel({ _id: chat._id, name: other?.displayName || other?.username || 'DM', type: 'dm', _dmUser: other });
      setDms(prev => prev.find(d => d._id === chat._id) ? prev : [chat, ...prev]);
      setDmSearch('');
      setDmSearchResults([]);
      setShowNewDm(false);
    } catch (_) {}
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Upload file attachment ───────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/api/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAttachments(prev => [...prev, res.data.data]);
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.message || 'Unknown error'));
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    const content = message.trim();
    if (!content && !attachments.length || !activeChannel || !socketRef.current) return;

    socketRef.current.emit('message:send', {
      chatId: activeChannel._id,
      content,
      attachments: attachments.length > 0 ? attachments : undefined,
      replyTo: replyTo?._id || undefined,
    });
    setMessage('');
    setAttachments([]);
    setReplyTo(null);
    setShowEmojiPicker(false);
    socketRef.current.emit('message:stop_typing', { chatId: activeChannel._id });
    clearTimeout(typingTimeout.current);
  }, [message, attachments, activeChannel, replyTo, socketRef]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (!activeChannel || !socketRef.current) return;
    socketRef.current.emit('message:typing', { chatId: activeChannel._id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit('message:stop_typing', { chatId: activeChannel._id });
    }, 2000);
  };

  // ── Message actions ───────────────────────────────────────────────────────
  const handleEditSubmit = useCallback(() => {
    if (!editingId || !editContent.trim() || !socketRef.current) return;
    socketRef.current.emit('message:edit', { messageId: editingId, content: editContent.trim() });
    setEditingId(null);
    setEditContent('');
  }, [editingId, editContent, socketRef]);

  const handleDelete = useCallback((messageId) => {
    if (!socketRef.current) return;
    socketRef.current.emit('message:delete', { messageId });
  }, [socketRef]);

  const handleReact = useCallback((messageId, emoji) => {
    if (!socketRef.current) return;
    socketRef.current.emit('message:react', { messageId, emoji });
  }, [socketRef]);

  const startEdit = useCallback((msg) => {
    setEditingId(msg._id);
    setEditContent(msg.content);
    setReplyTo(null);
  }, []);

  const startReply = useCallback((msg) => {
    setReplyTo(msg);
    setEditingId(null);
    inputRef.current?.focus();
  }, []);

  // ── Create channel ────────────────────────────────────────────────────────
  const handleCreateChannel = async (e) => {
    e.preventDefault();
    const name = newChannelName.trim().toLowerCase().replace(/\s+/g, '-');
    if (!name || !activeServer) return;
    try {
      const res = await axios.post(`/api/channels/server/${activeServer._id}`, { name });
      const ch = res.data.data.channel;
      setChannels(prev => [...prev, ch]);
      setActiveChannel(ch);
      setNewChannelName('');
      setShowCreateChannel(false);
    } catch (e) {
      // show nothing — backend error is minor
    }
  };

  const handleCreateVoiceChannel = async (e) => {
    e.preventDefault();
    const name = newVoiceChannelName.trim().toLowerCase().replace(/\s+/g, '-');
    if (!name || !activeServer) return;
    try {
      const res = await axios.post(`/api/channels/server/${activeServer._id}`, { name, type: 'voice' });
      const ch = res.data.data.channel;
      setChannels(prev => [...prev, ch]);
      setActiveChannel(ch);
      setNewVoiceChannelName('');
      setShowCreateVoiceChannel(false);
    } catch (_) {}
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    socketRef.current?.disconnect();
    await logout();
    navigate('/login');
  };

  // ── Friend actions ────────────────────────────────────────────────────────
  const sendFriendRequest = async () => {
    const username = addFriendInput.trim();
    if (!username) return;
    setAddFriendMsg(null);
    try {
      const res = await axios.get(`/api/users/search?q=${encodeURIComponent(username)}`);
      const found = (res.data.data.users || []).find(u => u.username === username);
      if (!found) { setAddFriendMsg({ type: 'err', text: 'User not found' }); return; }
      await axios.post(`/api/users/${found._id}/friend-request`);
      setAddFriendMsg({ type: 'ok', text: `Request sent to @${username}` });
      setAddFriendInput('');
    } catch (e) {
      setAddFriendMsg({ type: 'err', text: e.response?.data?.message || 'Failed to send request' });
    }
  };

  const acceptFriendRequest = async (requesterId) => {
    try {
      const res = await axios.post(`/api/users/friend-request/${requesterId}/accept`);
      setFriendRequests(prev => prev.filter(r => r.from._id !== requesterId));
      // Optimistically add to friends list from the request object
      const req_ = friendRequests.find(r => r.from._id === requesterId);
      if (req_) setFriends(prev => prev.find(f => f._id === requesterId) ? prev : [...prev, req_.from]);
    } catch (_) {}
  };

  const declineFriendRequest = async (requesterId) => {
    try {
      await axios.delete(`/api/users/friend-request/${requesterId}`);
      setFriendRequests(prev => prev.filter(r => r.from._id !== requesterId));
    } catch (_) {}
  };

  // ── Group messages by date ────────────────────────────────────────────────
  const groupedMessages = messages.reduce((acc, msg) => {
    const key = formatDate(msg.createdAt);
    if (!acc[key]) acc[key] = [];
    acc[key].push(msg);
    return acc;
  }, {});

  const textChannels = channels.filter(ch => ch.type === 'text' || ch.type === 'announcement');
  const voiceChannels = channels.filter(ch => ch.type === 'voice');
  const onlineMembers = members.filter(m => m.status === 'online');
  const offlineMembers = members.filter(m => m.status !== 'online');

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: c.main }}>

      {/* ── Invite Modal ── */}
      {showInviteModal && activeServer && (
        <InviteModal server={activeServer} currentUserId={user?._id} c={c}
          onClose={() => setShowInviteModal(false)} />
      )}

      {/* ── Create Server Modal ── */}
      {showCreateServer && (
        <CreateServerModal c={c} onClose={() => setShowCreateServer(false)}
          onCreate={(srv) => {
            setServers(prev => [...prev, srv]);
            setActiveServer(srv);
          }} />
      )}

      {/* ── Server Rail ── */}
      <nav className="hidden lg:flex fixed left-0 top-0 h-full z-50 w-[72px] flex-col items-center py-4 gap-2"
        style={{ backgroundColor: c.rail, borderRight: `1px solid ${c.border}` }}>

        <div className="relative mb-1">
          <div className="w-12 h-12 flex items-center justify-center rounded-[16px] shadow-lg"
            style={{ background: 'linear-gradient(135deg, #ff8d87, #ff7670)' }}>
            <span className="material-symbols-outlined"
              style={{ color: '#65000a', fontVariationSettings: "'FILL' 1" }}>flare</span>
          </div>
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
            style={{ backgroundColor: c.accent }} />
        </div>

        <div className="w-8 h-[1px] rounded-full my-1" style={{ backgroundColor: c.border }} />

        {/* DM button */}
        <ServerRailBtn icon="chat" label="Direct Messages" active={dmMode} c={c}
          onClick={() => { setDmMode(v => !v); setActiveChannel(null); }} />

        <div className="flex flex-col gap-2 flex-1 overflow-y-auto w-full items-center"
          style={{ scrollbarWidth: 'none' }}>
          {servers.map(s => (
            <div key={s._id} className="relative w-full flex justify-center">
              <ServerRailBtn label={s.name} active={!dmMode && activeServer?._id === s._id}
                c={c} onClick={() => { setDmMode(false); setActiveServer(s); }} />
              {activeServer?._id === s._id && (
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                  style={{ backgroundColor: c.accent }} />
              )}
            </div>
          ))}
          <ServerRailBtn icon="add" label="Create server" c={c}
            onClick={() => setShowCreateServer(true)} />
        </div>

        <div className="flex flex-col items-center gap-2 mt-auto">
          <ThemeToggle isDark={isDark} onToggle={onToggle} />
          <ServerRailBtn icon="settings" label="Settings" c={c} onClick={() => navigate('/settings')} />
          <ServerRailBtn icon="logout" label="Logout" c={c} onClick={handleLogout} />
          <Avatar src={user?.avatar} name={user?.displayName || user?.username} size={12} c={c} />
        </div>
      </nav>

      {/* ── Channel Sidebar ── */}
      <aside className="hidden lg:flex fixed left-[72px] top-0 h-full z-40 w-[260px] flex-col"
        style={{ backgroundColor: c.sidebar, borderRight: `1px solid ${c.border}` }}>
        <header className="h-16 flex items-center px-4 flex-shrink-0 gap-2"
          style={{ borderBottom: `1px solid ${c.border}` }}>
          <h2 className="font-bold text-lg flex-1 truncate"
            style={{ color: c.text, fontFamily: 'Plus Jakarta Sans' }}>
            {dmMode ? 'Direct Messages' : (activeServer?.name || 'Select a server')}
          </h2>
          {!dmMode && activeServer && (
            <button onClick={() => setShowInviteModal(true)} title="Invite People"
              className="flex-shrink-0 hover:opacity-70 transition-opacity"
              style={{ color: c.textMuted }}>
              <span className="material-symbols-outlined text-xl">person_add</span>
            </button>
          )}
        </header>

        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-full"
            style={{ backgroundColor: c.inputBg, border: `1px solid ${c.border}` }}>
            <span className="material-symbols-outlined text-sm" style={{ color: c.textFaint }}>search</span>
            <input type="text" placeholder="Search channels"
              className="bg-transparent border-none text-sm w-full focus:ring-0 focus:outline-none placeholder:opacity-50"
              style={{ color: c.text }} />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2" style={{ scrollbarWidth: 'none' }}>

          {/* ── DM mode ── */}
          {dmMode && (
            <>
              {/* ── Friends section ── */}
              <div className="flex items-center justify-between px-2 py-2">
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: c.textFaint }}>
                  Friends{friends.filter(f => f.status === 'online').length > 0 && ` — ${friends.filter(f => f.status === 'online').length} online`}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setShowFriendRequests(v => !v); setShowAddFriend(false); }}
                    title="Friend requests"
                    className="relative hover:opacity-70 transition-opacity"
                    style={{ color: c.textFaint }}>
                    <span className="material-symbols-outlined text-base">notifications</span>
                    {friendRequests.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
                        style={{ backgroundColor: c.accent, color: c.accentText }}>
                        {friendRequests.length}
                      </span>
                    )}
                  </button>
                  <button onClick={() => { setShowAddFriend(v => !v); setShowFriendRequests(false); setAddFriendMsg(null); }}
                    title="Add friend"
                    className="hover:opacity-70 transition-opacity"
                    style={{ color: c.textFaint }}>
                    <span className="material-symbols-outlined text-base">person_add</span>
                  </button>
                </div>
              </div>

              {/* Add friend input */}
              {showAddFriend && (
                <div className="px-1 pb-2">
                  <div className="flex gap-1">
                    <input value={addFriendInput} onChange={e => { setAddFriendInput(e.target.value); setAddFriendMsg(null); }}
                      placeholder="Username" autoFocus
                      className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none border"
                      style={{ backgroundColor: c.inputBg, color: c.text, borderColor: c.accent }}
                      onKeyDown={e => { if (e.key === 'Enter') sendFriendRequest(); if (e.key === 'Escape') setShowAddFriend(false); }} />
                    <button onClick={sendFriendRequest}
                      className="px-3 py-2 rounded-lg text-sm font-semibold"
                      style={{ backgroundColor: c.accent, color: c.accentText }}>Send</button>
                  </div>
                  {addFriendMsg && (
                    <p className="text-xs mt-1 ml-1" style={{ color: addFriendMsg.type === 'ok' ? c.authorHighlight : c.danger }}>
                      {addFriendMsg.text}
                    </p>
                  )}
                </div>
              )}

              {/* Pending requests */}
              {showFriendRequests && (
                <div className="px-1 pb-2">
                  {friendRequests.length === 0 ? (
                    <p className="px-2 py-2 text-xs" style={{ color: c.textFaint }}>No pending requests</p>
                  ) : friendRequests.map(r => (
                    <div key={r.from._id} className="flex items-center gap-2 px-2 py-2 rounded-lg mb-1"
                      style={{ backgroundColor: c.inputBg }}>
                      <Avatar src={r.from.avatar} name={r.from.displayName || r.from.username} size={8} c={c} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: c.text }}>
                          {r.from.displayName || r.from.username}
                        </div>
                        <div className="text-[10px]" style={{ color: c.textFaint }}>@{r.from.username}</div>
                      </div>
                      <button onClick={() => acceptFriendRequest(r.from._id)} title="Accept"
                        className="hover:opacity-70" style={{ color: c.authorHighlight }}>
                        <span className="material-symbols-outlined text-base">check_circle</span>
                      </button>
                      <button onClick={() => declineFriendRequest(r.from._id)} title="Decline"
                        className="hover:opacity-70" style={{ color: c.danger }}>
                        <span className="material-symbols-outlined text-base">cancel</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Friends list */}
              {friends.length > 0 && (
                <div className="mb-2">
                  {[...friends].sort((a, b) => (b.status === 'online' ? 1 : 0) - (a.status === 'online' ? 1 : 0)).map(f => (
                    <button key={f._id} onClick={() => openDm(f._id)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:opacity-80 transition-opacity">
                      <div className="relative flex-shrink-0">
                        <Avatar src={f.avatar} name={f.displayName || f.username} size={8} c={c} />
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                          style={{ backgroundColor: f.status === 'online' ? c.statusOnline : c.statusOffline, borderColor: c.sidebar }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: c.text }}>
                          {f.displayName || f.username}
                        </div>
                        <div className="text-[10px]" style={{ color: c.textFaint }}>@{f.username}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between px-2 py-2 mt-1">
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: c.textFaint }}>Messages</span>
                <button onClick={() => setShowNewDm(v => !v)} title="New DM"
                  className="hover:opacity-70 transition-opacity"
                  style={{ color: c.textFaint }}>
                  <span className="material-symbols-outlined text-base">edit_square</span>
                </button>
              </div>

              {/* New DM search */}
              {showNewDm && (
                <div className="px-1 pb-2">
                  <input value={dmSearch} onChange={e => setDmSearch(e.target.value)}
                    placeholder="Search users…" autoFocus
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none border"
                    style={{ backgroundColor: c.inputBg, color: c.text, borderColor: c.accent }}
                    onKeyDown={e => e.key === 'Escape' && setShowNewDm(false)} />
                  {dmSearchResults.length > 0 && (
                    <div className="mt-1 rounded-lg overflow-hidden border"
                      style={{ backgroundColor: c.inputBg, borderColor: c.border }}>
                      {dmSearchResults.map(u => (
                        <button key={u._id}
                          onClick={() => openDm(u._id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:opacity-80 transition-opacity text-left">
                          <Avatar src={u.avatar} name={u.displayName || u.username} size={8} c={c} />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate" style={{ color: c.text }}>{u.displayName || u.username}</div>
                            <div className="text-[11px] truncate" style={{ color: c.textFaint }}>@{u.username}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {dmSearch.length >= 2 && dmSearchResults.length === 0 && (
                    <p className="text-xs px-2 mt-1" style={{ color: c.textFaint }}>No users found</p>
                  )}
                </div>
              )}

              {/* DM list */}
              {dms.map(dm => {
                const other = dm.participants?.find(p => (p._id || p).toString() !== user?._id?.toString());
                const name = other?.displayName || other?.username || 'DM';
                const isActive = activeChannel?._id === dm._id;
                const lastMsg = dm.lastMessage?.content;
                return (
                  <button key={dm._id}
                    onClick={() => openDm((other?._id || other)?.toString())}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors"
                    style={{ backgroundColor: isActive ? c.chActiveBg : 'transparent' }}>
                    <Avatar src={other?.avatar} name={name} size={8} c={c} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate"
                        style={{ color: isActive ? c.chActiveText : c.text }}>{name}</div>
                      {lastMsg && (
                        <div className="text-[11px] truncate" style={{ color: c.textFaint }}>
                          {lastMsg.slice(0, 40)}{lastMsg.length > 40 ? '…' : ''}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}

              {dms.length === 0 && !showNewDm && (
                <p className="px-3 py-3 text-sm" style={{ color: c.textFaint }}>
                  No messages yet. Click the pencil icon to start one.
                </p>
              )}
            </>
          )}

          {/* ── Server channel mode ── */}
          {!dmMode && <>
          {/* Text channels */}
          {(textChannels.length > 0 || canManageChannels) && (
            <div className="flex items-center justify-between px-2 py-2">
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: c.textFaint }}>
                Text Channels
              </span>
              {canManageChannels && (
                <button onClick={() => setShowCreateChannel(v => !v)}
                  className="hover:opacity-70 transition-opacity"
                  style={{ color: c.textFaint }}>
                  <span className="material-symbols-outlined text-base">add</span>
                </button>
              )}
            </div>
          )}

          {/* Create channel inline form */}
          {showCreateChannel && (
            <form onSubmit={handleCreateChannel} className="px-1 pb-2">
              <input value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
                placeholder="new-channel" autoFocus
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none border"
                style={{ backgroundColor: c.inputBg, color: c.text, borderColor: c.accent }}
                onKeyDown={e => e.key === 'Escape' && setShowCreateChannel(false)} />
              <div className="flex gap-2 mt-1 px-1">
                <button type="submit"
                  className="text-xs px-2 py-1 rounded font-semibold"
                  style={{ backgroundColor: c.accent, color: c.accentText }}>Create</button>
                <button type="button" onClick={() => setShowCreateChannel(false)}
                  className="text-xs px-2 py-1 rounded hover:opacity-70"
                  style={{ color: c.textFaint }}>Cancel</button>
              </div>
            </form>
          )}

          {textChannels.map(ch => (
            <ChannelLink key={ch._id} ch={ch} active={activeChannel?._id === ch._id}
              c={c} onClick={() => setActiveChannel(ch)} />
          ))}

          {/* Voice channels */}
          {(voiceChannels.length > 0 || canManageChannels) && (
            <div className="flex items-center justify-between px-2 pt-4 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: c.textFaint }}>
                Voice Channels
              </span>
              {canManageChannels && (
                <button onClick={() => setShowCreateVoiceChannel(v => !v)}
                  className="hover:opacity-70 transition-opacity"
                  style={{ color: c.textFaint }}>
                  <span className="material-symbols-outlined text-base">add</span>
                </button>
              )}
            </div>
          )}
          {showCreateVoiceChannel && (
            <form onSubmit={handleCreateVoiceChannel} className="px-1 pb-2">
              <input value={newVoiceChannelName} onChange={e => setNewVoiceChannelName(e.target.value)}
                placeholder="new-voice-channel" autoFocus
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none border"
                style={{ backgroundColor: c.inputBg, color: c.text, borderColor: c.accent }}
                onKeyDown={e => e.key === 'Escape' && setShowCreateVoiceChannel(false)} />
              <div className="flex gap-2 mt-1 px-1">
                <button type="submit"
                  className="text-xs px-2 py-1 rounded font-semibold"
                  style={{ backgroundColor: c.accent, color: c.accentText }}>Create</button>
                <button type="button" onClick={() => setShowCreateVoiceChannel(false)}
                  className="text-xs px-2 py-1 rounded hover:opacity-70"
                  style={{ color: c.textFaint }}>Cancel</button>
              </div>
            </form>
          )}
          {voiceChannels.map(ch => (
            <ChannelLink key={ch._id} ch={ch}
              active={activeChannel?._id === ch._id || inVoiceChannel === ch._id}
              c={c} onClick={() => { setActiveChannel(ch); joinVoice(ch._id); }} />
          ))}

          {channels.length === 0 && activeServer && (
            <p className="px-3 py-4 text-sm" style={{ color: c.textFaint }}>No channels yet</p>
          )}
          {!activeServer && (
            <p className="px-3 py-4 text-sm" style={{ color: c.textFaint }}>Select a server</p>
          )}
          </>}
        </nav>

        {/* User panel */}
        <div className="p-3 flex items-center gap-3 flex-shrink-0"
          style={{ backgroundColor: c.userPanelBg, borderTop: `1px solid ${c.border}` }}>
          <div className="relative flex-shrink-0">
            <Avatar src={user?.avatar} name={user?.displayName || user?.username} size={8} c={c} />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
              style={{ backgroundColor: c.statusOnline, borderColor: c.userPanelBg }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate" style={{ color: c.text }}>
              {user?.displayName || user?.username || 'You'}
            </div>
            <div className="text-xs" style={{ color: c.textFaint }}>Online</div>
          </div>
          <button onClick={inVoiceChannel ? toggleMute : undefined}
            className="hover:opacity-70 transition-opacity"
            title={isMuted ? 'Unmute' : 'Mute mic'}
            style={{ opacity: inVoiceChannel ? 1 : 0.3 }}>
            <span className="material-symbols-outlined text-sm"
              style={{ color: isMuted ? c.danger : c.textMuted }}>
              {isMuted ? 'mic_off' : 'mic'}
            </span>
          </button>
          <button onClick={inVoiceChannel ? toggleDeafen : undefined}
            className="hover:opacity-70 transition-opacity"
            title={isDeafened ? 'Undeafen' : 'Deafen'}
            style={{ opacity: inVoiceChannel ? 1 : 0.3 }}>
            <span className="material-symbols-outlined text-sm"
              style={{ color: isDeafened ? c.danger : c.textMuted }}>
              {isDeafened ? 'headset_off' : 'headphones'}
            </span>
          </button>
        </div>
      </aside>

      {/* ── Main Chat ── */}
      <main className="flex flex-col h-screen overflow-hidden"
        style={{
          marginLeft: window.innerWidth >= 1024 ? '332px' : '0',
          marginRight: (window.innerWidth >= 1024 && !dmMode) ? '240px' : '0',
          backgroundColor: c.main
        }}>

        {/* Header */}
        <header className="h-12 md:h-16 flex items-center justify-between px-3 md:px-6 flex-shrink-0"
          style={{ backgroundColor: c.headerBg, borderBottom: `1px solid ${c.border}` }}>
          <div className="flex items-center gap-3 min-w-0">
            {activeChannel?.type === 'dm'
              ? <Avatar src={activeChannel._dmUser?.avatar} name={activeChannel.name} size={8} c={c} />
              : <span className="material-symbols-outlined flex-shrink-0" style={{ color: c.textFaint }}>
                  {activeChannel?.type === 'voice' ? 'volume_up' : 'numbers'}
                </span>
            }
            <h1 className="font-bold text-base flex-shrink-0"
              style={{ color: c.text, fontFamily: 'Plus Jakarta Sans' }}>
              {activeChannel?.type === 'dm'
                ? activeChannel.name
                : (activeChannel?.name || 'Select a channel')}
            </h1>
            {activeChannel?.topic && activeChannel.type !== 'dm' && (
              <>
                <div className="h-4 w-[1px] mx-1 flex-shrink-0" style={{ backgroundColor: c.border }} />
                <span className="text-sm truncate" style={{ color: c.textFaint }}>{activeChannel.topic}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
              style={{ backgroundColor: c.inputBg, borderColor: c.border }}>
              <input type="text" placeholder="Search"
                className="bg-transparent border-none text-sm w-24 focus:ring-0 focus:outline-none"
                style={{ color: c.text }} />
              <span className="material-symbols-outlined text-sm" style={{ color: c.textFaint }}>search</span>
            </div>
            {['notifications', 'push_pin', 'help'].map(icon => (
              <button key={icon} className="hover:opacity-70 transition-opacity">
                <span className="material-symbols-outlined" style={{ color: c.textMuted }}>{icon}</span>
              </button>
            ))}
          </div>
        </header>

        {/* ── Voice channel view OR text/DM messages + input ── */}
        {activeChannel?.type === 'voice' ? (
          inVoiceChannel === activeChannel._id ? (
            <VoiceChannelView
              channel={activeChannel}
              peers={peers}
              localStream={localStream}
              isMuted={isMuted}
              isDeafened={isDeafened}
              c={c}
              user={user}
              onLeave={leaveVoice}
              onToggleMute={toggleMute}
              onToggleDeafen={toggleDeafen}
            />
          ) : (
            <JoinVoicePrompt
              channel={activeChannel}
              c={c}
              error={voiceError}
              onJoin={() => joinVoice(activeChannel._id)}
            />
          )
        ) : (
          <>
            {/* Messages container */}
            <div ref={messagesContainerRef} onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-3 md:px-6 pt-4 pb-2"
              style={{ scrollbarWidth: 'none' }}>

              {loadingMore && (
                <div className="flex justify-center py-3">
                  <span className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: `${c.accent} transparent transparent transparent` }} />
                </div>
              )}

              {loadingMsgs && (
                <div className="flex justify-center py-12">
                  <span className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: `${c.accent} transparent transparent transparent` }} />
                </div>
              )}

              {!loadingMsgs && !activeChannel && (
                <div className="flex flex-col items-center justify-center h-full gap-4" style={{ opacity: 0.4 }}>
                  <span className="material-symbols-outlined text-6xl" style={{ color: c.accent }}>forum</span>
                  <p className="font-bold text-lg" style={{ color: c.text }}>Select a channel to start chatting</p>
                </div>
              )}

              {!loadingMsgs && activeChannel && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3" style={{ opacity: 0.4 }}>
                  <span className="material-symbols-outlined text-5xl" style={{ color: c.accent }}>
                    {activeChannel.type === 'dm' ? 'chat' : 'chat_bubble'}
                  </span>
                  <p className="font-bold" style={{ color: c.text }}>
                    {activeChannel.type === 'dm'
                      ? `Start a conversation with ${activeChannel.name}`
                      : `No messages yet in #${activeChannel.name}`}
                  </p>
                  <p className="text-sm" style={{ color: c.textMuted }}>Be the first to say something!</p>
                </div>
              )}

              {Object.entries(groupedMessages).map(([date, msgs]) => (
                <div key={date}>
                  <div className="flex items-center gap-4 py-4">
                    <div className="flex-1 h-[1px]" style={{ backgroundColor: c.divider }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full flex-shrink-0"
                      style={{ backgroundColor: c.dateBadgeBg, color: c.textFaint }}>{date}</span>
                    <div className="flex-1 h-[1px]" style={{ backgroundColor: c.divider }} />
                  </div>
                  <div className="space-y-0.5">
                    {msgs.map(msg => (
                      <MessageRow key={msg._id} msg={msg}
                        currentUserId={user?._id} currentUser={user} c={c}
                        isEditing={editingId === msg._id}
                        editContent={editContent}
                        onSetEditContent={(val) => {
                          if (editingId !== msg._id) setEditingId(msg._id);
                          setEditContent(val);
                        }}
                        onEditSubmit={handleEditSubmit}
                        onEditCancel={() => { setEditingId(null); setEditContent(''); }}
                        onReply={() => startReply(msg)}
                        onDelete={() => handleDelete(msg._id)}
                        onReact={(emoji) => handleReact(msg._id, emoji)} />
                    ))}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {typing.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 text-sm italic"
                  style={{ color: c.textFaint }}>
                  <span className="flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce inline-block"
                        style={{ backgroundColor: c.textFaint, animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                  <span>{typing.map(t => t.username).join(', ')} {typing.length === 1 ? 'is' : 'are'} typing…</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Input area ── */}
            <footer className="flex-shrink-0 px-3 md:px-5 pb-3 md:pb-5 pt-2"
              style={{ backgroundColor: c.footerBg }}>

              {/* Reply preview */}
              {replyTo && (
                <div className="flex items-center gap-3 px-4 py-2 mb-2 rounded-xl"
                  style={{ backgroundColor: c.replyBg, border: `1px solid ${c.border}` }}>
                  <span className="material-symbols-outlined text-sm" style={{ color: c.accent }}>reply</span>
                  <span className="text-xs flex-1 truncate" style={{ color: c.textMuted }}>
                    Replying to <strong style={{ color: c.text }}>
                      {replyTo.sender?.displayName || replyTo.sender?.username}
                    </strong>
                    {' '}— {replyTo.content?.slice(0, 60)}{replyTo.content?.length > 60 ? '…' : ''}
                  </span>
                  <button onClick={() => setReplyTo(null)}
                    className="hover:opacity-70 transition-opacity flex-shrink-0"
                    style={{ color: c.textFaint }}>
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}

              {/* Emoji picker */}
              {showEmojiPicker && (
                <div className="mb-2" style={{ position: 'relative', zIndex: 50 }}>
                  <EmojiPicker
                    theme={isDark ? 'dark' : 'light'}
                    onEmojiClick={(emojiData) => {
                      setMessage(prev => prev + emojiData.emoji);
                      setShowEmojiPicker(false);
                      inputRef.current?.focus();
                    }}
                    height={Math.min(350, window.innerHeight * 0.4)}
                    width="100%"
                    searchDisabled={false}
                  />
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {/* Input row */}
              <div className="relative flex items-center border rounded-2xl overflow-hidden"
                style={{ backgroundColor: c.inputBg, borderColor: c.border }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="px-4 py-4 hover:opacity-70 disabled:opacity-50 transition-opacity flex-shrink-0"
                  style={{ color: c.textMuted }}>
                  <span className="material-symbols-outlined">add_circle</span>
                </button>

                <input ref={inputRef} type="text" value={message}
                  onChange={handleTyping} onKeyDown={handleKeyDown}
                  placeholder={activeChannel
                    ? (activeChannel.type === 'dm' ? `Message ${activeChannel.name}` : `Message #${activeChannel.name}`)
                    : (dmMode ? 'Select a conversation' : 'Select a channel first')}
                  disabled={!activeChannel}
                  className="flex-1 bg-transparent border-none py-4 text-sm font-medium focus:outline-none disabled:opacity-50"
                  style={{ color: c.text }}
                  onFocus={() => setShowEmojiPicker(false)} />

                <div className="flex items-center gap-2 px-3 flex-shrink-0">
                  <button className="hover:opacity-70 transition-opacity" title="GIF"
                    style={{ color: c.textMuted }}>
                    <span className="material-symbols-outlined">gif_box</span>
                  </button>
                  <button className="hover:opacity-70 transition-opacity" title="Sticker"
                    style={{ color: c.textMuted }}>
                    <span className="material-symbols-outlined">sticky_note_2</span>
                  </button>
                  <button
                    onClick={() => setShowEmojiPicker(v => !v)}
                    className="hover:opacity-70 transition-opacity" title="Emoji"
                    style={{ color: showEmojiPicker ? c.accent : c.textMuted }}>
                    <span className="material-symbols-outlined">mood</span>
                  </button>
                  <button onClick={sendMessage} disabled={!message.trim() || !activeChannel}
                    className="hover:opacity-70 transition-opacity disabled:opacity-30 ml-1"
                    style={{ color: c.accent }}>
                    <span className="material-symbols-outlined">send</span>
                  </button>
                </div>
              </div>
            </footer>
          </>
        )}
      </main>

      {/* ── Members Sidebar ── */}
      {!dmMode && <aside className="hidden lg:flex fixed right-0 top-0 h-full w-[240px] z-40 flex-col overflow-y-auto"
        style={{ backgroundColor: c.sidebar, borderLeft: `1px solid ${c.border}`, scrollbarWidth: 'none' }}>
        <header className="h-16 flex items-center px-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${c.border}` }}>
          <span className="material-symbols-outlined text-lg mr-2" style={{ color: c.textMuted }}>people</span>
          <span className="font-bold text-[11px] uppercase tracking-widest" style={{ color: c.textMuted }}>
            Members — {members.length}
          </span>
        </header>
        <div className="px-3 py-2">
          {onlineMembers.length > 0 && (
            <>
              <div className="px-2 py-3 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: c.textFaint }}>
                Online — {onlineMembers.length}
              </div>
              {onlineMembers.map(m => {
                const isSelf = m._id?.toString() === user?._id?.toString();
                const isFriend = friends.some(f => f._id?.toString() === m._id?.toString());
                return (
                  <div key={m._id}
                    onClick={() => { if (!isSelf) { setDmMode(true); openDm(m._id); } }}
                    className="group flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="relative flex-shrink-0">
                      <Avatar src={m.avatar} name={m.displayName || m.username} size={8} c={c} />
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                        style={{ backgroundColor: c.statusOnline, borderColor: c.sidebar }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate" style={{ color: c.text }}>
                        {m.displayName || m.username}
                      </div>
                      {m.customStatus && (
                        <div className="text-[10px] truncate" style={{ color: c.textFaint }}>{m.customStatus}</div>
                      )}
                    </div>
                    {!isSelf && !isFriend && (
                      <button onClick={e => { e.stopPropagation(); setDmMode(true); setShowAddFriend(true); setAddFriendInput(m.username); }}
                        title="Add friend"
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                        style={{ color: c.textFaint }}>
                        <span className="material-symbols-outlined text-base">person_add</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}
          {offlineMembers.length > 0 && (
            <>
              <div className="px-2 pt-5 pb-3 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: c.textFaint }}>
                Offline — {offlineMembers.length}
              </div>
              {offlineMembers.map(m => {
                const isSelf = m._id?.toString() === user?._id?.toString();
                const isFriend = friends.some(f => f._id?.toString() === m._id?.toString());
                return (
                  <div key={m._id}
                    onClick={() => { if (!isSelf) { setDmMode(true); openDm(m._id); } }}
                    className="group flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-opacity"
                    style={{ opacity: 0.5 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}>
                    <div className="relative flex-shrink-0" style={{ filter: 'grayscale(1)' }}>
                      <Avatar src={m.avatar} name={m.displayName || m.username} size={8} c={c} />
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                        style={{ backgroundColor: c.statusOffline, borderColor: c.sidebar }} />
                    </div>
                    <div className="flex-1 text-sm font-medium truncate" style={{ color: c.textMuted }}>
                      {m.displayName || m.username}
                    </div>
                    {!isSelf && !isFriend && (
                      <button onClick={e => { e.stopPropagation(); setDmMode(true); setShowAddFriend(true); setAddFriendInput(m.username); }}
                        title="Add friend"
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                        style={{ color: c.textFaint }}>
                        <span className="material-symbols-outlined text-base">person_add</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}
          {members.length === 0 && (
            <p className="px-2 py-4 text-xs" style={{ color: c.textFaint }}>No members loaded</p>
          )}
        </div>
      </aside>}
    </div>
  );
}

// ── Page with theme reveal ────────────────────────────────────────────────────
export default function Home() {
  const [isDark, setIsDark] = useState(getInitialTheme);
  const [reveal, setReveal] = useState(null);
  const hasAnimated = useRef(false);

  const handleToggle = (e) => {
    if (reveal) return;
    setReveal({ x: e.clientX, y: e.clientY });
  };

  const onRevealEnd = () => {
    const next = !isDark;
    applyTheme(next);
    hasAnimated.current = true;
    setIsDark(next);
    setReveal(null);
  };

  return (
    <div className="relative overflow-hidden">
      <ChatLayout isDark={isDark} onToggle={handleToggle} />
      {reveal && (
        <div className="reveal-overlay"
          style={{ '--rx': `${reveal.x}px`, '--ry': `${reveal.y}px` }}
          onAnimationEnd={onRevealEnd}>
          <ChatLayout isDark={!isDark} onToggle={handleToggle} />
        </div>
      )}
    </div>
  );
}
