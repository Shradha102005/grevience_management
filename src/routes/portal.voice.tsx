import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Terminal, Command, Sparkles, Building2, Landmark, 
  MapPin, MessageSquareWarning, Briefcase, FileText, X, ChevronRight, Mic,
  LayoutDashboard, Siren, Megaphone, PhoneCall, Sprout, Leaf
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VoiceOrb, type VoiceOrbState } from "@/components/portal/voice-orb";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/voice")({
  component: VoiceAssistant,
});

const QUICK_ACTIONS = [
  { icon: Landmark, label: "Lookup Scheme Eligibility", color: "#10b981" },
  { icon: Building2, label: "Check Smart City Alerts", color: "#3b82f6" },
  { icon: MessageSquareWarning, label: "Review Grievances", color: "#f59e0b" },
  { icon: Briefcase, label: "Generate Outreach Campaign", color: "#8b5cf6" },
];

function VoiceAssistant() {
  const [orbState, setOrbState] = useState<VoiceOrbState>("idle");
  const [transcript, setTranscript] = useState("Hi. How can I help you today?");
  const [queryInput, setQueryInput] = useState("");
  const [results, setResults] = useState<any>(null);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const navigate = useNavigate();

  // Refs to avoid React state closure traps inside event handlers
  const orbStateRef = useRef(orbState);
  const latestTranscriptRef = useRef("");

  useEffect(() => {
    orbStateRef.current = orbState;
  }, [orbState]);

  // Clean up SpeechSynthesis when navigating away or unmounting
  useEffect(() => {
    return () => {
      synthRef.current?.cancel();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    
    // Pick a premium voice or fallback to native BCP-47 match
    const voices = synthRef.current.getVoices();
    const premiumVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Premium") || v.lang === "en-US");
    if (premiumVoice) utterance.voice = premiumVoice;

    utterance.onend = () => setOrbState("idle");
    utterance.onerror = () => setOrbState("idle");

    synthRef.current.speak(utterance);
  }, []);

  const handleProcessQuery = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setOrbState("processing");
    setTranscript(text);

    try {
      const res = await fetch("http://localhost:8000/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "voice",
          message: text,
          language: "en",
          history: [],
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const reply = data.reply || "I didn't receive a response from the service. Please try again.";

      // Dynamically determine matching system modules based on query or response keywords
      const lowerQuery = text.toLowerCase();
      let intent = "Voice Assistant Help";
      let actions: Array<{ label: string; route: string; icon: any; color: string }> = [];

      if (lowerQuery.includes("scheme") || lowerQuery.includes("eligibility") || lowerQuery.includes("welfare") || lowerQuery.includes("apply")) {
        intent = "Scheme Discovery & Eligibility";
        actions = [
          { label: "Search Schemes via AI", route: "/portal/scheme-ai", icon: Landmark, color: "#10b981" },
          { label: "View Portal Dashboard", route: "/portal", icon: LayoutDashboard, color: "#6366f1" }
        ];
      } else if (lowerQuery.includes("grievance") || lowerQuery.includes("complaint") || lowerQuery.includes("report") || lowerQuery.includes("status")) {
        intent = "Grievance & Issue Resolution";
        actions = [
          { label: "Check Grievances Dashboard", route: "/portal/grievances", icon: MessageSquareWarning, color: "#f59e0b" },
          { label: "Go to Dashboard", route: "/portal", icon: LayoutDashboard, color: "#6366f1" }
        ];
      } else if (lowerQuery.includes("traffic") || lowerQuery.includes("city") || lowerQuery.includes("water") || lowerQuery.includes("power") || lowerQuery.includes("municipal") || lowerQuery.includes("road")) {
        intent = "Municipal Services & Smart City";
        actions = [
          { label: "View Municipal Services", route: "/portal/municipal", icon: Building2, color: "#3b82f6" },
          { label: "View Smart City Dashboard", route: "/portal/smart-city", icon: Building2, color: "#06b6d4" }
        ];
      } else if (lowerQuery.includes("rural") || lowerQuery.includes("panchayat") || lowerQuery.includes("village") || lowerQuery.includes("mgnrega")) {
        intent = "Rural Welfare & Schemes";
        actions = [
          { label: "Go to Rural Portal", route: "/portal/rural", icon: Sprout, color: "#84cc16" }
        ];
      } else if (lowerQuery.includes("crop") || lowerQuery.includes("soil") || lowerQuery.includes("farm") || lowerQuery.includes("agriculture") || lowerQuery.includes("pest")) {
        intent = "Agriculture Advisor";
        actions = [
          { label: "Get Crop Diagnosis", route: "/portal/agriculture", icon: Leaf, color: "#16a34a" }
        ];
      } else if (lowerQuery.includes("disaster") || lowerQuery.includes("weather") || lowerQuery.includes("emergency") || lowerQuery.includes("alert") || lowerQuery.includes("flood") || lowerQuery.includes("cyclone")) {
        intent = "Disaster & Emergency Alerts";
        actions = [
          { label: "View Live Alerts", route: "/portal/disaster", icon: Siren, color: "#ef4444" }
        ];
      } else if (lowerQuery.includes("campaign") || lowerQuery.includes("election") || lowerQuery.includes("outreach") || lowerQuery.includes("speech")) {
        intent = "Public Campaigns & Election";
        actions = [
          { label: "Campaign & Outreach manager", route: "/portal/election", icon: Megaphone, color: "#a855f7" }
        ];
      } else if (lowerQuery.includes("help") || lowerQuery.includes("helpline") || lowerQuery.includes("support")) {
        intent = "Citizen Support Helpline";
        actions = [
          { label: "Connect with Helpline Chat", route: "/portal/helpline", icon: PhoneCall, color: "#ec4899" }
        ];
      } else {
        // General fallback
        intent = "CivicSaathi Unified Assistant";
        actions = [
          { label: "Explore Portal Dashboard", route: "/portal", icon: LayoutDashboard, color: "#6366f1" },
          { label: "Ask Helpline", route: "/portal/helpline", icon: PhoneCall, color: "#ec4899" }
        ];
      }

      setResults({
        intent,
        summary: reply,
        actions
      });

      setOrbState("speaking");
      speak(reply);

    } catch (err) {
      console.error("AI voice query error:", err);
      const errorMsg = "I'm having trouble communicating with the backend. Please ensure the server is running.";
      setTranscript(errorMsg);
      setOrbState("idle");
      toast.error("Failed to connect to backend AI Chat service.");
    }
  }, [speak]);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    
    // Initialize SpeechRecognition if available
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      recognitionRef.current = new SpeechRec();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setOrbState("listening");
        setResults(null);
        setTranscript("Listening...");
        latestTranscriptRef.current = "";
      };

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);
        latestTranscriptRef.current = transcriptText;
      };

      recognitionRef.current.onend = () => {
        // Use ref to read current state and avoid stale closure bug
        if (orbStateRef.current === "listening") {
          const spoken = latestTranscriptRef.current.trim();
          if (spoken) {
            handleProcessQuery(spoken);
          } else {
            setOrbState("idle");
            setTranscript("I didn't catch that. Tap the orb to try again.");
          }
        }
      };

      recognitionRef.current.onerror = (e: any) => {
        if (e.error === 'not-allowed') toast.error("Microphone access denied.");
        setOrbState("idle");
        setTranscript("Tap the orb to try again.");
      };
    }
  }, [handleProcessQuery]);

  const toggleVoice = () => {
    if (orbState === "listening") {
      recognitionRef.current?.stop();
    } else if (orbState === "idle" || orbState === "speaking" || orbState === "processing") {
      synthRef.current?.cancel();
      if (!recognitionRef.current) {
        toast.error("Speech recognition not supported in this browser.");
        return;
      }
      try {
        recognitionRef.current.start();
      } catch {
        recognitionRef.current.stop();
        setTimeout(() => recognitionRef.current.start(), 200);
      }
    }
  };

  // Sync text input with manual submit
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim()) return;
    const text = queryInput;
    setTranscript(text);
    setQueryInput("");
    handleProcessQuery(text);
  };

  return (
    <div className="relative flex flex-col h-[calc(100vh-4rem)] overflow-hidden font-sans bg-transparent items-center justify-center animate-in fade-in duration-500">
      
      {/*  Ambient Background Gradients  */}
      <div className="absolute inset-0 pointer-events-none transition-all duration-1000 z-0" style={{
        background: orbState === "listening" ? "radial-gradient(circle at 50% 50%, rgba(239,68,68,0.2) 0%, transparent 60%)" :
                    orbState === "processing" ? "radial-gradient(circle at 50% 50%, rgba(168,85,247,0.2) 0%, transparent 60%)" :
                    orbState === "speaking" ? "radial-gradient(circle at 50% 50%, rgba(59,130,246,0.2) 0%, transparent 60%)" :
                    "radial-gradient(circle at 50% 50%, rgba(139,92,246,0.1) 0%, transparent 60%)",
      }}>
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 dark:bg-indigo-900/20 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-violet-500/10 dark:bg-violet-900/20 blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(148,163,184,0.1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      </div>

      {/*  Top Header  */}
      <div className="absolute top-0 left-0 right-0 px-6 lg:px-10 py-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-[1.25rem] bg-white/60 backdrop-blur-2xl shadow-xl shadow-slate-200/40 border border-white/60 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-violet-600 animate-pulse" />
          </div>
          <span className="text-base font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600">AI Command Center</span>
        </div>
        {orbState !== "idle" && (
          <div className="bg-white/60 backdrop-blur-2xl border border-white/60 shadow-xl px-4 py-2 rounded-full flex items-center gap-2 animate-in fade-in">
            <span className={`w-2.5 h-2.5 rounded-full animate-ping ${orbState === 'listening' ? 'bg-red-500' : orbState === 'speaking' ? 'bg-blue-500' : 'bg-purple-500'}`} />
            <span className="text-sm font-bold text-slate-700 tracking-widest uppercase">{orbState}</span>
          </div>
        )}
      </div>

      {/*  Center Stage (Orb + Transcript + Result)  */}
      <div className="z-10 flex flex-col items-center w-full max-w-4xl px-6 relative mt-12">
        
        {/* The Voice Orb */}
        <div className="transition-all duration-700 ease-out" style={{ 
          transform: results ? "scale(0.7) translateY(-30px)" : "scale(1.2) translateY(0)",
          marginBottom: results ? "2rem" : "4rem"
        }}>
          <VoiceOrb state={orbState} onClick={toggleVoice} size="lg" className="shadow-[0_20px_60px_-15px_rgba(139,92,246,0.3)] rounded-full cursor-pointer hover:scale-105 transition-transform" />
        </div>

        {/* Live Transcript / Response */}
        <div style={{ textAlign: "center", minHeight: "80px", display: "flex", flexDirection: "column", justifyContent: "center", transition: "all 0.3s" }}>
          <h2 style={{ 
            fontSize: results ? "20px" : "32px", 
            fontWeight: results ? 600 : 700, 
            letterSpacing: "-0.02em", 
            color: orbState === "listening" ? "#0f172a" : "#475569",
            lineHeight: 1.4,
            transition: "all 0.3s"
          }}>
            {transcript}
          </h2>
        </div>

        {/* Result Card (Slides in when AI responds) */}
        {results && (
          <div className="animate-in slide-in-from-bottom-10 fade-in duration-500 w-full mt-10">
            <Card className="bg-white/60 backdrop-blur-3xl rounded-[2rem] p-8 md:p-10 border border-white/60 shadow-2xl shadow-slate-200/50">
              <div className="flex items-center gap-3 mb-2">
                <Command className="w-6 h-6 text-violet-600" />
                <h3 className="text-sm font-black tracking-widest text-slate-500 uppercase">{results.intent}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.actions?.map((action: any, i: number) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => navigate({ to: action.route })}
                      className="group flex items-center gap-5 p-6 bg-white rounded-2xl border border-slate-100/50 transition-all text-left w-full cursor-pointer shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:shadow-violet-500/10 hover:-translate-y-1 hover:border-violet-100"
                    >
                      <div className="w-14 h-14 rounded-[1.25rem] flex items-center justify-center shrink-0" style={{ background: `${action.color}15`, color: action.color }}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-base font-extrabold text-slate-800 truncate group-hover:text-violet-600 transition-colors">{action.label}</span>
                        <span className="text-sm font-bold text-slate-400">Tap to open module</span>
                      </div>
                      <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/*  Bottom Input & Help  */}
      <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-6 z-20 w-full px-6">
        
        {/* Quick Actions Carousel */}
        {!results && orbState === "idle" && (
          <div className="flex gap-4 flex-wrap justify-center animate-in fade-in slide-in-from-bottom-4 max-w-4xl mx-auto">
            {QUICK_ACTIONS.map((action, i) => (
              <button 
                key={i}
                onClick={() => setQueryInput(action.label)}
                className="flex items-center gap-2.5 px-5 py-3 bg-white/60 backdrop-blur-2xl rounded-full border border-white/60 text-sm font-bold text-slate-600 cursor-pointer shadow-xl shadow-slate-200/40 hover:bg-white hover:scale-105 transition-all"
              >
                <action.icon className="w-4 h-4" style={{ color: action.color }} />
                {action.label}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleTextSubmit} className="relative w-full max-w-2xl mx-auto">
          <div className="relative shadow-2xl shadow-slate-300/30 rounded-[2rem]">
            <Terminal className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
            <input 
              type="text" 
              placeholder="Or type your command here..."
              value={queryInput}
              onChange={e => setQueryInput(e.target.value)}
              className="w-full h-16 pl-16 pr-20 bg-white/70 backdrop-blur-3xl border border-white/60 rounded-[2rem] text-base font-bold text-slate-800 outline-none focus:ring-4 focus:ring-violet-500/20 focus:border-violet-300 transition-all placeholder:text-slate-400 placeholder:font-semibold shadow-inner"
            />
            <button 
              type="submit"
              disabled={!queryInput.trim()}
              className={`absolute right-3 top-2.5 w-11 h-11 rounded-[1.25rem] flex items-center justify-center transition-all ${
                queryInput.trim() 
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30 hover:scale-105 cursor-pointer" 
                  : "bg-slate-100 text-slate-300 cursor-default"
              }`}
            >
              <Command className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes pulseGlow { 0% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.9); } 100% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.1); } }
        @keyframes slideUpFade { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
