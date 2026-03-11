import json
import os
from orchestrator.crew_shim import Task, Crew, Process
from agents.agent_definitions import (
    create_content_agent,
    create_email_agent,
    create_scheduler_agent,
    create_crisis_agent,
    create_analytics_agent
)
from pydantic import BaseModel
from typing import List, Optional

# --- Pydantic Output Models ---

class SocialMediaOutput(BaseModel):
    LinkedIn: str
    Twitter_X: str  # Pydantic prefers underscores instead of slashes
    Instagram: str
    hashtags: List[str]

class ScheduleSession(BaseModel):
    session_id: str
    start_time: str
    end_time: str
    room_id: str
    has_conflict: bool
    conflict_note: Optional[str] = None

class ScheduleOutput(BaseModel):
    schedule: List[ScheduleSession]
    logs: List[str]
    summary: str

class CrisisAction(BaseModel):
    session_id: str
    action: str
    new_start_time: Optional[str] = None
    new_end_time: Optional[str] = None
    new_room_id: Optional[str] = None
    note: str

class CrisisNotification(BaseModel):
    type: str
    message: str
    affected_sessions: List[str]

class CrisisOutput(BaseModel):
    analysis: str
    actions: List[CrisisAction]
    notifications: List[CrisisNotification]
    logs: List[str]

# --- Orchestrator Workflows ---

def generate_social_content_workflow(event_data: dict) -> dict:
    """Uses the Content Agent to write highly engaging event posts."""
    agent = create_content_agent()
    
    prompt = f"""
    Create 3 LONG-FORM, high-value posts for:
    
    EVENT: {event_data.get('eventName')}
    THEME: {event_data.get('theme')}
    DATE: {event_data.get('date')}
    LOCATION: {event_data.get('location')}
    DESCRIPTION: {event_data.get('description')}
    
    STRICT FORMATTING RULES:
    1. LinkedIn: 500+ words. Professional tone. Include Hook, Story, Key Takeaways, Logistics, and CTA.
    2. Instagram: 300+ words. Story-driven. Detailed emoji use. Logistics and CTA.
    3. Twitter/X: 150+ words single post. High energy.
    4. hashtags: 15-20 trending tags.
    """
    
    task = Task(
        description=prompt,
        expected_output="JSON object with keys: LinkedIn, Twitter_X, Instagram, hashtags.",
        agent=agent,
        output_json=SocialMediaOutput
    )
    
    crew = Crew(
        agents=[agent],
        tasks=[task],
        process=Process.sequential,
        verbose=True
    )
    
    try:
        result = crew.kickoff()
        return result
    except Exception as e:
        print(f"CrewAI Social Media Error: {e}")
        return {}


def optimize_schedule_workflow(sessions: list, rooms: list, start_hour: str, end_hour: str, date: str) -> dict:
    """Uses the Scheduler Agent to output an optimal JSON calendar."""
    agent = create_scheduler_agent()
    
    session_list = "\n".join([f"- '{s.get('title')}' ({s.get('duration_minutes')}min) by {s.get('speaker_name', 'TBD')}, session_id: {s.get('id')}, speaker_id: {s.get('speaker_id')}, room_id: {s.get('room_id')}" for s in sessions])
    room_list = "\n".join([f"- '{r.get('name')}' (id: {r.get('id')})" for r in rooms])
    
    prompt = f"""
    Given a list of sessions and available rooms, generate a conflict-free schedule.
    Rules:
    - No two sessions in the same room can overlap
    - No speaker can be in two sessions at the same time
    - Sessions should be scheduled between {start_hour} and {end_hour} on {date}.
    - Add short breaks between sessions (15 min)
    - If conflicts are unavoidable, flag them.

    Sessions:
    {session_list}

    Rooms:
    {room_list}
    """
    
    task = Task(
        description=prompt,
        expected_output="JSON structure conforming to ScheduleOutput containing schedule array, logs, and a summary.",
        agent=agent,
        output_json=ScheduleOutput
    )
    
    crew = Crew(
        agents=[agent],
        tasks=[task],
        process=Process.sequential,
        verbose=True
    )
    
    try:
        result = crew.kickoff()
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"CrewAI Scheduler Error: {e}")
        return {
            "schedule": [],
            "logs": [f"[Scheduler Agent] Failed: {e}"],
            "summary": "Could not generate schedule via Crew."
        }


def resolve_crisis_workflow(crisis_type: str, affected_entity: dict, sessions: list, rooms: list, speakers: list, date: str) -> dict:
    """Uses the Crisis Agent to intelligently reschedule events around disruptions."""
    agent = create_crisis_agent()
    scheduler = create_scheduler_agent() # Optional backup for crew routing
    
    session_list = "\n".join([f"- '{s.get('title')}' (id: {s.get('id')}) | Speaker: {s.get('speaker_name', 'TBD')} | Room: {s.get('room_name')} | Time: {s.get('start_time')} to {s.get('end_time')} | Duration: {s.get('duration_minutes')}min" for s in sessions])
    room_list = "\n".join([f"- '{r.get('name')}' (id: {r.get('id')})" for r in rooms])
    speaker_list = "\n".join([f"- '{sp.get('name')}' (id: {sp.get('id')})" for sp in speakers])
    
    crisis_descriptions = {
        "speaker_cancellation": f"CRISIS: Speaker '{affected_entity.get('name')}' (id: {affected_entity.get('id')}) has cancelled.",
        "session_delay": f"CRISIS: Session '{affected_entity.get('title')}' (id: {affected_entity.get('id')}) is delayed by {affected_entity.get('delay_minutes', 30)} minutes.",
        "room_unavailability": f"CRISIS: Room '{affected_entity.get('name')}' (id: {affected_entity.get('id')}) is no longer available."
    }
    
    prompt = f"""
    {crisis_descriptions.get(crisis_type, 'Unknown crisis')}
    Event Date: {date}

    Sessions:
    {session_list}

    Rooms:
    {room_list}

    Speakers:
    {speaker_list}

    Analyze the impact, propose a corrected schedule resolving the crisis with minimal disruption, and identify who to notify.
    """
    
    task = Task(
        description=prompt,
        expected_output="JSON structure conforming to CrisisOutput: analysis, array of actions, array of notifications, and logs.",
        agent=agent,
        output_json=CrisisOutput
    )
    
    crew = Crew(
        agents=[agent, scheduler], # Swarm logic kicks in if agent delegates
        tasks=[task],
        process=Process.sequential,
        verbose=True
    )
    
    try:
        result = crew.kickoff()
        return result
    except Exception as e:
        print(f"CrewAI Crisis Error: {e}")
        return {
            "analysis": "Error parsing output from Swarm",
            "actions": [],
            "notifications": [],
            "logs": [f"Failed: {e}"]
        }
