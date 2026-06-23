import { useState, useCallback, useRef, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Landmark,
  Search,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { ChatPanel } from "@/components/portal/chat-panel";
import { VoiceOrb, type VoiceOrbState } from "@/components/portal/voice-orb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageSelector } from "@/components/portal/language-selector";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/scheme-ai")({
  head: () => ({ meta: [{ title: "Scheme AI — CIVICOS AI" }] }),
  component: SchemeAI,
});

const SPEECH_LANG: Record<string, string> = {
  en: "en-IN", hi: "hi-IN", te: "te-IN", ta: "ta-IN",
  kn: "kn-IN", ml: "ml-IN", mr: "mr-IN", bn: "bn-IN",
};

const API_BASE = "http://localhost:8000";

const CATEGORIES = ["All", "Agriculture", "Health", "Housing", "Education", "Finance", "Insurance", "Employment", "Energy", "Women & Child", "Urban Livelihood", "Rural Livelihood"];

interface Scheme {
  id: string;
  name: string;
  category: string;
  ministry: string;
  benefit: string;
  eligibility: string;
  documents: string;
  portal_url: string;
  helpline: string;
  status: string;
}

const catColor: Record<string, string> = {
  Agriculture: "bg-green-500/15 text-green-700 dark:text-green-400",
  Health: "bg-red-500/15 text-red-700 dark:text-red-400",
  Housing: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  Education: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  Finance: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  Insurance: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  Employment: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  Energy: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "Women & Child": "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  "Urban Livelihood": "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
};

function SchemeAI() {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [language, setLanguage] = useState("en");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [orbState, setOrbState] = useState<VoiceOrbState>("idle");
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null);

  const fetchSchemes = useCallback(async (q?: string, cat?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      if (cat && cat !== "All") params.set("category", cat);
      const resp = await fetch(`${API_BASE}/live/schemes?${params.toString()}`);
      if (!resp.ok) throw new Error("Failed");
      const data = await resp.json();
      setSchemes(data.schemes ?? []);
      setLastFetch(new Date().toLocaleTimeString());
    } catch {
      toast.error("Failed to load schemes from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchemes(); }, [fetchSchemes]);

  const filtered = schemes;


  const handleVoiceOrb = useCallback(() => {
    if (orbState === "listening") {
      recognitionRef.current?.stop();
      setOrbState("idle");
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SR) {
      toast.error("Voice input requires Chrome or Edge browser.");
      return;
    }

    const recognition = new SR();
    recognition.lang = SPEECH_LANG[language] ?? "en-IN";
    recognition.onstart = () => setOrbState("listening");
    recognition.onerror = () => setOrbState("idle");
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      setOrbState("processing");
      setSearch(transcript);
      setTimeout(() => {
        setOrbState("idle");
        toast.success(`Searching for: "${transcript}"`);
      }, 800);
    };
    recognition.onend = () => {
      if (orbState !== "processing") setOrbState("idle");
    };
    recognitionRef.current = recognition;
    recognition.start();
  }, [orbState, language]);

  return (
    <div>
      <PageHeader
        icon={Landmark}
        title="Government Scheme Awareness Bot"
        description="Discover schemes, check eligibility, and get application guidance — by chat or voice."
      />

      {/* Language selector */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Language</span>
        <LanguageSelector value={language} onChange={setLanguage} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Left: Scheme Discovery */}
        <div className="space-y-5">
          {/* Search + Filter */}
          <Card className="shadow-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-10 pl-9"
                  placeholder="Search schemes by name, category, or benefit…"
                  value={search}
                onChange={(e) => { setSearch(e.target.value); fetchSchemes(e.target.value, activeCat); }}
                />
              </div>
              <Button
                variant={orbState === "listening" ? "destructive" : "outline"}
                size="icon"
                className={orbState === "listening" ? "animate-pulse" : ""}
                onClick={handleVoiceOrb}
                title="Search by voice"
              >
                {orbState === "listening" ? <span className="text-xs">Stop</span> : <span className="text-xs">🎤</span>}
              </Button>
            </div>
            {/* Category filter chips */}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => { setActiveCat(c); fetchSchemes(search, c); }}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all border ${
                    activeCat === c
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:bg-muted"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Card>

          {/* Scheme list */}
          <Card className="shadow-card">
            <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
              <CardTitle>Scheme Discovery</CardTitle>
              <div className="flex items-center gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {lastFetch && <span className="text-xs text-muted-foreground">Updated {lastFetch}</span>}
                <button onClick={() => fetchSchemes(search, activeCat)} title="Refresh" className="rounded p-1 hover:bg-muted">
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <span className="text-xs text-muted-foreground">{filtered.length} schemes</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {loading && schemes.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm">Loading schemes from server…</p>
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No schemes match your search.</p>
              ) : (
                filtered.map((s) => (
                  <div key={s.id} className="rounded-xl border border-border overflow-hidden transition-all hover:border-primary/40">
                    <div className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <h3 className="font-semibold text-sm">{s.name}</h3>
                          <Badge className={catColor[s.category] ?? "bg-secondary text-secondary-foreground"} variant="secondary">
                            {s.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{s.benefit}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                          className="rounded-lg p-1.5 hover:bg-muted transition-colors"
                        >
                          {expanded === s.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    {expanded === s.id && (
                      <div className="border-t border-border bg-muted/40 px-4 py-3 space-y-2 text-xs">
                        <div><span className="font-semibold text-foreground">Ministry: </span><span className="text-muted-foreground">{s.ministry}</span></div>
                        <div><span className="font-semibold text-foreground">Eligibility: </span><span className="text-muted-foreground">{s.eligibility}</span></div>
                        <div><span className="font-semibold text-foreground">Documents: </span><span className="text-muted-foreground">{s.documents}</span></div>
                        <div><span className="font-semibold text-foreground">Helpline: </span><span className="text-muted-foreground font-mono">{s.helpline}</span></div>
                        <div className="flex items-center gap-2 pt-1">
                          <Button size="sm" className="h-7 text-xs" onClick={() => toast.success(`Eligibility check initiated for ${s.name}`)}>
                            <CheckCircle2 className="mr-1.5 h-3 w-3" /> Check Eligibility
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                            <a href={s.portal_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-1.5 h-3 w-3" /> Official Portal
                            </a>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Voice Orb + Chat */}
        <div className="space-y-5">
          {/* Voice Scheme Discovery */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Voice Scheme Discovery</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Speak your profile — find matching schemes instantly</p>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6 pb-8">
              <VoiceOrb state={orbState} onClick={handleVoiceOrb} size="md" />
              <div className="mt-6 w-full space-y-1">
                {["Schemes for farmers", "Health insurance for poor family", "Housing subsidy for rural family", "Education scholarship for SC student"].map((hint) => (
                  <button
                    key={hint}
                    className="w-full rounded-lg border border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => { setSearch(hint); toast.info(`Filtering: "${hint}"`); }}
                  >
                    💬 "{hint}"
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Chat */}
          <ChatPanel
            title="Scheme Assistant"
            greeting="Tell me about yourself — your occupation, income, state, and family size — and I'll find the schemes you qualify for."
            suggestions={["Schemes for farmers in AP", "Health insurance eligibility", "Housing subsidy for BPL family", "Scholarships for girl students"]}
            module="scheme"
            showLanguageSelector={false}
          />
        </div>
      </div>
    </div>
  );
}
