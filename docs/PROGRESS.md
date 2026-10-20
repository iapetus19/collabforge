# Project: Real-Time Collaborative Code Editor

## Stack
- Runtime: Node.js (ESM - import/export throughout, "type":"module" in package.json)
- Framework: Express v5
- Database: MongoDB Atlas + Mongoose v9
- Auth: JWT (short-lived access token in memory, long-lived refresh token in httpOnly cookie, rotation on every refresh)
- Real-time presence: Socket.io + socket.io-redis-adapter
- CRDT collaborative editing: Yjs + y-websocket + y-monaco
- Validation: Zod v4 (env vars at boot + all request bodies)
- Logging: Winston v3 (console in dev, file in prod at logs/combined.log + logs/error.log)
- Rate limiting: express-rate-limit v8 (100 req/15min)
- Security: helmet, cors
- Testing: Jest + Supertest (backend), Vitest + RTL (frontend, later)
- DevOps: Docker, GitHub Actions, Prometheus + prom-client, Grafana

## Folder Structure (module-by-feature)

src/
├── app.js                          # Express assembly, middleware chain, health route
├── server.js                       # HTTP bootstrap, connectDB, graceful shutdown
├── config/
│   ├── env.js                      # Zod-validated env, only file that reads process.env
│   ├── db.js                       # Mongoose connection, disconnected event listener
│   └── redis.js                    # Redis client (Phase 3)
├── modules/
│   ├── auth/                       # auth.model, controller, service, routes, schema, test
│   ├── room/                       # room.model, controller, service, routes, schema, test
│   ├── session/                    # session.model, controller, service, routes, schema, test
│   ├── execution/                  # execution.controller, service, routes, schema, test
│   ├── collab/                     # collab.server, collab.persistence, test (Yjs layer)
│   └── socket/                     # socket.gateway, socket.handlers, test (Socket.io layer)
└── shared/
├── middleware/
│   ├── errorHandler.js         # 4-arg Express error middleware, uses isOperational flag
│   ├── rateLimiter.js          # express-rate-limit instance
│   ├── authGuard.js            # JWT verification middleware (Phase 2)
│   └── validate.js             # Generic zod validation wrapper (Phase 2)
├── logger/
│   └── winston.js              # Winston logger instance
├── errors/
│   ├── AppError.js             # Custom error class extending Error, has statusCode + isOperational
│   └── errorCodes.js           # ERROR_CODES map: NOT_FOUND=404, BAD_REQUEST=400, etc.
├── metrics/
│   └── prometheus.js           # prom-client setup (Phase 8)
└── utils/                      # empty, populated as needed

## Key Decisions & Constraints
- Port 8080 in dev (port 5000 conflicts with macOS AirPlay)
- Nothing reads process.env directly except config/env.js
- No console.log anywhere — winston logger used throughout
- Cross-module imports rule: modules only import from shared/ and config/, never from each other's internals
- AppError.isOperational=true for expected errors, false/missing for bugs — errorHandler logs differently per flag
- Mongoose 9: no need for useNewUrlParser or useUnifiedTopology (deprecated)
- express-rate-limit v8: uses 'limit' not 'max', standardHeaders: 'draft-8'
- ESM requires relative imports with .js extension always

## Environment Variables (.env, never committed)
PORT=8080
NODE_ENV=development
MONGO_URI=mongodb+srv://...atlas URI with /code_editor database name...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...

## Phases
- [x] Phase 0: ADR docs, skeleton, dependencies installed, git initialized on main branch
- [x] Phase 1: config/env.js (zod), shared/logger/winston.js, shared/errors/AppError.js + errorCodes.js, shared/middleware/errorHandler.js + rateLimiter.js, app.js (middleware chain + /health), server.js (listen + graceful shutdown SIGTERM/SIGINT)
- [ ] Phase 2: IN PROGRESS — MongoDB connected (config/db.js done, Atlas configured), User model next (modules/auth/auth.model.js), then auth.schema.js (zod), auth.service.js (register/login/refresh logic), auth.controller.js, auth.routes.js, authGuard.js, validate.js middleware
- [ ] Phase 3: Socket.io presence layer, Redis adapter, multi-instance horizontal scaling test
- [ ] Phase 4: Yjs CRDT layer, y-websocket sync server, y-monaco binding, Awareness cursors, MongoDB Yjs update persistence
- [ ] Phase 5: Judge0 code execution, per-user rate limiting on /execute, stdin/code size caps
- [ ] Phase 6: Session persistence, diff view between checkpoints
- [ ] Phase 7: Supertest integration tests, Yjs merge correctness test, Socket.io integration test
- [ ] Phase 8: Docker multi-stage, docker-compose (2x Node + Redis + MongoDB), GitHub Actions CI, Prometheus metrics, Grafana dashboard
- [ ] Phase 9: Vercel (frontend), Render/EC2 (backend), MongoDB Atlas, Upstash Redis, runbook.md
- [ ] Phase 10: AI agent layer (tool-calling loop: read code → suggest fix → apply → re-run via Judge0)

## Current Status
Phase 2 in progress — MongoDB Atlas connected and verified. Next task: auth.model.js (User mongoose schema).

## Mentor Mode Rules (for next chat)
- Strict mentor, no code unless genuinely stuck after extended effort
- No bullet point code walkthroughs — concept explanation then student writes
- No unnecessary charts, diagrams, or fluff
- Save tokens
- Student writes, mentor reviews and corrects
- Conventional commits (feat:, fix:, chore:, docs:)
- Every phase ends with git commit
