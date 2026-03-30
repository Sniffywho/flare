# ChatApp — WhatsApp + Discord Hybrid

A modern, real-time chat application built with **React + Vite**, **Node.js/Express**, **MongoDB**, and **Socket.IO**.

---

## Features

| Category | Features |
|---|---|
| **Auth** | JWT access + refresh tokens, bcrypt hashing, profile setup |
| **Messaging** | Text, images, files; edit, delete, reply, reactions, pin |
| **Real-time** | Instant delivery, typing indicators, read receipts, online/offline presence |
| **Private chats** | WhatsApp-style DMs with unread counts and seen receipts |
| **Group chats** | Named groups, admin controls, add/remove members |
| **Servers** | Discord-style servers with multiple text/voice channels |
| **Channels** | Role-based access, slow mode, permission overrides |
| **Invites** | Shareable invite codes, regenerable at any time |
| **Voice** | WebRTC signaling relay for P2P voice/video calls |
| **Security** | Helmet, CORS, rate limiting, Mongo sanitisation, input validation |
| **Caching** | Optional Redis caching and pub/sub |

---

## Project Structure

```
ChatAppReactAndJava/
├── backend/
│   ├── src/
│   │   ├── config/          # db.js, redis.js
│   │   ├── controllers/     # authController, chatController, messageController,
│   │   │                    # serverController, channelController, userController
│   │   ├── middleware/       # auth.js, errorHandler.js, rateLimiter.js, validate.js
│   │   ├── models/          # User, Chat, Message, Server, Channel
│   │   ├── routes/          # auth, users, chats, messages, servers, channels
│   │   ├── socket/
│   │   │   ├── index.js     # Socket.IO init + auth middleware
│   │   │   └── handlers/    # presenceHandler, messageHandler, chatHandler
│   │   └── utils/           # logger, ApiError, generateToken, helpers
│   ├── server.js            # Entry point
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/                 # (UI to be built — React components, hooks, stores)
    ├── vite.config.js
    ├── tailwind.config.js
    ├── .env.example
    └── package.json
```

---

## Prerequisites

- **Node.js** ≥ 18
- **MongoDB** (local or [Atlas](https://www.mongodb.com/atlas))
- **Redis** (optional — for caching/pub-sub)
- **npm** or **yarn**

---

## Quick Start

### 1. Clone / open the project

```bash
cd ChatAppReactAndJava
```

### 2. Set up the backend

```bash
cd backend

# Install dependencies
npm install

# Copy example env and fill in your values
cp .env.example .env
# Edit .env — at minimum set MONGO_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
```

**Generate JWT secrets (run in any terminal):**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Run it twice — once for `JWT_ACCESS_SECRET`, once for `JWT_REFRESH_SECRET`.

### 3. Start the backend

```bash
# Development (auto-restarts on file changes)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:5000`.

### 4. Set up the frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Copy example env
cp .env.example .env
```

### 5. Start the frontend

```bash
npm run dev
```

The app will open at `http://localhost:5173`.
All `/api/*` and `/socket.io` requests are proxied to the backend automatically (see `vite.config.js`).

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | yes | `development` \| `production` |
| `PORT` | yes | HTTP port (default `5000`) |
| `MONGO_URI` | yes | MongoDB connection string |
| `JWT_ACCESS_SECRET` | yes | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | yes | Secret for signing refresh tokens |
| `JWT_ACCESS_EXPIRES` | no | Access token TTL (default `15m`) |
| `JWT_REFRESH_EXPIRES` | no | Refresh token TTL (default `7d`) |
| `CLIENT_URL` | yes | Frontend origin for CORS (default `http://localhost:5173`) |
| `REDIS_URL` | no | Redis connection string — leave empty to disable |
| `CLOUDINARY_*` | no | Cloudinary credentials for file uploads |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |
| `VITE_SOCKET_URL` | Socket.IO server URL |

---

## API Reference

### Auth  `/api/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Register new user |
| POST | `/login` | — | Login, receive tokens |
| POST | `/refresh-token` | — | Exchange refresh → access token |
| POST | `/logout` | ✓ | Invalidate refresh token |
| GET | `/me` | ✓ | Get current user profile |
| PATCH | `/change-password` | ✓ | Change password |

### Users  `/api/users`
| Method | Path | Description |
|---|---|---|
| GET | `/search?q=` | Search users by username |
| GET | `/:id` | Get user by ID |
| GET | `/:id/status` | Get online status |
| PATCH | `/me` | Update own profile |
| POST | `/:id/block` | Block / unblock a user |

### Chats  `/api/chats`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List all chats for current user |
| GET | `/private/:userId` | Get or create DM with user |
| POST | `/group` | Create a group chat |
| GET | `/:id` | Get chat by ID |
| PATCH | `/:id` | Update group chat |
| POST | `/:id/members` | Add member to group |
| DELETE | `/:id/members/:userId` | Remove member |
| POST | `/:id/read` | Reset unread count |

### Messages  `/api/messages`
| Method | Path | Description |
|---|---|---|
| POST | `/` | Send a message |
| GET | `/chat/:chatId` | Get messages (cursor pagination) |
| GET | `/search?chatId=&q=` | Full-text search |
| PATCH | `/:id` | Edit message |
| DELETE | `/:id` | Delete message (soft) |
| POST | `/:id/reactions` | Toggle emoji reaction |
| POST | `/:id/pin` | Pin / unpin message |

### Servers  `/api/servers`
| Method | Path | Description |
|---|---|---|
| POST | `/` | Create server |
| GET | `/` | List joined servers |
| GET | `/:id` | Get server by ID |
| PATCH | `/:id` | Update server |
| DELETE | `/:id` | Delete server |
| GET | `/join/:inviteCode` | Join via invite |
| POST | `/:id/invite/regenerate` | Regenerate invite |
| POST | `/:id/leave` | Leave server |
| DELETE | `/:id/members/:userId/kick` | Kick member |
| DELETE | `/:id/members/:userId/ban` | Ban member |
| PATCH | `/:id/members/:userId/role` | Update member role |

### Channels  `/api/channels`
| Method | Path | Description |
|---|---|---|
| GET | `/server/:serverId` | List server channels |
| POST | `/server/:serverId` | Create channel |
| GET | `/:channelId` | Get channel |
| PATCH | `/:channelId` | Update channel |
| DELETE | `/:channelId` | Delete channel |
| GET | `/:channelId/messages` | Get channel messages |

---

## Socket.IO Events

### Presence
| Direction | Event | Payload |
|---|---|---|
| Client → Server | `presence:set_status` | `{ status }` |
| Server → Client | `presence:update` | `{ userId, status, lastSeen? }` |

### Messages
| Direction | Event | Payload |
|---|---|---|
| C → S | `message:send` | `{ chatId, content, type?, replyTo?, attachments? }` |
| C → S | `message:edit` | `{ messageId, content }` |
| C → S | `message:delete` | `{ messageId }` |
| C → S | `message:react` | `{ messageId, emoji }` |
| C → S | `message:typing` | `{ chatId }` |
| C → S | `message:stop_typing` | `{ chatId }` |
| C → S | `message:read` | `{ chatId, messageId }` |
| S → C | `message:new` | `{ message }` |
| S → C | `message:edited` | `{ messageId, content, editedAt }` |
| S → C | `message:deleted` | `{ messageId }` |
| S → C | `message:reaction` | `{ messageId, reactions }` |
| S → C | `message:seen` | `{ chatId, messageId, userId, readAt }` |
| S → C | `message:typing` | `{ chatId, userId, username }` |
| S → C | `message:stop_typing` | `{ chatId, userId }` |

### Rooms
| Direction | Event | Payload |
|---|---|---|
| C → S | `chat:join` / `chat:leave` | `{ chatId }` |
| C → S | `server:join` / `server:leave` | `{ serverId }` |
| C → S | `channel:join` / `channel:leave` | `{ channelId }` |

### Voice (WebRTC)
| Direction | Event | Payload |
|---|---|---|
| C → S | `voice:join` | `{ channelId }` |
| C → S | `voice:leave` | `{ channelId }` |
| C → S | `voice:signal` | `{ to: socketId, signal }` |
| S → C | `voice:user_joined` | `{ userId, socketId, username, avatar }` |
| S → C | `voice:user_left` | `{ userId, socketId, channelId }` |
| S → C | `voice:existing_users` | `{ users, channelId }` |
| S → C | `voice:signal` | `{ from: socketId, signal }` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, React Query, Socket.IO client |
| Backend | Node.js, Express 4, Socket.IO 4 |
| Database | MongoDB + Mongoose 8 |
| Auth | JWT (access + refresh), bcryptjs |
| Caching | Redis (ioredis) — optional |
| Logging | Winston + Morgan |
| Validation | express-validator |
| Security | Helmet, express-mongo-sanitize, express-rate-limit |

---

## License

MIT
