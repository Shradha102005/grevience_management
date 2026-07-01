import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Building2, MapPin, RefreshCw, Plus, Search, Filter, Pencil, 
  Clock, CheckCircle2, AlertCircle, ArrowUpCircle, ArrowDownCircle, 
  MinusCircle, ShieldCheck, ArrowLeft, Send, ChevronRight, AlignLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/portal/municipal")({
  component: Municipal,
});

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
  description?: string;
}

const CATEGORIES = ["Road Damage", "Street Lights", "Garbage", "Water Leakage", "Drainage", "Traffic Signals", "Public Safety", "Parks", "Other"];
const STATUSES = ["Submitted", "Under Review", "Assigned", "In Progress", "Resolved", "Closed"];

const priorityIcon: Record<string, any> = {
  High: <ArrowUpCircle className="h-4 w-4 text-red-500" />,
  Medium: <MinusCircle className="h-4 w-4 text-amber-500" />,
  Low: <ArrowDownCircle className="h-4 w-4 text-slate-400" />,
};

const statusColors: Record<string, string> = {
  "Submitted": "bg-slate-100 text-slate-600 border-slate-200",
  "Under Review": "bg-blue-50 text-blue-600 border-blue-200",
  "Assigned": "bg-indigo-50 text-indigo-600 border-indigo-200",
  "In Progress": "bg-amber-50 text-amber-600 border-amber-200",
  "Resolved": "bg-emerald-50 text-emerald-600 border-emerald-200",
  "Closed": "bg-slate-100 text-slate-500 border-slate-200",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function Municipal() {
  const { user } = useAuth();
  const isStaff = user?.role === "admin" || user?.role === "officer";

  const [complaints, setComplaints] = useState<PublicComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeItem, setActiveItem] = useState<PublicComplaint | null>(null);

  // New Issue State
  const [newIssueOpen, setNewIssueOpen] = useState(false);
  const [newForm, setNewForm] = useState({ title: "", category: CATEGORIES[0], location: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  // Update State
  const [updateStatus, setUpdateStatus] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get<PublicComplaint[]>("/api/municipal/complaints/public", { params });
      setComplaints(data);
      if (activeItem) {
        const updatedActive = data.find(c => c.id === activeItem.id);
        if (updatedActive) setActiveItem(updatedActive);
      }
    } catch {
      toast.error("Failed to sync issue tracker.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, activeItem]);

  useEffect(() => {
    fetchIssues();
    const timer = setInterval(fetchIssues, 3000);
    return () => clearInterval(timer);
  }, [fetchIssues]);

  const handleCreate = async () => {
    if (!newForm.title || !newForm.location || !newForm.description) { toast.error("Fill required fields"); return; }
    setSubmitting(true);
    try {
      await api.post("/api/municipal/complaints", newForm);
      toast.success("Issue created successfully");
      setNewIssueOpen(false);
      fetchIssues();
      setNewForm({ title: "", category: CATEGORIES[0], location: "", description: "" });
    } catch { toast.error("Creation failed"); } finally { setSubmitting(false); }
  };

  const handleUpdateStatus = async () => {
    if (!activeItem || !updateStatus) return;
    setUpdating(true);
    try {
      await api.put(`/api/municipal/complaints/${activeItem.id}/status`, { new_status: updateStatus, priority: activeItem.priority, progress: activeItem.progress });
      toast.success("Status updated");
      fetchIssues();
    } catch { toast.error("Update failed"); } finally { setUpdating(false); }
  };

  return (
    <div className="-m-6 flex flex-col h-[calc(100vh-4rem)] relative overflow-hidden font-sans" style={{ background: "#f1f5f9" }}>
      
      {/* ── Ambient Background (Light Theme Premium) ── */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-60" style={{
        backgroundImage: `
          radial-gradient(circle at 15% 50%, rgba(167, 139, 250, 0.15), transparent 30%),
          radial-gradient(circle at 85% 30%, rgba(56, 189, 248, 0.15), transparent 30%),
          radial-gradient(circle at 50% 80%, rgba(52, 211, 153, 0.15), transparent 40%)
        `
      }} />
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

      {/* ── Top Header Glass ── */}
      <div className="flex items-center justify-between px-8 py-5 z-10 shrink-0" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.5)" }}>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-blue-600 shadow-xl shadow-blue-500/10" style={{ background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)", border: "1px solid rgba(255,255,255,0.8)" }}>
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-900 text-xl tracking-tight">Municipal Command AI</h1>
            <p className="text-sm text-slate-500 font-semibold tracking-wide">Live Operations Console</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative shadow-sm rounded-xl">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="h-10 pl-10 text-sm w-64 bg-white/70 border-white shadow-sm text-slate-800 focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all placeholder:text-slate-400" placeholder="Search operations..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 text-sm w-40 bg-white/70 border-white shadow-sm text-slate-700 rounded-xl font-medium"><Filter className="h-3.5 w-3.5 mr-2 opacity-50" /><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white/90 backdrop-blur-xl border-white shadow-xl rounded-xl">
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-10 w-10 border-white bg-white/70 text-slate-600 hover:bg-white shadow-sm rounded-xl" onClick={fetchIssues}><RefreshCw className="h-4 w-4" /></Button>
          
          <Dialog open={newIssueOpen} onOpenChange={setNewIssueOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 font-bold px-5 ml-2 rounded-xl transition-transform hover:scale-105"><Plus className="mr-2 h-4 w-4" /> Report Issue</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-white/90 backdrop-blur-2xl border-white shadow-2xl rounded-2xl text-slate-800">
              <DialogHeader><DialogTitle className="text-slate-900 font-bold text-xl">Create Operation Ticket</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                 <div className="grid gap-2"><Label className="text-sm font-bold text-slate-700">Subject</Label><Input className="h-11 bg-white/50 border-slate-200 rounded-xl" value={newForm.title} onChange={e => setNewForm(f => ({...f, title: e.target.value}))} /></div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="grid gap-2"><Label className="text-sm font-bold text-slate-700">Category</Label><Select value={newForm.category} onValueChange={v => setNewForm(f => ({...f, category: v}))}><SelectTrigger className="h-11 bg-white/50 border-slate-200 rounded-xl"><SelectValue /></SelectTrigger><SelectContent className="bg-white rounded-xl">{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                   <div className="grid gap-2"><Label className="text-sm font-bold text-slate-700">Location</Label><Input className="h-11 bg-white/50 border-slate-200 rounded-xl" value={newForm.location} onChange={e => setNewForm(f => ({...f, location: e.target.value}))} /></div>
                 </div>
                 <div className="grid gap-2"><Label className="text-sm font-bold text-slate-700">Description</Label><Textarea className="h-28 bg-white/50 border-slate-200 rounded-xl resize-none" value={newForm.description} onChange={e => setNewForm(f => ({...f, description: e.target.value}))} /></div>
                 <div className="flex justify-end gap-3 pt-6">
                   <Button variant="ghost" className="h-11 rounded-xl text-slate-600 hover:bg-slate-100 font-bold" onClick={() => setNewIssueOpen(false)}>Cancel</Button>
                   <Button className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-lg shadow-blue-500/20" onClick={handleCreate} disabled={submitting}>Deploy Ticket</Button>
                 </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Main Canvas Area ── */}
      <div className="flex-1 flex overflow-hidden p-8 justify-center z-10">
        
        {/* VIEW 1: Premium Glass List */}
        {!activeItem && (
          <div className="w-full max-w-7xl h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Active Operations</h2>
              <Badge className="bg-white text-blue-700 border-white shadow-sm px-4 py-1.5 text-xs font-bold rounded-full">Monitoring {complaints.length} tickets</Badge>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-10" style={{ scrollbarWidth: 'none' }}>
              {complaints.length === 0 ? (
                <div className="text-center p-20 bg-white/40 backdrop-blur-xl rounded-3xl border border-white shadow-xl text-slate-400 font-medium">
                  <ShieldCheck className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                  All operations normal. No active issues.
                </div>
              ) : (
                complaints.map((c, i) => (
                  <div 
                    key={c.id} 
                    onClick={() => { setActiveItem(c); setUpdateStatus(c.status); }}
                    className="group bg-white/60 backdrop-blur-xl border border-white shadow-lg shadow-slate-200/50 hover:shadow-xl hover:bg-white/80 rounded-2xl p-6 cursor-pointer transition-all hover:-translate-y-1 flex items-center gap-6"
                    style={{ animation: `slideIn 0.3s cubic-bezier(0.16,1,0.3,1) ${i * 0.05}s both` }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2.5">
                        <span className="text-[11px] text-slate-500 font-mono font-bold bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200">{c.complaint_number}</span>
                        <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-md border ${statusColors[c.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {c.status}
                        </span>
                        <span className="text-[11px] text-slate-400 font-semibold">{timeAgo(c.created_at)}</span>
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-lg leading-tight truncate group-hover:text-blue-600 transition-colors">{c.title}</h4>
                      <p className="text-sm text-slate-500 mt-1.5 flex items-center gap-2 truncate font-medium">
                        <MapPin className="h-4 w-4 shrink-0 text-slate-400" /> {c.location}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-6 shrink-0 border-l border-slate-200/50 pl-6">
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Priority</p>
                        <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5 justify-end">
                          {priorityIcon[c.priority]} {c.priority}
                        </span>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors text-slate-400">
                        <ChevronRight className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: Premium Detail Modal/HUD */}
        {activeItem && (
          <div className="w-full max-w-7xl h-full flex flex-col bg-white/70 backdrop-blur-2xl border border-white shadow-2xl shadow-slate-300/50 rounded-[2rem] overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* HUD Header */}
            <div className="px-10 py-8 border-b border-white/50 bg-white/40 flex justify-between items-start">
              <div className="flex items-start gap-6">
                <Button variant="ghost" size="icon" onClick={() => setActiveItem(null)} className="h-12 w-12 bg-white hover:bg-slate-50 border border-slate-100 text-slate-600 rounded-full shadow-sm shrink-0 transition-transform hover:scale-105">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-slate-800 text-white font-mono text-xs px-3 py-1 rounded-md font-bold shadow-md">{activeItem.complaint_number}</span>
                    <span className={`text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-md border shadow-sm ${statusColors[activeItem.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {activeItem.status}
                    </span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">{activeItem.title}</h2>
                </div>
              </div>

              {isStaff && (
                <div className="flex flex-col items-end gap-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Update Status</Label>
                  <Select value={updateStatus} onValueChange={v => { setUpdateStatus(v); handleUpdateStatus(); }}>
                    <SelectTrigger className="h-10 text-sm font-bold bg-slate-50 border-transparent w-[200px] text-slate-800 rounded-xl focus:ring-4 focus:ring-blue-500/10"><SelectValue /></SelectTrigger>
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
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><AlignLeft className="h-4 w-4" /> Description</h3>
                    <p className="text-[16px] text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                      {activeItem.description || "No detailed description provided by the reporter."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6 bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "linear-gradient(45deg, #1e293b 25%, transparent 25%, transparent 75%, #1e293b 75%, #1e293b), linear-gradient(45deg, #1e293b 25%, transparent 25%, transparent 75%, #1e293b 75%, #1e293b)", backgroundSize: "20px 20px", backgroundPosition: "0 0, 10px 10px" }} />
                    <div className="relative z-10">
                      <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2">Priority</p>
                      <span className="text-xl font-bold flex items-center gap-3">{priorityIcon[activeItem.priority]} {activeItem.priority}</span>
                    </div>
                    <div className="relative z-10">
                      <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2">Category</p>
                      <span className="text-xl font-bold">{activeItem.category}</span>
                    </div>
                    <div className="col-span-2 pt-6 border-t border-slate-700/50 relative z-10">
                      <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2">Assigned Department</p>
                      <span className="text-xl font-bold flex items-center gap-3"><Building2 className="h-6 w-6 text-indigo-400" /> {activeItem.department}</span>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-10">
                  {/* Glass Map Widget */}
                  <div className="bg-white rounded-3xl border border-white shadow-xl shadow-slate-200/40 overflow-hidden relative h-[220px] flex items-center justify-center">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#64748b 2px, transparent 2px)", backgroundSize: "24px 24px" }} />
                    <div className="z-10 flex flex-col items-center p-6 text-center bg-white/60 backdrop-blur-md rounded-2xl m-6 border border-white">
                      <MapPin className="h-8 w-8 text-blue-600 mb-2 drop-shadow-lg" />
                      <p className="text-sm font-black text-slate-900 leading-tight">{activeItem.location}</p>
                    </div>
                  </div>

                  {/* Activity Timeline Widget */}
                  <div className="bg-white rounded-3xl p-8 border border-white shadow-xl shadow-slate-200/40">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2"><Clock className="h-4 w-4" /> Timeline</h3>
                    <div className="space-y-8 border-l-2 border-slate-100 ml-4 pl-8 relative">
                      <div className="relative">
                        <div className="absolute -left-[45px] top-0 h-8 w-8 rounded-full bg-slate-50 border-4 border-white flex items-center justify-center shadow-md"><AlertCircle className="h-4 w-4 text-slate-500" /></div>
                        <p className="text-sm text-slate-900"><span className="font-black">System</span> logged.</p>
                        <span className="text-xs text-slate-400 font-mono font-semibold mt-1 block">{new Date(activeItem.created_at).toLocaleString()}</span>
                      </div>
                      {activeItem.status !== 'Submitted' && (
                        <div className="relative">
                          <div className="absolute -left-[45px] top-0 h-8 w-8 rounded-full bg-blue-50 border-4 border-white flex items-center justify-center shadow-md"><Pencil className="h-4 w-4 text-blue-600" /></div>
                          <p className="text-sm text-slate-900"><span className="font-black">Operator</span> update.</p>
                          <span className="text-xs text-slate-400 font-mono font-semibold mt-1 block">{new Date(activeItem.updated_at).toLocaleString()}</span>
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
