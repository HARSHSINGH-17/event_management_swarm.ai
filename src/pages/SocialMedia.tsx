import { useState } from "react";
import { Share2, Heart, MessageCircle, Eye, Twitter, Linkedin, Instagram, RefreshCw, Sparkles, Clock, Edit3, Copy, Check, MapPin, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GeneratedPost {
  platform: string;
  caption: string;
  hashtags: string[];
  suggested_time: string;
  posting_tip: string;
  editing?: boolean;
  editCaption?: string;
}

interface EventDetails {
  event_name: string;
  theme: string;
  date: string;
  location: string;
  description: string;
}

const platformConfig: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  instagram: { icon: Instagram, label: "Instagram", color: "text-neon-rose", bg: "bg-neon-rose/10" },
  linkedin: { icon: Linkedin, label: "LinkedIn", color: "text-neon-purple", bg: "bg-neon-purple/10" },
  twitter: { icon: Twitter, label: "Twitter / X", color: "text-neon-cyan", bg: "bg-neon-cyan/10" },
};

const SocialMedia = () => {
  const { toast } = useToast();
  const [eventDetails, setEventDetails] = useState<EventDetails>({
    event_name: "",
    theme: "",
    date: "",
    location: "",
    description: "",
  });
  const [posts, setPosts] = useState<GeneratedPost[]>([]);
  const [generating, setGenerating] = useState(false);
  const [regeneratingPlatform, setRegeneratingPlatform] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setAgentLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const generateContent = async (platforms: string[] = ["instagram", "linkedin", "twitter"]) => {
    const { event_name, theme, date, location, description } = eventDetails;
    if (!event_name || !description) {
      toast({ title: "Missing info", description: "Please fill in at least the event name and description.", variant: "destructive" });
      return;
    }

    const isRegenerate = platforms.length === 1;
    if (isRegenerate) {
      setRegeneratingPlatform(platforms[0]);
    } else {
      setGenerating(true);
      setPosts([]);
    }

    addLog(`[Content Agent] Starting content generation for ${platforms.join(", ")}...`);

    const results: GeneratedPost[] = isRegenerate ? [...posts] : [];

    for (const platform of platforms) {
      addLog(`[Content Agent] Generating ${platformConfig[platform].label} post...`);
      try {
        const { data, error } = await supabase.functions.invoke("generate-social-content", {
          body: { event_name, theme, date, location, description, platform },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const content = data.content;
        const post: GeneratedPost = {
          platform,
          caption: content.caption || "",
          hashtags: content.hashtags || [],
          suggested_time: content.suggested_time || "Weekday morning",
          posting_tip: content.posting_tip || "",
        };

        if (isRegenerate) {
          const idx = results.findIndex((p) => p.platform === platform);
          if (idx >= 0) results[idx] = post;
          else results.push(post);
        } else {
          results.push(post);
        }

        addLog(`[Content Agent] ✓ ${platformConfig[platform].label} content ready`);
      } catch (e: any) {
        addLog(`[Content Agent] ✗ Failed for ${platformConfig[platform].label}: ${e.message}`);
        toast({ title: `Error generating ${platformConfig[platform].label} content`, description: e.message, variant: "destructive" });
      }
    }

    setPosts(results);
    setGenerating(false);
    setRegeneratingPlatform(null);
    addLog(`[Content Agent] Generation complete — ${results.length} post(s) ready`);
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast({ title: "Copied!", description: "Post content copied to clipboard." });
  };

  const toggleEdit = (index: number) => {
    setPosts((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, editing: !p.editing, editCaption: p.editing ? undefined : p.caption } : p
      )
    );
  };

  const saveEdit = (index: number) => {
    setPosts((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, caption: p.editCaption || p.caption, editing: false, editCaption: undefined } : p
      )
    );
    toast({ title: "Saved", description: "Caption updated." });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="animate-fade-in">
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Social Media Content Agent</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">AI-powered promotional content generation for your event</p>
      </div>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="generate">Generate Content</TabsTrigger>
          <TabsTrigger value="posts" disabled={posts.length === 0}>
            Generated Posts ({posts.length})
          </TabsTrigger>
          <TabsTrigger value="logs">Agent Logs</TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event_name">Event Name *</Label>
                  <Input
                    id="event_name"
                    placeholder="TechSummit 2026"
                    value={eventDetails.event_name}
                    onChange={(e) => setEventDetails((p) => ({ ...p, event_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Input
                    id="theme"
                    placeholder="AI & Future of Technology"
                    value={eventDetails.theme}
                    onChange={(e) => setEventDetails((p) => ({ ...p, theme: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">
                    <CalendarDays className="h-3 w-3 inline mr-1" />
                    Date
                  </Label>
                  <Input
                    id="date"
                    placeholder="March 15-17, 2026"
                    value={eventDetails.date}
                    onChange={(e) => setEventDetails((p) => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    Location
                  </Label>
                  <Input
                    id="location"
                    placeholder="San Francisco, CA"
                    value={eventDetails.location}
                    onChange={(e) => setEventDetails((p) => ({ ...p, location: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Event Description *</Label>
                <Textarea
                  id="description"
                  placeholder="A 3-day conference bringing together 2000+ developers, engineers, and tech leaders to explore AI, cloud computing, and the future of software..."
                  className="min-h-[100px]"
                  value={eventDetails.description}
                  onChange={(e) => setEventDetails((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <Button onClick={() => generateContent()} disabled={generating} className="w-full sm:w-auto">
                {generating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating for 3 platforms...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate All Content
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Inline preview of generated posts */}
          {posts.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {posts.map((post, i) => {
                const cfg = platformConfig[post.platform];
                const Icon = cfg.icon;
                const isRegenerating = regeneratingPlatform === post.platform;

                return (
                  <Card key={post.platform} className="glass-card animate-fade-in" style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${cfg.bg}`}>
                            <Icon className={`h-4 w-4 ${cfg.color}`} />
                          </div>
                          <span className="font-semibold text-sm">{cfg.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleCopy(`${post.caption}\n\n${post.hashtags.map((h) => `#${h}`).join(" ")}`, i)}
                          >
                            {copiedIndex === i ? <Check className="h-3 w-3 text-neon-green" /> : <Copy className="h-3 w-3" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleEdit(i)}>
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={isRegenerating}
                            onClick={() => generateContent([post.platform])}
                          >
                            <RefreshCw className={`h-3 w-3 ${isRegenerating ? "animate-spin" : ""}`} />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {post.editing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={post.editCaption}
                            onChange={(e) =>
                              setPosts((prev) => prev.map((p, idx) => (idx === i ? { ...p, editCaption: e.target.value } : p)))
                            }
                            className="min-h-[120px] text-sm"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveEdit(i)}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => toggleEdit(i)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{post.caption}</p>
                      )}

                      {post.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {post.hashtags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] font-mono">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 border-t border-border/50 space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3 text-neon-amber" />
                          <span className="font-mono">{post.suggested_time}</span>
                        </div>
                        {post.posting_tip && (
                          <p className="text-[11px] text-muted-foreground italic">💡 {post.posting_tip}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Posts Tab - full view */}
        <TabsContent value="posts" className="space-y-4">
          {posts.map((post, i) => {
            const cfg = platformConfig[post.platform];
            const Icon = cfg.icon;
            return (
              <Card key={post.platform} className="glass-card animate-fade-in">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-xl ${cfg.bg}`}>
                      <Icon className={`h-5 w-5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{cfg.label}</span>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleCopy(`${post.caption}\n\n${post.hashtags.map((h) => `#${h}`).join(" ")}`, i)}>
                            {copiedIndex === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            Copy
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => generateContent([post.platform])}>
                            <RefreshCw className="h-3 w-3" />
                            Regenerate
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{post.caption}</p>
                      {post.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {post.hashtags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="font-mono text-xs">#{tag}</Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-4 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-neon-amber" />{post.suggested_time}</span>
                        {post.posting_tip && <span className="italic">💡 {post.posting_tip}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Agent Logs Tab */}
        <TabsContent value="logs">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Agent Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No agent activity yet. Generate content to see logs.</p>
              ) : (
                <div className="space-y-1 max-h-[400px] overflow-y-auto font-mono text-xs">
                  {agentLogs.map((log, i) => (
                    <div key={i} className={`py-1.5 px-2 rounded ${log.includes("✓") ? "text-neon-green" : log.includes("✗") ? "text-destructive" : "text-muted-foreground"}`}>
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

export default SocialMedia;
