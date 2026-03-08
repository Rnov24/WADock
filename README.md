# 📡 WADock

WADock is a self-hosted, lightweight WhatsApp API Gateway designed to run seamlessly on a small footprint. It provides a simple HTTP API to send and receive WhatsApp messages, manage connected instances, and trigger reliable webhooks for automation (e.g., n8n). 

Built as a specialized monorepo using **Fastify** (Backend) and **Svelte 5** (Monitoring Dashboard).

---

## ✨ Features

- **Robust Connection Management:** Auto-reconnections to WhatsApp via Baileys.
- **Unified Monitoring Dashboard:** Track message volume, webhook success rates, server metrics (CPU, RAM), and view real-time activity logs.
- **RESTful API:** Manage messages, API keys, and webhooks effortlessly.
- **Webhook Subscriptions:** Get notified when messages are incoming, sent, or status changes occur (Supports HMAC verification).
- **Interactive API Documentation:** Built-in Swagger UI at `/docs`.
- **Space-Efficient Storage:** Built-in SQLite log rotation to prevent runaway database growth.

## 🚀 Quick Start (Docker)

The easiest way to run WADock is via Docker.

1. **Pull and Run**:
```bash
docker run -d \
  -p 3000:3000 \
  -v wadock_data:/data \
  -e ADMIN_PASSWORD="your_secure_password" \
  ghcr.io/wadock/wadock:latest
```

2. **Access Dashboard**:
Go to `http://localhost:3000` to log in, link your device via QR code, and monitor your server.

## 💻 Local Development

### Prerequisites
- Node.js 18+ (Node 20+ recommended)
- `npm` (Workspaces enabled)

### Setup
```bash
# 1. Clone the repository
git clone https://github.com/wadock/wadock.git
cd wadock

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and set your ADMIN_PASSWORD

# 4. Start Development Server
npm run dev
```

*Note: The frontend Dashboard is inside `packages/dashboard` (runs on `npm run dev`) and the Backend API is inside `packages/server`.*

## 📚 API Documentation

WADock comes with comprehensive, interactive API documentation powered by OpenAPI/Swagger.

Once the WADock server is running, navigate to:
```
http://localhost:3000/docs
```

From here you can:
- Browse all available API endpoints.
- Review expected JSON payloads and data types.
- Directly interface with the API using the "Try it out" button (Requires generating an API Key in the dashboard).

### Example: Sending a text message
```bash
curl -X POST http://localhost:3000/api/messages/send-text \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "6281234567890",
    "text": "Hello from WADock!"
  }'
```

## ⚙️ Environment Variables

Copy `.env.example` to `.env` to configure your instance manually:

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_PASSWORD` | **Required.** Password for web dashboard | `changeme` |
| `PORT` | The port the web server runs on | `3000` |
| `DATA_DIR` | Where SQLite DB and Session data are saved | `./data` (relative to execution) |
| `LOG_LEVEL` | Pino logger severity level | `info` |
| `WEBHOOK_TIMEOUT_MS` | Max time allowed for webhook to respond | `10000` |
| `WEBHOOK_MAX_RETRIES` | Max connection attempts before marking fail | `3` |

## 🏗 Architecture

- `packages/server/`: The core API built with Node.js, Fastify, SQLite, and `@whiskeysockets/baileys`.
- `packages/dashboard/`: The single-page Admin Interface built with Svelte 5 and Vite. 
- Integrated SQLite handles persistent configurations (API Keys, Webhooks) and rotating logs.
