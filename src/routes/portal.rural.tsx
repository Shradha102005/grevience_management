import { useState, useRef, useCallback, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Sprout,
  Home,
  Briefcase,
  Droplets,
  GraduationCap,
  Users,
  Calculator,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { ChatPanel } from "@/components/portal/chat-panel";
import { VoiceOrb, type VoiceOrbState } from "@/components/portal/voice-orb";
import { LanguageSelector } from "@/components/portal/language-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/rural")({
  head: () => ({ meta: [{ title: "Rural Development — CIVICOS AI" }] }),
  component: Rural,
});

const SPEECH_LANG: Record<string, string> = {
  en: "en-IN", hi: "hi-IN", te: "te-IN", ta: "ta-IN",
  kn: "kn-IN", ml: "ml-IN", mr: "mr-IN", bn: "bn-IN",
};

const LANG_GREETINGS: Record<string, string> = {
  en: "Ask about rural programs, employment, subsidies, or village services.",
  hi: "रोजगार, सब्सिडी, या ग्राम विकास योजनाओं के बारे में पूछें।",
  te: "గ్రామీణ కార్యక్రమాలు, ఉపాధి, సబ్సిడీలు గురించి అడగండి.",
  ta: "கிராம வளர்ச்சி திட்டங்கள், வேலை, மானியங்கள் பற்றி கேளுங்கள்.",
  kn: "ಗ್ರಾಮೀಣ ಕಾರ್ಯಕ್ರಮಗಳು, ಉದ್ಯೋಗ, ಸಬ್ಸಿಡಿಗಳ ಬಗ್ಗೆ ಕೇಳಿ.",
  ml: "ഗ്രാമവികസന പരിപാടികൾ, തൊഴിൽ, സബ്സിഡികൾ എന്നിവയെ കുറിച്ച് ചോദിക്കൂ.",
  mr: "ग्रामीण कार्यक्रम, रोजगार, अनुदान याबद्दल विचारा.",
  bn: "গ্রামীণ কর্মসূচি, কর্মসংস্থান, ভর্তুকি সম্পর্কে জিজ্ঞাসা করুন।",
};

const API_BASE = "http://localhost:8000";

interface Program {
  id: string;
  name: string;
  category: string;
  description: string;
  benefit: string;
  how_to_apply: string;
  contact: string;
  helpline: string;
}

function Rural() {
  const [language, setLanguage] = useState("en");
  const [orbState, setOrbState] = useState<VoiceOrbState>("idle");
  const [landAcres, setLandAcres] = useState("");
  const [subsidy, setSubsidy] = useState<string | null>(null);
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null);

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/live/rural-programs`);
      if (resp.ok) {
        const data = await resp.json();
        setPrograms(data.programs || []);
      }
    } catch (err) {
      console.error("Failed to load programs", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const getIconForCategory = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "employment": return { icon: Briefcase, color: "text-teal-600 bg-teal-50 dark:bg-teal-950 dark:text-teal-400" };
      case "housing": return { icon: Home, color: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400" };
      case "water": return { icon: Droplets, color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950 dark:text-cyan-400" };
      case "finance": return { icon: Users, color: "text-pink-600 bg-pink-50 dark:bg-pink-950 dark:text-pink-400" };
      case "skills": return { icon: GraduationCap, color: "text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400" };
      case "infrastructure": return { icon: Home, color: "text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400" };
      default: return { icon: Sprout, color: "text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400" };
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
      toast.info(`Heard: "${t}"`, { description: "Looking up rural programs…" });
      setTimeout(() => {
        setOrbState("speaking");
        const reply = `I heard: ${t}. I can help you with rural development programs. Please ask about MGNREGA, housing, water, or skill development.`;
        const utterance = new SpeechSynthesisUtterance(reply);
        utterance.lang = SPEECH_LANG[language] ?? "en-IN";
        utterance.onend = () => setOrbState("idle");
        window.speechSynthesis.speak(utterance);
      }, 1000);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }, [orbState, language]);

  const calcSubsidy = () => {
    const acres = parseFloat(landAcres);
    if (!acres || acres <= 0) {
      toast.error("Please enter valid land size.");
      return;
    }
    const pmKisan = 6000;
    const fasal = Math.round(acres * 1200);
    const total = pmKisan + fasal;
    setSubsidy(`PM-KISAN: ₹${pmKisan.toLocaleString()}/year + PM Fasal Bima estimate: ₹${fasal.toLocaleString()} = Total: ₹${total.toLocaleString()}/year`);
  };

  return (
    <div>
      <PageHeader
        icon={Sprout}
        title="Rural Development Information Bot"
        description="Multilingual access to village programs, subsidies, employment schemes and welfare services."
      />

      {/* Language selector — prominent for rural users */}
      <Card className="mb-6 shadow-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold">अपनी भाषा चुनें / Choose your language:</span>
          <LanguageSelector value={language} onChange={setLanguage} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Left: Voice Orb + Subsidy calculator */}
        <div className="space-y-5">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>ग्रामीण सहायक / Rural Voice Bot</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{LANG_GREETINGS[language]}</p>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6 pb-8">
              <VoiceOrb state={orbState} onClick={handleVoiceOrb} size="lg" />
              <div className="mt-6 w-full space-y-1.5">
                {["MGNREGA job card apply", "PM Awas Yojana eligibility", "SHG loan for women group", "Skill training registration"].map((hint) => (
                  <button
                    key={hint}
                    className="w-full rounded-lg border border-border px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    onClick={() => toast.info(`Try asking: "${hint}"`)}
                  >
                    🎤 {hint}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Subsidy calculator */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" /> Subsidy Estimator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Land size (in acres)</label>
                <div className="mt-1 flex gap-2">
                  <Input
                    type="number"
                    placeholder="e.g. 2.5"
                    value={landAcres}
                    onChange={(e) => setLandAcres(e.target.value)}
                    className="h-9"
                  />
                  <Button size="sm" onClick={calcSubsidy} className="h-9 shrink-0">
                    Calculate
                  </Button>
                </div>
              </div>
              {subsidy && (
                <div className="rounded-lg bg-success/10 border border-success/30 p-3 text-xs text-foreground">
                  {subsidy}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Programs + Chat */}
        <div className="space-y-5">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Active Rural Programs</CardTitle>
              <button onClick={fetchPrograms} className="p-1 hover:bg-muted rounded" title="Refresh">
                <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
              </button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                programs.map((p) => {
                  const style = getIconForCategory(p.category);
                  const Icon = style.icon;
                  return (
                    <div key={p.id} className="flex flex-col gap-2 rounded-xl border border-border p-3 hover:border-primary/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${style.color}`}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold truncate">{p.name}</p>
                            <Badge variant="secondary" className="text-[10px] shrink-0">{p.category}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
                        </div>
                      </div>
                      <div className="text-[10px] bg-muted/40 p-2 rounded text-muted-foreground">
                        <span className="font-semibold text-foreground">Benefit:</span> {p.benefit} <br />
                        <span className="font-semibold text-foreground">Apply:</span> {p.how_to_apply}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <ChatPanel
            title="Rural Development Assistant"
            greeting="Ask me about employment schemes, subsidies, village development programs, or how to apply for benefits."
            suggestions={["MGNREGA work days available", "Housing subsidy eligibility", "SHG loan for women", "Skill training near me"]}
            module="rural"
            showLanguageSelector={false}
          />
        </div>
      </div>
    </div>
  );
}
