import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Upload,
  MapPin,
  RefreshCw,
  Send,
  ClipboardList,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Pencil,
  BarChart3,
  ListChecks,
  PlusCircle,
  ChevronDown,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/portal/portal-shell";
import { StatCard } from "@/components/portal/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api";

export const Route = createFileRoute("/portal/municipal")({
  head: () => ({ meta: [{ title: "Municipal Services — CIVICOS AI" }] }),
  component: Municipal,
});

// ── Types ──────────────────────────────────────────────────────────────────────

interface Complaint {
  id: string;
  complaint_number: string;
  title: string;
  description: string;
  category: string;
  location: string;
  department: string;
  status: string;
  priority: string;
  progress: number;
  submitted_by: string;
  submitter_name?: string;
  assigned_to?: string;
  assigned_officer_name?: string;
  officer_notes?: string;
  created_at: string;
  updated_at: string;
  history: HistoryEntry[];
}

interface HistoryEntry {
  old_status: string;
  new_status: string;
  note?: string;
  changed_by_name?: string;
  changed_at: string;
}

interface PublicComplaint {
  id: string;
  complaint_number: string;
  title: string;
  category: string;
  location: string;
  department: string;
  status: string;
  priority: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

interface ComplaintStats {
  total: number;
  submitted: number;
  under_review: number;
  assigned: number;
  in_progress: number;
  resolved: number;
  closed: number;
  by_category: Record<string, number>;
  resolution_rate: number;
  avg_resolution_hours?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Road Damage",
  "Street Lights",
  "Garbage",
  "Water Leakage",
  "Drainage",
  "Traffic Signals",
  "Public Safety",
  "Parks",
  "Other",
];

const STATUSES = [
  "Submitted",
  "Under Review",
  "Assigned",
  "In Progress",
  "Resolved",
  "Closed",
];

const PRIORITIES = ["Low", "Medium", "High"];

const STATUS_PIPELINE = [
  { label: "Submitted", desc: "Complaint received & logged" },
  { label: "Under Review", desc: "Being assessed by the department" },
  { label: "Assigned", desc: "Assigned to a field officer" },
  { label: "In Progress", desc: "Work has started on-site" },
  { label: "Resolved", desc: "Issue fixed and verified" },
  { label: "Closed", desc: "Complaint marked as complete" },
];

// ── Style Helpers ─────────────────────────────────────────────────────────────

const statusColor: Record<string, string> = {
  Submitted: "bg-secondary text-secondary-foreground",
  "Under Review": "bg-accent/20 text-accent-foreground",
  Assigned: "bg-chart-2/15 text-chart-2",
  "In Progress": "bg-amber-500/15 text-amber-600",
  Resolved: "bg-emerald-500/15 text-emerald-600",
  Closed: "bg-muted text-muted-foreground",
};

const priorityColor: Record<string, string> = {
  High: "bg-destructive/15 text-destructive",
  Medium: "bg-amber-500/15 text-amber-600",
  Low: "bg-muted text-muted-foreground",
};

const statusProgress: Record<string, number> = {
  Submitted: 5,
  "Under Review": 15,
  Assigned: 30,
  "In Progress": 60,
  Resolved: 100,
  Closed: 100,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Update Status Dialog (Officer / Admin) ─────────────────────────────────────

function UpdateStatusDialog({
  complaint,
  onUpdated,
}: {
  complaint: PublicComplaint | Complaint;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    new_status: complaint.status,
    note: "",
    priority: complaint.priority,
    progress: complaint.progress,
  });

  // Sync progress when status changes
  const handleStatusChange = (s: string) => {
    setForm((f) => ({
      ...f,
      new_status: s,
      progress: statusProgress[s] ?? f.progress,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.put(`/api/municipal/complaints/${complaint.id}/status`, form);
      toast.success(`Status updated to "${form.new_status}"`);
      setOpen(false);
      onUpdated();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail ?? "Failed to update status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" id={`update-status-${complaint.id}`}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Update
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Update Complaint — {complaint.complaint_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
            <p className="font-medium">{complaint.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {complaint.category} · {complaint.location}
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Select value={form.new_status} onValueChange={handleStatusChange}>
              <SelectTrigger id="update-status-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Progress ({form.progress}%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.progress}
                onChange={(e) =>
                  setForm((f) => ({ ...f, progress: parseInt(e.target.value) || 0 }))
                }
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="officer-note">Officer Notes</Label>
            <Textarea
              id="officer-note"
              placeholder="Add an update note for this complaint..."
              rows={3}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={loading}
            id="submit-status-update-btn"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Save Update
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Complaint Card (Issues Tab) ────────────────────────────────────────────────

function ComplaintCard({
  complaint,
  canUpdate,
  onUpdated,
}: {
  complaint: PublicComplaint | Complaint;
  canUpdate: boolean;
  onUpdated: () => void;
}) {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold leading-tight">{complaint.title}</span>
          <Badge variant="secondary" className={priorityColor[complaint.priority]}>
            {complaint.priority}
          </Badge>
          <Badge variant="secondary">{complaint.category}</Badge>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-mono">{complaint.complaint_number}</span>
          {" · "}
          <MapPin className="inline h-3 w-3" /> {complaint.location}
          {" · "}
          {complaint.department}
        </p>

        <div className="mt-2 flex items-center gap-3">
          <Progress value={complaint.progress} className="h-1.5 w-40 max-w-full" />
          <span className="shrink-0 text-xs text-muted-foreground">{complaint.progress}%</span>
          <span className="text-xs text-muted-foreground">{timeAgo(complaint.created_at)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge className={statusColor[complaint.status]} variant="secondary">
          {complaint.status}
        </Badge>
        {canUpdate && (
          <UpdateStatusDialog complaint={complaint} onUpdated={onUpdated} />
        )}
      </div>
    </div>
  );
}

// ── Register Tab ───────────────────────────────────────────────────────────────

function RegisterTab({ onSubmitted }: { onSubmitted: () => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "",
    location: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.category || !form.location.trim() || !form.description.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!user) {
      toast.error("You must be logged in to submit a complaint.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post<Complaint>("/api/municipal/complaints", form);
      toast.success(
        `✅ Complaint submitted! Your ID is ${data.complaint_number}`,
        { duration: 6000 }
      );
      setForm({ title: "", category: "", location: "", description: "" });
      onSubmitted();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail ?? "Failed to submit complaint.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* Form */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            Register New Complaint
          </CardTitle>
          <CardDescription>
            All fields are required. Your complaint will be assigned a unique tracking ID.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="complaint-title">Issue Title *</Label>
              <Input
                id="complaint-title"
                placeholder="e.g. Broken street light near park"
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger id="complaint-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="complaint-location">Location *</Label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="complaint-location"
                    className="pl-9"
                    placeholder="Ward / street / landmark"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="complaint-description">Description *</Label>
              <Textarea
                id="complaint-description"
                rows={4}
                placeholder="Describe the issue in detail — severity, duration, any safety hazards…"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                required
              />
            </div>

            {/* Photo upload placeholder */}
            <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 py-6 text-sm text-muted-foreground">
              <Upload className="h-4 w-4" />
              <span>Photo uploads coming soon</span>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              id="submit-complaint-btn"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Complaint
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Status Pipeline */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Resolution Pipeline
          </CardTitle>
          <CardDescription>
            How your complaint moves through our system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {STATUS_PIPELINE.map((s, i) => (
            <div key={s.label} className="flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── My Complaints Tab (Citizen) ────────────────────────────────────────────────

function MyComplaintsTab({ refreshKey }: { refreshKey: number }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchMine = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Complaint[]>("/api/municipal/complaints/mine");
      setComplaints(data);
    } catch {
      toast.error("Failed to load your complaints.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMine();
  }, [fetchMine, refreshKey]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
        Loading your complaints…
      </div>
    );

  if (complaints.length === 0)
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center gap-3 py-14">
          <ClipboardList className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">You haven't submitted any complaints yet.</p>
          <p className="text-xs text-muted-foreground">Use the Register tab to file your first complaint.</p>
        </CardContent>
      </Card>
    );

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>My Complaints</CardTitle>
          <CardDescription>{complaints.length} complaint{complaints.length !== 1 ? "s" : ""} submitted by you</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchMine}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {complaints.map((c) => (
            <div key={c.id}>
              <button
                className="w-full text-left"
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              >
                <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center hover:bg-muted/40 transition-colors">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{c.title}</span>
                      <Badge variant="secondary">{c.category}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-mono">{c.complaint_number}</span>
                      {" · "}
                      <MapPin className="inline h-3 w-3" /> {c.location}
                      {" · "}
                      {c.department}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <Progress value={c.progress} className="h-1.5 w-40 max-w-full" />
                      <span className="text-xs text-muted-foreground">{c.progress}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColor[c.status]} variant="secondary">
                      {c.status}
                    </Badge>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${expanded === c.id ? "rotate-180" : ""}`}
                    />
                  </div>
                </div>
              </button>

              {/* Expanded Detail */}
              {expanded === c.id && (
                <div className="border-t border-border bg-muted/20 p-4 space-y-3">
                  {c.description && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                      <p className="text-sm">{c.description}</p>
                    </div>
                  )}
                  {c.officer_notes && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="text-xs font-semibold text-primary mb-1">Officer Notes</p>
                      <p className="text-sm">{c.officer_notes}</p>
                      {c.assigned_officer_name && (
                        <p className="text-xs text-muted-foreground mt-1">— {c.assigned_officer_name}</p>
                      )}
                    </div>
                  )}
                  {c.history.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Status History</p>
                      <div className="space-y-1.5">
                        {c.history.map((h, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{h.old_status || "—"} → <strong className="text-foreground">{h.new_status}</strong></span>
                            {h.note && <span className="text-muted-foreground">({h.note})</span>}
                            <span className="ml-auto shrink-0">{timeAgo(h.changed_at)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Existing Issues Tab ────────────────────────────────────────────────────────

function IssuesTab({ canUpdate }: { canUpdate: boolean }) {
  const [complaints, setComplaints] = useState<PublicComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeCat) params.category = activeCat;
      if (statusFilter !== "all") params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const { data } = await api.get<PublicComplaint[]>("/api/municipal/complaints/public", {
        params,
      });
      setComplaints(data);
    } catch {
      toast.error("Failed to load issues.");
    } finally {
      setLoading(false);
    }
  }, [activeCat, statusFilter, search]);

  useEffect(() => {
    const timer = setTimeout(fetchIssues, 300);
    return () => clearTimeout(timer);
  }, [fetchIssues, refreshKey]);

  const handleUpdated = () => setRefreshKey((k) => k + 1);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="issues-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
            placeholder="Search by title, ID or location…"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-44" id="status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Category Chips */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={activeCat === null ? "default" : "outline"}
          className="cursor-pointer transition-all hover:bg-primary/10"
          onClick={() => setActiveCat(null)}
        >
          All
        </Badge>
        {CATEGORIES.map((c) => (
          <Badge
            key={c}
            variant={activeCat === c ? "default" : "outline"}
            className="cursor-pointer transition-all hover:bg-primary/10"
            onClick={() => setActiveCat(activeCat === c ? null : c)}
          >
            {c}
          </Badge>
        ))}
      </div>

      {/* Results */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Loading issues…
            </div>
          ) : complaints.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-sm">No issues found matching your filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {complaints.map((c) => (
                <ComplaintCard
                  key={c.id}
                  complaint={c}
                  canUpdate={canUpdate}
                  onUpdated={handleUpdated}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ComplaintStats | null>(null);
  const [loading, setLoading] = useState(true);
  const isAdminOrOfficer = user?.role === "admin" || user?.role === "officer";

  useEffect(() => {
    if (!isAdminOrOfficer) {
      setLoading(false);
      return;
    }
    api
      .get<ComplaintStats>("/api/municipal/stats")
      .then(({ data }) => setStats(data))
      .catch(() => toast.error("Failed to load stats."))
      .finally(() => setLoading(false));
  }, [isAdminOrOfficer]);

  if (!isAdminOrOfficer) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Full analytics are available to officers and admins.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
        Loading analytics…
      </div>
    );

  if (!stats) return null;

  const byCat = Object.entries(stats.by_category)
    .filter(([, v]) => v > 0)
    .map(([cat, v]) => ({ cat: cat.split(" ")[0], v }));

  const pie = [
    { name: "Resolved", value: stats.resolved + stats.closed, fill: "var(--color-chart-3)" },
    { name: "In Progress", value: stats.in_progress + stats.assigned, fill: "var(--color-chart-4)" },
    { name: "Pending", value: stats.submitted + stats.under_review, fill: "var(--color-chart-5)" },
  ].filter((p) => p.value > 0);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Complaints" value={String(stats.total)} delta="all time" />
        <StatCard
          label="Open"
          value={String(stats.submitted + stats.under_review + stats.assigned + stats.in_progress)}
          delta="active"
          trend="down"
          icon={AlertTriangle}
        />
        <StatCard
          label="Resolved"
          value={String(stats.resolved + stats.closed)}
          delta={`${stats.resolution_rate}% rate`}
          icon={CheckCircle2}
        />
        <StatCard
          label="Avg. Resolution"
          value={stats.avg_resolution_hours ? `${stats.avg_resolution_hours}h` : "—"}
          delta="time to close"
          icon={Clock}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bar Chart */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle>Complaints by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {byCat.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byCat}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="cat"
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted)" }}
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="v" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {pie.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {pie.map((p) => (
                        <Cell key={p.name} fill={p.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  {pie.map((p) => (
                    <div key={p.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: p.fill }}
                        />
                        <span className="text-muted-foreground">{p.name}</span>
                      </div>
                      <span className="font-medium">{p.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Submitted", value: stats.submitted, color: "bg-secondary" },
              { label: "Under Review", value: stats.under_review, color: "bg-accent/30" },
              { label: "Assigned", value: stats.assigned, color: "bg-chart-2/30" },
              { label: "In Progress", value: stats.in_progress, color: "bg-amber-500/20" },
              { label: "Resolved", value: stats.resolved, color: "bg-emerald-500/20" },
              { label: "Closed", value: stats.closed, color: "bg-muted" },
            ].map((s) => (
              <div
                key={s.label}
                className={`${s.color} flex items-center justify-between rounded-xl px-4 py-3`}
              >
                <span className="text-sm font-medium">{s.label}</span>
                <span className="text-2xl font-bold">{s.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

function Municipal() {
  const { user } = useAuth();
  const [registerRefreshKey, setRegisterRefreshKey] = useState(0);
  const isOfficerOrAdmin = user?.role === "officer" || user?.role === "admin";
  const isCitizen = user?.role === "citizen";

  return (
    <div>
      <PageHeader
        icon={Building2}
        title="Municipal Service Automation"
        description="Register complaints, track resolution status and analyse department performance."
      />

      <Tabs defaultValue="register">
        <TabsList>
          <TabsTrigger value="register" id="tab-register">
            <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
            Register
          </TabsTrigger>
          {isCitizen && (
            <TabsTrigger value="mine" id="tab-mine">
              <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
              My Complaints
            </TabsTrigger>
          )}
          <TabsTrigger value="issues" id="tab-issues">
            <ListChecks className="mr-1.5 h-3.5 w-3.5" />
            Existing Issues
          </TabsTrigger>
          <TabsTrigger value="analytics" id="tab-analytics">
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Register Tab */}
        <TabsContent value="register" className="mt-6">
          <RegisterTab onSubmitted={() => setRegisterRefreshKey((k) => k + 1)} />
        </TabsContent>

        {/* My Complaints (Citizen only) */}
        {isCitizen && (
          <TabsContent value="mine" className="mt-6">
            <MyComplaintsTab refreshKey={registerRefreshKey} />
          </TabsContent>
        )}

        {/* Issues Board */}
        <TabsContent value="issues" className="mt-6">
          <IssuesTab canUpdate={isOfficerOrAdmin} />
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="mt-6">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
