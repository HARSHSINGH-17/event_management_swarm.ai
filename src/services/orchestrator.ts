/**
 * Swarm Orchestrator Service
 * Connects React frontend to the Python multi-agent swarm backend.
 */

const API_BASE = "http://localhost:8000";

export interface OrchestratorRequest {
  workflow_type: "crisis" | "scheduler" | "content" | "email" | "schedule" | "social";
  event_context?: {
    name?: string;
    date?: string;
    location?: string;
    theme?: string;
    description?: string;
  };
  // Flat top-level fields (new /api/swarm/run endpoint)
  sessions?: any[];
  rooms?: any[];
  speakers?: any[];
  participants?: any[];
  // Legacy nested schedule field (old /api/orchestrator/run endpoint)
  schedule?: {
    sessions?: any[];
    rooms?: any[];
    start_hour?: string;
    end_hour?: string;
  };
  crisis?: {
    type: "speaker_cancellation" | "session_delay" | "room_unavailability";
    affected_entity: any;
  };
}

export interface OrchestratorResult {
  success: boolean;
  workflow_type: string;
  agent_logs: string[];
  schedule?: any;
  social_queue?: any[];
  generated_posts?: any[];
  crisis_resolution?: {
    analysis: string;
    resolution_actions: any[];
    notifications: any[];
    notify_agents: string[];
    affected_participants: any[];
  };
  emails_sent: number;
  workflow_complete: boolean;
}

export interface SwarmRunResult {
  success: boolean;
  execution_time_seconds: number;
  workflow_type: string;
  agents_executed: number;
  crisis_resolved: boolean;
  emails_sent: number;
  posts_generated: number;
  schedule_updated: boolean;
  agent_logs: string[];
  final_state: {
    crisis_resolution?: any;
    schedule?: any;
    generated_posts?: any[];
  };
  error?: string;
}

export interface SwarmStreamEvent {
  event: "agent_start" | "agent_done" | "done" | "error" | "stream_end";
  agent?: string;
  logs?: string[];
  step?: number;
  schedule?: any;
  social_queue?: any[];
  crisis_resolution?: any;
  workflow_complete?: boolean;
}

/**
 * [NEW] Run the simplified /api/swarm/run endpoint.
 * Accepts flat sessions/rooms/speakers and returns rich execution results.
 * This is the primary endpoint for the hackathon demo.
 */
export async function runSwarm(
  workflowType: OrchestratorRequest["workflow_type"],
  context: Omit<OrchestratorRequest, "workflow_type">
): Promise<SwarmRunResult> {
  const response = await fetch(`${API_BASE}/api/swarm/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workflow_type: workflowType,
      ...context,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || "Swarm run failed");
  }

  return response.json();
}

/**
 * Run a full multi-agent swarm workflow via /api/orchestrator/run.
 * Blocks until all agents complete and returns the final state.
 */
export async function runSwarmWorkflow(
  workflowType: OrchestratorRequest["workflow_type"],
  context: Omit<OrchestratorRequest, "workflow_type">
): Promise<OrchestratorResult> {
  const response = await fetch(`${API_BASE}/api/orchestrator/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workflow_type: workflowType,
      ...context,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || "Swarm orchestrator failed");
  }

  return response.json();
}

/**
 * Stream real-time agent updates via Server-Sent Events.
 * Yields one SwarmStreamEvent per agent step.
 * Use in the Swarm Control Center for live visualization.
 */
export async function* streamSwarmWorkflow(
  workflowType: OrchestratorRequest["workflow_type"],
  context: Omit<OrchestratorRequest, "workflow_type">
): AsyncGenerator<SwarmStreamEvent> {
  const response = await fetch(`${API_BASE}/api/orchestrator/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workflow_type: workflowType,
      ...context,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Stream failed: ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const dataLine = line.startsWith("data: ") ? line.slice(6) : line;
      if (!dataLine.trim()) continue;
      try {
        const event: SwarmStreamEvent = JSON.parse(dataLine);
        yield event;
        if (event.event === "done" || event.event === "stream_end") return;
      } catch {
        // skip malformed lines
      }
    }
  }
}
