import { useState, useRef, useCallback, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  PhoneCall,
  TicketCheck,
  Building2,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { ChatPanel } from "@/components/portal/chat-panel";
import { VoiceOrb, type VoiceOrbState } from "@/components/portal/voice-orb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/helpline")({
  head: () => ({ meta: [{ title: "Public Helpline — CIVICOS AI" }] }),
  component: Helpline,
});

// Departments now fetched from /live/departments (real govt contacts)
const FAQS = [
  { q: "How to get a birth certificate?", a: "Visit your Municipal Corporation / Gram Panchayat with hospital discharge summary, parents' Aadhaar. Process takes 7-10 days." },
  { q: "How to check ration card status?", a: "Visit yourpds.in or call 1967. You need your ration card number or Aadhaar linked mobile." },
  { q: "How to update Aadhaar address?", a: "Visit UIDAI portal (uidai.gov.in), use your registered mobile OTP or visit nearest Aadhaar Kendra with address proof." },
  { q: "How to apply for income certificate?", a: "Visit Meeseva / Lok Mitra / CSC centre with Aadhaar, ration card, and previous year's income proof. Fee: ₹30-60." },
];

const API_BASE = "http://localhost:8000";

const SPEECH_LANG: Record<string, string> = {
  en: "en-IN", hi: "hi-IN", te: "te-IN", ta: "ta-IN",
  kn: "kn-IN", ml: "ml-IN", mr: "mr-IN", bn: "bn-IN",
};

function Helpline() {
  const [orbState, setOrbState] = useState<VoiceOrbState>("idle");
  const [transcript, setTranscript] = useState("");
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null);
  const language = "en";

  interface Department {
    id: string;
    name: string;
    phone: string;
    services: string;
  }
  const [depts, setDepts] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  const fetchDepts = useCallback(async () => {
    setLoadingDepts(true);
    try {
      const resp = await fetch(`${API_BASE}/live/departments`);
      if (resp.ok) {
        const data = await resp.json();
        setDepts(data.departments || []);
      }
    } catch (err) {
      console.error("Failed to fetch departments", err);
    } finally {
      setLoadingDepts(false);
    }
  }, []);

  useEffect(() => {
    fetchDepts();
  }, [fetchDepts]);

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
    recognition.lang = SPEECH_LANG[language];
    recognition.onstart = () => setOrbState("listening");
    recognition.onerror = () => setOrbState("idle");
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const t = e.results[0][0].transcript;
      setTranscript(t);
      setOrbState("processing");
      setTimeout(() => {
        setOrbState("speaking");
        const tid = `HLP-${Math.floor(Math.random() * 90000 + 10000)}`;
        setTicketId(tid);
        const utterance = new SpeechSynthesisUtterance(
          `I've recorded your query: ${t}. Your ticket number is ${tid}. Our team will respond within 24 hours.`
        );
        utterance.lang = "en-IN";
        utterance.onend = () => setOrbState("idle");
        window.speechSynthesis.speak(utterance);
        toast.success(`Query logged! Ticket: ${tid}`);
      }, 1200);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }, [orbState, language]);

  return (
    <div>
      <PageHeader
        icon={PhoneCall}
        title="Public Information Helpline"
        description="24/7 voice and chat assistance with smart call routing and query tracking."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Left: Voice Bot */}
        <div className="space-y-5">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Voice Helpline Bot</CardTitle>
              <p className="text-xs text-muted-foreground">Speak your question — get instant guidance</p>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6 pb-8">
              <VoiceOrb state={orbState} onClick={handleVoiceOrb} size="lg" />
              {transcript && (
                <div className="mt-6 w-full rounded-xl border border-border bg-muted/50 p-4 text-sm">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Your query:</p>
                  <p className="text-foreground">{transcript}</p>
                </div>
              )}
              {ticketId && (
                <div className="w-full rounded-xl border border-success/40 bg-success/10 p-4 flex items-center gap-3">
                  <TicketCheck className="h-5 w-5 text-success shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-success">Query Logged</p>
                    <p className="text-sm font-bold text-foreground">{ticketId}</p>
                    <p className="text-xs text-muted-foreground">Expected response: 24 hours</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Common Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {FAQS.map((faq, i) => (
                <div key={i} className="rounded-lg border border-border overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  >
                    {faq.q}
                    <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expandedFaq === i ? "rotate-90" : ""}`} />
                  </button>
                  {expandedFaq === i && (
                    <div className="border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: Chat + Department directory */}
        <div className="space-y-5">
          <ChatPanel
            title="Helpline Assistant"
            greeting="Hello! I can answer government service questions and route you to the right department. What do you need help with?"
            suggestions={["Birth certificate process", "Ration card application", "Aadhaar address update", "Income certificate"]}
            module="helpline"
            showLanguageSelector={true}
          />

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Department Directory
              </CardTitle>
              <button onClick={fetchDepts} className="p-1 hover:bg-muted rounded" title="Refresh">
                <RefreshCw className={`h-4 w-4 text-muted-foreground ${loadingDepts ? "animate-spin" : ""}`} />
              </button>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingDepts ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                depts.map((d) => (
                <div
                  key={d.name}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-muted/40 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{d.services}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge variant="outline" className="text-xs font-mono">{d.phone}</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => {
                        toast.info(`Connecting to ${d.name}…`, { description: `Helpline: ${d.phone}` });
                      }}
                    >
                      Connect →
                    </Button>
                  </div>
                </div>
              )))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
