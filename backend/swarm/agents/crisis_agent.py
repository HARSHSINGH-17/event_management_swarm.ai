import os
import json
from datetime import datetime
from groq import Groq

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def crisis_agent(state: dict) -> dict:
    """
    Handles event crises and coordinates multi-agent response.
    Analyzes the crisis, produces a resolution plan, and auto-triggers
    scheduler and/or email agents as needed.

    Input state keys read:  active_crisis, sessions, rooms, speakers, event_context
    Output state keys set:  crisis_resolution, email_queue, next_agent, schedule_changes, agent_logs
    """
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [Crisis Agent] Analyzing crisis...")

    crisis = state.get("active_crisis") or state.get("crisis")
    if not crisis:
        return {
            "workflow_complete": True,
            "agent_logs": [f"[{ts}] Crisis Agent: No active crisis found. Done."]
        }

    crisis_type = crisis.get("type", "unknown")
    affected_entity = crisis.get("affected_entity", {})

    # Read sessions/rooms/speakers from top-level state (preferred) or fallback to nested schedule
    sessions = state.get("sessions") or state.get("schedule", {}).get("sessions", []) if state.get("schedule") else state.get("sessions", [])
    rooms = state.get("rooms") or state.get("schedule", {}).get("rooms", []) if state.get("schedule") else state.get("rooms", [])
    speakers = state.get("speakers") or state.get("participants") or []
    event_date = state.get("event_context", {}).get("date", "the event day")

    crisis_desc = {
        "speaker_cancellation": f"Speaker '{affected_entity.get('name', 'Unknown')}' (id: {affected_entity.get('id')}) has cancelled.",
        "session_delay": f"Session '{affected_entity.get('title', 'Unknown')}' is delayed by {affected_entity.get('delay_minutes', 30)} minutes.",
        "room_unavailability": f"Room '{affected_entity.get('name', 'Unknown')}' is no longer available.",
    }.get(crisis_type, f"Unknown crisis: {crisis_type}")

    prompt = f"""
You are a crisis management AI agent. An emergency has occurred at an event.

CRISIS: {crisis_desc}
Event Date: {event_date}

Current Sessions:
{json.dumps(sessions, indent=2) if sessions else "No sessions provided"}

Available Rooms:
{json.dumps(rooms, indent=2) if rooms else "No rooms provided"}

Your mission:
1. Analyze the full impact of this crisis.
2. Propose clear resolution actions (reschedule, cancel, relocate, etc.).
3. Identify which agents to notify: "scheduler" (if schedule needs recalculation), "email" (if participants need notification).
4. List affected participants who need email notifications.

Return ONLY this JSON:
{{
  "analysis": "Clear description of impact",
  "resolution_actions": [
    {{"action": "reschedule_session", "session_id": "...", "note": "Move to Room B at 2 PM"}}
  ],
  "notify_agents": ["scheduler", "email"],
  "affected_participants": [
    {{"email": "...", "name": "..."}}
  ],
  "notifications": [
    {{"type": "schedule_change", "message": "Session X moved to Room B", "affected_sessions": ["session_id"]}}
  ],
  "logs": ["[Crisis Agent] Impact analyzed", "[Crisis Agent] Proposed reschedule of 2 sessions"]
}}
"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)
    except Exception as e:
        return {
            "agent_logs": [f"[{ts}] Crisis Agent ERROR: {e}"],
            "workflow_complete": True
        }

    new_logs = [f"[{ts}] Crisis Agent: {result.get('analysis', 'Crisis analyzed')}"] + result.get("logs", [])
    partial = {
        "crisis_resolution": result,
        "agent_logs": new_logs,
    }

    notify = result.get("notify_agents", [])
    affected_participants = result.get("affected_participants", [])
    resolution_actions = result.get("resolution_actions", [])

    # Store resolution actions as schedule_changes for the scheduler agent
    if resolution_actions:
        partial["schedule_changes"] = resolution_actions

    # Queue emails
    if affected_participants:
        partial["email_queue"] = [{
            "type": "crisis_notification",
            "recipients": affected_participants,
            "template": "crisis_update",
        }]

    # Determine routing — scheduler gets priority, email happens after
    if "scheduler" in notify:
        partial["next_agent"] = "scheduler"
        new_logs.append(f"[{ts}] Crisis Agent → Scheduler Agent: re-optimizing schedule ({len(resolution_actions)} actions)")
        # Inject action hints into schedule state for scheduler
        sched = state.get("schedule") or {}
        partial["schedule"] = {**sched, "crisis_actions": resolution_actions}
    elif "email" in notify and affected_participants:
        partial["next_agent"] = "email"
        new_logs.append(f"[{ts}] Crisis Agent → Email Agent: notifying {len(affected_participants)} participants")
    else:
        partial["workflow_complete"] = True
        new_logs.append(f"[{ts}] Crisis Agent: Crisis resolved, no further action needed")

    return partial
