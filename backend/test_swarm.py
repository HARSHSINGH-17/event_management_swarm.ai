"""
Test script for the Swarm Orchestrator — matches the hackathon prompt spec.
Run from backend/ directory:
    python test_swarm.py

Tests crisis → scheduler → email multi-agent cascade.
"""

import os
import sys
from dotenv import load_dotenv

# Load env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from swarm.orchestrator import swarm
from swarm.state import make_initial_state


def run_test():
    """Run the crisis → scheduler → email workflow and show results."""
    print("Running swarm workflow...")

    initial_state = make_initial_state(
        workflow_type="crisis",
        event_context={"name": "AI Hackathon 2026"},
        sessions=[
            {"id": "s1", "title": "AI Ethics", "speaker_name": "Dr. Smith", "duration_minutes": 60},
            {"id": "s2", "title": "ML Workshop", "speaker_name": "Dr. Jane", "duration_minutes": 90}
        ],
        rooms=[
            {"id": "r1", "name": "Main Hall", "capacity": 200},
            {"id": "r2", "name": "Workshop Room", "capacity": 50}
        ],
        speakers=[
            {"id": "sp1", "name": "Dr. Smith"},
            {"id": "sp2", "name": "Dr. Jane"}
        ],
        crisis={
            "type": "speaker_cancellation",
            "affected_entity": {"id": "sp1", "name": "Dr. Smith"}
        }
    )

    final_state = swarm.run(initial_state)

    print("\n" + "="*50)
    print("WORKFLOW RESULTS")
    print("="*50)
    print(f"Workflow Complete: {final_state.get('workflow_complete')}")
    print(f"Crisis Resolved:  {bool(final_state.get('crisis_resolution'))}")
    print(f"Emails Sent:      {final_state.get('emails_sent', 0)}")

    crisis_res = final_state.get("crisis_resolution")
    if crisis_res:
        analysis = crisis_res.get("analysis", "")
        print(f"Analysis:         {analysis[:120]}...")

    print(f"\nAgent Execution Log:")
    for log in final_state.get("agent_logs", []):
        print(f"  {log}")
    print("="*50)

    assert final_state.get("workflow_complete") == True, "Workflow did not complete!"
    assert final_state.get("crisis_resolution") is not None, "Crisis was not resolved!"
    print("\n✅ Test PASSED — autonomous multi-agent handoffs successful!")
    return final_state


if __name__ == "__main__":
    print("🚀 Swarm Orchestrator – Crisis Workflow Test\n")
    try:
        run_test()
        sys.exit(0)
    except AssertionError as e:
        print(f"\n❌ FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
