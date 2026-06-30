import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity, Zap, Droplets, Bus, TrafficCone, Wifi,
  AlertTriangle, CheckCircle2, Clock, RefreshCw, X,
  Terminal, BatteryCharging, Cpu, Map, ArrowRight,
  Shield, Radio, TrendingUp, Gauge, Sparkles,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";

export const Route = createFileRoute("/portal/smart-city")({
  component: SmartCity,
});

const API_BASE = "http://localhost:8000";
const POLL_MS  = 5000;

interface CityService { id: string; label: string; icon: string; value: string; detail: string; status: string; }
interface KPI { active_sensors: number; uptime_pct: number; alerts_today: number; energy_mw: number; water_pressure_bar: number; transit_on_time_pct: number; }
interface EnergyPoint { time: string; load: number; }
interface TrafficPoint { zone: string; index: number; }
interface LogEntry { time: string; level: string; source: string; msg: string; }
interface Telemetry {
  kpis: KPI; energy_load: EnergyPoint[]; traffic: TrafficPoint[];
  event_log: LogEntry[]; services: CityService[]; generated_at: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────
const getIcon = (name: string): React.ElementType => {
  const map: Record<string, React.ElementType> = { TrafficCone, Droplets, Zap, Bus, Wifi, Activity };
  return map[name] ?? Activity;
};

const STATUS_CFG: Record<string, { color: string; bg: string; border: string; glow: string; label: string; icon: React.ReactNode }> = {
  ok:    { color: "#34d399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.25)",  glow: "rgba(52,211,153,0.15)",  label: "Operational", icon: <CheckCircle2 style={{ width:11,height:11 }} /> },
  warn:  { color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.25)",  glow: "rgba(251,191,36,0.15)",  label: "Warning",     icon: <Clock        style={{ width:11,height:11 }} /> },
  alert: { color: "#f43f5e", bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.3)",   glow: "rgba(244,63,94,0.2)",   label: "Alert",       icon: <AlertTriangle style={{ width:11,height:11 }} /> },
};
const LOG_COL: Record<string, string> = { INFO: "#60a5fa", WARN: "#fbbf24", ERROR: "#f43f5e" };
const trafficColor = (v: number) => v > 80 ? "#f43f5e" : v > 55 ? "#fbbf24" : "#34d399";

// ── custom tooltip ────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--color-card)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "10px", padding: "8px 14px", fontSize: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
      <p style={{ color: "var(--color-muted-foreground)", marginBottom: "3px" }}>{label}</p>
      <p style={{ color: "#a78bfa", fontWeight: 700 }}>{payload[0]?.value}{unit}</p>
    </div>
  );
};

// ── Service card (mirrors TicketCard from helpline) ───────────────────────────
function ServiceCard({ svc, onClick }: { svc: CityService; onClick: () => void }) {
  const cfg = STATUS_CFG[svc.status] ?? STATUS_CFG.ok;
  const Icon = getIcon(svc.icon);
  return (
    <button onClick={onClick}
      style={{
        background: "var(--color-card)", border: `1px solid rgba(139,92,246,0.1)`,
        borderRadius: "16px", padding: "20px", textAlign: "left", cursor: "pointer",
        width: "100%", transition: "all 0.2s", display: "flex", flexDirection: "column",
        gap: "14px", position: "relative", overflow: "hidden",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.border = `1px solid ${cfg.border}`;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${cfg.glow}, 0 0 0 1px ${cfg.border}`;
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.border = "1px solid rgba(139,92,246,0.1)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}>
      {/* Status accent bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: cfg.color, opacity: 0.7, borderRadius: "16px 16px 0 0" }} />

      {/* Top: icon + status badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: "38px", height: "38px", borderRadius: "11px", background: `${cfg.color}18`, border: `1px solid ${cfg.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon style={{ width: 18, height: 18, color: cfg.color }} />
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px", background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
          {cfg.icon}{cfg.label}
        </span>
      </div>

      {/* Content */}
      <div>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" }}>{svc.label}</p>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-foreground)", lineHeight: 1.3, marginBottom: "6px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{svc.value}</p>
        <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{svc.detail}</p>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
        <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)", display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, display: "block", boxShadow: svc.status !== "ok" ? `0 0 6px ${cfg.color}` : "none", animation: svc.status === "alert" ? "pulse 1.5s infinite" : "none" }} />
          Live
        </span>
        <div style={{ width: "24px", height: "24px", borderRadius: "7px", background: "rgba(139,92,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ArrowRight style={{ width: 11, height: 11, color: "#a78bfa" }} />
        </div>
      </div>
    </button>
  );
}

// ── KPI chip (like stat cards in helpline) ────────────────────────────────────
function StatChip({ icon: Icon, label, value, unit, color, active, onClick }: {
  icon: React.ElementType; label: string; value: number | string; unit?: string;
  color: string; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      style={{
        flex: 1, padding: "16px 20px", borderRadius: "14px", textAlign: "left", cursor: "pointer",
        background: active ? `${color}12` : "var(--color-card)",
        border: `1px solid ${active ? color + "44" : "rgba(139,92,246,0.08)"}`,
        boxShadow: active ? `0 4px 20px ${color}22` : "none",
        transition: "all 0.2s", display: "flex", alignItems: "center", gap: "14px",
      }}>
      <div style={{ width: "42px", height: "42px", borderRadius: "13px", flexShrink: 0, background: active ? `${color}22` : "rgba(139,92,246,0.07)", border: `1px solid ${active ? color + "44" : "rgba(139,92,246,0.12)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon style={{ width: 19, height: 19, color: active ? color : "rgba(139,92,246,0.5)" }} />
      </div>
      <div>
        <p style={{ fontSize: "22px", fontWeight: 800, color: active ? color : "var(--color-foreground)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {value}{unit && <span style={{ fontSize: "13px", fontWeight: 600, marginLeft: "2px" }}>{unit}</span>}
        </p>
        <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", fontWeight: 600, marginTop: "3px" }}>{label}</p>
      </div>
    </button>
  );
}

// ── Detail Drawer (mirrors ConversationDrawer from helpline) ──────────────────
function ServiceDrawer({ svc, data, onClose }: {
  svc: CityService; data: Telemetry | null; onClose: () => void;
}) {
  const cfg = STATUS_CFG[svc.status] ?? STATUS_CFG.ok;
  const Icon = getIcon(svc.icon);
  const isEnergy = svc.id === "power";
  const isTraffic = svc.id === "traffic";

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 40, animation: "fadeIn 0.2s ease" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(580px, 55vw)",
        background: "var(--color-background)",
        borderLeft: "1px solid rgba(139,92,246,0.15)",
        boxShadow: "-24px 0 80px rgba(139,92,246,0.1)",
        zIndex: 50, display: "flex", flexDirection: "column",
        animation: "slideIn 0.25s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* Header */}
        <div style={{ padding: "22px 26px", borderBottom: "1px solid rgba(139,92,246,0.1)", background: "linear-gradient(180deg,rgba(139,92,246,0.05) 0%,transparent 100%)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: `${cfg.color}18`, border: `1px solid ${cfg.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon style={{ width: 20, height: 20, color: cfg.color }} />
                </div>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>{svc.label}</p>
                  <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--color-foreground)", margin: 0, lineHeight: 1.2 }}>{svc.value}</h2>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                  {cfg.icon}{cfg.label}
                </span>
                <span style={{ fontSize: "11px", color: "var(--color-muted-foreground)" }}>Real-time · Auto-refresh 5s</span>
              </div>
            </div>
            <button onClick={onClose} style={{ width: "32px", height: "32px", borderRadius: "9px", border: "1px solid rgba(139,92,246,0.15)", background: "rgba(139,92,246,0.06)", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X style={{ width: 14, height: 14, color: "var(--color-muted-foreground)" }} />
            </button>
          </div>
        </div>

        {/* Detail strip */}
        <div style={{ margin: "16px 26px 0", padding: "14px 16px", borderRadius: "12px", background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.1)", flexShrink: 0 }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "#a78bfa", marginBottom: "5px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Current Status</p>
          <p style={{ fontSize: "13px", color: "var(--color-muted-foreground)", lineHeight: 1.6, margin: 0 }}>{svc.detail}</p>
        </div>

        {/* Chart area — energy or traffic specific */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 26px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {isEnergy && data?.energy_load && (
            <div style={{ background: "var(--color-card)", borderRadius: "14px", border: "1px solid rgba(139,92,246,0.1)", padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "13px", fontWeight: 700, color: "var(--color-foreground)" }}>
                  <BatteryCharging style={{ width: 15, height: 15, color: "#fbbf24" }} />Energy Grid Load · 12h
                </span>
                <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}>
                  PEAK: {Math.max(...data.energy_load.map(d => d.load))} MW
                </span>
              </div>
              <div style={{ height: "180px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.energy_load} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="eGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#fbbf24" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.07)" vertical={false} />
                    <XAxis dataKey="time" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip unit=" MW" />} />
                    <Area type="monotone" dataKey="load" stroke="#fbbf24" strokeWidth={2} fill="url(#eGrad)" dot={false} animationDuration={600} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {isTraffic && data?.traffic && (
            <div style={{ background: "var(--color-card)", borderRadius: "14px", border: "1px solid rgba(139,92,246,0.1)", padding: "16px 18px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "13px", fontWeight: 700, color: "var(--color-foreground)", marginBottom: "14px" }}>
                <Map style={{ width: 15, height: 15, color: "#a78bfa" }} />Zone-wise Congestion Index
              </span>
              <div style={{ height: "200px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.traffic} layout="vertical" margin={{ top: 0, right: 12, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.07)" horizontal={false} />
                    <XAxis type="number" domain={[0,100]} tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="zone" type="category" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip unit="" />} cursor={{ fill: "rgba(139,92,246,0.05)" }} />
                    <Bar dataKey="index" radius={[0, 7, 7, 0]} animationDuration={600}>
                      {data.traffic.map((e, i) => <Cell key={i} fill={trafficColor(e.index)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "8px" }}>
                {[["#34d399","Low (< 55)"],["#fbbf24","Moderate (55–80)"],["#f43f5e","High (> 80)"]].map(([c,l]) => (
                  <span key={l} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "var(--color-muted-foreground)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: "block" }} />{l}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent event log filtered to this service */}
          {data?.event_log && (
            <div style={{ background: "#0a0a10", borderRadius: "14px", border: "1px solid rgba(139,92,246,0.12)", overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(139,92,246,0.1)", display: "flex", alignItems: "center", gap: "8px" }}>
                <Terminal style={{ width: 13, height: 13, color: "#a78bfa" }} />
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.1em" }}>Recent Events</span>
              </div>
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "5px", maxHeight: "200px", overflowY: "auto", fontFamily: "monospace" }}>
                {data.event_log.slice(0, 6).map((log, i) => (
                  <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontSize: "11px" }}>
                    <span style={{ color: "rgba(139,92,246,0.4)", flexShrink: 0 }}>[{log.time}]</span>
                    <span style={{ color: LOG_COL[log.level] ?? "#60a5fa", fontWeight: 700, flexShrink: 0, minWidth: "40px" }}>{log.level}</span>
                    <span style={{ color: "rgba(148,163,184,0.7)" }}>{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
function SmartCity() {
  const [data, setData]               = useState<Telemetry | null>(null);
  const [loading, setLoading]         = useState(true);
  const [lastPing, setLastPing]       = useState<Date | null>(null);
  const [pulseKey, setPulseKey]       = useState(0);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [selectedSvc, setSelectedSvc] = useState<CityService | null>(null);

  const fetchTelemetry = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/live/city-telemetry`);
      if (res.ok) {
        const d: Telemetry = await res.json();
        setData(d);
        setLastPing(new Date());
        setPulseKey(k => k + 1);
        if (selectedSvc) {
          const updated = d.services.find(s => s.id === selectedSvc.id);
          if (updated) setSelectedSvc(updated);
        }
      }
    } catch { } finally { setLoading(false); }
  }, [selectedSvc?.id]);

  useEffect(() => {
    fetchTelemetry();
    const id = setInterval(() => fetchTelemetry(true), POLL_MS);
    return () => clearInterval(id);
  }, []);

  const kpi = data?.kpis;
  const services = data?.services ?? [];
  const alertCount = services.filter(s => s.status === "alert").length;
  const warnCount  = services.filter(s => s.status === "warn").length;
  const okCount    = services.filter(s => s.status === "ok").length;

  const filtered = activeFilter === "all" ? services
    : services.filter(s => s.status === activeFilter);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 6rem)", overflow: "hidden" }}
      className="-mx-6 -mb-6">

      {/* ── TOP HEADER ───────────────────────────────────────────── */}
      <div style={{
        padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(139,92,246,0.1)",
        background: "linear-gradient(180deg,rgba(139,92,246,0.04) 0%,transparent 100%)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(139,92,246,0.4)", flexShrink: 0 }}>
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-foreground)", margin: 0 }}>Smart City NOC</h1>
            <p style={{ fontSize: "11px", margin: 0, fontWeight: 600, color: "rgba(139,92,246,0.8)" }}>Network Operations Center · Hyderabad</p>
          </div>
          {/* Live pill */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "20px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", marginLeft: "6px" }}>
            <span key={pulseKey} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e", display: "block", boxShadow: "0 0 8px rgba(34,197,94,0.7)", animation: "ping 1s ease-out" }} />
            <span style={{ fontSize: "11px", color: "#22c55e", fontWeight: 700 }}>Live</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {lastPing && (
            <span style={{ fontSize: "11px", color: "var(--color-muted-foreground)", fontFamily: "monospace" }}>
              Synced {lastPing.toLocaleTimeString("en-IN")}
            </span>
          )}
          <button onClick={() => fetchTelemetry()}
            style={{ width: "36px", height: "36px", borderRadius: "10px", border: "1px solid rgba(139,92,246,0.15)", background: "rgba(139,92,246,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw style={{ width: 13, height: 13, color: "#a78bfa" }} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── STAT CARDS ───────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "12px", padding: "16px 28px", flexShrink: 0 }}>
        <StatChip icon={Activity}      label="All Services"    value={services.length}            color="#a78bfa" active={activeFilter === "all"}   onClick={() => setActiveFilter("all")} />
        <StatChip icon={CheckCircle2}  label="Operational"     value={okCount}                    color="#34d399" active={activeFilter === "ok"}    onClick={() => setActiveFilter("ok")} />
        <StatChip icon={AlertTriangle} label="Warnings"        value={warnCount}                  color="#fbbf24" active={activeFilter === "warn"}  onClick={() => setActiveFilter("warn")} />
        <StatChip icon={Zap}           label="Alerts"          value={alertCount}                 color="#f43f5e" active={activeFilter === "alert"} onClick={() => setActiveFilter("alert")} />
        <StatChip icon={BatteryCharging} label="Grid Load"     value={kpi?.energy_mw ?? "—"} unit="MW" color="#fbbf24" active={false} onClick={() => {}} />
        <StatChip icon={Cpu}           label="Active Sensors"  value={kpi?.active_sensors ?? "—"} color="#60a5fa" active={false} onClick={() => {}} />
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 28px" }}>
        {loading && !data ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Activity style={{ width: 22, height: 22, color: "#a78bfa" }} className="animate-spin" />
              </div>
              <p style={{ fontSize: "13px", color: "var(--color-muted-foreground)" }}>Connecting to telemetry…</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* ── Service card grid ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "14px" }}>
              {filtered.map(svc => (
                <ServiceCard key={svc.id} svc={svc} onClick={() => setSelectedSvc(svc)} />
              ))}
              {filtered.length === 0 && (
                <div style={{ gridColumn: "1/-1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "160px", gap: "12px" }}>
                  <CheckCircle2 style={{ width: 28, height: 28, color: "rgba(52,211,153,0.4)" }} />
                  <p style={{ fontSize: "13px", color: "var(--color-muted-foreground)" }}>No services in this state</p>
                </div>
              )}
            </div>

            {/* ── Charts row ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "14px" }}>
              {/* Energy chart card */}
              <div style={{ background: "var(--color-card)", borderRadius: "16px", border: "1px solid rgba(139,92,246,0.1)", padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "9px", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <BatteryCharging style={{ width: 15, height: 15, color: "#fbbf24" }} />
                    </div>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-foreground)", margin: 0 }}>Energy Grid Load</p>
                      <p style={{ fontSize: "10px", color: "var(--color-muted-foreground)", margin: 0, fontFamily: "monospace" }}>MW · 12-hour rolling</p>
                    </div>
                  </div>
                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 9px", borderRadius: "7px", background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}>
                    PEAK: {Math.max(...(data?.energy_load ?? [{ load: 0 }]).map(d => d.load))} MW
                  </span>
                </div>
                <div style={{ height: "180px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data?.energy_load ?? []} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="eGrad2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#fbbf24" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.07)" vertical={false} />
                      <XAxis dataKey="time" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip unit=" MW" />} />
                      <Area type="monotone" dataKey="load" stroke="#fbbf24" strokeWidth={2} fill="url(#eGrad2)" dot={false} animationDuration={600} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Traffic chart card */}
              <div style={{ background: "var(--color-card)", borderRadius: "16px", border: "1px solid rgba(139,92,246,0.1)", padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "9px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Map style={{ width: 15, height: 15, color: "#a78bfa" }} />
                  </div>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-foreground)", margin: 0 }}>Traffic Congestion</p>
                    <p style={{ fontSize: "10px", color: "var(--color-muted-foreground)", margin: 0, fontFamily: "monospace" }}>Index 0–100 by zone</p>
                  </div>
                </div>
                <div style={{ height: "160px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.traffic ?? []} layout="vertical" margin={{ top: 0, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.07)" horizontal={false} />
                      <XAxis type="number" domain={[0,100]} tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis dataKey="zone" type="category" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip unit="" />} cursor={{ fill: "rgba(139,92,246,0.05)" }} />
                      <Bar dataKey="index" radius={[0,6,6,0]} animationDuration={600}>
                        {(data?.traffic ?? []).map((e, i) => <Cell key={i} fill={trafficColor(e.index)} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "10px" }}>
                  {[["#34d399","Low"],["#fbbf24","Mod"],["#f43f5e","High"]].map(([c,l]) => (
                    <span key={l} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "var(--color-muted-foreground)" }}>
                      <span style={{ width: 7, height: 7, borderRadius: 2, background: c, display: "block" }} />{l}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Terminal event log card ── */}
            <div style={{ background: "#08080e", borderRadius: "16px", border: "1px solid rgba(139,92,246,0.15)", overflow: "hidden" }}>
              <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(139,92,246,0.1)", background: "rgba(139,92,246,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Terminal style={{ width: 14, height: 14, color: "#a78bfa" }} />
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.1em" }}>System Event Log</span>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "block", boxShadow: "0 0 6px #22c55e", animation: "pulse 2s infinite" }} />
                </div>
                <span style={{ fontSize: "10px", color: "rgba(139,92,246,0.45)", fontFamily: "monospace" }}>
                  {data?.event_log?.length ?? 0} entries · live stream
                </span>
              </div>
              <div style={{ padding: "14px 20px", maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "5px", fontFamily: "monospace" }}>
                {(data?.event_log ?? []).map((log, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "5px 8px", borderRadius: "6px", background: i === 0 ? `${LOG_COL[log.level] ?? "#60a5fa"}12` : "transparent", animation: i === 0 ? "fadeInDown 0.4s ease" : "none" }}>
                    <span style={{ fontSize: "10px", color: "rgba(139,92,246,0.4)", flexShrink: 0, minWidth: "58px" }}>[{log.time}]</span>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: LOG_COL[log.level] ?? "#60a5fa", background: `${LOG_COL[log.level] ?? "#60a5fa"}15`, padding: "1px 6px", borderRadius: "4px", flexShrink: 0, minWidth: "42px", textAlign: "center" }}>{log.level}</span>
                    <span style={{ fontSize: "10px", color: "rgba(139,92,246,0.55)", flexShrink: 0, minWidth: "110px" }}>[{log.source}]</span>
                    <span style={{ fontSize: "11px", color: i === 0 ? "#e2e8f0" : "rgba(148,163,184,0.65)", lineHeight: 1.45 }}>{log.msg}</span>
                  </div>
                ))}
                <div style={{ display: "flex", gap: "8px", padding: "3px 8px" }}>
                  <span style={{ fontSize: "10px", color: "rgba(34,197,94,0.35)", fontFamily: "monospace", animation: "pulse 1.5s infinite" }}>
                    [{new Date().toLocaleTimeString("en-GB")}] SYSTEM ··· Listening for telemetry_
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ── DETAIL DRAWER ────────────────────────────────────────── */}
      {selectedSvc && (
        <ServiceDrawer svc={selectedSvc} data={data} onClose={() => setSelectedSvc(null)} />
      )}

      <style>{`
        @keyframes ping       { 0%{transform:scale(1);opacity:1} 75%,100%{transform:scale(2);opacity:0} }
        @keyframes fadeInDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}
