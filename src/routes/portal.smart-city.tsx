import { useState, useRef, useCallback, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Droplets,
  Zap,
  Bus,
  TrafficCone,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { ChatPanel } from "@/components/portal/chat-panel";
import { VoiceOrb, type VoiceOrbState } from "@/components/portal/voice-orb";
import { LanguageSelector } from "@/components/portal/language-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/smart-city")({
  head: () => ({ meta: [{ title: "Smart City — CIVICOS AI" }] }),
  component: SmartCity,
});

const SPEECH_LANG: Record<string, string> = {
  en: "en-IN", hi: "hi-IN", te: "te-IN", ta: "ta-IN",
  kn: "kn-IN", ml: "ml-IN", mr: "mr-IN", bn: "bn-IN",
};

const GREETINGS: Record<string, string> = {
  en: "Hello! Ask me about traffic, water supply, power outages, or city services.",
  hi: "नमस्ते! ट्रैफिक, पानी, बिजली या शहरी सेवाओं के बारे में पूछें।",
  te: "నమస్కారం! ట్రాఫిక్, నీళ్ళు, కరెంట్ లేదా నగర సేవలను అడగండి।",
  ta: "வணக்கம்! போக்குவரத்து, நீர், மின்சாரம் அல்லது நகர சேவைகள் பற்றி கேளுங்கள்.",
  kn: "ನಮಸ್ಕಾರ! ಟ್ರಾಫಿಕ್, ನೀರು, ವಿದ್ಯುತ್ ಅಥವಾ ನಗರ ಸೇವೆಗಳ ಬಗ್ಗೆ ಕೇಳಿ.",
  ml: "നമസ്കാരം! ട്രാഫിക്, വെള്ളം, വൈദ്യുതി അല്ലെങ്കിൽ നഗര സേവനങ്ങളെ കുറിച്ച് ചോദിക്കൂ.",
  mr: "नमस्कार! रहदारी, पाणी, वीज किंवा शहरी सेवांबद्दल विचारा.",
  bn: "নমস্কার! ট্রাফিক, জল, বিদ্যুৎ বা শহর পরিষেবা সম্পর্কে জিজ্ঞাসা করুন।",
};

const API_BASE = "http://localhost:8000";

interface CityService {
  id: string;
  label: string;
  icon: string;
  value: string;
  detail: string;
  status: string;
  updated_at: string;
}

const statusConfig = {
  ok: { badge: "bg-success/15 text-success", dot: "bg-success" },
  warn: { badge: "bg-warning/20 text-warning-foreground", dot: "bg-warning" },
  alert: { badge: "bg-destructive/15 text-destructive", dot: "bg-destructive" },
};

const CITY_ALERTS = [
  { type: "alert", message: "Power outage in Ward 7. Restoration expected by 9 PM.", time: "2h ago" },
  { type: "warn", message: "Road closure: MG Road between City Center and Bus Stand for repair.", time: "5h ago" },
  { type: "ok", message: "Water supply restored in all zones after maintenance.", time: "1d ago" },
];

function SmartCity() {
  const [language, setLanguage] = useState("en");
  const [orbState, setOrbState] = useState<VoiceOrbState>("idle");
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null);

  const [services, setServices] = useState<CityService[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/live/city-services`);
      if (resp.ok) {
        const data = await resp.json();
        setServices(data.services || []);
      }
    } catch (err) {
      console.error("Failed to load services", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
    // Poll every 60 seconds
    const interval = setInterval(fetchServices, 60000);
    return () => clearInterval(interval);
  }, [fetchServices]);

  const getIcon = (name: string) => {
    switch (name) {
      case "TrafficCone": return TrafficCone;
      case "Droplets": return Droplets;
      case "Zap": return Zap;
      case "Bus": return Bus;
      case "Wifi": return Wifi;
      default: return AlertTriangle;
    }
  };

  const handleVoiceOrb = useCallback(() => {
    if (orbState === "listening") {
      recognitionRef.current?.stop();
      setOrbState("idle");
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SR) {
      toast.error("Voice requires Chrome or Edge browser.");
      return;
    }

    const recognition = new SR();
    recognition.lang = SPEECH_LANG[language] ?? "en-IN";
    recognition.onstart = () => setOrbState("listening");
    recognition.onerror = () => setOrbState("idle");
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const t = e.results[0][0].transcript;
      setOrbState("processing");
      toast.info(`Voice command: "${t}"`, { description: "Processing your city service query…" });
      setTimeout(() => {
        setOrbState("speaking");
        const reply = `I received your query about: ${t}. Let me connect you with the relevant city service.`;
        const utterance = new SpeechSynthesisUtterance(reply);
        utterance.lang = SPEECH_LANG[language] ?? "en-IN";
        utterance.onend = () => setOrbState("idle");
        window.speechSynthesis.speak(utterance);
      }, 1000);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }, [orbState, language]);

  return (
    <div>
      <PageHeader
        icon={Building2}
        title="Smart City Citizen Assistant"
        description="Live city services, alerts and multilingual citizen notifications."
      />

      {/* Language selector */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Language</span>
        <LanguageSelector value={language} onChange={setLanguage} />
      </div>

      {/* Live service cards */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold">Live Service Status</h2>
          <button onClick={fetchServices} className="p-1 hover:bg-muted rounded text-muted-foreground" title="Refresh">
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {loading && services.length === 0 ? (
            <div className="col-span-full py-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            services.map((l) => {
              const cfg = statusConfig[l.status as keyof typeof statusConfig] ?? statusConfig.ok;
              const Icon = getIcon(l.icon);
              return (
                <Card key={l.id} className="p-4 shadow-card hover:shadow-elevated transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-primary">
                      <Icon className="h-[1.1rem] w-[1.1rem]" />
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${cfg.dot} ${l.status !== 'ok' ? 'animate-pulse' : ''}`} />
                      <Badge className={cfg.badge} variant="secondary">live</Badge>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold">{l.label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{l.value}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/70">{l.detail}</p>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Voice Bot */}
        <div className="space-y-5">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>City Voice Assistant</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Ask about any city service in your language</p>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6 pb-8">
              <VoiceOrb state={orbState} onClick={handleVoiceOrb} size="lg" />
              <div className="mt-6 w-full rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground italic text-center">
                {GREETINGS[language] ?? GREETINGS["en"]}
              </div>
            </CardContent>
          </Card>

          {/* City Alerts */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" /> City Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {CITY_ALERTS.map((a, i) => {
                const Icon = a.type === "alert" ? Zap : a.type === "warn" ? AlertTriangle : CheckCircle2;
                const color = a.type === "alert" ? "text-destructive" : a.type === "warn" ? "text-warning-foreground" : "text-success";
                return (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground leading-relaxed">{a.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{a.time}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Chat panel */}
        <ChatPanel
          title="Smart City Assistant"
          greeting={GREETINGS[language] ?? GREETINGS["en"]}
          suggestions={["Traffic update for Ring Road", "Water supply complaint", "Report power outage", "Bus schedule for Route 42C"]}
          module="smart-city"
          showLanguageSelector={false}
        />
      </div>
    </div>
  );
}
