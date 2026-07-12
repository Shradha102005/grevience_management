import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Terminal, Command, Sparkles, Building2, Landmark, 
  MessageSquareWarning, Briefcase, ChevronRight,
  LayoutDashboard, Siren, Megaphone, PhoneCall, Sprout, Leaf, Square
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { VoiceOrb, type VoiceOrbState } from "@/components/portal/voice-orb";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/voice")({
  component: VoiceAssistant,
});

const API_BASE = "http://localhost:8000";

const QUICK_ACTIONS = [
  { icon: Landmark, label: "Lookup Scheme Eligibility", color: "#10b981" },
  { icon: Building2, label: "Check Smart City Alerts", color: "#3b82f6" },
  { icon: MessageSquareWarning, label: "Review Grievances", color: "#f59e0b" },
  { icon: Briefcase, label: "Generate Outreach Campaign", color: "#8b5cf6" },
];

function VoiceAssistant() {
  const [orbState, setOrbState] = useState<VoiceOrbState>("idle");
  const [transcript, setTranscript] = useState("Say something like 'Check my crop' or 'Road repair'");
  const [streamingReply, setStreamingReply] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [results, setResults] = useState<any>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const ttsQueue = useRef<string[]>([]);
  const isPlayingTTS = useRef<boolean>(false);
  const navigate = useNavigate();

  // Clean up on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (currentAudioRef.current) currentAudioRef.current.pause();
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    };
  }, []);

  // ΓöÇΓöÇ Sarvam TTS ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const playNextTTSChunk = useCallback(async () => {
    if (isPlayingTTS.current || ttsQueue.current.length === 0) {
      if (ttsQueue.current.length === 0 && !isStreaming) setOrbState("idle");
      return;
    }
    isPlayingTTS.current = true;
    setOrbState("speaking");
    const chunk = ttsQueue.current.shift()!;
    try {
      const resp = await fetch(`${API_BASE}/voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chunk, language: "en" }),
      });
      if (resp.ok && resp.headers.get("content-type")?.includes("audio")) {
        const audioBlob = await resp.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;
        audio.onended = () => { URL.revokeObjectURL(audioUrl); isPlayingTTS.current = false; playNextTTSChunk(); };
        audio.onerror = () => { URL.revokeObjectURL(audioUrl); isPlayingTTS.current = false; playNextTTSChunk(); };
        await audio.play();
        return;
      }
    } catch {}
    isPlayingTTS.current = false;
    playNextTTSChunk();
  }, [isStreaming]);

  const enqueueTTSChunk = useCallback((text: string) => {
    if (!text.trim()) return;
    ttsQueue.current.push(text);
    playNextTTSChunk();
  }, [playNextTTSChunk]);

  // ΓöÇΓöÇ Streaming AI query ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const handleProcessQuery = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setOrbState("processing");
    setTranscript(text);
    setStreamingReply("");
    setResults(null);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch(`${API_BASE}/ai/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: "voice", message: text, language: "en", history: [] }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("No body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let sentenceBuffer = "";
      let buf = "";
      let firstToken = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") {
            setIsStreaming(false);
            const lower = text.toLowerCase();
            let intent = "CivicSaathi Unified Assistant";
            let actions: any[] = [];

            if (lower.includes("scheme") || lower.includes("eligibility") || lower.includes("welfare"))
              { intent = "Scheme Discovery & Eligibility"; actions = [{ label: "Search Schemes via AI", route: "/portal/scheme-ai", icon: Landmark, color: "#10b981" }]; }
            else if (lower.includes("grievance") || lower.includes("complaint") || lower.includes("report"))
              { intent = "Grievance & Issue Resolution"; actions = [{ label: "Check Grievances Dashboard", route: "/portal/grievances", icon: MessageSquareWarning, color: "#f59e0b" }]; }
            else if (lower.includes("traffic") || lower.includes("city") || lower.includes("water") || lower.includes("power") || lower.includes("road"))
              { intent = "Municipal Services & Smart City"; actions = [{ label: "View Municipal Services", route: "/portal/municipal", icon: Building2, color: "#3b82f6" }, { label: "View Smart City Dashboard", route: "/portal/smart-city", icon: Building2, color: "#06b6d4" }]; }
            else if (lower.includes("rural") || lower.includes("panchayat") || lower.includes("village") || lower.includes("mgnrega"))
              { intent = "Rural Welfare & Schemes"; actions = [{ label: "Go to Rural Portal", route: "/portal/rural", icon: Sprout, color: "#84cc16" }]; }
            else if (lower.includes("crop") || lower.includes("soil") || lower.includes("farm") || lower.includes("agriculture"))
              { intent = "Agriculture Advisor"; actions = [{ label: "Get Crop Diagnosis", route: "/portal/agriculture", icon: Leaf, color: "#16a34a" }]; }
            else if (lower.includes("disaster") || lower.includes("weather") || lower.includes("emergency") || lower.includes("flood"))
              { intent = "Disaster & Emergency Alerts"; actions = [{ label: "View Live Alerts", route: "/portal/disaster", icon: Siren, color: "#ef4444" }]; }
            else if (lower.includes("campaign") || lower.includes("election") || lower.includes("outreach"))
              { intent = "Public Campaigns & Election"; actions = [{ label: "Campaign & Outreach Manager", route: "/portal/election", icon: Megaphone, color: "#a855f7" }]; }
            else if (lower.includes("help") || lower.includes("helpline") || lower.includes("support"))
              { intent = "Citizen Support Helpline"; actions = [{ label: "Connect with Helpline Chat", route: "/portal/helpline", icon: PhoneCall, color: "#ec4899" }]; }
            else
              { actions = [{ label: "Explore Portal Dashboard", route: "/portal", icon: LayoutDashboard, color: "#6366f1" }, { label: "Ask Helpline", route: "/portal/helpline", icon: PhoneCall, color: "#ec4899" }]; }

            setResults({ intent, summary: accumulated, actions });
            if (sentenceBuffer.trim()) enqueueTTSChunk(sentenceBuffer.trim());
            break;
          }
          try {
            const { token } = JSON.parse(raw);
            if (token) {
              accumulated += token;
              sentenceBuffer += token;
              setStreamingReply(accumulated);
              
              if (/[.!?\n]/.test(token)) {
                enqueueTTSChunk(sentenceBuffer.trim());
                sentenceBuffer = "";
              }
              
              if (firstToken) { firstToken = false; setOrbState("processing"); }
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("AI voice query error:", err);
        setTranscript("I'm having trouble communicating with the backend. Please ensure the server is running.");
        toast.error("Failed to connect to backend AI Chat service.");
      }
      setOrbState("idle");
      setIsStreaming(false);
    }
  }, [speak]);

  // ΓöÇΓöÇ Sarvam STT via MediaRecorder (with Live Browser Fallback for UX) ΓöÇΓöÇΓöÇΓöÇ
  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Microphone not available in this browser.");
      return;
    }
    
    // Live visual feedback via Browser Speech Recognition
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (e: any) => {
        let interim = "";
        for (let i = 0; i < e.results.length; ++i) {
          interim += e.results[i][0].transcript;
        }
        setTranscript(interim);
      };
      try {
        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) { /* ignore */ }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 1000) { setOrbState("idle"); setTranscript("Too short ΓÇö tap the orb and speak clearly."); return; }

        setOrbState("processing");
        setTranscript("Transcribing your speechΓÇª");
        try {
          const fd = new FormData();
          fd.append("audio", blob, "recording.webm");
          const resp = await fetch(`${API_BASE}/voice/stt`, { method: "POST", body: fd });
          if (!resp.ok) throw new Error(`STT ${resp.status}`);
          const { transcript: sttText } = await resp.json();
          if (sttText?.trim()) { setTranscript(sttText); handleProcessQuery(sttText); }
          else { setOrbState("idle"); setTranscript("Couldn't hear you clearly. Tap the orb to try again."); }
        } catch (err) {
          console.warn("Sarvam STT failed:", err);
          setOrbState("idle");
          setTranscript("Transcription failed. Please try again.");
          toast.error("Speech recognition failed.");
        }
      };

      recorder.start();
      setOrbState("listening");
      setStreamingReply("");
      setResults(null);
      setTranscript("ListeningΓÇª tap again when done");
    } catch {
      toast.error("Microphone access denied. Please allow microphone in browser settings.");
    }
  }, [handleProcessQuery]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const stopAll = useCallback(() => {
    abortControllerRef.current?.abort();
    if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
    window.speechSynthesis?.cancel();
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    setOrbState("idle");
    setIsStreaming(false);
  }, []);

  const toggleVoice = () => {
    if (orbState === "listening") { stopRecording(); }
    else if (orbState === "speaking" || isStreaming) { stopAll(); }
    else { stopAll(); startRecording(); }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim() || isStreaming) return;
    const text = queryInput;
    setQueryInput("");
    handleProcessQuery(text);
  };

  const displayText = streamingReply || transcript;

  return (
    <div className="relative flex flex-col h-[calc(100vh-4rem)] overflow-hidden font-sans bg-transparent items-center justify-center animate-in fade-in duration-500">
      
      {/* Ambient Background */}
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

      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 px-6 lg:px-10 py-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-[1.25rem] bg-white/60 backdrop-blur-2xl shadow-xl shadow-slate-200/40 border border-white/60 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-violet-600 animate-pulse" />
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600">AI Voice Command</span>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Sarvam AI ┬╖ Groq llama-3.1</p>
          </div>
        </div>
        {orbState !== "idle" && (
          <div className="bg-white/60 backdrop-blur-2xl border border-white/60 shadow-xl px-4 py-2 rounded-full flex items-center gap-2 animate-in fade-in">
            <span className={`w-2.5 h-2.5 rounded-full animate-ping ${orbState === 'listening' ? 'bg-red-500' : orbState === 'speaking' ? 'bg-blue-500' : 'bg-purple-500'}`} />
            <span className="text-sm font-bold text-slate-700 tracking-widest uppercase">{orbState}</span>
          </div>
        )}
      </div>

      {/* Center Stage */}
      <div className="z-10 flex flex-col items-center w-full max-w-4xl px-6 relative mt-12">
        
        {/* Voice Orb */}
        <div className="transition-all duration-700 ease-out" style={{ 
          transform: results ? "scale(0.7) translateY(-30px)" : "scale(1.2) translateY(0)",
          marginBottom: results ? "2rem" : "4rem"
        }}>
          <VoiceOrb state={orbState} onClick={toggleVoice} size="lg" className="shadow-[0_20px_60px_-15px_rgba(139,92,246,0.3)] rounded-full cursor-pointer hover:scale-105 transition-transform" />
        </div>

        {/* Live Transcript + Streaming reply */}
        <div style={{ textAlign: "center", minHeight: "80px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
          
          {/* User's spoken text */}
          {transcript && (
            <p className="text-lg md:text-xl font-medium text-slate-400 mb-4 transition-all">
              "{transcript}"
            </p>
          )}

          {/* AI's spoken text */}
          {(streamingReply || isStreaming) && (
            <h2 style={{ 
              fontSize: results ? "20px" : "28px", 
              fontWeight: results ? 600 : 700, 
              letterSpacing: "-0.02em", 
              color: "#475569",
              lineHeight: 1.5,
              transition: "all 0.3s",
              maxWidth: "700px",
            }}>
              {streamingReply}
              {isStreaming && (
                <span style={{ display: "inline-block", width: "2px", height: "1.1em", background: "currentColor", marginLeft: "3px", animation: "blink 1s step-end infinite", verticalAlign: "middle", opacity: 0.8 }} />
              )}
            </h2>
          )}

          {isStreaming && (
            <button onClick={stopAll} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 backdrop-blur border border-white/60 text-slate-600 text-sm font-bold shadow hover:bg-white transition-all">
              <Square className="w-3.5 h-3.5" /> Stop generating
            </button>
          )}
        </div>

        {/* Result Card */}
        {results && !isStreaming && (
          <div className="animate-in slide-in-from-bottom-10 fade-in duration-500 w-full mt-10">
            <Card className="bg-white/60 backdrop-blur-3xl rounded-[2rem] p-8 md:p-10 border border-white/60 shadow-2xl shadow-slate-200/50">
              <div className="flex items-center gap-3 mb-6">
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

      {/* Bottom Input */}
      <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-6 z-20 w-full px-6">
        {!results && orbState === "idle" && !isStreaming && (
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
              disabled={!queryInput.trim() || isStreaming}
              className={`absolute right-3 top-2.5 w-11 h-11 rounded-[1.25rem] flex items-center justify-center transition-all ${
                queryInput.trim() && !isStreaming
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
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes pulseGlow { 0% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.9); } 100% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.1); } }
      `}</style>
    </div>
  );
}
