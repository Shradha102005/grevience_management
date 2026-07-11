import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity, Zap, Droplets, Bus, TrafficCone, Wifi,
  AlertTriangle, CheckCircle2, Clock, RefreshCw, X,
  Terminal, BatteryCharging, Cpu, Map, ArrowRight,
  Shield, Radio, TrendingUp, Gauge, Sparkles, Search,
  MapPin, Navigation, Car, CloudRain, Wind, Thermometer,
  Building2, Star, Phone, Send, Mic, MicOff, ChevronDown,
  Landmark, Flame, Ambulance, Banknote, CreditCard, Zap as ZapIcon,
  Calendar, Globe, Bot, Languages, ParkingMeterIcon,
  ParkingSquare, MessageCircle, Volume2, Coffee, Trees,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";

export const Route = createFileRoute("/portal/smart-city")({
  component: SmartCity,
});

const API_BASE = "http://localhost:8000";

// ── Types ──────────────────────────────────────────────────────────────────────
interface WeatherDay { date: string; day: string; weather: string; description: string; high: number; low: number; humidity: number; wind_speed: number; rain_chance: number; icon: string; }
interface AQI { aqi: number; category: string; pm25: number; }
interface WeatherData { city: string; current: { temp: number; feels_like: number; humidity: number; wind_speed: number; weather: string; description: string; icon: string; }; forecast: WeatherDay[]; aqi: AQI; advisory: string; }
interface TrafficZone { zone: string; index: number; }
interface TransportMode { mode: string; routes: number | null; frequency: string; status: string; detail: string; }
interface NearbyService { id: string | number; name: string; type: string; lat: number | null; lng: number | null; address: string; phone: string; opening_hours: string; }
interface ParkingSpot { id: string; name: string; address: string; total_slots: number; available_slots: number; occupancy_pct: number; parking_type: string; is_paid: boolean; rate_per_hour: number | null; status: string; }
interface CityEvent { id: string; city: string; title: string; description: string; category: string; location: string | null; event_date: string | null; status: string; }
interface ChatMessage { role: "user" | "assistant"; content: string; }
interface UserInfo { role: string; city?: string; name?: string; }

// ── Helpers ────────────────────────────────────────────────────────────────────
const trafficColor = (v: number) => v > 75 ? "#f43f5e" : v > 50 ? "#fbbf24" : "#34d399";
const aqiColor = (aqi: number) => aqi <= 50 ? "#34d399" : aqi <= 100 ? "#a3e635" : aqi <= 200 ? "#fbbf24" : aqi <= 300 ? "#fb923c" : "#f43f5e";
const parkingColor = (pct: number) => pct > 80 ? "#f43f5e" : pct > 60 ? "#fbbf24" : "#34d399";

const POPULAR_CITIES = [
  "Hyderabad", "Mumbai", "Delhi", "Chennai", "Bengaluru",
  "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow",
  "Visakhapatnam", "Kochi", "Coimbatore", "Chandigarh", "Bhopal",
];

const NEARBY_TYPES = [
  { key: "hospital", label: "Hospitals", icon: Ambulance, color: "#f43f5e" },
  { key: "pharmacy", label: "Pharmacy", icon: Coffee, color: "#34d399" },
  { key: "police", label: "Police", icon: Shield, color: "#60a5fa" },
  { key: "fire", label: "Fire Station", icon: Flame, color: "#fb923c" },
  { key: "atm", label: "ATMs", icon: CreditCard, color: "#a78bfa" },
  { key: "ev_charging", label: "EV Charging", icon: ZapIcon, color: "#fbbf24" },
  { key: "bank", label: "Banks", icon: Banknote, color: "#34d399" },
  { key: "toilet", label: "Public Toilets", icon: Building2, color: "#94a3b8" },
];

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hi", label: "हिंदी", flag: "🇮🇳" },
  { code: "te", label: "తెలుగు", flag: "🔵" },
  { code: "ta", label: "தமிழ்", flag: "🟠" },
];

const TABS = ["Overview", "Traffic", "Transport", "Nearby", "Parking", "Weather", "Events"];

// ── City Selector Modal ────────────────────────────────────────────────────────
function CitySelectorModal({ onSelect, lockedCity }: { onSelect: (city: string) => void; lockedCity?: string }) {
  const [search, setSearch] = useState("");
  const filtered = POPULAR_CITIES.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  if (lockedCity) {
    // Officers: show locked city notice
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "var(--color-card)", borderRadius: "20px", border: "1px solid rgba(139,92,246,0.2)", padding: "40px", maxWidth: "420px", width: "90%", textAlign: "center" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Shield style={{ width: 26, height: 26, color: "white" }} />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-foreground)", marginBottom: "10px" }}>City Assigned</h2>
          <p style={{ fontSize: "13px", color: "var(--color-muted-foreground)", marginBottom: "24px" }}>
            As a government officer, your portal is locked to <strong style={{ color: "#a78bfa" }}>{lockedCity}</strong>.
          </p>
          <button onClick={() => onSelect(lockedCity)}
            style={{ padding: "12px 32px", borderRadius: "12px", background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", color: "white", fontWeight: 700, fontSize: "14px", border: "none", cursor: "pointer" }}>
            Continue to {lockedCity}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "var(--color-card)", borderRadius: "24px", border: "1px solid rgba(139,92,246,0.2)", padding: "36px", maxWidth: "520px", width: "100%", boxShadow: "0 40px 100px rgba(0,0,0,0.4)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "28px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Globe style={{ width: 22, height: 22, color: "white" }} />
          </div>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-foreground)", margin: 0 }}>Choose Your City</h2>
            <p style={{ fontSize: "12px", color: "var(--color-muted-foreground)", margin: 0 }}>Nation-wide smart city portal — pick any Indian city</p>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: "20px" }}>
          <Search style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--color-muted-foreground)" }} />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && search.trim()) onSelect(search.trim()); }}
            placeholder="Search any Indian city..."
            style={{ width: "100%", padding: "12px 14px 12px 42px", borderRadius: "12px", border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.05)", color: "var(--color-foreground)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Custom city hint */}
        {search.trim() && !POPULAR_CITIES.find(c => c.toLowerCase() === search.toLowerCase()) && (
          <button onClick={() => onSelect(search.trim())}
            style={{ width: "100%", padding: "10px 14px", marginBottom: "12px", borderRadius: "10px", border: "1px dashed rgba(139,92,246,0.4)", background: "rgba(139,92,246,0.05)", color: "#a78bfa", fontSize: "13px", fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
            Use "{search.trim()}" →
          </button>
        )}

        {/* Popular cities grid */}
        <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>Popular Cities</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", maxHeight: "260px", overflowY: "auto" }}>
          {filtered.map(city => (
            <button key={city} onClick={() => onSelect(city)}
              style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(139,92,246,0.12)", background: "var(--color-background)", color: "var(--color-foreground)", fontSize: "13px", fontWeight: 600, cursor: "pointer", textAlign: "left", transition: "all 0.15s", display: "flex", alignItems: "center", gap: "8px" }}>
              <MapPin style={{ width: 12, height: 12, color: "#a78bfa", flexShrink: 0 }} />
              {city}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AI Chat Panel ──────────────────────────────────────────────────────────────
function AIChatPanel({ city, userRole, onClose }: { city: string; userRole: string; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: `Hi! I'm your Smart City assistant for **${city}**. Ask me about traffic, transport, weather, nearby services, or any city-related query! 🏙️` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("en");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/smart-city/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, message: msg, language, history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again." }]);
    } finally { setLoading(false); }
  };

  const quickReplies = ["Traffic update", "Weather today", "Nearest hospital", "Bus routes", "Parking nearby"];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 49 }} />
      <div style={{ position: "fixed", bottom: "90px", right: "24px", width: "min(400px, calc(100vw - 48px))", height: "500px", background: "var(--color-background)", borderRadius: "20px", border: "1px solid rgba(139,92,246,0.2)", boxShadow: "0 24px 80px rgba(0,0,0,0.3)", zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(139,92,246,0.1)", background: "linear-gradient(135deg,rgba(139,92,246,0.08),rgba(6,182,212,0.04))", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bot style={{ width: 16, height: 16, color: "white" }} />
            </div>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 800, color: "var(--color-foreground)", margin: 0 }}>City AI Assistant</p>
              <p style={{ fontSize: "10px", color: "#a78bfa", margin: 0 }}>{city} · {LANGUAGES.find(l => l.code === language)?.label}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Language selector */}
            <select value={language} onChange={e => setLanguage(e.target.value)}
              style={{ fontSize: "11px", borderRadius: "8px", border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.08)", color: "var(--color-foreground)", padding: "4px 8px", cursor: "pointer", outline: "none" }}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
            </select>
            <button onClick={onClose} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "1px solid rgba(139,92,246,0.15)", background: "rgba(139,92,246,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X style={{ width: 13, height: 13, color: "var(--color-muted-foreground)" }} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "85%", padding: "10px 13px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: m.role === "user" ? "linear-gradient(135deg,#8b5cf6,#7c3aed)" : "var(--color-card)",
                border: m.role === "user" ? "none" : "1px solid rgba(139,92,246,0.1)",
                color: m.role === "user" ? "white" : "var(--color-foreground)",
                fontSize: "13px", lineHeight: 1.5, whiteSpace: "pre-wrap",
              }}>
                {m.content.replace(/\*\*(.*?)\*\*/g, "$1")}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: "4px", padding: "10px 13px", background: "var(--color-card)", borderRadius: "14px 14px 14px 4px", border: "1px solid rgba(139,92,246,0.1)", width: "fit-content" }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", animation: `bounce 0.8s ${i * 0.15}s infinite` }} />)}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick replies */}
        <div style={{ padding: "8px 12px", display: "flex", gap: "6px", flexWrap: "wrap", flexShrink: 0, borderTop: "1px solid rgba(139,92,246,0.06)" }}>
          {quickReplies.map(qr => (
            <button key={qr} onClick={() => sendMessage(qr)}
              style={{ fontSize: "11px", padding: "5px 10px", borderRadius: "20px", border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.06)", color: "#a78bfa", cursor: "pointer", fontWeight: 600 }}>
              {qr}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(139,92,246,0.1)", display: "flex", gap: "8px", flexShrink: 0 }}>
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ask about traffic, weather, services..."
            style={{ flex: 1, padding: "10px 14px", borderRadius: "12px", border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.04)", color: "var(--color-foreground)", fontSize: "13px", outline: "none" }}
          />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            style={{ width: "40px", height: "40px", borderRadius: "12px", background: input.trim() ? "linear-gradient(135deg,#8b5cf6,#06b6d4)" : "rgba(139,92,246,0.1)", border: "none", cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Send style={{ width: 15, height: 15, color: input.trim() ? "white" : "#a78bfa" }} />
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
function SmartCity() {
  // City state
  const [city, setCity] = useState<string | null>(null);
  const [showCitySelector, setShowCitySelector] = useState(false);

  // User info from localStorage
  const [userInfo, setUserInfo] = useState<UserInfo>({ role: "citizen" });

  // Tab state
  const [activeTab, setActiveTab] = useState("Overview");

  // Data states
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [traffic, setTraffic] = useState<{ zones: TrafficZone[]; advisories: any[]; high_congestion_zones: string[]; source?: string } | null>(null);
  const [transport, setTransport] = useState<{ modes: TransportMode[]; helpline: string; alerts: any[] } | null>(null);
  const [nearby, setNearby] = useState<NearbyService[]>([]);
  const [nearbyType, setNearbyType] = useState("hospital");
  const [parking, setParking] = useState<ParkingSpot[]>([]);
  const [parkingAsOf, setParkingAsOf] = useState<string | null>(null);
  const [events, setEvents] = useState<CityEvent[]>([]);
  const [telemetry, setTelemetry] = useState<any>(null);

  // UI state
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [showChat, setShowChat] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Load user info from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("civicos_user");
      if (stored) {
        const u = JSON.parse(stored);
        setUserInfo({ role: u.role || "citizen", city: u.city, name: u.name });
      }
    } catch {}

    // Load saved city
    const savedCity = localStorage.getItem("civicos_smart_city");
    if (savedCity) {
      setCity(savedCity);
    } else {
      setShowCitySelector(true);
    }
  }, []);

  const handleCitySelect = useCallback((selectedCity: string) => {
    setCity(selectedCity);
    setShowCitySelector(false);
    localStorage.setItem("civicos_smart_city", selectedCity);
    // Also update user profile city
    const token = localStorage.getItem("civicos_token");
    if (token) {
      fetch(`${API_BASE}/api/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ city: selectedCity }),
      }).catch(() => {});
    }
  }, []);

  // Fetch all data for the selected city
  const fetchData = useCallback(async (tabOverride?: string) => {
    if (!city) return;
    const tab = tabOverride ?? activeTab;
    const setL = (key: string, v: boolean) => setLoading(prev => ({ ...prev, [key]: v }));

    if (tab === "Overview" || tab === "Weather") {
      setL("weather", true);
      fetch(`${API_BASE}/smart-city/weather?city=${encodeURIComponent(city)}`).then(r => r.json()).then(setWeather).catch(() => {}).finally(() => setL("weather", false));
    }
    if (tab === "Overview" || tab === "Traffic") {
      setL("traffic", true);
      fetch(`${API_BASE}/smart-city/traffic?city=${encodeURIComponent(city)}`).then(r => r.json()).then(setTraffic).catch(() => {}).finally(() => setL("traffic", false));
    }
    if (tab === "Transport") {
      setL("transport", true);
      fetch(`${API_BASE}/smart-city/transport?city=${encodeURIComponent(city)}`).then(r => r.json()).then(setTransport).catch(() => {}).finally(() => setL("transport", false));
    }
    if (tab === "Nearby") {
      setL("nearby", true);
      fetch(`${API_BASE}/smart-city/nearby?city=${encodeURIComponent(city)}&service_type=${nearbyType}`).then(r => r.json()).then(d => setNearby(d.services || [])).catch(() => {}).finally(() => setL("nearby", false));
    }
    if (tab === "Parking") {
      setL("parking", true);
      fetch(`${API_BASE}/smart-city/parking?city=${encodeURIComponent(city)}`).then(r => r.json()).then(d => { setParking(d.parking || []); setParkingAsOf(d.as_of || null); }).catch(() => {}).finally(() => setL("parking", false));
    }
    if (tab === "Events") {
      setL("events", true);
      fetch(`${API_BASE}/smart-city/events?city=${encodeURIComponent(city)}`).then(r => r.json()).then(d => setEvents(d.events || [])).catch(() => {}).finally(() => setL("events", false));
    }
    if (tab === "Overview") {
      fetch(`${API_BASE}/live/city-telemetry`).then(r => r.json()).then(setTelemetry).catch(() => {});
    }
    setLastSync(new Date());
  }, [city, activeTab, nearbyType]);

  useEffect(() => { if (city) fetchData(); }, [city, activeTab]);
  useEffect(() => { if (city && activeTab === "Nearby") fetchData("Nearby"); }, [nearbyType]);

  // Poll every 30s for live tabs
  useEffect(() => {
    if (!city) return;
    const id = setInterval(() => { if (["Overview", "Traffic", "Weather"].includes(activeTab)) fetchData(); }, 30000);
    return () => clearInterval(id);
  }, [city, activeTab, fetchData]);

  // ── Render helpers ───────────────────────────────────────────────────────────

  const isOfficer = userInfo.role === "officer";
  const isAdmin = userInfo.role === "admin";
  const canManage = isOfficer || isAdmin;

  // City selector modal
  if (!city || showCitySelector) {
    return (
      <CitySelectorModal
        onSelect={handleCitySelect}
        lockedCity={isOfficer && userInfo.city ? userInfo.city : undefined}
      />
    );
  }

  // ── Tab content renderers ────────────────────────────────────────────────────

  const renderOverview = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: "12px" }}>
        {[
          { label: "Temperature", value: weather?.current.temp ? `${weather.current.temp}°C` : "—", icon: Thermometer, color: "#fbbf24", sub: weather?.current.description || "Loading..." },
          { label: "AQI", value: weather?.aqi.aqi ?? "—", icon: Wind, color: aqiColor(weather?.aqi.aqi ?? 0), sub: weather?.aqi.category || "—" },
          { label: "High Traffic Zones", value: traffic?.high_congestion_zones.length ?? "—", icon: TrafficCone, color: "#f43f5e", sub: "Right now" },
          { label: "Humidity", value: weather?.current.humidity ? `${weather.current.humidity}%` : "—", icon: Droplets, color: "#60a5fa", sub: "Relative humidity" },
          { label: "Wind", value: weather?.current.wind_speed ? `${weather.current.wind_speed} km/h` : "—", icon: Radio, color: "#34d399", sub: "Wind speed" },
          { label: "Transport", value: transport ? `${transport.modes.filter(m => m.status === "ok").length}/${transport.modes.length}` : "—", icon: Bus, color: "#a78bfa", sub: "Modes on time" },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} style={{ background: "var(--color-card)", borderRadius: "14px", border: "1px solid rgba(139,92,246,0.08)", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "9px", background: `${color}18`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon style={{ width: 15, height: 15, color }} />
              </div>
              <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>{label}</p>
            </div>
            <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--color-foreground)", margin: 0 }}>{value}</p>
            <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", margin: 0 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Traffic mini chart + Weather advisory */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "14px" }}>
        {/* Traffic chart */}
        <div style={{ background: "var(--color-card)", borderRadius: "16px", border: "1px solid rgba(139,92,246,0.1)", padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <TrafficCone style={{ width: 15, height: 15, color: "#a78bfa" }} />
            <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-foreground)", margin: 0 }}>Traffic Congestion — {city}</p>
          </div>
          <div style={{ height: "160px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={traffic?.zones ?? []} layout="vertical" margin={{ top: 0, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.07)" horizontal={false} />
                <XAxis type="number" domain={[0,100]} tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis dataKey="zone" type="category" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} width={110} />
                <Bar dataKey="index" radius={[0,6,6,0]} animationDuration={600}>
                  {(traffic?.zones ?? []).map((e, i) => <Cell key={i} fill={trafficColor(e.index)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weather card */}
        <div style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.08))", borderRadius: "16px", border: "1px solid rgba(139,92,246,0.15)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Thermometer style={{ width: 15, height: 15, color: "#fbbf24" }} />
            <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-foreground)", margin: 0 }}>Weather — {city}</p>
          </div>
          {weather ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <p style={{ fontSize: "48px", margin: 0 }}>{weather.current.icon}</p>
                <div>
                  <p style={{ fontSize: "32px", fontWeight: 800, color: "var(--color-foreground)", margin: 0 }}>{weather.current.temp}°C</p>
                  <p style={{ fontSize: "12px", color: "var(--color-muted-foreground)", margin: 0 }}>{weather.current.description}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                {weather.forecast.slice(0,3).map(d => (
                  <div key={d.date} style={{ flex: 1, background: "rgba(139,92,246,0.06)", borderRadius: "10px", padding: "8px", textAlign: "center" }}>
                    <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-muted-foreground)", margin: "0 0 4px" }}>{d.day}</p>
                    <p style={{ fontSize: "16px", margin: "0 0 4px" }}>{d.icon}</p>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-foreground)", margin: 0 }}>{d.high}°</p>
                  </div>
                ))}
              </div>
              {weather.advisory && (
                <div style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", fontSize: "11px", color: "#fbbf24" }}>
                  {weather.advisory}
                </div>
              )}
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "120px", color: "var(--color-muted-foreground)", fontSize: "12px" }}>Loading weather...</div>
          )}
        </div>
      </div>

      {/* Utility status from NOC */}
      {telemetry?.services && (
        <div style={{ background: "var(--color-card)", borderRadius: "16px", border: "1px solid rgba(139,92,246,0.1)", padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <Zap style={{ width: 15, height: 15, color: "#a78bfa" }} />
            <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-foreground)", margin: 0 }}>Utility Services — Live</p>
            {isAdmin && <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", background: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)", marginLeft: "auto" }}>Admin: Override via Settings</span>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: "10px" }}>
            {telemetry.services.map((svc: any) => {
              const colors: Record<string, string> = { ok: "#34d399", warn: "#fbbf24", alert: "#f43f5e" };
              const c = colors[svc.status] || "#34d399";
              return (
                <div key={svc.id} style={{ padding: "12px 14px", borderRadius: "12px", background: `${c}08`, border: `1px solid ${c}25` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-muted-foreground)", margin: 0, textTransform: "uppercase" }}>{svc.label}</p>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: c, background: `${c}15`, padding: "2px 7px", borderRadius: "20px" }}>
                      {svc.status === "ok" ? "OK" : svc.status === "warn" ? "WARN" : "ALERT"}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--color-foreground)", margin: 0, fontWeight: 600 }}>{svc.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderTraffic = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Advisories */}
      <div style={{ background: "var(--color-card)", borderRadius: "16px", border: "1px solid rgba(139,92,246,0.1)", padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertTriangle style={{ width: 15, height: 15, color: "#fbbf24" }} />
            <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-foreground)", margin: 0 }}>Traffic Advisories — {city}</p>
          </div>
          {canManage && (
            <button onClick={async () => {
              const msg = prompt("Enter traffic advisory message:");
              if (!msg) return;
              const token = localStorage.getItem("civicos_token");
              await fetch(`${API_BASE}/smart-city/traffic/advisory`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ city, message: msg, severity: "warn" }),
              });
              fetchData("Traffic");
            }} style={{ padding: "7px 14px", borderRadius: "10px", border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.08)", color: "#fbbf24", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
              + Post Advisory
            </button>
          )}
        </div>
        {traffic?.advisories && traffic.advisories.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {traffic.advisories.map((a: any) => (
              <div key={a.id} style={{ padding: "12px 14px", borderRadius: "10px", background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <AlertTriangle style={{ width: 14, height: 14, color: "#fbbf24", flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "13px", color: "var(--color-foreground)", margin: "0 0 4px" }}>{a.message}</p>
                  <p style={{ fontSize: "10px", color: "var(--color-muted-foreground)", margin: 0 }}>Posted by {a.posted_by} · {new Date(a.posted_at).toLocaleTimeString("en-IN")}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "14px", background: "rgba(52,211,153,0.06)", borderRadius: "10px", border: "1px solid rgba(52,211,153,0.15)" }}>
            <CheckCircle2 style={{ width: 14, height: 14, color: "#34d399" }} />
            <p style={{ fontSize: "12px", color: "#34d399", margin: 0, fontWeight: 600 }}>No active advisories — traffic is flowing normally in {city}</p>
          </div>
        )}
      </div>

      {/* Zone congestion full chart */}
      <div style={{ background: "var(--color-card)", borderRadius: "16px", border: "1px solid rgba(139,92,246,0.1)", padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-foreground)", margin: 0 }}>Zone-wise Congestion Index</p>
          {traffic?.source === "tomtom" ? (
            <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)" }}>Real-time (TomTom)</span>
          ) : (
            <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", background: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}>Smart Simulation</span>
          )}
        </div>
        <div style={{ height: "220px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={traffic?.zones ?? []} layout="vertical" margin={{ top: 0, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.07)" horizontal={false} />
              <XAxis type="number" domain={[0,100]} tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="zone" type="category" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} width={130} />
              <Bar dataKey="index" radius={[0,6,6,0]} animationDuration={600}>
                {(traffic?.zones ?? []).map((e, i) => <Cell key={i} fill={trafficColor(e.index)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", gap: "14px", justifyContent: "center", marginTop: "10px" }}>
          {[["#34d399","Low (< 50)"],["#fbbf24","Moderate (50–75)"],["#f43f5e","High (> 75)"]].map(([c,l]) => (
            <span key={l} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "var(--color-muted-foreground)" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: "block" }} />{l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTransport = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {canManage && (
        <div style={{ padding: "12px 16px", borderRadius: "12px", background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: "12px", color: "#a78bfa", margin: 0, fontWeight: 600 }}>
            {isAdmin ? "Admin" : "Officer"}: You can post transport delay alerts
          </p>
          <button onClick={async () => {
            const mode = prompt("Transport mode (e.g. Metro, Bus):");
            const msg = prompt("Alert message:");
            if (!mode || !msg) return;
            const token = localStorage.getItem("civicos_token");
            await fetch(`${API_BASE}/smart-city/transport/alert`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ city, mode, message: msg, severity: "warn" }),
            });
            fetchData("Transport");
          }} style={{ padding: "7px 14px", borderRadius: "10px", border: "1px solid rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.1)", color: "#a78bfa", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
            + Post Alert
          </button>
        </div>
      )}

      {transport?.alerts && transport.alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#f43f5e", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Active Alerts</p>
          {transport.alerts.map((a: any) => (
            <div key={a.id} style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.2)", fontSize: "13px", color: "var(--color-foreground)" }}>
              <strong style={{ color: "#f43f5e" }}>{a.mode}:</strong> {a.message}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: "12px" }}>
        {(transport?.modes ?? []).map((m, i) => {
          const statusColors: Record<string, string> = { ok: "#34d399", warn: "#fbbf24", alert: "#f43f5e" };
          const c = statusColors[m.status] || "#34d399";
          return (
            <div key={i} style={{ background: "var(--color-card)", borderRadius: "16px", border: `1px solid ${c}25`, padding: "20px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: c, borderRadius: "16px 16px 0 0" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${c}18`, border: `1px solid ${c}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Bus style={{ width: 16, height: 16, color: c }} />
                  </div>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-foreground)", margin: 0 }}>{m.mode}</p>
                    {m.routes && <p style={{ fontSize: "10px", color: "var(--color-muted-foreground)", margin: 0 }}>{m.routes} routes</p>}
                  </div>
                </div>
                <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "20px", background: `${c}15`, color: c }}>
                  {m.status === "ok" ? "On Schedule" : m.status === "warn" ? "Delayed" : "Alert"}
                </span>
              </div>
              <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", margin: "0 0 8px", lineHeight: 1.5 }}>{m.detail}</p>
              <p style={{ fontSize: "10px", color: "#a78bfa", fontWeight: 600, margin: 0 }}>Frequency: {m.frequency}</p>
            </div>
          );
        })}
        {!transport && <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", justifyContent: "center", height: "160px", color: "var(--color-muted-foreground)", fontSize: "13px" }}>Loading transport data...</div>}
      </div>
      {transport?.helpline && (
        <div style={{ padding: "12px 16px", borderRadius: "12px", background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)", display: "flex", alignItems: "center", gap: "10px" }}>
          <Phone style={{ width: 14, height: 14, color: "#60a5fa" }} />
          <p style={{ fontSize: "12px", color: "var(--color-foreground)", margin: 0 }}>
            <strong>Transport Helpline:</strong> <span style={{ color: "#60a5fa" }}>{transport.helpline}</span>
          </p>
        </div>
      )}
    </div>
  );

  const renderNearby = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Type filter */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {NEARBY_TYPES.map(t => {
          const Icon = t.icon;
          const active = nearbyType === t.key;
          return (
            <button key={t.key} onClick={() => setNearbyType(t.key)}
              style={{ padding: "8px 14px", borderRadius: "20px", border: `1px solid ${active ? t.color : "rgba(139,92,246,0.15)"}`, background: active ? `${t.color}15` : "transparent", color: active ? t.color : "var(--color-muted-foreground)", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.15s" }}>
              <Icon style={{ width: 13, height: 13 }} />{t.label}
            </button>
          );
        })}
      </div>

      {/* Admin add button */}
      {isAdmin && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button style={{ padding: "8px 16px", borderRadius: "10px", border: "1px solid rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.08)", color: "#a78bfa", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
            + Add Location
          </button>
        </div>
      )}

      {/* Results */}
      {loading.nearby ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "var(--color-muted-foreground)", fontSize: "13px" }}>Fetching from OpenStreetMap...</div>
      ) : nearby.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "200px", gap: "10px", color: "var(--color-muted-foreground)" }}>
          <MapPin style={{ width: 28, height: 28, opacity: 0.3 }} />
          <p style={{ fontSize: "13px", margin: 0 }}>No {nearbyType} locations found for {city}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: "12px" }}>
          {nearby.map(svc => {
            const typeConfig = NEARBY_TYPES.find(t => t.key === svc.type) || NEARBY_TYPES[0];
            const Icon = typeConfig.icon;
            return (
              <div key={svc.id} style={{ background: "var(--color-card)", borderRadius: "14px", border: "1px solid rgba(139,92,246,0.08)", padding: "16px", display: "flex", gap: "12px" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "11px", background: `${typeConfig.color}18`, border: `1px solid ${typeConfig.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon style={{ width: 17, height: 17, color: typeConfig.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-foreground)", margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{svc.name}</p>
                  {svc.address && <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", margin: "0 0 6px" }}>{svc.address}</p>}
                  {svc.phone && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Phone style={{ width: 11, height: 11, color: "#60a5fa" }} />
                      <p style={{ fontSize: "11px", color: "#60a5fa", margin: 0 }}>{svc.phone}</p>
                    </div>
                  )}
                  {svc.opening_hours && <p style={{ fontSize: "10px", color: "var(--color-muted-foreground)", margin: "4px 0 0" }}>⏰ {svc.opening_hours}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p style={{ fontSize: "10px", color: "rgba(139,92,246,0.4)", textAlign: "center", margin: 0 }}>Data from OpenStreetMap contributors · Free & open source</p>
    </div>
  );

  const renderParking = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {parkingAsOf && (
        <div style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)", display: "flex", alignItems: "center", gap: "8px" }}>
          <Clock style={{ width: 14, height: 14, color: "#a78bfa" }} />
          <p style={{ fontSize: "12px", color: "var(--color-foreground)", margin: 0 }}>
            Live Occupancy Status — Auto-refreshing simulation model (As of <strong>{parkingAsOf}</strong>)
          </p>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: "12px" }}>
        {parking.map(spot => {
          const c = parkingColor(spot.occupancy_pct);
          return (
            <div key={spot.id} style={{ background: "var(--color-card)", borderRadius: "16px", border: `1px solid ${c}25`, padding: "20px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: c, borderRadius: "16px 16px 0 0" }} />
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${c}18`, border: `1px solid ${c}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Car style={{ width: 16, height: 16, color: c }} />
                  </div>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-foreground)", margin: 0 }}>{spot.name}</p>
                    <p style={{ fontSize: "10px", color: "var(--color-muted-foreground)", margin: 0, textTransform: "capitalize" }}>{spot.parking_type}</p>
                  </div>
                </div>
                <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "20px", background: `${c}15`, color: c }}>
                  {spot.status === "available" ? "Available" : spot.status === "limited" ? "Limited" : "Full"}
                </span>
              </div>
              {/* Occupancy bar */}
              <div style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", margin: 0 }}>{spot.available_slots} of {spot.total_slots} available</p>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: c, margin: 0 }}>{spot.occupancy_pct}% full</p>
                </div>
                <div style={{ height: "6px", borderRadius: "3px", background: "rgba(139,92,246,0.1)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${spot.occupancy_pct}%`, background: c, borderRadius: "3px", transition: "width 0.8s ease" }} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", margin: 0 }}>{spot.address}</p>
                {spot.is_paid && spot.rate_per_hour && (
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "#a78bfa", margin: 0 }}>₹{spot.rate_per_hour}/hr</p>
                )}
                {!spot.is_paid && <p style={{ fontSize: "11px", fontWeight: 700, color: "#34d399", margin: 0 }}>Free</p>}
              </div>
              {canManage && (
                <button onClick={async () => {
                  const val = prompt(`Update available slots (current: ${spot.available_slots}):`);
                  if (!val || isNaN(Number(val))) return;
                  const token = localStorage.getItem("civicos_token");
                  await fetch(`${API_BASE}/smart-city/parking/${spot.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ available_slots: Number(val) }),
                  });
                  fetchData("Parking");
                }} style={{ marginTop: "10px", width: "100%", padding: "7px", borderRadius: "8px", border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.06)", color: "#a78bfa", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                  Update Occupancy
                </button>
              )}
            </div>
          );
        })}
        {parking.length === 0 && !loading.parking && (
          <div style={{ gridColumn: "1/-1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "160px", gap: "10px", color: "var(--color-muted-foreground)" }}>
            <Car style={{ width: 28, height: 28, opacity: 0.3 }} />
            <p style={{ fontSize: "13px", margin: 0 }}>No parking data for {city}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderWeather = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {weather ? (
        <>
          {/* Current weather hero */}
          <div style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.1))", borderRadius: "20px", border: "1px solid rgba(139,92,246,0.2)", padding: "28px 32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>{city} — Right Now</p>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <p style={{ fontSize: "72px", margin: 0 }}>{weather.current.icon}</p>
                  <div>
                    <p style={{ fontSize: "52px", fontWeight: 800, color: "var(--color-foreground)", margin: 0, lineHeight: 1 }}>{weather.current.temp}°C</p>
                    <p style={{ fontSize: "14px", color: "var(--color-muted-foreground)", margin: "6px 0 0" }}>{weather.current.description} · Feels like {weather.current.feels_like}°C</p>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                {[
                  { label: "Humidity", value: `${weather.current.humidity}%`, icon: Droplets, color: "#60a5fa" },
                  { label: "Wind", value: `${weather.current.wind_speed} km/h`, icon: Wind, color: "#34d399" },
                  { label: "AQI", value: weather.aqi.aqi, icon: Activity, color: aqiColor(weather.aqi.aqi) },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} style={{ textAlign: "center", padding: "14px 18px", borderRadius: "14px", background: "rgba(0,0,0,0.1)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <Icon style={{ width: 18, height: 18, color, margin: "0 auto 8px" }} />
                    <p style={{ fontSize: "18px", fontWeight: 800, color: "var(--color-foreground)", margin: "0 0 4px" }}>{value}</p>
                    <p style={{ fontSize: "10px", color: "var(--color-muted-foreground)", margin: 0 }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Advisory */}
          {weather.advisory && (
            <div style={{ padding: "14px 18px", borderRadius: "12px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <AlertTriangle style={{ width: 15, height: 15, color: "#fbbf24", flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: "13px", color: "#fbbf24", margin: 0 }}>{weather.advisory}</p>
            </div>
          )}

          {/* AQI gauge */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div style={{ background: "var(--color-card)", borderRadius: "16px", border: "1px solid rgba(139,92,246,0.1)", padding: "20px" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px" }}>Air Quality Index</p>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "70px", height: "70px", borderRadius: "50%", border: `4px solid ${aqiColor(weather.aqi.aqi)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: `${aqiColor(weather.aqi.aqi)}12` }}>
                  <p style={{ fontSize: "20px", fontWeight: 800, color: aqiColor(weather.aqi.aqi), margin: 0 }}>{weather.aqi.aqi}</p>
                </div>
                <div>
                  <p style={{ fontSize: "16px", fontWeight: 700, color: aqiColor(weather.aqi.aqi), margin: "0 0 4px" }}>{weather.aqi.category}</p>
                  <p style={{ fontSize: "12px", color: "var(--color-muted-foreground)", margin: 0 }}>PM2.5: {weather.aqi.pm25} µg/m³</p>
                  <p style={{ fontSize: "10px", color: "var(--color-muted-foreground)", margin: "4px 0 0" }}>
                    {weather.aqi.aqi <= 100 ? "Air quality is acceptable." : weather.aqi.aqi <= 200 ? "Sensitive groups may be affected." : "Wear a mask outdoors."}
                  </p>
                </div>
              </div>
            </div>

            {/* 5-day forecast */}
            <div style={{ background: "var(--color-card)", borderRadius: "16px", border: "1px solid rgba(139,92,246,0.1)", padding: "20px" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>5-Day Forecast</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {weather.forecast.slice(0,5).map(d => (
                  <div key={d.date} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-muted-foreground)", margin: 0, width: "36px" }}>{d.day}</p>
                    <p style={{ fontSize: "18px", margin: 0 }}>{d.icon}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <p style={{ fontSize: "12px", color: "#f43f5e", fontWeight: 700, margin: 0 }}>{d.high}°</p>
                      <p style={{ fontSize: "12px", color: "#60a5fa", fontWeight: 600, margin: 0 }}>{d.low}°</p>
                    </div>
                    <p style={{ fontSize: "10px", color: "#60a5fa", margin: 0 }}>{d.rain_chance}% 🌧️</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "var(--color-muted-foreground)", fontSize: "13px" }}>Loading weather data for {city}...</div>
      )}
    </div>
  );

  const EVENT_CATEGORIES = [
    { key: "marathon", label: "Marathon", icon: "🏃", color: "#34d399" },
    { key: "festival", label: "Festival", icon: "🎉", color: "#fbbf24" },
    { key: "road_closure", label: "Road Closure", icon: "🚧", color: "#f43f5e" },
    { key: "exhibition", label: "Exhibition", icon: "🏛️", color: "#60a5fa" },
    { key: "announcement", label: "Announcement", icon: "📢", color: "#a78bfa" },
  ];

  const renderEvents = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {canManage && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={async () => {
            const title = prompt("Event title:");
            const desc = prompt("Event description:");
            const cat = prompt("Category (marathon/festival/road_closure/exhibition/announcement):");
            const loc = prompt("Location:");
            const date = prompt("Event date (YYYY-MM-DD):");
            if (!title || !desc || !cat) return;
            const token = localStorage.getItem("civicos_token");
            const res = await fetch(`${API_BASE}/smart-city/events`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ city, title, description: desc, category: cat, location: loc, event_date: date ? `${date}T00:00:00` : null }),
            });
            fetchData("Events");
          }} style={{ padding: "9px 18px", borderRadius: "12px", border: "1px solid rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.1)", color: "#a78bfa", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
            {isAdmin ? "+ Create & Publish Event" : "+ Create Event Draft"}
          </button>
        </div>
      )}

      {events.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "200px", gap: "12px", color: "var(--color-muted-foreground)" }}>
          <Calendar style={{ width: 32, height: 32, opacity: 0.3 }} />
          <p style={{ fontSize: "13px", margin: 0 }}>No upcoming events in {city}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", gap: "14px" }}>
          {events.map(ev => {
            const cat = EVENT_CATEGORIES.find(c => c.key === ev.category) || EVENT_CATEGORIES[4];
            return (
              <div key={ev.id} style={{ background: "var(--color-card)", borderRadius: "16px", border: "1px solid rgba(139,92,246,0.08)", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "20px" }}>{cat.icon}</span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "20px", background: `${cat.color}15`, color: cat.color }}>{cat.label}</span>
                    {ev.status === "draft" && (
                      <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "20px", background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}>Draft</span>
                    )}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-foreground)", margin: "0 0 6px", lineHeight: 1.3 }}>{ev.title}</p>
                  <p style={{ fontSize: "12px", color: "var(--color-muted-foreground)", margin: 0, lineHeight: 1.5 }}>{ev.description}</p>
                </div>
                {(ev.location || ev.event_date) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {ev.location && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <MapPin style={{ width: 12, height: 12, color: "#a78bfa" }} />
                        <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", margin: 0 }}>{ev.location}</p>
                      </div>
                    )}
                    {ev.event_date && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Calendar style={{ width: 12, height: 12, color: "#60a5fa" }} />
                        <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", margin: 0 }}>{new Date(ev.event_date).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                      </div>
                    )}
                  </div>
                )}
                {isAdmin && ev.status === "draft" && (
                  <button onClick={async () => {
                    const token = localStorage.getItem("civicos_token");
                    await fetch(`${API_BASE}/smart-city/events/${ev.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ status: "published" }),
                    });
                    fetchData("Events");
                  }} style={{ padding: "8px", borderRadius: "8px", border: "1px solid rgba(52,211,153,0.3)", background: "rgba(52,211,153,0.08)", color: "#34d399", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                    Publish Event
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const tabContent: Record<string, () => any> = {
    "Overview": renderOverview,
    "Traffic": renderTraffic,
    "Transport": renderTransport,
    "Nearby": renderNearby,
    "Parking": renderParking,
    "Weather": renderWeather,
    "Events": renderEvents,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 6rem)", overflow: "hidden" }} className="-mx-6 -mb-6">

      {/* ── TOP HEADER ──────────────────────────────────────────── */}
      <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(139,92,246,0.1)", background: "linear-gradient(180deg,rgba(139,92,246,0.04) 0%,transparent 100%)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "11px", background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(139,92,246,0.35)", flexShrink: 0 }}>
            <Globe style={{ width: 18, height: 18, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "15px", fontWeight: 800, color: "var(--color-foreground)", margin: 0 }}>Smart City Portal</h1>
            <p style={{ fontSize: "10px", margin: 0, fontWeight: 600, color: "rgba(139,92,246,0.7)" }}>Nation-wide · AI-powered · Live data</p>
          </div>
          {/* Live pill */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "20px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", marginLeft: "4px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "block", animation: "ping 2s ease-out infinite" }} />
            <span style={{ fontSize: "10px", color: "#22c55e", fontWeight: 700 }}>Live</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {lastSync && <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)", fontFamily: "monospace" }}>Synced {lastSync.toLocaleTimeString("en-IN")}</span>}
          {/* City chip — click to change */}
          <button onClick={() => { if (!isOfficer) setShowCitySelector(true); }}
            style={{ display: "flex", alignItems: "center", gap: "7px", padding: "7px 14px", borderRadius: "10px", border: "1px solid rgba(139,92,246,0.25)", background: "rgba(139,92,246,0.08)", color: "var(--color-foreground)", fontSize: "13px", fontWeight: 700, cursor: isOfficer ? "default" : "pointer" }}>
            <MapPin style={{ width: 13, height: 13, color: "#a78bfa" }} />
            {city}
            {!isOfficer && <ChevronDown style={{ width: 12, height: 12, color: "var(--color-muted-foreground)" }} />}
          </button>
          {/* Role badge */}
          <span style={{ fontSize: "10px", fontWeight: 700, padding: "4px 10px", borderRadius: "20px", background: isAdmin ? "rgba(244,63,94,0.1)" : isOfficer ? "rgba(96,165,250,0.1)" : "rgba(52,211,153,0.1)", color: isAdmin ? "#f43f5e" : isOfficer ? "#60a5fa" : "#34d399", border: `1px solid ${isAdmin ? "rgba(244,63,94,0.2)" : isOfficer ? "rgba(96,165,250,0.2)" : "rgba(52,211,153,0.2)"}` }}>
            {isAdmin ? "Admin" : isOfficer ? "Officer" : "Citizen"}
          </span>
          <button onClick={() => fetchData()} style={{ width: "34px", height: "34px", borderRadius: "9px", border: "1px solid rgba(139,92,246,0.15)", background: "rgba(139,92,246,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw style={{ width: 13, height: 13, color: "#a78bfa" }} />
          </button>
        </div>
      </div>

      {/* ── TABS ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "2px", padding: "10px 24px 0", borderBottom: "1px solid rgba(139,92,246,0.08)", flexShrink: 0, overflowX: "auto" }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: "8px 16px", borderRadius: "10px 10px 0 0", border: "none", background: activeTab === tab ? "rgba(139,92,246,0.1)" : "transparent", color: activeTab === tab ? "#a78bfa" : "var(--color-muted-foreground)", fontSize: "12px", fontWeight: activeTab === tab ? 700 : 600, cursor: "pointer", borderBottom: activeTab === tab ? "2px solid #8b5cf6" : "2px solid transparent", transition: "all 0.15s", whiteSpace: "nowrap" }}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── CONTENT ───────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 28px" }}>
        {tabContent[activeTab]?.()}
      </div>

      {/* ── AI CHAT FAB ───────────────────────────────────────── */}
      <button onClick={() => setShowChat(s => !s)}
        style={{ position: "fixed", bottom: "24px", right: "24px", width: "56px", height: "56px", borderRadius: "18px", background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px rgba(139,92,246,0.45)", zIndex: 48, transition: "transform 0.2s" }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "scale(1.1)"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = "scale(1)"}>
        {showChat ? <X style={{ width: 22, height: 22, color: "white" }} /> : <Bot style={{ width: 22, height: 22, color: "white" }} />}
      </button>

      {/* AI Chat Panel */}
      {showChat && <AIChatPanel city={city} userRole={userInfo.role} onClose={() => setShowChat(false)} />}

      <style>{`
        @keyframes ping { 0%{transform:scale(1);opacity:1} 75%,100%{transform:scale(2);opacity:0} }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
      `}</style>
    </div>
  );
}
