import { useState, useRef, useCallback, useEffect, type ChangeEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Upload, Cloud, Bug, Loader2, X, Droplets, Wind,
  Thermometer, Activity, ShieldAlert, BarChart3,
  RefreshCw, ChevronDown, CheckCircle2, Sparkles, Send, MessageCircle,
  Paperclip, CalendarDays, Sprout, Gauge, TrendingUp, Bell, BellRing,
  BookOpen, MapPin, Landmark, ExternalLink, Trash2, AlertTriangle, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import Chart from "react-apexcharts";

export const Route = createFileRoute("/portal/agriculture")({
  component: Agriculture,
});

const API_BASE = "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────
interface WeatherDay { day: string; icon: string; high: number; low: number; humidity: number; wind_speed: number; rain_chance: number; description: string; }
interface WeatherResponse { city: string; forecast: WeatherDay[]; advisory: string[]; source: string; }
interface MarketItem { crop: string; price: string; modal_price: number; min_price: number; max_price: number; unit: string; market: string; state: string; arrival_date: string; records_found: number; }
interface ChatMessage { role: "user" | "assistant"; content: string | React.ReactNode; imageUrl?: string; }
interface Diagnosis { diagnosis: string; confidence: number; treatment: string[]; schemes: string[]; is_mock: boolean; }
interface CropCalendarItem { name: string; sow_month: string; harvest_month: string; water_need: string; expected_yield_q_per_acre: number; notes: string; }
interface YieldResult { estimated_yield_kg: number; yield_per_acre_kg: number; confidence_pct: number; grade: string; tips: string[]; }
interface IrrigationResult { should_irrigate: boolean; urgency: string; next_irrigation_hours: number; quantity_liters_per_acre: number; reason: string; warning: string; }
interface PriceHistory { crop: string; weeks: string[]; prices: number[]; unit: string; current_price: number; }
interface Subsidy { name: string; category: string; benefit: string; eligibility: string; link: string; }
interface PriceAlert { id: string; crop: string; threshold: number; direction: "above" | "below"; }

const INDIAN_STATES = ["", "Andhra Pradesh", "Gujarat", "Haryana", "Karnataka", "Madhya Pradesh", "Maharashtra", "Punjab", "Rajasthan", "Telangana", "Uttar Pradesh", "West Bengal", "Tamil Nadu", "Bihar", "Odisha"];
const CROPS = ["Wheat", "Rice", "Maize", "Cotton", "Soybean", "Tomato", "Onion", "Potato", "Sugarcane", "Mustard"];
const SEASONS = ["kharif", "rabi", "zaid"];
const SOILS = ["loamy", "sandy", "clayey", "black", "red"];
const CROP_STAGES = ["sowing", "vegetative", "flowering", "maturity"];

const PEST_ALERTS = [
  { title: "Fall Armyworm", area: "Central India", risk: "critical", color: "rose", icon: "🪲", desc: "Immediate Spinosad spray recommended." },
  { title: "Aphid Surge", area: "Punjab & Haryana", risk: "high", color: "amber", icon: "🐛", desc: "Monitor cotton. >10/leaf triggers spray." },
  { title: "Locust Watch", area: "Rajasthan border", risk: "moderate", color: "yellow", icon: "🦗", desc: "Monitoring underway. Prepare organophosphate." },
  { title: "Brown Planthopper", area: "Tamil Nadu", risk: "high", color: "amber", icon: "🪰", desc: "Apply Buprofezin at 3 mL/L in rice." },
  { title: "Favorable: Kharif", area: "Vidarbha region", risk: "low", color: "emerald", icon: "🌱", desc: "Good soil moisture — ideal for sowing." },
];

const EXPERT_TIPS = [
  { title: "Monsoon Soil Prep", tag: "Kharif Season", icon: "🌧️", color: "sky", tip: "Plough fields 2–3 weeks before sowing to improve moisture retention. Add FYM at 5 t/acre for organic matter boost." },
  { title: "Integrated Pest Management", tag: "Pest Control", icon: "🛡️", color: "emerald", tip: "Use sticky traps and pheromone traps first. Resort to pesticides only when economic threshold is crossed." },
  { title: "Drip Irrigation Savings", tag: "Water Management", icon: "💧", color: "indigo", tip: "Drip irrigation saves 30–50% water vs. flood irrigation. Eligible for 90% PM KUSUM subsidy in most states." },
  { title: "Rabi Wheat Timing", tag: "Rabi Season", icon: "🌾", color: "amber", tip: "Optimal sowing window for wheat is Oct 25–Nov 15. Late sowing past Nov 25 can reduce yield by 1.5% per day." },
  { title: "Soil Testing First", tag: "Soil Health", icon: "🧪", color: "violet", tip: "Test soil pH and NPK every 3 years. Free soil health cards available at Krishi Vigyan Kendras near you." },
  { title: "Post-Harvest Storage", tag: "Storage", icon: "🏚️", color: "orange", tip: "Dry grains below 14% moisture before storage. Use hermetic bags to reduce pest losses by up to 98%." },
];

const PEST_MAP_STATES: Record<string, string> = {
  "Rajasthan": "moderate", "Gujarat": "low", "Maharashtra": "high", "Madhya Pradesh": "critical",
  "Uttar Pradesh": "high", "Punjab": "high", "Haryana": "high", "Bihar": "moderate",
  "West Bengal": "low", "Tamil Nadu": "high", "Karnataka": "moderate", "Andhra Pradesh": "moderate",
  "Telangana": "moderate", "Odisha": "low", "Jharkhand": "low",
};
const RISK_COLOR: Record<string, string> = { critical: "rose", high: "amber", moderate: "yellow", low: "emerald" };

// ── Helpers ───────────────────────────────────────────────────────────────────
const glassCard = "bg-white/70 backdrop-blur-2xl border border-white shadow-xl shadow-slate-200/50 rounded-[2rem] p-6";
const glassCardLg = "bg-white/70 backdrop-blur-2xl border border-white shadow-2xl shadow-slate-300/60 rounded-[2.5rem] p-8";

// ── Weather Drawer ────────────────────────────────────────────────────────────
function WeatherDrawer({ weather, loading, onClose }: { weather: WeatherResponse | null; loading: boolean; onClose: () => void; }) {
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 animate-in fade-in" />
      <div className="fixed top-0 right-0 bottom-0 w-full md:w-[480px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right-12">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <div><h2 className="text-xl font-bold text-slate-900">7-Day Forecast</h2><p className="text-sm text-slate-500 mt-0.5">{weather?.city ?? "India"}</p></div>
          <button onClick={onClose} className="h-10 w-10 rounded-full hover:bg-slate-100 flex items-center justify-center"><X className="h-5 w-5 text-slate-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-4">
          {loading ? <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 text-indigo-500 animate-spin" /></div>
            : (weather?.forecast ?? []).map((w, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-3xl">{w.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center"><span className="font-bold text-slate-800">{w.day}</span><div className="flex gap-2"><span className="font-black text-slate-900">{w.high}°</span><span className="text-slate-400 font-semibold">{w.low}°</span></div></div>
                  <p className="text-xs text-slate-500 mt-1">{w.description}</p>
                  <div className="flex gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-slate-400 font-bold"><Droplets className="w-3 h-3" />{w.humidity}%</span>
                    <span className="flex items-center gap-1 text-xs text-slate-400 font-bold"><Wind className="w-3 h-3" />{w.wind_speed}km/h</span>
                  </div>
                </div>
              </div>
            ))}
          {weather?.advisory && <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 mt-2">
            <p className="text-xs font-black text-emerald-600 mb-2 uppercase tracking-widest">Farm Advisories</p>
            {weather.advisory.map((a, i) => <p key={i} className="text-sm text-emerald-800 font-medium leading-relaxed">{a}</p>)}
          </div>}
        </div>
      </div>
    </>
  );
}

// ── Agri Chat Modal ────────────────────────────────────────────────────────────
function AgriChatModal({ onClose }: { onClose: () => void; }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const renderDiagnosis = (d: Diagnosis) => {
    const c = d.confidence > 80 ? "emerald" : d.confidence > 60 ? "amber" : "rose";
    return (
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Diagnosed</p>
          <div className="flex items-center justify-between"><h3 className="text-base font-bold text-slate-800">{d.diagnosis}</h3><Badge className={`bg-${c}-100 text-${c}-700 border-none text-[10px] font-black`}>{d.confidence}%</Badge></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Treatment</p>
          {d.treatment.map((t, i) => <div key={i} className="flex gap-2 items-start mb-2"><span className={`w-5 h-5 rounded-full bg-${c}-100 text-${c}-600 flex items-center justify-center text-[10px] font-black shrink-0`}>{i+1}</span><p className="text-xs text-slate-600">{t}</p></div>)}
        </div>
      </div>
    );
  };

  const handleSend = async () => {
    if ((!input.trim() && !imageFile) || loading) return;
    const newMsg: ChatMessage = { role: "user", content: input, imageUrl: imageUrl || undefined };
    setMessages(prev => [...prev, newMsg]);
    const curInput = input; const curFile = imageFile;
    setInput(""); setImageFile(null); setImageUrl(null); setLoading(true);
    try {
      if (curFile) {
        const fd = new FormData(); fd.append("image", curFile); fd.append("description", curInput || "Analyze this crop"); fd.append("language", "en");
        const r = await fetch(`${API_BASE}/agriculture/analyze`, { method: "POST", body: fd });
        const d: Diagnosis = await r.json();
        setMessages(prev => [...prev, { role: "assistant", content: renderDiagnosis(d) }]);
      } else {
        const res = await fetch(`${API_BASE}/agriculture/analyze-chat`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: messages.map(m => ({ role: m.role, content: typeof m.content === "string" ? m.content : "Shared crop data." })).concat([{ role: "user", content: curInput }]), diagnosis_context: "General agricultural inquiry." })
        });
        const d = await res.json();
        setMessages(prev => [...prev, { role: "assistant", content: d.reply }]);
      }
    } catch {
      toast.error("Connection error."); setMessages(prev => [...prev, { role: "assistant", content: "I'm offline right now. Please try again." }]);
    } finally { setLoading(false); }
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 animate-in fade-in" />
      <div className="fixed inset-4 md:inset-x-20 md:inset-y-10 lg:left-[50%] lg:-translate-x-[50%] lg:inset-y-8 lg:w-[760px] bg-white shadow-2xl rounded-[2.5rem] z-50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-indigo-50/80 to-transparent pointer-events-none" />
        <div className="px-8 py-5 flex items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><Sparkles className="w-5 h-5" /></div>
            <div><h3 className="text-lg font-bold text-slate-900">AI Agri-Expert</h3><p className="text-xs text-slate-400 font-bold">Upload a crop photo for instant diagnosis</p></div>
          </div>
          <button onClick={onClose} className="h-10 w-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-600"><Sparkles className="w-4 h-4" /></div>
            <div className="bg-slate-100 text-slate-800 rounded-2xl rounded-tl-sm px-5 py-4 text-sm font-medium shadow-sm max-w-[85%]">Hello! I'm your AI Agri-Expert. Ask me anything about crops, pest control, irrigation, or <b>upload a photo</b> using the paperclip for instant disease diagnosis!</div>
          </div>
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === "user" ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600"}`}>
                {msg.role === "user" ? <CheckCircle2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>
              <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                {msg.imageUrl && <img src={msg.imageUrl} alt="Uploaded" className="w-40 h-40 object-cover rounded-2xl border-4 border-white shadow-md" />}
                {msg.content && <div className={`${msg.role === "user" ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm" : "bg-slate-100 text-slate-800 rounded-2xl rounded-tl-sm"} px-5 py-4 text-sm font-medium shadow-sm whitespace-pre-wrap`}>{msg.content}</div>}
              </div>
            </div>
          ))}
          {loading && <div className="flex gap-4"><div className="w-8 h-8 rounded-full bg-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-600"><Sparkles className="w-4 h-4" /></div><div className="bg-slate-100 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex gap-1 items-center"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{animationDelay:"0ms"}} /><span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{animationDelay:"150ms"}} /><span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{animationDelay:"300ms"}} /></div></div>}
          <div ref={endRef} />
        </div>

        <div className="p-5 bg-white border-t border-slate-100 z-10 shrink-0">
          {imageUrl && <div className="mb-3 relative inline-block"><img src={imageUrl} alt="Preview" className="h-14 w-14 object-cover rounded-xl border-2 border-indigo-100 shadow-sm" /><button onClick={() => { setImageFile(null); setImageUrl(null); }} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-rose-500 transition-colors"><X className="w-3 h-3" /></button></div>}
          <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="relative flex items-center">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImageUrl(URL.createObjectURL(f)); }}} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute left-2 w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"><Paperclip className="w-5 h-5" /></button>
            <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder={imageUrl ? "Describe symptoms or ask..." : "Ask about crops, upload a photo..."} className="w-full bg-slate-50 border border-slate-200 rounded-full py-3.5 pl-12 pr-14 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-inner" />
            <button type="submit" disabled={(!input.trim() && !imageFile) || loading} className="absolute right-2 w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white flex items-center justify-center transition-colors shadow-md"><Send className="w-4 h-4 ml-0.5" /></button>
          </form>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab Components
// ══════════════════════════════════════════════════════════════════════════════

// ── Tab 1: Dashboard ──────────────────────────────────────────────────────────
function DashboardTab() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { icon: Droplets, label: "Soil Moisture", value: "42%", status: "Optimal", color: "sky" },
          { icon: Thermometer, label: "Avg Temp", value: "28°C", status: "Normal", color: "amber" },
          { icon: Activity, label: "Health Index", value: "8.4", status: "Good", color: "emerald" },
          { icon: ShieldAlert, label: "Active Alerts", value: "2", status: "Review", color: "rose" },
        ].map((pod, i) => (
          <div key={i} className={`${glassCard} relative overflow-hidden group`}>
            <div className={`absolute -right-4 -top-4 w-20 h-20 bg-${pod.color}-500/10 rounded-full blur-xl group-hover:bg-${pod.color}-500/20 transition-all`} />
            <div className="flex items-center gap-2 mb-3"><pod.icon className={`w-4 h-4 text-${pod.color}-500`} /><span className="text-xs font-black text-slate-400 uppercase tracking-widest">{pod.label}</span></div>
            <span className="text-3xl font-black text-slate-800 tracking-tight">{pod.value}</span>
            <p className="text-xs font-bold text-slate-400 mt-1">{pod.status}</p>
          </div>
        ))}
      </div>

      <div className={`${glassCard}`}>
        <h2 className="text-lg font-black text-slate-800 mb-5 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-rose-500" /> Regional Pest Alerts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {PEST_ALERTS.map((a, i) => (
            <div key={i} className={`p-4 rounded-2xl bg-${a.color}-50/60 border border-${a.color}-100 flex gap-3 items-start`}>
              <span className="text-2xl shrink-0">{a.icon}</span>
              <div><h4 className="text-sm font-bold text-slate-800">{a.title}</h4><p className="text-xs text-slate-500 font-medium mt-0.5">{a.area}</p><p className="text-xs text-slate-600 mt-1 leading-relaxed">{a.desc}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: AI Planner ─────────────────────────────────────────────────────────
function PlannerTab() {
  const [calState, setCalState] = useState("Maharashtra");
  const [calSeason, setCalSeason] = useState("kharif");
  const [calSoil, setCalSoil] = useState("black");
  const [calResult, setCalResult] = useState<{ recommended_crops: CropCalendarItem[]; season_tip: string } | null>(null);
  const [calLoading, setCalLoading] = useState(false);

  const [yieldCrop, setYieldCrop] = useState("Wheat");
  const [yieldArea, setYieldArea] = useState("5");
  const [yieldSoil, setYieldSoil] = useState("loamy");
  const [yieldRain, setYieldRain] = useState("600");
  const [yieldState, setYieldState] = useState("Punjab");
  const [yieldResult, setYieldResult] = useState<YieldResult | null>(null);
  const [yieldLoading, setYieldLoading] = useState(false);

  const [irrigCrop, setIrrigCrop] = useState("Rice");
  const [irrigMoisture, setIrrigMoisture] = useState("42");
  const [irrigTemp, setIrrigTemp] = useState("32");
  const [irrigHumidity, setIrrigHumidity] = useState("68");
  const [irrigStage, setIrrigStage] = useState("vegetative");
  const [irrigResult, setIrrigResult] = useState<IrrigationResult | null>(null);
  const [irrigLoading, setIrrigLoading] = useState(false);

  const fetchCalendar = async () => {
    setCalLoading(true);
    try {
      const r = await fetch(`${API_BASE}/agriculture/crop-calendar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: calState, season: calSeason, soil_type: calSoil }) });
      setCalResult(await r.json());
    } catch { toast.error("Failed to fetch crop calendar."); } finally { setCalLoading(false); }
  };

  const fetchYield = async () => {
    setYieldLoading(true);
    try {
      const r = await fetch(`${API_BASE}/agriculture/yield-predict`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ crop: yieldCrop, area_acres: parseFloat(yieldArea), soil_type: yieldSoil, rainfall_mm: parseFloat(yieldRain), state: yieldState }) });
      setYieldResult(await r.json());
    } catch { toast.error("Failed to predict yield."); } finally { setYieldLoading(false); }
  };

  const fetchIrrigation = async () => {
    setIrrigLoading(true);
    try {
      const r = await fetch(`${API_BASE}/agriculture/irrigation-advice`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ crop: irrigCrop, soil_moisture_pct: parseFloat(irrigMoisture), temp_c: parseFloat(irrigTemp), humidity_pct: parseFloat(irrigHumidity), crop_stage: irrigStage }) });
      setIrrigResult(await r.json());
    } catch { toast.error("Failed to get irrigation advice."); } finally { setIrrigLoading(false); }
  };

  const gradeColor = { excellent: "emerald", good: "sky", average: "amber", below_average: "rose" };
  const urgencyColor = { immediate: "rose", within_24h: "amber", within_48h: "yellow", not_needed: "emerald" };
  const waterColor = { high: "sky", medium: "indigo", low: "emerald" };

  const selectCls = "bg-slate-100/80 border-none text-sm font-bold text-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer w-full";
  const inputCls = "bg-slate-100/80 border-none text-sm font-medium text-slate-800 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none w-full";
  const labelCls = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5";

  return (
    <div className="flex flex-col gap-6">
      {/* Crop Calendar */}
      <div className={glassCardLg}>
        <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center"><CalendarDays className="w-5 h-5 text-emerald-500" /></div><h2 className="text-xl font-black text-slate-800">Crop Calendar Planner</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
          <div><label className={labelCls}>State</label><select className={selectCls} value={calState} onChange={e => setCalState(e.target.value)}>{INDIAN_STATES.filter(Boolean).map(s => <option key={s}>{s}</option>)}</select></div>
          <div><label className={labelCls}>Season</label><select className={selectCls} value={calSeason} onChange={e => setCalSeason(e.target.value)}>{SEASONS.map(s => <option key={s}>{s}</option>)}</select></div>
          <div><label className={labelCls}>Soil Type</label><select className={selectCls} value={calSoil} onChange={e => setCalSoil(e.target.value)}>{SOILS.map(s => <option key={s}>{s}</option>)}</select></div>
          <div className="flex items-end"><button onClick={fetchCalendar} disabled={calLoading} className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-70">{calLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}Generate</button></div>
        </div>
        {calResult && (
          <div className="flex flex-col gap-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4"><p className="text-xs font-black text-emerald-600 mb-1 uppercase tracking-widest">Season Tip</p><p className="text-sm text-emerald-800 font-medium">{calResult.season_tip}</p></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {calResult.recommended_crops.map((c, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2"><h4 className="font-black text-slate-800 text-sm">{c.name}</h4><Badge className={`bg-${(waterColor as Record<string, string>)[c.water_need] || "slate"}-100 text-${(waterColor as Record<string, string>)[c.water_need] || "slate"}-700 border-none text-[10px] font-black shrink-0`}>{c.water_need} water</Badge></div>
                  <div className="flex gap-3 text-xs font-bold text-slate-500 mb-2"><span className="flex items-center gap-1"><Sprout className="w-3 h-3 text-emerald-500" />{c.sow_month}</span><ChevronRight className="w-3 h-3" /><span>{c.harvest_month}</span></div>
                  <p className="text-xs font-black text-indigo-600">{c.expected_yield_q_per_acre} q/acre</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{c.notes}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Yield Prediction */}
        <div className={glassCard}>
          <div className="flex items-center gap-3 mb-5"><div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-amber-500" /></div><h2 className="text-lg font-black text-slate-800">Yield Prediction</h2></div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><label className={labelCls}>Crop</label><select className={selectCls} value={yieldCrop} onChange={e => setYieldCrop(e.target.value)}>{CROPS.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label className={labelCls}>Area (acres)</label><input className={inputCls} type="number" value={yieldArea} onChange={e => setYieldArea(e.target.value)} /></div>
            <div><label className={labelCls}>Soil Type</label><select className={selectCls} value={yieldSoil} onChange={e => setYieldSoil(e.target.value)}>{SOILS.map(s => <option key={s}>{s}</option>)}</select></div>
            <div><label className={labelCls}>Rainfall (mm)</label><input className={inputCls} type="number" value={yieldRain} onChange={e => setYieldRain(e.target.value)} /></div>
            <div className="col-span-2"><label className={labelCls}>State</label><select className={selectCls} value={yieldState} onChange={e => setYieldState(e.target.value)}>{INDIAN_STATES.filter(Boolean).map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <button onClick={fetchYield} disabled={yieldLoading} className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-400/20 disabled:opacity-70">{yieldLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}Predict Yield</button>
          {yieldResult && (
            <div className="mt-5 flex flex-col gap-3">
              <div className="flex gap-3">
                <div className={`flex-1 bg-${(gradeColor as Record<string, string>)[yieldResult.grade] || "slate"}-50 border border-${(gradeColor as Record<string, string>)[yieldResult.grade] || "slate"}-100 rounded-2xl p-4 text-center`}>
                  <p className="text-3xl font-black text-slate-800">{(yieldResult.estimated_yield_kg / 1000).toFixed(1)}T</p>
                  <p className="text-xs text-slate-500 font-bold mt-1">Total Yield</p>
                </div>
                <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-black text-slate-800">{yieldResult.confidence_pct}%</p>
                  <p className="text-xs text-slate-500 font-bold mt-1">Confidence</p>
                </div>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col gap-2">
                {yieldResult.tips.map((t, i) => <p key={i} className="text-xs text-slate-600 flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />{t}</p>)}
              </div>
            </div>
          )}
        </div>

        {/* Irrigation Advisor */}
        <div className={glassCard}>
          <div className="flex items-center gap-3 mb-5"><div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center"><Droplets className="w-4 h-4 text-sky-500" /></div><h2 className="text-lg font-black text-slate-800">Smart Irrigation</h2></div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><label className={labelCls}>Crop</label><select className={selectCls} value={irrigCrop} onChange={e => setIrrigCrop(e.target.value)}>{CROPS.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label className={labelCls}>Crop Stage</label><select className={selectCls} value={irrigStage} onChange={e => setIrrigStage(e.target.value)}>{CROP_STAGES.map(s => <option key={s}>{s}</option>)}</select></div>
            <div><label className={labelCls}>Soil Moisture %</label><input className={inputCls} type="number" value={irrigMoisture} onChange={e => setIrrigMoisture(e.target.value)} /></div>
            <div><label className={labelCls}>Temperature °C</label><input className={inputCls} type="number" value={irrigTemp} onChange={e => setIrrigTemp(e.target.value)} /></div>
            <div className="col-span-2"><label className={labelCls}>Humidity %</label><input className={inputCls} type="number" value={irrigHumidity} onChange={e => setIrrigHumidity(e.target.value)} /></div>
          </div>
          <button onClick={fetchIrrigation} disabled={irrigLoading} className="w-full h-10 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-400/20 disabled:opacity-70">{irrigLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gauge className="w-4 h-4" />}Get Advice</button>
          {irrigResult && (
            <div className="mt-5 flex flex-col gap-3">
              <div className={`p-4 rounded-2xl border ${irrigResult.should_irrigate ? "bg-sky-50 border-sky-100" : "bg-emerald-50 border-emerald-100"} flex items-center gap-4`}>
                <div className={`text-4xl font-black ${irrigResult.should_irrigate ? "text-sky-600" : "text-emerald-600"}`}>{irrigResult.should_irrigate ? "💧" : "✅"}</div>
                <div>
                  <h4 className={`font-black text-lg ${irrigResult.should_irrigate ? "text-sky-700" : "text-emerald-700"}`}>{irrigResult.should_irrigate ? "Irrigate Now" : "No Irrigation Needed"}</h4>
                  <Badge className={`bg-${(urgencyColor as Record<string, string>)[irrigResult.urgency] || "slate"}-100 text-${(urgencyColor as Record<string, string>)[irrigResult.urgency] || "slate"}-700 border-none text-[10px] font-black mt-1`}>{irrigResult.urgency.replace("_", " ")}</Badge>
                </div>
              </div>
              {irrigResult.should_irrigate && <div className="flex gap-3"><div className="flex-1 bg-white border border-slate-100 rounded-xl p-3 text-center shadow-sm"><p className="text-xl font-black text-slate-800">{irrigResult.next_irrigation_hours}h</p><p className="text-[10px] font-bold text-slate-400">Window</p></div><div className="flex-1 bg-white border border-slate-100 rounded-xl p-3 text-center shadow-sm"><p className="text-xl font-black text-slate-800">{(irrigResult.quantity_liters_per_acre / 1000).toFixed(0)}kL</p><p className="text-[10px] font-bold text-slate-400">Per Acre</p></div></div>}
              <p className="text-xs text-slate-600 font-medium bg-white border border-slate-100 rounded-xl p-3 leading-relaxed shadow-sm">{irrigResult.reason}</p>
              {irrigResult.warning && <div className="flex gap-2 items-start bg-amber-50 border border-amber-100 rounded-xl p-3"><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /><p className="text-xs text-amber-700 font-medium">{irrigResult.warning}</p></div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab 3: Markets ────────────────────────────────────────────────────────────
function MarketsTab() {
  const [marketData, setMarketData] = useState<MarketItem[]>([]);
  const [marketLoading, setMarketLoading] = useState(true);
  const [selectedState, setSelectedState] = useState("");
  const [chartCrop, setChartCrop] = useState("Wheat");
  const [priceHistory, setPriceHistory] = useState<PriceHistory | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => { try { return JSON.parse(localStorage.getItem("agri_price_alerts") || "[]"); } catch { return []; } });
  const [alertCrop, setAlertCrop] = useState("Wheat");
  const [alertThreshold, setAlertThreshold] = useState("2000");
  const [alertDir, setAlertDir] = useState<"above" | "below">("above");

  const loadMarket = useCallback((state: string) => {
    setMarketLoading(true);
    const url = state ? `${API_BASE}/agriculture/market-prices?state=${encodeURIComponent(state)}` : `${API_BASE}/agriculture/market-prices`;
    fetch(url).then(r => r.ok ? r.json() : []).then((d: MarketItem[]) => setMarketData(d)).catch(() => setMarketData([])).finally(() => setMarketLoading(false));
  }, []);

  useEffect(() => { loadMarket(selectedState); }, [selectedState]);

  const loadPriceHistory = useCallback(async (crop: string) => {
    setChartLoading(true);
    try {
      const r = await fetch(`${API_BASE}/agriculture/price-history/${encodeURIComponent(crop)}`);
      setPriceHistory(await r.json());
    } catch { toast.error("Failed to load price history."); } finally { setChartLoading(false); }
  }, []);

  useEffect(() => { loadPriceHistory(chartCrop); }, [chartCrop]);

  // Check price alerts against market data
  useEffect(() => {
    if (!marketData.length || !alerts.length) return;
    alerts.forEach(a => {
      const item = marketData.find(m => m.crop.toLowerCase() === a.crop.toLowerCase());
      if (!item) return;
      const triggered = a.direction === "above" ? item.modal_price > a.threshold : item.modal_price < a.threshold;
      if (triggered) toast.warning(`🔔 Alert: ${a.crop} is ${a.direction} ₹${a.threshold.toLocaleString()}/q! Current: ₹${item.modal_price.toLocaleString()}/q`, { duration: 8000 });
    });
  }, [marketData]);

  const saveAlert = () => {
    const newAlerts = [...alerts, { id: Date.now().toString(), crop: alertCrop, threshold: parseFloat(alertThreshold), direction: alertDir }];
    setAlerts(newAlerts); localStorage.setItem("agri_price_alerts", JSON.stringify(newAlerts));
    toast.success(`Alert set: ${alertCrop} ${alertDir} ₹${alertThreshold}/q`);
  };

  const deleteAlert = (id: string) => {
    const newAlerts = alerts.filter(a => a.id !== id);
    setAlerts(newAlerts); localStorage.setItem("agri_price_alerts", JSON.stringify(newAlerts));
  };

  const chartOptions: ApexCharts.ApexOptions = {
    chart: { type: "area", toolbar: { show: false }, background: "transparent", sparkline: { enabled: false }, zoom: { enabled: false } },
    stroke: { curve: "smooth", width: 3 },
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.01 } },
    colors: ["#6366f1"],
    xaxis: { categories: priceHistory?.weeks || [], labels: { style: { fontFamily: "inherit", fontWeight: "700", fontSize: "11px" }, rotate: 0 }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (v: number) => `₹${Math.round(v).toLocaleString()}`, style: { fontFamily: "inherit", fontWeight: "700", fontSize: "11px" } }, min: (min: number) => Math.round(min * 0.95), max: (max: number) => Math.round(max * 1.05) },
    grid: { borderColor: "#f1f5f9", padding: { left: 10, right: 10 } },
    tooltip: { theme: "light", y: { formatter: (v: number) => `₹${Math.round(v).toLocaleString()}/q` } },
    dataLabels: { enabled: false },
  };

  const selectCls = "bg-slate-100/80 border-none text-sm font-bold text-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer";

  // Seasonal heatmap data (static best-month data)
  const HEATMAP: Record<string, number[]> = {
    Wheat:   [4,4,5,3,2,1,1,2,3,4,5,4],
    Rice:    [2,2,3,3,4,3,2,2,3,5,5,3],
    Maize:   [3,3,4,5,4,3,2,2,3,4,4,3],
    Tomato:  [5,5,4,3,2,1,1,2,3,4,5,5],
    Onion:   [3,4,5,5,4,2,1,1,2,3,4,4],
    Cotton:  [2,2,2,3,3,3,2,2,3,4,5,4],
  };
  const heatColor = (v: number) => v >= 5 ? "bg-emerald-500 text-white" : v === 4 ? "bg-emerald-200 text-emerald-800" : v === 3 ? "bg-amber-100 text-amber-700" : v === 2 ? "bg-red-100 text-red-600" : "bg-red-200 text-red-700";
  const MONTHS = ["J","F","M","A","M","J","J","A","S","O","N","D"];

  return (
    <div className="flex flex-col gap-6">
      {/* Price Trend Chart */}
      <div className={glassCardLg}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-indigo-500" /></div><h2 className="text-lg font-black text-slate-800">Price Trend (12 Weeks)</h2></div>
          <div className="flex items-center gap-2">
            <select className={selectCls} value={chartCrop} onChange={e => setChartCrop(e.target.value)}>{CROPS.map(c => <option key={c}>{c}</option>)}</select>
          </div>
        </div>
        {chartLoading ? <div className="h-48 flex items-center justify-center"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
          : priceHistory && <Chart options={chartOptions} series={[{ name: chartCrop, data: priceHistory.prices }]} type="area" height={200} />}
        {priceHistory && <div className="flex gap-4 mt-2"><div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2"><p className="text-xs font-black text-indigo-500">Current</p><p className="font-black text-slate-800">₹{Math.round(priceHistory.current_price).toLocaleString()}/q</p></div></div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Market Comparison Table */}
        <div className={glassCard}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-emerald-500" /><h2 className="text-lg font-black text-slate-800">Live Mandi Prices</h2></div>
            <div className="flex items-center gap-2">
              <div className="relative"><select className={selectCls} value={selectedState} onChange={e => setSelectedState(e.target.value)}>{INDIAN_STATES.map(s => <option key={s} value={s}>{s || "National"}</option>)}</select></div>
              <button onClick={() => loadMarket(selectedState)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"><RefreshCw className={`w-3.5 h-3.5 ${marketLoading ? "animate-spin" : ""}`} /></button>
            </div>
          </div>
          <div className="overflow-auto">
            {marketLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-slate-300 animate-spin" /></div>
              : marketData.length === 0 ? <div className="text-center py-8 text-sm font-bold text-slate-400">No active feeds.</div>
              : <table className="w-full text-sm"><thead><tr className="border-b border-slate-100"><th className="text-left text-xs font-black text-slate-400 pb-2 uppercase tracking-wider">Crop</th><th className="text-right text-xs font-black text-slate-400 pb-2 uppercase tracking-wider">Min</th><th className="text-right text-xs font-black text-slate-400 pb-2 uppercase tracking-wider">Modal</th><th className="text-right text-xs font-black text-slate-400 pb-2 uppercase tracking-wider">Max</th></tr></thead>
                <tbody>{marketData.map((item, i) => <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"><td className="py-2.5"><p className="font-bold text-slate-800">{item.crop}</p><p className="text-[10px] text-slate-400">{item.state}</p></td><td className="text-right text-xs font-bold text-slate-500">₹{Math.round(item.min_price).toLocaleString()}</td><td className="text-right font-black text-emerald-600">₹{Math.round(item.modal_price).toLocaleString()}</td><td className="text-right text-xs font-bold text-slate-500">₹{Math.round(item.max_price).toLocaleString()}</td></tr>)}</tbody>
              </table>}
          </div>
        </div>

        {/* Price Alerts */}
        <div className={glassCard}>
          <div className="flex items-center gap-2 mb-4"><BellRing className="w-5 h-5 text-amber-500" /><h2 className="text-lg font-black text-slate-800">Custom Price Alerts</h2></div>
          <div className="flex gap-2 mb-2">
            <select className={`${selectCls} flex-1`} value={alertCrop} onChange={e => setAlertCrop(e.target.value)}>{CROPS.map(c => <option key={c}>{c}</option>)}</select>
            <select className={`${selectCls} w-28`} value={alertDir} onChange={e => setAlertDir(e.target.value as "above" | "below")}><option value="above">Above</option><option value="below">Below</option></select>
          </div>
          <div className="flex gap-2 mb-4">
            <input type="number" placeholder="Price ₹/q" value={alertThreshold} onChange={e => setAlertThreshold(e.target.value)} className="flex-1 bg-slate-100/80 border-none text-sm font-medium text-slate-800 rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-400 outline-none" />
            <button onClick={saveAlert} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center gap-1.5 transition-all shadow-md shadow-amber-400/20"><Bell className="w-4 h-4" />Set</button>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto max-h-48">
            {alerts.length === 0 ? <p className="text-sm text-center text-slate-400 font-bold py-4">No alerts set.</p>
              : alerts.map(a => <div key={a.id} className="flex items-center justify-between bg-white border border-slate-100 rounded-xl px-4 py-2.5 shadow-sm"><div><span className="font-bold text-slate-800 text-sm">{a.crop}</span><span className="text-xs text-slate-400 font-medium ml-2">{a.direction} ₹{a.threshold.toLocaleString()}/q</span></div><button onClick={() => deleteAlert(a.id)} className="text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button></div>)}
          </div>
        </div>
      </div>

      {/* Seasonal Price Heatmap */}
      <div className={glassCard}>
        <div className="flex items-center gap-2 mb-5"><BarChart3 className="w-5 h-5 text-violet-500" /><h2 className="text-lg font-black text-slate-800">Seasonal Price Heatmap</h2><Badge className="bg-violet-100 text-violet-700 border-none text-[10px] font-black ml-2">Best months to sell</Badge></div>
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead><tr><th className="text-left font-black text-slate-400 pb-2 pr-4 uppercase tracking-wider w-24">Crop</th>{MONTHS.map((m, i) => <th key={i} className="font-black text-slate-400 pb-2 px-1 text-center">{m}</th>)}</tr></thead>
            <tbody>{Object.entries(HEATMAP).map(([crop, vals]) => <tr key={crop}><td className="font-bold text-slate-700 py-1 pr-4">{crop}</td>{vals.map((v, i) => <td key={i} className="px-0.5 py-1"><div className={`w-8 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] mx-auto ${heatColor(v)}`}>{v === 5 ? "★" : v === 1 ? "✗" : ""}</div></td>)}</tr>)}</tbody>
          </table>
        </div>
        <div className="flex gap-4 mt-4 flex-wrap"><div className="flex items-center gap-1.5 text-xs font-bold text-slate-500"><div className="w-3 h-3 rounded bg-emerald-500" /> Best selling months</div><div className="flex items-center gap-1.5 text-xs font-bold text-slate-500"><div className="w-3 h-3 rounded bg-amber-100" /> Moderate prices</div><div className="flex items-center gap-1.5 text-xs font-bold text-slate-500"><div className="w-3 h-3 rounded bg-red-200" /> Avoid selling</div></div>
      </div>
    </div>
  );
}

// ── Tab 4: Advisories ─────────────────────────────────────────────────────────
function AdvisoriesTab() {
  const [subsidies, setSubsidies] = useState<Subsidy[]>([]);
  const [subsidyLoading, setSubsidyLoading] = useState(true);
  const [subsidyCrop, setSubsidyCrop] = useState("Wheat");
  const [subsidyLand, setSubsidyLand] = useState("5");

  useEffect(() => {
    fetch(`${API_BASE}/agriculture/subsidies`)
      .then(r => r.ok ? r.json() : { subsidies: [] })
      .then(d => setSubsidies(d.subsidies || []))
      .catch(() => setSubsidies([]))
      .finally(() => setSubsidyLoading(false));
  }, []);

  const categoryColor: Record<string, string> = { Insurance: "indigo", Input: "amber", "Direct Benefit": "emerald", Advisory: "violet", Equipment: "sky", Seeds: "lime", Development: "orange", "Market Access": "rose" };
  const selectCls = "bg-slate-100/80 border-none text-sm font-bold text-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer";

  return (
    <div className="flex flex-col gap-6">
      {/* Expert Tips */}
      <div className={glassCardLg}>
        <div className="flex items-center gap-2 mb-5"><BookOpen className="w-5 h-5 text-sky-500" /><h2 className="text-lg font-black text-slate-800">Expert Farming Tips</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXPERT_TIPS.map((tip, i) => (
            <div key={i} className={`bg-${tip.color}-50/50 border border-${tip.color}-100 rounded-2xl p-5 hover:shadow-md transition-shadow`}>
              <div className="text-2xl mb-3">{tip.icon}</div>
              <Badge className={`bg-${tip.color}-100 text-${tip.color}-700 border-none text-[10px] font-black mb-2`}>{tip.tag}</Badge>
              <h4 className="font-black text-slate-800 mb-2">{tip.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">{tip.tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pest Risk Map (Simplified State List View) */}
      <div className={glassCard}>
        <div className="flex items-center gap-2 mb-5"><MapPin className="w-5 h-5 text-rose-500" /><h2 className="text-lg font-black text-slate-800">State-wise Pest Risk</h2></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {Object.entries(PEST_MAP_STATES).map(([state, risk]) => (
            <div key={state} className={`p-3 rounded-2xl bg-${RISK_COLOR[risk]}-50 border border-${RISK_COLOR[risk]}-100 flex flex-col gap-1`}>
              <p className="text-xs font-black text-slate-700 truncate">{state}</p>
              <Badge className={`bg-${RISK_COLOR[risk]}-100 text-${RISK_COLOR[risk]}-700 border-none text-[9px] font-black self-start capitalize`}>{risk}</Badge>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-4 flex-wrap">{[["critical","rose"],["high","amber"],["moderate","yellow"],["low","emerald"]].map(([label, color]) => <div key={label} className="flex items-center gap-1.5 text-xs font-bold text-slate-500"><div className={`w-3 h-3 rounded-full bg-${color}-400`} /><span className="capitalize">{label} risk</span></div>)}</div>
      </div>

      {/* Subsidy Info & Calculator */}
      <div className={glassCardLg}>
        <div className="flex items-center gap-2 mb-5"><Landmark className="w-5 h-5 text-indigo-500" /><h2 className="text-lg font-black text-slate-800">Government Subsidies</h2></div>
        {subsidyLoading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-slate-300 animate-spin" /></div>
          : <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {subsidies.map((s, i) => (
              <a key={i} href={s.link} target="_blank" rel="noreferrer" className={`group bg-${(categoryColor[s.category] || "slate")}-50/50 border border-${(categoryColor[s.category] || "slate")}-100 rounded-2xl p-4 hover:shadow-md transition-all flex flex-col gap-2 no-underline`}>
                <div className="flex items-start justify-between gap-2"><h4 className="font-black text-slate-800 text-sm leading-tight">{s.name}</h4><ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 shrink-0 transition-colors" /></div>
                <Badge className={`bg-${(categoryColor[s.category] || "slate")}-100 text-${(categoryColor[s.category] || "slate")}-700 border-none text-[10px] font-black self-start`}>{s.category}</Badge>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">{s.benefit}</p>
                <p className="text-[10px] text-slate-400 font-bold">Eligible: {s.eligibility}</p>
              </a>
            ))}
          </div>}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function Agriculture() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "planner" | "markets" | "advisories">("dashboard");
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [showWeather, setShowWeather] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/live/weather?city=Hyderabad`)
      .then(r => r.ok ? r.json() : null).then(d => { if (d) setWeather(d); }).catch(() => {}).finally(() => setWeatherLoading(false));
  }, []);

  const today = weather?.forecast?.[0];

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "planner", label: "AI Planner", icon: CalendarDays },
    { id: "markets", label: "Markets", icon: BarChart3 },
    { id: "advisories", label: "Advisories", icon: BookOpen },
  ] as const;

  return (
    <div className="-m-6 flex flex-col h-[calc(100vh-4rem)] relative overflow-hidden font-sans bg-slate-50">
      {/* Ambient background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40" style={{ backgroundImage: "radial-gradient(circle at 0% 0%, rgba(16,185,129,0.2), transparent 40%), radial-gradient(circle at 100% 100%, rgba(245,158,11,0.15), transparent 40%), radial-gradient(circle at 50% 100%, rgba(56,189,248,0.15), transparent 40%)" }} />
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(148,163,184,0.1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* Header */}
      <div className="shrink-0 z-20 px-8 pt-6 pb-0">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between mb-5">
          <div><h1 className="text-3xl font-black text-slate-900 tracking-tight">Agri-Hub</h1><p className="text-sm font-bold text-slate-500 mt-1">Precision Farming & Market Intelligence</p></div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowChat(true)} className="relative w-10 h-10 rounded-full bg-white/70 backdrop-blur-xl border border-white shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center text-indigo-600">
              <MessageCircle className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
            </button>
            <button onClick={() => setShowWeather(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/70 backdrop-blur-xl border border-white shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all text-slate-700 font-bold text-sm">
              {weatherLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : <Cloud className="w-4 h-4 text-sky-500" />}
              {today ? `${weather?.city ?? "India"}, ${today.high}°` : "Weather"}
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 bg-white/50 backdrop-blur-xl rounded-2xl p-1 border border-white/60 shadow-sm w-fit">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? "bg-white shadow-md text-slate-900 shadow-slate-200/80" : "text-slate-500 hover:text-slate-700"}`}>
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-indigo-500" : ""}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 z-10 relative" style={{ scrollbarWidth: "none" }}>
        <div className="max-w-[1400px] mx-auto">
          {activeTab === "dashboard" && <DashboardTab />}
          {activeTab === "planner" && <PlannerTab />}
          {activeTab === "markets" && <MarketsTab />}
          {activeTab === "advisories" && <AdvisoriesTab />}
        </div>
      </div>

      {showWeather && <WeatherDrawer weather={weather} loading={weatherLoading} onClose={() => setShowWeather(false)} />}
      {showChat && <AgriChatModal onClose={() => setShowChat(false)} />}
    </div>
  );
}
