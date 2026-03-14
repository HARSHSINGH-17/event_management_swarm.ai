import { useState, useEffect, useCallback } from "react";
import {
  Users, CalendarClock, Mail, Share2, TrendingUp, Bot,
  AlertTriangle, CheckCircle2, FileText, Clock, Building2,
  Loader2, RefreshCw, ShieldAlert, Zap
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isValid } from "date-fns";
import { useAuth } from "@/context/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────
interface DashStats {
  speakers: number;
  rooms: number;
  sessions: number;
  scheduledSessions: number;
  conflicts: number;
  participants: number;
  emailsSent: number;
  generatedPosts: number;
}

interface UpcomingSession {
  id: string;
  title: string;
  start_time: string | null;
  rooms?: { name: string } | null;
  speakers?: { name: string } | null;
}

interface AgentLog {
  action: string;
  timestamp: string;
  platform?: string | null;
}

// ── Icon/colour mapping for agent log entries ─────────────────────────────
const LOG_ICON_MAP = [
  { match: ["crisis", "disruption", "conflict", "alert"], icon: AlertTriangle,  color: "text-neon-amber" },
  { match: ["email", "sent", "notification"],              icon: Mail,           color: "text-neon-purple" },
  { match: ["schedule", "calendar", "slot", "optimis"],   icon: CalendarClock,  color: "text-neon-green" },
  { match: ["social", "linkedin", "twitter", "instagram"],icon: Share2,         color: "text-primary" },
  { match: ["content", "post", "generat"],                icon: FileText,       color: "text-neon-cyan" },
  { match: ["swarm", "orchestrat", "agent"],              icon: Zap,            color: "text-neon-amber" },
  { match: ["resolve", "success", "complete", "done"],    icon: CheckCircle2,   color: "text-neon-green" },
  { match: ["participant", "register", "user"],           icon: Users,          color: "text-neon-cyan" },
];

function logMeta(action: string) {
  const lower = action.toLowerCase();
  for (const m of LOG_ICON_MAP) {
    if (m.match.some(kw => lower.includes(kw))) return { Icon: m.icon, color: m.color };
  }
  return { Icon: Bot, color: "text-muted-foreground" };
}

function agentLabel(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes("crisis") || lower.includes("disruption")) return "Crisis Agent";
  if (lower.includes("email") || lower.includes("notification"))  return "Email Agent";
  if (lower.includes("schedule") || lower.includes("calendar"))   return "Scheduler Agent";
  if (lower.includes("social") || lower.includes("content"))      return "Content Agent";
  if (lower.includes("swarm") || lower.includes("orchestrat"))    return "Orchestrator";
  if (lower.includes("participant"))                               return "Participant Manager";
  return "System";
}

function relativeTime(isoStr: string): string {
  try {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch { return ""; }
}

// ── Component ───────────────────────────────────────────────────────────────
const Index = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashStats | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingSession[]>([]);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Parallel fetch everything
      const [
        speakersRes, roomsRes, sessionsRes,
        participantsRes, emailsRes, postsRes,
        logsRes, upcomingRes,
      ] = await Promise.all([
        supabase.from("speakers").select("id", { count: "exact", head: true }),
        supabase.from("rooms").select("id", { count: "exact", head: true }),
        supabase.from("sessions").select("id, status, has_conflict", { count: "exact" }),
        supabase.from("participants").select("id", { count: "exact", head: true }),
        supabase.from("email_logs").select("id", { count: "exact", head: true }),
        supabase.from("generated_posts").select("id", { count: "exact", head: true }),
        supabase.from("agent_logs").select("action, timestamp, platform").order("timestamp", { ascending: false }).limit(12),
        supabase.from("sessions")
          .select("id, title, start_time, rooms(name), speakers(name)")
          .not("start_time", "is", null)
          .order("start_time", { ascending: true })
          .limit(6),
      ]);

      const allSessions = sessionsRes.data ?? [];
      setStats({
        speakers:          speakersRes.count ?? 0,
        rooms:             roomsRes.count ?? 0,
        sessions:          sessionsRes.count ?? 0,
        scheduledSessions: allSessions.filter((s: any) => s.status === "scheduled").length,
        conflicts:         allSessions.filter((s: any) => s.has_conflict).length,
        participants:      participantsRes.count ?? 0,
        emailsSent:        emailsRes.count ?? 0,
        generatedPosts:    postsRes.count ?? 0,
      });

      setUpcoming((upcomingRes.data ?? []) as UpcomingSession[]);
      setAgentLogs((logsRes.data ?? []) as AgentLog[]);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Also try to fetch from backend /api/agent-logs as a supplement
    fetch("http://localhost:8000/api/agent-logs")
      .then(r => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setAgentLogs(prev => {
            // Merge: de-dupe by timestamp+action
            const seen = new Set(prev.map(l => l.timestamp + l.action));
            const newLogs = data.filter(l => !seen.has(l.timestamp + l.action));
            return [...newLogs, ...prev].slice(0, 15);
          });
        }
      })
      .catch(() => {}); // backend might not be running
  }, [fetchData]);

  // Live stats cards (computed from stats)
  const statCards = stats ? [
    {
      label: "Participants",
      value: stats.participants.toLocaleString(),
      sub: `across ${stats.rooms} rooms`,
      icon: Users,
      color: "text-neon-cyan",
    },
    {
      label: "Sessions Scheduled",
      value: stats.scheduledSessions,
      sub: `${stats.sessions} total · ${stats.conflicts} conflicts`,
      icon: CalendarClock,
      color: stats.conflicts > 0 ? "text-neon-amber" : "text-neon-green",
    },
    {
      label: "Emails Sent",
      value: stats.emailsSent.toLocaleString(),
      sub: "via Email Agent",
      icon: Mail,
      color: "text-neon-purple",
    },
    {
      label: "Social Posts",
      value: stats.generatedPosts.toLocaleString(),
      sub: `${stats.speakers} speakers · ${stats.rooms} rooms`,
      icon: Share2,
      color: "text-neon-amber",
    },
  ] : [];

  // Build a simple 7-day activity chart from agent_logs
  const chartData = (() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { day: format(d, "EEE"), date: format(d, "yyyy-MM-dd"), sessions: 0, emails: 0 };
    });
    agentLogs.forEach(log => {
      if (!log.timestamp) return;
      const day = log.timestamp.slice(0, 10);
      const entry = days.find(d => d.date === day);
      if (!entry) return;
      const lower = log.action.toLowerCase();
      if (lower.includes("email")) entry.emails++;
      else entry.sessions++;
    });
    return days;
  })();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI swarm managing your events in real-time
            {user && <span className="ml-2 text-primary font-medium">· {user.name}</span>}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading…" : `Updated ${format(lastRefresh, "HH:mm:ss")}`}
        </button>
      </div>

      {/* Stats Cards */}
      {loading && !stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => (
            <div key={i} className="glass-card rounded-xl p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <div
              key={card.label}
              className="glass-card rounded-xl p-5 animate-fade-in"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{card.label}</p>
                  <p className="text-2xl font-bold mt-1 font-mono">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </div>
                <div className={`${card.color} p-2 rounded-lg bg-secondary`}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chart + Upcoming Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Activity Chart */}
        <div className="lg:col-span-3 glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Agent Activity (7 days)</h3>
            <div className="ml-auto flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-neon-cyan" />
                <span className="text-[10px] text-muted-foreground">Agent actions</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-neon-purple" />
                <span className="text-[10px] text-muted-foreground">Emails</span>
              </div>
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sessGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(215, 90%, 50%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(215, 90%, 50%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="emailGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(250, 65%, 55%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(250, 65%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(220, 8%, 65%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 8%, 65%)" />
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid hsl(220, 13%, 30%)", borderRadius: "8px", fontSize: "12px", color: "#fff" }} />
                <Area type="monotone" dataKey="sessions" name="Agent actions" stroke="hsl(215, 90%, 50%)" fill="url(#sessGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="emails"   name="Emails"        stroke="hsl(250, 65%, 55%)" fill="url(#emailGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Sessions */}
        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Upcoming Sessions</h3>
            <span className="ml-auto text-[10px] text-muted-foreground">{upcoming.length} scheduled</span>
          </div>
          <div className="space-y-2">
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                <CalendarClock className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No scheduled sessions yet.</p>
                <p className="text-[10px] text-muted-foreground">Use Auto-Schedule in the Scheduler page.</p>
              </div>
            ) : upcoming.map((s, i) => {
              const time = s.start_time
                ? (() => { try { const d = parseISO(s.start_time); return isValid(d) ? format(d, "hh:mm a") : s.start_time.slice(11, 16); } catch { return "—"; } })()
                : "TBD";
              return (
                <div
                  key={s.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 animate-fade-in"
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
                >
                  <span className="text-xs font-mono text-primary mt-0.5 w-16 shrink-0">{time}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {(s.rooms as any)?.name ?? "No room"}
                      {(s.speakers as any)?.name ? ` · ${(s.speakers as any).name}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Swarm Activity Feed */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Swarm Activity Feed</h3>
          <div className="ml-auto flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-neon-green animate-pulse-slow" />
            <span className="text-xs text-muted-foreground font-mono">LIVE</span>
          </div>
        </div>

        {agentLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            {loading
              ? <Loader2 className="h-8 w-8 text-primary animate-spin" />
              : <Zap className="h-8 w-8 text-muted-foreground/40" />}
            <p className="text-xs text-muted-foreground">
              {loading ? "Loading agent activity…" : "No agent activity yet. Run a workflow to see logs here."}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {agentLogs.map((log, i) => {
              const { Icon, color } = logMeta(log.action);
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors animate-fade-in"
                  style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
                >
                  <div className={`mt-0.5 ${color} shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary">{agentLabel(log.action)}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{relativeTime(log.timestamp)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 truncate">{log.action}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
