import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getInitialTheme, applyTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';

// ── Theme palettes (same as Home) ────────────────────────────────────────────
const DARK = {
  rail: '#1a0106', sidebar: '#24020a', main: '#2c040f',
  border: 'rgba(107,57,66,0.35)', text: '#ffdde1', textMuted: '#db9aa4',
  textFaint: '#9f656f', accent: '#ff8d87', accentText: '#65000a',
  inputBg: '#350814', card: '#350814', cardHover: 'rgba(255,141,135,0.07)',
  divider: 'rgba(107,57,66,0.25)', danger: '#ff7351', dangerBg: 'rgba(255,115,81,0.1)',
  success: '#4ade80', navActive: 'rgba(255,141,135,0.15)', navActiveBorder: '#ff8d87',
  sectionHeaderBg: '#2c040f', badgeBg: '#350814',
};
const LIGHT = {
  rail: '#eceef4', sidebar: '#f2f3f9', main: '#ffffff',
  border: 'rgba(196,198,208,0.4)', text: '#1a2f4d', textMuted: '#485c7d',
  textFaint: '#637899', accent: '#ff8d87', accentText: '#65000a',
  inputBg: '#f2f3f9', card: '#f2f3f9', cardHover: 'rgba(0,0,0,0.03)',
  divider: 'rgba(196,198,208,0.35)', danger: '#e53935', dangerBg: 'rgba(229,57,53,0.08)',
  success: '#22c55e', navActive: 'rgba(255,141,135,0.12)', navActiveBorder: '#ff8d87',
  sectionHeaderBg: '#f8f9ff', badgeBg: '#eceef4',
};

// ── Preference keys ───────────────────────────────────────────────────────────
const PREF_KEYS = {
  compactMode: 'flare_compact_mode',
  fontSize: 'flare_font_size',
  notifDm: 'flare_notif_dm',
  notifMentions: 'flare_notif_mentions',
  notifAnnouncements: 'flare_notif_announcements',
};

function getPref(key, defaultVal) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return defaultVal;
    return JSON.parse(v);
  } catch { return defaultVal; }
}
function setPref(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// ── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ value, onChange, c }) {
  return (
    <button onClick={() => onChange(!value)}
      className="flex-shrink-0 w-12 h-7 rounded-full relative transition-colors duration-200 focus:outline-none"
      style={{ backgroundColor: value ? c.accent : c.inputBg, border: `1px solid ${value ? c.accent : c.border}` }}>
      <div className="absolute top-[3px] w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
        style={{ left: value ? 'calc(100% - 23px)' : '3px' }} />
    </button>
  );
}

// ── Avatar component ──────────────────────────────────────────────────────────
function Avatar({ src, name, size = 10, c }) {
  const [err, setErr] = useState(false);
  const initials = (name || '?').slice(0, 2).toUpperCase();
  const px = size === 8 ? 'w-8 h-8 text-xs' : size === 10 ? 'w-10 h-10 text-xs' : size === 12 ? 'w-12 h-12 text-sm' : 'w-16 h-16 text-base';
  if (!src || err) {
    return (
      <div className={`${px} rounded-full flex items-center justify-center font-black flex-shrink-0`}
        style={{ backgroundColor: `${c.accent}30`, color: c.accent }}>{initials}</div>
    );
  }
  return <img src={src} alt={name} onError={() => setErr(true)}
    className={`${px} rounded-full object-cover flex-shrink-0`} />;
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, action, c }) {
  return (
    <div className="flex items-end justify-between pb-4 mb-8"
      style={{ borderBottom: `1px solid ${c.divider}` }}>
      <h2 className="text-3xl font-extrabold" style={{ color: c.text, fontFamily: 'Plus Jakarta Sans' }}>{title}</h2>
      {action}
    </div>
  );
}

// ── My Account section ────────────────────────────────────────────────────────
function AccountSection({ c, user, onSaved }) {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setSaving(true); setErr('');
    try {
      const res = await axios.patch('/api/users/me', { displayName, bio });
      onSaved(res.data.data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <section id="my-account" className="space-y-8">
      <SectionHeader title="My Account" c={c} action={
        <button onClick={save} disabled={saving}
          className="px-6 py-2.5 rounded-full font-bold text-sm disabled:opacity-60 transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #ff8d87, #ff7670)', color: '#65000a',
            boxShadow: '0 4px 15px rgba(255,141,135,0.3)' }}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
      } />

      {err && <p className="text-sm px-1" style={{ color: c.danger }}>{err}</p>}

      <div className="flex flex-col md:flex-row gap-10">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 flex-shrink-0">
          <div className="relative group w-32 h-32 cursor-pointer">
            <Avatar src={user?.avatar} name={user?.displayName || user?.username} size={32} c={c} />
            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-2xl">edit</span>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: c.textFaint }}>
            Change Avatar
          </span>
        </div>

        {/* Fields */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-widest ml-1"
              style={{ color: c.textFaint }}>Display Name</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border text-sm font-medium focus:outline-none transition-colors"
              style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }}
              onFocus={e => e.target.style.borderColor = c.accent}
              onBlur={e => e.target.style.borderColor = c.border} />
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-widest ml-1"
              style={{ color: c.textFaint }}>Username</label>
            <input value={`@${user?.username || ''}`} readOnly
              className="w-full px-4 py-3.5 rounded-xl border text-sm font-medium focus:outline-none opacity-50 cursor-not-allowed"
              style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-widest ml-1"
              style={{ color: c.textFaint }}>Email</label>
            <input value={user?.email || ''} readOnly
              className="w-full px-4 py-3.5 rounded-xl border text-sm font-medium focus:outline-none opacity-50 cursor-not-allowed"
              style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-widest ml-1"
              style={{ color: c.textFaint }}>Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} maxLength={200}
              className="w-full px-4 py-3.5 rounded-xl border text-sm font-medium focus:outline-none transition-colors resize-none"
              style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }}
              onFocus={e => e.target.style.borderColor = c.accent}
              onBlur={e => e.target.style.borderColor = c.border}
              placeholder="Tell people a bit about yourself…" />
            <p className="text-[11px] text-right mr-1" style={{ color: c.textFaint }}>{bio.length}/200</p>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl p-6 space-y-4 mt-4"
        style={{ border: `1px solid ${c.border}`, backgroundColor: c.card }}>
        <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: c.textFaint }}>Account Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button className="px-5 py-2.5 rounded-full text-sm font-bold border transition-all hover:opacity-80"
            style={{ borderColor: c.border, color: c.textMuted }}>
            Change Password
          </button>
          <button className="px-5 py-2.5 rounded-full text-sm font-bold transition-all hover:opacity-80"
            style={{ backgroundColor: c.dangerBg, color: c.danger, border: `1px solid ${c.danger}30` }}>
            Delete Account
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Appearance section ────────────────────────────────────────────────────────
function AppearanceSection({ c, isDark, onToggleDark }) {
  const [compact, setCompact] = useState(() => getPref(PREF_KEYS.compactMode, false));
  const [fontSize, setFontSize] = useState(() => getPref(PREF_KEYS.fontSize, 16));

  const handleCompact = (v) => { setCompact(v); setPref(PREF_KEYS.compactMode, v); };
  const handleFontSize = (e) => {
    const v = Number(e.target.value);
    setFontSize(v);
    setPref(PREF_KEYS.fontSize, v);
  };

  const fontLabel = fontSize <= 12 ? 'Tiny' : fontSize <= 14 ? 'Small' : fontSize <= 16 ? 'Standard' : fontSize <= 18 ? 'Large' : 'Massive';
  const sliderPct = ((fontSize - 10) / (24 - 10)) * 100;

  return (
    <section id="appearance" className="space-y-8">
      <SectionHeader title="Appearance" c={c} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dark Mode */}
        <div className="flex items-center justify-between p-6 rounded-2xl"
          style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
          <div>
            <h3 className="font-bold text-sm mb-1" style={{ color: c.text }}>Dark Mode</h3>
            <p className="text-xs" style={{ color: c.textFaint }}>Deep immersion experience</p>
          </div>
          <Toggle value={isDark} onChange={onToggleDark} c={c} />
        </div>

        {/* Compact Mode */}
        <div className="flex items-center justify-between p-6 rounded-2xl"
          style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
          <div>
            <h3 className="font-bold text-sm mb-1" style={{ color: c.text }}>Compact Mode</h3>
            <p className="text-xs" style={{ color: c.textFaint }}>Minimize padding for dense view</p>
          </div>
          <Toggle value={compact} onChange={handleCompact} c={c} />
        </div>

        {/* Font Size */}
        <div className="md:col-span-2 p-8 rounded-2xl space-y-6"
          style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg mb-1" style={{ color: c.text }}>Chat Font Size</h3>
              <p className="text-xs" style={{ color: c.textFaint }}>Scale your reading experience</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold" style={{ color: c.accent, fontFamily: 'Plus Jakarta Sans' }}>
                {fontSize}px
              </span>
              <p className="text-xs font-bold" style={{ color: c.textFaint }}>{fontLabel}</p>
            </div>
          </div>

          <div className="relative w-full h-2 rounded-full" style={{ backgroundColor: c.inputBg }}>
            <div className="absolute top-0 left-0 h-full rounded-full"
              style={{ width: `${sliderPct}%`, background: 'linear-gradient(90deg, #ff8d87, #ff7670)' }} />
            <input type="range" min={10} max={24} value={fontSize} onChange={handleFontSize}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full shadow-lg pointer-events-none border-4"
              style={{ left: `calc(${sliderPct}% - 10px)`, backgroundColor: 'white', borderColor: c.accent }} />
          </div>

          <div className="flex justify-between px-1">
            {['Tiny', 'Standard', 'Large', 'Massive'].map(l => (
              <span key={l} className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: fontLabel === l ? c.accent : c.textFaint }}>{l}</span>
            ))}
          </div>

          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: c.inputBg }}>
            <p style={{ fontSize: `${fontSize}px`, color: c.text, lineHeight: '1.5' }}>
              Preview text — Flare makes chatting beautiful.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Notifications section ────────────────────────────────────────────────────
function NotificationsSection({ c }) {
  const [dm, setDm] = useState(() => getPref(PREF_KEYS.notifDm, true));
  const [mentions, setMentions] = useState(() => getPref(PREF_KEYS.notifMentions, true));
  const [announcements, setAnnouncements] = useState(() => getPref(PREF_KEYS.notifAnnouncements, false));

  const items = [
    {
      icon: 'chat', label: 'Direct Messages', desc: 'Alerts for private conversations',
      iconBg: 'rgba(255,141,135,0.15)', iconColor: '#ff8d87',
      value: dm, set: (v) => { setDm(v); setPref(PREF_KEYS.notifDm, v); },
    },
    {
      icon: 'alternate_email', label: 'Mentions & Roles', desc: 'Notify when tagged in a server',
      iconBg: 'rgba(74,222,128,0.15)', iconColor: '#4ade80',
      value: mentions, set: (v) => { setMentions(v); setPref(PREF_KEYS.notifMentions, v); },
    },
    {
      icon: 'campaign', label: 'Announcements', desc: 'Major updates from your servers',
      iconBg: 'rgba(251,191,36,0.15)', iconColor: '#fbbf24',
      value: announcements, set: (v) => { setAnnouncements(v); setPref(PREF_KEYS.notifAnnouncements, v); },
    },
  ];

  return (
    <section id="notifications" className="space-y-8">
      <SectionHeader title="Notifications" c={c} />
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.label}
            className="flex items-center justify-between p-5 rounded-2xl transition-colors"
            style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: item.iconBg }}>
                <span className="material-symbols-outlined text-xl" style={{ color: item.iconColor }}>{item.icon}</span>
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: c.text }}>{item.label}</p>
                <p className="text-xs mt-0.5" style={{ color: c.textFaint }}>{item.desc}</p>
              </div>
            </div>
            <Toggle value={item.value} onChange={item.set} c={c} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Privacy section ──────────────────────────────────────────────────────────
function PrivacySection({ c, userId }) {
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch current user with blocked list
  useEffect(() => {
    // Fetch populated blocked users via search isn't possible,
    // but we can try fetching the full profile
    axios.get('/api/users/me').then(res => {
      setBlocked(res.data.data.blockedUsers || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleUnblock = async (targetId) => {
    try {
      await axios.post(`/api/users/${targetId}/block`); // toggles
      setBlocked(prev => prev.filter(u => (u._id || u) !== targetId));
    } catch (_) {}
  };

  return (
    <section id="privacy" className="space-y-8">
      <SectionHeader title="Privacy" c={c} />

      {/* DM permissions */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${c.border}` }}>
        <div className="p-5" style={{ backgroundColor: c.sectionHeaderBg, borderBottom: `1px solid ${c.divider}` }}>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: c.textFaint }}>
            DM Permissions
          </h3>
        </div>
        {[
          { label: 'Allow DMs from server members', desc: 'Members of your servers can send you direct messages' },
          { label: 'Allow friend requests', desc: 'Other users can send you friend requests' },
        ].map(row => (
          <div key={row.label} className="flex items-center justify-between p-5"
            style={{ borderBottom: `1px solid ${c.divider}` }}>
            <div>
              <p className="font-bold text-sm" style={{ color: c.text }}>{row.label}</p>
              <p className="text-xs mt-0.5" style={{ color: c.textFaint }}>{row.desc}</p>
            </div>
            <Toggle value={true} onChange={() => {}} c={c} />
          </div>
        ))}
      </div>

      {/* Blocked users */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${c.border}` }}>
        <div className="p-5" style={{ backgroundColor: c.sectionHeaderBg, borderBottom: `1px solid ${c.divider}` }}>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: c.textFaint }}>
            Blocked Users
          </h3>
          <p className="text-xs mt-1" style={{ color: c.textFaint }}>
            Users who cannot message you or see your profile
          </p>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <span className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: `${c.accent} transparent transparent transparent` }} />
          </div>
        ) : blocked.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2" style={{ opacity: 0.5 }}>
            <span className="material-symbols-outlined text-4xl" style={{ color: c.textFaint }}>shield</span>
            <p className="text-sm font-bold" style={{ color: c.textMuted }}>No blocked users</p>
          </div>
        ) : blocked.map(u => {
          const name = u.displayName || u.username || 'Unknown';
          return (
            <div key={u._id || u} className="flex items-center justify-between p-5 group"
              style={{ borderBottom: `1px solid ${c.divider}` }}>
              <div className="flex items-center gap-4">
                <div style={{ filter: 'grayscale(1)', opacity: 0.6 }}>
                  <Avatar src={u.avatar} name={name} size={10} c={c} />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: c.text }}>{name}</p>
                  {u.username && <p className="text-xs" style={{ color: c.textFaint }}>@{u.username}</p>}
                </div>
              </div>
              <button onClick={() => handleUnblock(u._id || u)}
                className="px-4 py-1.5 rounded-full text-xs font-bold border transition-all hover:opacity-80"
                style={{ borderColor: c.border, color: c.textMuted }}>
                Unblock
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Nav item ──────────────────────────────────────────────────────────────────
function NavItem({ icon, label, active, c, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-all duration-150"
      style={{
        backgroundColor: active ? c.navActive : 'transparent',
        color: active ? c.accent : c.textMuted,
        borderLeft: active ? `3px solid ${c.accent}` : '3px solid transparent',
      }}>
      <span className="material-symbols-outlined text-[18px]"
        style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{icon}</span>
      {label}
    </button>
  );
}

// ── Main Settings page ────────────────────────────────────────────────────────
export default function Settings() {
  const [isDark, setIsDark] = useState(getInitialTheme);
  const navigate = useNavigate();
  const { user, setAuth, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('my-account');

  const sections = [
    { id: 'my-account', icon: 'person', label: 'My Account' },
    { id: 'appearance', icon: 'palette', label: 'Appearance' },
    { id: 'notifications', icon: 'notifications', label: 'Notifications' },
    { id: 'privacy', icon: 'lock', label: 'Privacy' },
  ];

  const c = isDark ? DARK : LIGHT;

  const handleToggleDark = () => {
    const next = !isDark;
    applyTheme(next);
    setIsDark(next);
  };

  const handleSaved = (updatedUser) => {
    // Update stored user in localStorage/context
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    const merged = { ...stored, ...updatedUser };
    localStorage.setItem('user', JSON.stringify(merged));
    setAuth(merged, localStorage.getItem('accessToken'), localStorage.getItem('refreshToken'));
  };

  const scrollTo = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: c.main }}>

      {/* ── Server Rail ── */}
      <nav className="fixed left-0 top-0 h-full z-50 w-[72px] flex flex-col items-center py-4 gap-3"
        style={{ backgroundColor: c.rail, borderRight: `1px solid ${c.border}` }}>

        {/* Logo */}
        <div className="w-12 h-12 flex items-center justify-center rounded-[16px] mb-1"
          style={{ background: 'linear-gradient(135deg, #ff8d87, #ff7670)' }}>
          <span className="material-symbols-outlined" style={{ color: '#65000a', fontVariationSettings: "'FILL' 1" }}>flare</span>
        </div>

        <div className="w-8 h-[1px] rounded-full" style={{ backgroundColor: c.border }} />

        {/* Back to chat */}
        <button onClick={() => navigate('/')} title="Back to Chat"
          className="w-12 h-12 flex items-center justify-center rounded-full transition-all duration-150 active:scale-90"
          style={{ backgroundColor: c.inputBg, color: c.textMuted, borderRadius: '9999px' }}
          onMouseEnter={e => { e.currentTarget.style.borderRadius = '16px'; e.currentTarget.style.backgroundColor = c.accent; e.currentTarget.style.color = c.accentText; }}
          onMouseLeave={e => { e.currentTarget.style.borderRadius = '9999px'; e.currentTarget.style.backgroundColor = c.inputBg; e.currentTarget.style.color = c.textMuted; }}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>

        <div className="mt-auto flex flex-col items-center gap-3">
          {/* Settings (active) */}
          <div className="relative w-12 h-12 flex items-center justify-center rounded-[16px]"
            style={{ background: 'linear-gradient(135deg, #ff8d87, #ff7670)' }}>
            <span className="material-symbols-outlined" style={{ color: '#65000a', fontVariationSettings: "'FILL' 1" }}>settings</span>
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
              style={{ backgroundColor: c.accent }} />
          </div>

          {/* Theme toggle */}
          <button onClick={handleToggleDark} title="Toggle theme"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:opacity-70 transition-opacity"
            style={{ color: c.textMuted }}>
            <span className="material-symbols-outlined text-xl">{isDark ? 'light_mode' : 'dark_mode'}</span>
          </button>

          {/* Logout */}
          <button onClick={handleLogout} title="Logout"
            className="w-12 h-12 flex items-center justify-center rounded-full transition-all duration-150 active:scale-90"
            style={{ backgroundColor: c.inputBg, color: c.danger, borderRadius: '9999px' }}
            onMouseEnter={e => { e.currentTarget.style.borderRadius = '16px'; }}
            onMouseLeave={e => { e.currentTarget.style.borderRadius = '9999px'; }}>
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </nav>

      {/* ── Settings Nav ── */}
      <aside className="fixed left-[72px] top-0 h-full w-[260px] z-40 flex flex-col"
        style={{ backgroundColor: c.sidebar, borderRight: `1px solid ${c.border}` }}>

        <header className="px-6 py-6 flex-shrink-0" style={{ borderBottom: `1px solid ${c.divider}` }}>
          <h1 className="font-extrabold text-xl" style={{ color: c.text, fontFamily: 'Plus Jakarta Sans' }}>Settings</h1>
          <p className="text-xs mt-1" style={{ color: c.textFaint }}>Manage your Flare experience</p>
        </header>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {sections.map(s => (
            <NavItem key={s.id} icon={s.icon} label={s.label}
              active={activeSection === s.id} c={c} onClick={() => scrollTo(s.id)} />
          ))}

          <div className="px-3 pt-5 pb-2 text-[10px] font-black uppercase tracking-widest"
            style={{ color: c.textFaint }}>App</div>

          <NavItem icon="language" label="Language" active={false} c={c} onClick={() => {}} />
          <NavItem icon="security" label="Connected Apps" active={false} c={c} onClick={() => {}} />
        </nav>

        {/* User footer */}
        <div className="p-3 m-2 rounded-2xl flex items-center gap-3"
          style={{ backgroundColor: isDark ? '#1e0107' : c.card, border: `1px solid ${c.border}` }}>
          <Avatar src={user?.avatar} name={user?.displayName || user?.username} size={10} c={c} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: c.text }}>
              {user?.displayName || user?.username}
            </p>
            <p className="text-xs truncate" style={{ color: c.textFaint }}>@{user?.username}</p>
          </div>
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: c.success }} />
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto"
        style={{ marginLeft: '332px', scrollbarWidth: 'none' }}
        onScroll={(e) => {
          // Update active section based on scroll position
          const el = e.target;
          for (const s of sections) {
            const sec = document.getElementById(s.id);
            if (sec) {
              const rect = sec.getBoundingClientRect();
              if (rect.top <= 120) setActiveSection(s.id);
            }
          }
        }}>

        <div className="max-w-3xl mx-auto px-10 py-12 space-y-20 pb-32">
          <AccountSection c={c} user={user} onSaved={handleSaved} />
          <AppearanceSection c={c} isDark={isDark} onToggleDark={handleToggleDark} />
          <NotificationsSection c={c} />
          <PrivacySection c={c} userId={user?._id} />
        </div>
      </main>
    </div>
  );
}
