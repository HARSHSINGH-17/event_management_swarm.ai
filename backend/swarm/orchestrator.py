"""
Swarm Orchestrator — LangGraph-style stateful multi-agent graph.

Uses our native crew_shim instead of LangGraph (no C++ deps needed on Windows).
The architecture is identical:
  - Agents read SwarmState and return partial updates
  - route_next_agent() acts as the conditional edge function
  - SwarmGraph loops until workflow_complete=True or max steps reached
"""

from typing import Generator
from datetime import datetime
from swarm.state import SwarmState, make_initial_state, merge_state
from swarm.agents.scheduler_agent import scheduler_agent
from swarm.agents.email_agent import email_agent
from swarm.agents.crisis_agent import crisis_agent
from swarm.agents.content_agent import content_agent

# ----- Registry -----
AGENT_REGISTRY = {
    "scheduler": scheduler_agent,
    "email":     email_agent,
    "crisis":    crisis_agent,
    "content":   content_agent,
    "social":    content_agent,  # alias
    "schedule":  scheduler_agent, # alias
}

MAX_STEPS = 10  # Safety guard against infinite loops


# ----- Router (equivalent to LangGraph conditional edges) -----

def route_next_agent(state: SwarmState) -> str | None:
    """
    Determines which agent node to invoke next.
    Returns None to signal END of workflow.
    """
    if state.get("workflow_complete"):
        return None

    # Explicit routing from previous agent
    next_agent = state.get("next_agent")
    if next_agent and next_agent in AGENT_REGISTRY:
        return next_agent

    # Implicit routing based on queue contents
    if state.get("email_queue"):
        return "email"
    if state.get("active_crisis"):
        return "crisis"
    if state.get("social_queue") is not None and not state.get("social_queue"):
        # social_queue exists but empty — content was requested
        return "content"

    # Default: nothing to do
    return None


# ----- Graph Runner -----

class SwarmGraph:
    """Stateful graph that runs agents in sequence based on routing logic."""

    def run(self, initial_state: SwarmState) -> SwarmState:
        """
        Synchronous full run. Returns the final SwarmState after all agents complete.
        """
        state = dict(initial_state)
        # Clear next_agent so the entry point only runs once
        entry = state.pop("next_agent", None)

        for step in range(MAX_STEPS):
            # Determine which agent runs this step
            if step == 0 and entry:
                agent_key = entry
            else:
                state["next_agent"] = None  # Clear after reading
                agent_key = route_next_agent(SwarmState(**state))

            if not agent_key:
                ts = datetime.now().strftime("%H:%M:%S")
                state.setdefault("agent_logs", [])
                state["agent_logs"].append(f"[{ts}] Orchestrator: Workflow complete after {step} step(s)")
                break

            agent_fn = AGENT_REGISTRY.get(agent_key)
            if not agent_fn:
                ts = datetime.now().strftime("%H:%M:%S")
                state.setdefault("agent_logs", [])
                state["agent_logs"].append(f"[{ts}] Orchestrator ERROR: Unknown agent '{agent_key}'")
                break

            ts = datetime.now().strftime("%H:%M:%S")
            state.setdefault("agent_logs", [])
            state["agent_logs"].append(f"[{ts}] Orchestrator → {agent_key.title()} Agent (step {step + 1})")

            partial = agent_fn(state)
            # Merge partial update into full state
            merged = merge_state(SwarmState(**state), partial)
            state = dict(merged)

            if state.get("workflow_complete"):
                break

        state["workflow_complete"] = True
        return SwarmState(**state)

    def stream(self, initial_state: SwarmState) -> Generator[dict, None, None]:
        """
        Generator that yields a state snapshot after each agent step.
        Used by the SSE streaming endpoint so the frontend can show live logs.
        """
        state = dict(initial_state)
        entry = state.pop("next_agent", None)

        for step in range(MAX_STEPS):
            if step == 0 and entry:
                agent_key = entry
            else:
                state["next_agent"] = None
                agent_key = route_next_agent(SwarmState(**state))

            if not agent_key:
                yield {
                    "event": "done",
                    "agent": "orchestrator",
                    "logs": [f"[{datetime.now().strftime('%H:%M:%S')}] Orchestrator: All agents complete"],
                    "step": step,
                    "workflow_complete": True,
                }
                break

            ts = datetime.now().strftime("%H:%M:%S")
            agent_fn = AGENT_REGISTRY.get(agent_key)
            if not agent_fn:
                yield {"event": "error", "agent": agent_key, "logs": [f"[{ts}] Unknown agent: {agent_key}"], "step": step}
                break

            yield {
                "event": "agent_start",
                "agent": agent_key,
                "logs": [f"[{ts}] → {agent_key.title()} Agent starting..."],
                "step": step,
                "workflow_complete": False,
            }

            partial = agent_fn(state)
            merged = merge_state(SwarmState(**state), partial)
            state = dict(merged)

            yield {
                "event": "agent_done",
                "agent": agent_key,
                "logs": partial.get("agent_logs", []),
                "step": step,
                "schedule": state.get("schedule"),
                "social_queue": state.get("social_queue"),
                "crisis_resolution": state.get("crisis_resolution"),
                "workflow_complete": state.get("workflow_complete", False),
            }

            if state.get("workflow_complete"):
                break

        state["workflow_complete"] = True


# Singleton graph instance
swarm = SwarmGraph()
