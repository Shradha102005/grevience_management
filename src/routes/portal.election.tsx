import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Megaphone,
  Sparkles,
  Phone,
  MessageSquare,
  Send,
  Copy,
  ArrowLeft,
  Plus,
  Users,
  User,
  Bot,
  Loader2,
  Play,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
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
  component: Election,
});

//  Types 
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

const AUDIENCE_OPTIONS = [
  { value: "all_voters", label: "All Voters", icon: "👥" },
  { value: "youth", label: "Youth (18–29)", icon: "🎓" },
  { value: "farmers", label: "Farmers", icon: "🌾" },
  { value: "urban", label: "Urban Professionals", icon: "💼" },
  { value: "senior", label: "Senior Citizens", icon: "👴" },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

//  Shared UI Components 

function ChatBubble({
  role,
  children,
  avatar,
}: {
  role: "user" | "bot";
  children: React.ReactNode;
  avatar?: React.ReactNode;
}) {
  const isUser = role === "user";
  return (
    <div
      style={{
        display: "flex",
        gap: "16px",
        padding: "16px 20px",
        flexDirection: isUser ? "row-reverse" : "row",
        animation: "slideUp 0.3s ease-out",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "12px",
          background: isUser
            ? "var(--color-card)"
            : "linear-gradient(135deg, #8b5cf6, #6d28d9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          border: isUser ? "1px solid var(--color-border)" : "none",
          boxShadow: isUser ? "none" : "0 4px 12px rgba(139,92,246,0.3)",
        }}
      >
        {avatar ? (
          avatar
        ) : isUser ? (
          <User
            style={{
              width: 18,
              height: 18,
              color: "var(--color-muted-foreground)",
            }}
          />
        ) : (
          <Sparkles style={{ width: 18, height: 18, color: "white" }} />
        )}
      </div>
<<<<<<< HEAD
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: isUser ? "flex-end" : "flex-start",
          maxWidth: "80%",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--color-muted-foreground)",
            marginBottom: "6px",
            padding: "0 4px",
          }}
        >
          {isUser ? "You" : "Campaign Architect AI"}
        </span>
=======
      <div style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", maxWidth: "80%" }}>
        <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-muted-foreground)", marginBottom: "6px", padding: "0 4px" }}>{isUser ? "You" : "Campaign Architect AI"}</span>
>>>>>>> 4b6b11d5b8430477f7a10a0fb94cf381a9b34171
        {children}
      </div>
    </div>
  );
}

//  Main Interface 

function Election() {
  const { user } = useAuth();
  const isStaff = user?.role === "admin" || user?.role === "officer";

  const [campaigns, setCampaigns] = useState<CampaignSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation State
  const [view, setView] = useState<"history" | "chat">("history");
  const [selectedCampaign, setSelectedCampaign] =
    useState<CampaignSession | null>(null);

  // New Campaign Form State
  const [newCampForm, setNewCampForm] = useState({
    candidate_name: "",
    theme: "",
    audience: "all_voters",
    key_points: "",
  });
  const [generating, setGenerating] = useState(false);

  // Outreach State
  const [phonesInput, setPhonesInput] = useState("");
  const [sendSms, setSendSms] = useState(true);
  const [sendCall, setSendCall] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [outreachResult, setOutreachResult] = useState<OutreachResult | null>(
    null,
  );

  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<CampaignSession[]>(
        "/api/election/campaigns",
      );
      setCampaigns(data);
    } catch {
      toast.error("Failed to load campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (view === "chat" && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [view, selectedCampaign, generating, outreachResult]);

  const handleGenerate = async () => {
    if (
      !newCampForm.candidate_name ||
      !newCampForm.theme ||
      !newCampForm.key_points
    ) {
      toast.error("Please fill all fields.");
      return;
    }
    setGenerating(true);
    try {
      const { data } = await api.post<SpeechResult>(
        "/api/election/generate-speech",
        newCampForm,
      );
      toast.success("Campaign generated!");
      const refreshData = await api.get<CampaignSession[]>(
        "/api/election/campaigns",
      );
      setCampaigns(refreshData.data);
      const created = refreshData.data.find((c) => c.id === data.session_id);
      if (created) setSelectedCampaign(created);
      setNewCampForm({
        candidate_name: "",
        theme: "",
        audience: "all_voters",
        key_points: "",
      }); // reset
    } catch {
      toast.error("Failed to generate campaign.");
    } finally {
      setGenerating(false);
    }
  };

  const handleLaunchOutreach = async () => {
    if (!selectedCampaign) return;
    const phones = phonesInput
      .split(/[\n,]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (!phones.length || (!sendSms && !sendCall)) {
      toast.error("Invalid configuration.");
      return;
    }
    setLaunching(true);
    try {
      const { data } = await api.post<OutreachResult>(
        "/api/election/outreach",
        {
          session_id: selectedCampaign.id,
          phones,
          send_sms: sendSms,
          send_call: sendCall,
        },
      );
      setOutreachResult(data);
      toast.success(`Launched to ${data.total_phones} contacts`);
      fetchCampaigns();
    } catch {
      toast.error("Outreach failed.");
    } finally {
      setLaunching(false);
    }
  };

  const openNewCampaign = () => {
    setSelectedCampaign(null);
    setOutreachResult(null);
    setView("chat");
  };

  const openCampaign = (c: CampaignSession) => {
    setSelectedCampaign(c);
    setOutreachResult(null);
    setPhonesInput("");
    setView("chat");
  };

  return (
<<<<<<< HEAD
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 4rem)",
        overflow: "hidden",
        background: "#f8fafc",
      }}
      className="-m-6"
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(139,92,246,0.15)",
          background: "white",
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {view === "chat" && (
            <button
              onClick={() => setView("history")}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background: "var(--color-card)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--color-muted)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--color-card)")
              }
            >
              <ArrowLeft
                style={{
                  width: 16,
                  height: 16,
                  color: "var(--color-foreground)",
                }}
              />
            </button>
          )}
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
            }}
          >
            <Megaphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: "var(--color-foreground)",
                margin: 0,
              }}
            >
              Campaign Architect AI
            </h1>
            <p
              style={{
                fontSize: "11px",
                margin: 0,
                fontWeight: 600,
                color: "#8b5cf6",
              }}
            >
              AI Speech Generation & Unified Outreach
            </p>
=======
    <div className="flex flex-col h-[calc(100vh-4rem)] relative overflow-hidden font-sans bg-transparent animate-in fade-in duration-500">
      {/* Premium Ambient Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-pink-500/20 dark:bg-pink-900/30 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-violet-500/20 dark:bg-violet-900/30 blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(148,163,184,0.1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      </div>

      {/* Header */}
      <div className="shrink-0 z-20 px-6 lg:px-10 pt-8 pb-4 border-b border-pink-500/10">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            {view === "chat" && (
              <button onClick={() => setView("history")} className="h-12 w-12 rounded-[1.25rem] bg-white/60 backdrop-blur-2xl dark:bg-[#1A1F2E]/60 border border-white/60 dark:border-slate-700 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-3 flex-wrap">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-600 via-fuchsia-500 to-violet-500 animate-gradient-x">
                  Campaign Architect AI
                </span>
                <Megaphone className="text-pink-500 h-10 w-10 animate-bounce" style={{ animationDuration: '3s' }} />
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 ml-2">
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                  <span className="text-sm font-bold text-pink-600 dark:text-pink-400 uppercase tracking-widest">Active</span>
                </div>
              </h1>
              <p className="text-slate-500/80 dark:text-slate-400 mt-2 font-medium text-sm md:text-base">AI Speech Generation & Unified Outreach</p>
            </div>
>>>>>>> 4b6b11d5b8430477f7a10a0fb94cf381a9b34171
          </div>
        </div>
      </div>

      {/*  Main View Area  */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {/* HISTORY VIEW */}
        {view === "history" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              overflowY: "auto",
              padding: "32px",
            }}
          >
            <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
<<<<<<< HEAD
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "24px",
                }}
              >
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: 800,
                    color: "var(--color-foreground)",
                    margin: 0,
                  }}
                >
                  Campaign History
                </h2>
                {isStaff && (
                  <button
                    onClick={openNewCampaign}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "0 18px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
                      border: "none",
                      color: "white",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 4px 16px rgba(139,92,246,0.3)",
                    }}
                  >
                    <Plus style={{ width: 16, height: 16 }} />
                    Start New Campaign
=======
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
                <h2 style={{ fontSize: "14px", fontWeight: 800, color: "var(--color-foreground)", margin: 0 }}>Campaign History</h2>
                {isStaff && (
                  <button onClick={openNewCampaign} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 18px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg,#8b5cf6,#6d28d9)", border: "none", color: "white", fontSize: "14px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(139,92,246,0.3)" }}>
                    <Plus style={{ width: 16, height: 16 }} />Start New Campaign
>>>>>>> 4b6b11d5b8430477f7a10a0fb94cf381a9b34171
                  </button>
                )}
              </div>

              {loading ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "60px",
                  }}
                >
                  <Loader2 className="animate-spin w-8 h-8 text-primary" />
                </div>
              ) : campaigns.length === 0 ? (
<<<<<<< HEAD
                <div
                  style={{
                    textAlign: "center",
                    padding: "80px 20px",
                    background: "white",
                    borderRadius: "20px",
                    border: "1px dashed rgba(139,92,246,0.3)",
                  }}
                >
                  <Megaphone
                    style={{
                      width: 48,
                      height: 48,
                      margin: "0 auto 16px",
                      color: "rgba(139,92,246,0.4)",
                    }}
                  />
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "var(--color-foreground)",
                      margin: "0 0 8px",
                    }}
                  >
                    No campaigns yet
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--color-muted-foreground)",
                    }}
                  >
                    Start your first AI-generated campaign and launch outreach.
                  </p>
=======
                <div style={{ textAlign: "center", padding: "80px 20px", background: "white", borderRadius: "20px", border: "1px dashed rgba(139,92,246,0.3)" }}>
                  <Megaphone style={{ width: 48, height: 48, margin: "0 auto 16px", color: "rgba(139,92,246,0.4)" }} />
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-foreground)", margin: "0 0 8px" }}>No campaigns yet</p>
                  <p style={{ fontSize: "14px", color: "var(--color-muted-foreground)" }}>Start your first AI-generated campaign and launch outreach.</p>
>>>>>>> 4b6b11d5b8430477f7a10a0fb94cf381a9b34171
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(300px, 1fr))",
                    gap: "20px",
                  }}
                >
                  {/* "New Campaign" Tile */}
                  {isStaff && (
                    <div
                      onClick={openNewCampaign}
                      style={{
                        padding: "24px",
                        borderRadius: "16px",
                        border: "1px dashed rgba(139,92,246,0.4)",
                        background: "rgba(139,92,246,0.02)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        minHeight: "180px",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(139,92,246,0.06)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(139,92,246,0.02)")
                      }
                    >
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "24px",
                          background: "rgba(139,92,246,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "12px",
                        }}
                      >
                        <Plus
                          style={{ width: 24, height: 24, color: "#8b5cf6" }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          color: "#8b5cf6",
                        }}
                      >
                        Create Campaign
                      </span>
                    </div>
                  )}

                  {campaigns.map((c) => {
                    const aud = AUDIENCE_OPTIONS.find(
                      (a) => a.value === c.audience,
                    );
                    return (
<<<<<<< HEAD
                      <div
                        key={c.id}
                        onClick={() => openCampaign(c)}
                        style={{
                          padding: "20px",
                          borderRadius: "16px",
                          border: "1px solid rgba(139,92,246,0.15)",
                          background: "white",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          display: "flex",
                          flexDirection: "column",
                          minHeight: "180px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                        }}
                        onMouseEnter={(e) => (
                          (e.currentTarget.style.boxShadow =
                            "0 6px 20px rgba(139,92,246,0.1)"),
                          (e.currentTarget.style.borderColor =
                            "rgba(139,92,246,0.3)")
                        )}
                        onMouseLeave={(e) => (
                          (e.currentTarget.style.boxShadow =
                            "0 2px 8px rgba(0,0,0,0.02)"),
                          (e.currentTarget.style.borderColor =
                            "rgba(139,92,246,0.15)")
                        )}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: "12px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 800,
                              padding: "4px 8px",
                              borderRadius: "6px",
                              background: "rgba(139,92,246,0.1)",
                              color: "#8b5cf6",
                              textTransform: "uppercase",
                            }}
                          >
                            {aud?.icon} {aud?.label}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--color-muted-foreground)",
                              fontFamily: "monospace",
                            }}
                          >
                            {timeAgo(c.created_at)}
                          </span>
                        </div>
                        <h4
                          style={{
                            fontSize: "16px",
                            fontWeight: 700,
                            color: "var(--color-foreground)",
                            margin: "0 0 4px",
                          }}
                        >
                          {c.theme}
                        </h4>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "var(--color-muted-foreground)",
                            margin: "0 0 16px",
                          }}
                        >
                          Candidate:{" "}
                          <span
                            style={{
                              color: "var(--color-foreground)",
                              fontWeight: 500,
                            }}
                          >
                            {c.candidate_name}
                          </span>
                        </p>

                        <div
                          style={{
                            marginTop: "auto",
                            display: "flex",
                            gap: "12px",
                            borderTop: "1px solid var(--color-border)",
                            paddingTop: "12px",
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <MessageSquare
                              style={{
                                width: 14,
                                height: 14,
                                color: "#8b5cf6",
                              }}
                            />
                            <span
                              style={{
                                fontSize: "13px",
                                fontWeight: 700,
                                color: "var(--color-foreground)",
                              }}
                            >
                              {c.sms_sent}{" "}
                              <span
                                style={{
                                  fontSize: "11px",
                                  color: "var(--color-muted-foreground)",
                                  fontWeight: 500,
                                }}
                              >
                                SMS
                              </span>
                            </span>
                          </div>
                          <div
                            style={{
                              flex: 1,
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <Phone
                              style={{
                                width: 14,
                                height: 14,
                                color: "#10b981",
                              }}
                            />
                            <span
                              style={{
                                fontSize: "13px",
                                fontWeight: 700,
                                color: "var(--color-foreground)",
                              }}
                            >
                              {c.calls_made}{" "}
                              <span
                                style={{
                                  fontSize: "11px",
                                  color: "var(--color-muted-foreground)",
                                  fontWeight: 500,
                                }}
                              >
                                Calls
                              </span>
                            </span>
=======
                      <div key={c.id} onClick={() => openCampaign(c)} style={{ padding: "20px", borderRadius: "16px", border: "1px solid rgba(139,92,246,0.15)", background: "white", cursor: "pointer", transition: "all 0.2s", display: "flex", flexDirection: "column", minHeight: "180px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }} onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 6px 20px rgba(139,92,246,0.1)", e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)")} onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)", e.currentTarget.style.borderColor = "rgba(139,92,246,0.15)")}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                          <span style={{ fontSize: "14px", fontWeight: 800, padding: "4px 8px", borderRadius: "6px", background: "rgba(139,92,246,0.1)", color: "#8b5cf6", textTransform: "uppercase" }}>{aud?.icon} {aud?.label}</span>
                          <span style={{ fontSize: "14px", color: "var(--color-muted-foreground)", fontFamily: "monospace" }}>{timeAgo(c.created_at)}</span>
                        </div>
                        <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-foreground)", margin: "0 0 4px" }}>{c.theme}</h4>
                        <p style={{ fontSize: "14px", color: "var(--color-muted-foreground)", margin: "0 0 16px" }}>Candidate: <span style={{ color: "var(--color-foreground)", fontWeight: 500 }}>{c.candidate_name}</span></p>
                        
                        <div style={{ marginTop: "auto", display: "flex", gap: "12px", borderTop: "1px solid var(--color-border)", paddingTop: "12px" }}>
                          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                            <MessageSquare style={{ width: 14, height: 14, color: "#8b5cf6" }} />
                            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-foreground)" }}>{c.sms_sent} <span style={{ fontSize: "14px", color: "var(--color-muted-foreground)", fontWeight: 500 }}>SMS</span></span>
                          </div>
                          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                            <Phone style={{ width: 14, height: 14, color: "#10b981" }} />
                            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-foreground)" }}>{c.calls_made} <span style={{ fontSize: "14px", color: "var(--color-muted-foreground)", fontWeight: 500 }}>Calls</span></span>
>>>>>>> 4b6b11d5b8430477f7a10a0fb94cf381a9b34171
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CHAT VIEW */}
        {view === "chat" && (
          <div
            ref={scrollRef}
            style={{
              position: "absolute",
              inset: 0,
              overflowY: "auto",
              padding: "40px 20px",
              scrollBehavior: "smooth",
            }}
          >
            <div
              style={{
                maxWidth: "800px",
                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {/* Introduction message */}
              <ChatBubble role="bot">
                <div
                  style={{
                    background: "rgba(139,92,246,0.06)",
                    border: "1px solid rgba(139,92,246,0.15)",
                    borderRadius: "0 16px 16px 16px",
                    padding: "16px 20px",
                    color: "var(--color-foreground)",
                    fontSize: "14px",
                    lineHeight: 1.5,
                  }}
                >
                  {selectedCampaign
                    ? `Welcome back! I've pulled up the records for the campaign targeting **${AUDIENCE_OPTIONS.find((a) => a.value === selectedCampaign.audience)?.label}**.`
                    : "Hello! I am your AI Campaign Architect. I can draft powerful political speeches and manage automated SMS and voice outreach. Let's start by defining your campaign strategy."}
                </div>
              </ChatBubble>

              {/* FLOW: NEW CAMPAIGN */}
              {!selectedCampaign && (
                <>
                  <ChatBubble role="bot">
                    <div
                      style={{
                        background: "white",
                        border: "1px solid var(--color-border)",
                        borderRadius: "0 16px 16px 16px",
                        padding: "24px",
                        width: "100%",
                        maxWidth: "500px",
                        boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "14px",
                          fontWeight: 800,
                          color: "var(--color-foreground)",
                          marginBottom: "16px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Plus
                          style={{ width: 16, height: 16, color: "#8b5cf6" }}
                        />{" "}
                        Campaign Parameters
                      </h3>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "16px",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "12px",
                          }}
                        >
                          <div>
<<<<<<< HEAD
                            <label
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "var(--color-muted-foreground)",
                                textTransform: "uppercase",
                                marginBottom: "6px",
                                display: "block",
                              }}
                            >
                              Candidate Name
                            </label>
                            <input
                              value={newCampForm.candidate_name}
                              onChange={(e) =>
                                setNewCampForm((f) => ({
                                  ...f,
                                  candidate_name: e.target.value,
                                }))
                              }
                              style={{
                                width: "100%",
                                height: "36px",
                                padding: "0 12px",
                                borderRadius: "8px",
                                background: "var(--color-background)",
                                border: "1px solid var(--color-border)",
                                color: "var(--color-foreground)",
                                fontSize: "13px",
                                outline: "none",
                              }}
                              onFocus={(e) =>
                                (e.target.style.borderColor = "#8b5cf6")
                              }
                              onBlur={(e) =>
                                (e.target.style.borderColor =
                                  "var(--color-border)")
                              }
                            />
                          </div>
                          <div>
                            <label
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "var(--color-muted-foreground)",
                                textTransform: "uppercase",
                                marginBottom: "6px",
                                display: "block",
                              }}
                            >
                              Audience
                            </label>
                            <Select
                              value={newCampForm.audience}
                              onValueChange={(v) =>
                                setNewCampForm((f) => ({ ...f, audience: v }))
                              }
                            >
                              <SelectTrigger className="h-9 text-xs bg-background border-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {AUDIENCE_OPTIONS.map((a) => (
                                  <SelectItem
                                    key={a.value}
                                    value={a.value}
                                    className="text-xs"
                                  >
                                    {a.icon} {a.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
=======
                            <label style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", marginBottom: "6px", display: "block" }}>Candidate Name</label>
                            <input value={newCampForm.candidate_name} onChange={e => setNewCampForm(f => ({ ...f, candidate_name: e.target.value }))} style={{ width: "100%", height: "36px", padding: "0 12px", borderRadius: "8px", background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-foreground)", fontSize: "14px", outline: "none" }} onFocus={e => e.target.style.borderColor = "#8b5cf6"} onBlur={e => e.target.style.borderColor = "var(--color-border)"} />
                          </div>
                          <div>
                            <label style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", marginBottom: "6px", display: "block" }}>Audience</label>
                            <Select value={newCampForm.audience} onValueChange={v => setNewCampForm(f => ({ ...f, audience: v }))}>
                              <SelectTrigger className="h-9 text-sm bg-background border-border"><SelectValue /></SelectTrigger>
                              <SelectContent>{AUDIENCE_OPTIONS.map(a => <SelectItem key={a.value} value={a.value} className="text-sm">{a.icon} {a.label}</SelectItem>)}</SelectContent>
>>>>>>> 4b6b11d5b8430477f7a10a0fb94cf381a9b34171
                            </Select>
                          </div>
                        </div>
                        <div>
<<<<<<< HEAD
                          <label
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "var(--color-muted-foreground)",
                              textTransform: "uppercase",
                              marginBottom: "6px",
                              display: "block",
                            }}
                          >
                            Campaign Theme
                          </label>
                          <input
                            placeholder="e.g. Agricultural Reform"
                            value={newCampForm.theme}
                            onChange={(e) =>
                              setNewCampForm((f) => ({
                                ...f,
                                theme: e.target.value,
                              }))
                            }
                            style={{
                              width: "100%",
                              height: "36px",
                              padding: "0 12px",
                              borderRadius: "8px",
                              background: "var(--color-background)",
                              border: "1px solid var(--color-border)",
                              color: "var(--color-foreground)",
                              fontSize: "13px",
                              outline: "none",
                            }}
                            onFocus={(e) =>
                              (e.target.style.borderColor = "#8b5cf6")
                            }
                            onBlur={(e) =>
                              (e.target.style.borderColor =
                                "var(--color-border)")
                            }
                          />
                        </div>
                        <div>
                          <label
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "var(--color-muted-foreground)",
                              textTransform: "uppercase",
                              marginBottom: "6px",
                              display: "block",
                            }}
                          >
                            Key Talking Points
                          </label>
                          <textarea
                            placeholder="List main promises..."
                            value={newCampForm.key_points}
                            onChange={(e) =>
                              setNewCampForm((f) => ({
                                ...f,
                                key_points: e.target.value,
                              }))
                            }
                            style={{
                              width: "100%",
                              height: "70px",
                              padding: "10px 12px",
                              borderRadius: "8px",
                              background: "var(--color-background)",
                              border: "1px solid var(--color-border)",
                              color: "var(--color-foreground)",
                              fontSize: "12px",
                              outline: "none",
                              resize: "none",
                            }}
                            onFocus={(e) =>
                              (e.target.style.borderColor = "#8b5cf6")
                            }
                            onBlur={(e) =>
                              (e.target.style.borderColor =
                                "var(--color-border)")
                            }
                          />
                        </div>
                        <button
                          onClick={handleGenerate}
                          disabled={generating}
                          style={{
                            height: "40px",
                            borderRadius: "8px",
                            background: generating
                              ? "rgba(139,92,246,0.15)"
                              : "linear-gradient(135deg,#8b5cf6,#6d28d9)",
                            border: "none",
                            color: generating ? "#8b5cf6" : "white",
                            fontSize: "13px",
                            fontWeight: 700,
                            cursor: generating ? "default" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            boxShadow: generating
                              ? "none"
                              : "0 4px 12px rgba(139,92,246,0.25)",
                          }}
                        >
                          {generating ? (
                            <>
                              <Loader2
                                style={{ width: 14, height: 14 }}
                                className="animate-spin"
                              />
                              Building Assets…
                            </>
                          ) : (
                            <>
                              <Sparkles style={{ width: 14, height: 14 }} />
                              Generate Campaign
                            </>
                          )}
=======
                          <label style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", marginBottom: "6px", display: "block" }}>Campaign Theme</label>
                          <input placeholder="e.g. Agricultural Reform" value={newCampForm.theme} onChange={e => setNewCampForm(f => ({ ...f, theme: e.target.value }))} style={{ width: "100%", height: "36px", padding: "0 12px", borderRadius: "8px", background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-foreground)", fontSize: "14px", outline: "none" }} onFocus={e => e.target.style.borderColor = "#8b5cf6"} onBlur={e => e.target.style.borderColor = "var(--color-border)"} />
                        </div>
                        <div>
                          <label style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", marginBottom: "6px", display: "block" }}>Key Talking Points</label>
                          <textarea placeholder="List main promises..." value={newCampForm.key_points} onChange={e => setNewCampForm(f => ({ ...f, key_points: e.target.value }))} style={{ width: "100%", height: "70px", padding: "10px 12px", borderRadius: "8px", background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-foreground)", fontSize: "14px", outline: "none", resize: "none" }} onFocus={e => e.target.style.borderColor = "#8b5cf6"} onBlur={e => e.target.style.borderColor = "var(--color-border)"} />
                        </div>
                        <button onClick={handleGenerate} disabled={generating} style={{ height: "40px", borderRadius: "8px", background: generating ? "rgba(139,92,246,0.15)" : "linear-gradient(135deg,#8b5cf6,#6d28d9)", border: "none", color: generating ? "#8b5cf6" : "white", fontSize: "14px", fontWeight: 700, cursor: generating ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: generating ? "none" : "0 4px 12px rgba(139,92,246,0.25)" }}>
                          {generating ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />Building Assets…</> : <><Sparkles style={{ width: 14, height: 14 }} />Generate Campaign</>}
>>>>>>> 4b6b11d5b8430477f7a10a0fb94cf381a9b34171
                        </button>
                      </div>
                    </div>
                  </ChatBubble>
                </>
              )}

              {/* FLOW: EXISTING / JUST CREATED CAMPAIGN */}
              {selectedCampaign && (
                <>
                  <ChatBubble role="user">
                    <div
                      style={{
                        background: "white",
                        border: "1px solid var(--color-border)",
                        borderRadius: "16px 0 16px 16px",
                        padding: "16px 20px",
                        color: "var(--color-foreground)",
                        fontSize: "14px",
                        lineHeight: 1.5,
                        boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                      }}
                    >
                      Generate a campaign for{" "}
                      <strong>{selectedCampaign.candidate_name}</strong> focused
                      on <strong>{selectedCampaign.theme}</strong>, targeting{" "}
                      <strong>
                        {
                          AUDIENCE_OPTIONS.find(
                            (a) => a.value === selectedCampaign.audience,
                          )?.label
                        }
                      </strong>
                      .
                    </div>
                  </ChatBubble>

                  <ChatBubble role="bot">
<<<<<<< HEAD
                    <div
                      style={{
                        background: "white",
                        border: "1px solid var(--color-border)",
                        borderRadius: "0 16px 16px 16px",
                        padding: "24px",
                        color: "var(--color-foreground)",
                        fontSize: "14px",
                        width: "100%",
                        maxWidth: "600px",
                        boxShadow: "0 4px 24px rgba(139,92,246,0.06)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "16px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 800,
                            color: "#8b5cf6",
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <Sparkles style={{ width: 14, height: 14 }} /> Final
                          Transcript
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              selectedCampaign.generated_speech,
                            );
                            toast.success("Copied!");
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "none",
                            border: "none",
                            color: "var(--color-muted-foreground)",
                            fontSize: "11px",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          <Copy style={{ width: 12, height: 12 }} /> Copy
                        </button>
=======
                    <div style={{ background: "white", border: "1px solid var(--color-border)", borderRadius: "0 16px 16px 16px", padding: "24px", color: "var(--color-foreground)", fontSize: "14px", width: "100%", maxWidth: "600px", boxShadow: "0 4px 24px rgba(139,92,246,0.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 800, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: "6px" }}><Sparkles style={{ width: 14, height: 14 }} /> Final Transcript</span>
                        <button onClick={() => { navigator.clipboard.writeText(selectedCampaign.generated_speech); toast.success("Copied!"); }} style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", color: "var(--color-muted-foreground)", fontSize: "14px", cursor: "pointer", fontWeight: 600 }}><Copy style={{ width: 12, height: 12 }} /> Copy</button>
>>>>>>> 4b6b11d5b8430477f7a10a0fb94cf381a9b34171
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          lineHeight: 1.7,
                          color: "var(--color-foreground)",
                          fontFamily: "var(--font-serif)",
                          whiteSpace: "pre-wrap",
                          background: "var(--color-background)",
                          padding: "20px",
                          borderRadius: "12px",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        {selectedCampaign.generated_speech}
                      </div>
                    </div>
                  </ChatBubble>

                  <ChatBubble role="bot">
<<<<<<< HEAD
                    <div
                      style={{
                        background: "white",
                        border: "1px solid var(--color-border)",
                        borderRadius: "0 16px 16px 16px",
                        padding: "24px",
                        width: "100%",
                        maxWidth: "500px",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "14px",
                          fontWeight: 800,
                          color: "var(--color-foreground)",
                          marginBottom: "6px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Send
                          style={{ width: 16, height: 16, color: "#10b981" }}
                        />{" "}
                        Launch Outreach
                      </h3>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "var(--color-muted-foreground)",
                          marginBottom: "20px",
                        }}
                      >
                        The transcript is ready. Enter target phone numbers and
                        select the delivery channels.
                      </p>

                      <div style={{ marginBottom: "16px" }}>
                        <textarea
                          placeholder="+919876543210&#10;+918765432100"
                          value={phonesInput}
                          onChange={(e) => setPhonesInput(e.target.value)}
                          style={{
                            width: "100%",
                            height: "80px",
                            padding: "12px",
                            borderRadius: "8px",
                            background: "var(--color-background)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-foreground)",
                            fontSize: "13px",
                            fontFamily: "monospace",
                            resize: "none",
                            outline: "none",
                          }}
                          onFocus={(e) =>
                            (e.target.style.borderColor = "#10b981")
                          }
                          onBlur={(e) =>
                            (e.target.style.borderColor = "var(--color-border)")
                          }
                        />
=======
                    <div style={{ background: "white", border: "1px solid var(--color-border)", borderRadius: "0 16px 16px 16px", padding: "24px", width: "100%", maxWidth: "500px", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
                      <h3 style={{ fontSize: "14px", fontWeight: 800, color: "var(--color-foreground)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}><Send style={{ width: 16, height: 16, color: "#10b981" }} /> Launch Outreach</h3>
                      <p style={{ fontSize: "14px", color: "var(--color-muted-foreground)", marginBottom: "20px" }}>The transcript is ready. Enter target phone numbers and select the delivery channels.</p>
                      
                      <div style={{ marginBottom: "16px" }}>
                        <textarea placeholder="+919876543210&#10;+918765432100" value={phonesInput} onChange={e => setPhonesInput(e.target.value)} style={{ width: "100%", height: "80px", padding: "12px", borderRadius: "8px", background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-foreground)", fontSize: "14px", fontFamily: "monospace", resize: "none", outline: "none" }} onFocus={e => e.target.style.borderColor = "#10b981"} onBlur={e => e.target.style.borderColor = "var(--color-border)"} />
>>>>>>> 4b6b11d5b8430477f7a10a0fb94cf381a9b34171
                      </div>

                      <div
                        style={{
                          marginBottom: "20px",
                          display: "flex",
                          gap: "12px",
                        }}
                      >
                        {[
<<<<<<< HEAD
                          {
                            key: "sms",
                            label: "SMS",
                            icon: MessageSquare,
                            checked: sendSms,
                            setter: setSendSms,
                          },
                          {
                            key: "call",
                            label: "Voice Call",
                            icon: Phone,
                            checked: sendCall,
                            setter: setSendCall,
                          },
                        ].map((c) => (
                          <label
                            key={c.key}
                            style={{
                              flex: 1,
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "10px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              border: `1px solid ${c.checked ? "rgba(16,185,129,0.4)" : "var(--color-border)"}`,
                              background: c.checked
                                ? "rgba(16,185,129,0.08)"
                                : "var(--color-background)",
                            }}
                          >
                            <Checkbox
                              checked={c.checked}
                              onCheckedChange={(val) => c.setter(!!val)}
                            />
                            <c.icon
                              style={{
                                width: 14,
                                height: 14,
                                color: c.checked
                                  ? "#10b981"
                                  : "var(--color-muted-foreground)",
                              }}
                            />
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                color: c.checked
                                  ? "var(--color-foreground)"
                                  : "var(--color-muted-foreground)",
                              }}
                            >
                              {c.label}
                            </span>
                          </label>
                        ))}
                      </div>

                      <button
                        onClick={handleLaunchOutreach}
                        disabled={launching}
                        style={{
                          width: "100%",
                          height: "40px",
                          borderRadius: "8px",
                          background: launching
                            ? "rgba(16,185,129,0.15)"
                            : "linear-gradient(135deg,#10b981,#059669)",
                          border: "none",
                          color: launching ? "#10b981" : "white",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: launching ? "default" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          boxShadow: launching
                            ? "none"
                            : "0 4px 12px rgba(16,185,129,0.25)",
                        }}
                      >
                        {launching ? (
                          <>
                            <Loader2
                              style={{ width: 14, height: 14 }}
                              className="animate-spin"
                            />
                            Executing…
                          </>
                        ) : (
                          <>
                            <Play style={{ width: 14, height: 14 }} />
                            Execute Outreach
                          </>
                        )}
=======
                          { key: 'sms', label: "SMS", icon: MessageSquare, checked: sendSms, setter: setSendSms },
                          { key: 'call', label: "Voice Call", icon: Phone, checked: sendCall, setter: setSendCall }
                        ].map(c => (
                          <label key={c.key} style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", padding: "10px", borderRadius: "8px", cursor: "pointer", border: `1px solid ${c.checked ? "rgba(16,185,129,0.4)" : "var(--color-border)"}`, background: c.checked ? "rgba(16,185,129,0.08)" : "var(--color-background)" }}>
                            <Checkbox checked={c.checked} onCheckedChange={(val) => c.setter(!!val)} />
                            <c.icon style={{ width: 14, height: 14, color: c.checked ? "#10b981" : "var(--color-muted-foreground)" }} />
                            <span style={{ fontSize: "14px", fontWeight: 600, color: c.checked ? "var(--color-foreground)" : "var(--color-muted-foreground)" }}>{c.label}</span>
                          </label>
                        ))}
                      </div>
 
                      <button onClick={handleLaunchOutreach} disabled={launching} style={{ width: "100%", height: "40px", borderRadius: "8px", background: launching ? "rgba(16,185,129,0.15)" : "linear-gradient(135deg,#10b981,#059669)", border: "none", color: launching ? "#10b981" : "white", fontSize: "14px", fontWeight: 700, cursor: launching ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: launching ? "none" : "0 4px 12px rgba(16,185,129,0.25)" }}>
                        {launching ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />Executing…</> : <><Play style={{ width: 14, height: 14 }} />Execute Outreach</>}
>>>>>>> 4b6b11d5b8430477f7a10a0fb94cf381a9b34171
                      </button>
                    </div>
                  </ChatBubble>
                </>
              )}

              {/* FLOW: OUTREACH EXECUTED */}
              {outreachResult && (
                <ChatBubble role="bot">
<<<<<<< HEAD
                  <div
                    style={{
                      background: "rgba(16,185,129,0.05)",
                      border: "1px solid rgba(16,185,129,0.2)",
                      borderRadius: "0 16px 16px 16px",
                      padding: "20px",
                      color: "var(--color-foreground)",
                      width: "100%",
                      maxWidth: "400px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "16px",
                      }}
                    >
                      <CheckCircle2
                        style={{ width: 16, height: 16, color: "#10b981" }}
                      />
                      <h3
                        style={{
                          fontSize: "13px",
                          fontWeight: 800,
                          color: "#10b981",
                          margin: 0,
                        }}
                      >
                        Outreach Complete
                      </h3>
=======
                  <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "0 16px 16px 16px", padding: "20px", color: "var(--color-foreground)", width: "100%", maxWidth: "400px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                      <CheckCircle2 style={{ width: 16, height: 16, color: "#10b981" }} />
                      <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#10b981", margin: 0 }}>Outreach Complete</h3>
>>>>>>> 4b6b11d5b8430477f7a10a0fb94cf381a9b34171
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {outreachResult.results.map((r, i) => (
<<<<<<< HEAD
                        <div
                          key={i}
                          style={{
                            padding: "10px",
                            borderRadius: "8px",
                            background: "white",
                            border: "1px solid var(--color-border)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "12px",
                              fontFamily: "monospace",
                              color: "var(--color-foreground)",
                              fontWeight: 700,
                            }}
                          >
                            {r.phone}
                          </span>
                          <div style={{ display: "flex", gap: "16px" }}>
                            <span
                              style={{
                                fontSize: "10px",
                                color: "var(--color-muted-foreground)",
                              }}
                            >
                              SMS:{" "}
                              <span
                                style={{
                                  color:
                                    r.sms_status === "sent" ||
                                    r.sms_status === "mock"
                                      ? "#10b981"
                                      : "#f43f5e",
                                  fontWeight: 600,
                                }}
                              >
                                {r.sms_status || "N/A"}
                              </span>
                            </span>
                            <span
                              style={{
                                fontSize: "10px",
                                color: "var(--color-muted-foreground)",
                              }}
                            >
                              Call:{" "}
                              <span
                                style={{
                                  color:
                                    r.call_status === "sent" ||
                                    r.call_status === "mock"
                                      ? "#10b981"
                                      : "#f43f5e",
                                  fontWeight: 600,
                                }}
                              >
                                {r.call_status || "N/A"}
                              </span>
                            </span>
=======
                        <div key={i} style={{ padding: "10px", borderRadius: "8px", background: "white", border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: "6px" }}>
                          <span style={{ fontSize: "14px", fontFamily: "monospace", color: "var(--color-foreground)", fontWeight: 700 }}>{r.phone}</span>
                          <div style={{ display: "flex", gap: "16px" }}>
                            <span style={{ fontSize: "14px", color: "var(--color-muted-foreground)" }}>SMS: <span style={{ color: r.sms_status === 'sent' || r.sms_status === 'mock' ? '#10b981' : '#f43f5e', fontWeight: 600 }}>{r.sms_status || 'N/A'}</span></span>
                            <span style={{ fontSize: "14px", color: "var(--color-muted-foreground)" }}>Call: <span style={{ color: r.call_status === 'sent' || r.call_status === 'mock' ? '#10b981' : '#f43f5e', fontWeight: 600 }}>{r.call_status || 'N/A'}</span></span>
>>>>>>> 4b6b11d5b8430477f7a10a0fb94cf381a9b34171
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ChatBubble>
              )}

              {/* Padding block for scrolling */}
              <div style={{ height: "40px" }} />
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }`}</style>
    </div>
  );
}
