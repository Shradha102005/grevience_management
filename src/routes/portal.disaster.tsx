import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, type ReactElement } from "react";
import {
  Siren, Radio, MapPin, Phone, ShieldAlert, Send, CheckCircle2, Clock, 
  AlertTriangle, Eye, XCircle, MessageSquare, User, RefreshCw, Activity,
  Maximize2, Shield, AlertOctagon, Smartphone, Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api";
import { PageHeader } from "@/components/portal/portal-shell";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/portal/disaster")({
  component: Disaster,
});

// ── Types ──────────────────────────────────────────────────────────────────

interface Alert {
  id: string;
  title: string;
  description: string;
  disaster_type: string;
  severity: "critical" | "high" | "watch";
  affected_zones: string[];
  status: "active" | "resolved" | "cancelled";
  broadcast_sms: boolean;
  broadcast_call: boolean;
  created_by: string;
  created_at: string;
  resolved_at: string | null;
  recipients_count: number;
  sms_sent: number;
  call_sent: number;
  acknowledged_count: number;
  creator_name: string | null;
}

interface AlertStats {
  total_alerts: number;
  active_alerts: number;
  total_sms_sent: number;
  total_calls_made: number;
  total_citizens_reached: number;
  critical_count: number;
  high_count: number;
  watch_count: number;
}

const ZONES = ["All Zones", "North District", "South District", "East District", "West District", "Coastal Zone", "Central Zone"];
const DISASTER_TYPES = [
  { value: "flood", label: "Flood" }, { value: "cyclone", label: "Cyclone" },
  { value: "earthquake", label: "Earthquake" }, { value: "fire", label: "Fire" },
  { value: "landslide", label: "Landslide" }, { value: "other", label: "Other" },
];

const severityColors = {
  critical: "text-destructive border-destructive/30 bg-destructive/10",
  high: "text-orange-500 border-orange-500/30 bg-orange-500/10",
  watch: "text-warning border-warning/30 bg-warning/10",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Broadcast Dialog ───────────────────────────────────────────────────────

function BroadcastDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", disaster_type: "flood", severity: "watch",
    affected_zones: [] as string[], broadcast_sms: true, broadcast_call: false,
  });

  const handleSubmit = async () => {
    if (!form.title || !form.description || form.affected_zones.length === 0) {
      toast.error("Fill all fields and select zones."); return;
    }
    setLoading(true);
    try {
      await api.post("/api/disaster/alerts", form);
      toast.success("Broadcast initiated.");
      setOpen(false); onCreated();
    } catch {
      toast.error("Failed to broadcast.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90">
          <Siren className="mr-2 h-3.5 w-3.5" /> Issue Emergency Alert
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader><DialogTitle className="text-sm font-semibold">Broadcast Emergency Alert</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid gap-2">
            <Label className="text-xs">Title</Label>
            <Input className="h-8 text-xs" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-xs">Disaster Type</Label>
              <Select value={form.disaster_type} onValueChange={v => setForm(f => ({ ...f, disaster_type: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{DISASTER_TYPES.map(d => <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Severity Level</Label>
              <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="watch" className="text-xs">Watch</SelectItem>
                  <SelectItem value="high" className="text-xs">High</SelectItem>
                  <SelectItem value="critical" className="text-xs">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label className="text-xs">Affected Zones</Label>
            <div className="grid grid-cols-3 gap-2">
              {ZONES.filter(z => z !== "All Zones").map(z => (
                <label key={z} className="flex items-center gap-2 border border-border p-2 rounded-sm cursor-pointer hover:bg-muted/30">
                  <Checkbox checked={form.affected_zones.includes(z)} onCheckedChange={() => {
                    setForm(f => ({ ...f, affected_zones: f.affected_zones.includes(z) ? f.affected_zones.filter(x => x !== z) : [...f.affected_zones, z] }))
                  }} />
                  <span className="text-[10px] uppercase font-semibold">{z}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label className="text-xs">Message</Label>
            <Textarea className="h-20 text-xs resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <Button className="w-full h-8 text-xs" onClick={handleSubmit} disabled={loading}>{loading ? "Broadcasting..." : "Confirm Broadcast"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Admin Command Center ───────────────────────────────────────────────────

function AdminView() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, sRes] = await Promise.all([api.get<Alert[]>("/api/disaster/alerts"), api.get<AlertStats>("/api/disaster/stats")]);
      setAlerts(aRes.data); setStats(sRes.data);
    } catch { toast.error("Data sync failed."); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 30000); return () => clearInterval(t); }, [fetchData]);

  const activeAlerts = alerts.filter(a => a.status === "active");

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4">
      <PageHeader 
        title="Emergency Operations Command" 
        description="Global situation awareness, active incident tracking, and mass communication systems."
        actions={<div className="flex gap-2"><BroadcastDialog onCreated={fetchData} /></div>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Telemetry Bar */}
        <Card className="md:col-span-4 shadow-none border-border">
          <CardContent className="p-0 flex divide-x divide-border/50">
            <div className="flex-1 p-4"><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Active Incidents</p><h3 className="text-xl font-bold">{stats?.active_alerts ?? 0}</h3></div>
            <div className="flex-1 p-4"><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Critical Priority</p><h3 className="text-xl font-bold text-destructive">{stats?.critical_count ?? 0}</h3></div>
            <div className="flex-1 p-4"><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Citizens Reached</p><h3 className="text-xl font-bold text-primary">{stats?.total_citizens_reached ?? 0}</h3></div>
            <div className="flex-1 p-4"><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">SMS Dispatched</p><h3 className="text-xl font-bold">{stats?.total_sms_sent ?? 0}</h3></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Left: Interactive Map/Grid representation */}
        <Card className="flex-[2] shadow-none border-border flex flex-col relative overflow-hidden bg-slate-900 dark:bg-slate-950">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
          <div className="absolute inset-0 flex items-center justify-center p-8">
             {activeAlerts.map((a, i) => (
                <div key={a.id} className="absolute flex flex-col items-center gap-1 animate-in fade-in zoom-in" style={{ top: `${20 + (i*15)}%`, left: `${30 + (i*20)}%` }}>
                  <div className="relative flex h-8 w-8 items-center justify-center">
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${a.severity === 'critical' ? 'bg-destructive' : 'bg-orange-500'}`} />
                    <span className={`relative inline-flex h-4 w-4 rounded-full ${a.severity === 'critical' ? 'bg-destructive' : 'bg-orange-500'}`} />
                  </div>
                  <div className="bg-background/80 backdrop-blur text-foreground border border-border text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm shadow-xl">
                    {a.affected_zones[0]}
                  </div>
                </div>
             ))}
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex gap-2">
            <Card className="shadow-2xl border-white/10 bg-black/40 backdrop-blur-md text-white flex-1 p-3 flex justify-between items-center">
               <div className="flex items-center gap-2 text-xs font-mono"><Target className="h-4 w-4 text-success" /> SYSTEM NOMINAL</div>
               <div className="text-[10px] opacity-70 uppercase tracking-widest">Global Watchdog Online</div>
            </Card>
          </div>
        </Card>

        {/* Right: Incident Queue */}
        <Card className="flex-1 shadow-none border-border flex flex-col min-w-[350px]">
          <CardHeader className="p-4 border-b border-border/50 bg-muted/20 sticky top-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2"><AlertOctagon className="h-4 w-4 text-destructive" /> Active Incident Queue</CardTitle>
              <Badge variant="secondary" className="text-[10px]">{activeAlerts.length} OPEN</Badge>
            </div>
          </CardHeader>
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {activeAlerts.map(a => (
              <div key={a.id} className="border border-border rounded-sm p-3 bg-card hover:bg-muted/30 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className={`text-[9px] uppercase tracking-wider font-bold rounded-sm ${severityColors[a.severity]}`}>{a.severity}</Badge>
                  <span className="text-[10px] font-mono text-muted-foreground">{timeAgo(a.created_at)}</span>
                </div>
                <h4 className="text-xs font-bold leading-tight mb-1">{a.title}</h4>
                <p className="text-[10px] text-muted-foreground line-clamp-2 mb-3">{a.description}</p>
                <div className="flex items-center gap-2 text-[10px] font-mono border-t border-border/50 pt-2">
                  <span className="flex items-center gap-1 text-primary"><Smartphone className="h-3 w-3" /> {a.sms_sent}</span>
                  <span className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" /> {a.call_sent}</span>
                  <span className="flex items-center gap-1 text-success ml-auto"><CheckCircle2 className="h-3 w-3" /> {a.acknowledged_count}/{a.recipients_count} Ack</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="h-6 text-[10px] w-full text-success hover:text-success hover:bg-success/10 border-success/30" onClick={async () => { await api.put(`/api/disaster/alerts/${a.id}/resolve`); fetchData(); }}>Resolve</Button>
                </div>
              </div>
            ))}
            {activeAlerts.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-12 text-center opacity-50">
                <Shield className="h-8 w-8 mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">No Active Incidents</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Officer View ───────────────────────────────────────────────────────────

function OfficerView() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const fetchAlerts = useCallback(async () => {
    try { const { data } = await api.get<Alert[]>("/api/disaster/alerts"); setAlerts(data); } catch {}
  }, []);
  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const activeAlerts = alerts.filter(a => a.status === "active");

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4">
      <PageHeader 
        title={`Zone Command: ${user?.zone || 'Unassigned'}`} 
        description="Local incident management and response acknowledgement."
        actions={<Button size="sm" variant="outline" className="h-8 text-xs" onClick={fetchAlerts}><RefreshCw className="mr-2 h-3.5 w-3.5" /> Sync Data</Button>}
      />
      <div className="flex flex-1 gap-4 min-h-0">
        <div className="flex-1 flex flex-col gap-4">
          <Card className="shadow-none border-border">
            <CardHeader className="p-4 border-b border-border/50"><CardTitle className="text-sm">Action Required</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-3">
               {activeAlerts.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">No incidents in your zone.</p> : activeAlerts.map(a => (
                 <div key={a.id} className={`border p-4 rounded-sm ${a.severity === 'critical' ? 'border-destructive bg-destructive/10' : 'border-border bg-card'}`}>
                   <h4 className="text-sm font-bold">{a.title}</h4>
                   <p className="text-xs mt-1 text-muted-foreground">{a.description}</p>
                   <Button size="sm" className="mt-4 h-8 text-xs" onClick={async () => { await api.post(`/api/disaster/alerts/${a.id}/acknowledge`); fetchAlerts(); }}>Acknowledge Orders</Button>
                 </div>
               ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Citizen View ───────────────────────────────────────────────────────────

function CitizenView() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  useEffect(() => { api.get<Alert[]>("/api/disaster/alerts").then(r => setAlerts(r.data)).catch(console.error); }, []);
  const activeAlerts = alerts.filter(a => a.status === "active");

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-6">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-2xl font-bold text-foreground">Emergency Information System</h1>
        <p className="text-sm text-muted-foreground">Official alerts and advisories for your area.</p>
      </div>
      {activeAlerts.length > 0 && (
        <div className="rounded-md border-2 border-destructive bg-destructive/10 p-6">
          <h2 className="text-lg font-bold text-destructive mb-4 flex items-center gap-2"><Siren className="h-5 w-5 animate-pulse" /> ATTENTION REQUIRED</h2>
          <div className="space-y-4">
            {activeAlerts.map(a => (
              <div key={a.id} className="bg-background p-4 rounded-sm border border-border">
                <Badge variant="destructive" className="mb-2 text-[10px]">{a.severity.toUpperCase()}</Badge>
                <h3 className="font-bold">{a.title}</h3>
                <p className="text-sm mt-1">{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {!activeAlerts.length && (
        <div className="rounded-md border border-border bg-card p-12 text-center text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="font-bold text-foreground">No Active Emergencies</h3>
          <p className="text-sm mt-1">Conditions are nominal.</p>
        </div>
      )}
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────

function Disaster() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "admin") return <AdminView />;
  if (user.role === "officer") return <OfficerView />;
  return <CitizenView />;
}
