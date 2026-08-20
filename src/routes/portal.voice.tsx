import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Terminal, Command, Sparkles, Building2, Landmark, 
  MessageSquareWarning, Briefcase, ChevronRight,
  LayoutDashboard, Siren, Megaphone, PhoneCall, Sprout, Leaf, Square,
  Mic, Send, Volume2, VolumeX, ChevronDown, RotateCcw, Loader2, User
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { VoiceOrb, type VoiceOrbState } from "@/components/portal/voice-orb";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/voice")({
  component: VoiceAssistant,
});

const API_BASE = "http://localhost:8000";

const LANGUAGES = [
  { code: "en", label: "English", native: "EN" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", label: "Malayalam", native: "മലയാളം" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
];

const QUICK_ACTIONS = [
  { icon: Landmark, label: "Lookup Scheme Eligibility", color: "#10b981" },
  { icon: Building2, label: "Check Smart City Alerts", color: "#3b82f6" },
  { icon: MessageSquareWarning, label: "Review Grievances", color: "#f59e0b" },
  { icon: Briefcase, label: "Generate Outreach Campaign", color: "#8b5cf6" },
  { icon: Leaf, label: "Diagnose Crop Diseases", color: "#16a34a" },
];

interface TTSJob {
  text: string;
  lang: string;
  fetchPromise: Promise<string | null>;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  intent?: string;
  actions?: any[];
  timestamp: number;
}

function VoiceAssistant() {
  const [orbState, setOrbState] = useState<VoiceOrbState>("idle");
  const [transcript, setTranscript] = useState("Tap the mic or type to speak with CivicSaathi");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [streamingReply, setStreamingReply] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedLangIdx, setSelectedLangIdx] = useState(0);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [ttsMuted, setTtsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const currentLang = LANGUAGES[selectedLangIdx];

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelRafRef = useRef<number | null>(null);

  // ── Pipelined TTS state refs ──
  const ttsJobsRef = useRef<TTSJob[]>([]);
  const currentJobIdxRef = useRef<number>(0);
  const isPlayingAudioRef = useRef<boolean>(false);
  const isStreamActiveRef = useRef<boolean>(false);
  const ttsAbortRef = useRef<boolean>(false);
  const ttsMutedRef = useRef<boolean>(false);

  useEffect(() => { ttsMutedRef.current = ttsMuted; }, [ttsMuted]);

  const navigate = useNavigate();

  // Permanently lock parent main overflow to hidden so ancestor never scrolls or distorts
  useEffect(() => {
    const mainEl = chatContainerRef.current?.closest("main") as HTMLElement | null;
    if (mainEl) {
      mainEl.scrollTop = 0;
      const prevOverflow = mainEl.style.overflow;
      mainEl.style.overflow = "hidden";
      return () => {
        mainEl.style.overflow = prevOverflow;
      };
    }
  }, []);

  // Smooth auto-scroll strictly inside the chat container
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, streamingReply, isStreaming, currentPrompt]);

  // Clean text for speech synthesis
  const cleanTextForTTS = (text: string): string => {
    return text
      .replace(/\[\s*STATUS\s*:[^\]]*\]/gi, "")
      .replace(/\bSTATUS\s*:\s*(?:resolved|unresolved)\b/gi, "")
      .replace(/\[\s*(?:resolved|unresolved)\s*\]/gi, "")
      .replace(/\[\s*\]/g, "")
      .replace(/https?:\/\/[^\s)]+/gi, "")
      .replace(/www\.[^\s)]+/gi, "")
      .replace(/\b[\w.-]+?\.(?:gov\.in|nic\.in|gov|in|org|com|net|edu)\b[^\s)]*/gi, "")
      .replace(/\*+/g, "")
      .replace(/#+\s*/g, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  };

  const stopAll = useCallback(() => {
    ttsAbortRef.current = true;
    isStreamActiveRef.current = false;
    abortControllerRef.current?.abort();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    if (levelRafRef.current) {
      cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = null;
    }
    setAudioLevel(0);
    ttsJobsRef.current = [];
    currentJobIdxRef.current = 0;
    isPlayingAudioRef.current = false;
    setOrbState("idle");
    setIsStreaming(false);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  // ── Audio Level Meter ──
  const startLevelMeter = (stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const tick = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(Math.min(100, avg * 2.2));
        levelRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {}
  };

  const stopLevelMeter = () => {
    if (levelRafRef.current) {
      cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = null;
    }
    setAudioLevel(0);
  };

  // ── Ultra-Fast Pipelined TTS Player ──
  const pumpTTSPlayback = useCallback(async () => {
    if (isPlayingAudioRef.current || ttsMutedRef.current || ttsAbortRef.current) return;

    if (currentJobIdxRef.current >= ttsJobsRef.current.length) {
      if (!isStreamActiveRef.current) {
        setOrbState("idle");
      }
      return;
    }

    const job = ttsJobsRef.current[currentJobIdxRef.current];
    currentJobIdxRef.current += 1;
    isPlayingAudioRef.current = true;
    setOrbState("speaking");

    const audioUrl = await job.fetchPromise;

    if (ttsAbortRef.current || ttsMutedRef.current) {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      isPlayingAudioRef.current = false;
      return;
    }

    if (audioUrl) {
      await new Promise<void>((resolve) => {
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          resolve();
        };
        audio.play().catch(() => resolve());
      });
    } else {
      if (window.speechSynthesis) {
        await new Promise<void>((resolve) => {
          const utt = new SpeechSynthesisUtterance(job.text);
          utt.lang = job.lang === "en" ? "en-IN" : `${job.lang}-IN`;
          utt.onend = () => resolve();
          utt.onerror = () => resolve();
          window.speechSynthesis.speak(utt);
        });
      }
    }

    isPlayingAudioRef.current = false;
    pumpTTSPlayback();
  }, []);

  const queueSentenceForTTS = useCallback(
    (rawText: string, langCode: string) => {
      if (ttsMutedRef.current || ttsAbortRef.current) return;
      const clean = cleanTextForTTS(rawText);
      if (!clean || !/\w|[\u0900-\u0D7F]/.test(clean)) return;

      const subChunks: string[] = [];
      if (clean.length > 450) {
        const parts = clean.split(/(?<=[,;])\s+/);
        let cur = "";
        for (const p of parts) {
          if ((cur + " " + p).trim().length <= 450) {
            cur = (cur + " " + p).trim();
          } else {
            if (cur) subChunks.push(cur);
            cur = p.slice(0, 450);
          }
        }
        if (cur) subChunks.push(cur);
      } else {
        subChunks.push(clean);
      }

      for (const chunk of subChunks) {
        const fetchPromise = (async () => {
          try {
            const resp = await fetch(`${API_BASE}/voice/tts`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: chunk, language: langCode }),
            });
            if (ttsAbortRef.current) return null;
            const contentType = resp.headers.get("content-type") || "";
            if (resp.ok && contentType.includes("audio")) {
              const blob = await resp.blob();
              return URL.createObjectURL(blob);
            }
            return null;
          } catch {
            return null;
          }
        })();

        ttsJobsRef.current.push({
          text: chunk,
          lang: langCode,
          fetchPromise,
        });
      }

      pumpTTSPlayback();
    },
    [pumpTTSPlayback],
  );

  // ── Streaming AI Query ──
  const handleProcessQuery = useCallback(async (text: string, activeLang = currentLang.code) => {
    const q = text.trim();
    if (!q) return;

    stopAll();
    setCurrentPrompt(q);
    setTranscript(q);
    setStreamingReply("");
    setIsStreaming(true);
    setOrbState("processing");

    // Add user message to history
    const userMsgId = `user-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: userMsgId,
      role: "user",
      text: q,
      timestamp: Date.now()
    }]);

    isStreamActiveRef.current = true;
    ttsJobsRef.current = [];
    currentJobIdxRef.current = 0;
    ttsAbortRef.current = false;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch(`${API_BASE}/ai/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "voice",
          message: q,
          language: activeLang,
          detected_language: activeLang,
          history: messages.slice(-8).map(m => ({ role: m.role, content: m.text })),
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("No body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let sentenceBuffer = "";
      let buf = "";

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
            break;
          }
          try {
            const parsed = JSON.parse(raw);
            const token = parsed.token || "";
            if (token) {
              accumulated += token;
              sentenceBuffer += token;
              setStreamingReply(accumulated);

              // Pre-fetch sentence TTS immediately while streaming
              const match = sentenceBuffer.match(/^([\s\S]*?[.!?\n]+)\s*([\s\S]*)$/);
              if (match) {
                const completeSentence = match[1];
                sentenceBuffer = match[2];
                queueSentenceForTTS(completeSentence, activeLang);
              }
            }
          } catch {}
        }
      }

      isStreamActiveRef.current = false;
      setIsStreaming(false);

      // Queue remaining text
      if (sentenceBuffer.trim()) {
        queueSentenceForTTS(sentenceBuffer.trim(), activeLang);
      }

      // Infer recommended actions & navigation
      const lower = q.toLowerCase();
      let intent = "CivicSaathi Assistant";
      let actions: any[] = [];

      if (lower.includes("scheme") || lower.includes("eligibility") || lower.includes("welfare") || lower.includes("yojana")) {
        intent = "Scheme Discovery & Eligibility";
        actions = [
          { label: "Search Schemes via AI", route: "/portal/scheme-ai", icon: Landmark, color: "#10b981" },
          { label: "View Public Schemes", route: "/portal/schemes", icon: Landmark, color: "#3b82f6" },
        ];
      } else if (lower.includes("grievance") || lower.includes("complaint") || lower.includes("report") || lower.includes("issue") || lower.includes("pothole") || lower.includes("garbage")) {
        intent = "Grievance & Issue Resolution";
        actions = [
          { label: "Check Grievances Dashboard", route: "/portal/grievances", icon: MessageSquareWarning, color: "#f59e0b" },
          { label: "File New Grievance", route: "/portal/grievances", icon: MessageSquareWarning, color: "#ef4444" },
        ];
      } else if (lower.includes("traffic") || lower.includes("city") || lower.includes("water") || lower.includes("power") || lower.includes("road") || lower.includes("light")) {
        intent = "Municipal Services & Smart City";
        actions = [
          { label: "View Municipal Services", route: "/portal/municipal", icon: Building2, color: "#3b82f6" },
          { label: "View Smart City Dashboard", route: "/portal/smart-city", icon: Building2, color: "#06b6d4" },
        ];
      } else if (lower.includes("rural") || lower.includes("panchayat") || lower.includes("village") || lower.includes("mgnrega") || lower.includes("kisan")) {
        intent = "Rural Welfare & Panchayats";
        actions = [{ label: "Open Rural Portal", route: "/portal/rural", icon: Sprout, color: "#84cc16" }];
      } else if (lower.includes("crop") || lower.includes("soil") || lower.includes("farm") || lower.includes("agriculture") || lower.includes("pest") || lower.includes("plant")) {
        intent = "Agriculture & Crop Advisor";
        actions = [{ label: "Get Crop Diagnosis", route: "/portal/agriculture", icon: Leaf, color: "#16a34a" }];
      } else if (lower.includes("disaster") || lower.includes("weather") || lower.includes("emergency") || lower.includes("flood") || lower.includes("cyclone")) {
        intent = "Disaster & Emergency Alerts";
        actions = [{ label: "View Live Alerts", route: "/portal/disaster", icon: Siren, color: "#ef4444" }];
      } else if (lower.includes("campaign") || lower.includes("election") || lower.includes("outreach") || lower.includes("rally") || lower.includes("voter")) {
        intent = "Public Campaigns & Outreach";
        actions = [{ label: "Campaign & Outreach Manager", route: "/portal/election", icon: Megaphone, color: "#8b5cf6" }];
      } else if (lower.includes("help") || lower.includes("helpline") || lower.includes("support") || lower.includes("call") || lower.includes("ticket")) {
        intent = "Citizen Support Helpline";
        actions = [{ label: "Connect with Helpline Chat", route: "/portal/helpline", icon: PhoneCall, color: "#ec4899" }];
      } else {
        intent = "CivicSaathi Quick Actions";
        actions = [
          { label: "Explore Main Dashboard", route: "/portal", icon: LayoutDashboard, color: "#6366f1" },
          { label: "Ask Helpline Assistant", route: "/portal/helpline", icon: PhoneCall, color: "#ec4899" },
        ];
      }

      // Add assistant response to messages
      setMessages(prev => [...prev, {
        id: `bot-${Date.now()}`,
        role: "assistant",
        text: accumulated,
        intent,
        actions,
        timestamp: Date.now()
      }]);

      setStreamingReply("");
      setCurrentPrompt("");
      pumpTTSPlayback();

    } catch (err: any) {
      isStreamActiveRef.current = false;
      if (err.name !== "AbortError") {
        console.error("AI voice query error:", err);
        setTranscript("I'm having trouble communicating with the server. Please check your connection.");
        toast.error("Failed to connect to AI voice service.");
      }
      setOrbState("idle");
      setIsStreaming(false);
      setStreamingReply("");
    }
  }, [currentLang.code, stopAll, messages, queueSentenceForTTS, pumpTTSPlayback]);

  // ── Sarvam STT MediaRecorder Recording ──
  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Microphone not available in this browser.");
      return;
    }

    stopAll();

    // Live visual feedback via Browser Speech Recognition
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      try {
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = currentLang.code === "en" ? "en-IN" : `${currentLang.code}-IN`;
        recognition.onresult = (e: any) => {
          let interim = "";
          for (let i = 0; i < e.results.length; ++i) {
            interim += e.results[i][0].transcript;
          }
          if (interim) setTranscript(interim);
        };
        recognition.start();
        recognitionRef.current = recognition;
      } catch {}
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startLevelMeter(stream);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        stopLevelMeter();

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 800) {
          setOrbState("idle");
          setTranscript("Too short — tap the mic and speak clearly.");
          return;
        }

        setOrbState("processing");
        setTranscript("Transcribing your speech via Sarvam AI…");

        try {
          const fd = new FormData();
          fd.append("audio", blob, "recording.webm");
          fd.append("language", currentLang.code);
          const resp = await fetch(`${API_BASE}/voice/stt`, { method: "POST", body: fd });
          if (!resp.ok) throw new Error(`STT ${resp.status}`);
          const data = await resp.json();
          const sttText = (data.transcript || "").trim();
          const spokenLang = (data.detected_language || currentLang.code).trim();

          if (sttText) {
            setTranscript(sttText);
            handleProcessQuery(sttText, spokenLang);
          } else {
            setOrbState("idle");
            setTranscript("Couldn't hear you clearly. Tap the mic to try again.");
          }
        } catch (err) {
          console.warn("Sarvam STT failed:", err);
          setOrbState("idle");
          setTranscript("Speech recognition failed. Please try typing your query.");
          toast.error("Speech recognition error.");
        }
      };

      recorder.start();
      setOrbState("listening");
      setStreamingReply("");
      setTranscript("Listening… speak your command now");
    } catch {
      toast.error("Microphone access denied. Please allow microphone permissions.");
    }
  }, [currentLang.code, stopAll, handleProcessQuery]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  }, []);

  const toggleVoice = () => {
    if (orbState === "listening") {
      stopRecording();
    } else if (orbState === "speaking" || isStreaming) {
      stopAll();
    } else {
      startRecording();
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim() || isStreaming) return;
    const text = queryInput;
    setQueryInput("");
    handleProcessQuery(text);
  };

  const isRecording = orbState === "listening";

  return (
    <div className="flex-1 h-full min-h-0 w-full flex flex-col overflow-hidden font-sans bg-transparent relative">
      
      {/* Dynamic Ambient Background Glow */}
      <div 
        className="absolute inset-0 pointer-events-none transition-all duration-1000 z-0" 
        style={{
          background: orbState === "listening" 
            ? "radial-gradient(circle at 50% 20%, rgba(239,68,68,0.12) 0%, rgba(244,63,94,0.03) 45%, transparent 70%)" 
            : orbState === "processing" 
              ? "radial-gradient(circle at 50% 20%, rgba(168,85,247,0.12) 0%, rgba(139,92,246,0.03) 45%, transparent 70%)" 
              : orbState === "speaking" 
                ? "radial-gradient(circle at 50% 20%, rgba(59,130,246,0.14) 0%, rgba(34,211,238,0.04) 45%, transparent 70%)" 
                : "radial-gradient(circle at 50% 20%, rgba(139,92,246,0.07) 0%, rgba(99,102,241,0.02) 45%, transparent 70%)",
        }}
      >
        <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] rounded-full bg-violet-500/10 blur-[130px] animate-pulse" style={{ animationDuration: '9s' }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[45%] h-[45%] rounded-full bg-cyan-500/10 blur-[130px] animate-pulse" style={{ animationDuration: '11s' }} />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(148,163,184,0.08) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      </div>

      {/* ── Sticky Title Bar ── */}
      <div className="shrink-0 z-20 w-full px-6 py-2.5 flex items-center justify-between bg-gradient-to-r from-violet-50/95 via-purple-50/90 to-indigo-50/95 dark:from-slate-900/95 dark:via-slate-900/90 dark:to-slate-900/95 backdrop-blur-xl border-b border-violet-200/70 dark:border-white/10 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-violet-100 dark:bg-violet-950/80 flex items-center justify-center border border-violet-200/60 dark:border-violet-800/50 shadow-sm">
            <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-800 dark:text-white tracking-tight">AI Voice Command</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">Sarvam AI · Groq compound-mini</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangDropdown(p => !p)}
              className="h-7 px-2.5 rounded-xl bg-white/90 dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 hover:bg-white transition-all cursor-pointer shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {currentLang.native}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {showLangDropdown && (
              <div className="absolute right-0 top-9 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xl min-w-[140px] animate-in fade-in zoom-in-95 duration-150">
                {LANGUAGES.map((l, idx) => (
                  <button
                    key={l.code}
                    onClick={() => { setSelectedLangIdx(idx); setShowLangDropdown(false); toast.success(`Language: ${l.label}`); }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      idx === selectedLangIdx
                        ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{l.label}</span>
                    <span className="text-slate-400 text-[10px]">{l.native}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mute toggle */}
          <button
            onClick={() => setTtsMuted(p => !p)}
            title={ttsMuted ? "Unmute" : "Mute voice"}
            className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-sm ${
              ttsMuted ? "bg-rose-50 border-rose-200 text-rose-500" : "bg-white/90 dark:bg-slate-900 border-slate-200/80 dark:border-white/10 text-violet-600 hover:bg-white"
            }`}
          >
            {ttsMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Clear chat */}
          {messages.length > 0 && (
            <button
              onClick={() => { stopAll(); setMessages([]); setStreamingReply(""); setCurrentPrompt(""); setTranscript("Tap the mic or type to speak with CivicSaathi"); }}
              title="Clear conversation"
              className="w-7 h-7 rounded-xl bg-white/90 dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-all cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Middle Scrollable Chat Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 min-h-0 overflow-y-auto w-full px-4 sm:px-8 pt-8 pb-4 flex flex-col items-center custom-scrollbar z-10"
      >
        <div className="w-full max-w-3xl flex flex-col items-center">
          
          {/* Main Interactive Voice Orb — fixed position, never shifts */}
          <div className="relative flex flex-col items-center justify-center pb-6 shrink-0">
            {isRecording && (
              <div className="absolute inset-0 -m-5 rounded-full bg-red-500/20 animate-ping pointer-events-none" style={{ animationDuration: "1.4s" }} />
            )}
            {orbState === "speaking" && (
              <div className="absolute inset-0 -m-5 rounded-full bg-violet-500/20 animate-ping pointer-events-none" style={{ animationDuration: "1.6s" }} />
            )}

            <div 
              onClick={toggleVoice}
              className="group relative cursor-pointer select-none transition-transform duration-300 active:scale-95 hover:scale-105"
            >
              <VoiceOrb 
                state={orbState} 
                size="md" 
                className={`shadow-xl transition-shadow ${
                  isRecording 
                    ? "shadow-red-500/40" 
                    : orbState === "speaking" 
                      ? "shadow-blue-500/40" 
                      : "shadow-violet-500/20"
                } rounded-full`} 
              />
            </div>

            {/* Status Pill */}
            <div className="mt-2.5 flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
              <span className={`w-2 h-2 rounded-full ${
                isRecording 
                  ? "bg-red-500 animate-pulse" 
                  : orbState === "processing" 
                    ? "bg-purple-500 animate-spin" 
                    : orbState === "speaking" 
                      ? "bg-blue-500 animate-pulse" 
                      : "bg-emerald-500"
              }`} />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wide">
                {isRecording 
                  ? "Listening… Tap orb or mic to stop" 
                  : orbState === "processing" 
                    ? "Thinking & Translating…" 
                    : orbState === "speaking" 
                      ? "Speaking (Sarvam AI)…" 
                      : "Ready · Tap to speak"}
              </span>
            </div>

            {/* Live Audio Visualizer Bars when recording */}
            {isRecording && (
              <div className="flex items-center gap-1.5 h-5 mt-2">
                {[0.4, 0.8, 1.0, 0.7, 0.5, 0.9, 0.6, 0.8, 0.4].map((scale, i) => (
                  <div 
                    key={i} 
                    style={{
                      height: `${Math.max(4, Math.min(20, (audioLevel / 100) * 20 * scale * (0.8 + Math.random() * 0.4)))}px`,
                    }}
                    className="w-1 rounded-full bg-gradient-to-t from-red-500 to-rose-400 transition-all duration-75"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Conversation History / Chat Stream */}
          <div className="w-full flex flex-col gap-4 mt-2 mb-4">
            
            {messages.length === 0 && !isStreaming && !currentPrompt && (
              <div className="text-center pt-2 pb-6 text-slate-400 dark:text-slate-500">
                <p className="text-sm font-medium">Say or type a command below to explore civic services, schemes, or grievances.</p>
              </div>
            )}

            {/* Rendered Past Messages */}
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`w-full flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                {msg.role === "user" ? (
                  /* User Bubble */
                  <div className="flex items-center gap-2 max-w-[85%]">
                    <div className="px-4 py-2.5 rounded-2xl rounded-tr-xs bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold shadow-md shadow-violet-500/20">
                      {msg.text}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-600 dark:text-violet-300 flex items-center justify-center shrink-0 border border-violet-200/60 shadow-2xs">
                      <User className="w-4 h-4" />
                    </div>
                  </div>
                ) : (
                  /* Assistant Bubble */
                  <div className="flex flex-col items-start gap-2.5 max-w-[95%] sm:max-w-[90%] w-full">
                    <div className="flex items-start gap-2.5 w-full">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-violet-600 flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700 shadow-2xs mt-1">
                        <Sparkles className="w-4 h-4 text-violet-600" />
                      </div>
                      
                      <div className="flex-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-2xl rounded-tl-xs p-5 shadow-xs text-left">
                        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-[11px] font-black tracking-wider uppercase text-slate-400">AI Response</span>
                        </div>
                        <p className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                          {msg.text}
                        </p>
                      </div>
                    </div>

                    {/* Action Cards if available */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="ml-10 w-[calc(100%-2.5rem)]">
                        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/70 dark:border-white/10 shadow-xs text-left">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Command className="w-3.5 h-3.5 text-violet-600" />
                              <span className="text-[11px] font-black tracking-wider uppercase text-slate-500">{msg.intent || "Recommended Action"}</span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60">
                              Quick Link
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {msg.actions.map((act, i) => {
                              const Icon = act.icon;
                              return (
                                <button
                                  key={i}
                                  onClick={() => navigate({ to: act.route })}
                                  className="group flex items-center gap-3 p-3 bg-white/95 dark:bg-slate-800/90 rounded-xl border border-slate-100 dark:border-slate-700/60 transition-all text-left w-full cursor-pointer shadow-2xs hover:shadow-md hover:border-violet-300 dark:hover:border-violet-600 hover:-translate-y-0.5"
                                >
                                  <div 
                                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" 
                                    style={{ background: `${act.color}18`, color: act.color }}
                                  >
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-violet-600 transition-colors">
                                      {act.label}
                                    </span>
                                    <span className="text-[10px] font-medium text-slate-400">Tap to open module</span>
                                  </div>
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                                </button>
                              );
                            })}
                          </div>
                        </Card>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Currently Streaming Bubble */}
            {isStreaming && (
              <div className="w-full flex flex-col items-start gap-2 animate-in fade-in">
                <div className="flex items-start gap-2.5 w-full max-w-[95%] sm:max-w-[90%]">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-violet-600 flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700 shadow-xs mt-1">
                    <Sparkles className="w-4 h-4 text-violet-600 animate-spin" />
                  </div>
                  
                  <div className="flex-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-violet-200/80 dark:border-violet-900/50 rounded-2xl rounded-tl-xs p-5 shadow-md text-left">
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-black tracking-wider uppercase text-violet-600">Generating Response…</span>
                      <button 
                        onClick={stopAll} 
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 text-[11px] font-bold border border-rose-200 transition-colors cursor-pointer"
                      >
                        <Square className="w-2.5 h-2.5" /> Stop
                      </button>
                    </div>
                    <p className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                      {streamingReply || "Thinking…"}
                      <span className="inline-block w-1.5 h-4 bg-violet-600 ml-1.5 animate-pulse align-middle" />
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} className="h-2 shrink-0" />
          </div>

        </div>
      </div>

      {/* Docked Bottom Chatbox */}
      <footer className="shrink-0 w-full px-4 sm:px-8 pt-2.5 pb-3 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-t border-slate-200/70 dark:border-slate-800/70 z-30 flex flex-col items-center gap-2 shadow-[0_-8px_20px_-4px_rgba(0,0,0,0.06)]">

        {/* Quick Suggestion Chips (Centered & Wrapped) */}
        <div className="w-full max-w-2xl flex flex-wrap gap-2 justify-center py-0.5">
          {QUICK_ACTIONS.map((action, i) => (
            <button 
              key={i}
              onClick={() => {
                setQueryInput(action.label);
                handleProcessQuery(action.label);
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-900 rounded-full border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer shadow-2xs hover:bg-white dark:hover:bg-slate-800 hover:border-violet-300 hover:scale-102 transition-all shrink-0"
            >
              <action.icon className="w-3 h-3" style={{ color: action.color }} />
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {/* Command / Chat Input Box with Integrated Microphone Symbol */}
        <form onSubmit={handleTextSubmit} className="relative w-full max-w-2xl mx-auto">
          <div className="relative flex items-center bg-slate-50/80 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/90 dark:border-white/15 rounded-2xl p-1.5 shadow-sm focus-within:bg-white focus-within:ring-3 focus-within:ring-violet-500/25 focus-within:border-violet-400 transition-all">
            
            <div className="pl-3.5 pr-2 text-slate-400">
              <Terminal className="w-4 h-4" />
            </div>

            <input 
              type="text" 
              placeholder={isRecording ? "Listening to your voice… speak now" : "Type command or tap 🎤 to speak…"}
              value={queryInput}
              onChange={e => setQueryInput(e.target.value)}
              disabled={isStreaming}
              className="flex-1 h-10 bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400 placeholder:font-normal"
            />

            {/* Voice Input Microphone Symbol Button */}
            <button
              type="button"
              onClick={toggleVoice}
              title={isRecording ? "Stop listening" : "Speak to bot (Voice Input)"}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 mr-1.5 ${
                isRecording 
                  ? "bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-md shadow-red-500/40 scale-105 animate-pulse" 
                  : "bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/60 shadow-2xs hover:scale-105"
              }`}
            >
              {isRecording ? (
                <Square className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Mic className="w-4 h-4 text-violet-600 dark:text-violet-300" />
              )}
            </button>

            {/* Submit / Send Button */}
            <button 
              type="submit"
              disabled={!queryInput.trim() || isStreaming}
              title="Submit command"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                queryInput.trim() && !isStreaming
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/30 hover:scale-105 cursor-pointer" 
                  : "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed"
              }`}
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </form>

      </footer>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.5);
        }
      `}</style>
    </div>
  );
}
