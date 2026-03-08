import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Session {
  id: string;
  title: string;
  speaker_name?: string;
  room_name?: string;
  room_id?: string;
  speaker_id?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes: number;
}

interface Room {
  id: string;
  name: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessions, rooms, event_date, event_start_hour, event_end_hour } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert event scheduling agent. Given a list of sessions (with durations) and available rooms, generate a conflict-free schedule.

Rules:
- No two sessions in the same room can overlap
- No speaker can be in two sessions at the same time
- Sessions should be scheduled between ${event_start_hour || "09:00"} and ${event_end_hour || "18:00"}
- Add short breaks between sessions (15 min)
- If conflicts are unavoidable, flag them

The event date is: ${event_date || "2026-03-15"}

You MUST respond with valid JSON (no markdown fences):
{
  "schedule": [
    {
      "session_id": "uuid",
      "start_time": "2026-03-15T09:00:00",
      "end_time": "2026-03-15T10:00:00",
      "room_id": "uuid",
      "has_conflict": false,
      "conflict_note": null
    }
  ],
  "logs": [
    "[Scheduler Agent] Creating schedule for 5 sessions across 3 rooms",
    "[Scheduler Agent] All sessions scheduled without conflicts"
  ],
  "summary": "Successfully scheduled all sessions without conflicts."
}`;

    const sessionList = (sessions as Session[]).map(s =>
      `- "${s.title}" (${s.duration_minutes}min) by ${s.speaker_name || "TBD"}, preferred room: ${s.room_name || "any"}, session_id: ${s.id}, speaker_id: ${s.speaker_id || "none"}, room_id: ${s.room_id || "none"}`
    ).join("\n");

    const roomList = (rooms as Room[]).map(r => `- "${r.name}" (id: ${r.id})`).join("\n");

    const userPrompt = `Schedule these sessions:

${sessionList}

Available rooms:
${roomList}

Generate an optimal, conflict-free schedule. If any conflicts are detected, note them and suggest adjustments.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { schedule: [], logs: ["[Scheduler Agent] Failed to parse AI response"], summary: "Could not generate schedule." };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("optimize-schedule error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
