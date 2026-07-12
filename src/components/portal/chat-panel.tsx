/**
 * ChatPanel — CivicSaathi
 * Real-time streaming: tokens streamed via SSE from Groq backend
 * Voice input:  Sarvam AI saaras:v3 (server-side STT via /voice/stt)
 * Voice output: Sarvam AI bulbul:v3 (server-side TTS via /voice/tts, with browser fallback)
 * Supports 8 Indian languages.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Send, Sparkles, Volume2, VolumeX, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LanguageDropdown } from "./language-selector";

interface Msg {
  role: "user" | "bot";
  text: string;
  streaming?: boolean;
}

const API_BASE = "http://localhost:8000";

// BCP-47 language codes for Web Speech API (browser STT fallback only)
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
  const [isStreaming, setIsStreaming] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const ttsQueue = useRef<string[]>([]);
  const isPlayingTTS = useRef<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const historyRef = useRef<{ role: string; content: string }[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingIndexRef = useRef<number>(-1);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Keep history ref in sync (skip streaming messages)
  useEffect(() => {
    historyRef.current = messages
      .filter((m) => !m.streaming)
      .map((m) => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.text,
      }));
  }, [messages]);

  // ── Server-side TTS via Sarvam AI ─────────────────────────────────────────
  const speakText = useCallback(
    async (text: string) => {
      if (!voiceEnabled || !text.trim()) return;

      // Stop any current audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      window.speechSynthesis?.cancel();

      setIsSpeaking(true);
      try {
        const resp = await fetch(`${API_BASE}/voice/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, language }),
        });

        if (!resp.ok) throw new Error(`TTS HTTP ${resp.status}`);

        const contentType = resp.headers.get("content-type") || "";

        // Fallback: server told us to use browser TTS
        if (contentType.includes("application/json")) {
          const data = await resp.json();
          if (data.fallback && typeof window !== "undefined" && window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(data.text ?? text);
            utterance.lang = SPEECH_LANG_MAP[language] ?? "en-IN";
            utterance.rate = 0.95;
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
            return;
          }
        }

        // Play Sarvam audio blob
        const audioBlob = await resp.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        await audio.play();
      } catch (err) {
        console.warn("TTS error, falling back to browser:", err);
        setIsSpeaking(false);
        // Browser speechSynthesis as last resort
        if (typeof window !== "undefined" && window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = SPEECH_LANG_MAP[language] ?? "en-IN";
          utterance.rate = 0.95;
          utterance.onend = () => setIsSpeaking(false);
          window.speechSynthesis.speak(utterance);
        }
      }
    },
    [voiceEnabled, language],
  );

  const playNextTTSChunk = useCallback(async () => {
    if (isPlayingTTS.current || ttsQueue.current.length === 0) return;
    isPlayingTTS.current = true;
    const chunk = ttsQueue.current.shift()!;
    try {
      const resp = await fetch(`${API_BASE}/voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chunk, language }),
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
    } catch (e) {
      console.warn("Chunked TTS error:", e);
    }
    isPlayingTTS.current = false;
    playNextTTSChunk();
  }, [language]);

  const enqueueTTSChunk = useCallback((text: string) => {
    if (!voiceEnabled || !text.trim()) return;
    ttsQueue.current.push(text);
    playNextTTSChunk();
  }, [voiceEnabled, playNextTTSChunk]);

  // Stop ongoing TTS
  const stopSpeaking = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  // ── Streaming SSE chat ────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || loading) return;
      setError(null);
      setMessages((m) => [...m, { role: "user", text: q }]);
      setInput("");
      setLoading(true);
      setIsStreaming(true);

      // Force a tiny delay so the user message renders before the bot loading bubble
      await new Promise(resolve => setTimeout(resolve, 50));

      // Add empty streaming bot bubble
      setMessages((m) => {
        streamingIndexRef.current = m.length;
        return [...m, { role: "bot", text: "", streaming: true }];
      });

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const resp = await fetch(`${API_BASE}/ai/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            module,
            message: q,
            language,
            history: historyRef.current.slice(-10),
          }),
          signal: controller.signal,
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        if (!resp.body) throw new Error("No response body");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let sentenceBuffer = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") {
              // Finalize the streaming bubble
              setMessages((m) =>
                m.map((msg, i) =>
                  i === streamingIndexRef.current
                    ? { ...msg, streaming: false }
                    : msg,
                ),
              );
              if (sentenceBuffer.trim()) enqueueTTSChunk(sentenceBuffer.trim());
              break;
            }
            try {
              const { token } = JSON.parse(raw);
              if (token) {
                accumulated += token;
                sentenceBuffer += token;
                
                // Chunk boundary detection for streaming TTS
                if (/[.!?\n]/.test(token)) {
                  enqueueTTSChunk(sentenceBuffer.trim());
                  sentenceBuffer = "";
                }

                setMessages((m) =>
                  m.map((msg, i) =>
                    i === streamingIndexRef.current
                      ? { ...msg, text: accumulated }
                      : msg,
                  ),
                );
              }
            } catch {
              // ignore malformed SSE
            }
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          // User stopped — finalize whatever we have
          setMessages((m) =>
            m.map((msg, i) =>
              i === streamingIndexRef.current ? { ...msg, streaming: false } : msg,
            ),
          );
        } else {
          const fallback =
            "I'm having trouble connecting to the AI service. Please check your connection and try again.";
          setMessages((m) =>
            m.map((msg, i) =>
              i === streamingIndexRef.current
                ? { ...msg, text: fallback, streaming: false }
                : msg,
            ),
          );
          setError("Connection error — using offline response.");
        }
      } finally {
        setLoading(false);
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [loading, module, language, speakText],
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const startListening = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone not available in this browser.");
      return;
    }

    // 1. Live visual feedback via Browser Speech Recognition
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = SPEECH_LANG_MAP[language] ?? "en-IN";
      recognition.onresult = (e: any) => {
        let interim = "";
        for (let i = 0; i < e.results.length; ++i) {
          interim += e.results[i][0].transcript;
        }
        setInput(interim);
      };
      try {
        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) { /* ignore */ }
    }

    // 2. Try MediaRecorder (server-side Sarvam STT) first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsListening(false);

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 1000) {
          setError("Too short — please hold and speak clearly.");
          return;
        }

        setLoading(true);
        try {
          const formData = new FormData();
          formData.append("audio", blob, `recording.webm`);
          if (language !== "en") formData.append("language", language);

          const resp = await fetch(`${API_BASE}/voice/stt`, {
            method: "POST",
            body: formData,
          });

          if (!resp.ok) throw new Error(`STT HTTP ${resp.status}`);
          const { transcript } = await resp.json();

          if (transcript?.trim()) {
            setInput(transcript);
            sendMessage(transcript);
          } else {
            setError("Could not understand — please try again.");
          }
        } catch (err) {
          console.warn("Sarvam STT failed, trying browser fallback:", err);
          // Fall back to Web Speech API
          setLoading(false);
          startBrowserSpeechFallback();
        } finally {
          setLoading(false);
        }
      };

      recorder.start();
      setIsListening(true);
      setError(null);
    } catch (err) {
      setError("Microphone access denied. Please allow it in browser settings.");
      setIsListening(false);
    }
  }, [language, sendMessage]);

  const startBrowserSpeechFallback = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Voice input not supported. Please use Chrome or Edge.");
      return;
    }
    const recognition = new SR();
    recognition.lang = SPEECH_LANG_MAP[language] ?? "en-IN";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      setError("Voice input failed. Please try again.");
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      sendMessage(transcript);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }, [language, sendMessage]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const toggleVoice = () => {
    if (isSpeaking) stopSpeaking();
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
              {/* Blinking cursor while streaming */}
              {m.streaming && (
                <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-current opacity-70 align-middle" />
              )}
            </div>
          </div>
        ))}
        {loading && !isStreaming && (
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
          disabled={loading && !isListening}
        >
          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? "Listening… release to send" : "Type or use voice…"}
          className="h-9"
          disabled={loading || isListening}
        />
        {isStreaming ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-9 w-9 shrink-0"
            onClick={stopStreaming}
            aria-label="Stop generating"
            title="Stop generating"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        )}
      </form>
    </Card>
  );
}
