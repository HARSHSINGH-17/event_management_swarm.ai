import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { template_subject, template_body, participants, event_name } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // For each participant, replace placeholders and optionally enhance with AI
    const personalized = participants.map((p: any) => {
      let subject = template_subject;
      let body = template_body;

      const replacements: Record<string, string> = {
        "{name}": p.name || "",
        "{email}": p.email || "",
        "{team_name}": p.team_name || "your team",
        "{college}": p.college || "",
        "{phone}": p.phone || "",
        "{event_name}": event_name || "the event",
        "{segment}": p.segment || "",
      };

      for (const [placeholder, value] of Object.entries(replacements)) {
        subject = subject.replaceAll(placeholder, value);
        body = body.replaceAll(placeholder, value);
      }

      return {
        participant_id: p.id,
        participant_name: p.name,
        participant_email: p.email,
        personalized_subject: subject,
        personalized_body: body,
      };
    });

    return new Response(JSON.stringify({ personalized }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("personalize-emails error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
