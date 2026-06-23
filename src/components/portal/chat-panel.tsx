/**
 * ChatPanel — CIVICOS AI
 * Fully live: Groq AI backend + Web Speech API voice input + Speech Synthesis output
 * Supports 8 Indian languages.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Send, Sparkles, Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LanguageDropdown } from "./language-selector";

interface Msg {
  role: "user" | "bot";
  text: string;
}

const API_BASE = "http://localhost:8000";

// BCP-47 language codes for Web Speech API
const SPEECH_LANG_MAP: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
  ta: "ta-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  mr: "mr-IN",
  bn: "bn-IN",
};

export function ChatPanel({
  title = "AI Assistant",
  greeting = "Hello! How can I help you today?",
  suggestions = [],
  module = "voice",
  showLanguageSelector = true,
}: {
  title?: string;
  greeting?: string;
  suggestions?: string[];
  module?: string;
  showLanguageSelector?: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>([{ role: "bot", text: greeting }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("en");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const historyRef = useRef<{ role: string; content: string }[]>([]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Keep history ref in sync
  useEffect(() => {
    historyRef.current = messages.map((m) => ({
      role: m.role === "bot" ? "assistant" : "user",
      content: m.text,
    }));
  }, [messages]);

  const speakText = useCallback(
    (text: string) => {
      if (!voiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = SPEECH_LANG_MAP[language] ?? "en-IN";
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [voiceEnabled, language],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || loading) return;
      setError(null);
      setMessages((m) => [...m, { role: "user", text: q }]);
      setInput("");
      setLoading(true);

      try {
        const resp = await fetch(`${API_BASE}/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            module,
            message: q,
            language,
            history: historyRef.current.slice(-10),
          }),
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const reply: string = data.reply ?? "Sorry, I couldn't get a response.";

        setMessages((m) => [...m, { role: "bot", text: reply }]);
        speakText(reply);
      } catch (err) {
        const fallback =
          "I'm having trouble connecting to the AI service. Please check your connection and try again.";
        setMessages((m) => [...m, { role: "bot", text: fallback }]);
        setError("Connection error — using offline response.");
      } finally {
        setLoading(false);
      }
    },
    [loading, module, language, speakText],
  );

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SR) {
      setError("Voice input not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SR();
    recognition.lang = SPEECH_LANG_MAP[language] ?? "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      setError("Voice input failed. Please try again.");
    };
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      sendMessage(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [language, sendMessage]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const toggleVoice = () => {
    if (isSpeaking) window.speechSynthesis?.cancel();
    setVoiceEnabled((v) => !v);
    setIsSpeaking(false);
  };

  return (
    <Card className="flex h-[560px] flex-col shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="font-display text-sm font-bold">{title}</span>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-2">
          {showLanguageSelector && (
            <LanguageDropdown value={language} onChange={setLanguage} className="h-8 text-xs" />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleVoice}
            title={voiceEnabled ? "Mute voice output" : "Enable voice output"}
          >
            {voiceEnabled ? (
              <Volume2 className={cn("h-4 w-4", isSpeaking && "text-accent animate-pulse")} />
            ) : (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground",
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl bg-muted px-4 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
            </div>
          </div>
        )}
        {error && (
          <p className="text-center text-xs text-destructive">{error}</p>
        )}
      </div>

      {/* Quick suggestions */}
      {suggestions.length > 0 && messages.length <= 2 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              disabled={loading}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <form
        className="flex items-center gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
      >
        <Button
          type="button"
          variant={isListening ? "destructive" : "ghost"}
          size="icon"
          className={cn("h-9 w-9 shrink-0", isListening && "animate-pulse")}
          onClick={isListening ? stopListening : startListening}
          aria-label={isListening ? "Stop listening" : "Start voice input"}
        >
          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? "Listening…" : "Type or use voice…"}
          className="h-9"
          disabled={loading || isListening}
        />
        <Button
          type="submit"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={loading || !input.trim()}
          aria-label="Send message"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </Card>
  );
}
