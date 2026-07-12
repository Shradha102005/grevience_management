import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Siren, Radio, MapPin, Phone, ShieldAlert, CheckCircle2, Clock,
  AlertTriangle, XCircle, RefreshCw, Activity,
  Shield, AlertOctagon, Smartphone, Target, X, Zap,
  Users, MessageSquare, Eye, ChevronRight, Loader2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api";

export const Route = createFileRoute("/portal/disaster")({
  component: Disaster,
});

//  types 
interface Alert {
  id: string; title: string; description: string; disaster_type: string;
  severity: "critical" | "high" | "watch";
  affected_zones: string[]; status: "active" | "resolved" | "cancelled";
  broadcast_sms: boolean; broadcast_call: boolean;
  created_by: string; created_at: string; resolved_at: string | null;
  recipients_count: number; sms_sent: number; call_sent: number;
  acknowledged_count: number; creator_name: string | null;
}
interface AlertStats {
  total_alerts: number; active_alerts: number; total_sms_sent: number;
  total_calls_made: number; total_citizens_reached: number;
  critical_count: number; high_count: number; watch_count: number;
}

const ZONES = ["North District","South District","East District","West District","Coastal Zone","Central Zone"];
const DISASTER_TYPES = [
  { value: "flood", label: "🌊 Flood" }, { value: "cyclone", label: "🌀 Cyclone" },
  { value: "earthquake", label: "🏚 Earthquake" }, { value: "fire", label: "🔥 Fire" },
  { value: "landslide", label: "⛰ Landslide" }, { value: "other", label: "⚠️ Other" },
];

const SEV_CFG = {
  critical: { color: "#f43f5e", bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.3)", glow: "rgba(244,63,94,0.2)", label: "CRITICAL" },
  high:     { color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)", glow: "rgba(249,115,22,0.15)", label: "HIGH" },
  watch:    { color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)", glow: "rgba(251,191,36,0.15)", label: "WATCH" },
};

const DT_ICONS: Record<string,string> = { flood:"🌊", cyclone:"🌀", earthquake:"🏚", fire:"🔥", landslide:"⛰", other:"⚠️" };

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

//  Broadcast modal 
function BroadcastModal({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", disaster_type: "flood", severity: "watch",
    affected_zones: [] as string[], broadcast_sms: true, broadcast_call: false,
  });

  const handleSubmit = async () => {
    if (!form.title || !form.description || form.affected_zones.length === 0) {
      toast.error("Fill all fields and select at least one zone."); return;
    }
    setLoading(true);
    try {
      await api.post("/api/disaster/alerts", form);
      toast.success("Emergency broadcast initiated.");
      onCreated(); onClose();
    } catch { toast.error("Broadcast failed. Check connection."); } finally { setLoading(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", zIndex: 60, animation: "fadeIn 0.2s ease" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "min(540px, 90vw)", background: "var(--color-background)",
        borderRadius: "20px", border: "1px solid rgba(244,63,94,0.25)",
        boxShadow: "0 30px 80px rgba(244,63,94,0.15)", zIndex: 70,
        animation: "popIn 0.25s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(244,63,94,0.12)", background: "linear-gradient(180deg,rgba(244,63,94,0.06) 0%,transparent 100%)", borderRadius: "20px 20px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg,#f43f5e,#e11d48)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(244,63,94,0.4)" }}>
              <Siren style={{ width: 17, height: 17, color: "white" }} className="animate-pulse" />
            </div>
            <div>
              <h2 style={{ fontSize: "14px", fontWeight: 800, color: "var(--color-foreground)", margin: 0 }}>Issue Emergency Alert</h2>
              <p style={{ fontSize: "14px", color: "var(--color-muted-foreground)", margin: 0 }}>This will broadcast to all registered recipients in selected zones</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: "32px", height: "32px", borderRadius: "9px", border: "1px solid rgba(244,63,94,0.2)", background: "rgba(244,63,94,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X style={{ width: 13, height: 13, color: "var(--color-muted-foreground)" }} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Title */}
          <div>
            <label style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "6px" }}>Alert Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Cyclone Warning — Coastal Zone"
              style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "10px", border: "1px solid rgba(244,63,94,0.2)", background: "rgba(244,63,94,0.03)", color: "var(--color-foreground)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
              onFocus={e => (e.target as HTMLInputElement).style.borderColor = "rgba(244,63,94,0.5)"}
              onBlur={e  => (e.target as HTMLInputElement).style.borderColor = "rgba(244,63,94,0.2)"} />
          </div>

          {/* Type + Severity */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "6px" }}>Disaster Type</label>
              <Select value={form.disaster_type} onValueChange={v => setForm(f => ({ ...f, disaster_type: v }))}>
                <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{DISASTER_TYPES.map(d => <SelectItem key={d.value} value={d.value} className="text-sm">{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "6px" }}>Severity Level</label>
              <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="watch" className="text-sm">🟡 Watch</SelectItem>
                  <SelectItem value="high"  className="text-sm">🟠 High</SelectItem>
                  <SelectItem value="critical" className="text-sm">🔴 Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Zones */}
          <div>
            <label style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "8px" }}>Affected Zones</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
              {ZONES.map(z => {
                const checked = form.affected_zones.includes(z);
                return (
                  <label key={z}
                    style={{ display: "flex", alignItems: "center", gap: "7px", padding: "7px 10px", borderRadius: "9px", cursor: "pointer", border: `1px solid ${checked ? "rgba(244,63,94,0.35)" : "rgba(244,63,94,0.12)"}`, background: checked ? "rgba(244,63,94,0.08)" : "transparent", transition: "all 0.15s" }}>
                    <Checkbox checked={checked} onCheckedChange={() => setForm(f => ({ ...f, affected_zones: f.affected_zones.includes(z) ? f.affected_zones.filter(x => x !== z) : [...f.affected_zones, z] }))} />
                    <span style={{ fontSize: "14px", fontWeight: 600, color: checked ? "#f43f5e" : "var(--color-muted-foreground)" }}>{z}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Message */}
          <div>
            <label style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "6px" }}>Alert Message</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe the emergency and any immediate actions citizens should take…"
              style={{ width: "100%", height: "80px", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(244,63,94,0.2)", background: "rgba(244,63,94,0.03)", color: "var(--color-foreground)", fontSize: "14px", resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box" }}
              onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = "rgba(244,63,94,0.5)"}
              onBlur={e  => (e.target as HTMLTextAreaElement).style.borderColor = "rgba(244,63,94,0.2)"} />
          </div>

          {/* Broadcast options */}
          <div style={{ display: "flex", gap: "12px" }}>
            {[{ key: "broadcast_sms", label: "📱 SMS Broadcast" }, { key: "broadcast_call", label: "📞 Voice Call" }].map(({ key, label }) => {
              const val = form[key as keyof typeof form] as boolean;
              return (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "10px", border: `1px solid ${val ? "rgba(244,63,94,0.3)" : "rgba(244,63,94,0.12)"}`, background: val ? "rgba(244,63,94,0.06)" : "transparent", cursor: "pointer", flex: 1 }}>
                  <Checkbox checked={val} onCheckedChange={() => setForm(f => ({ ...f, [key]: !val }))} />
                  <span style={{ fontSize: "14px", fontWeight: 600, color: val ? "#f43f5e" : "var(--color-muted-foreground)" }}>{label}</span>
                </label>
              );
            })}
          </div>

          <button onClick={handleSubmit} disabled={loading}
            style={{ height: "44px", borderRadius: "12px", background: loading ? "rgba(244,63,94,0.15)" : "linear-gradient(135deg,#f43f5e,#e11d48)", border: "none", color: loading ? "#f43f5e" : "white", fontSize: "14px", fontWeight: 700, cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: loading ? "none" : "0 4px 20px rgba(244,63,94,0.4)" }}>
            {loading ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />Broadcasting…</> : <><Siren style={{ width: 15, height: 15 }} />Confirm Emergency Broadcast</>}
          </button>
        </div>
      </div>
      <style>{`@keyframes popIn{from{opacity:0;transform:translate(-50%,-45%)}to{opacity:1;transform:translate(-50%,-50%)}}`}</style>
    </>
  );
}

//  Alert card (shared) 
function AlertCard({ alert: a, onAction, actionLabel, actionColor }: {
  alert: Alert; onAction?: () => void; actionLabel?: string; actionColor?: string;
}) {
  const cfg = SEV_CFG[a.severity] ?? SEV_CFG.watch;
  const ackPct = a.recipients_count > 0 ? Math.round((a.acknowledged_count / a.recipients_count) * 100) : 0;
  return (
    <div style={{
      background: "rgba(255,255,255,0.6)", backdropFilter: "blur(24px)", borderRadius: "16px",
      border: `1px solid ${cfg.border}`,
      boxShadow: `0 4px 20px ${cfg.glow}`, overflow: "hidden",
      transition: "all 0.2s",
    }}>
      {/* Severity accent */}
      <div style={{ height: "3px", background: cfg.color }} />
      <div style={{ padding: "14px 16px" }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px" }}>{DT_ICONS[a.disaster_type] ?? "⚠️"}</span>
            <span style={{ fontSize: "14px", fontWeight: 800, padding: "2px 8px", borderRadius: "20px", background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, textTransform: "uppercase", letterSpacing: "0.07em" }}>{cfg.label}</span>
            {a.status !== "active" && (
              <span style={{ fontSize: "14px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)" }}>
                {a.status === "resolved" ? "Resolved" : "Cancelled"}
              </span>
            )}
          </div>
          <span style={{ fontSize: "14px", color: "var(--color-muted-foreground)", fontFamily: "monospace", flexShrink: 0 }}>{timeAgo(a.created_at)}</span>
        </div>

        <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-foreground)", marginBottom: "5px", lineHeight: 1.3 }}>{a.title}</h4>
        <p style={{ fontSize: "14px", color: "var(--color-muted-foreground)", lineHeight: 1.55, marginBottom: "12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.description}</p>

        {/* Zones */}
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "12px" }}>
          {a.affected_zones.map(z => (
            <span key={z} style={{ fontSize: "14px", padding: "2px 8px", borderRadius: "20px", background: "rgba(139,92,246,0.08)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.15)", fontWeight: 600 }}>
              <MapPin style={{ width: 9, height: 9, display: "inline", marginRight: "3px" }} />{z}
            </span>
          ))}
        </div>

        {/* Comms stats */}
        <div style={{ display: "flex", gap: "12px", padding: "10px 12px", background: "rgba(139,92,246,0.04)", borderRadius: "9px", border: "1px solid rgba(139,92,246,0.08)", marginBottom: actionLabel ? "12px" : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <Smartphone style={{ width: 12, height: 12, color: "#a78bfa" }} />
            <span style={{ fontSize: "14px", color: "var(--color-foreground)", fontWeight: 700 }}>{a.sms_sent}</span>
            <span style={{ fontSize: "14px", color: "var(--color-muted-foreground)" }}>SMS</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <Phone style={{ width: 12, height: 12, color: "#60a5fa" }} />
            <span style={{ fontSize: "14px", color: "var(--color-foreground)", fontWeight: 700 }}>{a.call_sent}</span>
            <span style={{ fontSize: "14px", color: "var(--color-muted-foreground)" }}>Calls</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginLeft: "auto" }}>
            <CheckCircle2 style={{ width: 12, height: 12, color: "#34d399" }} />
            <span style={{ fontSize: "14px", color: "#34d399", fontWeight: 700 }}>{a.acknowledged_count}/{a.recipients_count}</span>
            <span style={{ fontSize: "14px", color: "var(--color-muted-foreground)" }}>Ack</span>
          </div>
        </div>

        {/* Ack progress bar */}
        {a.recipients_count > 0 && (
          <div style={{ height: "4px", borderRadius: "2px", background: "rgba(139,92,246,0.1)", marginBottom: actionLabel ? "10px" : 0, marginTop: "8px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${ackPct}%`, background: "linear-gradient(90deg,#34d399,#059669)", borderRadius: "2px", transition: "width 0.8s ease" }} />
          </div>
        )}

        {/* Action button */}
        {actionLabel && onAction && (
          <button onClick={onAction}
            style={{ width: "100%", height: "36px", borderRadius: "9px", border: `1px solid ${actionColor ?? "rgba(52,211,153,0.3)"}`, background: "rgba(52,211,153,0.08)", color: "#34d399", fontSize: "14px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "all 0.15s" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(52,211,153,0.15)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(52,211,153,0.08)"}>
            <CheckCircle2 style={{ width: 13, height: 13 }} />{actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

//  ADMIN VIEW 
function AdminView() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats]   = useState<AlertStats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [lastSync, setLastSync]   = useState<Date | null>(null);
  const [pulseKey, setPulseKey]   = useState(0);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [aRes, sRes] = await Promise.all([
        api.get<Alert[]>("/api/disaster/alerts"),
        api.get<AlertStats>("/api/disaster/stats"),
      ]);
      setAlerts(aRes.data); setStats(sRes.data);
      setLastSync(new Date()); setPulseKey(k => k + 1);
    } catch { toast.error("Data sync failed."); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(t);
  }, [fetchData]);

  const activeAlerts   = alerts.filter(a => a.status === "active");
  const resolvedAlerts = alerts.filter(a => a.status !== "active");

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] relative overflow-hidden font-sans bg-transparent animate-in fade-in duration-500">
      {/* Premium Ambient Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-rose-500/20 dark:bg-rose-900/30 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-red-500/20 dark:bg-red-900/30 blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(148,163,184,0.1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      </div>

      {/*  Header  */}
      <div className="shrink-0 z-20 px-6 lg:px-10 pt-8 pb-4 border-b border-rose-500/10">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-3">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-600 via-red-500 to-orange-500 animate-gradient-x">
                Emergency Operations
              </span>
              <AlertOctagon className="text-rose-500 h-10 w-10 animate-pulse" />
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 ml-2">
                <span key={pulseKey} className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest">Live · 30s</span>
              </div>
            </h1>
            <p className="text-slate-500/80 dark:text-slate-400 mt-2 font-medium text-sm md:text-base">Situation Awareness · Incident Tracking · Mass Communication</p>
          </div>
          
          <div className="flex items-center gap-4">
             {lastSync && <span className="text-sm font-mono text-slate-400">Synced {lastSync.toLocaleTimeString("en-IN")}</span>}
             <button onClick={() => fetchData()} className="h-14 w-14 rounded-[1.25rem] bg-white/60 backdrop-blur-2xl dark:bg-[#1A1F2E]/60 border border-white/60 dark:border-slate-700 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center text-rose-600">
               <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
             </button>
             <button onClick={() => setShowModal(true)} className="h-10 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 shadow-xl shadow-rose-500/30 text-white flex items-center gap-3 font-extrabold text-sm hover:scale-105 transition-all">
               <Siren className="w-4 h-4 animate-pulse" /> Issue Alert
             </button>
          </div>
        </div>
      </div>

      {/*  Stat chips  */}
      <div style={{ display: "flex", gap: "10px", padding: "14px 28px", flexShrink: 0, borderBottom: "1px solid rgba(244,63,94,0.06)" }}>
        {[
          { icon: Activity,   label: "Active Incidents",    value: stats?.active_alerts ?? 0,          color: "#f43f5e" },
          { icon: AlertTriangle, label: "Critical",          value: stats?.critical_count ?? 0,         color: "#f43f5e" },
          { icon: Zap,        label: "High Priority",       value: stats?.high_count ?? 0,             color: "#f97316" },
          { icon: ShieldAlert, label: "Watch",              value: stats?.watch_count ?? 0,            color: "#fbbf24" },
          { icon: Users,      label: "Citizens Reached",    value: stats?.total_citizens_reached ?? 0, color: "#a78bfa" },
          { icon: Smartphone, label: "SMS Dispatched",      value: stats?.total_sms_sent ?? 0,         color: "#60a5fa" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{ flex: 1, padding: "12px 14px", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(24px)", borderRadius: "16px", boxShadow: "0 20px 25px -5px rgba(226, 232, 240, 0.4)", border: "1px solid rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: `${color}12`, border: `1px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon style={{ width: 15, height: 15, color }} />
            </div>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 800, color, lineHeight: 1, margin: 0, fontVariantNumeric: "tabular-nums" }}>{value.toLocaleString()}</p>
              <p style={{ fontSize: "14px", color: "var(--color-muted-foreground)", margin: 0, fontWeight: 600, marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/*  Main area  */}
      <div style={{ flex: 1, display: "flex", gap: "0", overflow: "hidden" }}>

        {/* Left: Map visualisation */}
        <div style={{ flex: 2, background: "#08080e", position: "relative", overflow: "hidden" }}>
          {/* Grid dots */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 2px 2px, rgba(244,63,94,0.12) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
          {/* Scan line */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg,transparent,rgba(244,63,94,0.6),transparent)", animation: "scanLine 3s ease-in-out infinite" }} />

          {/* Alert ping markers */}
          {activeAlerts.map((a, i) => {
            const cfg = SEV_CFG[a.severity] ?? SEV_CFG.watch;
            const positions = [[22,35],[45,60],[65,28],[30,70],[72,55],[55,80]];
            const [top, left] = positions[i % positions.length];
            return (
              <div key={a.id} style={{ position: "absolute", top: `${top}%`, left: `${left}%`, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", animation: "fadeIn 0.4s ease" }}>
                {/* Ping rings */}
                <div style={{ position: "relative", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", background: cfg.color, opacity: 0.15, animation: "ping 1.5s ease-out infinite" }} />
                  <span style={{ position: "absolute", width: "70%", height: "70%", borderRadius: "50%", background: cfg.color, opacity: 0.1, animation: "ping 1.5s ease-out infinite", animationDelay: "0.3s" }} />
                  <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: cfg.color, boxShadow: `0 0 12px ${cfg.color}`, zIndex: 1, display: "block" }} />
                </div>
                <div style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: "14px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", padding: "3px 8px", borderRadius: "6px", whiteSpace: "nowrap", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {a.affected_zones[0]}
                </div>
                <div style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.7)", fontSize: "14px", padding: "2px 7px", borderRadius: "4px", maxWidth: "110px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.title}
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {activeAlerts.length === 0 && !loading && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
              <Shield style={{ width: 48, height: 48, color: "rgba(52,211,153,0.3)" }} />
              <p style={{ fontSize: "14px", fontWeight: 700, color: "rgba(52,211,153,0.6)", textTransform: "uppercase", letterSpacing: "0.1em" }}>System Nominal</p>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.2)" }}>No active incidents detected</p>
            </div>
          )}

          {/* Status bar at bottom */}
          <div style={{ position: "absolute", bottom: "16px", left: "16px", right: "16px", padding: "10px 16px", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)", borderRadius: "10px", border: "1px solid rgba(244,63,94,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Target style={{ width: 14, height: 14, color: "#34d399" }} />
              <span style={{ fontSize: "14px", fontFamily: "monospace", color: "#34d399", fontWeight: 700 }}>GLOBAL WATCHDOG ONLINE</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f43f5e", display: "block", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>LIVE MONITORING · {activeAlerts.length} INCIDENTS</span>
            </div>
          </div>
        </div>

        {/* Right: Incident queue */}
        <div style={{ width: "360px", flexShrink: 0, borderLeft: "1px solid rgba(244,63,94,0.1)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(244,63,94,0.1)", background: "linear-gradient(180deg,rgba(244,63,94,0.04) 0%,transparent 100%)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <AlertOctagon style={{ width: 14, height: 14, color: "#f43f5e" }} />
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-foreground)" }}>Active Incident Queue</span>
            </div>
            <span style={{ fontSize: "14px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: "rgba(244,63,94,0.12)", color: "#f43f5e", border: "1px solid rgba(244,63,94,0.25)" }}>{activeAlerts.length} OPEN</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
            {loading && !alerts.length ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                <Loader2 style={{ width: 24, height: 24, color: "#f43f5e" }} className="animate-spin" />
              </div>
            ) : activeAlerts.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "200px", gap: "10px" }}>
                <Shield style={{ width: 32, height: 32, color: "rgba(52,211,153,0.3)" }} />
                <p style={{ fontSize: "14px", color: "var(--color-muted-foreground)" }}>No active incidents</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {activeAlerts.map(a => (
                  <AlertCard key={a.id} alert={a}
                    actionLabel="Mark Resolved"
                    onAction={async () => { await api.put(`/api/disaster/alerts/${a.id}/resolve`); fetchData(); }} />
                ))}
              </div>
            )}
          </div>

          {/* Resolved section */}
          {resolvedAlerts.length > 0 && (
            <>
              <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(244,63,94,0.08)", flexShrink: 0 }}>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Recently Resolved · {resolvedAlerts.length}</p>
              </div>
              <div style={{ maxHeight: "180px", overflowY: "auto", padding: "0 12px 12px" }}>
                {resolvedAlerts.slice(0, 3).map(a => (
                  <div key={a.id} style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.12)", marginBottom: "7px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "3px" }}>
                      <CheckCircle2 style={{ width: 12, height: 12, color: "#34d399" }} />
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-foreground)" }}>{a.title}</span>
                    </div>
                    <span style={{ fontSize: "14px", color: "var(--color-muted-foreground)" }}>{timeAgo(a.resolved_at ?? a.created_at)} · {a.affected_zones[0]}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && <BroadcastModal onCreated={fetchData} onClose={() => setShowModal(false)} />}
      <style>{`
        @keyframes ping     { 0%{transform:scale(1);opacity:1} 75%,100%{transform:scale(2);opacity:0} }
        @keyframes scanLine { 0%{top:0} 50%{top:100%} 100%{top:0} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  );
}

//  OFFICER VIEW 
function OfficerView() {
  const { user } = useAuth();
  const [alerts, setAlerts]   = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const fetchAlerts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get<Alert[]>("/api/disaster/alerts");
      setAlerts(data); setLastSync(new Date());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const t = setInterval(() => fetchAlerts(true), 30000);
    return () => clearInterval(t);
  }, [fetchAlerts]);

  const activeAlerts = alerts.filter(a => a.status === "active");

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] relative overflow-hidden font-sans bg-transparent animate-in fade-in duration-500">
      {/* Premium Ambient Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-orange-500/20 dark:bg-orange-900/30 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-red-500/20 dark:bg-red-900/30 blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(148,163,184,0.1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      </div>

      {/* Header */}
      <div className="shrink-0 z-20 px-6 lg:px-10 pt-8 pb-4 border-b border-orange-500/10">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-3">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-600 via-red-500 to-rose-500 animate-gradient-x">
                Zone Command
              </span>
              <Shield className="text-orange-500 h-10 w-10 animate-pulse" />
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 ml-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Live</span>
              </div>
            </h1>
            <p className="text-slate-500/80 dark:text-slate-400 mt-2 font-medium text-sm md:text-base">{user?.zone || "Unassigned Zone"} · Officer Dashboard</p>
          </div>
          
          <div className="flex items-center gap-4">
             {lastSync && <span className="text-sm font-mono text-slate-400">Synced {lastSync.toLocaleTimeString("en-IN")}</span>}
             <button onClick={() => fetchAlerts()} className="h-14 w-14 rounded-[1.25rem] bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-xl shadow-orange-500/30 text-white flex items-center justify-center hover:scale-105 transition-all">
               <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
             </button>
          </div>
        </div>
      </div>

      {/* Stat strip */}
      <div style={{ display: "flex", gap: "10px", padding: "14px 28px", flexShrink: 0, borderBottom: "1px solid rgba(244,63,94,0.06)" }}>
        {[
          { label: "Active Orders", value: activeAlerts.length, color: "#f43f5e", icon: AlertOctagon },
          { label: "Critical",  value: activeAlerts.filter(a => a.severity === "critical").length, color: "#f43f5e", icon: AlertTriangle },
          { label: "High",      value: activeAlerts.filter(a => a.severity === "high").length,     color: "#f97316", icon: ShieldAlert },
          { label: "Watch",     value: activeAlerts.filter(a => a.severity === "watch").length,    color: "#fbbf24", icon: Eye },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} style={{ flex: 1, padding: "12px 16px", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(24px)", borderRadius: "16px", boxShadow: "0 20px 25px -5px rgba(226, 232, 240, 0.4)", border: "1px solid rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: `${color}12`, border: `1px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon style={{ width: 15, height: 15, color }} />
            </div>
            <div>
              <p style={{ fontSize: "24px", fontWeight: 800, color, lineHeight: 1, margin: 0 }}>{value}</p>
              <p style={{ fontSize: "14px", color: "var(--color-muted-foreground)", margin: 0, fontWeight: 600, marginTop: "2px" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alert cards */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 28px" }}>
        {loading && !alerts.length ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
            <Loader2 style={{ width: 28, height: 28, color: "#f43f5e" }} className="animate-spin" />
          </div>
        ) : activeAlerts.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "200px", gap: "12px" }}>
            <Shield style={{ width: 40, height: 40, color: "rgba(52,211,153,0.3)" }} />
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#34d399" }}>No Active Incidents in Your Zone</p>
            <p style={{ fontSize: "14px", color: "var(--color-muted-foreground)" }}>All conditions are nominal. Dashboard auto-refreshes every 30s.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: "14px" }}>
            {activeAlerts.map(a => (
              <AlertCard key={a.id} alert={a}
                actionLabel="Acknowledge Orders"
                onAction={async () => { await api.post(`/api/disaster/alerts/${a.id}/acknowledge`); fetchAlerts(); }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

//  CITIZEN VIEW 
function CitizenView() {
  const [alerts, setAlerts]   = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Alert[]>("/api/disaster/alerts")
      .then(r => setAlerts(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
    const t = setInterval(() => {
      api.get<Alert[]>("/api/disaster/alerts").then(r => setAlerts(r.data)).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const activeAlerts = alerts.filter(a => a.status === "active");
  const hasCritical  = activeAlerts.some(a => a.severity === "critical");

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] relative overflow-hidden font-sans bg-transparent animate-in fade-in duration-500">
      {/* Premium Ambient Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-rose-500/20 dark:bg-rose-900/30 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-red-500/20 dark:bg-red-900/30 blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(148,163,184,0.1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      </div>

      {/* Header */}
      <div className={`shrink-0 z-20 px-6 lg:px-10 pt-8 pb-4 border-b ${hasCritical ? "border-rose-500/30 bg-rose-500/5" : "border-slate-200/20"}`}>
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-3">
              <span className={`bg-clip-text text-transparent bg-gradient-to-r ${hasCritical ? "from-rose-600 via-red-500 to-orange-500 animate-pulse" : "from-slate-700 to-slate-500 dark:from-slate-200 dark:to-slate-400"}`}>
                Emergency Alerts
              </span>
              {hasCritical ? <Siren className="text-rose-500 h-10 w-10 animate-bounce" style={{ animationDuration: '2s' }} /> : <Shield className="text-emerald-500 h-10 w-10" />}
            </h1>
            <p className="text-slate-500/80 dark:text-slate-400 mt-2 font-medium text-sm md:text-base">Official alerts and advisories · Auto-refreshes every 30s</p>
          </div>
          
          {hasCritical && (
            <div className="flex items-center gap-2 px-6 py-3 rounded-[1.25rem] bg-rose-500/10 border border-rose-500/30 shadow-xl shadow-rose-500/20 animate-pulse">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400 tracking-widest uppercase">Attention Required</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 28px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px" }}>
            <Loader2 style={{ width: 28, height: 28, color: "#f43f5e" }} className="animate-spin" />
          </div>
        ) : activeAlerts.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "300px", gap: "16px" }}>
            <div style={{ width: "80px", height: "80px", borderRadius: "24px", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield style={{ width: 40, height: 40, color: "#34d399" }} />
            </div>
            <h2 style={{ fontSize: "14px", fontWeight: 800, color: "#34d399", margin: 0 }}>No Active Emergencies</h2>
            <p style={{ fontSize: "14px", color: "var(--color-muted-foreground)", textAlign: "center", maxWidth: "360px" }}>
              All conditions in your area are nominal. This page will automatically update if an alert is issued.
            </p>
          </div>
        ) : (
          <div style={{ maxWidth: "720px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ padding: "12px 16px", borderRadius: "12px", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <Siren style={{ width: 16, height: 16, color: "#f43f5e" }} className="animate-pulse" />
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#f43f5e", margin: 0 }}>
                {activeAlerts.length} active emergency alert{activeAlerts.length > 1 ? "s" : ""} in your area — please follow official instructions.
              </p>
            </div>
            {activeAlerts.map(a => <AlertCard key={a.id} alert={a} />)}
          </div>
        )}
      </div>
      <style>{`@keyframes ping{0%{transform:scale(1);opacity:1}75%,100%{transform:scale(2);opacity:0}}`}</style>
    </div>
  );
}

//  Root 
function Disaster() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "admin")   return <AdminView />;
  if (user.role === "officer") return <OfficerView />;
  return <CitizenView />;
}
