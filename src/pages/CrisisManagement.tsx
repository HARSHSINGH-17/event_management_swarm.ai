import { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert, AlertTriangle, UserX, Clock, DoorOpen, Sparkles, RefreshCw,
  Terminal, Bell, CheckCircle2, XCircle, ArrowRight, Zap, GanttChart,
  Users, Building2, CalendarClock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInMinutes, setHours, startOfDay } from "date-fns";
import { runSwarmWorkflow } from "@/services/orchestrator";

interface Speaker { id: string; name: string; topic: string | null; }
interface Room { id: string; name: string; capacity: number | null; }
interface Session {
  id: string; title: string; speaker_id: string | null; room_id: string | null;
  start_time: string | null; end_time: string | null; duration_minutes: number;
  status: string; has_conflict: boolean; conflict_note: string | null;
  speakers?: Speaker; rooms?: Room;
}
interface CrisisAction {
  session_id: string; action: string; new_start_time?: string | null;
  new_end_time?: string | null; new_room_id?: string | null; note: string;
}
interface Notification {
  type: string; message: string; affected_sessions: string[];
}
interface CrisisResult {
  analysis: string; actions: CrisisAction[]; notifications: Notification[];
  logs: string[]; timestamp: string; crisis_type: string;
}

const CRISIS_TYPES = [
  { value: "speaker_cancellation", label: "Speaker Cancellation", icon: UserX, color: "text-destructive", description: "A speaker can no longer attend the event" },
  { value: "session_delay", label: "Session Delay", icon: Clock, color: "text-neon-amber", description: "A session is running behind schedule" },
  { value: "room_unavailability", label: "Room Unavailability", icon: DoorOpen, color: "text-neon-purple", description: "A room is no longer available for use" },
];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);

const CrisisManagement = () => {
  const { toast } = useToast();
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [resolving, setResolving] = useState(false);
  const [crisisHistory, setCrisisHistory] = useState<CrisisResult[]>([]);

  // Crisis form
  const [crisisType, setCrisisType] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("");
  const [delayMinutes, setDelayMinutes] = useState("30");

  const addLog = useCallback((msg: string) => {
    setAgentLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  }, []);

  const fetchAll = useCallback(async () => {
    const [sp, rm, ss] = await Promise.all([
      supabase.from("speakers").select("*").order("name"),
      supabase.from("rooms").select("*").order("name"),
      supabase.from("sessions").select("*, speakers(*), rooms(*)").order("start_time", { ascending: true, nullsFirst: false }),
    ]);
    if (sp.data) setSpeakers(sp.data);
    if (rm.data) setRooms(rm.data);
    if (ss.data) setSessions(ss.data as any);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const entityOptions = () => {
    if (crisisType === "speaker_cancellation") return speakers.map(s => ({ id: s.id, label: s.name }));
    if (crisisType === "session_delay") return sessions.filter(s => s.start_time).map(s => ({ id: s.id, label: s.title }));
    if (crisisType === "room_unavailability") return rooms.map(r => ({ id: r.id, label: r.name }));
    return [];
  };

  const getAffectedEntity = () => {
    if (crisisType === "speaker_cancellation") {
      const sp = speakers.find(s => s.id === selectedEntity);
      return sp ? { id: sp.id, name: sp.name } : null;
    }
    if (crisisType === "session_delay") {
      const ss = sessions.find(s => s.id === selectedEntity);
      return ss ? { id: ss.id, title: ss.title, delay_minutes: parseInt(delayMinutes) || 30 } : null;
    }
    if (crisisType === "room_unavailability") {
      const rm = rooms.find(r => r.id === selectedEntity);
      return rm ? { id: rm.id, name: rm.name } : null;
    }
    return null;
  };

  const triggerCrisis = async () => {
    if (!crisisType || !selectedEntity) {
      toast({ title: "Select a crisis", description: "Choose a crisis type and affected entity.", variant: "destructive" });
      return;
    }

    const entity = getAffectedEntity();
    if (!entity) return;

    setResolving(true);
    const crisisLabel = CRISIS_TYPES.find(c => c.value === crisisType)?.label || crisisType;

    addLog(`[Crisis Agent] 🚨 ${crisisLabel} detected`);
    addLog(`[Crisis Agent] Analyzing impact on ${sessions.filter(s => s.start_time).length} scheduled sessions...`);

    try {
      const sessionsPayload = sessions.map(s => ({
        id: s.id, title: s.title,
        speaker_name: s.speakers?.name || null, speaker_id: s.speaker_id,
        room_name: s.rooms?.name || null, room_id: s.room_id,
        start_time: s.start_time, end_time: s.end_time,
        duration_minutes: s.duration_minutes, participant_count: 50,
      }));
      const roomsPayload = rooms.map(r => ({ id: r.id, name: r.name, capacity: r.capacity }));
      const speakersPayload = speakers.map(sp => ({ id: sp.id, name: sp.name, topic: sp.topic }));

      const response = await fetch("http://localhost:8000/api/resolve-crisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crisis_type: crisisType,
          affected_entity: entity,
          sessions: sessionsPayload,
          rooms: roomsPayload,
          speakers: speakersPayload,
          event_date: "2026-03-15",
        })
      });

      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      const data = await response.json();
      if (data?.error) throw new Error(data.error);

      // ── Swarm Orchestrator: trigger multi-agent chain (Crisis → Scheduler → Email) ──
      addLog(`[Orchestrator] 🕸️ Launching swarm: Crisis → Scheduler → Email chain...`);
      try {
        const swarmResult = await runSwarmWorkflow('crisis', {
          event_context: { name: "Tech Summit 2026", date: "2026-03-15" },
          crisis: { type: crisisType as any, affected_entity: entity },
          schedule: {
            sessions: sessionsPayload,
            rooms: roomsPayload,
          },
          participants: speakersPayload,
        });
        // Merge swarm agent logs into the local log panel
        (swarmResult.agent_logs || []).forEach(l => addLog(l));
        if (swarmResult.crisis_resolution?.analysis) {
          addLog(`[Swarm] ✅ Resolution: ${swarmResult.crisis_resolution.analysis.slice(0, 120)}`);
        }
      } catch (swarmErr) {
        addLog(`[Orchestrator] ⚠️ Swarm chain: ${swarmErr instanceof Error ? swarmErr.message : 'failed'}`);
      }

      // Process logs from direct AI call too
      const aiLogs: string[] = data.logs || [];
      aiLogs.forEach(l => addLog(l));

      // Apply schedule changes
      const actions: CrisisAction[] = data.actions || [];
      let appliedCount = 0;
      for (const action of actions) {
        const updates: Record<string, any> = {};
        if (action.action === "cancel") {
          updates.status = "cancelled";
          updates.has_conflict = false;
          updates.conflict_note = action.note;
        } else if (action.action === "reschedule" || action.action === "delay") {
          if (action.new_start_time) updates.start_time = action.new_start_time;
          if (action.new_end_time) updates.end_time = action.new_end_time;
          if (action.new_room_id) updates.room_id = action.new_room_id;
          updates.has_conflict = false;
          updates.conflict_note = action.note;
          updates.status = "rescheduled";
        } else if (action.action === "relocate") {
          if (action.new_room_id) updates.room_id = action.new_room_id;
          updates.conflict_note = action.note;
          updates.status = "relocated";
        }

        if (Object.keys(updates).length > 0) {
          await supabase.from("sessions").update(updates).eq("id", action.session_id);
          appliedCount++;
        }
      }

      addLog(`[Scheduler Agent] ✓ Applied ${appliedCount} schedule changes`);

      // Process notifications
      const notifications: Notification[] = data.notifications || [];
      notifications.forEach(n => {
        addLog(`[Email Agent] 📧 Notification queued: "${n.message}" → ${n.affected_sessions.length} session(s)`);
      });

      if (notifications.length > 0) {
        addLog(`[Email Agent] ✓ ${notifications.length} notification(s) ready for ${notifications.reduce((sum, n) => sum + n.affected_sessions.length, 0)} affected sessions`);
      }

      // Store in crisis history
      const result: CrisisResult = {
        analysis: data.analysis || "",
        actions,
        notifications,
        logs: aiLogs,
        timestamp: new Date().toISOString(),
        crisis_type: crisisType,
      };
      setCrisisHistory(prev => [result, ...prev]);

      toast({ title: "Crisis resolved", description: data.analysis || "Schedule has been updated." });
      fetchAll();
    } catch (e: any) {
      addLog(`[Crisis Agent] ✗ Resolution failed: ${e.message}`);
      toast({ title: "Crisis resolution failed", description: e.message, variant: "destructive" });
    } finally {
      setResolving(false);
    }
  };

  const scheduledSessions = sessions.filter(s => s.start_time && s.end_time);
  const activeCrisis = CRISIS_TYPES.find(c => c.value === crisisType);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <h1 className="text-2xl font-bold tracking-tight">Crisis Management</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Simulate and resolve event disruptions with AI agents</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Sessions", value: scheduledSessions.length, icon: CalendarClock, color: "text-neon-green" },
          { label: "Speakers", value: speakers.length, icon: Users, color: "text-neon-cyan" },
          { label: "Rooms", value: rooms.length, icon: Building2, color: "text-neon-purple" },
          { label: "Crises Resolved", value: crisisHistory.length, icon: ShieldAlert, color: "text-neon-amber" },
        ].map((s, i) => (
          <div key={s.label} className="glass-card rounded-xl p-4 animate-fade-in" style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}>
            <div className={`${s.color} mb-2`}><s.icon className="h-4 w-4" /></div>
            <p className="text-xl font-bold font-mono">{s.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="simulate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="simulate">Simulate Crisis</TabsTrigger>
          <TabsTrigger value="timeline" disabled={scheduledSessions.length === 0}>
            <GanttChart className="h-3 w-3 mr-1" />Live Timeline
          </TabsTrigger>
          <TabsTrigger value="history" disabled={crisisHistory.length === 0}>
            History ({crisisHistory.length})
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Terminal className="h-3 w-3 mr-1" />Agent Logs
          </TabsTrigger>
        </TabsList>

        {/* Simulate Tab */}
        <TabsContent value="simulate" className="space-y-4">
          {/* Crisis Type Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {CRISIS_TYPES.map(ct => {
              const Icon = ct.icon;
              const active = crisisType === ct.value;
              return (
                <button
                  key={ct.value}
                  onClick={() => { setCrisisType(ct.value); setSelectedEntity(""); }}
                  className={`glass-card rounded-xl p-4 text-left transition-all ${active ? "ring-2 ring-primary neon-border" : "hover:border-border"}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-4 w-4 ${ct.color}`} />
                    <span className="text-sm font-semibold">{ct.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{ct.description}</p>
                </button>
              );
            })}
          </div>

          {/* Entity Selection & Trigger */}
          {crisisType && (
            <Card className="glass-card animate-fade-in">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  {activeCrisis && <activeCrisis.icon className={`h-4 w-4 ${activeCrisis.color}`} />}
                  Configure {activeCrisis?.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      {crisisType === "speaker_cancellation" ? "Select Speaker" :
                       crisisType === "session_delay" ? "Select Session" :
                       "Select Room"}
                    </Label>
                    <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose..." />
                      </SelectTrigger>
                      <SelectContent>
                        {entityOptions().map(opt => (
                          <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {entityOptions().length === 0 && (
                      <p className="text-xs text-muted-foreground">No data available. Add speakers, sessions, or rooms in the Event Scheduler first.</p>
                    )}
                  </div>
                  {crisisType === "session_delay" && (
                    <div className="space-y-2">
                      <Label>Delay (minutes)</Label>
                      <Input type="number" value={delayMinutes} onChange={e => setDelayMinutes(e.target.value)} min="5" max="180" />
                    </div>
                  )}
                </div>

                <Button
                  onClick={triggerCrisis}
                  disabled={resolving || !selectedEntity}
                  variant="destructive"
                  className="gap-2"
                >
                  {resolving ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" />Resolving Crisis...</>
                  ) : (
                    <><Zap className="h-4 w-4" />Trigger Crisis Simulation</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Latest Crisis Result */}
          {crisisHistory.length > 0 && (
            <Card className="glass-card animate-fade-in">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-neon-green" />
                  Latest Resolution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{crisisHistory[0].analysis}</p>

                {/* Actions */}
                {crisisHistory[0].actions.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Schedule Changes</h3>
                    {crisisHistory[0].actions.map((a, i) => {
                      const session = sessions.find(s => s.id === a.session_id);
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs glass-card rounded-lg p-2">
                          <Badge variant={a.action === "cancel" ? "destructive" : "secondary"} className="text-[10px]">
                            {a.action}
                          </Badge>
                          <span className="font-medium">{session?.title || a.session_id}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{a.note}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Notifications */}
                {crisisHistory[0].notifications.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Participant Notifications</h3>
                    {crisisHistory[0].notifications.map((n, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs glass-card rounded-lg p-2">
                        <Bell className="h-3 w-3 text-neon-amber mt-0.5 shrink-0" />
                        <div>
                          <Badge variant="outline" className="text-[10px] mb-1">{n.type.replace(/_/g, " ")}</Badge>
                          <p className="text-muted-foreground">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Affects: {n.affected_sessions.join(", ")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Live Timeline */}
        <TabsContent value="timeline">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <GanttChart className="h-4 w-4 text-primary" />
                Live Event Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex ml-28">
                  {HOURS.map(h => (
                    <div key={h} className="flex-1 text-[10px] text-muted-foreground font-mono">{String(h).padStart(2, "0")}:00</div>
                  ))}
                </div>
                {rooms.map(room => {
                  const roomSessions = scheduledSessions.filter(s => s.room_id === room.id);
                  return (
                    <div key={room.id} className="flex items-stretch gap-2 min-h-[48px]">
                      <div className="w-28 shrink-0 flex items-center">
                        <span className="text-xs font-medium truncate">{room.name}</span>
                      </div>
                      <div className="flex-1 relative bg-secondary/30 rounded-lg">
                        {roomSessions.map(s => {
                          if (!s.start_time || !s.end_time) return null;
                          const start = parseISO(s.start_time);
                          const end = parseISO(s.end_time);
                          const dayStart = setHours(startOfDay(start), 8);
                          const totalMin = 12 * 60;
                          const offsetMin = differenceInMinutes(start, dayStart);
                          const durMin = differenceInMinutes(end, start);
                          const leftPct = Math.max(0, (offsetMin / totalMin) * 100);
                          const widthPct = Math.max(2, (durMin / totalMin) * 100);

                          const statusColor =
                            s.status === "cancelled" ? "bg-destructive/20 border-destructive/40" :
                            s.status === "rescheduled" ? "bg-neon-amber/20 border-neon-amber/40" :
                            s.status === "relocated" ? "bg-neon-purple/20 border-neon-purple/40" :
                            s.has_conflict ? "bg-neon-amber/20 border-neon-amber/40" :
                            "bg-primary/20 border-primary/30";

                          return (
                            <div
                              key={s.id}
                              className={`absolute top-1 bottom-1 rounded-md px-2 py-1 text-[10px] overflow-hidden flex flex-col justify-center border ${statusColor} ${s.status === "cancelled" ? "line-through opacity-50" : ""}`}
                              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                              title={`${s.title} (${format(start, "HH:mm")}–${format(end, "HH:mm")}) [${s.status}]`}
                            >
                              <p className="font-medium truncate">{s.title}</p>
                              <p className="text-muted-foreground truncate">{s.speakers?.name || ""}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {rooms.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No rooms or sessions found. Set up your schedule first.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {crisisHistory.map((crisis, idx) => {
            const ct = CRISIS_TYPES.find(c => c.value === crisis.crisis_type);
            return (
              <Card key={idx} className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {ct && <ct.icon className={`h-4 w-4 ${ct.color}`} />}
                    <span className="text-sm font-semibold">{ct?.label || crisis.crisis_type}</span>
                    <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                      {format(parseISO(crisis.timestamp), "HH:mm:ss")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{crisis.analysis}</p>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span>{crisis.actions.length} action(s)</span>
                    <span>{crisis.notifications.length} notification(s)</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                Multi-Agent Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No agent activity. Trigger a crisis simulation to see logs.</p>
              ) : (
                <div className="space-y-1 max-h-[500px] overflow-y-auto font-mono text-xs">
                  {agentLogs.map((log, i) => (
                    <div key={i} className={`py-1.5 px-2 rounded ${
                      log.includes("✓") || log.includes("Success") ? "text-neon-green" :
                      log.includes("✗") || log.includes("Error") || log.includes("failed") ? "text-destructive" :
                      log.includes("🚨") || log.includes("Crisis") || log.includes("Conflict") ? "text-neon-amber" :
                      log.includes("📧") || log.includes("Email") || log.includes("Notif") ? "text-neon-cyan" :
                      "text-muted-foreground"
                    }`}>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CrisisManagement;
