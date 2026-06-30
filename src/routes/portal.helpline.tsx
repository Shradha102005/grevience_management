import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Inbox, Clock, CheckCircle2, User,
  Send, Search, Plus, X, Loader2, RefreshCw,
  Phone, Globe, Mail, Smartphone, Zap, AlertCircle,
  Headphones, Sparkles, MessageSquare, ArrowRight,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/portal/helpline")({
  component: Helpline,
});

const API_BASE = "http://localhost:8000";

interface Message {
  sender: string; sender_type: "user" | "agent"; text: string; time: string;
}
interface Ticket {
  ticket_id: string; subject: string; query: string; requester_name: string;
  priority: string; channel: string; status: string; created_at: string;
  updated_at: string; expected_response: string; messages: Message[];
}
interface Counts { Open: number; Pending: number; Resolved: number; All: number; }

function relativeTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function initials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

const PRIORITY_CONFIG: Record<string, { dot: string; gradient: string; label: string }> = {
  Critical: { dot: "#f43f5e", gradient: "linear-gradient(135deg,#f43f5e22,#e1134222)", label: "Critical" },
  High:     { dot: "#fb923c", gradient: "linear-gradient(135deg,#fb923c22,#ea580c22)", label: "High" },
  Normal:   { dot: "#818cf8", gradient: "linear-gradient(135deg,#818cf822,#6366f122)", label: "Normal" },
  Low:      { dot: "#94a3b8", gradient: "linear-gradient(135deg,#94a3b822,#64748b22)", label: "Low" },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; glow: string; icon: React.ReactNode; label: string }> = {
  Open:     { color: "#a78bfa", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)",  glow: "rgba(139,92,246,0.25)", icon: <AlertCircle  style={{ width: 11, height: 11 }} />, label: "Open" },
  Pending:  { color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)",  glow: "rgba(251,191,36,0.2)",  icon: <Clock        style={{ width: 11, height: 11 }} />, label: "Pending" },
  Resolved: { color: "#34d399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.3)",  glow: "rgba(52,211,153,0.2)",  icon: <CheckCircle2 style={{ width: 11, height: 11 }} />, label: "Resolved" },
};

const CHANNEL_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  Phone: { icon: <Phone      style={{ width: 12, height: 12 }} />, color: "#a78bfa" },
  Web:   { icon: <Globe      style={{ width: 12, height: 12 }} />, color: "#60a5fa" },
  Email: { icon: <Mail       style={{ width: 12, height: 12 }} />, color: "#22d3ee" },
  App:   { icon: <Smartphone style={{ width: 12, height: 12 }} />, color: "#818cf8" },
};

const MACROS = [
  { label: "Request Aadhaar", text: "Could you please share the last 4 digits of your Aadhaar for verification?" },
  { label: "Link to Portal",  text: "You can complete this at: https://civicos.gov.in/services" },
  { label: "Escalate to L2",  text: "Escalating to Level 2 support. They will contact you within 2 hours." },
  { label: "Close Ticket",    text: "This issue has been resolved. Closing ticket. Have a great day!" },
];

// ── New Ticket Modal ─────────────────────────────────────────────────────────
function NewTicketModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (t: Ticket) => void;
}) {
  const [form, setForm] = useState({ requester_name: "", subject: "", query: "", priority: "Normal", channel: "Web" });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.query.trim()) { toast.error("Describe the issue"); return; }
    setLoading(true);
    try {
      const r1 = await fetch(`${API_BASE}/live/helpline/ticket`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!r1.ok) throw new Error();
      const { ticket_id } = await r1.json();
      const r2 = await fetch(`${API_BASE}/live/helpline/ticket/${ticket_id}`);
      const full: Ticket = await r2.json();
      onCreated(full); onClose(); toast.success(`${ticket_id} created`);
      setForm({ requester_name: "", subject: "", query: "", priority: "Normal", channel: "Web" });
    } catch { toast.error("Failed"); } finally { setLoading(false); }
  };

  const inputStyle = {
    width: "100%", height: "40px", padding: "0 14px",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(139,92,246,0.25)",
    borderRadius: "10px", color: "white", fontSize: "13px", outline: "none",
    transition: "border-color 0.2s", boxSizing: "border-box" as const,
    fontFamily: "inherit",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg border-0 p-0 overflow-hidden" style={{ background: "transparent" }}>
        <div style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1e3a5f 100%)",
          border: "1px solid rgba(139,92,246,0.3)", borderRadius: "16px",
        }}>
          <div style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.2),rgba(99,102,241,0.1))", borderBottom: "1px solid rgba(139,92,246,0.2)", padding: "24px 28px 20px" }}>
            <div className="flex items-center gap-3">
              <div style={{ background: "linear-gradient(135deg,#8b5cf6,#6366f1)", borderRadius: "10px", padding: "8px", boxShadow: "0 0 20px rgba(139,92,246,0.4)" }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">Create New Ticket</DialogTitle>
                <DialogDescription className="text-xs mt-0.5" style={{ color: "rgba(196,181,253,0.7)" }}>Log a citizen query or complaint</DialogDescription>
              </div>
            </div>
          </div>
          <div className="p-7 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: "rgba(196,181,253,0.7)" }}>Citizen Name</label>
                <input value={form.requester_name} onChange={e => setForm(f => ({ ...f, requester_name: e.target.value }))} placeholder="e.g. Rajesh Kumar" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "rgba(139,92,246,0.7)")} onBlur={e => (e.target.style.borderColor = "rgba(139,92,246,0.25)")} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: "rgba(196,181,253,0.7)" }}>Channel</label>
                <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} style={{ ...inputStyle }}>
                  {["Web","Phone","Email","App"].map(c => <option key={c} style={{ background: "#1e1b4b" }}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: "rgba(196,181,253,0.7)" }}>Subject</label>
              <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Short subject (optional)" style={inputStyle}
                onFocus={e => (e.target.style.borderColor = "rgba(139,92,246,0.7)")} onBlur={e => (e.target.style.borderColor = "rgba(139,92,246,0.25)")} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: "rgba(196,181,253,0.7)" }}>Description</label>
              <textarea value={form.query} onChange={e => setForm(f => ({ ...f, query: e.target.value }))} placeholder="Describe the citizen's issue…" rows={4}
                style={{ ...inputStyle, height: "auto", padding: "12px 14px", resize: "none" }}
                onFocus={e => (e.target.style.borderColor = "rgba(139,92,246,0.7)")} onBlur={e => (e.target.style.borderColor = "rgba(139,92,246,0.25)")} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: "rgba(196,181,253,0.7)" }}>Priority</label>
              <div className="flex gap-2">
                {["Low","Normal","High","Critical"].map(p => (
                  <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))}
                    style={{
                      flex: 1, padding: "8px 0", fontSize: "12px", fontWeight: 600, borderRadius: "8px",
                      border: form.priority === p ? "1px solid rgba(139,92,246,0.7)" : "1px solid rgba(255,255,255,0.1)",
                      background: form.priority === p ? "linear-gradient(135deg,rgba(139,92,246,0.3),rgba(99,102,241,0.2))" : "rgba(255,255,255,0.03)",
                      color: form.priority === p ? "#c4b5fd" : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.2s",
                    }}>{p}</button>
                ))}
              </div>
            </div>
            <button onClick={submit} disabled={loading}
              style={{
                width: "100%", height: "44px", borderRadius: "10px",
                background: loading ? "rgba(139,92,246,0.4)" : "linear-gradient(135deg,#8b5cf6,#6366f1)",
                border: "none", color: "white", fontSize: "14px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                boxShadow: loading ? "none" : "0 0 24px rgba(139,92,246,0.5)", transition: "all 0.2s",
              }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><Sparkles className="w-4 h-4" /> Create Ticket</>}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, isAgent }: { name: string; isAgent: boolean }) {
  return (
    <div style={{
      width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "11px", fontWeight: 800,
      background: isAgent ? "linear-gradient(135deg,#8b5cf6,#6366f1)" : "rgba(100,116,139,0.2)",
      border: isAgent ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(100,116,139,0.25)",
      color: isAgent ? "white" : "var(--color-muted-foreground)",
      boxShadow: isAgent ? "0 0 10px rgba(139,92,246,0.3)" : "none",
    }}>{initials(name)}</div>
  );
}

// ── Ticket Card ──────────────────────────────────────────────────────────────
function TicketCard({ t, onClick }: { t: Ticket; onClick: () => void }) {
  const sc = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.Open;
  const pc = PRIORITY_CONFIG[t.priority] ?? PRIORITY_CONFIG.Normal;
  const ch = CHANNEL_CONFIG[t.channel];
  const msgCount = t.messages?.length ?? 0;

  return (
    <button onClick={onClick}
      style={{
        background: "var(--color-card)",
        border: `1px solid rgba(139,92,246,0.1)`,
        borderRadius: "16px", padding: "20px",
        textAlign: "left", cursor: "pointer", width: "100%",
        transition: "all 0.2s", display: "flex", flexDirection: "column", gap: "14px",
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.border = `1px solid ${sc.border}`;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${sc.glow}, 0 0 0 1px ${sc.border}`;
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.border = "1px solid rgba(139,92,246,0.1)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}>

      {/* Priority accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "3px",
        background: pc.dot, opacity: 0.7, borderRadius: "16px 16px 0 0",
      }} />

      {/* Top: ID + Status badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          fontSize: "10px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.08em",
          color: "rgba(139,92,246,0.6)", background: "rgba(139,92,246,0.08)",
          padding: "2px 8px", borderRadius: "5px", border: "1px solid rgba(139,92,246,0.15)",
        }}>{t.ticket_id}</span>
        <span style={{
          display: "flex", alignItems: "center", gap: "4px",
          fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px",
          background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
        }}>
          {sc.icon}{sc.label}
        </span>
      </div>

      {/* Subject */}
      <div>
        <p style={{
          fontSize: "14px", fontWeight: 700, lineHeight: 1.35, color: "var(--color-foreground)",
          marginBottom: "6px",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{t.subject}</p>
        <p style={{
          fontSize: "12px", color: "var(--color-muted-foreground)", lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{t.query}</p>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Requester */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{
              width: "22px", height: "22px", borderRadius: "50%", background: "rgba(139,92,246,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: 800,
              color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)",
            }}>{initials(t.requester_name)}</div>
            <span style={{ fontSize: "11px", color: "var(--color-muted-foreground)", fontWeight: 500 }}>{t.requester_name}</span>
          </div>

          {/* Channel */}
          {ch && (
            <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10px", color: ch.color, fontWeight: 600 }}>
              {ch.icon}{t.channel}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Messages count */}
          {msgCount > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10px", color: "var(--color-muted-foreground)" }}>
              <MessageSquare style={{ width: 10, height: 10 }} />{msgCount}
            </span>
          )}
          {/* Time */}
          <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)", opacity: 0.6 }}>{relativeTime(t.updated_at)}</span>
          {/* Arrow */}
          <div style={{
            width: "22px", height: "22px", borderRadius: "6px",
            background: "rgba(139,92,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ArrowRight style={{ width: 11, height: 11, color: "#a78bfa" }} />
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Conversation Drawer ───────────────────────────────────────────────────────
function ConversationDrawer({ ticket, onClose, onUpdate }: {
  ticket: Ticket; onClose: () => void; onUpdate: () => void;
}) {
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [submitAs, setSubmitAs] = useState("Open");
  const [currentTicket, setCurrentTicket] = useState(ticket);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setCurrentTicket(ticket); setSubmitAs(ticket.status); }, [ticket]);
  useEffect(() => { threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" }); }, [currentTicket.messages?.length]);

  const sc = STATUS_CONFIG[currentTicket.status] ?? STATUS_CONFIG.Open;
  const ch = CHANNEL_CONFIG[currentTicket.channel];

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await fetch(`${API_BASE}/live/helpline/ticket/${currentTicket.ticket_id}/reply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: "Agent", sender_type: "agent", text: replyText }),
      });
      if (submitAs !== currentTicket.status) {
        await fetch(`${API_BASE}/live/helpline/ticket/${currentTicket.ticket_id}/status`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: submitAs }),
        });
      }
      const tr = await fetch(`${API_BASE}/live/helpline/ticket/${currentTicket.ticket_id}`);
      const updated = await tr.json();
      setCurrentTicket(updated); setReplyText(""); onUpdate(); toast.success("Sent");
    } catch { toast.error("Failed"); } finally { setSending(false); }
  };

  const changeStatus = async (status: string) => {
    try {
      await fetch(`${API_BASE}/live/helpline/ticket/${currentTicket.ticket_id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      setCurrentTicket(p => ({ ...p, status })); onUpdate();
    } catch { toast.error("Failed"); }
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
        zIndex: 40, animation: "fadeIn 0.2s ease",
      }} />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(600px, 55vw)",
        background: "var(--color-background)",
        borderLeft: "1px solid rgba(139,92,246,0.15)",
        boxShadow: "-24px 0 80px rgba(139,92,246,0.1)",
        zIndex: 50, display: "flex", flexDirection: "column",
        animation: "slideIn 0.25s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* Drawer Header */}
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid rgba(139,92,246,0.1)",
          background: "linear-gradient(180deg,rgba(139,92,246,0.05) 0%,transparent 100%)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Ticket ID + meta */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                <span style={{
                  fontSize: "10px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.1em",
                  color: "#a78bfa", background: "rgba(139,92,246,0.1)",
                  padding: "2px 8px", borderRadius: "5px", border: "1px solid rgba(139,92,246,0.2)",
                }}>{currentTicket.ticket_id}</span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 700, padding: "2px 9px", borderRadius: "20px", background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                  {sc.icon}{currentTicket.status}
                </span>
                {ch && <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10px", color: ch.color, fontWeight: 600 }}>{ch.icon}{currentTicket.channel}</span>}
                <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)", marginLeft: "auto" }}>{relativeTime(currentTicket.created_at)}</span>
              </div>

              {/* Subject */}
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--color-foreground)", margin: "0 0 6px", lineHeight: 1.25 }}>{currentTicket.subject}</h2>

              {/* Requester */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{
                  width: "20px", height: "20px", borderRadius: "50%", background: "rgba(139,92,246,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "7px", fontWeight: 800,
                  color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)", flexShrink: 0,
                }}>{initials(currentTicket.requester_name)}</div>
                <span style={{ fontSize: "12px", color: "var(--color-muted-foreground)" }}>{currentTicket.requester_name}</span>
              </div>
            </div>

            {/* Close */}
            <button onClick={onClose}
              style={{
                width: "32px", height: "32px", borderRadius: "9px", border: "1px solid rgba(139,92,246,0.15)",
                background: "rgba(139,92,246,0.06)", cursor: "pointer", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
              }}>
              <X style={{ width: 14, height: 14, color: "var(--color-muted-foreground)" }} />
            </button>
          </div>

          {/* Status toggles */}
          <div style={{ display: "flex", gap: "6px", marginTop: "14px" }}>
            {["Open","Pending","Resolved"].map(s => {
              const ssc = STATUS_CONFIG[s] ?? STATUS_CONFIG.Open;
              const active = currentTicket.status === s;
              return (
                <button key={s} onClick={() => changeStatus(s)}
                  style={{
                    padding: "5px 14px", borderRadius: "8px", fontSize: "11px", fontWeight: 700,
                    border: `1px solid ${active ? ssc.border : "rgba(100,116,139,0.15)"}`,
                    background: active ? ssc.bg : "transparent",
                    color: active ? ssc.color : "var(--color-muted-foreground)",
                    cursor: "pointer", transition: "all 0.18s",
                  }}>
                  {active && "✓ "}{s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description strip */}
        {currentTicket.query && (
          <div style={{
            margin: "14px 24px 0",
            padding: "12px 14px", borderRadius: "10px",
            background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.1)",
            flexShrink: 0,
          }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#a78bfa", marginBottom: "4px", letterSpacing: "0.05em" }}>ORIGINAL QUERY</p>
            <p style={{ fontSize: "12px", color: "var(--color-muted-foreground)", lineHeight: 1.6 }}>{currentTicket.query}</p>
          </div>
        )}

        {/* Messages */}
        <div ref={threadRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {(currentTicket.messages || []).length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "10px", opacity: 0.4 }}>
              <MessageSquare style={{ width: 32, height: 32, color: "#a78bfa" }} />
              <p style={{ fontSize: "13px", color: "var(--color-muted-foreground)" }}>No messages yet</p>
            </div>
          )}
          {(currentTicket.messages || []).map((m, i) => {
            const isAgent = m.sender_type === "agent";
            return (
              <div key={i} style={{ display: "flex", gap: "10px", flexDirection: isAgent ? "row-reverse" : "row", alignItems: "flex-end" }}>
                <Avatar name={m.sender} isAgent={isAgent} />
                <div style={{ display: "flex", flexDirection: "column", maxWidth: "72%", alignItems: isAgent ? "flex-end" : "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px", flexDirection: isAgent ? "row-reverse" : "row" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-foreground)" }}>{m.sender}</span>
                    <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)", opacity: 0.55 }}>{formatTime(m.time)}</span>
                  </div>
                  <div style={{
                    padding: "11px 15px",
                    borderRadius: isAgent ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                    fontSize: "13px", lineHeight: 1.6, color: "var(--color-foreground)",
                    background: isAgent
                      ? "linear-gradient(135deg,rgba(139,92,246,0.18),rgba(99,102,241,0.12))"
                      : "rgba(100,116,139,0.1)",
                    border: isAgent ? "1px solid rgba(139,92,246,0.22)" : "1px solid rgba(100,116,139,0.12)",
                    wordBreak: "break-word",
                  }}>{m.text}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reply */}
        <div style={{ padding: "14px 24px 20px", borderTop: "1px solid rgba(139,92,246,0.1)", flexShrink: 0 }}>
          {/* Macros */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)", display: "flex", alignItems: "center", gap: "3px", marginRight: "2px" }}>
              <Zap style={{ width: 9, height: 9 }} />Quick:
            </span>
            {MACROS.map((mac, i) => (
              <button key={i} onClick={() => setReplyText(p => p + (p ? "\n" : "") + mac.text)}
                style={{
                  fontSize: "10px", fontWeight: 600, padding: "2px 9px", borderRadius: "20px",
                  background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.18)",
                  color: "#a78bfa", cursor: "pointer",
                }}>{mac.label}</button>
            ))}
          </div>

          {/* Textarea box */}
          <div style={{
            borderRadius: "12px", border: "1px solid rgba(139,92,246,0.2)",
            background: "rgba(139,92,246,0.03)", overflow: "hidden", transition: "border-color 0.2s",
          }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.45)")}
            onBlurCapture={e => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.2)")}>
            <Textarea value={replyText} onChange={e => setReplyText(e.target.value)}
              placeholder={`Reply to ${currentTicket.requester_name}…`}
              style={{ width: "100%", resize: "none", fontSize: "13px", border: "none", background: "transparent", outline: "none", padding: "12px 14px", minHeight: "64px", color: "var(--color-foreground)", fontFamily: "inherit" }}
              className="focus-visible:ring-0 focus-visible:ring-offset-0 border-0 shadow-none"
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply(); }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderTop: "1px solid rgba(139,92,246,0.1)", background: "rgba(139,92,246,0.02)" }}>
              <p style={{ fontSize: "10px", color: "var(--color-muted-foreground)", opacity: 0.45 }}>⌘ + ↵ to send</p>
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <Select value={submitAs} onValueChange={setSubmitAs}>
                  <SelectTrigger style={{ height: "30px", fontSize: "11px", width: "130px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "7px", color: "#a78bfa" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open"     className="text-xs">Submit as Open</SelectItem>
                    <SelectItem value="Pending"  className="text-xs">Submit as Pending</SelectItem>
                    <SelectItem value="Resolved" className="text-xs">Submit as Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <button onClick={sendReply} disabled={sending || !replyText.trim()}
                  style={{
                    height: "30px", padding: "0 16px", borderRadius: "8px", border: "none",
                    background: sending || !replyText.trim() ? "rgba(139,92,246,0.15)" : "linear-gradient(135deg,#8b5cf6,#6366f1)",
                    color: "white", fontSize: "12px", fontWeight: 700,
                    cursor: sending || !replyText.trim() ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: "5px",
                    boxShadow: !sending && replyText.trim() ? "0 4px 12px rgba(139,92,246,0.4)" : "none",
                    opacity: sending || !replyText.trim() ? 0.5 : 1, transition: "all 0.2s",
                  }}>
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, count, icon: Icon, color, bg, border, onClick, active }: {
  label: string; count: number; icon: React.ElementType;
  color: string; bg: string; border: string; onClick: () => void; active: boolean;
}) {
  return (
    <button onClick={onClick}
      style={{
        flex: 1, padding: "16px 20px", borderRadius: "14px", textAlign: "left", cursor: "pointer",
        background: active ? bg : "var(--color-card)",
        border: `1px solid ${active ? border : "rgba(139,92,246,0.08)"}`,
        boxShadow: active ? `0 4px 20px ${color}22` : "none",
        transition: "all 0.2s", display: "flex", alignItems: "center", gap: "14px",
      }}>
      <div style={{
        width: "40px", height: "40px", borderRadius: "12px", flexShrink: 0,
        background: active ? `${color}22` : "rgba(139,92,246,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `1px solid ${active ? border : "rgba(139,92,246,0.12)"}`,
      }}>
        <Icon style={{ width: 18, height: 18, color: active ? color : "rgba(139,92,246,0.5)" }} />
      </div>
      <div>
        <p style={{ fontSize: "22px", fontWeight: 800, color: active ? color : "var(--color-foreground)", lineHeight: 1 }}>{count}</p>
        <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", fontWeight: 600, marginTop: "3px" }}>{label}</p>
      </div>
    </button>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export function Helpline() {
  const [tickets, setTickets]           = useState<Ticket[]>([]);
  const [counts, setCounts]             = useState<Counts>({ Open: 0, Pending: 0, Resolved: 0, All: 0 });
  const [loading, setLoading]           = useState(true);
  const [activeQueue, setActiveQueue]   = useState("All");
  const [search, setSearch]             = useState("");
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [newOpen, setNewOpen]           = useState(false);

  const fetchTickets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const p = new URLSearchParams(); if (search) p.set("search", search);
      const res = await fetch(`${API_BASE}/live/helpline/tickets?${p}`);
      const data = await res.json();
      setTickets(data.tickets || []); setCounts(data.counts || { Open:0, Pending:0, Resolved:0, All:0 });
      if (activeTicket) {
        const tr = await fetch(`${API_BASE}/live/helpline/ticket/${activeTicket.ticket_id}`);
        if (tr.ok) setActiveTicket(await tr.json());
      }
    } catch { if (!silent) toast.error("Failed to load"); } finally { setLoading(false); }
  }, [search, activeTicket?.ticket_id]);

  useEffect(() => { fetchTickets(); const id = setInterval(() => fetchTickets(true), 5000); return () => clearInterval(id); }, []);
  useEffect(() => { const t = setTimeout(() => fetchTickets(), 300); return () => clearTimeout(t); }, [search]);

  const selectTicket = async (t: Ticket) => {
    try {
      const r = await fetch(`${API_BASE}/live/helpline/ticket/${t.ticket_id}`);
      setActiveTicket(r.ok ? await r.json() : t);
    } catch { setActiveTicket(t); }
  };

  const filtered = activeQueue === "All" ? tickets : tickets.filter(t => t.status === activeQueue);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 6rem)", overflow: "hidden" }}
      className="-mx-6 -mb-6">

      {/* ── TOP HEADER BAR ─────────────────────────────────────────── */}
      <div style={{
        padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(139,92,246,0.1)",
        background: "linear-gradient(180deg,rgba(139,92,246,0.04) 0%,transparent 100%)",
        flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "38px", height: "38px", borderRadius: "12px",
            background: "linear-gradient(135deg,#8b5cf6,#6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(139,92,246,0.4)", flexShrink: 0,
          }}>
            <Headphones className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-foreground)", margin: 0 }}>Public Helpline</h1>
            <p style={{ fontSize: "11px", color: "rgba(139,92,246,0.8)", fontWeight: 600, margin: 0 }}>Citizen Support Dashboard</p>
          </div>
          {/* Live badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginLeft: "8px", padding: "4px 10px", borderRadius: "20px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.6)", animation: "pulse 2s infinite", display: "block" }} />
            <span style={{ fontSize: "11px", color: "#22c55e", fontWeight: 700 }}>Live</span>
          </div>
        </div>

        {/* Right: search + refresh + new ticket */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "var(--color-muted-foreground)", pointerEvents: "none" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets…"
              style={{
                width: "220px", height: "36px", paddingLeft: "32px", paddingRight: search ? "30px" : "12px",
                background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)",
                borderRadius: "10px", fontSize: "13px", color: "var(--color-foreground)", outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={e => (e.target.style.borderColor = "rgba(139,92,246,0.5)")}
              onBlur={e => (e.target.style.borderColor = "rgba(139,92,246,0.15)")} />
            {search && (
              <button onClick={() => setSearch("")}
                style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <X style={{ width: 12, height: 12, color: "var(--color-muted-foreground)" }} />
              </button>
            )}
          </div>

          {/* Refresh */}
          <button onClick={() => fetchTickets()}
            style={{ width: "36px", height: "36px", borderRadius: "10px", border: "1px solid rgba(139,92,246,0.15)", background: "rgba(139,92,246,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw style={{ width: 13, height: 13, color: "#a78bfa" }} className={loading ? "animate-spin" : ""} />
          </button>

          {/* New Ticket */}
          <button onClick={() => setNewOpen(true)}
            style={{
              height: "36px", padding: "0 18px", borderRadius: "10px", border: "none", cursor: "pointer",
              background: "linear-gradient(135deg,#8b5cf6,#6366f1)", color: "white", fontSize: "13px", fontWeight: 700,
              display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 4px 14px rgba(139,92,246,0.35)",
            }}>
            <Plus className="w-3.5 h-3.5" /> New Ticket
          </button>
        </div>
      </div>

      {/* ── STAT CARDS ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "12px", padding: "16px 28px", flexShrink: 0 }}>
        <StatCard label="All Tickets" count={counts.All}      icon={Inbox}         color="#a78bfa" bg="rgba(139,92,246,0.08)" border="rgba(139,92,246,0.25)" onClick={() => setActiveQueue("All")}      active={activeQueue === "All"} />
        <StatCard label="Open"        count={counts.Open}     icon={AlertCircle}   color="#a78bfa" bg="rgba(139,92,246,0.08)" border="rgba(139,92,246,0.25)" onClick={() => setActiveQueue("Open")}     active={activeQueue === "Open"} />
        <StatCard label="Pending"     count={counts.Pending}  icon={Clock}         color="#fbbf24" bg="rgba(251,191,36,0.08)"  border="rgba(251,191,36,0.25)"  onClick={() => setActiveQueue("Pending")}  active={activeQueue === "Pending"} />
        <StatCard label="Resolved"    count={counts.Resolved} icon={CheckCircle2}  color="#34d399" bg="rgba(52,211,153,0.08)"  border="rgba(52,211,153,0.25)"  onClick={() => setActiveQueue("Resolved")} active={activeQueue === "Resolved"} />
      </div>

      {/* ── TICKET GRID ────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 28px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px" }}>
            <Loader2 style={{ width: 28, height: 28, color: "#a78bfa" }} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "200px", gap: "14px" }}>
            <div style={{ width: "60px", height: "60px", borderRadius: "18px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Inbox style={{ width: 26, height: 26, color: "rgba(139,92,246,0.4)" }} />
            </div>
            <p style={{ fontSize: "14px", color: "var(--color-muted-foreground)", fontWeight: 500 }}>No tickets found</p>
            <button onClick={() => setNewOpen(true)}
              style={{ padding: "8px 20px", borderRadius: "10px", background: "linear-gradient(135deg,rgba(139,92,246,0.2),rgba(99,102,241,0.1))", border: "1px solid rgba(139,92,246,0.25)", color: "#a78bfa", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
              <Plus className="w-4 h-4 inline mr-1" />Create Ticket
            </button>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "14px",
          }}>
            {filtered.map(t => (
              <TicketCard key={t.ticket_id} t={t} onClick={() => selectTicket(t)} />
            ))}
          </div>
        )}
      </div>

      {/* ── CONVERSATION DRAWER ─────────────────────────────────────── */}
      {activeTicket && (
        <ConversationDrawer
          ticket={activeTicket}
          onClose={() => setActiveTicket(null)}
          onUpdate={() => fetchTickets(true)}
        />
      )}

      <NewTicketModal open={newOpen} onClose={() => setNewOpen(false)}
        onCreated={t => { setTickets(p => [t, ...p]); setActiveTicket(t); }} />
    </div>
  );
}
