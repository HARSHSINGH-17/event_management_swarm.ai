import os
from dotenv import load_dotenv

# Load .env FIRST before any other imports that may use env vars
_env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(dotenv_path=_env_path, override=True)

import asyncio
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from apscheduler.schedulers.background import BackgroundScheduler
import requests
from groq import Groq
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import UploadFile, File
import pandas as pd
import io
import json
import re

# ── Auth imports ──────────────────────────────────────────────────────────────
from database import engine, SessionLocal, Base
from auth.models import User as UserModel
from auth.schemas import (
    RegisterRequest, LoginRequest, RefreshRequest,
    AuthResponse, UserOut, TokenResponse,
)
from auth.service import (
    authenticate_user, create_user, create_access_token, create_refresh_token,
    decode_token, get_user_by_id, seed_demo_user,
)
from auth.dependencies import get_current_user

# CrewAI Orchestrator Imports
from orchestrator.swarm import (
    generate_social_content_workflow,
    optimize_schedule_workflow,
    resolve_crisis_workflow
)

# LangGraph-Style Swarm Imports
from fastapi.responses import StreamingResponse
from swarm.orchestrator import swarm as swarm_graph
from swarm.state import make_initial_state


app = FastAPI(title="Social Media Content Agent API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase configuration
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Scheduler
scheduler = BackgroundScheduler()
scheduler.start()

@app.on_event("startup")
async def startup_event():
    print("[AGENT] Initializing Server with Groq API integration...")
    if not os.getenv("GROQ_API_KEY"):
         print("[AGENT] WARNING: GROQ_API_KEY not found in .env. Generation will fail.")
    else:
         print("[AGENT] >> Groq API Key found and ready.")

    # ── Auth DB: auto-create tables and seed demo user ──────────────────────
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            seed_demo_user(db)
        finally:
            db.close()
        print("[Auth] SQLite database ready (backend/app.db)")
    except Exception as e:
        print(f"[Auth] WARNING: DB init failed: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/auth/register", response_model=AuthResponse)
async def auth_register(req: RegisterRequest):
    """Create a new user account and return tokens."""
    from database import SessionLocal as _SL
    db = _SL()
    try:
        from auth.service import get_user_by_email
        if get_user_by_email(db, req.email):
            raise HTTPException(status_code=400, detail="Email already registered")
        user = create_user(db, req.email, req.password, req.full_name, req.organization or "")
        return AuthResponse(
            user=UserOut.from_orm_user(user),
            token=create_access_token(user.id, user.email),
            refreshToken=create_refresh_token(user.id),
        )
    finally:
        db.close()


@app.post("/api/auth/login", response_model=AuthResponse)
async def auth_login(req: LoginRequest):
    """Login with email + password and receive JWT tokens."""
    from database import SessionLocal as _SL
    db = _SL()
    try:
        user = authenticate_user(db, req.email, req.password)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        return AuthResponse(
            user=UserOut.from_orm_user(user),
            token=create_access_token(user.id, user.email),
            refreshToken=create_refresh_token(user.id),
        )
    finally:
        db.close()


@app.get("/api/auth/me", response_model=UserOut)
async def auth_me(current_user: UserModel = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return UserOut.from_orm_user(current_user)


@app.post("/api/auth/refresh", response_model=TokenResponse)
async def auth_refresh(req: RefreshRequest):
    """Exchange a refresh token for a new access token."""
    payload = decode_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    from database import SessionLocal as _SL
    db = _SL()
    try:
        user = get_user_by_id(db, payload["sub"])
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found")
        return TokenResponse(token=create_access_token(user.id, user.email))
    finally:
        db.close()


@app.post("/api/auth/logout")
async def auth_logout():
    """Logout (client should discard the token; stateless JWT)."""
    return {"message": "Logged out successfully"}


class EventData(BaseModel):
    eventName: str
    theme: str
    date: str
    location: str
    description: str

class PostData(BaseModel):
    platform: str
    caption: str
    image_url: str
    scheduled_time: str

class OptimizeScheduleRequest(BaseModel):
    sessions: list
    rooms: list
    event_date: Optional[str] = "2026-03-15"
    event_start_hour: Optional[str] = "09:00"
    event_end_hour: Optional[str] = "18:00"

class ResolveCrisisRequest(BaseModel):
    crisis_type: str
    affected_entity: dict
    sessions: list
    rooms: list
    speakers: list
    event_date: Optional[str] = "2026-03-15"

class Participant(BaseModel):
    name: str
    email: str
    team_name: Optional[str] = ""
    college: Optional[str] = ""

class EmailTemplate(BaseModel):
    eventName: str
    subjectTemplate: str
    bodyTemplate: str
    participants: Optional[List[dict]] = None

# In-memory storage
participants_storage = []
local_email_logs = []

# Local storage fallback
local_logs = []
local_posts = []

async def log_activity(action: str, platform: Optional[str] = None):
    log_entry = {
        "action": action,
        "platform": platform,
        "timestamp": datetime.now().isoformat()
    }
    print(f"[AGENT] {action}")
    local_logs.insert(0, log_entry) # Keep latest at top
    
    try:
        supabase.table("agent_logs").insert(log_entry).execute()
    except Exception:
        pass 

def publish_to_social_media(post_id: str, platform: str, caption: str):
    """Placeholder for real social media publishing"""
    print(f"Publishing to {platform}: {caption}")
    try:
        supabase.table("generated_posts").update({"status": "published"}).eq("id", post_id).execute()
    except Exception:
        pass
    asyncio.run(log_activity(f"Published post to {platform}", platform))

@app.post("/api/generate-social-content")
async def generate_content(data: EventData):
    await log_activity(f"Started generating content for {data.eventName}")

    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    def groq_generate(platform: str) -> str:
        char_limits = {"LinkedIn": 1200, "Twitter/X": 280, "Instagram": 800}
        limit = char_limits.get(platform, 600)
        try:
            resp = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": (
                        f"You are a social media expert. Write a compelling {platform} post. "
                        f"Max {limit} characters. Include relevant emojis and hashtags. "
                        "Return ONLY the post text, nothing else.")},
                    {"role": "user", "content": (
                        f"Event: {data.eventName}\nTheme: {data.theme}\n"
                        f"Date: {data.date}\nLocation: {data.location}\n"
                        f"Description: {data.description}")}
                ],
                temperature=0.8,
                max_tokens=500,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            print(f"[GROQ] Error for {platform}: {e}")
            return ""

    try:
        platforms = ["LinkedIn", "Twitter/X", "Instagram"]
        generated: dict = {}

        for platform in platforms:
            text = groq_generate(platform)
            generated[platform] = text
            await log_activity(f"Generated {platform} post", platform)

        # Rich fallback if Groq returns empty
        fallbacks = {
            "LinkedIn": (
                f"🚀 Excited to announce {data.eventName}!\n\n"
                f"Theme: {data.theme}\n📍 {data.location} | 📅 {data.date}\n\n"
                f"{data.description}\n\n#Innovation #TechEvent #AI"
            ),
            "Twitter/X": (
                f"🔥 {data.eventName} is happening!\n📍 {data.location} | 📅 {data.date}\n"
                f"#{data.theme.replace(' ', '')} #TechEvent 🚀"
            ),
            "Instagram": (
                f"✨ {data.eventName} ✨\n\n{data.description}\n\n"
                f"📍 {data.location}\n📅 {data.date}\n#Tech #Innovation #Event"
            ),
        }
        for platform in platforms:
            if not generated.get(platform) or len(generated[platform]) < 30:
                generated[platform] = fallbacks[platform]

        # Free image via Pollinations (no API key needed)
        prompt_encoded = f"Professional tech event poster {data.eventName}".replace(" ", "%20")
        image_url = (
            f"https://pollinations.ai/p/{prompt_encoded}"
            f"?width=1024&height=1024&seed={datetime.now().microsecond}"
        )

        results = []
        for platform in platforms:
            post = {
                "platform": platform,
                "caption": generated[platform],
                "image_url": image_url,
                "hashtags": ["Tech", "Innovation", "Event", data.theme.replace(" ", "")],
                "suggested_time": "Tomorrow 10:00 AM" if platform == "LinkedIn" else "Today 6:00 PM",
            }
            results.append(post)
            try:
                supabase.table("generated_posts").insert({**post, "status": "generated"}).execute()
            except Exception:
                pass

        await log_activity(f"Completed generation for {data.eventName}")
        return {"results": results, "image_url": image_url}

    except Exception as e:
        await log_activity(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/schedule-post")
async def schedule_post(data: PostData):
    await log_activity(f"Scheduling post for {data.platform}", data.platform)
    post_id = "local-" + str(datetime.now().timestamp())
    
    try:
        res = supabase.table("generated_posts").insert(data.dict()).execute()
        if res.data: post_id = res.data[0]['id']
    except: pass
    
    scheduled_dt = datetime.fromisoformat(data.scheduled_time.replace("Z", "+00:00"))
    scheduler.add_job(publish_to_social_media, 'date', run_date=scheduled_dt, args=[post_id, data.platform, data.caption])
    
    return {"status": "success", "post_id": post_id}

def personalize_template(template: str, participant: dict, event_name: str) -> str:
    # Safely handle missing keys by using get()
    return template.format(
        name=participant.get("name", "Participant"),
        email=participant.get("email", ""),
        team_name=participant.get("team_name", "N/A"),
        college=participant.get("college", "N/A"),
        event_name=event_name
    )

@app.post("/api/upload-participants")
async def upload_participants(file: UploadFile = File(...)):
    global participants_storage
    await log_activity(f"CSV Uploaded: {file.filename}")
    
    try:
        content = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
        
        # Normalize column names to lowercase and underscores
        df.columns = [c.lower().strip().replace(" ", "_") for c in df.columns]
        
        participants = df.to_dict('records')
        participants_storage = participants # Store in memory
        return participants
    except Exception as e:
        await log_activity(f"File Upload Error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

@app.post("/api/preview-emails")
async def preview_emails(template: EmailTemplate):
    await log_activity("Emails Previewed")
    previews = []
    
    # Use participants from request or falling back to memory
    active_participants = template.participants or participants_storage
    
    # Preview for first 5 participants
    for p in active_participants[:5]:
        try:
            preview = {
                "name": p.get("name", "Participant"),
                "email": p.get("email", ""),
                "subject": personalize_template(template.subjectTemplate, p, template.eventName),
                "body": personalize_template(template.bodyTemplate, p, template.eventName)
            }
            previews.append(preview)
        except Exception:
            continue
    
    return previews

@app.post("/api/send-bulk-emails")
async def send_bulk_emails(template: EmailTemplate):
    await log_activity("Started bulk email sending")
    
    EMAIL_USER = os.getenv("EMAIL_USER")
    EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
    
    active_participants = template.participants or participants_storage

    if not EMAIL_USER or not EMAIL_PASSWORD:
        await log_activity("Email bulk sending failed: Credentials missing")
        raise HTTPException(status_code=500, detail="EMAIL_USER or EMAIL_PASSWORD not configured")

    if not active_participants:
         raise HTTPException(status_code=400, detail="No participants uploaded")

    sent_count = 0
    failed_count = 0
    
    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        
        for p in active_participants:
            try:
                msg = MIMEMultipart()
                msg['From'] = EMAIL_USER
                msg['To'] = p.get('email', '')
                msg['Subject'] = personalize_template(template.subjectTemplate, p, template.eventName)
                
                body = personalize_template(template.bodyTemplate, p, template.eventName)
                msg.attach(MIMEText(body, 'plain'))
                
                server.send_message(msg)
                
                log_entry = {"email": p.get('email'), "status": "sent", "timestamp": datetime.now().isoformat()}
                local_email_logs.insert(0, log_entry)
                try: supabase.table("email_logs").insert(log_entry).execute()
                except: pass
                
                sent_count += 1
            except Exception as e:
                failed_count += 1
                log_entry = {"email": p.get('email'), "status": "failed", "timestamp": datetime.now().isoformat(), "error_message": str(e)}
                local_email_logs.insert(0, log_entry)
                try: supabase.table("email_logs").insert(log_entry).execute()
                except: pass
        
        server.quit()
        await log_activity(f"Bulk email completed. Sent: {sent_count}, Failed: {failed_count}")
        return {"sent": sent_count, "failed": failed_count}
        
    except Exception as e:
        await log_activity(f"SMTP Critical Failure: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/email-logs")
async def get_email_logs():
    try:
        res = supabase.table("email_logs").select("*").order("timestamp", desc=True).limit(50).execute()
        if res.data: return res.data
    except: pass
    return local_email_logs if local_email_logs else [{"email": "system", "status": "idle", "timestamp": datetime.now().isoformat()}]

@app.get("/api/agent-logs")
async def get_logs():
    try:
        res = supabase.table("agent_logs").select("*").order("timestamp", desc=True).limit(50).execute()
        if res.data: return res.data
    except: pass
    return local_logs if local_logs else [{"action": "Local Mode Active", "timestamp": datetime.now().isoformat()}]

@app.post("/api/optimize-schedule")
async def optimize_schedule_api(req: OptimizeScheduleRequest):
    """
    Direct Groq-based schedule optimizer.
    Returns: { schedule: [{session_id, start_time (ISO), end_time (ISO), room_id, has_conflict, conflict_note}], logs, summary }
    """
    await log_activity("Optimizing schedule via Scheduler Agent (Groq)")

    sessions = req.sessions
    rooms    = req.rooms
    date     = req.event_date          # e.g. "2026-03-15"
    start_h  = req.event_start_hour    # e.g. "09:00"
    end_h    = req.event_end_hour      # e.g. "18:00"

    if not sessions:
        return {"schedule": [], "logs": ["[Scheduler] No sessions to schedule."], "summary": "Nothing to schedule."}
    if not rooms:
        return {"schedule": [], "logs": ["[Scheduler] No rooms available."], "summary": "No rooms. Add rooms first."}

    def to_iso(t: str) -> str:
        """Convert HH:MM or HH:MM:SS to full ISO timestamp."""
        if not t: return ""
        if "T" in t or len(t) > 8: return t          # already ISO
        parts = t.strip().split(":")
        hh = parts[0].zfill(2)
        mm = parts[1].zfill(2) if len(parts) > 1 else "00"
        return f"{date}T{hh}:{mm}:00"

    # Build a compact session list so the LLM sees the IDs clearly
    sess_lines = "\n".join(
        f'  - id="{s.get("id","")}" title="{s.get("title","")}" duration={s.get("duration_minutes",60)}min'
        for s in sessions
    )
    room_lines = "\n".join(
        f'  - id="{r.get("id","")}" name="{r.get("name","")}"'
        for r in rooms
    )

    prompt = f"""You are an event scheduling AI. Create a conflict-free timetable.

Sessions (use EXACTLY these IDs as session_id in your response):
{sess_lines}

Rooms (use EXACTLY these IDs as room_id in your response):
{room_lines}

Rules:
- Schedule all sessions between {start_h} and {end_h} on {date}
- No two sessions can overlap in the same room
- Add a 15-minute break between consecutive sessions in the same room
- If a conflict is unavoidable, set has_conflict=true

Respond with ONLY this JSON (no extra text):
{{
  "schedule": [
    {{
      "session_id": "<exact id from sessions list above>",
      "room_id": "<exact id from rooms list above>",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "has_conflict": false,
      "conflict_note": null
    }}
  ],
  "summary": "one-line summary"
}}"""

    try:
        groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        resp = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        raw = json.loads(resp.choices[0].message.content)
    except Exception as e:
        return {"schedule": [], "logs": [f"[Scheduler] Groq error: {e}"], "summary": str(e)}

    # Accept either 'schedule' or 'sessions' key from LLM
    slots = raw.get("schedule") or raw.get("sessions") or []
    summary = raw.get("summary", f"Scheduled {len(slots)} sessions")

    # Normalise: convert HH:MM → full ISO, handle 'id' vs 'session_id'
    normalised = []
    for slot in slots:
        sid = slot.get("session_id") or slot.get("id") or ""
        st  = to_iso(slot.get("start_time", ""))
        et  = to_iso(slot.get("end_time", ""))
        if not sid or not st:
            continue
        normalised.append({
            "session_id":   sid,
            "room_id":      slot.get("room_id"),
            "start_time":   st,
            "end_time":     et,
            "has_conflict": slot.get("has_conflict", False),
            "conflict_note":slot.get("conflict_note"),
        })

    await log_activity(f"Schedule optimized: {len(normalised)} sessions placed")
    return {
        "schedule": normalised,
        "logs": [
            f"[Scheduler Agent] Processed {len(sessions)} sessions across {len(rooms)} rooms",
            f"[Scheduler Agent] {summary}",
            f"[Scheduler Agent] ✓ {len(normalised)} slots ready to write",
        ],
        "summary": summary,
    }


@app.post("/api/resolve-crisis")
async def resolve_crisis_api(req: ResolveCrisisRequest):
    await log_activity(f"Resolving crisis via Crisis Agent Crew: {req.crisis_type}")
    return resolve_crisis_workflow(
        req.crisis_type,
        req.affected_entity,
        req.sessions,
        req.rooms,
        req.speakers,
        req.event_date
    )

# ─── LangGraph-Style Swarm Orchestrator Endpoints ───────────────────────────

class OrchestratorRequest(BaseModel):
    workflow_type: str  # "crisis" | "scheduler" | "content" | "email"
    event_context: Optional[dict] = None
    schedule: Optional[dict] = None
    participants: Optional[list] = None
    crisis: Optional[dict] = None


@app.post("/api/orchestrator/run")
async def run_swarm(req: OrchestratorRequest):
    """
    Full multi-agent swarm run.
    Agents hand off tasks autonomously until workflow_complete=True.
    """
    await log_activity(f"Swarm Orchestrator: Running '{req.workflow_type}' workflow")
    try:
        initial = make_initial_state(
            workflow_type=req.workflow_type,
            event_context=req.event_context or {},
            schedule=req.schedule,
            participants=req.participants,
            crisis=req.crisis,
        )
        final_state = swarm_graph.run(initial)
        return {
            "success": True,
            "workflow_type": req.workflow_type,
            "agent_logs": final_state.get("agent_logs", []),
            "schedule": final_state.get("schedule"),
            "social_queue": final_state.get("social_queue", []),
            "crisis_resolution": final_state.get("crisis_resolution"),
            "emails_sent": len(final_state.get("email_queue", [])),
            "workflow_complete": final_state.get("workflow_complete", True),
        }
    except Exception as e:
        await log_activity(f"Swarm Orchestrator Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/orchestrator/stream")
async def stream_swarm(req: OrchestratorRequest):
    """
    SSE streaming version — yields per-agent updates in real-time.
    Powers the live log visualization in the Swarm Control Center.
    """
    await log_activity(f"Swarm Stream: '{req.workflow_type}' workflow streaming")

    initial = make_initial_state(
        workflow_type=req.workflow_type,
        event_context=req.event_context or {},
        schedule=req.schedule,
        participants=req.participants,
        crisis=req.crisis,
    )

    def event_generator():
        try:
            for update in swarm_graph.stream(initial):
                data = json.dumps(update)
                yield f"data: {data}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"
        finally:
            yield "data: {\"event\": \"stream_end\"}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.post("/api/swarm/run")
async def run_swarm_simple(request: dict):
    """
    Simplified multi-agent swarm endpoint matching the hackathon prompt spec.

    Accepts flat sessions/rooms/speakers/crisis at the top level.
    Returns rich results including execution_time, agent_logs, and final state summaries.

    Workflow types:
      - crisis   → Crisis Agent → Scheduler Agent → Email Agent
      - scheduler / schedule → Scheduler Agent → Email Agent
      - content / social → Content Agent
      - email → Email Agent
    """
    await log_activity(f"Swarm /run: '{request.get('workflow_type', 'crisis')}' workflow")
    try:
        workflow_type = request.get("workflow_type", "crisis")

        initial = make_initial_state(
            workflow_type=workflow_type,
            event_context=request.get("event_context") or {
                "name": "Tech Summit 2026",
                "date": "2026-03-15",
                "location": "Convention Center"
            },
            sessions=request.get("sessions", []),
            rooms=request.get("rooms", []),
            speakers=request.get("speakers", []),
            participants=request.get("participants"),
            crisis=request.get("crisis"),
            schedule=request.get("schedule"),
        )

        start_time = datetime.now()
        final_state = swarm_graph.run(initial)
        end_time = datetime.now()

        execution_time = (end_time - start_time).total_seconds()

        all_logs = final_state.get("agent_logs", [])
        agents_executed = len([
            l for l in all_logs
            if "Agent:" in l and "Orchestrator" not in l
        ])

        return {
            "success": True,
            "execution_time_seconds": round(execution_time, 2),
            "workflow_type": workflow_type,
            "agents_executed": max(agents_executed, 1),
            "crisis_resolved": final_state.get("crisis_resolution") is not None,
            "emails_sent": final_state.get("emails_sent", 0),
            "posts_generated": len(final_state.get("social_queue", [])),
            "schedule_updated": final_state.get("schedule") is not None,
            "agent_logs": all_logs,
            "final_state": {
                "crisis_resolution": final_state.get("crisis_resolution"),
                "schedule": final_state.get("schedule"),
                "generated_posts": final_state.get("social_queue", []),
            }
        }

    except Exception as e:
        await log_activity(f"Swarm /run Error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "agent_logs": [f"[ERROR] {str(e)}"]
        }




# ═══════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/health")
async def health_check():
    """System health check — shows which services are connected."""
    groq_ok = bool(os.getenv("GROQ_API_KEY"))
    email_ok = bool(os.getenv("EMAIL_USER") and os.getenv("EMAIL_PASSWORD"))
    supabase_ok = bool(os.getenv("VITE_SUPABASE_URL"))

    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "groq_api": "connected" if groq_ok else "missing GROQ_API_KEY",
            "email_smtp": "configured" if email_ok else "dry-run mode",
            "supabase": "connected" if supabase_ok else "missing env",
            "sqlite_auth": "ready",
            "swarm_orchestrator": "ready",
        },
        "agents": ["crisis", "scheduler", "email", "content"],
        "demo_account": "demo@eventswarm.ai / demo123",
        "version": "1.0.0-hackathon",
    }


# ═══════════════════════════════════════════════════════════════════════════════
# CSV / DATA UPLOAD ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

class BulkDataRequest(BaseModel):
    sessions: list = []
    rooms: list = []
    speakers: list = []
    participants: list = []

@app.post("/api/data/upload")
async def upload_bulk_data(req: BulkDataRequest):
    """
    Accept bulk sessions/rooms/speakers arrays (parsed from CSV on frontend)
    and upsert them into Supabase. Returns counts of uploaded records.
    """
    results = {"sessions": 0, "rooms": 0, "speakers": 0, "participants": 0, "errors": []}
    try:
        if req.sessions:
            r = supabase.table("sessions").upsert(req.sessions, on_conflict="id").execute()
            results["sessions"] = len(r.data) if r.data else 0
    except Exception as e:
        results["errors"].append(f"sessions: {e}")
    try:
        if req.rooms:
            r = supabase.table("rooms").upsert(req.rooms, on_conflict="id").execute()
            results["rooms"] = len(r.data) if r.data else 0
    except Exception as e:
        results["errors"].append(f"rooms: {e}")
    try:
        if req.speakers:
            r = supabase.table("speakers").upsert(req.speakers, on_conflict="id").execute()
            results["speakers"] = len(r.data) if r.data else 0
    except Exception as e:
        results["errors"].append(f"speakers: {e}")
    try:
        if req.participants:
            r = supabase.table("participants").upsert(req.participants, on_conflict="id").execute()
            results["participants"] = len(r.data) if r.data else 0
    except Exception as e:
        results["errors"].append(f"participants: {e}")

    return {"success": len(results["errors"]) == 0, **results}


# ═══════════════════════════════════════════════════════════════════════════════
# AI EXTRACTION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

from ai.extraction import EventDataExtractor, merge_answers_into_data, validate_event_data

class ExtractRequest(BaseModel):
    text: str

@app.post("/api/events/extract")
async def extract_event_data(req: ExtractRequest):
    await log_activity("Extracting event data from text")
    
    extractor = EventDataExtractor(model="llama2")
    
    try:
        extracted_data = extractor.extract_from_text(req.text)
        
        if "error" in extracted_data:
            return {
                "success": False,
                "error": extracted_data["error"],
                "details": extracted_data.get("details", "")
            }
        
        issues = []
        
        event_info = extracted_data.get("event", {})
        if not event_info.get("name"):
            issues.append("Missing event name")
        if not event_info.get("start_date"):
            issues.append("Missing event start date")
            
        rooms = extracted_data.get("rooms", [])
        if not rooms:
            issues.append("No rooms found")
        else:
            for r in rooms:
                if not r.get("capacity"):
                    issues.append(f"Room capacity not specified for {r.get('name', 'a room')}")
                    
        speakers = extracted_data.get("speakers", [])
        if not speakers:
            issues.append("No speakers found")
        else:
            for s in speakers:
                if not s.get("email"):
                    issues.append(f"Missing speaker emails for {s.get('name', 'a speaker')}")
                    
        sessions = extracted_data.get("sessions", [])
        if not sessions:
            issues.append("No sessions found")
            
        # Generate clarifying questions
        clarifying_questions = extractor.generate_clarifying_questions(extracted_data)
        
        return {
            "success": True,
            "extracted_data": extracted_data,
            "issues": issues,
            "clarifying_questions": clarifying_questions,
            "needs_clarification": len(clarifying_questions) > 0
        }
    except Exception as e:
        await log_activity(f"Event Extraction Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

@app.post("/api/events/apply")
async def apply_extracted_data(request: dict):
    """
    Apply extracted event data to the system.
    Merges clarifying question answers and creates the event.
    """
    await log_activity("Applying extracted data and user answers")
    
    extracted_data = request.get("extracted_data", {})
    answers = request.get("answers", {})
    questions = request.get("questions", [])
    
    # Merge answers back into extracted data
    merged_data = merge_answers_into_data(extracted_data, answers, questions)
    
    # Validate merged data
    validation_errors = validate_event_data(merged_data)
    if validation_errors:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Data validation failed",
                "errors": validation_errors
            }
        )
    
    # Save to database or state (for now, just return success)
    # Integrating with swarm state management in later phases
    event_id = f"event_{datetime.now().timestamp()}"
    
    return {
        "success": True,
        "event_id": event_id,
        "message": "Event created successfully",
        "data": merged_data,
        "stats": {
            "sessions_created": len(merged_data.get("sessions", [])),
            "rooms_created": len(merged_data.get("rooms", [])),
            "speakers_created": len(merged_data.get("speakers", [])),
            "crises_detected": len(merged_data.get("crises", []))
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

