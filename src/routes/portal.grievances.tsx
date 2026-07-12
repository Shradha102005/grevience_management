import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Search, Filter, MessageSquareWarning, X, ArrowLeft, CheckCircle2,
  AlertCircle, ArrowUpCircle, ArrowDownCircle, MinusCircle,
  MapPin, Clock, Building2, Activity, Pencil, RefreshCw, ChevronRight,
  TrendingUp, TrendingDown, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api";

export const Route = createFileRoute("/portal/grievances")({
  head: () => ({ meta: [{ title: "Grievances ΓÇö CivicSaathi" }] }),
  component: Grievances,
});

interface ComplaintHistoryEntry {
  old_status: string;
  new_status: string;
  note?: string;
  changed_by_name?: string;
  changed_at: string;
}

interface Grievance {
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
  // Full response fields (staff)
  description?: string;
  submitter_name?: string;
  submitted_by?: string;
  assigned_to?: string;
  assigned_officer_name?: string;
  officer_notes?: string;
  history?: ComplaintHistoryEntry[];
}

interface GrievanceStats {
  total: number;
  submitted: number;
  under_review: number;
  assigned: number;
  in_progress: number;
  resolved: number;
  closed: number;
  resolution_rate: number;
  avg_resolution_hours?: number;
}

const STATUSES = ["Submitted", "Under Review", "Assigned", "In Progress", "Resolved", "Closed"];

const statusColors: Record<string, string> = {
  "Submitted": "bg-slate-100 text-slate-600 border-slate-200",
  "Under Review": "bg-blue-50 text-blue-600 border-blue-200",
  "Assigned": "bg-indigo-50 text-indigo-600 border-indigo-200",
  "In Progress": "bg-amber-50 text-amber-600 border-amber-200",
  "Resolved": "bg-emerald-50 text-emerald-600 border-emerald-200",
  "Closed": "bg-slate-100 text-slate-500 border-slate-200",
};

const priorityIcon: Record<string, React.ReactNode> = {
  High: <ArrowUpCircle className="h-4 w-4 text-red-500" />,
  Critical: <Zap className="h-4 w-4 text-red-600" />,
  Medium: <MinusCircle className="h-4 w-4 text-amber-500" />,
  Low: <ArrowDownCircle className="h-4 w-4 text-slate-400" />,
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

function Grievances() {
  const { user } = useAuth();
  const isStaff = user?.role === "admin" || user?.role === "officer";

  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [stats, setStats] = useState<GrievanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeItem, setActiveItem] = useState<Grievance | null>(null);
  const [updateStatus, setUpdateStatus] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchGrievances = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (q.trim()) params.search = q.trim();

      // Staff can see all complaints; citizens see only public
      const endpoint = isStaff
        ? "/api/municipal/complaints"
        : "/api/municipal/complaints/public";

      const { data } = await api.get<Grievance[]>(endpoint, { params });
      setGrievances(data);
      setLastUpdated(new Date());

      // Keep activeItem in sync
      if (activeItem) {
        const updated = data.find((g) => g.id === activeItem.id);
        if (updated) setActiveItem(updated);
      }

      // Fetch stats for staff
      if (isStaff) {
        try {
          const { data: statsData } = await api.get<GrievanceStats>("/api/municipal/stats");
          setStats(statsData);
        } catch {
          // stats optional
        }
      }
    } catch {
      toast.error("Failed to sync grievances.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, q, isStaff, activeItem]);

  useEffect(() => {
    fetchGrievances();
    const timer = setInterval(fetchGrievances, 3000);
    return () => clearInterval(timer);
  }, [fetchGrievances]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!activeItem) return;
    setUpdating(true);
    try {
      await api.put(`/api/municipal/complaints/${activeItem.id}/status`, {
        new_status: newStatus,
        priority: activeItem.priority,
        progress: activeItem.progress,
      });
      toast.success(`Status updated to "${newStatus}"`);
      setUpdateStatus(newStatus);
      await fetchGrievances();
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setUpdating(false);
    }
  };

  // Compute dynamic KPIs
  const total = stats?.total ?? grievances.length;
  const resolvedCount = stats ? stats.resolved + stats.closed : grievances.filter(g => g.status === "Resolved" || g.status === "Closed").length;
  const resolutionRate = stats?.resolution_rate ?? (total > 0 ? Math.round((resolvedCount / total) * 1000) / 10 : 0);
  const avgHours = stats?.avg_resolution_hours;
  const escalated = grievances.filter(g => (g.priority === "High" || g.priority === "Critical") && g.status !== "Resolved" && g.status !== "Closed").length;

  const kpis = [
    {
      label: "Total Grievances",
      value: total.toLocaleString(),
      delta: isStaff && stats ? `${stats.in_progress} active` : `${grievances.length} loaded`,
      trend: "up" as const,
      color: "text-blue-600",
      bg: "from-blue-50 to-blue-100/50",
    },
    {
      label: "Resolved",
      value: resolvedCount.toLocaleString(),
      delta: `${resolutionRate}% rate`,
      trend: "up" as const,
      color: "text-emerald-600",
      bg: "from-emerald-50 to-emerald-100/50",
    },
    {
      label: "Avg. Resolution",
      value: avgHours != null ? `${avgHours}h` : "ΓÇö",
      delta: avgHours != null ? (avgHours < 24 ? "< 1 day" : `${Math.round(avgHours / 24)}d`) : "No data",
      trend: "down" as const,
      color: "text-amber-600",
      bg: "from-amber-50 to-amber-100/50",
    },
    {
      label: "High Priority",
      value: escalated.toString(),
      delta: "unresolved",
      trend: "up" as const,
      color: "text-rose-600",
      bg: "from-rose-50 to-rose-100/50",
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] relative overflow-hidden font-sans bg-transparent">

      {/*  Ambient Background  */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-60" style={{
        backgroundImage: `
          radial-gradient(circle at 10% 20%, rgba(244, 63, 94, 0.1), transparent 30%),
          radial-gradient(circle at 90% 70%, rgba(245, 158, 11, 0.12), transparent 30%),
          radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.08), transparent 40%)
        `
      }} />
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

      {/*  Top Header Glass  */}
      <div className="flex items-center justify-between px-8 py-6 z-10 shrink-0 bg-white/40 backdrop-blur-3xl border-b border-white/50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-[1.25rem] flex items-center justify-center text-rose-600 shadow-xl shadow-rose-500/20 bg-gradient-to-br from-white to-rose-50 border border-white">
            <MessageSquareWarning className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Citizen Grievances
            </h1>
            <p className="text-sm text-slate-500 font-semibold tracking-wide flex items-center gap-2">
              Public Resolution Network
              {lastUpdated && (
                <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-bold text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  Live ┬╖ {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative shadow-sm rounded-xl">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-11 pl-10 pr-10 text-sm w-72 bg-white/70 border-white shadow-sm text-slate-800 focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10 rounded-xl transition-all placeholder:text-slate-400"
              placeholder="Search by ID, title, or location..."
              value={q}
              onChange={e => setQ(e.target.value)}
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 text-sm w-44 bg-white/70 border-white shadow-sm text-slate-700 rounded-xl font-bold">
              <Filter className="h-3.5 w-3.5 mr-2 opacity-50" /><SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white/90 backdrop-blur-xl border-white shadow-xl rounded-xl">
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 border-white bg-white/70 text-slate-600 hover:bg-white shadow-sm rounded-xl"
            onClick={() => fetchGrievances()}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/*  Main Canvas Area  */}
      <div className="flex-1 flex overflow-hidden px-8 pt-4 pb-8 justify-center z-10 relative">

        {/* VIEW 1: List + KPIs */}
        {!activeItem && (
          <div className="w-full max-w-7xl h-full flex flex-col">

            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-2">
              {kpis.map((kpi, idx) => (
                <div key={idx} className={`bg-gradient-to-br ${kpi.bg} backdrop-blur-3xl border border-white/60 shadow-xl shadow-slate-200/40 rounded-[2rem] p-6 flex flex-col justify-between hover:-translate-y-1 hover:shadow-2xl transition-all duration-300`}>
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-500/80 mb-1">{kpi.label}</p>
                  <div className="flex items-end justify-between mt-2">
                    <h3 className={`text-2xl font-extrabold tracking-tight ${kpi.color}`}>{kpi.value}</h3>
                    <span className="text-sm font-bold bg-white/80 px-2.5 py-1 rounded-full border border-white/50 text-slate-600 shadow-sm flex items-center gap-1">
                      {kpi.trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {kpi.delta}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-extrabold text-slate-700 tracking-tight">
                {loading ? "Syncing..." : `${grievances.length} Grievance${grievances.length !== 1 ? "s" : ""}`}
              </h2>
              <Badge className="bg-white text-rose-600 border-rose-100 shadow-sm px-4 py-1.5 text-sm font-bold rounded-full border">
                Auto-refresh ┬╖ 3s
              </Badge>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-10" style={{ scrollbarWidth: 'none' }}>
              {loading && grievances.length === 0 ? (
                <div className="text-center p-20 bg-white/40 backdrop-blur-xl rounded-3xl border border-white shadow-xl text-slate-400 font-medium">
                  <RefreshCw className="h-12 w-12 mx-auto mb-4 text-slate-300 animate-spin" />
                  Loading grievances...
                </div>
              ) : grievances.length === 0 ? (
                <div className="text-center p-20 bg-white/40 backdrop-blur-xl rounded-3xl border border-white shadow-xl text-slate-400 font-medium">
                  <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                  No grievances found matching your criteria.
                </div>
              ) : (
                grievances.map((r, i) => (
                  <div
                    key={r.id}
                    onClick={() => { setActiveItem(r); setUpdateStatus(r.status); }}
                    className="group bg-white/60 backdrop-blur-3xl border border-white/60 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:bg-white/80 rounded-[2rem] p-6 cursor-pointer transition-all hover:-translate-y-1 flex items-center gap-6 relative overflow-hidden"
                    style={{ animation: `slideIn 0.3s cubic-bezier(0.16,1,0.3,1) ${i * 0.04}s both` }}
                  >
                    {/* Subtle internal gradient glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-transparent to-rose-500/0 group-hover:from-rose-500/5 group-hover:to-orange-500/5 transition-colors pointer-events-none" />

                    <div className="flex-1 min-w-0 relative z-10">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm text-slate-500 font-mono font-bold bg-white/80 px-2.5 py-1 rounded-md border border-white shadow-sm">{r.complaint_number}</span>
                        <span className={`text-sm font-extrabold uppercase tracking-widest px-3 py-1 rounded-md border shadow-sm ${statusColors[r.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {r.status}
                        </span>
                        <span className="text-sm text-slate-400 font-bold ml-auto">{timeAgo(r.created_at)}</span>
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-base leading-tight truncate group-hover:text-rose-600 transition-colors">{r.title}</h4>
                      <p className="text-sm text-slate-500/90 mt-2 flex items-center gap-2 font-bold">
                        {r.submitter_name && <><span className="font-extrabold text-slate-700">{r.submitter_name}</span><span className="text-slate-300">ΓÇó</span></>}
                        <Building2 className="h-4 w-4 text-slate-400" /> {r.department}
                        <span className="text-slate-300">ΓÇó</span>
                        <MapPin className="h-4 w-4 text-slate-400" /> <span className="truncate max-w-[200px]">{r.location}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 border-l border-slate-200/50 pl-6">
                      <div className="text-right">
                        <p className="text-sm uppercase font-bold text-slate-400 tracking-wider mb-1">Priority</p>
                        <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5 justify-end">
                          {priorityIcon[r.priority] ?? <MinusCircle className="h-4 w-4 text-slate-400" />} {r.priority}
                        </span>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors text-slate-400">
                        <ChevronRight className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: Detail HUD */}
        {activeItem && (
          <div className="w-full max-w-5xl h-full flex flex-col bg-white/70 backdrop-blur-3xl border border-white shadow-2xl shadow-slate-300/60 rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-300">

            {/* HUD Header */}
            <div className="px-10 py-8 border-b border-white/50 bg-white/40 flex justify-between items-start">
              <div className="flex items-start gap-6">
                <Button variant="ghost" size="icon" onClick={() => setActiveItem(null)} className="h-12 w-12 bg-white hover:bg-slate-50 border border-slate-100 text-slate-600 rounded-full shadow-sm shrink-0 transition-transform hover:scale-105">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-slate-800 text-white font-mono text-sm px-3 py-1 rounded-md font-bold shadow-md">{activeItem.complaint_number}</span>
                    <span className={`text-sm font-extrabold uppercase tracking-widest px-3 py-1 rounded-md border shadow-sm ${statusColors[activeItem.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {activeItem.status}
                    </span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">{activeItem.title}</h2>
                  {activeItem.submitter_name && (
                    <p className="text-sm text-slate-500 font-semibold mt-2">
                      Reported by <span className="font-bold text-slate-700">{activeItem.submitter_name}</span> ┬╖ {timeAgo(activeItem.created_at)}
                    </p>
                  )}
                </div>
              </div>

              {isStaff && (
                <div className="flex flex-col items-end gap-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <Label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Update Status</Label>
                  <Select
                    value={updateStatus}
                    onValueChange={(v) => { handleUpdateStatus(v); }}
                    disabled={updating}
                  >
                    <SelectTrigger className="h-10 text-sm font-bold bg-slate-50 border-transparent w-[200px] text-slate-800 rounded-xl focus:ring-4 focus:ring-rose-500/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white rounded-xl shadow-xl border-slate-100">
                      {STATUSES.map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* HUD Body */}
            <div className="p-10 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                {/* Left Column */}
                <div className="lg:col-span-2 space-y-10">
                  <div className="bg-white rounded-3xl p-8 border border-white shadow-xl shadow-slate-200/40">
                    <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <MessageSquareWarning className="h-4 w-4" /> Grievance Details
                    </h3>
                    <p className="text-base text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                      {activeItem.description || "No detailed description provided."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6 bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "linear-gradient(45deg, #1e293b 25%, transparent 25%, transparent 75%, #1e293b 75%, #1e293b), linear-gradient(45deg, #1e293b 25%, transparent 25%, transparent 75%, #1e293b 75%, #1e293b)", backgroundSize: "20px 20px", backgroundPosition: "0 0, 10px 10px" }} />
                    <div className="relative z-10">
                      <p className="text-sm uppercase font-black text-slate-400 tracking-widest mb-2">Priority</p>
                      <span className="text-base font-bold flex items-center gap-3">
                        {priorityIcon[activeItem.priority] ?? <MinusCircle className="h-5 w-5 text-slate-400" />} {activeItem.priority}
                      </span>
                    </div>
                    <div className="relative z-10">
                      <p className="text-sm uppercase font-black text-slate-400 tracking-widest mb-2">Category</p>
                      <span className="text-base font-bold">{activeItem.category}</span>
                    </div>
                    <div className="col-span-2 pt-6 border-t border-slate-700/50 relative z-10">
                      <p className="text-sm uppercase font-black text-slate-400 tracking-widest mb-2">Assigned Department</p>
                      <span className="text-base font-bold flex items-center gap-3">
                        <Building2 className="h-6 w-6 text-indigo-400" /> {activeItem.department}
                      </span>
                    </div>
                    {activeItem.progress > 0 && (
                      <div className="col-span-2 relative z-10">
                        <p className="text-sm uppercase font-black text-slate-400 tracking-widest mb-3">Progress</p>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-700"
                            style={{ width: `${activeItem.progress}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-slate-300 mt-1.5 block">{activeItem.progress}%</span>
                      </div>
                    )}
                  </div>

                  {activeItem.officer_notes && (
                    <div className="bg-white rounded-3xl p-8 border border-white shadow-xl shadow-slate-200/40">
                      <h3 className="text-sm font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Pencil className="h-4 w-4" /> Officer Notes
                      </h3>
                      <p className="text-base text-slate-700 font-medium leading-relaxed">{activeItem.officer_notes}</p>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                  {/* Location */}
                  <div className="bg-white rounded-3xl border border-white shadow-xl shadow-slate-200/40 overflow-hidden relative h-[200px] flex items-center justify-center">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#64748b 2px, transparent 2px)", backgroundSize: "24px 24px" }} />
                    <div className="z-10 flex flex-col items-center p-6 text-center bg-white/60 backdrop-blur-md rounded-2xl m-6 border border-white">
                      <MapPin className="h-8 w-8 text-rose-600 mb-2 drop-shadow-lg" />
                      <p className="text-sm font-black text-slate-900 leading-tight">{activeItem.location}</p>
                    </div>
                  </div>

                  {/* Activity Timeline */}
                  <div className="bg-white rounded-3xl p-8 border border-white shadow-xl shadow-slate-200/40">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Activity className="h-4 w-4" /> Activity Log
                    </h3>
                    <div className="space-y-6 border-l-2 border-slate-100 ml-4 pl-8 relative">
                      {/* Initial entry */}
                      <div className="relative">
                        <div className="absolute -left-[41px] top-0 h-6 w-6 rounded-full bg-slate-50 border-4 border-white flex items-center justify-center shadow-md">
                          <AlertCircle className="h-3 w-3 text-slate-500" />
                        </div>
                        <p className="text-sm text-slate-900"><span className="font-black">Citizen</span> logged grievance.</p>
                        <span className="text-sm text-slate-400 font-mono font-semibold block mt-0.5">
                          {new Date(activeItem.created_at).toLocaleString()}
                        </span>
                      </div>

                      {/* History entries from backend */}
                      {activeItem.history && activeItem.history.length > 0 ? (
                        activeItem.history
                          .filter(h => h.old_status !== "")
                          .map((h, idx) => (
                            <div className="relative" key={idx}>
                              <div className="absolute -left-[41px] top-0 h-6 w-6 rounded-full bg-blue-50 border-4 border-white flex items-center justify-center shadow-md">
                                <Pencil className="h-3 w-3 text-blue-600" />
                              </div>
                              <p className="text-sm text-slate-900">
                                <span className="font-black">{h.changed_by_name ?? "Officer"}</span> changed status to{" "}
                                <span className={`font-bold px-1.5 py-0.5 rounded text-sm ${statusColors[h.new_status] ?? "bg-slate-100 text-slate-600"}`}>{h.new_status}</span>
                              </p>
                              {h.note && <p className="text-sm text-slate-500 mt-0.5 italic">"{h.note}"</p>}
                              <span className="text-sm text-slate-400 font-mono font-semibold block mt-0.5">
                                {new Date(h.changed_at).toLocaleString()}
                              </span>
                            </div>
                          ))
                      ) : (
                        activeItem.status !== "Submitted" && (
                          <div className="relative">
                            <div className="absolute -left-[41px] top-0 h-6 w-6 rounded-full bg-blue-50 border-4 border-white flex items-center justify-center shadow-md">
                              <Pencil className="h-3 w-3 text-blue-600" />
                            </div>
                            <p className="text-sm text-slate-900"><span className="font-black">System</span> updated status.</p>
                            <span className="text-sm text-slate-400 font-mono font-semibold block mt-0.5">
                              {new Date(activeItem.updated_at).toLocaleString()}
                            </span>
                          </div>
                        )
                      )}

                      {/* Last sync */}
                      {lastUpdated && (
                        <div className="relative">
                          <div className="absolute -left-[41px] top-0 h-6 w-6 rounded-full bg-emerald-50 border-4 border-white flex items-center justify-center shadow-md">
                            <Clock className="h-3 w-3 text-emerald-600" />
                          </div>
                          <p className="text-sm text-emerald-600 font-bold">Live sync</p>
                          <span className="text-sm text-slate-400 font-mono font-semibold block mt-0.5">
                            {lastUpdated.toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
