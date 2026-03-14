import json
import logging
import requests
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class EventDataExtractor:
    """
    Extracts structured event data from natural language text using Ollama LLM.
    """
    def __init__(self, model: str = "llama2", api_url: str = "http://localhost:11434/api/generate"):
        self.model = model
        self.api_url = api_url

    def _build_prompt(self, text: str) -> str:
        return f"""You are an AI data extraction assistant. Your task is to extract structured information from the following natural language text.
You MUST extract events, rooms, sessions, speakers, and crises if present.
For every single extracted item, you MUST include a "confidence" score between 0.0 and 1.0 based on how explicitly the information was stated.

Return ONLY a valid JSON object matching this exact schema. Do not include any explanations, markdown blocks, or extra text before or after the JSON.

EXPECTED JSON SCHEMA:
{{
  "event": {{"name": "...", "start_date": "YYYY-MM-DD", "confidence": 0.0-1.0}},
  "rooms": [{{"id": "...", "name": "...", "capacity": 0, "confidence": 0.0-1.0}}],
  "sessions": [{{"title": "...", "speaker_name": "...", "confidence": 0.0-1.0}}],
  "speakers": [{{"name": "...", "email": "...", "confidence": 0.0-1.0}}],
  "crises": [{{"description": "...", "confidence": 0.0-1.0}}]
}}

TEXT TO EXTRACT FROM:
{text}
"""

    def _clean_json_response(self, text: str) -> str:
        """
        Cleans the LLM response to ensure we have a valid JSON string 
        by stripping markdown formatting and finding the outermost JSON structure.
        """
        cleaned = text.strip()
        
        # Remove markdown ticks if present
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
            
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
            
        cleaned = cleaned.strip()
        
        # Try to find the outermost JSON object bounds
        start_idx = cleaned.find('{')
        end_idx = cleaned.rfind('}')
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            cleaned = cleaned[start_idx:end_idx+1]
            
        return cleaned

    def extract_from_text(self, text: str) -> Dict[str, Any]:
        """
        Extracts information from text and returns a structured dictionary.
        """
        prompt = self._build_prompt(text)
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False
        }
        
        try:
            logger.info(f"Sending extraction request to Ollama using model {self.model}")
            response = requests.post(self.api_url, json=payload, timeout=60)
            response.raise_for_status()
            result = response.json()
            
            raw_response = result.get("response", "")
            
            if not raw_response:
                return {
                    "error": "Empty response received from Ollama model."
                }
                
            cleaned_json_str = self._clean_json_response(raw_response)
            
            try:
                parsed_json = json.loads(cleaned_json_str)
                return parsed_json
            except json.JSONDecodeError as de:
                logger.error(f"Failed to parse JSON. Cleaned response: {cleaned_json_str}")
                return {
                    "error": "Failed to parse JSON from LLM response",
                    "details": str(de),
                    "raw_response": raw_response
                }
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to connect to Ollama: {e}")
            return {
                "error": "Failed to connect to Ollama API. Ensure Ollama is running correctly.",
                "details": str(e)
            }
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return {
                "error": "An unexpected error occurred during extraction.",
                "details": str(e)
            }

    def generate_clarifying_questions(self, extracted_data: dict) -> list[dict]:
        """
        Analyze extracted data and generate intelligent clarifying questions.
        """
        questions = []
        
        # 1. Check Event Metadata
        event = extracted_data.get("event", {})
        if not event.get("name"):
            questions.append({
                "question": "What is the name of your event?",
                "field": "event_name",
                "entity_type": "event",
                "entity_id": "main_event",
                "priority": "critical"
            })
        
        if not event.get("end_date") and event.get("start_date"):
            questions.append({
                "question": f"Your event starts on {event.get('start_date')}. When does it end?",
                "field": "event_end_date",
                "entity_type": "event",
                "entity_id": "main_event",
                "priority": "high"
            })
        
        # 2. Check Speaker Details
        speakers = extracted_data.get("speakers", [])
        for speaker in speakers:
            if not speaker.get("email"):
                questions.append({
                    "question": f"What is the email address for {speaker.get('name', 'the speaker')}?",
                    "field": "speaker_email",
                    "entity_type": "speaker",
                    "entity_id": speaker.get("id"),
                    "priority": "high"
                })
            
            if not speaker.get("affiliation"):
                questions.append({
                    "question": f"Which organization/company is {speaker.get('name', 'the speaker')} affiliated with?",
                    "field": "speaker_affiliation",
                    "entity_type": "speaker",
                    "entity_id": speaker.get("id"),
                    "priority": "medium"
                })
        
        # 3. Check Room Utilization
        rooms = extracted_data.get("rooms", [])
        sessions = extracted_data.get("sessions", [])
        
        if rooms:
            room_ids_used = set(s.get("room_id") for s in sessions if s.get("room_id"))
            unused_rooms = [r for r in rooms if r.get("id") not in room_ids_used]
            
            # NOTE: For natural language extraction where IDs may not be perfectly linked right away,
            # this might falsely flag a lot. But we honor the requirement:
            if unused_rooms and len(unused_rooms) <= 3:
                room_names = ", ".join(r.get("name", "Unknown") for r in unused_rooms)
                questions.append({
                    "question": f"These rooms aren't assigned to any sessions: {room_names}. Would you like to add sessions for them?",
                    "field": "room_utilization",
                    "entity_type": "room",
                    "entity_id": None,
                    "priority": "low",
                    "suggested_answer": "No, these are backup/overflow rooms"
                })
        
        # 4. Check Date Coverage
        if event.get("start_date") and event.get("end_date"):
            from datetime import datetime
            try:
                start = datetime.strptime(event["start_date"], "%Y-%m-%d")
                end = datetime.strptime(event["end_date"], "%Y-%m-%d")
                expected_days = (end - start).days + 1
                
                session_days = set(s.get("day") for s in sessions if s.get("day"))
                
                # Only ask if we actually detected day mappings and there's a mismatch
                if session_days and len(session_days) < expected_days:
                    questions.append({
                        "question": f"Your event runs for {expected_days} days, but I only found sessions for {len(session_days)} day(s). Are sessions missing for some days?",
                        "field": "session_coverage",
                        "entity_type": "session",
                        "entity_id": None,
                        "priority": "medium"
                    })
            except:
                pass
        
        # 5. Check Low Confidence Items
        all_items = []
        if event:
             all_items.append(("event", event))
        all_items.extend([("room", r) for r in rooms])
        all_items.extend([("session", s) for s in sessions])
        all_items.extend([("speaker", sp) for sp in speakers])
        
        for entity_type, item in all_items:
            confidence = item.get("confidence", 1.0)
            if confidence < 0.7:
                item_name = item.get("name") or item.get("title") or "unknown"
                questions.append({
                    "question": f"I'm not very confident about the details for {entity_type} '{item_name}' (confidence: {confidence:.0%}). Can you provide more information?",
                    "field": f"{entity_type}_details",
                    "entity_type": entity_type,
                    "entity_id": item.get("id"),
                    "priority": "medium"
                })
        
        # 6. Check Session Timing
        for session in sessions:
            if not session.get("start_time"):
                questions.append({
                    "question": f"What time does '{session.get('title', 'the session')}' start?",
                    "field": "session_start_time",
                    "entity_type": "session",
                    "entity_id": session.get("id"),
                    "priority": "high"
                })
            
            if not session.get("duration_minutes"):
                questions.append({
                    "question": f"How long is '{session.get('title', 'the session')}' (in minutes)?",
                    "field": "session_duration",
                    "entity_type": "session",
                    "entity_id": session.get("id"),
                    "priority": "medium"
                })
        
        # Sort by priority
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        questions.sort(key=lambda q: priority_order.get(q.get("priority", "medium"), 99))
        
        return questions

def merge_answers_into_data(extracted_data: dict, answers: dict, questions: list) -> dict:
    """
    Merge user-provided answers back into the extracted data structure.
    """
    merged = extracted_data.copy()
    
    for question_idx_str, answer in answers.items():
        question_idx = int(question_idx_str)
        if question_idx >= len(questions):
            continue
        
        question = questions[question_idx]
        field = question.get("field")
        entity_type = question.get("entity_type")
        entity_id = question.get("entity_id")
        
        # Apply answer based on field type
        if field == "event_name":
            merged.setdefault("event", {})["name"] = answer
        
        elif field == "event_end_date":
            merged.setdefault("event", {})["end_date"] = answer
        
        elif field == "speaker_email":
            # Find speaker by ID and update email
            speakers = merged.get("speakers", [])
            for speaker in speakers:
                if speaker.get("id") == entity_id:
                    speaker["email"] = answer
                    break
        
        elif field == "speaker_affiliation":
            speakers = merged.get("speakers", [])
            for speaker in speakers:
                if speaker.get("id") == entity_id:
                    speaker["affiliation"] = answer
                    break
        
        elif field == "session_start_time":
            sessions = merged.get("sessions", [])
            for session in sessions:
                if session.get("id") == entity_id:
                    session["start_time"] = answer
                    break
        
        elif field == "session_duration":
            sessions = merged.get("sessions", [])
            for session in sessions:
                if session.get("id") == entity_id:
                    try:
                        session["duration_minutes"] = int(answer)
                    except ValueError:
                        pass
                    break
    
    return merged


def validate_event_data(data: dict) -> list[str]:
    """
    Validate that event data is complete enough to create an event.
    Returns list of validation errors (empty if valid).
    """
    errors = []
    
    # Check event metadata
    event = data.get("event", {})
    if not event.get("name"):
        errors.append("Event name is required")
    if not event.get("start_date"):
        errors.append("Event start date is required")
    
    # Check we have at least some data
    if not data.get("sessions"):
        errors.append("At least one session is required")
    if not data.get("rooms"):
        errors.append("At least one room is required")
    
    # Check critical speaker info
    speakers = data.get("speakers", [])
    for speaker in speakers:
        if not speaker.get("email"):
            errors.append(f"Email required for speaker: {speaker.get('name', 'Unknown')}")
    
    return errors
