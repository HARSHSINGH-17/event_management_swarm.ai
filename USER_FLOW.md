# Event Swarm AI — Judge Demo Guide

## Pre-Demo Setup (2 minutes)

Open **2 terminals**:

**Terminal 1 — Backend:**
```powershell
cd event-swarm-ai\backend
.\venv\Scripts\python.exe -m uvicorn main:app --port 8000 --reload
```
Wait for: `[Auth] ✅ Demo account seeded: demo@eventswarm.ai / demo123`

**Terminal 2 — Frontend:**
```powershell
cd event-swarm-ai
npm run dev
```
Open: **http://localhost:5173**

---

## 🎯 Step-by-Step Demo Flow for Judges

### STEP 1 — Login (30 seconds)
1. Go to http://localhost:5173 → auto-redirects to `/login`
2. Click **"Fill automatically →"** button (fills demo credentials)
3. Click **"Sign in"**
4. You're now in the **Dashboard**

**What to say:** *"The system uses JWT authentication — demo account is auto-created on first server start."*

---

### STEP 2 — Swarm Control Center (2 minutes)
1. Click **"Swarm Control Center"** in the left sidebar
2. Point out the **Agent Network diagram** — 6 nodes, 10 connections
3. Point out each agent: Orchestrator, Crisis, Scheduler, Email, Content, Analytics
4. Click any scenario (e.g., **"Crisis Response"**) → click **"Run Simulation"**
5. Watch the flow messages animate between agents
6. Switch to the **"Activity Log"** tab — see who sent what to whom

**What to say:** *"This visualizes the autonomous agent network. Each agent has its own role and communicates via a shared state object — our implementation of swarm intelligence."*

---

### STEP 3 — Crisis Management Demo (3 minutes — THE MAIN DEMO)

**This is the most impressive part. Run it last.**

1. Click **"Crisis Management"** in sidebar
2. You'll see the current sessions loaded from Supabase

**Set up the crisis:**
- Crisis Type: **"Speaker Cancellation"**
- Select entity: **any speaker** from the dropdown
- Click **"🚨 Trigger Crisis Resolution"**

**Watch the magic happen:**
- `[HH:MM:SS] Orchestrator → Crisis Agent (step 1)`
- `[HH:MM:SS] Crisis Agent: Speaker X has cancelled. Proposing reschedule of 2 sessions...`
- `[HH:MM:SS] Crisis Agent → Scheduler Agent`
- `[HH:MM:SS] Orchestrator → Scheduler Agent (step 2)`
- `[HH:MM:SS] Scheduler Agent: Generated conflict-free schedule, 3 conflicts resolved`
- `[HH:MM:SS] Scheduler Agent → Email Agent`
- `[HH:MM:SS] Orchestrator → Email Agent (step 3)`
- `[HH:MM:SS] Email Agent: Dry-run mode (SMTP not live), 0 emails sent`

**Switch to "Agent Logs" tab** — see the full chain!

**What to say:** *"Three AI agents coordinated autonomously in sequence. The Crisis Agent analyzed the impact, the Scheduler Agent re-optimized the entire timetable, and the Email Agent prepared participant notifications — all triggered by a single user action, no human in the loop."*

---

### STEP 4 — Email Automation (1 minute)
1. Click **"Email Automation"** in sidebar
2. Show the email campaign configuration
3. Mention: *"In production mode with SMTP configured, agents send personalized emails to each participant based on their sessions."*

---

### STEP 5 — Social Media Agent (1 minute)
1. Click **"Social Media Agent"**
2. Fill in event details or use existing data
3. Click generate → Groq LLM creates platform-specific posts
4. Show LinkedIn, Twitter/X, Instagram outputs

---

### STEP 6 — Scheduler (1 minute)
1. Click **"Event Scheduler"**
2. Show the visual calendar of sessions
3. Point out conflict detection (red indicators)

---

## 🏗️ Architecture Explanation for Judges

```
User Action
    │
    ▼
FastAPI Backend  ←──── JWT Auth ─────→  SQLite DB
    │
    ▼
SwarmGraph (Orchestrator)
    │
    ├──→ Crisis Agent  (Groq LLM: llama-3.1-8b-instant)
    │         │  shared SwarmState
    ├──→ Scheduler Agent  (Groq LLM)
    │         │  shared SwarmState
    └──→ Email Agent  (SMTP / dry-run)

All agents read from and write to the same SwarmState dict.
Routing is autonomous — no human decides the next agent.
```

**Key talking points:**
- **Shared state**: `SwarmState` TypedDict is the "memory" — agents read and write it
- **Autonomous routing**: The orchestrator uses `next_agent` field set by each agent
- **Real AI**: Every agent calls Groq's `llama-3.1-8b-instant` model (80B parameter class)
- **SSE Streaming**: Agent logs stream to UI in real-time via Server-Sent Events

---

## ⚡ API Endpoints (show at http://localhost:8000/docs)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/login` | POST | JWT login |
| `/api/auth/me` | GET | Current user |
| `/api/swarm/run` | POST | Run full multi-agent workflow |
| `/api/orchestrator/stream` | POST | SSE real-time agent logs |
| `/api/generate-content` | POST | Social media generation |
| `/api/resolve-crisis` | POST | Crisis resolution |
| `/api/optimize-schedule` | POST | Schedule optimization |
| `/api/health` | GET | System health check |

---

## 🚨 Quick Fixes During Demo

**Backend won't start:**
```powershell
cd backend
.\venv\Scripts\pip install -r requirements.txt
.\venv\Scripts\python.exe -m uvicorn main:app --port 8000
```

**"Invalid credentials" on login:**
- Delete `backend/app.db` and restart the backend (re-seeds demo user)

**Crisis agent returns error:**
- Verify `GROQ_API_KEY` is in `.env` file
- Check: `echo $env:GROQ_API_KEY` in PowerShell

**Frontend 404 errors:**
- Check Vite is running on port 5173
- Check `src/services/orchestrator.ts` has `API_BASE = "http://localhost:8000"`

**Supabase data not loading:**
- Check `.env` for `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- Data fallback: Import from `test_data/` CSVs via Supabase dashboard
