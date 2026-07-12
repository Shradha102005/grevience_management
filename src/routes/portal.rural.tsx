import { useState, useRef, useCallback, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Sprout, Home, Briefcase, Droplets, GraduationCap, Users,
  Calculator, Loader2, RefreshCw, X, ArrowRight, ChevronDown,
  Mic, MicOff, Send, Sparkles, Volume2, VolumeX, Phone,
  CheckCircle2, BookOpen, Landmark, Wheat,
} from "lucide-react";
import { LanguageDropdown } from "@/components/portal/language-selector";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/rural")({
  head: () => ({ meta: [{ title: "Rural Development — CivicSaathi" }] }),
  component: Rural,
});

const API_BASE = "http://localhost:8000";

const SPEECH_LANG: Record<string, string> = {
  en: "en-IN", hi: "hi-IN", te: "te-IN", ta: "ta-IN",
  kn: "kn-IN", ml: "ml-IN", mr: "mr-IN", bn: "bn-IN",
};

const LANG_PLACEHOLDER: Record<string, string> = {
  en: "Type or speak your question…",
  hi: "अपना प्रश्न लिखें या बोलें…",
  te: "మీ ప్రశ్న టైప్ చేయండి…",
  ta: "உங்கள் கேள்வியை தட்டச்சு செய்யுங்கள்…",
  kn: "ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಟೈಪ್ ಮಾಡಿ…",
  ml: "നിങ്ങളുടെ ചോദ്യം ടൈപ്പ് ചെയ്യൂ…",
  mr: "आपला प्रश्न टाइप करा…",
  bn: "আপনার প্রশ্ন টাইপ করুন…",
};

const SUGGESTIONS = [
  "How do I apply for MGNREGA job card?",
  "PM Awas Yojana eligibility criteria",
  "SHG loan process for women",
  "Skill training centres near me",
  "Jal Jeevan Mission water connection",
  "PM-KISAN subsidy amount",
];

interface Msg  { role: "user" | "bot"; text: string; }
interface Program {
  id: string; name: string; category: string; description: string;
  benefit: string; how_to_apply: string; contact: string; helpline: string;
}

// ── category styling ─────────────────────────────────────────────────────────
const CAT_CFG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  employment:     { icon: Briefcase,     color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
  housing:        { icon: Home,          color: "#60a5fa", bg: "rgba(96,165,250,0.12)"  },
  water:          { icon: Droplets,      color: "#22d3ee", bg: "rgba(34,211,238,0.12)"  },
  finance:        { icon: Users,         color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
  skills:         { icon: GraduationCap, color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  infrastructure: { icon: Landmark,      color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
};
const getCatCfg = (cat: string) => CAT_CFG[cat.toLowerCase()] ?? { icon: Sprout, color: "#4ade80", bg: "rgba(74,222,128,0.12)" };

// ── Program card (drawer item) ────────────────────────────────────────────────
function ProgramCard({ p, onAsk }: { p: Program; onAsk: (q: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = getCatCfg(p.category);
  const Icon = cfg.icon;
  return (
    <div style={{
      background: "var(--color-card)", borderRadius: "14px",
      border: "1px solid rgba(139,92,246,0.1)",
      overflow: "hidden", transition: "all 0.2s",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${cfg.color}44`; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${cfg.color}18`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.1)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
      {/* Top accent */}
      <div style={{ height: "3px", background: cfg.color, opacity: 0.7 }} />

      <div style={{ padding: "14px 16px" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: cfg.bg, border: `1px solid ${cfg.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon style={{ width: 16, height: 16, color: cfg.color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-foreground)", marginBottom: "3px", lineHeight: 1.3 }}>{p.name}</p>
            <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>{p.category}</span>
          </div>
          <button onClick={() => setExpanded(x => !x)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--color-muted-foreground)", flexShrink: 0 }}>
            <ChevronDown style={{ width: 14, height: 14, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </button>
        </div>

        <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", lineHeight: 1.5, marginBottom: expanded ? "12px" : 0, display: "-webkit-box", WebkitLineClamp: expanded ? 999 : 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {p.description}
        </p>

        {expanded && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ padding: "10px 12px", background: "rgba(139,92,246,0.05)", borderRadius: "9px", border: "1px solid rgba(139,92,246,0.1)" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, color: "#a78bfa", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Benefit</p>
              <p style={{ fontSize: "11px", color: "var(--color-foreground)", lineHeight: 1.5 }}>{p.benefit}</p>
            </div>
            <div style={{ padding: "10px 12px", background: `${cfg.color}09`, borderRadius: "9px", border: `1px solid ${cfg.color}20` }}>
              <p style={{ fontSize: "10px", fontWeight: 700, color: cfg.color, marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>How to Apply</p>
              <p style={{ fontSize: "11px", color: "var(--color-foreground)", lineHeight: 1.5 }}>{p.how_to_apply}</p>
            </div>
            {p.helpline && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 10px", background: "rgba(52,211,153,0.06)", borderRadius: "8px", border: "1px solid rgba(52,211,153,0.15)" }}>
                <Phone style={{ width: 12, height: 12, color: "#34d399" }} />
                <span style={{ fontSize: "11px", color: "var(--color-foreground)", fontWeight: 600 }}>Helpline: {p.helpline}</span>
              </div>
            )}
            <button onClick={() => onAsk(`Tell me more about ${p.name}`)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px 14px", borderRadius: "9px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "#a78bfa", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
              <Sparkles style={{ width: 12, height: 12 }} />Ask AI about this
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Programs Drawer ───────────────────────────────────────────────────────────
function ProgramsDrawer({ programs, loading, onRefresh, onAsk, onClose }: {
  programs: Program[]; loading: boolean; onRefresh: () => void;
  onAsk: (q: string) => void; onClose: () => void;
}) {
  const [filter, setFilter] = useState("all");
  const cats = ["all", ...Array.from(new Set(programs.map(p => p.category.toLowerCase())))];
  const filtered = filter === "all" ? programs : programs.filter(p => p.category.toLowerCase() === filter);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 40, animation: "fadeIn 0.2s ease" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(520px, 52vw)",
        background: "var(--color-background)", borderLeft: "1px solid rgba(139,92,246,0.15)",
        boxShadow: "-20px 0 60px rgba(139,92,246,0.1)", zIndex: 50,
        display: "flex", flexDirection: "column", animation: "slideIn 0.25s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* Drawer header */}
        <div style={{ padding: "20px 22px", borderBottom: "1px solid rgba(139,92,246,0.1)", background: "linear-gradient(180deg,rgba(139,92,246,0.05) 0%,transparent 100%)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg,#4ade80,#22c55e)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sprout style={{ width: 18, height: 18, color: "white" }} />
              </div>
              <div>
                <h2 style={{ fontSize: "15px", fontWeight: 800, color: "var(--color-foreground)", margin: 0 }}>Rural Programs</h2>
                <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", margin: 0 }}>{programs.length} active schemes</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={onRefresh}
                style={{ width: "32px", height: "32px", borderRadius: "9px", border: "1px solid rgba(139,92,246,0.15)", background: "rgba(139,92,246,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RefreshCw style={{ width: 13, height: 13, color: "#a78bfa" }} className={loading ? "animate-spin" : ""} />
              </button>
              <button onClick={onClose}
                style={{ width: "32px", height: "32px", borderRadius: "9px", border: "1px solid rgba(139,92,246,0.15)", background: "rgba(139,92,246,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X style={{ width: 13, height: 13, color: "var(--color-muted-foreground)" }} />
              </button>
            </div>
          </div>
          {/* Category filter pills */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {cats.map(c => {
              const cfg = getCatCfg(c);
              return (
                <button key={c} onClick={() => setFilter(c)}
                  style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, cursor: "pointer", textTransform: "capitalize", border: `1px solid ${filter === c ? (c === "all" ? "#a78bfa44" : cfg.color + "44") : "rgba(139,92,246,0.12)"}`, background: filter === c ? (c === "all" ? "rgba(139,92,246,0.12)" : cfg.bg) : "transparent", color: filter === c ? (c === "all" ? "#a78bfa" : cfg.color) : "var(--color-muted-foreground)" }}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Programs list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <Loader2 style={{ width: 24, height: 24, color: "#a78bfa" }} className="animate-spin" />
            </div>
          ) : filtered.map(p => (
            <ProgramCard key={p.id} p={p} onAsk={q => { onAsk(q); onClose(); }} />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes slideIn { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
      `}</style>
    </>
  );
}

// ── Subsidy calculator popover ────────────────────────────────────────────────
function SubsidyCalc({ onClose }: { onClose: () => void }) {
  const [acres, setAcres] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const calc = () => {
    const a = parseFloat(acres);
    if (!a || a <= 0) { toast.error("Enter a valid land size"); return; }
    const pkisan = 6000, fasal = Math.round(a * 1200), total = pkisan + fasal;
    setResult(`PM-KISAN: ₹${pkisan.toLocaleString()}/yr  +  Fasal Bima est.: ₹${fasal.toLocaleString()}  =  ₹${total.toLocaleString()}/year`);
  };
  return (
    <div style={{
      position: "absolute", bottom: "60px", left: "50%", transform: "translateX(-50%)",
      width: "320px", background: "var(--color-card)", borderRadius: "16px",
      border: "1px solid rgba(139,92,246,0.2)", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      padding: "18px 20px", zIndex: 30, animation: "fadeIn 0.2s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <Calculator style={{ width: 15, height: 15, color: "#a78bfa" }} />
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-foreground)" }}>Subsidy Estimator</span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted-foreground)" }}>
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>
      <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", marginBottom: "10px" }}>Enter your land size to estimate annual subsidies</p>
      <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
        <input type="number" placeholder="Land in acres…" value={acres} onChange={e => setAcres(e.target.value)}
          style={{ flex: 1, height: "36px", padding: "0 10px", borderRadius: "9px", border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.04)", color: "var(--color-foreground)", fontSize: "13px", outline: "none" }} />
        <button onClick={calc}
          style={{ padding: "0 16px", height: "36px", borderRadius: "9px", background: "linear-gradient(135deg,#8b5cf6,#7c3aed)", color: "white", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}>
          Estimate
        </button>
      </div>
      {result && (
        <div style={{ padding: "10px 12px", background: "rgba(52,211,153,0.1)", borderRadius: "9px", border: "1px solid rgba(52,211,153,0.25)", fontSize: "12px", color: "var(--color-foreground)", lineHeight: 1.5, fontWeight: 600 }}>
          <CheckCircle2 style={{ width: 12, height: 12, color: "#34d399", display: "inline", marginRight: "5px" }} />{result}
        </div>
      )}
    </div>
  );
}

// ── Main Rural component ──────────────────────────────────────────────────────
function Rural() {
  const [language, setLanguage]         = useState("en");
  const [messages, setMessages]         = useState<Msg[]>([{ role: "bot", text: "नमस्ते! I'm your Rural Development Assistant. Ask me about MGNREGA, PM Awas, SHG loans, subsidies, or any village welfare scheme." }]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [isListening, setIsListening]   = useState(false);
  const [isSpeaking, setIsSpeaking]     = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [programs, setPrograms]         = useState<Program[]>([]);
  const [progLoading, setProgLoading]   = useState(true);
  const [showPrograms, setShowPrograms] = useState(false);
  const [showCalc, setShowCalc]         = useState(false);
  const [msgCount, setMsgCount]         = useState(0);

  const scrollRef    = useRef<HTMLDivElement>(null);
  const recognRef    = useRef<InstanceType<typeof SpeechRecognition> | null>(null);
  const historyRef   = useRef<{ role: string; content: string }[]>([]);

  // ── fetch programs ──
  const fetchPrograms = useCallback(async () => {
    setProgLoading(true);
    try {
      const r = await fetch(`${API_BASE}/live/rural-programs`);
      if (r.ok) { const d = await r.json(); setPrograms(d.programs ?? []); }
    } catch {} finally { setProgLoading(false); }
  }, []);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  // ── auto-scroll ──
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, loading]);

  // ── history sync ──
  useEffect(() => {
    historyRef.current = messages.map(m => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text }));
  }, [messages]);

  // ── speak ──
  const speakText = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH_LANG[language] ?? "en-IN"; u.rate = 0.95;
    u.onstart = () => setIsSpeaking(true); u.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u);
  }, [voiceEnabled, language]);

  // ── send message ──
  const sendMessage = useCallback(async (text: string) => {
    const q = text.trim(); if (!q || loading) return;
    setMessages(m => [...m, { role: "user", text: q }]);
    setInput(""); setLoading(true); setMsgCount(c => c + 1);
    try {
      const r = await fetch(`${API_BASE}/ai/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: "rural", message: q, language, history: historyRef.current.slice(-10) }),
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      const reply = d.reply ?? "Sorry, I couldn't get a response.";
      setMessages(m => [...m, { role: "bot", text: reply }]);
      speakText(reply);
    } catch {
      setMessages(m => [...m, { role: "bot", text: "I'm having trouble connecting. Please check your connection and try again." }]);
    } finally { setLoading(false); }
  }, [loading, language, speakText]);

  // ── voice input ──
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error("Voice requires Chrome or Edge browser."); return; }
    const r = new SR(); r.lang = SPEECH_LANG[language] ?? "en-IN";
    r.onstart = () => setIsListening(true); r.onend = () => setIsListening(false);
    r.onerror = () => setIsListening(false);
    r.onresult = (e: SpeechRecognitionEvent) => { const t = e.results[0][0].transcript; setInput(t); sendMessage(t); };
    recognRef.current = r; r.start();
  }, [language, sendMessage]);
  const stopListening  = () => { recognRef.current?.stop(); setIsListening(false); };
  const toggleVoice    = () => { if (isSpeaking) window.speechSynthesis?.cancel(); setVoiceEnabled(v => !v); setIsSpeaking(false); };

  const okCount    = programs.filter(p => p.category).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 6rem)", overflow: "hidden" }}
      className="-mx-6 -mb-6">

      {/* ── TOP HEADER ─────────────────────────────────────────── */}
      <div style={{ padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(139,92,246,0.1)", background: "linear-gradient(180deg,rgba(74,222,128,0.04) 0%,transparent 100%)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg,#4ade80,#22c55e)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(74,222,128,0.35)", flexShrink: 0 }}>
            <Sprout className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-foreground)", margin: 0 }}>Rural Development Bot</h1>
            <p style={{ fontSize: "11px", margin: 0, fontWeight: 600, color: "rgba(74,222,128,0.7)" }}>ग्रामीण सहायक · Multilingual AI Assistant</p>
          </div>
          {/* Online indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "20px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", marginLeft: "6px" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e", display: "block", boxShadow: "0 0 8px rgba(34,197,94,0.7)", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: "11px", color: "#22c55e", fontWeight: 700 }}>Online</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Language selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <span style={{ fontSize: "11px", color: "var(--color-muted-foreground)", fontWeight: 600 }}>भाषा:</span>
            <LanguageDropdown value={language} onChange={setLanguage} className="h-8 text-xs" />
          </div>
          {/* Programs button */}
          <button onClick={() => setShowPrograms(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", height: "36px", borderRadius: "10px", border: "1px solid rgba(74,222,128,0.25)", background: "rgba(74,222,128,0.08)", color: "#4ade80", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
            <BookOpen style={{ width: 14, height: 14 }} />Programs <span style={{ background: "rgba(74,222,128,0.2)", borderRadius: "10px", padding: "1px 6px", fontSize: "11px" }}>{programs.length}</span>
          </button>
        </div>
      </div>

      {/* ── STAT CHIPS ─────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "10px", padding: "14px 28px", flexShrink: 0, borderBottom: "1px solid rgba(139,92,246,0.06)" }}>
        {[
          { icon: Wheat,         label: "Active Programs",   value: programs.length,  color: "#4ade80" },
          { icon: Briefcase,     label: "Employment",        value: programs.filter(p => p.category.toLowerCase() === "employment").length, color: "#34d399" },
          { icon: Home,          label: "Housing",           value: programs.filter(p => p.category.toLowerCase() === "housing").length,    color: "#60a5fa" },
          { icon: Users,         label: "Finance / SHG",     value: programs.filter(p => p.category.toLowerCase() === "finance").length,    color: "#f472b6" },
          { icon: Sparkles,      label: "Queries Answered",  value: msgCount,          color: "#a78bfa" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{ flex: 1, padding: "12px 16px", borderRadius: "12px", background: "var(--color-card)", border: "1px solid rgba(139,92,246,0.08)", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: `${color}12`, border: `1px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon style={{ width: 15, height: 15, color }} />
            </div>
            <div>
              <p style={{ fontSize: "18px", fontWeight: 800, color, lineHeight: 1, margin: 0 }}>{value}</p>
              <p style={{ fontSize: "10px", color: "var(--color-muted-foreground)", margin: 0, fontWeight: 600, marginTop: "2px" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── CHAT AREA ──────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Messages */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 28px", display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Quick suggestions (shown at start) */}
          {messages.length <= 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Suggested questions</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => sendMessage(s)} disabled={loading}
                    style={{ padding: "6px 14px", borderRadius: "20px", border: "1px solid rgba(139,92,246,0.18)", background: "rgba(139,92,246,0.06)", color: "var(--color-muted-foreground)", fontSize: "11px", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.12)"; (e.currentTarget as HTMLElement).style.color = "#a78bfa"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.06)"; (e.currentTarget as HTMLElement).style.color = "var(--color-muted-foreground)"; }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: "10px", alignItems: "flex-end" }}>
              {m.role === "bot" && (
                <div style={{ width: "30px", height: "30px", borderRadius: "9px", background: "linear-gradient(135deg,#4ade80,#22c55e)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: "2px" }}>
                  <Sprout style={{ width: 14, height: 14, color: "white" }} />
                </div>
              )}
              <div style={{
                maxWidth: "72%", padding: "11px 16px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: m.role === "user"
                  ? "linear-gradient(135deg,#8b5cf6,#7c3aed)"
                  : "var(--color-card)",
                border: m.role === "user" ? "none" : "1px solid rgba(139,92,246,0.1)",
                color: m.role === "user" ? "white" : "var(--color-foreground)",
                fontSize: "13px", lineHeight: 1.6, fontWeight: m.role === "user" ? 500 : 400,
                boxShadow: m.role === "user" ? "0 4px 16px rgba(139,92,246,0.25)" : "none",
                animation: "fadeInMsg 0.25s ease",
              }}>{m.text}</div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
              <div style={{ width: "30px", height: "30px", borderRadius: "9px", background: "linear-gradient(135deg,#4ade80,#22c55e)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Sprout style={{ width: 14, height: 14, color: "white" }} />
              </div>
              <div style={{ padding: "12px 16px", borderRadius: "18px 18px 18px 4px", background: "var(--color-card)", border: "1px solid rgba(139,92,246,0.1)", display: "flex", gap: "4px", alignItems: "center" }}>
                {[0,150,300].map((d,i) => (
                  <span key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#a78bfa", animation: "bounce 1.2s ease infinite", animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── INPUT BAR ────────────────────────────────────────── */}
        <div style={{ padding: "14px 28px 20px", borderTop: "1px solid rgba(139,92,246,0.08)", background: "linear-gradient(0deg,rgba(139,92,246,0.02) 0%,transparent 100%)", position: "relative", flexShrink: 0 }}>
          {showCalc && <SubsidyCalc onClose={() => setShowCalc(false)} />}

          <form onSubmit={e => { e.preventDefault(); sendMessage(input); }}
            style={{ display: "flex", gap: "10px", alignItems: "center" }}>

            {/* Subsidy calc button */}
            <button type="button" onClick={() => setShowCalc(c => !c)}
              title="Subsidy Calculator"
              style={{ width: "40px", height: "40px", borderRadius: "12px", border: `1px solid ${showCalc ? "rgba(139,92,246,0.4)" : "rgba(139,92,246,0.15)"}`, background: showCalc ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
              <Calculator style={{ width: 16, height: 16, color: "#a78bfa" }} />
            </button>

            {/* Text input */}
            <div style={{ flex: 1, position: "relative" }}>
              <input
                value={input} onChange={e => setInput(e.target.value)}
                placeholder={isListening ? "Listening…" : LANG_PLACEHOLDER[language] ?? "Type your question…"}
                disabled={loading || isListening}
                style={{ width: "100%", height: "44px", padding: "0 14px", borderRadius: "13px", border: "1px solid rgba(139,92,246,0.2)", background: "var(--color-card)", color: "var(--color-foreground)", fontSize: "13px", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
                onFocus={e => (e.target as HTMLInputElement).style.borderColor = "rgba(139,92,246,0.5)"}
                onBlur={e  => (e.target as HTMLInputElement).style.borderColor = "rgba(139,92,246,0.2)"}
              />
            </div>

            {/* Voice button */}
            <button type="button" onClick={isListening ? stopListening : startListening}
              style={{ width: "44px", height: "44px", borderRadius: "13px", border: `1px solid ${isListening ? "rgba(244,63,94,0.3)" : "rgba(139,92,246,0.15)"}`, background: isListening ? "rgba(244,63,94,0.1)" : "rgba(139,92,246,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
              {isListening
                ? <MicOff style={{ width: 17, height: 17, color: "#f43f5e" }} />
                : <Mic     style={{ width: 17, height: 17, color: "#a78bfa" }} />}
            </button>

            {/* Voice output toggle */}
            <button type="button" onClick={toggleVoice}
              style={{ width: "44px", height: "44px", borderRadius: "13px", border: "1px solid rgba(139,92,246,0.15)", background: "rgba(139,92,246,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {voiceEnabled
                ? <Volume2  style={{ width: 16, height: 16, color: isSpeaking ? "#a78bfa" : "rgba(139,92,246,0.5)" }} />
                : <VolumeX  style={{ width: 16, height: 16, color: "var(--color-muted-foreground)" }} />}
            </button>

            {/* Send */}
            <button type="submit" disabled={loading || !input.trim()}
              style={{ width: "44px", height: "44px", borderRadius: "13px", background: input.trim() && !loading ? "linear-gradient(135deg,#8b5cf6,#7c3aed)" : "rgba(139,92,246,0.1)", border: "none", cursor: input.trim() && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s", boxShadow: input.trim() && !loading ? "0 4px 16px rgba(139,92,246,0.3)" : "none" }}>
              {loading ? <Loader2 style={{ width: 17, height: 17, color: "#a78bfa" }} className="animate-spin" /> : <Send style={{ width: 16, height: 16, color: input.trim() ? "white" : "rgba(139,92,246,0.4)" }} />}
            </button>
          </form>
        </div>
      </div>

      {/* ── PROGRAMS DRAWER ──────────────────────────────────────── */}
      {showPrograms && (
        <ProgramsDrawer programs={programs} loading={progLoading} onRefresh={fetchPrograms}
          onAsk={q => { sendMessage(q); }} onClose={() => setShowPrograms(false)} />
      )}

      <style>{`
        @keyframes fadeInMsg { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bounce    { 0%,80%,100%{transform:scale(0.6)} 40%{transform:scale(1)} }
      `}</style>
    </div>
  );
}
