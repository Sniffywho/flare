# Flare — Development Progress

## Project
WhatsApp + Discord hybrid real-time chat app. React/Vite frontend (Vercel) + Node.js/Express backend (Render) + MongoDB + Socket.IO.

---

## Completed

### Server Invites Fix
- **Bug 1 — Login redirect loop**: `Invite.jsx` sends unauthenticated users to `/login?redirect=/invite/:code` but `Login.jsx` always navigated to `/` after login, discarding the invite. Fixed by importing `useSearchParams` and navigating to `searchParams.get('redirect') || '/'` after successful login.
- **Bug 2 — Vercel 404 on direct link**: Visiting `yourapp.vercel.app/invite/abc123` returned 404 (no static file). Added `frontend/vercel.json` with a catch-all SPA rewrite to `/index.html`.
- **Note**: Make sure `CLIENT_URL` in backend env on Render is set to the exact Vercel frontend URL (CORS only allows one origin).

### Voice Channels — Create & Join UI
- Backend already had voice channel support (`type: 'voice'` in Channel model, WebRTC signaling in socket handler, `useVoice.js` hook).
- **Missing**: No way to create voice channels from the UI. Channel creation form only sent `{ name }` defaulting to `'text'`.
- **Fixed**:
  - Added `showCreateVoiceChannel` + `newVoiceChannelName` state
  - Added `handleCreateVoiceChannel` that posts `{ name, type: 'voice' }` to `/api/channels/server/:id`
  - "Voice Channels" section now always shows (for owners/admins) even when empty
  - Added "+" button next to "Voice Channels" header with inline create form
  - Clicking a voice channel auto-joins it → shows `VoiceChannelView` (mute/deafen/leave controls)

---

## Architecture Notes
- Voice is P2P WebRTC via `simple-peer`. Backend only relays signals, no server-side audio.
- Socket events: `voice:join`, `voice:leave`, `voice:signal` (client→server); `voice:existing_users`, `voice:user_joined`, `voice:user_left`, `voice:signal` (server→client).
- Frontend axios `baseURL` is set to `VITE_SOCKET_URL` in `main.jsx` — must be set in Vercel env vars for production.

---

## Known / Not Yet Done
- Message search (UI input exists but no handler)
- Notifications / pin / help buttons in header are decorative
- No Docker setup — expects local MongoDB
- `CLIENT_URL` in backend only supports a single origin (no multi-origin CORS)
