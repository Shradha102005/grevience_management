import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Inbox, Clock, CheckCircle2,
  Send, Search, Plus, X, Loader2, RefreshCw,
  Phone, Globe, Mail, Smartphone, Zap, AlertCircle,
  Headphones, Sparkles, MessageSquare, ArrowRight,
  Mic, MicOff, Trash2, TicketIcon, ChevronDown,
  Volume2, StopCircle, TrendingUp, BarChart3, Users, Activity,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/portal/helpline")({
  component: Helpline,
});

const API_BASE = "http://localhost:8000";

//  Types 
interface Message {
  sender: string; sender_type: "user" | "agent"; text: string; time: string;
}
interface Ticket {
  ticket_id: string; subject: string; query: string; requester_name: string;
  priority: string; channel: string; status: string; created_at: string;
  updated_at: string; expected_response: string; messages: Message[];
}
interface Counts { Open: number; Pending: number; Resolved: number; All: number; }
interface BotMessage {
  role: "user" | "assistant";
  content: string;
  ts: number;
  isVoice?: boolean;           // true if this message came from mic input
  resolved?: boolean;          // from AI response  false triggers escalation
  suggestedReplies?: string[]; // quick-reply chips shown below the bot bubble
}

interface HelplineStats {
  total_tickets: number;
  open_tickets: number;
  pending_tickets: number;
  resolved_tickets: number;
  today_tickets: number;
  week_tickets: number;
  resolution_rate: number;
  channel_breakdown: Record<string, number>;
  priority_breakdown: Record<string, number>;
  top_topics: { topic: string; count: number }[];
}

//  Language config 
const LANGUAGES: { code: string; label: string; native: string; greeting: string; placeholder: string; quickPrompts: string[] }[] = [
  {
    code: "en", label: "English", native: "EN",
    greeting: "Hello! I'm your AI Helpline Assistant. I can help you with government services, certificates, schemes, and more. What can I help you with today?",
    placeholder: "Type your question…",
    quickPrompts: ["How do I get a birth certificate?", "Ration card renewal process", "Property tax payment help", "Aadhaar update procedure"],
  },
  {
    code: "hi", label: "Hindi", native: "हिं",
    greeting: "नमस्ते! मैं आपका AI हेल्पलाइन सहायक हूँ। मैं सरकारी सेवाओं, प्रमाणपत्रों, योजनाओं और अन्य विषयों में आपकी मदद कर सकता हूँ। आज आप क्या जानना चाहते हैं?",
    placeholder: "अपना प्रश्न टाइप करें…",
    quickPrompts: ["जन्म प्रमाण पत्र कैसे बनवाएं?", "राशन कार्ड नवीनीकरण", "संपत्ति कर भुगतान", "आधार अपडेट प्रक्रिया"],
  },
  {
    code: "te", label: "Telugu", native: "తె",
    greeting: "నమస్కారం! నేను మీ AI హెల్ప్‌లైన్ అసిస్టెంట్‌ని. ప్రభుత్వ సేవలు, సర్టిఫికెట్లు, పథకాలు మరియు ఇతర విషయాలలో నేను మీకు సహాయం చేయగలను. ఈరోజు మీకు ఏమి కావాలి?",
    placeholder: "మీ ప్రశ్న టైప్ చేయండి…",
    quickPrompts: ["జన్మ ధృవీకరణ పత్రం ఎలా పొందాలి?", "రేషన్ కార్డు నవీకరణ", "ఆస్తి పన్ను చెల్లింపు", "ఆధార్ నవీకరణ విధానం"],
  },
  {
    code: "ta", label: "Tamil", native: "த",
    greeting: "வணக்கம்! நான் உங்கள் AI ஹெல்ப்லைன் உதவியாளர். அரசு சேவைகள், சான்றிதழ்கள், திட்டங்கள் மற்றும் பலவற்றில் உதவ முடியும். இன்று என்ன தேவை?",
    placeholder: "உங்கள் கேள்வியை தட்டச்சு செய்யுங்கள்…",
    quickPrompts: ["பிறப்பு சான்றிதழ் எப்படி பெறுவது?", "ரேஷன் கார்டு புதுப்பிப்பு", "சொத்து வரி செலுத்தல்", "ஆதார் புதுப்பிப்பு"],
  },
  {
    code: "kn", label: "Kannada", native: "ಕ",
    greeting: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ AI ಹೆಲ್ಪ್‌ಲೈನ್ ಸಹಾಯಕ. ಸರ್ಕಾರಿ ಸೇವೆಗಳು, ಪ್ರಮಾಣ ಪತ್ರಗಳು ಮತ್ತು ಯೋಜನೆಗಳ ಬಗ್ಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ಇಂದು ಏನು ಬೇಕು?",
    placeholder: "ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಟೈಪ್ ಮಾಡಿ…",
    quickPrompts: ["ಜನನ ಪ್ರಮಾಣ ಪತ್ರ ಹೇಗೆ ಪಡೆಯಬೇಕು?", "ರೇಷನ್ ಕಾರ್ಡ್ ನವೀಕರಣ", "ಆಸ್ತಿ ತೆರಿಗೆ ಪಾವತಿ", "ಆಧಾರ್ ನವೀಕರಣ"],
  },
  {
    code: "ml", label: "Malayalam", native: "മ",
    greeting: "നമസ്കാരം! ഞാൻ നിങ്ങളുടെ AI ഹെൽപ്‌ലൈൻ അസിസ്റ്റന്റ് ആണ്. സർക്കാർ സേവനങ്ങൾ, സർട്ടിഫിക്കറ്റുകൾ, പദ്ധതികൾ എന്നിവയിൽ സഹായിക്കാൻ കഴിയും. ഇന്ന് എന്ത് സഹായം വേണം?",
    placeholder: "നിങ്ങളുടെ ചോദ്യം ടൈപ്പ് ചെയ്യൂ…",
    quickPrompts: ["ജനന സർട്ടിഫിക്കറ്റ് എങ്ങനെ ലഭിക്കും?", "റേഷൻ കാർഡ് പുതുക്കൽ", "ഭൂനികുതി അടയ്ക്കൽ", "ആധാർ അപ്ഡേറ്റ്"],
  },
  {
    code: "mr", label: "Marathi", native: "म",
    greeting: "नमस्कार! मी तुमचा AI हेल्पलाइन सहाय्यक आहे. सरकारी सेवा, प्रमाणपत्रे, योजना यांबद्दल मदत करू शकतो. आज तुम्हाला काय हवे आहे?",
    placeholder: "तुमचा प्रश्न टाइप करा…",
    quickPrompts: ["जन्म दाखला कसा मिळवायचा?", "रेशन कार्ड नूतनीकरण", "मालमत्ता कर भरणा", "आधार अद्यतन प्रक्रिया"],
  },
  {
    code: "bn", label: "Bengali", native: "বাং",
    greeting: "নমস্কার! আমি আপনার AI হেল্পলাইন সহকারী। সরকারি সেবা, সার্টিফিকেট, প্রকল্প ইত্যাদিতে সাহায্য করতে পারি। আজ কীভাবে সাহায্য করব?",
    placeholder: "আপনার প্রশ্ন টাইপ করুন…",
    quickPrompts: ["জন্ম সনদ কীভাবে পাব?", "রেশন কার্ড নবায়ন", "সম্পত্তি কর পরিশোধ", "আধার আপডেট পদ্ধতি"],
  },
];

//  Helpers 
function relativeTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function initials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

const PRIORITY_CONFIG: Record<string, { dot: string; gradient: string; label: string }> = {
  Critical: { dot: "#f43f5e", gradient: "linear-gradient(135deg,#f43f5e22,#e1134222)", label: "Critical" },
  High:     { dot: "#fb923c", gradient: "linear-gradient(135deg,#fb923c22,#ea580c22)", label: "High" },
  Normal:   { dot: "#818cf8", gradient: "linear-gradient(135deg,#818cf822,#6366f122)", label: "Normal" },
  Low:      { dot: "#94a3b8", gradient: "linear-gradient(135deg,#94a3b822,#64748b22)", label: "Low" },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; glow: string; icon: React.ReactNode; label: string }> = {
  Open:     { color: "#a78bfa", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)",  glow: "rgba(139,92,246,0.25)", icon: <AlertCircle  style={{ width: 11, height: 11 }} />, label: "Open" },
  Pending:  { color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)",  glow: "rgba(251,191,36,0.2)",  icon: <Clock        style={{ width: 11, height: 11 }} />, label: "Pending" },
  Resolved: { color: "#34d399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.3)",  glow: "rgba(52,211,153,0.2)",  icon: <CheckCircle2 style={{ width: 11, height: 11 }} />, label: "Resolved" },
};

const CHANNEL_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  Phone: { icon: <Phone      style={{ width: 12, height: 12 }} />, color: "#a78bfa" },
  Web:   { icon: <Globe      style={{ width: 12, height: 12 }} />, color: "#60a5fa" },
  Email: { icon: <Mail       style={{ width: 12, height: 12 }} />, color: "#22d3ee" },
  App:   { icon: <Smartphone style={{ width: 12, height: 12 }} />, color: "#818cf8" },
};

const MACROS = [
  { label: "Request Aadhaar",  emoji: "🪪", text: "Could you please share the last 4 digits of your Aadhaar for verification?" },
  { label: "Link to Portal",   emoji: "🔗", text: "You can complete this at: https://civicos.gov.in/services" },
  { label: "Escalate to L2",   emoji: "⬆️", text: "Escalating to Level 2 support. They will contact you within 2 hours." },
  { label: "Close Ticket",     emoji: "✅", text: "This issue has been resolved. Closing ticket. Have a great day!" },
  { label: "Need More Info",   emoji: "📋", text: "To help you better, could you please provide more details about your issue?" },
  { label: "MeeSeva Link",     emoji: "🏛️", text: "Please visit your nearest MeeSeva centre or portal.meeseva.telangana.gov.in to complete this process." },
];

//  Animated AI Orb 
type OrbState = "idle" | "listening" | "thinking" | "speaking";

// Holographic multi-ring sphere  static rings, pulsing core
function AIOrb({ state }: { state: OrbState }) {
  const C = {
    idle:      { c1: "#38bdf8", c2: "#818cf8", c3: "#22d3ee", glow: "rgba(56,189,248,0.22)", nodeBig: "#ffffff", nodeSmall: "#38bdf8", core: "rgba(20,60,120,0.7)"  },
    listening: { c1: "#22d3ee", c2: "#38bdf8", c3: "#38bdf8", glow: "rgba(56,189,248,0.50)", nodeBig: "#22d3ee", nodeSmall: "#38bdf8", core: "rgba(15,50,100,0.85)" },
    thinking:  { c1: "#38bdf8", c2: "#60c8fa", c3: "#22d3ee", glow: "rgba(56,189,248,0.45)", nodeBig: "#38bdf8", nodeSmall: "#22d3ee", core: "rgba(10,40,100,0.85)"  },
    speaking:  { c1: "#38bdf8", c2: "#22d3ee", c3: "#60c8fa", glow: "rgba(56,189,248,0.55)", nodeBig: "#38bdf8", nodeSmall: "#22d3ee", core: "rgba(10,40,80,0.85)"  },
  };
  const col = C[state];



  // Heartbeat animation on the WHOLE orb  faster
  const orbAnim =
    state === "listening" ? "orbHeartbeat 1.4s ease-in-out infinite" :
    state === "speaking"  ? "orbHeartbeat 1.0s ease-in-out infinite" :
    state === "thinking"  ? "orbIdle 2s ease-in-out infinite" :
    "orbIdle 4s ease-in-out infinite";

  return (
    // Outer shell  fixed size, background matches panel so PNG dark areas vanish
    <div style={{
      position: "relative", width: "220px", height: "220px",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "transparent",
    }}>
      {/* Inner orb  entire image heartbeat-pulses as one */}
      <div style={{
        position: "relative", width: "220px", height: "220px",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "transparent",
        animation: orbAnim,
        transformOrigin: "center center",
      }}>
        {/* The orb image: lighten blend makes anything darker than panel bg invisible */}
        <img
          src="/ai-orb.png"
          alt="AI orb"
          style={{
            width: "100%", height: "100%",
            objectFit: "contain",
            mixBlendMode: "screen",
            WebkitMaskImage: "radial-gradient(ellipse 90% 90% at 50% 50%, black 45%, rgba(0,0,0,0.6) 60%, transparent 76%)",
            maskImage: "radial-gradient(ellipse 90% 90% at 50% 50%, black 45%, rgba(0,0,0,0.6) 60%, transparent 76%)",
            filter: "brightness(1.15) saturate(1.25) contrast(1.1)",
            transition: "filter 0.5s ease",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />

        {/* Overlay glow that pulses with state */}
        <div style={{
          position: "absolute", inset: "30px", borderRadius: "50%",
          background: `radial-gradient(circle, ${col.glow} 0%, transparent 65%)`,
          opacity: state === "idle" ? 0.3 : 0.55,
          transition: "opacity 0.5s ease",
          pointerEvents: "none",
        }} />



      </div>
    </div>
  );
}



//  Bot Chat Bubble 
function BotBubble({
  msg, isBot, userName, onSuggestedReply,
}: {
  msg: BotMessage;
  isBot: boolean;
  userName: string;
  onSuggestedReply: (text: string) => void;
}) {
  const timeStr = new Date(msg.ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: isBot ? "flex-start" : "flex-end",
      gap: "4px",
      animation: "bubbleIn 0.3s cubic-bezier(0.16,1,0.3,1)",
    }}>
      {/* Name + time */}
      <div style={{
        display: "flex", alignItems: "center", gap: "6px",
        paddingLeft: isBot ? "36px" : "0",
        paddingRight: isBot ? "0" : "36px",
      }}>
        <span style={{
          fontSize: "14px", fontWeight: 700,
          color: isBot ? "rgba(56,189,248,0.75)" : "rgba(167,139,250,0.85)",
        }}>
          {isBot ? "CivicSaathi" : (userName || "You")}
        </span>
        <span style={{ fontSize: "14px", color: "rgba(100,116,139,0.5)" }}>{timeStr}</span>
        {msg.isVoice && !isBot && (
          <span style={{
            fontSize: "8px", padding: "1px 5px", borderRadius: "8px",
            background: "rgba(34,211,238,0.1)", color: "rgba(34,211,238,0.7)",
            border: "1px solid rgba(34,211,238,0.2)",
          }}>🎤 voice</span>
        )}
      </div>

      {/* Avatar + bubble */}
      <div style={{
        display: "flex", flexDirection: isBot ? "row" : "row-reverse",
        gap: "8px", alignItems: "flex-end",
      }}>
        {/* Avatar */}
        {isBot ? (
          <div style={{
            width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg,#38bdf8,#818cf8)",
            border: "1px solid rgba(56,189,248,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 10px rgba(56,189,248,0.3)",
          }}>
            <Sparkles style={{ width: 12, height: 12, color: "white" }} />
          </div>
        ) : (
          <div style={{
            width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg,#8b5cf6,#6366f1)",
            border: "1px solid rgba(139,92,246,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 10px rgba(139,92,246,0.35)",
            fontSize: "14px", fontWeight: 800, color: "white",
          }}>
            {(userName || "Y").slice(0, 1).toUpperCase()}
          </div>
        )}

        {/* Bubble */}
        <div style={{
          maxWidth: "75%",
          padding: "10px 14px",
          borderRadius: isBot ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
          fontSize: "14px", lineHeight: 1.65,
          background: isBot
            ? "linear-gradient(135deg,rgba(56,189,248,0.14),rgba(129,140,248,0.10))"
            : "linear-gradient(135deg,rgba(139,92,246,0.28),rgba(99,102,241,0.18))",
          border: isBot
            ? "1px solid rgba(56,189,248,0.25)"
            : "1px solid rgba(139,92,246,0.4)",
          color: "white",
          wordBreak: "break-word",
          boxShadow: isBot
            ? "0 2px 12px rgba(56,189,248,0.08)"
            : "0 2px 12px rgba(139,92,246,0.18)",
        }}>
          <span style={{ display: "block", whiteSpace: "pre-wrap", color: "white", opacity: 0.95 }}>
            {msg.content}
          </span>
        </div>
      </div>

      {/* Suggested reply chips  only on bot messages */}
      {isBot && msg.suggestedReplies && msg.suggestedReplies.length > 0 && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "5px",
          paddingLeft: "36px", marginTop: "2px",
        }}>
          {msg.suggestedReplies.map((s, i) => (
            <button key={i} onClick={() => onSuggestedReply(s)}
              style={{
                fontSize: "14px", fontWeight: 600,
                padding: "5px 12px", borderRadius: "20px",
                background: "rgba(56,189,248,0.07)",
                border: "1px solid rgba(56,189,248,0.25)",
                color: "#38bdf8", cursor: "pointer",
                transition: "all 0.15s",
                animation: `bubbleIn 0.35s ease ${i * 0.07}s both`,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(56,189,248,0.16)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(56,189,248,0.07)"; }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

//  Typing Indicator 
function TypingIndicator() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
      <span style={{ fontSize: "14px", fontWeight: 700, color: "rgba(56,189,248,0.6)", paddingLeft: "36px" }}>
        CivicSaathi
      </span>
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
        <div style={{
          width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg,#38bdf8,#818cf8)",
          border: "1px solid rgba(56,189,248,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 10px rgba(56,189,248,0.3)",
        }}>
          <Sparkles style={{ width: 12, height: 12, color: "white" }} />
        </div>
        <div style={{
          padding: "12px 16px", borderRadius: "4px 16px 16px 16px",
          background: "linear-gradient(135deg,rgba(56,189,248,0.12),rgba(129,140,248,0.08))",
          border: "1px solid rgba(56,189,248,0.2)",
          display: "flex", alignItems: "center", gap: "5px",
        }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: "#38bdf8",
              animation: "typingDot 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}


//  New Ticket Modal 
function NewTicketModal({ open, onClose, onCreated, prefillQuery = "", prefillName = "" }: {
  open: boolean; onClose: () => void; onCreated: (t: Ticket) => void;
  prefillQuery?: string; prefillName?: string;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({ requester_name: "", subject: "", query: "", priority: "Normal", channel: "Web" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(f => ({
        ...f,
        requester_name: prefillName || user?.name || "",
        query: prefillQuery,
        subject: prefillQuery.slice(0, 60),
      }));
    }
  }, [open, prefillQuery, prefillName, user?.name]);

  const submit = async () => {
    if (!form.query.trim()) { toast.error("Describe the issue"); return; }
    setLoading(true);
    try {
      const payload = { ...form, submitted_by: user?.id || null };
      const r1 = await fetch(`${API_BASE}/live/helpline/ticket`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!r1.ok) throw new Error();
      const { ticket_id } = await r1.json();
      const r2 = await fetch(`${API_BASE}/live/helpline/ticket/${ticket_id}`);
      const full: Ticket = await r2.json();
      onCreated(full); onClose(); toast.success(`${ticket_id} created`);
    } catch { toast.error("Failed"); } finally { setLoading(false); }
  };

  const inputStyle = {
    width: "100%", height: "40px", padding: "0 14px",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(56,189,248,0.2)",
    borderRadius: "10px", color: "white", fontSize: "14px", outline: "none",
    transition: "border-color 0.2s", boxSizing: "border-box" as const, fontFamily: "inherit",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg border-0 p-0 overflow-hidden" style={{ background: "transparent" }}>
        <div style={{
          background: "linear-gradient(135deg, #0a1628 0%, #0f2240 40%, #1e1b4b 100%)",
          border: "1px solid rgba(56,189,248,0.25)", borderRadius: "16px",
        }}>
          <div style={{ background: "linear-gradient(135deg,rgba(56,189,248,0.15),rgba(129,140,248,0.08))", borderBottom: "1px solid rgba(56,189,248,0.15)", padding: "24px 28px 20px" }}>
            <div className="flex items-center gap-3">
              <div style={{ background: "linear-gradient(135deg,#38bdf8,#818cf8)", borderRadius: "10px", padding: "8px", boxShadow: "0 0 20px rgba(56,189,248,0.4)" }}>
                <TicketIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">Log as Helpline Ticket</DialogTitle>
                <DialogDescription className="text-sm mt-0.5" style={{ color: "rgba(147,210,234,0.7)" }}>Create a tracked support ticket from this query</DialogDescription>
              </div>
            </div>
          </div>
          <div className="p-7 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-[0.15em]" style={{ color: "rgba(147,210,234,0.7)" }}>Citizen Name</label>
                <input value={form.requester_name} onChange={e => setForm(f => ({ ...f, requester_name: e.target.value }))} placeholder="e.g. Rajesh Kumar" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.6)")} onBlur={e => (e.target.style.borderColor = "rgba(56,189,248,0.2)")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-[0.15em]" style={{ color: "rgba(147,210,234,0.7)" }}>Channel</label>
                <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} style={{ ...inputStyle }}>
                  {["Web","Phone","Email","App"].map(c => <option key={c} style={{ background: "#0a1628" }}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-[0.15em]" style={{ color: "rgba(147,210,234,0.7)" }}>Subject</label>
              <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Short subject" style={inputStyle}
                onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.6)")} onBlur={e => (e.target.style.borderColor = "rgba(56,189,248,0.2)")} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-[0.15em]" style={{ color: "rgba(147,210,234,0.7)" }}>Description</label>
              <textarea value={form.query} onChange={e => setForm(f => ({ ...f, query: e.target.value }))} rows={4}
                style={{ ...inputStyle, height: "auto", padding: "12px 14px", resize: "none" }}
                onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.6)")} onBlur={e => (e.target.style.borderColor = "rgba(56,189,248,0.2)")} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-[0.15em]" style={{ color: "rgba(147,210,234,0.7)" }}>Priority</label>
              <div className="flex gap-2">
                {["Low","Normal","High","Critical"].map(p => (
                  <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))}
                    style={{
                      flex: 1, padding: "8px 0", fontSize: "14px", fontWeight: 600, borderRadius: "8px",
                      border: form.priority === p ? "1px solid rgba(56,189,248,0.6)" : "1px solid rgba(255,255,255,0.1)",
                      background: form.priority === p ? "linear-gradient(135deg,rgba(56,189,248,0.25),rgba(129,140,248,0.15))" : "rgba(255,255,255,0.03)",
                      color: form.priority === p ? "#38bdf8" : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.2s",
                    }}>{p}</button>
                ))}
              </div>
            </div>
            <button onClick={submit} disabled={loading}
              style={{
                width: "100%", height: "44px", borderRadius: "10px",
                background: loading ? "rgba(56,189,248,0.2)" : "linear-gradient(135deg,#38bdf8,#818cf8)",
                border: "none", color: "white", fontSize: "14px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                boxShadow: loading ? "none" : "0 0 24px rgba(56,189,248,0.4)", transition: "all 0.2s",
              }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : <><TicketIcon className="w-4 h-4" />Create Ticket</>}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

//  Avatar 
function Avatar({ name, isAgent }: { name: string; isAgent: boolean }) {
  return (
    <div style={{
      width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "14px", fontWeight: 800,
      background: isAgent ? "linear-gradient(135deg,#8b5cf6,#6366f1)" : "rgba(100,116,139,0.2)",
      border: isAgent ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(100,116,139,0.25)",
      color: isAgent ? "white" : "var(--color-muted-foreground)",
      boxShadow: isAgent ? "0 0 10px rgba(139,92,246,0.3)" : "none",
    }}>{initials(name)}</div>
  );
}

//  Ticket Card 
function TicketCard({ t, onClick }: { t: Ticket; onClick: () => void }) {
  const sc = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.Open;
  const pc = PRIORITY_CONFIG[t.priority] ?? PRIORITY_CONFIG.Normal;
  const ch = CHANNEL_CONFIG[t.channel];
  const msgCount = t.messages?.length ?? 0;

  return (
    <button onClick={onClick}
      style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.6)",
        borderRadius: "16px", padding: "18px",
        textAlign: "left", cursor: "pointer", width: "100%",
        transition: "all 0.2s", display: "flex", flexDirection: "column", gap: "12px",
        position: "relative", overflow: "hidden",
        boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px rgba(0,0,0,0.1), 0 0 0 1.5px ${sc.border}`;
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.borderColor = sc.border;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 6px rgba(0,0,0,0.05)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.6)";
      }}>

      {/* Priority accent top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "3px",
        background: pc.dot, opacity: 0.85, borderRadius: "16px 16px 0 0",
      }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          fontSize: "14px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.08em",
          color: "#7c3aed", background: "#f5f3ff",
          padding: "2px 8px", borderRadius: "5px", border: "1px solid #ddd6fe",
        }}>{t.ticket_id}</span>
        <span style={{
          display: "flex", alignItems: "center", gap: "4px",
          fontSize: "14px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px",
          background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
        }}>
          {sc.icon}{sc.label}
        </span>
      </div>

      <div>
        <p style={{
          fontSize: "14px", fontWeight: 700, lineHeight: 1.35, color: "#0f172a",
          marginBottom: "5px",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{t.subject}</p>
        <p style={{
          fontSize: "14px", color: "#64748b", lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{t.query}</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{
              width: "20px", height: "20px", borderRadius: "50%", background: "#ede9fe",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: 800,
              color: "#7c3aed", border: "1px solid #ddd6fe",
            }}>{initials(t.requester_name)}</div>
            <span style={{ fontSize: "14px", color: "#475569", fontWeight: 500 }}>{t.requester_name}</span>
          </div>
          {ch && (
            <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "14px", color: ch.color, fontWeight: 600 }}>
              {ch.icon}{t.channel}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {msgCount > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "14px", color: "#94a3b8" }}>
              <MessageSquare style={{ width: 10, height: 10 }} />{msgCount}
            </span>
          )}
          <span style={{ fontSize: "14px", color: "#94a3b8" }}>{relativeTime(t.updated_at)}</span>
          <div style={{
            width: "20px", height: "20px", borderRadius: "6px",
            background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ArrowRight style={{ width: 10, height: 10, color: "#7c3aed" }} />
          </div>
        </div>
      </div>
    </button>
  );
}

//  Status Timeline 
function StatusTimeline({ status }: { status: string }) {
  const steps = [
    { key: "Open",     label: "Opened",     icon: "📩" },
    { key: "Pending",  label: "Attending",   icon: "👨‍💼" },
    { key: "Resolved", label: "Resolved",    icon: "✅" },
  ];
  const activeIdx = status === "Open" ? 0 : status === "Pending" ? 1 : 2;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "14px 24px 10px", flexShrink: 0 }}>
      {steps.map((s, i) => {
        const done    = i < activeIdx;
        const current = i === activeIdx;
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", flexShrink: 0 }}>
              <div style={{
                width: "30px", height: "30px", borderRadius: "50%", fontSize: "14px",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: done || current
                  ? current ? "linear-gradient(135deg,#ede9fe,#ddd6fe)" : "#ecfdf5"
                  : "#f1f5f9",
                border: done || current
                  ? current ? "2px solid #c4b5fd" : "2px solid #a7f3d0"
                  : "2px solid #e2e8f0",
                boxShadow: current ? "0 0 12px rgba(139,92,246,0.2)" : "none",
                transition: "all 0.3s ease",
              }}>
                {done ? "✓" : s.icon}
              </div>
              <span style={{
                fontSize: "14px", fontWeight: current ? 800 : 600,
                color: current ? "#7c3aed" : done ? "#059669" : "#94a3b8",
                whiteSpace: "nowrap",
              }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: "2px", marginBottom: "14px",
                background: i < activeIdx
                  ? "linear-gradient(90deg,#34d399,#6ee7b7)"
                  : "#e2e8f0",
                transition: "background 0.4s ease",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

//  Conversation Drawer (quick-commerce helpline style) 
function ConversationDrawer({ ticket, onClose, onUpdate }: {
  ticket: Ticket; onClose: () => void; onUpdate: () => void;
}) {
  const { user } = useAuth();
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [submitAs, setSubmitAs] = useState("Open");
  const [currentTicket, setCurrentTicket] = useState(ticket);
  const threadRef = useRef<HTMLDivElement>(null);

  // Role-based identity
  const isOfficer = user?.role === "officer" || user?.role === "admin";
  // Always use the real logged-in name as sender  citizens get their own name, not "Agent"
  const senderName = user?.name || (isOfficer ? "Officer" : "Citizen");
  const senderBadge = user?.role === "admin" ? "ADMIN" : user?.role === "officer" ? "OFFICER" : "CITIZEN";
  const senderColor = user?.role === "admin" ? "#f59e0b" : user?.role === "citizen" ? "#22d3ee" : "#a78bfa";
  const senderBg   = user?.role === "admin" ? "rgba(245,158,11,0.15)" : "rgba(139,92,246,0.15)";
  const senderBorder = user?.role === "admin" ? "rgba(245,158,11,0.25)" : "rgba(139,92,246,0.25)";

  useEffect(() => { setCurrentTicket(ticket); setSubmitAs(ticket.status); }, [ticket]);
  useEffect(() => { threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" }); }, [currentTicket.messages?.length, sending]);

  const pc = PRIORITY_CONFIG[currentTicket.priority] ?? PRIORITY_CONFIG.Normal;
  const ch = CHANNEL_CONFIG[currentTicket.channel];

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await fetch(`${API_BASE}/live/helpline/ticket/${currentTicket.ticket_id}/reply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: senderName, sender_type: isOfficer ? "agent" : "user", text: replyText }),
      });
      if (submitAs !== currentTicket.status) {
        await fetch(`${API_BASE}/live/helpline/ticket/${currentTicket.ticket_id}/status`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: submitAs }),
        });
      }
      const tr = await fetch(`${API_BASE}/live/helpline/ticket/${currentTicket.ticket_id}`);
      const updated = await tr.json();
      setCurrentTicket(updated); setReplyText(""); onUpdate(); toast.success("Sent");
    } catch { toast.error("Failed"); } finally { setSending(false); }
  };

  const changeStatus = async (status: string) => {
    try {
      await fetch(`${API_BASE}/live/helpline/ticket/${currentTicket.ticket_id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      setCurrentTicket(p => ({ ...p, status })); onUpdate();
    } catch { toast.error("Failed"); }
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(5px)",
        zIndex: 40, animation: "fadeIn 0.2s ease",
      }} />

      {/* Drawer panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(580px, 56vw)",
        background: "rgba(248, 250, 252, 0.95)", // light slate 50
        backdropFilter: "blur(20px)",
        borderLeft: "1px solid rgba(226, 232, 240, 0.8)",
        boxShadow: "-24px 0 80px rgba(0,0,0,0.1)",
        zIndex: 50, display: "flex", flexDirection: "column",
        animation: "slideIn 0.28s cubic-bezier(0.16,1,0.3,1)",
      }}>

        {/*  TOP HEADER: Ticket identity  */}
        <div style={{
          padding: "18px 22px 0",
          background: "linear-gradient(180deg,rgba(255,255,255,1) 0%,rgba(248,250,252,1) 100%)",
          borderBottom: "1px solid #e2e8f0",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "12px" }}>
            {/* Left: ID + subject + person */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                {/* Ticket ID badge */}
                <span style={{
                  fontSize: "14px", fontFamily: "monospace", fontWeight: 800, letterSpacing: "0.12em",
                  color: "#7c3aed", background: "#f5f3ff",
                  padding: "3px 9px", borderRadius: "6px", border: "1px solid #ddd6fe",
                }}>{currentTicket.ticket_id}</span>

                {/* Priority badge */}
                <span style={{
                  fontSize: "14px", fontWeight: 800, padding: "3px 9px", borderRadius: "20px",
                  background: `${pc.dot}15`, color: pc.dot,
                  border: `1px solid ${pc.dot}30`, letterSpacing: "0.06em",
                  display: "flex", alignItems: "center", gap: "4px",
                }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: pc.dot, display: "inline-block" }} />
                  {currentTicket.priority}
                </span>

                {/* Channel badge */}
                {ch && (
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px", fontWeight: 700, color: ch.color }}>
                    {ch.icon}{currentTicket.channel}
                  </span>
                )}

                {/* Time */}
                <span style={{ fontSize: "14px", color: "#94a3b8", marginLeft: "auto" }}>{relativeTime(currentTicket.created_at)}</span>
              </div>

              {/* Subject */}
              <h2 style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", margin: "0 0 8px", lineHeight: 1.3 }}>{currentTicket.subject}</h2>

              {/* Requester chip */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingBottom: "12px" }}>
                <div style={{
                  width: "22px", height: "22px", borderRadius: "50%",
                  background: "linear-gradient(135deg, #ede9fe, #ddd6fe)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "8px", fontWeight: 800, color: "#7c3aed",
                  border: "1px solid #c4b5fd", flexShrink: 0,
                }}>{initials(currentTicket.requester_name)}</div>
                <span style={{ fontSize: "14px", color: "#475569", fontWeight: 600 }}>{currentTicket.requester_name}</span>
              </div>
            </div>

            {/* Close button */}
            <button onClick={onClose} style={{
              width: "32px", height: "32px", borderRadius: "9px",
              border: "1px solid #e2e8f0",
              background: "white", cursor: "pointer", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f1f5f9"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "white"; }}
            >
              <X style={{ width: 14, height: 14, color: "#64748b" }} />
            </button>
          </div>
        </div>

        {/*  STATUS TIMELINE (quick-commerce order tracker style)  */}
        <StatusTimeline status={currentTicket.status} />

        {/*  STATUS ACTION BUTTONS  */}
        <div style={{
          display: "flex", gap: "6px", padding: "0 22px 14px",
          borderBottom: "1px solid #e2e8f0", flexShrink: 0,
        }}>
          {(["Open", "Pending", "Resolved"] as const).map(s => {
            const ssc = STATUS_CONFIG[s] ?? STATUS_CONFIG.Open;
            const active = currentTicket.status === s;
            return (
              <button key={s} onClick={() => changeStatus(s)} style={{
                padding: "5px 14px", borderRadius: "20px", fontSize: "14px", fontWeight: 700,
                border: `1px solid ${active ? ssc.border : "#e2e8f0"}`,
                background: active ? ssc.bg : "white",
                color: active ? ssc.color : "#94a3b8",
                cursor: "pointer", transition: "all 0.18s",
                display: "flex", alignItems: "center", gap: "5px",
                boxShadow: active ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
              }}>
                {active && ssc.icon}
                {active ? "✓ " : ""}{s}
              </button>
            );
          })}
        </div>

        {/*  ORIGINAL QUERY banner  */}
        {currentTicket.query && (
          <div style={{
            margin: "12px 22px 0",
            padding: "10px 14px", borderRadius: "10px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            flexShrink: 0,
          }}>
            <p style={{ fontSize: "14px", fontWeight: 800, color: "#64748b", marginBottom: "3px", letterSpacing: "0.08em" }}>ORIGINAL QUERY</p>
            <p style={{ fontSize: "14px", color: "#334155", lineHeight: 1.6 }}>{currentTicket.query}</p>
          </div>
        )}

        {/*  CHAT THREAD  */}
        <div ref={threadRef} style={{
          flex: 1, overflowY: "auto", padding: "10px 22px 14px",
          display: "flex", flexDirection: "column", gap: "14px",
        }}>
          {(currentTicket.messages || []).length === 0 && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", gap: "10px", opacity: 0.6,
            }}>
              <MessageSquare style={{ width: 32, height: 32, color: "#94a3b8" }} />
              <p style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>No messages yet — start the conversation</p>
            </div>
          )}

          {(currentTicket.messages || []).map((m, i) => {
            const displayName = (m.sender === "Agent" && m.sender_type === "agent")
              ? "Support Officer"
              : m.sender;
            const isMine = displayName === senderName ||
              (m.sender === "Agent" && isOfficer && m.sender === senderName);

            const isStaff = m.sender_type === "agent";
            const timeStr = formatTime(m.time);

            // Bubble colours
            const myBubbleBg     = `linear-gradient(135deg, ${senderColor}1a, ${senderColor}08)`;
            const myBubbleBorder = `${senderColor}33`;
            const otherBubbleBg     = "white";
            const otherBubbleBorder = "#e2e8f0";

            // For officers: show suggest chips below the last incoming citizen message
            const isLastIncoming = !isMine && (currentTicket.messages || []).slice(i + 1).every(x =>
              isOfficer ? x.sender_type === "agent" : x.sender_type === "user"
            );

            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px", animation: "bubbleIn 0.25s ease" }}>

                {/* Name + time label */}
                <div style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  justifyContent: isMine ? "flex-end" : "flex-start",
                  paddingLeft: isMine ? "0" : "36px",
                  paddingRight: isMine ? "36px" : "0",
                }}>
                  {isMine && (
                    <span style={{ fontSize: "14px", color: "#94a3b8" }}>{timeStr}</span>
                  )}
                  <span style={{
                    fontSize: "14px", fontWeight: 700,
                    color: isMine ? senderColor : "#475569",
                  }}>{displayName}</span>
                  {!isMine && (
                    <span style={{ fontSize: "14px", color: "#94a3b8" }}>{timeStr}</span>
                  )}
                </div>

                {/* Avatar + Bubble row */}
                <div style={{
                  display: "flex", flexDirection: isMine ? "row-reverse" : "row",
                  gap: "9px", alignItems: "flex-end",
                }}>
                  {/* Avatar */}
                  {isMine ? (
                    <div style={{
                      width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                      background: `linear-gradient(135deg, ${senderColor}e6, ${senderColor}b3)`,
                      border: `1px solid ${senderColor}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: `0 2px 8px ${senderColor}40`,
                      fontSize: "14px", fontWeight: 800, color: "white",
                    }}>
                      {(senderName || "Me").slice(0, 1).toUpperCase()}
                    </div>
                  ) : (
                    <div style={{
                      width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                      background: isStaff
                        ? "linear-gradient(135deg, #ede9fe, #ddd6fe)"
                        : "linear-gradient(135deg, #f1f5f9, #e2e8f0)",
                      border: isStaff ? "1px solid #c4b5fd" : "1px solid #cbd5e1",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "14px", fontWeight: 800,
                      color: isStaff ? "#7c3aed" : "#475569",
                    }}>
                      {initials(displayName || currentTicket.requester_name)}
                    </div>
                  )}

                  {/* Bubble */}
                  <div style={{
                    maxWidth: "72%", padding: "10px 14px",
                    borderRadius: isMine ? "16px 3px 16px 16px" : "3px 16px 16px 16px",
                    fontSize: "14px", lineHeight: 1.65, color: "#1e293b",
                    background: isMine ? myBubbleBg : otherBubbleBg,
                    border: `1px solid ${isMine ? myBubbleBorder : otherBubbleBorder}`,
                    wordBreak: "break-word",
                  }}>{m.text}</div>
                </div>

                {/* Suggest chips  only for officers below last citizen message */}
                {isOfficer && isLastIncoming && !isMine && (
                  <div style={{
                    display: "flex", flexWrap: "wrap", gap: "5px",
                    paddingLeft: "37px", marginTop: "2px",
                  }}>
                    <span style={{
                      fontSize: "14px", fontWeight: 700, color: "#94a3b8",
                      alignSelf: "center", letterSpacing: "0.08em", marginRight: "1px",
                    }}>💬 suggest:</span>
                    {MACROS.map((mac, j) => (
                      <button key={j}
                        onClick={() => setReplyText(p => p ? p + "\n" + mac.text : mac.text)}
                        style={{
                          fontSize: "14px", fontWeight: 600, padding: "3px 10px", borderRadius: "20px",
                          background: "#f5f3ff",
                          border: "1px solid #ddd6fe",
                          color: "#7c3aed", cursor: "pointer", transition: "all 0.15s",
                          display: "flex", alignItems: "center", gap: "3px",
                          animation: `bubbleIn 0.3s ease ${j * 0.06}s both`,
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#ede9fe"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#f5f3ff"; }}
                      >
                        <span style={{ fontSize: "14px" }}>{mac.emoji}</span>{mac.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Live sending indicator */}
          {sending && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", animation: "bubbleIn 0.2s ease" }}>
              <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: "36px" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: `${senderColor}80` }}>{senderName}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "row-reverse", gap: "9px", alignItems: "flex-end" }}>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                  background: `linear-gradient(135deg,${senderColor}e6,${senderColor}b3)`,
                  border: `1px solid ${senderColor}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "14px", fontWeight: 800, color: "white",
                  boxShadow: `0 2px 8px ${senderColor}40`,
                }}>{(senderName || "A").slice(0, 1).toUpperCase()}</div>
                <div style={{
                  padding: "10px 16px", borderRadius: "16px 3px 16px 16px",
                  background: `linear-gradient(135deg,${senderColor}22,${senderColor}10)`,
                  border: `1px solid ${senderColor}35`,
                  display: "flex", gap: "5px", alignItems: "center",
                }}>
                  {[0,1,2].map(k => (
                    <div key={k} style={{
                      width: "5px", height: "5px", borderRadius: "50%", background: senderColor,
                      animation: "typingDot 1.2s ease-in-out infinite",
                      animationDelay: `${k * 0.2}s`,
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/*  REPLY COMPOSER  */}
        <div style={{
          padding: "10px 22px 18px",
          borderTop: "1px solid #e2e8f0",
          background: "rgba(255,255,255,0.8)",
          backdropFilter: "blur(10px)",
          flexShrink: 0,
        }}>
          {/* Composer box */}
          <div style={{
            borderRadius: "14px",
            border: "1px solid #cbd5e1",
            background: "white",
            overflow: "hidden",
            transition: "border-color 0.2s, box-shadow 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
            onFocusCapture={e => {
              e.currentTarget.style.borderColor = senderColor;
              e.currentTarget.style.boxShadow = `0 0 0 3px ${senderColor}20`;
            }}
            onBlurCapture={e => {
              e.currentTarget.style.borderColor = "#cbd5e1";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
            }}
          >
            {/* Reply label */}
            <div style={{
              padding: "10px 14px 0",
              display: "flex", alignItems: "center", gap: "6px",
            }}>
              <div style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: senderColor, boxShadow: `0 0 6px ${senderColor}80`,
              }} />
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#64748b", letterSpacing: "0.06em" }}>
                REPLYING AS <span style={{ color: senderColor }}>{senderName.toUpperCase()}</span> · <span style={{ fontWeight: 600, opacity: 0.7 }}>{senderBadge}</span>
              </span>
            </div>

            <Textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder={`Type your reply here…`}
              style={{
                width: "100%", resize: "none", fontSize: "14px",
                border: "none", background: "transparent", outline: "none",
                padding: "8px 14px 10px", minHeight: "72px",
                color: "#0f172a", fontFamily: "inherit", lineHeight: 1.6,
              }}
              className="focus-visible:ring-0 focus-visible:ring-offset-0 border-0 shadow-none"
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply(); }}
            />

            {/* Bottom bar: hint + status dropdown + send */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 12px",
              borderTop: "1px solid #f1f5f9",
              background: "#f8fafc",
            }}>
              <p style={{ fontSize: "14px", color: "#94a3b8", fontWeight: 600 }}>
                ⌘ + ↵ to send
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <Select value={submitAs} onValueChange={setSubmitAs}>
                  <SelectTrigger style={{
                    height: "30px", fontSize: "14px", width: "138px",
                    background: "white",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px", color: "#475569",
                  }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open"     className="text-sm">Submit as Open</SelectItem>
                    <SelectItem value="Pending"  className="text-sm">Submit as Pending</SelectItem>
                    <SelectItem value="Resolved" className="text-sm">Submit as Resolved</SelectItem>
                  </SelectContent>
                </Select>

                <button
                  onClick={sendReply}
                  disabled={sending || !replyText.trim()}
                  style={{
                    height: "30px", padding: "0 18px", borderRadius: "8px", border: "none",
                    background: sending || !replyText.trim()
                      ? "#cbd5e1"
                      : "linear-gradient(135deg, #8b5cf6, #6366f1)",
                    color: "white", fontSize: "14px", fontWeight: 700,
                    cursor: sending || !replyText.trim() ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: "5px",
                    boxShadow: !sending && replyText.trim() ? "0 4px 16px rgba(139,92,246,0.45)" : "none",
                    opacity: sending || !replyText.trim() ? 0.5 : 1,
                    transition: "all 0.2s",
                  }}
                >
                  {sending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Send className="w-3.5 h-3.5" />
                  }
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

//  Stat Card 
function StatCard({ label, count, icon: Icon, color, bg, border, onClick, active }: {
  label: string; count: number; icon: React.ElementType;
  color: string; bg: string; border: string; onClick: () => void; active: boolean;
}) {
  return (
    <button onClick={onClick}
      style={{
        flex: 1, padding: "14px 16px", borderRadius: "14px", textAlign: "left", cursor: "pointer",
        background: active ? bg : "var(--color-card)",
        border: `1px solid ${active ? border : "rgba(139,92,246,0.08)"}`,
        boxShadow: active ? `0 4px 20px ${color}22` : "none",
        transition: "all 0.2s", display: "flex", alignItems: "center", gap: "12px",
      }}>
      <div style={{
        width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
        background: active ? `${color}22` : "rgba(139,92,246,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `1px solid ${active ? border : "rgba(139,92,246,0.12)"}`,
      }}>
        <Icon style={{ width: 16, height: 16, color: active ? color : "rgba(139,92,246,0.5)" }} />
      </div>
      <div>
        <p style={{ fontSize: "14px", fontWeight: 800, color: active ? color : "var(--color-foreground)", lineHeight: 1 }}>{count}</p>
        <p style={{ fontSize: "14px", color: "var(--color-muted-foreground)", fontWeight: 600, marginTop: "2px" }}>{label}</p>
      </div>
    </button>
  );
}

//  AI Bot Panel 
// Continuous voice conversation: VAD-based auto-detect  STT  AI  TTS  loop
function AIBotPanel({ onTicketCreated }: { onTicketCreated: (t: Ticket) => void }) {
  const { user } = useAuth();
  const [langIdx, setLangIdx] = useState(0);
  const lang = LANGUAGES[langIdx];

  const [messages, setMessages] = useState<BotMessage[]>([
    { role: "assistant", content: lang.greeting, ts: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [isTyping, setIsTyping] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketPrefill, setTicketPrefill] = useState("");
  const [showLangMenu, setShowLangMenu] = useState(false);

  //  Voice state 
  const [voiceMode, setVoiceMode] = useState(false);      // continuous voice loop on/off
  const [isRecording, setIsRecording] = useState(false);  // mic active right now
  const [sttEngine, setSttEngine] = useState("");          // shows which engine is used
  const [detectedLang, setDetectedLang] = useState("");    // detected language badge
  const [audioLevel, setAudioLevel] = useState(0);        // 0100 for waveform bars

  //  Auto-escalation 
  const [unresolvedTurns, setUnresolvedTurns] = useState(0);   // consecutive unresolved
  const [escalationOffered, setEscalationOffered] = useState(false);
  const [autoEscalated, setAutoEscalated] = useState(false);
  const [escalatedTicketId, setEscalatedTicketId] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  // Voice refs
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const audioChunksRef    = useRef<Blob[]>([]);
  const audioContextRef   = useRef<AudioContext | null>(null);
  const analyserRef       = useRef<AnalyserNode | null>(null);
  const vadTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelRafRef       = useRef<number | null>(null);
  const currentAudioRef   = useRef<HTMLAudioElement | null>(null);
  const voiceModeRef      = useRef(false);   // mirror of voiceMode for callbacks
  const loopActiveRef     = useRef(false);   // prevent overlapping loops

  // Keep ref in sync
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);

  // Auto-scroll
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  // Update greeting when language changes
  const switchLanguage = (idx: number) => {
    setLangIdx(idx);
    setShowLangMenu(false);
    const newLang = LANGUAGES[idx];
    setMessages([{ role: "assistant", content: newLang.greeting, ts: Date.now() }]);
    setInput("");
    setOrbState("idle");
    setUnresolvedTurns(0);
    setEscalationOffered(false);
  };

  //  TTS: play bot reply via edge-tts backend 
  const speakText = useCallback(async (text: string, langCode: string): Promise<void> => {
    // Cancel any currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setOrbState("speaking");
    try {
      const res = await fetch(`${API_BASE}/voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: langCode }),
      });

      // If edge-tts not installed, backend returns JSON with fallback:true
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        // Browser speechSynthesis fallback
        const data = await res.json();
        if (data.fallback && "speechSynthesis" in window) {
          await new Promise<void>((resolve) => {
            const utt = new SpeechSynthesisUtterance(data.text);
            utt.lang = langCode + "-IN";
            utt.rate = 1.0;
            const voices = window.speechSynthesis.getVoices();
            const match = voices.find(v => v.lang.startsWith(langCode));
            if (match) utt.voice = match;
            utt.onend = () => resolve();
            utt.onerror = () => resolve();
            window.speechSynthesis.speak(utt);
          });
        }
      } else {
        // Real audio from edge-tts
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        await new Promise<void>((resolve) => {
          const audio = new Audio(url);
          currentAudioRef.current = audio;
          audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
          audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
          audio.play().catch(() => resolve());
        });
        currentAudioRef.current = null;
      }
    } catch {
      // Silently continue if TTS fails
    }
    setOrbState("idle");
  }, []);

  //  STT: send recorded blob to backend 
  const transcribeAudio = useCallback(
    async (blob: Blob, langCode: string): Promise<{ transcript: string; detectedLang: string }> => {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      form.append("language", langCode);
      try {
        const res = await fetch(`${API_BASE}/voice/stt`, { method: "POST", body: form });
        const data = await res.json();
        setSttEngine(data.engine || "");
        const detected = (data.detected_language || "").trim();
        // Show detected-language badge if different from selector
        if (detected && detected !== langCode) {
          setDetectedLang(detected);
        } else {
          setDetectedLang("");
        }
        return { transcript: (data.transcript || "").trim(), detectedLang: detected || langCode };
      } catch {
        return { transcript: "", detectedLang: langCode };
      }
    },
    []
  );

  //  Core: send message and handle AI response 
  // activeLang: the language to use for AI + TTS (auto-detected from speech, else dropdown)
  const sendMessage = useCallback(async (text: string, isVoice = false, activeLang?: string) => {
    const trimmed = text.trim();
    if (!trimmed || orbState === "thinking") return;

    // Use the auto-detected language if provided, otherwise fall back to dropdown
    const effectiveLang = activeLang || lang.code;

    const userMsg: BotMessage = { role: "user", content: trimmed, ts: Date.now(), isVoice };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setOrbState("listening");
    setTimeout(() => setOrbState("thinking"), 600);
    setIsTyping(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "helpline",
          message: trimmed,
          language: effectiveLang,          // use detected lang, not just dropdown
          detected_language: effectiveLang, // extra hint for backend prompt
          user_name: user?.name || "",      // personalised greeting
          user_id: user?.id || "",
          history,
        }),
      });
      const data = await res.json();
      const reply   = data.reply || "I'm sorry, I couldn't process that. Please try again.";
      const resolved: boolean = data.resolved !== false; // default true if missing

      setIsTyping(false);
      const suggested: string[] = Array.isArray(data.suggested_replies) ? data.suggested_replies : [];
      setMessages(prev => [...prev, { role: "assistant", content: reply, ts: Date.now(), resolved, suggestedReplies: suggested }]);

      //  Escalation tracking 
      if (!resolved) {
        setUnresolvedTurns(prev => {
          const next = prev + 1;
          if (next >= 5 && !autoEscalated) {
            // Auto-create ticket after 5 unresolved turns
            autoCreateTicket(trimmed, reply);
          } else if (next >= 3 && !escalationOffered) {
            setEscalationOffered(true);
          }
          return next;
        });
      } else {
        setUnresolvedTurns(0);
        setEscalationOffered(false);
      }

      //  TTS playback 
      if (voiceModeRef.current) {
        await speakText(reply, effectiveLang);   // speak in same language user spoke
        // Echo-guard: 700ms gap after TTS ends so mic doesn't pick up speakers
        await new Promise(r => setTimeout(r, 700));
        // Restart listening loop if voice mode still on
        if (voiceModeRef.current && !loopActiveRef.current) {
          startListeningLoop();
        }
      } else {
        setTimeout(() => setOrbState("idle"), 2000);
      }

    } catch {
      setIsTyping(false);
      setOrbState("idle");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Connection error. Please check the backend service and try again.",
        ts: Date.now(),
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, lang, orbState, speakText, escalationOffered, autoEscalated]);

  //  Auto-create ticket from conversation 
  const autoCreateTicket = useCallback(async (lastQuery: string, lastReply: string) => {
    if (autoEscalated) return;
    setAutoEscalated(true);
    try {
      const transcript = messages
        .map(m => `${m.role === "user" ? "User" : "Bot"}: ${m.content}`)
        .join("\n");
      const payload = {
        requester_name: user?.name || "Citizen",
        subject: lastQuery.slice(0, 60) || "Helpline Query",
        query: `Auto-escalated after ${unresolvedTurns} unresolved turns.\n\nConversation:\n${transcript}`,
        priority: "High",
        channel: "Web",
        submitted_by: user?.id || null,
      };
      const r1 = await fetch(`${API_BASE}/live/helpline/ticket`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!r1.ok) throw new Error();
      const { ticket_id } = await r1.json();
      const r2 = await fetch(`${API_BASE}/live/helpline/ticket/${ticket_id}`);
      const full: Ticket = await r2.json();
      setEscalatedTicketId(ticket_id);
      onTicketCreated(full);
      // Inject the real ticket ID into chat history so future questions
      // like "what's the status of my ticket" resolve correctly
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Ticket ${ticket_id} has been created. Status: Open. You can ask me about this ticket anytime by mentioning the ID.`,
        ts: Date.now(),
      }]);
      toast.success(`Ticket ${ticket_id} auto-created`);
    } catch {
      toast.error("Auto-escalation failed — please create a ticket manually");
    }
  }, [autoEscalated, messages, user, unresolvedTurns, onTicketCreated]);

  //  VAD: Voice Activity Detection using Web Audio 
  const stopLevelMeter = () => {
    if (levelRafRef.current) { cancelAnimationFrame(levelRafRef.current); levelRafRef.current = null; }
    setAudioLevel(0);
  };

  const startLevelMeter = (stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const tick = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(Math.min(100, avg * 2));
        levelRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* ignore */ }
  };

  //  Start a single recording session (VAD-triggered auto-stop) 
  const startListeningLoop = useCallback(async () => {
    if (loopActiveRef.current) return;
    loopActiveRef.current = true;
    setIsRecording(true);
    setOrbState("listening");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Microphone access denied. Please allow mic access and try again.");
      setIsRecording(false);
      setOrbState("idle");
      loopActiveRef.current = false;
      setVoiceMode(false);
      voiceModeRef.current = false;
      return;
    }

    startLevelMeter(stream);
    audioChunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus" : "audio/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };

    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      stopLevelMeter();
      setIsRecording(false);

      if (!voiceModeRef.current) {
        loopActiveRef.current = false;
        return;
      }

      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      audioChunksRef.current = [];

      if (blob.size < 1000) {
        // Too short  restart listening
        loopActiveRef.current = false;
        if (voiceModeRef.current) setTimeout(() => startListeningLoop(), 300);
        return;
      }

      setOrbState("thinking");
      loopActiveRef.current = false;

      const { transcript, detectedLang: spoken } = await transcribeAudio(blob, lang.code);
      if (transcript) {
        // Pass the spoken language so AI replies in same language
        await sendMessage(transcript, true, spoken);
      } else {
        // Nothing transcribed  loop again
        if (voiceModeRef.current) setTimeout(() => startListeningLoop(), 500);
        else setOrbState("idle");
      }
    };

    recorder.start();

    // VAD  monitor audio levels; stop after sustained silence
    // Raised noise floor (15) to ignore mic hiss / ambient noise
    const VAD_SILENCE_MS   = 1800;  // stop after this long of silence (was 1200  increased to avoid mid-sentence cutoff)
    const VAD_START_DELAY  = 1500;  // wait this long before VAD kicks in (let user start speaking)
    const NOISE_FLOOR      = 15;    // avg frequency energy below this = silence

    let hasSpeechStarted = false;   // only allow silence countdown after user has spoken

    const checkSilence = () => {
      if (!voiceModeRef.current) { recorder.stop(); return; }
      const data = new Uint8Array(analyserRef.current?.frequencyBinCount || 0);
      analyserRef.current?.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / (data.length || 1);
      if (avg >= NOISE_FLOOR) {
        // Sound detected  mark speech started and cancel any pending stop
        hasSpeechStarted = true;
        if (vadTimerRef.current) { clearTimeout(vadTimerRef.current); vadTimerRef.current = null; }
      } else if (hasSpeechStarted) {
        // Below noise floor AND user has already spoken  start silence countdown
        if (vadTimerRef.current === null) {
          vadTimerRef.current = setTimeout(() => {
            vadTimerRef.current = null;
            if (recorder.state === "recording") recorder.stop();
          }, VAD_SILENCE_MS);
        }
      }
      // If hasSpeechStarted is still false, do nothing  don't start any countdown yet
      if (recorder.state === "recording") setTimeout(checkSilence, 80);
    };
    setTimeout(checkSilence, VAD_START_DELAY);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang.code, transcribeAudio, sendMessage]);

  //  Toggle voice mode 
  const toggleVoiceMode = () => {
    if (voiceMode) {
      // Turn off
      setVoiceMode(false);
      voiceModeRef.current = false;
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
      window.speechSynthesis?.cancel();
      stopLevelMeter();
      setIsRecording(false);
      setOrbState("idle");
      loopActiveRef.current = false;
    } else {
      setVoiceMode(true);
      voiceModeRef.current = true;
      startListeningLoop();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceModeRef.current = false;
      loopActiveRef.current = false;
      mediaRecorderRef.current?.stop();
      currentAudioRef.current?.pause();
      stopLevelMeter();
      if (vadTimerRef.current) clearTimeout(vadTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleLogTicket = () => {
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    setTicketPrefill(lastUser?.content || "");
    setShowTicketModal(true);
  };

  const clearChat = () => {
    if (voiceMode) toggleVoiceMode();
    setMessages([{ role: "assistant", content: lang.greeting, ts: Date.now() }]);
    setOrbState("idle");
    setUnresolvedTurns(0);
    setEscalationOffered(false);
    setAutoEscalated(false);
    setEscalatedTicketId("");
  };

  const stateLabel: Record<OrbState, string> = {
    idle:      voiceMode ? "Voice mode — tap orb to speak" : "Ready to help",
    listening: "Listening…",
    thinking:  "Thinking…",
    speaking:  "Speaking…",
  };

  //  Waveform bars (react to live audio level) 
  const WaveformBars = () => (
    <div style={{ display: "flex", alignItems: "center", gap: "3px", height: "24px" }}>
      {[0.5, 0.8, 1.0, 0.7, 0.4, 0.9, 0.6].map((base, i) => {
        const height = isRecording
          ? Math.max(4, Math.min(24, (audioLevel / 100) * 24 * base * (0.7 + Math.random() * 0.6)))
          : 4;
        return (
          <div key={i} style={{
            width: "3px", borderRadius: "2px", height: `${height}px`,
            background: `linear-gradient(to top, #22d3ee, #38bdf8)`,
            transition: "height 0.08s ease",
            boxShadow: isRecording ? "0 0 4px #22d3ee" : "none",
          }} />
        );
      })}
    </div>
  );

  return (
    <>
      <div style={{
        display: "flex", flexDirection: "column", height: "100%",
        background: "linear-gradient(180deg, #0f172a 0%, #111827 60%, #131c35 100%)",
        borderLeft: "1px solid rgba(56,189,248,0.1)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Ambient background particles */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          {[...Array(12)].map((_, i) => (
            <div key={i} style={{
              position: "absolute",
              width: `${2 + (i % 3)}px`, height: `${2 + (i % 3)}px`,
              borderRadius: "50%",
              background: i % 3 === 0 ? "#38bdf8" : i % 3 === 1 ? "#818cf8" : "#34d399",
              opacity: 0.15 + (i % 4) * 0.05,
              top: `${5 + i * 7}%`, left: `${8 + i * 7.5}%`,
              animation: `floatParticle ${4 + i * 0.8}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.4}s`,
            }} />
          ))}
        </div>

        {/* Header */}
        <div style={{
          padding: "14px 18px",
          borderBottom: "1px solid rgba(56,189,248,0.1)",
          background: "linear-gradient(180deg,rgba(56,189,248,0.06) 0%,transparent 100%)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0, position: "relative", zIndex: 2,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Bot icon */}
            <div style={{ position: "relative" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "11px",
                background: "linear-gradient(135deg,#38bdf8,#818cf8)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 16px rgba(56,189,248,0.4)",
              }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              {/* Online indicator dot */}
              <div style={{
                position: "absolute", bottom: "-1px", right: "-1px",
                width: "11px", height: "11px", borderRadius: "50%",
                background: "#22c55e",
                border: "2px solid #050c1a",
                boxShadow: "0 0 6px rgba(34,197,94,0.7)",
                animation: "onlinePulse 2.5s ease-in-out infinite",
              }} />
            </div>

            <div>
              <p style={{ fontSize: "14px", fontWeight: 800, color: "white", margin: 0, letterSpacing: "-0.01em" }}>CivicSaathi</p>
              <p style={{ fontSize: "14px", color: "rgba(34,197,94,0.85)", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: "3px" }}>
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                We're online · {sttEngine ? `STT: ${sttEngine}` : lang.label}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {/* Language picker */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowLangMenu(p => !p)}
                style={{
                  height: "30px", padding: "0 10px", borderRadius: "8px",
                  background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.25)",
                  color: "#38bdf8", fontSize: "14px", fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "4px",
                }}>
                {lang.native} <ChevronDown style={{ width: 10, height: 10 }} />
              </button>
              {showLangMenu && (
                <div style={{
                  position: "absolute", top: "36px", right: 0, zIndex: 100,
                  background: "#0a1628", border: "1px solid rgba(56,189,248,0.2)",
                  borderRadius: "10px", overflow: "hidden", minWidth: "140px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}>
                  {LANGUAGES.map((l, i) => (
                    <button key={l.code} onClick={() => switchLanguage(i)}
                      style={{
                        width: "100%", padding: "9px 14px", display: "flex", alignItems: "center", gap: "8px",
                        background: i === langIdx ? "rgba(56,189,248,0.1)" : "transparent",
                        border: "none", cursor: "pointer", textAlign: "left",
                        borderBottom: i < LANGUAGES.length - 1 ? "1px solid rgba(56,189,248,0.06)" : "none",
                      }}>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#38bdf8", width: "24px" }}>{l.native}</span>
                      <span style={{ fontSize: "14px", color: i === langIdx ? "#38bdf8" : "rgba(255,255,255,0.6)", fontWeight: i === langIdx ? 700 : 400 }}>{l.label}</span>
                      {i === langIdx && <span style={{ marginLeft: "auto", color: "#38bdf8", fontSize: "14px" }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clear chat */}
            <button onClick={clearChat} title="Clear chat"
              style={{
                width: "30px", height: "30px", borderRadius: "8px",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              <Trash2 style={{ width: 12, height: 12, color: "rgba(255,255,255,0.4)" }} />
            </button>
          </div>
        </div>

        {/*  Voice Mode Banner  */}
        {voiceMode && (
          <div style={{
            padding: "8px 18px", background: "rgba(34,211,238,0.06)",
            borderBottom: "1px solid rgba(34,211,238,0.15)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0, position: "relative", zIndex: 2,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "7px", height: "7px", borderRadius: "50%", background: isRecording ? "#22d3ee" : "#64748b",
                boxShadow: isRecording ? "0 0 10px #22d3ee" : "none",
                animation: isRecording ? "dotPulse 0.6s ease-in-out infinite alternate" : "none",
              }} />
              <span style={{ fontSize: "14px", color: "#22d3ee", fontWeight: 700 }}>
                {isRecording ? "Listening — speak now" : orbState === "thinking" ? "Processing…" : orbState === "speaking" ? "Speaking…" : "Voice mode active"}
              </span>
              {isRecording && <span style={{ fontSize: "14px", color: "rgba(34,211,238,0.6)", fontWeight: 600 }}>● REC</span>}

              {detectedLang && detectedLang !== lang.code && (
                <span style={{ fontSize: "14px", padding: "2px 7px", borderRadius: "10px", background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", color: "#c4b5fd", fontWeight: 700 }}>
                  Detected: {detectedLang.toUpperCase()}
                </span>
              )}
            </div>
            <button onClick={toggleVoiceMode}
              style={{
                fontSize: "14px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px",
                background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
                color: "#f87171", cursor: "pointer",
              }}>
              Stop Voice
            </button>
          </div>
        )}

        {/* Orb + state label */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "16px", paddingBottom: "8px",
          flexShrink: 0, position: "relative", zIndex: 2,
        }}>
          {/* Clickable orb  tap to start recording in voice mode */}
          <div
            onClick={() => {
              if (voiceMode && !isRecording && orbState === "idle") startListeningLoop();
              else if (!voiceMode) toggleVoiceMode();
            }}
            style={{ cursor: "pointer", position: "relative" }}
            title={voiceMode ? "Tap to speak" : "Start voice conversation"}
          >
            <AIOrb state={orbState} />
            {/* Tap hint ring */}
            {!voiceMode && (
              <div style={{
                position: "absolute", inset: "-8px", borderRadius: "50%",
                border: "1.5px dashed rgba(56,189,248,0.25)",
                animation: "orbIdle 3s ease-in-out infinite",
                pointerEvents: "none",
              }} />
            )}
          </div>
          <div style={{
            marginTop: "8px", display: "flex", alignItems: "center", gap: "6px",
            padding: "4px 12px", borderRadius: "20px",
            background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.12)",
          }}>
            <div style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: orbState === "idle" ? "#64748b" : orbState === "listening" ? "#22d3ee" : orbState === "thinking" ? "#a78bfa" : "#34d399",
              animation: orbState !== "idle" ? "dotPulse 0.8s ease-in-out infinite alternate" : "none",
            }} />
            <span style={{ fontSize: "14px", color: "rgba(56,189,248,0.8)", fontWeight: 600 }}>
              {stateLabel[orbState]}
            </span>
          </div>
          {!voiceMode && (
            <button
              onClick={toggleVoiceMode}
              style={{
                marginTop: "8px", padding: "6px 16px", borderRadius: "20px",
                background: "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(56,189,248,0.1))",
                border: "1px solid rgba(34,211,238,0.3)", color: "#22d3ee",
                fontSize: "14px", fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: "5px",
                boxShadow: "0 0 16px rgba(34,211,238,0.1)", transition: "all 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(34,211,238,0.22)")}
              onMouseLeave={e => (e.currentTarget.style.background = "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(56,189,248,0.1))")}
            >
              <Mic style={{ width: 12, height: 12 }} />
              Start Voice Chat
            </button>
          )}
        </div>

        {/* Quick prompt chips */}
        {messages.length === 1 && (
          <div style={{
            padding: "0 14px 8px", display: "flex", flexWrap: "wrap", gap: "6px",
            justifyContent: "center", flexShrink: 0, position: "relative", zIndex: 2,
          }}>
            {lang.quickPrompts.map((p, i) => (
              <button key={i} onClick={() => sendMessage(p)}
                style={{
                  fontSize: "14px", fontWeight: 600, padding: "5px 12px", borderRadius: "20px",
                  background: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.18)",
                  color: "#38bdf8", cursor: "pointer", transition: "all 0.15s",
                  animation: `bubbleIn 0.4s ease ${i * 0.08}s both`,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(56,189,248,0.15)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(56,189,248,0.07)"; }}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/*  Auto-escalation card  */}
        {escalationOffered && !autoEscalated && (
          <div style={{
            margin: "0 14px 8px", padding: "12px 14px", borderRadius: "12px",
            background: "linear-gradient(135deg,rgba(251,191,36,0.1),rgba(245,158,11,0.06))",
            border: "1px solid rgba(251,191,36,0.3)",
            flexShrink: 0, position: "relative", zIndex: 2,
            animation: "bubbleIn 0.35s ease",
          }}>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#fbbf24", marginBottom: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
              <AlertCircle style={{ width: 12, height: 12 }} />
              Issue not resolved after {unresolvedTurns} turns
            </p>
            <p style={{ fontSize: "14px", color: "rgba(251,191,36,0.8)", marginBottom: "10px", lineHeight: 1.5 }}>
              Would you like to log this as a support ticket so an agent can follow up?
            </p>
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={handleLogTicket}
                style={{
                  flex: 1, height: "30px", borderRadius: "8px", border: "none",
                  background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "white",
                  fontSize: "14px", fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                }}>
                <TicketIcon style={{ width: 11, height: 11 }} /> Yes, Create Ticket
              </button>
              <button onClick={() => setEscalationOffered(false)}
                style={{
                  padding: "0 12px", height: "30px", borderRadius: "8px",
                  background: "transparent", border: "1px solid rgba(251,191,36,0.2)",
                  color: "rgba(251,191,36,0.6)", fontSize: "14px", cursor: "pointer",
                }}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Auto-escalated banner */}
        {autoEscalated && escalatedTicketId && (
          <div style={{
            margin: "0 14px 8px", padding: "10px 14px", borderRadius: "10px",
            background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)",
            flexShrink: 0, position: "relative", zIndex: 2,
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <CheckCircle2 style={{ width: 14, height: 14, color: "#34d399" }} />
            <div>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#34d399", margin: 0 }}>Ticket auto-created: {escalatedTicketId}</p>
              <p style={{ fontSize: "14px", color: "rgba(52,211,153,0.7)", margin: 0 }}>An agent will follow up on your issue</p>
            </div>
          </div>
        )}

        {/* Chat messages */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "8px 14px 4px",
          display: "flex", flexDirection: "column", gap: "12px",
          position: "relative", zIndex: 2,
        }}>
        {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <BotBubble
                msg={msg}
                isBot={msg.role === "assistant"}
                userName={user?.name || "You"}
                onSuggestedReply={(text) => sendMessage(text)}
              />
            </div>
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={chatEndRef} />
        </div>

        {/* Log as ticket button */}
        {messages.length > 2 && (
          <div style={{ padding: "6px 14px 0", position: "relative", zIndex: 2 }}>
            <button onClick={handleLogTicket}
              style={{
                width: "100%", height: "30px", borderRadius: "8px", border: "1px solid rgba(56,189,248,0.2)",
                background: "rgba(56,189,248,0.06)", color: "#38bdf8", fontSize: "14px", fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(56,189,248,0.12)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(56,189,248,0.06)"; }}
            >
              <TicketIcon style={{ width: 12, height: 12 }} />
              Log this as a Support Ticket
            </button>
          </div>
        )}

        {/* Input area */}
        <div style={{
          padding: "10px 14px 14px", borderTop: "1px solid rgba(56,189,248,0.08)",
          background: "rgba(6,13,26,0.8)", flexShrink: 0, position: "relative", zIndex: 2,
        }}>
          <div style={{
            display: "flex", gap: "6px", alignItems: "flex-end",
            background: "rgba(56,189,248,0.04)", border: "1px solid rgba(56,189,248,0.15)",
            borderRadius: "12px", padding: "8px 10px", transition: "border-color 0.2s",
          }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = "rgba(56,189,248,0.4)")}
            onBlurCapture={e => (e.currentTarget.style.borderColor = "rgba(56,189,248,0.15)")}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={voiceMode ? "Voice mode active — or type here" : lang.placeholder}
              rows={1}
              disabled={orbState === "thinking"}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none", resize: "none",
                fontSize: "14px", color: "white", fontFamily: "inherit", lineHeight: 1.5,
                maxHeight: "80px", overflowY: "auto",
              }}
            />
            {/* Voice toggle button */}
            <button
              onClick={toggleVoiceMode}
              title={voiceMode ? "Stop voice mode" : "Start voice conversation"}
              style={{
                width: "32px", height: "32px", borderRadius: "9px", border: "none", flexShrink: 0,
                background: voiceMode
                  ? isRecording
                    ? "linear-gradient(135deg,#ef4444,#dc2626)"
                    : "linear-gradient(135deg,#22d3ee,#38bdf8)"
                  : "rgba(56,189,248,0.12)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: voiceMode ? "0 0 16px rgba(34,211,238,0.5)" : "none",
                animation: isRecording ? "dotPulse 0.6s ease-in-out infinite alternate" : "none",
                transition: "all 0.2s",
              }}
            >
              {voiceMode
                ? <StopCircle style={{ width: 14, height: 14, color: "white" }} />
                : <Mic style={{ width: 14, height: 14, color: "#38bdf8" }} />
              }
            </button>
            {/* Send button */}
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || orbState === "thinking"}
              style={{
                width: "32px", height: "32px", borderRadius: "9px", border: "none", flexShrink: 0,
                background: !input.trim() || orbState === "thinking"
                  ? "rgba(56,189,248,0.1)"
                  : "linear-gradient(135deg,#38bdf8,#818cf8)",
                cursor: !input.trim() || orbState === "thinking" ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: input.trim() && orbState !== "thinking" ? "0 0 16px rgba(56,189,248,0.4)" : "none",
                transition: "all 0.2s",
              }}
            >
              {orbState === "thinking"
                ? <Loader2 style={{ width: 13, height: 13, color: "#38bdf8", animation: "spin 0.8s linear infinite" }} />
                : <Send style={{ width: 13, height: 13, color: "white" }} />
              }
            </button>
          </div>
          <p style={{ fontSize: "14px", color: "rgba(56,189,248,0.3)", textAlign: "center", marginTop: "5px", fontWeight: 500 }}>
            ↵ send · Shift+↵ new line · tap 🎤 for voice conversation
          </p>
        </div>

        {/* Click outside lang menu */}
        {showLangMenu && <div onClick={() => setShowLangMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />}
      </div>

      <NewTicketModal
        open={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        onCreated={t => {
          onTicketCreated(t);
          // Inject the real ticket ID into chat history so future questions
          // like "what's the status of my ticket" resolve correctly
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `Ticket ${t.ticket_id} has been created. Status: Open. You can ask me about this ticket anytime by mentioning the ID.`,
            ts: Date.now(),
          }]);
          setShowTicketModal(false);
        }}
        prefillQuery={ticketPrefill}
        prefillName={user?.name || ""}
      />
    </>
  );
}

//  Main Helpline Page 
function Helpline() {
  const { user } = useAuth();
  const isStaff = user?.role === "admin" || user?.role === "officer";

  const [tickets, setTickets]           = useState<Ticket[]>([]);
  const [counts, setCounts]             = useState<Counts>({ Open: 0, Pending: 0, Resolved: 0, All: 0 });
  const [loading, setLoading]           = useState(true);
  const [activeQueue, setActiveQueue]   = useState("All");
  const [search, setSearch]             = useState("");
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [newOpen, setNewOpen]           = useState(false);

  const fetchTickets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (!isStaff && user?.id) p.set("submitted_by", user.id);
      const res = await fetch(`${API_BASE}/live/helpline/tickets?${p}`);
      const data = await res.json();
      setTickets(data.tickets || []); setCounts(data.counts || { Open:0, Pending:0, Resolved:0, All:0 });
      if (activeTicket) {
        const tr = await fetch(`${API_BASE}/live/helpline/ticket/${activeTicket.ticket_id}`);
        if (tr.ok) setActiveTicket(await tr.json());
      }
    } catch { if (!silent) toast.error("Failed to load"); } finally { setLoading(false); }
  }, [search, activeTicket?.ticket_id, user?.id, isStaff]);

  useEffect(() => { fetchTickets(); const id = setInterval(() => fetchTickets(true), 5000); return () => clearInterval(id); }, []);
  useEffect(() => { const t = setTimeout(() => fetchTickets(), 300); return () => clearTimeout(t); }, [search]);

  const selectTicket = async (t: Ticket) => {
    try {
      const r = await fetch(`${API_BASE}/live/helpline/ticket/${t.ticket_id}`);
      setActiveTicket(r.ok ? await r.json() : t);
    } catch { setActiveTicket(t); }
  };

  const filtered = activeQueue === "All" ? tickets : tickets.filter(t => t.status === activeQueue);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 6rem)", overflow: "hidden", background: "transparent", position: "relative" }} className="bg-transparent">

      {/*  Ambient background  */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.55,
        backgroundImage: `
          radial-gradient(circle at 15% 25%, rgba(139,92,246,0.10), transparent 35%),
          radial-gradient(circle at 85% 65%, rgba(99,102,241,0.09), transparent 35%),
          radial-gradient(circle at 50% 85%, rgba(34,211,238,0.06), transparent 30%)
        `,
      }} />
      <div style={{
        position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(rgba(148,163,184,0.12) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }} />

      {/*  LEFT: Ticket Dashboard  */}
      <div style={{ flex: "0 0 58%", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 1 }}>

        {/* Premium Command-Center Hero Header */}
        <div className="relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-cyan-500/5 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none"></div>
          
          <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/60 bg-white/40 backdrop-blur-3xl shadow-sm">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 bg-teal-400 blur-xl opacity-40 rounded-full animate-pulse" />
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-100/50 border border-teal-200/50 flex items-center justify-center shadow-lg shadow-teal-500/20 relative z-10 backdrop-blur-xl">
                  <Headphones className="w-7 h-7 text-teal-600" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-800 mb-1">
                  Public Helpline
                </h1>
                <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
                  Citizen Support Dashboard
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-700 text-sm font-bold border border-emerald-200/50 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live System
                  </span>
                </p>
              </div>
            </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets…"
                className="w-[200px] h-10 pl-9 pr-8 bg-white/70 backdrop-blur-md border border-white/60 rounded-xl text-sm text-slate-800 outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-300 transition-all placeholder:text-slate-400 shadow-sm" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200/50 rounded-full transition-colors cursor-pointer border-none bg-transparent">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
            <button onClick={() => fetchTickets()}
              className="w-10 h-10 rounded-xl border border-white/60 bg-white/70 backdrop-blur-md flex items-center justify-center shadow-sm hover:bg-white/90 transition-all cursor-pointer">
              <RefreshCw className={`w-4 h-4 text-teal-600 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => setNewOpen(true)}
              className="h-10 px-5 rounded-xl border border-teal-500/30 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold flex items-center gap-2 shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> New
            </button>
          </div>
          </div>
        </div>

        {/* KPI Stat cards  matching grievances page style */}
        <div style={{ display: "flex", gap: "10px", padding: "14px 24px 0", flexShrink: 0 }}>
          {[
            { label: "All",      count: counts.All,      icon: Inbox,        color: "#7c3aed", from: "#ede9fe", to: "#ddd6fe", border: "#c4b5fd", q: "All" },
            { label: "Open",     count: counts.Open,     icon: AlertCircle,  color: "#4f46e5", from: "#eef2ff", to: "#e0e7ff", border: "#a5b4fc", q: "Open" },
            { label: "Pending",  count: counts.Pending,  icon: Clock,        color: "#b45309", from: "#fffbeb", to: "#fef3c7", border: "#fcd34d", q: "Pending" },
            { label: "Resolved", count: counts.Resolved, icon: CheckCircle2, color: "#047857", from: "#ecfdf5", to: "#d1fae5", border: "#6ee7b7", q: "Resolved" },
          ].map(({ label, count, icon: Icon, color, from, to, border, q }) => {
            const active = activeQueue === q;
            return (
              <button key={label} onClick={() => setActiveQueue(q)} style={{
                flex: label === "All" ? "0 0 auto" : 1,
                padding: "12px 16px", borderRadius: "14px", textAlign: "left", cursor: "pointer",
                background: active
                  ? `linear-gradient(135deg,${from},${to})`
                  : "rgba(255,255,255,0.7)",
                border: active ? `1.5px solid ${border}` : "1px solid rgba(255,255,255,0.6)",
                backdropFilter: "blur(10px)",
                boxShadow: active ? `0 4px 16px ${border}55` : "0 1px 4px rgba(0,0,0,0.04)",
                display: "flex", alignItems: "center", gap: "12px",
                transition: "all 0.2s",
              }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"; }}
              >
                <div style={{
                  width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
                  background: active ? `${border}33` : `${from}`,
                  border: `1px solid ${border}55`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon style={{ width: 16, height: 16, color }} />
                </div>
                <div>
                  <p style={{ fontSize: "24px", fontWeight: 800, color: active ? color : "#1e293b", margin: 0, lineHeight: 1 }}>{count}</p>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: active ? color : "#64748b", margin: 0 }}>{label}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Ticket grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 22px 22px" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "160px" }}>
              <Loader2 style={{ width: 24, height: 24, color: "#a78bfa" }} className="animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "160px", gap: "12px" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Inbox style={{ width: 22, height: 22, color: "rgba(139,92,246,0.4)" }} />
              </div>
              <p style={{ fontSize: "14px", color: "var(--color-muted-foreground)", fontWeight: 500 }}>No tickets found</p>
              <button onClick={() => setNewOpen(true)}
                style={{ padding: "7px 18px", borderRadius: "9px", background: "linear-gradient(135deg,rgba(139,92,246,0.2),rgba(99,102,241,0.1))", border: "1px solid rgba(139,92,246,0.25)", color: "#a78bfa", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>
                <Plus className="w-3.5 h-3.5 inline mr-1" />Create Ticket
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
              {filtered.map(t => (
                <TicketCard key={t.ticket_id} t={t} onClick={() => selectTicket(t)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/*  RIGHT: AI Bot Panel  */}
      <div style={{ flex: "0 0 42%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <AIBotPanel onTicketCreated={t => { setTickets(p => [t, ...p]); fetchTickets(true); }} />
      </div>

      {/* Conversation Drawer */}
      {activeTicket && (
        <ConversationDrawer
          ticket={activeTicket}
          onClose={() => setActiveTicket(null)}
          onUpdate={() => fetchTickets(true)}
        />
      )}

      <NewTicketModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={t => { setTickets(p => [t, ...p]); setActiveTicket(t); }}
      />

      <style>{`
        /* ── Core sphere pulse animations ── */
        /* ── Orb heartbeat — whole orb scales as one unit ── */
        @keyframes orbHeartbeat {
          0%   { transform: scale(1);    }
          14%  { transform: scale(1.18); }
          28%  { transform: scale(1);    }
          42%  { transform: scale(1.1);  }
          56%  { transform: scale(1);    }
          100% { transform: scale(1);    }
        }
        /* ── Idle gentle breath ── */
        @keyframes orbIdle { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }

        /* ── Wave bars (listening / speaking) ── */
        @keyframes waveBar { 0% { transform: scaleY(0.35); opacity: 0.55; } 100% { transform: scaleY(1.6); opacity: 1; } }

        /* ── Thinking spinner ── */
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* ── Chat bubbles ── */
        @keyframes typingDot { 0%,60%,100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-6px); opacity: 1; } }
        @keyframes bubbleIn  { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }

        /* ── Background particles ── */
        @keyframes floatParticle { from { transform: translateY(0) translateX(0); opacity: 0.15; } to { transform: translateY(-12px) translateX(6px); opacity: 0.35; } }

        /* ── Drawer / overlay ── */
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }

        /* ── Live dot ── */
        @keyframes pulse { 0%,100% { box-shadow: 0 0 6px rgba(34,197,94,0.6); } 50% { box-shadow: 0 0 14px rgba(34,197,94,0.9); } }

        /* ── Voice mode dot pulse ── */
        @keyframes dotPulse { 0% { opacity: 0.5; transform: scale(0.85); } 100% { opacity: 1; transform: scale(1.2); } }

        /* ── Online indicator pulse ── */
        @keyframes onlinePulse { 0%,100% { box-shadow: 0 0 4px rgba(34,197,94,0.5); opacity: 1; } 50% { box-shadow: 0 0 10px rgba(34,197,94,0.9); opacity: 0.8; } }
      `}</style>
    </div>
  );
}
