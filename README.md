# MindTodo

A real-time, collaborative todo board rendered on an infinite HTML5 Canvas. Create sessions, share a code, and work together with live sync via WebSockets.

## Features

- **Infinite canvas** -- pan, zoom, dot grid background
- **Categories & tasks** -- create category nodes and branch tasks off them
- **Real-time collaboration** -- join a session with a 6-character code; changes sync instantly
- **Priority levels** -- mark tasks as high, medium, or low priority
- **Dark / light theme**
- **Export** -- PNG image or Markdown
- **Import** -- from Markdown
- **Minimap** navigation
- **Auto-cleanup** -- sessions expire after 2 days of inactivity

## Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | React 18, Zustand, HTML5 Canvas 2D |
| Backend  | Node.js 20, Fastify 5              |
| Database | SQLite (better-sqlite3)             |
| Realtime | WebSockets (@fastify/websocket)     |
| Build    | Vite 6                              |
| Deploy   | Docker, Fly.io                      |

## Getting Started

### Prerequisites

- **Node.js 20+**
- **npm**

### Install

```bash
git clone https://github.com/<your-username>/mindtodo.git
cd mindtodo
npm install
```

### Run (development)

```bash
npm run dev
```

This starts both the Vite dev server (port 5173) and the Fastify backend (port 3001) concurrently. Open [http://localhost:5173](http://localhost:5173).

### Build for production

```bash
npm run build
npm start
```

The client is built into `dist/` and served by Fastify on port 3001.

## Deploy to Fly.io

### First-time setup

1. Install the [Fly CLI](https://fly.io/docs/flyctl/install/).
2. Authenticate: `fly auth login`
3. Create the app: `fly apps create mindtodo` (or pick your own name and update `fly.toml`).
4. Create a persistent volume for the database:
   ```bash
   fly volumes create mindtodo_data --region sjc --size 1
   ```

### Deploy

```bash
# Full deploy (local build check + deploy + health check)
npm run deploy

# Skip the local build verification
./deploy.sh --skip-build

# Build the Docker image without deploying
npm run deploy:dry
```

### Useful Fly.io commands

```bash
fly logs            # tail application logs
fly status          # check machine status
fly ssh console     # SSH into the running machine
```

## Project Structure

```
├── client/            # React frontend (Vite)
│   ├── src/
│   │   ├── canvas/    # Canvas rendering, gestures, hit testing
│   │   ├── hooks/     # Zustand store, WebSocket hook
│   │   ├── pages/     # Landing, Settings
│   │   └── styles/    # CSS custom properties, themes
│   └── vite.config.js
├── server/            # Fastify backend
│   ├── index.js       # Server entry point
│   ├── db.js          # SQLite schema & queries
│   ├── ws.js          # WebSocket handler
│   ├── cleanup.js     # Session expiry cron
│   └── routes/        # REST API routes
├── deploy.sh          # Fly.io deploy script
├── Dockerfile         # Multi-stage production build
├── fly.toml           # Fly.io configuration
└── package.json
```

## Environment Variables

| Variable   | Default                 | Description                   |
| ---------- | ----------------------- | ----------------------------- |
| `PORT`     | `3001`                  | Server listen port            |
| `NODE_ENV` | —                       | Set to `production` for prod  |
| `DB_PATH`  | `./data/mindtodo.db`    | Path to the SQLite database   |

## License

[MIT](LICENSE)
