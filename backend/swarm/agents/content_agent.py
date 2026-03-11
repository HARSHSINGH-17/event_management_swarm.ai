import os
import json
from datetime import datetime
from groq import Groq

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def content_agent(state: dict) -> dict:
    """
    Generates social media content with optimal posting recommendations.
    
    Input state keys read:  event_context
    Output state keys set:  social_queue, workflow_complete, agent_logs
    """
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [Content Agent] Generating social media content...")

    event = state.get("event_context", {})
    if not event.get("name"):
        return {
            "workflow_complete": True,
            "agent_logs": [f"[{ts}] Content Agent: No event context provided. Skipping."]
        }

    prompt = f"""
You are a social media content AI agent. Generate viral, high-engagement posts for this event.

Event Name: {event.get('name', 'Tech Event')}
Date: {event.get('date', 'TBD')}
Location: {event.get('location', 'TBD')}
Theme: {event.get('theme', 'Technology & Innovation')}
Description: {event.get('description', 'An exciting tech event')}

Create posts for LinkedIn, Twitter/X, and Instagram. For each post include:
- Engaging caption (LinkedIn 300+ words, Twitter 280 chars max, Instagram 200+ words)
- Relevant hashtags (10-15)
- Recommended posting time based on typical platform engagement patterns
- One-line reasoning for the timing

Return ONLY this JSON:
{{
  "posts": [
    {{
      "platform": "LinkedIn",
      "caption": "...",
      "hashtags": ["#tech", "#ai"],
      "recommended_time": "09:00 AM",
      "reasoning": "Weekday morning posts perform best on LinkedIn"
    }},
    {{
      "platform": "Twitter/X",
      "caption": "...",
      "hashtags": ["#TechSummit"],
      "recommended_time": "12:00 PM",
      "reasoning": "Lunch hour sees peak Twitter engagement"
    }},
    {{
      "platform": "Instagram",
      "caption": "...",
      "hashtags": ["#event", "#tech"],
      "recommended_time": "06:00 PM",
      "reasoning": "Evening posts get highest Instagram reach"
    }}
  ],
  "summary": "Generated 3 posts with optimal scheduling"
}}
"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)
    except Exception as e:
        return {
            "agent_logs": [f"[{ts}] Content Agent ERROR: {e}"],
            "workflow_complete": True
        }

    posts = result.get("posts", [])
    summary = result.get("summary", f"Generated {len(posts)} posts")

    return {
        "social_queue": posts,
        "workflow_complete": True,
        "agent_logs": [
            f"[{ts}] Content Agent: {summary}",
            *[f"[{ts}] Content Agent → {p['platform']}: post at {p.get('recommended_time')} ({p.get('reasoning', '')})"
              for p in posts]
        ],
    }
