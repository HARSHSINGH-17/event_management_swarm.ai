"""
Test script for the Swarm Orchestrator.
Run from backend/ directory:
    python test_orchestrator.py

Tests:
1. Scheduler → Email chain (schedule with affected participants)
2. Crisis → Scheduler → Email chain (full multi-agent cascade)
3. Content generation workflow
"""

import os
import sys
from dotenv import load_dotenv

# Load env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from swarm.orchestrator import swarm
from swarm.state import make_initial_state


def test_scheduler_email_chain():
    """Test Case 1: Schedule change → auto email."""
    print("\n" + "="*60)
    print("Test 1: Scheduler → Email Chain")
    print("="*60)

    initial = make_initial_state(
        workflow_type="scheduler",
        event_context={"name": "AI Hackathon 2026", "date": "2026-03-20"},
        schedule={
            "sessions": [
                {"id": "s1", "title": "Intro to AI", "speaker_name": "Dr. Smith", "duration_minutes": 60},
                {"id": "s2", "title": "ML Workshop", "speaker_name": "Dr. Jane", "duration_minutes": 90}
            ],
            "rooms": [
                {"id": "r1", "name": "Main Hall"},
                {"id": "r2", "name": "Lab Room A"}
            ],
            "start_hour": "09:00",
            "end_hour": "18:00"
        }
    )

    final_state = swarm.run(initial)

    print("\n✅ Workflow complete!")
    print(f"  Schedule generated: {bool(final_state.get('schedule'))}")
    print(f"  Workflow complete: {final_state.get('workflow_complete')}")
    print("\nAgent Logs:")
    for log in final_state.get("agent_logs", []):
        print(f"  {log}")

    assert final_state["workflow_complete"] == True
    print("\n✅ Test 1 PASSED")
    return final_state


def test_crisis_chain():
    """Test Case 2: Crisis → Scheduler → Email cascade."""
    print("\n" + "="*60)
    print("Test 2: Crisis → Scheduler → Email Chain")
    print("="*60)

    initial = make_initial_state(
        workflow_type="crisis",
        event_context={"name": "Tech Summit 2026", "date": "2026-03-20"},
        schedule={
            "sessions": [
                {"id": "s1", "title": "Keynote by Dr. Smith", "speaker_name": "Dr. Smith", "duration_minutes": 60},
                {"id": "s2", "title": "Panel Discussion", "speaker_name": "Dr. Smith", "duration_minutes": 45}
            ],
            "rooms": [{"id": "r1", "name": "Auditorium"}, {"id": "r2", "name": "Room B"}]
        },
        crisis={
            "type": "speaker_cancellation",
            "affected_entity": {"id": "spk1", "name": "Dr. Smith"}
        }
    )

    final_state = swarm.run(initial)

    print("\n✅ Workflow complete!")
    print(f"  Crisis resolved: {bool(final_state.get('crisis_resolution'))}")
    print(f"  Analysis: {final_state.get('crisis_resolution', {}).get('analysis', 'N/A')[:100]}...")
    print(f"  Workflow complete: {final_state.get('workflow_complete')}")
    print("\nAgent Logs:")
    for log in final_state.get("agent_logs", []):
        print(f"  {log}")

    assert final_state["workflow_complete"] == True
    print("\n✅ Test 2 PASSED")
    return final_state


def test_content_workflow():
    """Test Case 3: Content generation."""
    print("\n" + "="*60)
    print("Test 3: Content Generation Workflow")
    print("="*60)

    initial = make_initial_state(
        workflow_type="content",
        event_context={
            "name": "AI Hackathon 2026",
            "date": "2026-03-20",
            "location": "Bhubaneswar",
            "theme": "AI & Innovation",
            "description": "A 24-hour hackathon focused on AI solutions for real-world problems"
        }
    )

    final_state = swarm.run(initial)

    posts = final_state.get("social_queue", [])
    print(f"\n✅ Generated {len(posts)} social posts!")
    for p in posts:
        print(f"  [{p.get('platform')}] Post at {p.get('recommended_time')}")
    print(f"  Workflow complete: {final_state.get('workflow_complete')}")

    assert final_state["workflow_complete"] == True
    assert len(posts) > 0
    print("\n✅ Test 3 PASSED")
    return final_state


if __name__ == "__main__":
    print("🚀 Swarm Orchestrator Test Suite")

    passed = 0
    failed = 0

    for test_fn in [test_scheduler_email_chain, test_crisis_chain, test_content_workflow]:
        try:
            test_fn()
            passed += 1
        except Exception as e:
            print(f"\n❌ FAILED with: {e}")
            import traceback; traceback.print_exc()
            failed += 1

    print("\n" + "="*60)
    print(f"Results: ✅ {passed} passed, ❌ {failed} failed")
    print("="*60)
    sys.exit(0 if failed == 0 else 1)
