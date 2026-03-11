import os
import json
from datetime import datetime
from groq import Groq

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def scheduler_agent(state: dict) -> dict:
    """
    Schedules sessions and detects conflicts.
    If schedule changes affect participants → auto-triggers email agent.
    
    Input state keys read:  sessions, rooms, schedule, schedule_changes, event_context
    Output state keys set:  schedule, generated_posts, email_queue, next_agent, workflow_complete, agent_logs
    """
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [Scheduler Agent] Processing schedule optimization...")

    # Read sessions/rooms from top-level state (preferred) or nested schedule dict
    sched = state.get("schedule") or {}
    sessions = state.get("sessions") or sched.get("sessions", [])
    rooms = state.get("rooms") or sched.get("rooms", [])
    schedule_changes = state.get("schedule_changes") or sched.get("crisis_actions", [])

    if not sessions:
        return {
            "workflow_complete": True,
            "agent_logs": [f"[{ts}] Scheduler: No sessions to schedule. Done."]
        }

    event_date = state.get("event_context", {}).get("date", "the event day")
    start_hour = sched.get("start_hour", "09:00")
    end_hour = sched.get("end_hour", "18:00")

    changes_section = ""
    if schedule_changes:
        changes_section = f"\nRequired crisis resolution changes to apply:\n{json.dumps(schedule_changes, indent=2)}\n"

    prompt = f"""
You are a scheduling AI agent. Your job is to create a conflict-free timetable.

Sessions to schedule:
{json.dumps(sessions, indent=2)}

Available rooms:
{json.dumps(rooms, indent=2)}
{changes_section}
Rules:
1. No two sessions in the same room can overlap.
2. No speaker can be in two sessions simultaneously.
3. Add 15-minute breaks between consecutive sessions.
4. All sessions must be scheduled between {start_hour} and {end_hour} on {event_date}.
5. If a conflict is truly unavoidable, flag it with has_conflict=true.
6. Apply all required crisis resolution changes listed above.

Return ONLY this JSON:
{{
  "schedule": [
    {{"session_id": "...", "room_id": "...", "start_time": "HH:MM", "end_time": "HH:MM", "has_conflict": false, "conflict_note": null}}
  ],
  "conflicts_found": false,
  "conflicts_resolved": 0,
  "affected_participants": [],
  "summary": "One-line summary of the schedule produced"
}}
"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)
    except Exception as e:
        return {
            "agent_logs": [f"[{ts}] Scheduler ERROR: {e}"],
            "workflow_complete": True
        }

    optimized = result.get("schedule", [])
    conflicts_resolved = result.get("conflicts_resolved", 0)
    summary = result.get("summary", f"Generated schedule for {len(optimized)} sessions")

    new_logs = [
        f"[{ts}] Scheduler Agent: {summary} ({len(optimized)} sessions scheduled, {conflicts_resolved} conflicts resolved)",
    ]
    partial = {
        "schedule": {**sched, "optimized": optimized},
        "generated_posts": optimized,  # alias so /api/swarm/run can report schedule_updated
        "agent_logs": new_logs,
    }

    affected = result.get("affected_participants", [])
    if affected:
        partial["email_queue"] = [{
            "type": "schedule_update",
            "recipients": affected,
            "template": "schedule_change",
        }]
        partial["next_agent"] = "email"
        partial["agent_logs"] = new_logs + [
            f"[{ts}] Scheduler Agent → Email Agent: notifying {len(affected)} participants"
        ]
    else:
        partial["workflow_complete"] = True
        partial["agent_logs"] = new_logs + [
            f"[{ts}] Scheduler Agent: Optimization complete, no participant notifications needed"
        ]

    return partial
