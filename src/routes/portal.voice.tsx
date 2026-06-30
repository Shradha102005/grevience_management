import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Terminal, Command, Sparkles, Building2, Landmark, 
  MapPin, MessageSquareWarning, Briefcase, FileText, X, ChevronRight, Mic
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
      };

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);
      };

      recognitionRef.current.onend = () => {
        if (orbState === "listening") {
          // If we stopped naturally, process the query
          handleProcessQuery();
        }
      };

      recognitionRef.current.onerror = (e: any) => {
        if (e.error === 'not-allowed') toast.error("Microphone access denied.");
        setOrbState("idle");
        setTranscript("Tap the orb to try again.");
      };
    }
  }, []);

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

  const handleProcessQuery = useCallback(() => {
    setOrbState("processing");
    // Simulate AI processing the voice or text intent
    setTimeout(() => {
      const responseText = "I found 3 active high-priority traffic alerts in Sector 4. The main congestion is at MG Road due to an accident reported 15 minutes ago. Would you like me to dispatch traffic police?";
      
      setResults({
        intent: "Traffic Incident Analysis",
        summary: responseText,
        actions: [
          { label: "Dispatch Traffic Police", icon: Terminal, color: "#ef4444" },
          { label: "View Smart Dashboard", icon: Building2, color: "#3b82f6" },
        ]
      });

      setOrbState("speaking");
      speak(responseText);
    }, 1500);
  }, []);

  // Sync text input with manual submit
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim()) return;
    setTranscript(queryInput);
    setQueryInput("");
    handleProcessQuery();
  };

  const speak = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    
    // Pick a nice voice if available
    const voices = synthRef.current.getVoices();
    const premiumVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Premium") || v.lang === "en-US");
    if (premiumVoice) utterance.voice = premiumVoice;

    utterance.onend = () => setOrbState("idle");
    utterance.onerror = () => setOrbState("idle");

    synthRef.current.speak(utterance);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      synthRef.current?.cancel();
      if (orbState === "listening") recognitionRef.current?.stop();
    };
  }, []);

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "calc(100vh - 4rem)", overflow: "hidden", background: "#f8fafc", color: "#0f172a", alignItems: "center", justifyItems: "center", justifyContent: "center" }} className="-m-6">
      
      {/* ── Ambient Background Gradients ── */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.6, pointerEvents: "none", filter: "blur(80px)" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", width: "40vw", height: "40vw", transform: "translate(-50%, -50%)", borderRadius: "50%",
          background: orbState === "listening" ? "radial-gradient(circle, rgba(239,68,68,0.25) 0%, rgba(255,255,255,0) 70%)" :
                      orbState === "processing" ? "radial-gradient(circle, rgba(168,85,247,0.25) 0%, rgba(255,255,255,0) 70%)" :
                      orbState === "speaking" ? "radial-gradient(circle, rgba(59,130,246,0.25) 0%, rgba(255,255,255,0) 70%)" :
                      "radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(255,255,255,0) 70%)",
          transition: "all 1s ease-in-out",
          animation: orbState !== "idle" ? "pulseGlow 3s infinite alternate" : "none"
        }} />
      </div>

      {/* ── Top Header ── */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <Sparkles style={{ width: 16, height: 16, color: "#8b5cf6" }} />
          </div>
          <span style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "0.05em", color: "#0f172a" }}>AI Command Center</span>
        </div>
        {orbState !== "idle" && (
          <Badge variant="outline" className="bg-white text-slate-800 border-slate-200 shadow-sm animate-in fade-in" style={{ padding: "4px 10px", fontSize: "10px", letterSpacing: "0.1em" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: orbState === 'listening' ? '#ef4444' : orbState === 'speaking' ? '#3b82f6' : '#a855f7', display: "inline-block", marginRight: "6px", animation: "ping 1.5s infinite" }} />
            {orbState.toUpperCase()}
          </Badge>
        )}
      </div>

      {/* ── Center Stage (Orb + Transcript + Result) ── */}
      <div style={{ zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "800px", padding: "0 24px" }}>
        
        {/* The Voice Orb */}
        <div style={{ marginBottom: results ? "40px" : "60px", transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)", transform: results ? "scale(0.8) translateY(-20px)" : "scale(1) translateY(0)" }}>
          <VoiceOrb state={orbState} onClick={toggleVoice} size="lg" className="shadow-[0_10px_40px_rgba(139,92,246,0.2)] rounded-full" />
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
          <div style={{ width: "100%", marginTop: "32px", animation: "slideUpFade 0.6s cubic-bezier(0.16,1,0.3,1)" }}>
            <Card style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "24px", overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Terminal style={{ width: 14, height: 14, color: "#3b82f6" }} />
                  <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b" }}>{results.intent}</span>
                </div>
                <button onClick={() => { setResults(null); setTranscript("Hi. How can I help you today?"); }} style={{ width: "24px", height: "24px", borderRadius: "12px", background: "#f1f5f9", border: "none", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X style={{ width: 12, height: 12 }} /></button>
              </div>
              <div style={{ padding: "24px" }}>
                <p style={{ fontSize: "16px", lineHeight: 1.6, color: "#1e293b", marginBottom: "24px" }}>{results.summary}</p>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {results.actions.map((a: any, i: number) => (
                    <button key={i} style={{ padding: "14px", borderRadius: "16px", background: "#f8fafc", border: "1px solid #e2e8f0", color: "#0f172a", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = "#f8fafc"}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: `${a.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <a.icon style={{ width: 14, height: 14, color: a.color }} />
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: 600 }}>{a.label}</span>
                      <ChevronRight style={{ width: 14, height: 14, color: "#cbd5e1", marginLeft: "auto" }} />
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ── Bottom Section (Suggestions & Input) ── */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", zIndex: 10, background: "linear-gradient(0deg, rgba(248,250,252,1) 30%, rgba(248,250,252,0) 100%)" }}>
        
        {/* Quick Actions (only show if no results) */}
        {!results && orbState === "idle" && (
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", maxWidth: "800px" }}>
            {QUICK_ACTIONS.map((a, i) => (
              <button key={i} onClick={() => { setTranscript(a.label); handleProcessQuery(); }} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "20px", background: "white", border: "1px solid #e2e8f0", color: "#334155", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "white"}>
                <a.icon style={{ width: 14, height: 14, color: a.color }} />
                {a.label}
              </button>
            ))}
          </div>
        )}

        {/* Text Input Fallback */}
        <form onSubmit={handleTextSubmit} style={{ width: "100%", maxWidth: "600px", position: "relative" }}>
          <div style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center" }}>
            <Search style={{ width: 18, height: 18, color: "#94a3b8" }} />
          </div>
          <input 
            value={queryInput} onChange={e => setQueryInput(e.target.value)} 
            placeholder="Type your command..." 
            style={{ width: "100%", height: "56px", padding: "0 56px", borderRadius: "28px", background: "white", border: "1px solid #e2e8f0", color: "#0f172a", fontSize: "15px", outline: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", transition: "all 0.2s" }} 
            onFocus={e => e.target.style.borderColor = "#a855f7"} onBlur={e => e.target.style.borderColor = "#e2e8f0"}
          />
          <button type="button" onClick={toggleVoice} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", width: "36px", height: "36px", borderRadius: "18px", background: orbState === "listening" ? "#ef4444" : "#f1f5f9", border: "none", color: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }}>
            <Mic style={{ width: 16, height: 16, color: orbState === "listening" ? "white" : "#64748b" }} className={orbState === "listening" ? "animate-pulse" : ""} />
          </button>
        </form>
      </div>

      <style>{`
        @keyframes pulseGlow { 0% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.9); } 100% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.1); } }
        @keyframes slideUpFade { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
