# Project: Real-Time Collaborative Code Editor

## Stack
- Backend: Node.js + Express (ESM), MongoDB + Mongoose, Socket.io, Redis
- CRDT: Yjs + y-websocket + y-monaco
- Auth: JWT (access token in memory, refresh token httpOnly cookie)
- Validation: Zod
- Logging: Winston
- Testing: Jest + Supertest
- DevOps: Docker, GitHub Actions, Prometheus, Grafana

## Folder Structure
Module-by-feature under src/modules/, shared code under src/shared/

## Phases
- [x] Phase 0: Planning, skeleton, dependencies
- [x] Phase 1: Express foundation, env validation, logger, error handling, rate limiting, health endpoint
- [ ] Phase 2: MongoDB connection, User model, auth routes (register/login/refresh)
- [ ] Phase 3: Socket.io presence layer + Redis adapter
- [ ] Phase 4: Yjs CRDT collaborative editing + Monaco binding
- [ ] Phase 5: Judge0 code execution
- [ ] Phase 6: Session persistence + diff view
- [ ] Phase 7: Testing
- [ ] Phase 8: DevOps + observability
- [ ] Phase 9: Deployment
- [ ] Phase 10: AI agent layer

## Current Status
Phase 2 starting — MongoDB connection next (src/config/db.js)

## Key Decisions
- ESM throughout (import/export)
- Port 8080 (5000 conflicts with macOS AirPlay)
- Access token: short-lived, in memory client-side
- Refresh token: httpOnly cookie, rotation on every refresh
- Zod validates ALL env vars at boot, crashes fast if missing
- express-rate-limit: 100 req/15min window
- Winston: console in dev, file in prod (logs/combined.log, logs/error.log)
- Nothing reads process.env directly except config/env.js

## When Starting New Chat
Paste this file + say "continuing real-time code editor project, strict mentor mode, no code unless stuck"
