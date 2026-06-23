import { useState, useRef, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  Mic,
  Landmark,
  MessageSquareWarning,
  Siren,
  Building2,
  PhoneCall,
  Sprout,
  Leaf,
  ArrowRight,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { ChatPanel } from "@/components/portal/chat-panel";
import { VoiceOrb, type VoiceOrbState } from "@/components/portal/voice-orb";
import { LanguageSelector } from "@/components/portal/language-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/voice")({
  head: () => ({ meta: [{ title: "Voice Assistant — CIVICOS AI" }] }),
  component: Voice,
});

const SPEECH_LANG: Record<string, string> = {
  en: "en-IN", hi: "hi-IN", te: "te-IN", ta: "ta-IN",
  kn: "kn-IN", ml: "ml-IN", mr: "mr-IN", bn: "bn-IN",
};

const QUICK_MODULES = [
  { icon: Landmark, label: "Scheme AI", to: "/portal/scheme-ai", desc: "Find govt schemes", color: "text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400" },
  { icon: MessageSquareWarning, label: "Grievances", to: "/portal/grievances", desc: "File complaint", color: "text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400" },
  { icon: Siren, label: "Disaster Alerts", to: "/portal/disaster", desc: "Emergency info", color: "text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400" },
  { icon: Building2, label: "Smart City", to: "/portal/smart-city", desc: "City services", color: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400" },
  { icon: PhoneCall, label: "Helpline", to: "/portal/helpline", desc: "Govt information", color: "text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400" },
  { icon: Sprout, label: "Rural Dev", to: "/portal/rural", desc: "Village programs", color: "text-teal-600 bg-teal-50 dark:bg-teal-950 dark:text-teal-400" },
  { icon: Leaf, label: "Agriculture", to: "/portal/agriculture", desc: "Farming advisory", color: "text-lime-600 bg-lime-50 dark:bg-lime-950 dark:text-lime-400" },
  { icon: Mic, label: "Voice Home", to: "/portal/voice", desc: "This page", color: "text-primary bg-primary/10" },
];

// Routing table: voice command keywords → destinations
const COMMAND_ROUTES: { keywords: string[]; label: string; to: string; response: string }[] = [
  { keywords: ["scheme", "schemes", "welfare", "benefit", "eligible", "kisan", "ayushman"], label: "Scheme AI", to: "/portal/scheme-ai", response: "Taking you to Government Scheme Awareness — where I'll match schemes to your profile." },
  { keywords: ["complaint", "grievance", "griev", "problem", "issue", "water", "road", "light"], label: "Grievances", to: "/portal/grievances", response: "Navigating to Grievance Portal — you can file your complaint there." },
  { keywords: ["disaster", "flood", "cyclone", "emergency", "alert", "earthquake", "fire"], label: "Disaster Alerts", to: "/portal/disaster", response: "Opening Disaster Alerts — stay safe and follow official instructions." },
  { keywords: ["city", "traffic", "power", "outage", "transport", "bus", "smart"], label: "Smart City", to: "/portal/smart-city", response: "Going to Smart City services — live updates on traffic, water, and power." },
  { keywords: ["helpline", "help", "information", "certificate", "ration", "license", "passport"], label: "Helpline", to: "/portal/helpline", response: "Connecting to Public Helpline — I'll answer your government service questions." },
  { keywords: ["rural", "village", "mgnrega", "job card", "housing", "gram", "panchayat"], label: "Rural Dev", to: "/portal/rural", response: "Opening Rural Development — find employment, housing, and village programs." },
  { keywords: ["farm", "farmer", "crop", "agriculture", "pest", "fertilizer", "soil", "weather"], label: "Agriculture", to: "/portal/agriculture", response: "Going to Agriculture Advisory — crop guidance, weather, and disease detection." },
];

interface RecentCommand {
  text: string;
  time: string;
  routed?: string;
}

function Voice() {
  const [language, setLanguage] = useState("en");
  const [orbState, setOrbState] = useState<VoiceOrbState>("idle");
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const [recentCommands, setRecentCommands] = useState<RecentCommand[]>([
    { text: "Find schemes for farmers", time: "5m ago", routed: "Scheme AI" },
    { text: "Register road damage complaint", time: "22m ago", routed: "Grievances" },
  ]);
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null);

  const resolveIntent = (text: string) => {
    const lower = text.toLowerCase();
    for (const route of COMMAND_ROUTES) {
      if (route.keywords.some((k) => lower.includes(k))) {
        return route;
      }
    }
    return null;
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
    recognition.onerror = () => { setOrbState("idle"); toast.error("Voice input failed."); };
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const text = e.results[0][0].transcript;
      setLastCommand(text);
      setOrbState("processing");

      const matched = resolveIntent(text);
      setTimeout(() => {
        setOrbState("speaking");
        const reply = matched
          ? matched.response
          : `I heard: "${text}". I can help you navigate services, file complaints, find schemes, or get city information. Try being more specific.`;

        setIntent(matched ? matched.label : "General Query");
        setRecentCommands((prev) => [
          { text, time: "just now", routed: matched?.label },
          ...prev.slice(0, 4),
        ]);

        const utterance = new SpeechSynthesisUtterance(reply);
        utterance.lang = SPEECH_LANG[language] ?? "en-IN";
        utterance.onend = () => setOrbState("idle");
        window.speechSynthesis.speak(utterance);

        if (matched) {
          toast.success(`Routing to ${matched.label}`, { description: "Click to navigate →", action: { label: "Go", onClick: () => window.location.href = matched.to } });
        }
      }, 800);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }, [orbState, language]);

  return (
    <div>
      <PageHeader
        icon={Mic}
        title="Digital Governance Voice Interface"
        description="Conversational, multilingual voice access to every citizen service — all in one place."
      />

      {/* Language selector */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Language</span>
        <LanguageSelector value={language} onChange={setLanguage} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Left: Main Voice Orb */}
        <div className="space-y-5">
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center gap-6 py-10">
              <VoiceOrb state={orbState} onClick={handleVoiceOrb} size="lg" />

              {/* Intent display */}
              <div className="mt-6 w-full text-center space-y-2">
                {lastCommand && (
                  <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                    <p className="text-xs text-muted-foreground">Last command</p>
                    <p className="text-sm font-medium mt-0.5">"{lastCommand}"</p>
                    {intent && (
                      <Badge className="mt-1.5 bg-primary/15 text-primary" variant="secondary">
                        → {intent}
                      </Badge>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground italic">
                  Try: "Find schemes for farmers" · "File a water complaint" · "Traffic update"
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recent commands */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Recent Voice Commands
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentCommands.map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-xs">
                  <div>
                    <p className="font-medium text-foreground">"{c.text}"</p>
                    <p className="text-muted-foreground mt-0.5">{c.time} {c.routed ? `→ ${c.routed}` : ""}</p>
                  </div>
                  <Mic className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick module navigation */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Navigate by Voice or Click</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {QUICK_MODULES.map((m) => (
                <Link
                  key={m.to}
                  to={m.to}
                  className="group flex items-center gap-3 rounded-xl border border-border p-3 transition-all hover:border-primary/40 hover:bg-muted/50"
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${m.color}`}>
                    <m.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{m.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{m.desc}</p>
                  </div>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 shrink-0" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: Chat panel */}
        <ChatPanel
          title="Governance Voice Assistant"
          greeting="I'm your unified voice interface for all government services. Ask me anything — I'll navigate, inform, or assist you across all modules."
          suggestions={[
            "Find welfare schemes for me",
            "Register a road damage complaint",
            "Smart city traffic update",
            "Agricultural advice for wheat",
          ]}
          module="voice"
          showLanguageSelector={false}
        />
      </div>
    </div>
  );
}
