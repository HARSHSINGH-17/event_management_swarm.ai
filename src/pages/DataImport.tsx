import { useState, useRef, useCallback } from "react";
import {
  Upload, FileText, CheckCircle2, XCircle, Loader2, FolderUp,
  Users, Building2, CalendarClock, ShieldAlert, Trash2, ArrowRight,
  AlertTriangle, Info, RefreshCw, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────
type Status = "idle" | "loaded" | "uploading" | "done" | "error";

interface SlotDef {
  key: string;
  label: string;
  icon: any;
  accent: string;
  badge: string;
  hint: string;
  columns: string;               // what the CSV should have
  supabaseTable: string | null;  // null → localStorage
  mapRow: (row: Record<string,string>) => Record<string,any>;
}

interface Slot { status: Status; file: File | null; rows: Record<string,string>[]; error: string; }

// ── Slot definitions ────────────────────────────────────────────────────────
const SLOTS: SlotDef[] = [
  {
    key: "rooms",
    label: "Rooms",
    icon: Building2,
    accent: "text-primary",
    badge: "bg-primary/15 text-primary",
    hint: "Upload rooms first so sessions can reference them",
    columns: "name, capacity",
    supabaseTable: "rooms",
    mapRow: r => ({
      name: r.name,
      capacity: parseInt(r.capacity) || 0,
      // id is intentionally omitted — Supabase auto-generates UUID
    }),
  },
  {
    key: "speakers",
    label: "Speakers",
    icon: Users,
    accent: "text-neon-cyan",
    badge: "bg-neon-cyan/15 text-neon-cyan",
    hint: "Upload speakers before sessions",
    columns: "name, email, bio, topic",
    supabaseTable: "speakers",
    mapRow: r => ({
      // id intentionally omitted — Supabase auto-generates UUID
      name: r.name,
      email: r.email || null,
      bio: r.bio || null,
      topic: r.topic || r.expertise || null,
    }),
  },
  {
    key: "sessions",
    label: "Sessions",
    icon: CalendarClock,
    accent: "text-neon-green",
    badge: "bg-neon-green/15 text-neon-green",
    hint: "Titles and durations only — assign rooms/speakers in the Scheduler page",
    columns: "title, duration_minutes, description",
    supabaseTable: "sessions",
    mapRow: r => ({
      // id/speaker_id/room_id intentionally omitted — Supabase generates UUID,
      // FKs are assigned interactively in the Scheduler page
      title: r.title,
      description: r.description || null,
      duration_minutes: parseInt(r.duration_minutes) || 60,
      status: "pending",
      has_conflict: false,
      conflict_note: null,
    }),
  },
  {
    key: "crisis",
    label: "Crisis Scenarios",
    icon: ShieldAlert,
    accent: "text-neon-amber",
    badge: "bg-neon-amber/15 text-neon-amber",
    hint: "Saved to browser memory — fills Crisis Management drop-downs",
    columns: "type, affected_entity_name, severity, description",
    supabaseTable: null,
    mapRow: r => ({ ...r, id: `crisis-${Date.now()}-${Math.random().toString(36).slice(2)}` }),
  },
];



// ── CSV parser (handles quoted commas) ────────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const vals: string[] = [];
    let inQ = false, cur = "";
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { vals.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    vals.push(cur.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    return row;
  }).filter(r => Object.values(r).some(v => v !== ""));
}

// ── Component ───────────────────────────────────────────────────────────────
export default function DataImport() {
  const { toast } = useToast();
  const emptySlot: Slot = { status: "idle", file: null, rows: [], error: "" };
  const [slots, setSlots] = useState<Record<string, Slot>>(
    Object.fromEntries(SLOTS.map(s => [s.key, { ...emptySlot }]))
  );
  const [importing, setImporting] = useState(false);
  const refs = useRef<Record<string, HTMLInputElement | null>>({});

  const updateSlot = (key: string, patch: Partial<Slot>) =>
    setSlots(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const loadFile = useCallback((key: string, f: File) => {
    if (!f.name.endsWith(".csv")) {
      toast({ title: "Only .csv files", variant: "destructive" }); return;
    }
    updateSlot(key, { status: "idle", file: f, error: "" });
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const rows = parseCSV(e.target?.result as string);
        if (!rows.length) throw new Error("No data rows found");
        updateSlot(key, { rows, status: "loaded" });
      } catch (err: any) {
        updateSlot(key, { status: "error", error: err.message });
      }
    };
    reader.readAsText(f);
  }, [toast]);

  const uploadSlot = async (def: SlotDef): Promise<boolean> => {
    const s = slots[def.key];
    if (!s.rows.length) return true;               // nothing to do → ok
    updateSlot(def.key, { status: "uploading" });
    try {
      const mapped = s.rows.map(def.mapRow);
      if (def.supabaseTable) {
        const { error } = await supabase
          .from(def.supabaseTable)
          .upsert(mapped as any, { onConflict: "id" });
        if (error) throw new Error(error.message);
      } else {
        const existing = JSON.parse(localStorage.getItem("swarm_crisis_scenarios") || "[]");
        localStorage.setItem("swarm_crisis_scenarios", JSON.stringify([...existing, ...mapped]));
      }
      updateSlot(def.key, { status: "done" });
      return true;
    } catch (err: any) {
      updateSlot(def.key, { status: "error", error: err.message });
      return false;
    }
  };

  const importAll = async () => {
    const loaded = SLOTS.filter(d => slots[d.key].rows.length > 0);
    if (!loaded.length) {
      toast({ title: "Drop CSV files first", variant: "destructive" }); return;
    }
    setImporting(true);
    // Sequential: rooms → speakers → sessions → crisis
    let ok = 0;
    for (const def of SLOTS) {
      if (slots[def.key].rows.length) {
        const success = await uploadSlot(def);
        if (success) ok++;
      }
    }
    setImporting(false);
    if (ok === loaded.length) {
      toast({ title: "✅ All data imported!", description: `${ok} dataset${ok > 1 ? "s" : ""} uploaded successfully` });
    } else {
      toast({ title: `${ok}/${loaded.length} imported with errors`, variant: "destructive" });
    }
  };

  const clearSlot = (key: string) => {
    updateSlot(key, { ...emptySlot });
    if (refs.current[key]) refs.current[key]!.value = "";
  };

  const loadedCount = SLOTS.filter(d => slots[d.key].rows.length > 0).length;
  const doneCount   = SLOTS.filter(d => slots[d.key].status === "done").length;
  const totalRows   = SLOTS.reduce((n, d) => n + slots[d.key].rows.length, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Page heading ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderUp className="h-6 w-6 text-primary" />
            Data Import
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bulk-upload your test CSVs — all four files at once, no form-filling.
          </p>
        </div>

        <Button
          size="lg"
          onClick={importAll}
          disabled={importing || loadedCount === 0}
          className="gap-2 shrink-0"
        >
          {importing
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
            : <><Upload className="h-4 w-4" /> Import All ({loadedCount} file{loadedCount !== 1 ? "s" : ""})</>}
        </Button>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Files loaded", value: `${loadedCount} / 4`, accent: "text-primary" },
          { label: "Total rows",   value: totalRows,             accent: "text-neon-cyan" },
          { label: "Datasets done",value: `${doneCount} / 4`,   accent: "text-neon-green" },
        ].map(s => (
          <Card key={s.label} className="glass-card border-border/50">
            <CardContent className="pt-4 pb-3 text-center">
              <p className={`text-2xl font-bold ${s.accent}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Order hint ────────────────────────────────────────────── */}
      <Card className="glass-card border-border/50 border-primary/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-medium text-primary">Import in this order: </span>
              <span className="text-muted-foreground">
                Import will automatically run in the correct sequence:
              </span>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {["Rooms", "Speakers", "Sessions", "Crisis Scenarios"].map((l, i, arr) => (
                  <span key={l} className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-xs">{i + 1}. {l}</Badge>
                    {i < arr.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                  </span>
                ))}
              </div>
              <p className="text-muted-foreground text-xs mt-2">
                Test CSV files are in the <code className="bg-muted px-1 rounded font-mono">test_data/</code> folder of this project.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Upload slots ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SLOTS.map((def, idx) => {
          const slot = slots[def.key];
          const Icon = def.icon;
          const isDone     = slot.status === "done";
          const isError    = slot.status === "error";
          const isLoading  = slot.status === "uploading";
          const isLoaded   = slot.status === "loaded";

          return (
            <Card
              key={def.key}
              className={[
                "glass-card border-2 transition-all duration-300",
                isDone    ? "border-neon-green/50 bg-neon-green/5"   : "",
                isError   ? "border-destructive/50 bg-destructive/5" : "",
                isLoaded  ? "border-primary/40"                       : "border-border/50",
              ].join(" ")}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {/* Step number badge */}
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${def.badge}`}>
                      {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                    </div>
                    <Icon className={`h-4 w-4 ${def.accent}`} />
                    <CardTitle className="text-sm font-semibold">{def.label}</CardTitle>
                  </div>

                  {(isLoaded || isError) && (
                    <button
                      onClick={() => clearSlot(def.key)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground pl-[3.25rem] -mt-0.5">{def.hint}</p>
              </CardHeader>

              <CardContent className="px-4 pb-4 space-y-3">
                {/* Required columns chip */}
                <div className="flex flex-wrap gap-1">
                  {def.columns.split(", ").map(c => (
                    <code key={c} className="text-[10px] bg-muted rounded px-1.5 py-0.5 font-mono">{c}</code>
                  ))}
                </div>

                {/* Drop zone */}
                <div
                  onClick={() => !isDone && refs.current[def.key]?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    if (!isDone) { const f = e.dataTransfer.files[0]; if (f) loadFile(def.key, f); }
                  }}
                  className={[
                    "rounded-xl border-2 border-dashed transition-all duration-200 select-none",
                    isDone                 ? "border-neon-green/30 cursor-default"                       : "cursor-pointer",
                    !isDone && !isLoaded   ? "hover:border-primary/50 hover:bg-primary/5 border-border/40" : "",
                    isLoaded && !isDone    ? "border-primary/50 bg-primary/5"                             : "",
                    isError                ? "border-destructive/50 bg-destructive/5"                     : "",
                  ].join(" ")}
                >
                  <input
                    ref={el => { refs.current[def.key] = el; }}
                    type="file" accept=".csv" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(def.key, f); }}
                  />

                  <div className="flex flex-col items-center justify-center py-7 px-4 text-center gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className={`h-9 w-9 ${def.accent} animate-spin`} />
                        <p className="text-sm font-medium">Uploading…</p>
                      </>
                    ) : isDone ? (
                      <>
                        <CheckCircle2 className="h-9 w-9 text-neon-green" />
                        <p className="text-sm font-semibold text-neon-green">
                          {slot.rows.length} rows imported
                        </p>
                        <p className="text-xs text-muted-foreground">{slot.file?.name}</p>
                      </>
                    ) : isError ? (
                      <>
                        <XCircle className="h-9 w-9 text-destructive" />
                        <p className="text-sm font-semibold text-destructive">Failed</p>
                        <p className="text-xs text-muted-foreground max-w-[180px]">{slot.error}</p>
                        <Button size="sm" variant="outline" className="mt-1 h-7 text-xs gap-1"
                          onClick={e => { e.stopPropagation(); clearSlot(def.key); }}>
                          <RefreshCw className="h-3 w-3" /> Try again
                        </Button>
                      </>
                    ) : isLoaded ? (
                      <>
                        <FileText className={`h-9 w-9 ${def.accent}`} />
                        <p className="text-sm font-semibold">{slot.rows.length} rows ready</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{slot.file?.name}</p>
                        {/* Preview first row */}
                        <div className="w-full mt-1 rounded-md bg-muted/40 p-2 text-left text-[10px] font-mono">
                          {Object.entries(slot.rows[0]).slice(0, 3).map(([k, v]) => (
                            <div key={k} className="truncate">
                              <span className={def.accent}>{k}:</span>{" "}
                              <span className="text-muted-foreground">{v || "—"}</span>
                            </div>
                          ))}
                          {Object.keys(slot.rows[0]).length > 3 && (
                            <div className="text-muted-foreground">+{Object.keys(slot.rows[0]).length - 3} more…</div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="h-9 w-9 text-muted-foreground/60" />
                        <div>
                          <p className="text-sm font-medium">Drop CSV or click to browse</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            From <code className="font-mono">test_data/{def.key === "crisis" ? "crisis_scenarios" : def.key}.csv</code>
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Individual upload button (shown only when loaded) */}
                {isLoaded && (
                  <Button
                    size="sm" variant="outline" className={`w-full gap-2 text-sm ${def.accent} border-current/30`}
                    disabled={importing}
                    onClick={() => uploadSlot(def)}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    Upload {def.label} only
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Warning for missing data ──────────────────────────────── */}
      {doneCount === 0 && loadedCount === 0 && (
        <Card className="glass-card border-border/50 border-neon-amber/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex gap-3 items-start">
              <AlertTriangle className="h-4 w-4 text-neon-amber shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">No data yet.</span>{" "}
                Drop the four CSV files from the{" "}
                <code className="font-mono bg-muted px-1 rounded text-xs">test_data/</code>{" "}
                folder into the boxes above, then click <strong>Import All</strong>.
                The app pages (Scheduler, Crisis Management) will populate instantly.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
