# Smart Event Creator – Guide

## Overview

The **Smart Event Creator** lets you create fully structured event data using plain English. Instead of filling out forms or uploading CSVs, simply describe your event and let AI extract all the details.

---

## How It Works

### Step 1 – Describe Your Event
Paste or type your event description in the text area. You can include:
- Event name, dates and location
- Room names and capacities
- Session schedules with times, speakers, and durations
- Speaker names, emails, and affiliations
- Known crises or conflicts (prefix with `CRISIS:`)

### Step 2 – Extract Data
Click **Extract Data**. The AI analyses your text and extracts:
- Structured event metadata
- Individual rooms and capacities
- Session schedule entries
- Speaker contact details
- Crisis/conflict flags

### Step 3 – Answer Clarifying Questions *(optional)*
If the AI identifies missing information (e.g. a speaker without an email, or a session without a start time), it asks targeted questions. Answer them to enrich the data before creating the event.

### Step 4 – Review & Apply
Review the extracted data, verify everything looks correct, then click **Confirm & Create Event**.

### Step 5 – Go to Swarm Control
After the event is created, click **Go to Swarm Control**. The swarm agents receive the imported event context and are immediately ready to:
- Resolve detected crises autonomously
- Optimise the session schedule
- Send personalised email notifications
- Generate social media content

---

## Quick-Start Templates

Four realistic templates are available to demo the full flow in seconds:

| Template | Description |
|---|---|
| 💻 **Tech Conference** | 3-day developer conference – 10 sessions, 5 rooms, 7 speakers, 1 crisis |
| 💍 **Wedding Reception** | Elegant ceremony and reception – 9 schedule items, 4 venues, vendor contacts, 1 crisis |
| 🎵 **Music Festival** | 2-day outdoor festival – 12 performances, 5 stages, 10 artists, 1 crisis |
| 🏢 **Corporate Summit** | Executive leadership summit – 12 sessions, 5 meeting rooms, 6 speakers, 1 crisis |

---

## Crisis Detection

Any text prefixed with `CRISIS:` is automatically flagged as a crisis event. Detected crises are:
1. Displayed in the Review step under "Crises Detected"
2. Passed to the **Crisis Agent** in Swarm Control as pending tasks
3. Triggerable via the "Crisis Response" simulation scenario

---

## Demo Script (30 seconds)

> *"Instead of forms or CSVs, watch this…"*

1. Click **"Tech Conference"** template — AI template loads a realistic 3-day conference
2. Click **"Extract Data"** — 3 seconds processing
3. *"AI found: 10 sessions, 5 rooms, 7 speakers, 1 crisis"*
4. Answer 1–2 questions if shown — *"AI asks intelligent questions for missing details"*
5. Click **Review → Confirm & Create Event** — *"Event created and ready for autonomous agents"*
6. Click **Go to Swarm Control** — *"Now watch agents resolve the crisis autonomously"*

---

## Swarm State Format

When an event is applied, the backend converts it into a **swarm state** object that bootstraps all agents:

```json
{
  "event_id": "event_1234567890",
  "event": { "name": "TechSummit 2024", "start_date": "2024-03-15", ... },
  "sessions": [ { "title": "Opening Keynote", "speaker_name": "Dr. Sarah Chen", ... } ],
  "rooms": [ { "name": "Grand Ballroom", "capacity": 600 } ],
  "speakers": [ { "name": "Dr. Sarah Chen", "email": "sarah.chen@google.com" } ],
  "crises": [ { "id": "crisis_0", "type": "speaker_cancellation", "status": "pending" } ],
  "agent_contexts": {
    "orchestrator": { "total_sessions": 10, "open_crises": 1 },
    "crisis": { "pending_tasks": [...] },
    "scheduler": { "sessions": [...], "rooms": [...] },
    "email": { "speakers": [...], "event_name": "TechSummit 2024" }
  }
}
```

---

## Architecture

```
User Input (plain text)
       │
       ▼
Backend: /api/events/extract
  └─ EventDataExtractor (LLM)
  └─ Clarifying question generator
       │
       ▼
Frontend: Review & answer questions
       │
       ▼
Backend: /api/events/apply
  └─ merge_answers_into_data()
  └─ validate_event_data()
  └─ build_swarm_state()        ← converts to agent-ready format
       │
       ▼
Swarm Control: agents receive importedEvent via React Router state
  ├─ Crisis Agent   → resolves detected crises
  ├─ Scheduler      → optimises session timeline
  ├─ Email Agent    → sends notifications
  └─ Analytics      → tracks outcomes
```
