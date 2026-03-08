import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { event_name, theme, date, location, description, platform } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const platformInstructions: Record<string, string> = {
      instagram: "Create an Instagram post with an engaging, visual-first caption (use emojis liberally), 15-20 relevant hashtags, and a call-to-action. Keep it under 2200 chars.",
      linkedin: "Create a LinkedIn post that is professional yet engaging. Use a hook in the first line, include 3-5 relevant hashtags at the end, and add a clear CTA. Keep it business-focused.",
      twitter: "Create a Twitter/X post that is punchy and under 280 characters. Include 2-3 hashtags max. Make it shareable and engaging.",
    };

    const systemPrompt = `You are an expert social media content strategist for events and conferences. Generate promotional content that drives engagement and registrations.

You MUST respond with valid JSON matching this exact structure (no markdown, no code fences):
{
  "caption": "the full post caption text",
  "hashtags": ["hashtag1", "hashtag2"],
  "suggested_time": "Best day/time to post, e.g. Tuesday 10:00 AM",
  "posting_tip": "A brief tip for maximizing engagement"
}`;

    const userPrompt = `Generate a ${platform} post for this event:

Event: ${event_name}
Theme: ${theme}
Date: ${date}
Location: ${location}
Description: ${description}

${platformInstructions[platform] || platformInstructions.twitter}`;

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
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    // Try to parse JSON from the response (strip markdown fences if present)
    let parsed;
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { caption: raw, hashtags: [], suggested_time: "Weekday morning", posting_tip: "Engage with comments early." };
    }

    return new Response(JSON.stringify({ content: parsed, platform }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-social-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
