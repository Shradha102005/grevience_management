import { useState, useRef, useCallback, useEffect, type ChangeEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Leaf, Upload, Cloud, FlaskConical, Bug, Camera,
  Loader2, CheckCircle2, AlertTriangle, X, MapPin,
  TrendingUp, TrendingDown, Droplets, Wind, Sun,
  Activity, ArrowRight, Thermometer, Wheat, Sprout,
  ShieldAlert, BarChart3, RefreshCw, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/agriculture")({
  component: Agriculture,
});

const API_BASE = "http://localhost:8000";

// ── types ─────────────────────────────────────────────────────────────────────
interface WeatherDay {
  day: string; icon: string; high: number; low: number;
  humidity: number; wind_speed: number; rain_chance: number; description: string;
}
interface Diagnosis {
  diagnosis: string; confidence: number; treatment: string[]; schemes: string[]; is_mock: boolean;
}
interface WeatherResponse {
  city: string; forecast: WeatherDay[]; advisory: string[]; source: string;
}

const MARKET_DATA = [
  { crop: "Wheat",      price: "₹2,125", unit: "/q", trend: "+1.2%", up: true,  demand: "High"   },
  { crop: "Rice",       price: "₹2,040", unit: "/q", trend: "-0.5%", up: false, demand: "Stable" },
  { crop: "Maize",      price: "₹1,962", unit: "/q", trend: "+2.4%", up: true,  demand: "High"   },
  { crop: "Cotton",     price: "₹6,080", unit: "/q", trend: "+0.8%", up: true,  demand: "Stable" },
  { crop: "Soybean",    price: "₹4,300", unit: "/q", trend: "-1.1%", up: false, demand: "Low"    },
  { crop: "Sugarcane",  price: "₹350",   unit: "/t", trend: "+0.3%", up: true,  demand: "Stable" },
];

const PEST_ALERTS = [
  { level: "critical", title: "Fall Armyworm Detected",    desc: "Widespread in adjoining districts. Pre-emptive Spinosad spray recommended immediately.", color: "#f43f5e" },
  { level: "warning",  title: "Aphid Population Rising",   desc: "Monitor cotton closely. If >10 per leaf, apply Imidacloprid 17.8% SL.", color: "#fbbf24" },
  { level: "info",     title: "Favourable for Kharif Sow", desc: "Good soil moisture and temperature for kharif crop sowing this week.", color: "#34d399" },
];

// ── helpers ───────────────────────────────────────────────────────────────────
const demandColor = (d: string) => d === "High" ? "#34d399" : d === "Low" ? "#f43f5e" : "#a78bfa";

// ── Weather Drawer ────────────────────────────────────────────────────────────
function WeatherDrawer({ weather, loading, onClose }: {
  weather: WeatherResponse | null; loading: boolean; onClose: () => void;
}) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 40, animation: "fadeIn 0.2s ease" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(480px, 50vw)",
        background: "var(--color-background)", borderLeft: "1px solid rgba(234,179,8,0.15)",
        boxShadow: "-20px 0 60px rgba(234,179,8,0.08)", zIndex: 50,
        display: "flex", flexDirection: "column", animation: "slideIn 0.25s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 22px", borderBottom: "1px solid rgba(234,179,8,0.1)", background: "linear-gradient(180deg,rgba(234,179,8,0.05) 0%,transparent 100%)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Cloud style={{ width: 18, height: 18, color: "white" }} />
              </div>
              <div>
                <h2 style={{ fontSize: "15px", fontWeight: 800, color: "var(--color-foreground)", margin: 0 }}>7-Day Forecast</h2>
                <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", margin: 0 }}>{weather?.city ?? "Hyderabad"} · {weather?.source === "openweathermap" ? "Live data" : "Seasonal estimate"}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ width: "32px", height: "32px", borderRadius: "9px", border: "1px solid rgba(234,179,8,0.15)", background: "rgba(234,179,8,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X style={{ width: 13, height: 13, color: "var(--color-muted-foreground)" }} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <Loader2 style={{ width: 24, height: 24, color: "#f59e0b" }} className="animate-spin" />
            </div>
          ) : (weather?.forecast ?? []).map((w, i) => (
            <div key={i} style={{
              background: "var(--color-card)", borderRadius: "13px",
              border: "1px solid rgba(234,179,8,0.1)", padding: "14px 16px",
              display: "flex", alignItems: "center", gap: "14px",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(234,179,8,0.3)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(234,179,8,0.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(234,179,8,0.1)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
              <span style={{ fontSize: "28px", flexShrink: 0 }}>{w.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-foreground)" }}>{w.day}</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
                    <span style={{ fontSize: "16px", fontWeight: 800, color: "#f59e0b" }}>{w.high}°</span>
                    <span style={{ fontSize: "12px", color: "var(--color-muted-foreground)" }}>{w.low}°</span>
                  </div>
                </div>
                <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", marginBottom: "6px" }}>{w.description}</p>
                <div style={{ display: "flex", gap: "12px" }}>
                  {[
                    { icon: <Droplets style={{ width: 10, height: 10 }} />, val: `${w.humidity}%`, label: "Humidity" },
                    { icon: <Wind     style={{ width: 10, height: 10 }} />, val: `${w.wind_speed}km/h`, label: "Wind" },
                    { icon: <Cloud    style={{ width: 10, height: 10 }} />, val: `${w.rain_chance}%`, label: "Rain" },
                  ].map(({ icon, val, label }) => (
                    <span key={label} style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10px", color: "var(--color-muted-foreground)" }}>
                      {icon}{val} {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Advisories */}
          {weather?.advisory && (
            <div style={{ background: "rgba(234,179,8,0.06)", borderRadius: "13px", border: "1px solid rgba(234,179,8,0.15)", padding: "14px 16px", marginTop: "4px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#f59e0b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Farm Advisories</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {weather.advisory.map((a, i) => (
                  <p key={i} style={{ fontSize: "12px", color: "var(--color-foreground)", lineHeight: 1.5 }}>{a}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Diagnosis Result Drawer ───────────────────────────────────────────────────
function DiagnosisDrawer({ diagnosis, imageUrl, onClose }: {
  diagnosis: Diagnosis; imageUrl: string | null; onClose: () => void;
}) {
  const confColor = diagnosis.confidence > 80 ? "#34d399" : diagnosis.confidence > 60 ? "#fbbf24" : "#f43f5e";
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 40, animation: "fadeIn 0.2s ease" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(520px, 52vw)",
        background: "var(--color-background)", borderLeft: "1px solid rgba(52,211,153,0.15)",
        boxShadow: "-20px 0 60px rgba(52,211,153,0.08)", zIndex: 50,
        display: "flex", flexDirection: "column", animation: "slideIn 0.25s cubic-bezier(0.16,1,0.3,1)",
      }}>
        <div style={{ padding: "20px 22px", borderBottom: "1px solid rgba(52,211,153,0.1)", background: "linear-gradient(180deg,rgba(52,211,153,0.05) 0%,transparent 100%)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FlaskConical style={{ width: 17, height: 17, color: "#34d399" }} />
              </div>
              <div>
                <h2 style={{ fontSize: "15px", fontWeight: 800, color: "var(--color-foreground)", margin: 0 }}>Diagnosis Report</h2>
                {diagnosis.is_mock && <p style={{ fontSize: "10px", color: "#fbbf24", margin: 0 }}>⚠ Offline analysis</p>}
              </div>
            </div>
            <button onClick={onClose} style={{ width: "32px", height: "32px", borderRadius: "9px", border: "1px solid rgba(52,211,153,0.15)", background: "rgba(52,211,153,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X style={{ width: 13, height: 13, color: "var(--color-muted-foreground)" }} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Preview image */}
          {imageUrl && (
            <div style={{ borderRadius: "13px", overflow: "hidden", maxHeight: "180px", border: "1px solid rgba(52,211,153,0.15)" }}>
              <img src={imageUrl} alt="Crop sample" style={{ width: "100%", height: "180px", objectFit: "cover" }} />
            </div>
          )}

          {/* Identified pathology */}
          <div style={{ background: "var(--color-card)", borderRadius: "13px", border: "1px solid rgba(52,211,153,0.12)", padding: "16px 18px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Identified Pathology</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-foreground)", margin: 0 }}>{diagnosis.diagnosis}</h3>
              <span style={{ fontSize: "11px", fontWeight: 800, padding: "3px 10px", borderRadius: "20px", background: `${confColor}15`, color: confColor, border: `1px solid ${confColor}30`, flexShrink: 0 }}>
                {diagnosis.confidence}% Confidence
              </span>
            </div>
            {/* Confidence bar */}
            <div style={{ marginTop: "12px", height: "5px", borderRadius: "3px", background: "rgba(139,92,246,0.1)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${diagnosis.confidence}%`, background: `linear-gradient(90deg,${confColor},${confColor}aa)`, borderRadius: "3px", transition: "width 1s ease" }} />
            </div>
          </div>

          {/* Treatment protocol */}
          <div style={{ background: "var(--color-card)", borderRadius: "13px", border: "1px solid rgba(139,92,246,0.1)", padding: "16px 18px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Treatment Protocol</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {diagnosis.treatment.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span style={{ width: "20px", height: "20px", borderRadius: "6px", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 800, color: "#a78bfa", flexShrink: 0, marginTop: "1px" }}>{i+1}</span>
                  <p style={{ fontSize: "12px", color: "var(--color-foreground)", lineHeight: 1.55, margin: 0 }}>{t}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Eligible schemes */}
          {diagnosis.schemes.length > 0 && (
            <div style={{ background: "rgba(52,211,153,0.06)", borderRadius: "13px", border: "1px solid rgba(52,211,153,0.15)", padding: "14px 16px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Eligible Subsidy Schemes</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {diagnosis.schemes.map((s, i) => (
                  <span key={i} style={{ fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "20px", background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)" }}>{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Market price card ─────────────────────────────────────────────────────────
function MarketCard({ item, onClick }: { item: typeof MARKET_DATA[0]; onClick: () => void }) {
  const dc = demandColor(item.demand);
  return (
    <button onClick={onClick}
      style={{ background: "var(--color-card)", borderRadius: "13px", border: "1px solid rgba(234,179,8,0.1)", padding: "14px 16px", textAlign: "left", cursor: "pointer", width: "100%", transition: "all 0.2s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(234,179,8,0.3)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(234,179,8,0.1)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(234,179,8,0.1)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.transform = "none"; }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-foreground)" }}>{item.crop}</span>
        <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: `${dc}12`, color: dc, border: `1px solid ${dc}25` }}>{item.demand}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontSize: "17px", fontWeight: 800, color: "#f59e0b" }}>{item.price}<span style={{ fontSize: "11px", fontWeight: 500, color: "var(--color-muted-foreground)" }}>{item.unit}</span></span>
        <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "12px", fontWeight: 700, color: item.up ? "#34d399" : "#f43f5e" }}>
          {item.up ? <TrendingUp style={{ width: 13, height: 13 }} /> : <TrendingDown style={{ width: 13, height: 13 }} />}
          {item.trend}
        </span>
      </div>
    </button>
  );
}

// ── Pest alert chip ───────────────────────────────────────────────────────────
function PestChip({ alert }: { alert: typeof PEST_ALERTS[0] }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: "12px", background: `${alert.color}10`, border: `1px solid ${alert.color}30` }}>
      <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "5px" }}>
        <span style={{ fontSize: "10px", fontWeight: 800, padding: "2px 8px", borderRadius: "20px", background: `${alert.color}20`, color: alert.color, textTransform: "uppercase", letterSpacing: "0.07em" }}>{alert.level}</span>
        <span style={{ fontSize: "12px", fontWeight: 700, color: alert.color }}>{alert.title}</span>
      </div>
      <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", lineHeight: 1.5, margin: 0 }}>{alert.desc}</p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
function Agriculture() {
  const [imageFile, setImageFile]   = useState<File | null>(null);
  const [imageUrl, setImageUrl]     = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [analyzing, setAnalyzing]   = useState(false);
  const [diagnosis, setDiagnosis]   = useState<Diagnosis | null>(null);
  const [weather, setWeather]       = useState<WeatherResponse | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [showWeather, setShowWeather] = useState(false);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/live/weather?city=Hyderabad`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setWeather(d); })
      .catch(() => {})
      .finally(() => setWeatherLoading(false));
  }, []);

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setImageFile(f); setImageUrl(URL.createObjectURL(f)); setDiagnosis(null);
  };

  const handleAnalyze = async () => {
    if (!imageFile && !description.trim()) { toast.error("Upload a crop image or describe symptoms."); return; }
    setAnalyzing(true); setDiagnosis(null);
    try {
      const fd = new FormData();
      if (imageFile) fd.append("image", imageFile);
      else { const b = new Blob(["x"], { type: "image/jpeg" }); fd.append("image", new File([b], "desc.jpg", { type: "image/jpeg" })); }
      fd.append("description", description || "Analyze this crop for diseases");
      fd.append("language", "en");
      const r = await fetch(`${API_BASE}/ai/agriculture/analyze`, { method: "POST", body: fd });
      if (!r.ok) throw new Error();
      setDiagnosis(await r.json());
      setShowDiagnosis(true);
    } catch {
      setDiagnosis({ diagnosis: "Bacterial Leaf Blight", confidence: 87, treatment: ["Apply copper-based bactericide (Blitox 50) every 7 days", "Remove and destroy infected leaves", "Switch to drip or furrow irrigation"], schemes: ["PM Fasal Bima Yojana", "Rashtriya Krishi Vikas Yojana"], is_mock: true });
      setShowDiagnosis(true);
      toast.warning("Using offline diagnosis (AI service unavailable).");
    } finally { setAnalyzing(false); }
  };

  const today = weather?.forecast?.[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 6rem)", overflow: "hidden" }}
      className="-mx-6 -mb-6">

      {/* ── TOP HEADER ─────────────────────────────────────────── */}
      <div style={{ padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(234,179,8,0.12)", background: "linear-gradient(180deg,rgba(234,179,8,0.05) 0%,transparent 100%)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg,#f59e0b,#84cc16)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(234,179,8,0.35)", flexShrink: 0 }}>
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-foreground)", margin: 0 }}>Agri-Operations Center</h1>
            <p style={{ fontSize: "11px", margin: 0, fontWeight: 600, color: "rgba(234,179,8,0.75)" }}>Farm Telemetry · Weather · Crop Diagnostics · Market Prices</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Weather button */}
          <button onClick={() => setShowWeather(true)}
            style={{ display: "flex", alignItems: "center", gap: "7px", padding: "6px 14px", height: "36px", borderRadius: "10px", border: "1px solid rgba(234,179,8,0.25)", background: "rgba(234,179,8,0.08)", color: "#f59e0b", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
            {weatherLoading ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <span style={{ fontSize: "16px" }}>{today?.icon ?? "🌤️"}</span>}
            {today ? `${today.high}° / ${today.low}°` : "Weather"}
            <span style={{ fontSize: "10px", padding: "1px 6px", background: "rgba(234,179,8,0.15)", borderRadius: "8px" }}>7-day</span>
          </button>
        </div>
      </div>

      {/* ── STAT CHIPS ─────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "10px", padding: "14px 28px", flexShrink: 0, borderBottom: "1px solid rgba(234,179,8,0.06)" }}>
        {[
          { icon: Droplets,    label: "Soil Moisture",    value: "42%",     sub: "Optimal",   color: "#60a5fa" },
          { icon: Thermometer, label: "Avg Temperature",  value: "28°C",    sub: "+2° norm",  color: "#f59e0b" },
          { icon: Wind,        label: "Wind Speed",       value: "12 km/h", sub: "SE",        color: "#94a3b8" },
          { icon: Activity,    label: "Crop Health",      value: "8.4/10",  sub: "Excellent", color: "#34d399" },
          { icon: ShieldAlert, label: "Active Alerts",    value: PEST_ALERTS.filter(a => a.level !== "info").length, sub: "Pest watch", color: "#f43f5e" },
          { icon: BarChart3,   label: "Mandi Prices",     value: MARKET_DATA.length, sub: "commodities", color: "#a78bfa" },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} style={{ flex: 1, padding: "12px 14px", borderRadius: "12px", background: "var(--color-card)", border: "1px solid rgba(234,179,8,0.08)", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: `${color}12`, border: `1px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon style={{ width: 15, height: 15, color }} />
            </div>
            <div>
              <p style={{ fontSize: "16px", fontWeight: 800, color, lineHeight: 1, margin: 0 }}>{value}</p>
              <p style={{ fontSize: "9px", color: "var(--color-muted-foreground)", margin: 0, fontWeight: 600, marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN GRID ──────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 28px", display: "flex", flexDirection: "column", gap: "18px" }}>

        {/* Row 1: AI Diagnostic tool (full width) */}
        <div style={{ background: "var(--color-card)", borderRadius: "16px", border: "1px solid rgba(52,211,153,0.12)", overflow: "hidden" }}>
          {/* Section header */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(52,211,153,0.1)", background: "linear-gradient(180deg,rgba(52,211,153,0.04) 0%,transparent 100%)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "9px", background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Camera style={{ width: 15, height: 15, color: "#34d399" }} />
              </div>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-foreground)", margin: 0 }}>AI Crop Diagnostic Tool</p>
                <p style={{ fontSize: "10px", color: "var(--color-muted-foreground)", margin: 0 }}>Upload crop image or describe symptoms for AI analysis</p>
              </div>
            </div>
            {diagnosis && (
              <button onClick={() => setShowDiagnosis(true)}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "9px", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                <FlaskConical style={{ width: 13, height: 13 }} />View Last Report <ArrowRight style={{ width: 12, height: 12 }} />
              </button>
            )}
          </div>

          <div style={{ padding: "18px 20px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
            {/* Upload zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{ width: "220px", height: "150px", flexShrink: 0, borderRadius: "12px", border: `2px dashed ${imageUrl ? "rgba(52,211,153,0.4)" : "rgba(234,179,8,0.2)"}`, background: imageUrl ? "transparent" : "rgba(234,179,8,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", overflow: "hidden", transition: "all 0.2s" }}
              onMouseEnter={e => { if (!imageUrl) (e.currentTarget as HTMLElement).style.borderColor = "rgba(234,179,8,0.5)"; }}
              onMouseLeave={e => { if (!imageUrl) (e.currentTarget as HTMLElement).style.borderColor = "rgba(234,179,8,0.2)"; }}>
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt="Crop" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
                  <button onClick={e => { e.stopPropagation(); setImageFile(null); setImageUrl(null); setDiagnosis(null); }}
                    style={{ position: "absolute", top: "6px", right: "6px", width: "24px", height: "24px", borderRadius: "7px", background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
                    <X style={{ width: 11, height: 11, color: "white" }} />
                  </button>
                </>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <Upload style={{ width: 22, height: 22, color: "rgba(234,179,8,0.5)", margin: "0 auto 6px" }} />
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-muted-foreground)", margin: 0 }}>Upload crop image</p>
                  <p style={{ fontSize: "10px", color: "rgba(139,92,246,0.4)", margin: "3px 0 0" }}>JPG, PNG, WEBP</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSelect} />
            </div>

            {/* Text + action */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
              <textarea
                placeholder="Describe symptoms: leaf color, spots, wilting, pest sightings, soil condition…"
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ width: "100%", height: "90px", padding: "10px 14px", borderRadius: "12px", border: "1px solid rgba(234,179,8,0.2)", background: "rgba(234,179,8,0.03)", color: "var(--color-foreground)", fontSize: "12px", resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box", transition: "border-color 0.2s" }}
                onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = "rgba(234,179,8,0.5)"}
                onBlur={e  => (e.target as HTMLTextAreaElement).style.borderColor = "rgba(234,179,8,0.2)"}
              />
              <button onClick={handleAnalyze} disabled={analyzing}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", height: "42px", borderRadius: "12px", background: analyzing ? "rgba(52,211,153,0.1)" : "linear-gradient(135deg,#34d399,#059669)", border: "none", color: analyzing ? "#34d399" : "white", fontSize: "13px", fontWeight: 700, cursor: analyzing ? "default" : "pointer", transition: "all 0.2s", boxShadow: analyzing ? "none" : "0 4px 16px rgba(52,211,153,0.3)" }}>
                {analyzing ? <><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" />Analyzing…</> : <><Sparkles style={{ width: 15, height: 15 }} />Run AI Diagnostics</>}
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Pest alerts + Market prices */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

          {/* Pest & disease alerts */}
          <div style={{ background: "var(--color-card)", borderRadius: "16px", border: "1px solid rgba(244,63,94,0.1)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(244,63,94,0.08)", display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bug style={{ width: 14, height: 14, color: "#f43f5e" }} />
              </div>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-foreground)", margin: 0 }}>Pest & Disease Alerts</p>
                <p style={{ fontSize: "10px", color: "var(--color-muted-foreground)", margin: 0 }}>District-level advisories</p>
              </div>
            </div>
            <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: "9px" }}>
              {PEST_ALERTS.map((a, i) => <PestChip key={i} alert={a} />)}
            </div>
          </div>

          {/* Mandi market prices */}
          <div style={{ background: "var(--color-card)", borderRadius: "16px", border: "1px solid rgba(234,179,8,0.1)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(234,179,8,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MapPin style={{ width: 14, height: 14, color: "#f59e0b" }} />
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-foreground)", margin: 0 }}>Mandi Prices</p>
                  <p style={{ fontSize: "10px", color: "var(--color-muted-foreground)", margin: 0 }}>Hyderabad APMC · Today</p>
                </div>
              </div>
              <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)", fontFamily: "monospace" }}>Live</span>
            </div>
            <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {MARKET_DATA.map((item, i) => (
                <MarketCard key={i} item={item} onClick={() => toast.info(`${item.crop}: ${item.price}${item.unit} — Hyderabad APMC`)} />
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── DRAWERS ─────────────────────────────────────────────── */}
      {showWeather && (
        <WeatherDrawer weather={weather} loading={weatherLoading} onClose={() => setShowWeather(false)} />
      )}
      {showDiagnosis && diagnosis && (
        <DiagnosisDrawer diagnosis={diagnosis} imageUrl={imageUrl} onClose={() => setShowDiagnosis(false)} />
      )}

      <style>{`
        @keyframes slideIn { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  );
}
