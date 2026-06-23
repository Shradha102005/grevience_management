import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Megaphone,
  Sparkles,
  Phone,
  MessageSquare,
  Users,
  Send,
  Copy,
  CheckCircle2,
  RefreshCw,
  Mic,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { StatCard } from "@/components/portal/stat-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api";

export const Route = createFileRoute("/portal/election")({
  head: () => ({ meta: [{ title: "Campaign Assistant — CIVICOS AI" }] }),
  component: Election,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface SpeechResult {
  session_id: string;
  generated_speech: string;
  candidate_name: string;
  theme: string;
  audience: string;
  is_mock_ai: boolean;
  created_at: string;
}

interface DeliveryResult {
  phone: string;
  sms_status: string | null;
  call_status: string | null;
}

interface OutreachResult {
  session_id: string;
  total_phones: number;
  results: DeliveryResult[];
}

interface CampaignSession {
  id: string;
  candidate_name: string;
  theme: string;
  audience: string;
  generated_speech: string;
  is_mock_ai: boolean;
  created_at: string;
  creator_name: string | null;
  total_reached: number;
  sms_sent: number;
  calls_made: number;
}


// ── Constants ─────────────────────────────────────────────────────────────────

const AUDIENCE_OPTIONS = [
  { value: "all_voters", label: "All Voters" },
  { value: "youth", label: "Youth (18–29)" },
  { value: "farmers", label: "Farmers" },
  { value: "urban", label: "Urban Professionals" },
  { value: "senior", label: "Senior Citizens" },
];

const VOTER_SEGMENTS = [
  { label: "Farmers", pct: 34, color: "from-emerald-500 to-green-400" },
  { label: "Youth (18–29)", pct: 28, color: "from-violet-500 to-purple-400" },
  { label: "Urban professionals", pct: 21, color: "from-sky-500 to-blue-400" },
  { label: "Senior citizens", pct: 17, color: "from-amber-500 to-orange-400" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function statusBadge(status: string | null) {
  if (!status) return null;
  const map: Record<string, string> = {
    sent: "bg-green-500/15 text-green-700 border-green-500/30",
    mock: "bg-blue-500/15 text-blue-700 border-blue-500/30",
    failed: "bg-red-500/15 text-red-700 border-red-500/30",
  };
  return map[status] ?? "bg-muted text-muted-foreground";
}



// ── Tab: Generate Speech ──────────────────────────────────────────────────────

function GenerateSpeechTab({
  onSpeechGenerated,
}: {
  onSpeechGenerated: (result: SpeechResult) => void;
}) {
  const [form, setForm] = useState({
    candidate_name: "",
    theme: "",
    audience: "all_voters",
    key_points: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SpeechResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!form.candidate_name.trim() || !form.theme.trim() || !form.key_points.trim()) {
      toast.error("Please fill in all fields before generating.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post<SpeechResult>("/api/election/generate-speech", form);
      setResult(data);
      onSpeechGenerated(data);
      toast.success(
        data.is_mock_ai
          ? "✍️ Template speech ready (add Gemini key for AI-generated speeches)"
          : "✨ AI speech generated successfully!"
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail ?? "Failed to generate speech.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.generated_speech);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Speech copied to clipboard!");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      {/* Form */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Speech Parameters
          </CardTitle>
          <CardDescription>
            Fill in the details and let AI craft a compelling campaign speech.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="candidate-name">Candidate Name</Label>
            <Input
              id="candidate-name"
              placeholder="e.g. Rajesh Kumar"
              value={form.candidate_name}
              onChange={(e) => setForm((f) => ({ ...f, candidate_name: e.target.value }))}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="campaign-theme">Campaign Theme</Label>
            <Input
              id="campaign-theme"
              placeholder="e.g. Clean Water for All"
              value={form.theme}
              onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Target Audience</Label>
            <Select
              value={form.audience}
              onValueChange={(v) => setForm((f) => ({ ...f, audience: v }))}
            >
              <SelectTrigger id="audience-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="key-points">Key Talking Points</Label>
            <Textarea
              id="key-points"
              rows={5}
              placeholder={"• Better roads and infrastructure\n• Free healthcare for all\n• 1000 new jobs in 6 months\n• Clean drinking water supply"}
              value={form.key_points}
              onChange={(e) => setForm((f) => ({ ...f, key_points: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              One point per line. These will all be incorporated into the speech.
            </p>
          </div>

          <Button
            id="generate-speech-btn"
            className="w-full"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Campaign Speech
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              Generated Speech
            </CardTitle>
            <CardDescription>
              {result
                ? result.is_mock_ai
                  ? "Template speech — add GEMINI_API_KEY for AI-personalised content"
                  : "AI-crafted speech — ready to deliver"
                : "Your speech will appear here after generation"}
            </CardDescription>
          </div>
          {result && (
            <Button variant="outline" size="sm" onClick={handleCopy} id="copy-speech-btn">
              {copied ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{result.candidate_name}</Badge>
                <Badge variant="secondary">{result.theme}</Badge>
                <Badge variant="secondary">
                  {AUDIENCE_OPTIONS.find((a) => a.value === result.audience)?.label}
                </Badge>
                {result.is_mock_ai && (
                  <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700" variant="secondary">
                    Template Mode
                  </Badge>
                )}
              </div>
              <div
                className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[420px] overflow-y-auto"
                id="speech-output"
              >
                {result.generated_speech}
              </div>
            </div>
          ) : (
            <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-muted-foreground">
              <Sparkles className="h-10 w-10 opacity-30" />
              <p className="text-sm">Fill in the form and click generate</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab: Telephone Outreach ───────────────────────────────────────────────────

function TelephoneOutreachTab({
  latestSpeech,
  onOutreachComplete,
}: {
  latestSpeech: SpeechResult | null;
  onOutreachComplete: () => void;
}) {
  const [phonesInput, setPhonesInput] = useState("");
  const [sendSms, setSendSms] = useState(true);
  const [sendCall, setSendCall] = useState(false);
  const [loading, setLoading] = useState(false);
  const [outreachResult, setOutreachResult] = useState<OutreachResult | null>(null);

  const parsePhones = (raw: string): string[] => {
    return raw
      .split(/[\n,]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  };

  const handleLaunch = async () => {
    if (!latestSpeech) {
      toast.error("Please generate a speech first in the Generate tab.");
      return;
    }
    const phones = parsePhones(phonesInput);
    if (phones.length === 0) {
      toast.error("Enter at least one phone number.");
      return;
    }
    if (!sendSms && !sendCall) {
      toast.error("Select at least one outreach channel (SMS or Voice Call).");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post<OutreachResult>("/api/election/outreach", {
        session_id: latestSpeech.session_id,
        phones,
        send_sms: sendSms,
        send_call: sendCall,
      });
      setOutreachResult(data);
      onOutreachComplete();
      toast.success(`🚀 Campaign launched to ${data.total_phones} number(s)!`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail ?? "Outreach failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      {/* Config */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Outreach Configuration
          </CardTitle>
          <CardDescription>
            Target phone numbers and select delivery channels.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Campaign context */}
          {latestSpeech ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
              <p className="mb-1 font-medium text-primary">Campaign Ready</p>
              <p className="text-muted-foreground">
                <span className="font-medium">{latestSpeech.candidate_name}</span> ·{" "}
                {latestSpeech.theme}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
              <p className="font-medium">No speech selected</p>
              <p className="text-xs mt-0.5">Generate a speech in the first tab to enable outreach.</p>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="phones-input">Phone Numbers (E.164 format)</Label>
            <Textarea
              id="phones-input"
              rows={6}
              placeholder={"+919876543210\n+918765432100\n+917654321009"}
              value={phonesInput}
              onChange={(e) => setPhonesInput(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              One number per line or comma-separated · Must include country code (+91…)
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="mb-3 text-sm font-medium">Delivery Channels</p>
            <div className="flex gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm" htmlFor="ch-sms">
                <Checkbox
                  id="ch-sms"
                  checked={sendSms}
                  onCheckedChange={(c) => setSendSms(!!c)}
                />
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                SMS
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm" htmlFor="ch-call">
                <Checkbox
                  id="ch-call"
                  checked={sendCall}
                  onCheckedChange={(c) => setSendCall(!!c)}
                />
                <Phone className="h-4 w-4 text-muted-foreground" />
                Voice Call
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Numbers parsed:</span>
            <span className="font-semibold">{parsePhones(phonesInput).length}</span>
          </div>

          <Button
            id="launch-campaign-btn"
            className="w-full"
            onClick={handleLaunch}
            disabled={loading || !latestSpeech}
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Launching…
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Launch Campaign
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Delivery Results
          </CardTitle>
          <CardDescription>
            {outreachResult
              ? `Campaign sent to ${outreachResult.total_phones} recipient(s)`
              : "Results will appear here after launching"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {outreachResult ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {outreachResult.results.map((r, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
                >
                  <span className="font-mono text-xs text-muted-foreground">{r.phone}</span>
                  <div className="flex gap-2">
                    {r.sms_status && (
                      <span
                        className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge(r.sms_status)}`}
                      >
                        <MessageSquare className="h-3 w-3" />
                        SMS: {r.sms_status}
                      </span>
                    )}
                    {r.call_status && (
                      <span
                        className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge(r.call_status)}`}
                      >
                        <Phone className="h-3 w-3" />
                        Call: {r.call_status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-muted-foreground">
              <Send className="h-10 w-10 opacity-30" />
              <p className="text-sm">No outreach launched yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab: Voter Segments & History ─────────────────────────────────────────────

function VoterSegmentsTab() {
  const [sessions, setSessions] = useState<CampaignSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<CampaignSession[]>("/api/election/campaigns");
      setSessions(data);
    } catch {
      toast.error("Failed to load campaign history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      {/* Voter Segments */}
      <Card className="shadow-card h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Voter Segments
          </CardTitle>
          <CardDescription>Constituency demographic breakdown</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {VOTER_SEGMENTS.map((seg) => (
            <div key={seg.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{seg.label}</span>
                <span className="font-semibold text-foreground">{seg.pct}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${seg.color} transition-all duration-700`}
                  style={{ width: `${seg.pct}%` }}
                />
              </div>
            </div>
          ))}

          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-medium text-primary">Recommended Focus</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Target <strong>Farmers + Youth</strong> for maximum reach (62% combined voter share).
              Consider rural outreach in vernacular languages.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Campaign History */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Campaign History
            </CardTitle>
            <CardDescription>All generated speeches and outreach sessions</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchSessions} id="refresh-history-btn">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Loading history…</p>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <History className="h-10 w-10 opacity-30" />
              <p className="text-sm">No campaigns yet. Generate your first speech!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-border bg-card/60 p-4 transition-all"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{s.candidate_name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {AUDIENCE_OPTIONS.find((a) => a.value === s.audience)?.label}
                        </Badge>
                        {s.is_mock_ai && (
                          <Badge
                            variant="secondary"
                            className="border-amber-500/30 bg-amber-500/10 text-amber-700 text-xs"
                          >
                            Template
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                        {s.theme}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {s.sms_sent} SMS
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {s.calls_made} calls
                      </span>
                      <span>{timeAgo(s.created_at)}</span>
                    </div>
                  </div>

                  <button
                    className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  >
                    {expandedId === s.id ? (
                      <>
                        <ChevronUp className="h-3 w-3" /> Hide speech
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" /> Preview speech
                      </>
                    )}
                  </button>

                  {expandedId === s.id && (
                    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto text-muted-foreground">
                      {s.generated_speech}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type TabId = "generate" | "outreach" | "segments";

const TABS: { id: TabId; label: string; icon: typeof Megaphone }[] = [
  { id: "generate", label: "Generate Speech", icon: Sparkles },
  { id: "outreach", label: "Telephone Outreach", icon: Phone },
  { id: "segments", label: "Voter Segments & History", icon: Users },
];

function Election() {
  const { user } = useAuth();
  const isStaff = user?.role === "admin" || user?.role === "officer";

  const [activeTab, setActiveTab] = useState<TabId>(isStaff ? "generate" : "segments");
  const [latestSpeech, setLatestSpeech] = useState<SpeechResult | null>(null);
  const [totalCampaigns, setTotalCampaigns] = useState<number>(0);

  // Refresh total campaign count
  const refreshCount = useCallback(() => {
    api
      .get<CampaignSession[]>("/api/election/campaigns")
      .then(({ data }) => setTotalCampaigns(data.length))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  const visibleTabs = isStaff ? TABS : TABS.filter((t) => t.id === "segments");

  return (
    <div>
      <PageHeader
        icon={Megaphone}
        title="Election Campaigning Assistant"
        description="AI-powered speech generation, multi-channel voter outreach, and campaign analytics."
      />

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Campaigns" value={String(totalCampaigns)} delta="speeches created" icon={Megaphone} />
        <StatCard label="Voter Reach" value="3.2M" delta="+22% vs last election" />
        <StatCard label="Voice Calls" value="184K" delta="+8% outreach" />
        <StatCard label="Engagement" value="41%" delta="+5pt response rate" />
      </div>

      {/* Status Banner (admin/officer only) */}

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "generate" && isStaff && (
        <GenerateSpeechTab
          onSpeechGenerated={(s) => {
            setLatestSpeech(s);
            refreshCount();
          }}
        />
      )}
      {activeTab === "outreach" && isStaff && (
        <TelephoneOutreachTab
          latestSpeech={latestSpeech}
          onOutreachComplete={refreshCount}
        />
      )}
      {activeTab === "segments" && <VoterSegmentsTab />}
    </div>
  );
}
