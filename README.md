# Aegis Tactical C-UAS Threat Trainer Simulator

An AI-enabled, high-performance Counter-Unmanned Aerial System (C-UAS) Threat Trainer designed for forward military operating posts. The system trains operators on the rapid **D-TID-A** (Detect, Track, Identify, Defeat, Assess) kill chain against commercial drones, analog kamikaze FPVs, and autonomous drone swarms.

Built with **Aegis Tactical Design System** (Functional Military Brutalism + Cockpit Avionics Telemetry).

---

## ?? System Architecture

The project is structured as a monorepo with dedicated micro-service workspaces:

```
+-- frontend/          # High-performance React 18 + Vite + Tailwind tactical HUD
¦   +-- src/           # Tactical HUD, Radar Scope, RF Waterfall, EO/IR feeds, 3D Canvas
¦   +-- .env.example   # Frontend API and WebSocket configurations
¦   +-- package.json   # cuas-frontend workspace
+-- backend/           # Node.js + Express + WebSocket + Drizzle ORM tactical engine
¦   +-- src/           # Physics loop, threat scoring, EW simulation, D-TID-A state machine
¦   +-- src/db/        # NeonDB cloud PostgreSQL schema & Drizzle connection
¦   +-- .env.example   # NeonDB cloud connection string & server ports
¦   +-- package.json   # cuas-backend workspace
+-- shared/            # Shared TypeScript contracts, D-TID-A types, telemetry models
+-- docker-compose.yml # Optional local telemetry infrastructure
```

---

## ? Quick Start

### 1. Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **npm**: v9+

### 2. Installation
Install all dependencies across all workspaces:
```bash
npm install
```

### 3. Environment Setup

#### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env` and update your NeonDB connection string:
```bash
cp backend/.env.example backend/.env
```
Inside `backend/.env`:
```env
PORT=4000
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
CORS_ORIGIN=http://localhost:3000
```
*(If `DATABASE_URL` is omitted, the engine automatically falls back to high-speed in-memory store for instant offline simulation).*

#### Frontend (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env`:
```bash
cp frontend/.env.example frontend/.env
```
Inside `frontend/.env`:
```env
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
```

---

## ??? Development & Building

### Run in Development Mode
Start both frontend and backend concurrently:
```bash
# Terminal 1: Backend Tactical Server
npm run dev --workspace=backend

# Terminal 2: Tactical HUD Frontend
npm run dev --workspace=frontend
```
HUD available at: `http://localhost:3000`  
Backend telemetry API: `http://localhost:4000`

### Production Build
Compile TypeScript shared packages, backend server, and frontend bundle:
```bash
npm run build
```

---

## ?? Key Capabilities & Kill Chain (D-TID-A)

1. **Detect & Track**:
   - 360° Plan Position Indicator (PPI) radar scope with multi-threat trajectory tracking.
   - Real-time RF spectrum waterfall analyzing 2.4 GHz, 5.8 GHz, 915 MHz, and 433 MHz hopping patterns.
2. **Identify**:
   - Thermal / EO-IR camera tracking with FLIR White-Hot, Black-Hot, and Night Vision optical presets.
   - Micro-Doppler signature analysis identifying rotor count and payload status.
3. **Defeat**:
   - Directional & omni-directional RF jammer (disables C2 links and video telemetry).
   - Multi-constellation GNSS spoofing (GPS / GLONASS / Galileo drift induction).
   - High-velocity Kinetic interceptor (Iron Dome style close-in engagement).
4. **Assess**:
   - Automated After-Action Review (AAR) assessing response latency, ammo conservation, civilian collateral risk, and posture survivability.

---

## ??? Aegis Tactical Theme & Aesthetics

- **Carbon Void Palette**: Tactical gunmetal `#0F141C` and carbon void `#06080B` chassis.
- **HUD Avionics Telemetry**: Tactical cyan `#00E5FF`, Phosphor emerald `#00FF88`, Advisory amber `#FFB703`, Combat ruby `#FF1E56`.
- **45° Tactical Chamfers & Hairlines**: Military brutalist cockpit gauges, CRT scanline toggles, and precision reticles.

---

## ?? Deployment

### Frontend (Vercel / Netlify / Cloudflare Pages)
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables: `VITE_API_URL`, `VITE_WS_URL`

### Backend (Render / Railway / Fly.io / AWS ECS)
- Root Directory: `backend`
- Build Command: `npm run build`
- Start Command: `npm run start`
- Environment Variables: `PORT`, `DATABASE_URL` (NeonDB), `CORS_ORIGIN`
