import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search, Filter, MessageSquareWarning, X, ArrowLeft, CheckCircle2,
  AlertCircle, ArrowUpCircle, ArrowDownCircle, MinusCircle, 
  MapPin, Clock, Building2, Phone, Briefcase, Activity, Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/portal/grievances")({
  head: () => ({ meta: [{ title: "Grievances — CIVICOS AI" }] }),
  component: Grievances,
});

const ROWS = [
  { 
    id: "GRV-10293", citizen: "Ravi Sharma", subject: "Water leakage on MG Road", dept: "Water Board", 
    priority: "High", status: "Submitted", date: "Jun 17, 2026", time: "09:41 AM",
    description: "There is a massive water leakage near the main crossing of MG Road. Gallons of drinking water are being wasted every hour. Please fix immediately.",
    location: "MG Road Crossing, Sector 4", phone: "+91 98765 43210"
  },
  { 
    id: "GRV-10288", citizen: "Meera Patel", subject: "Street light outage", dept: "Electrical", 
    priority: "Medium", status: "Assigned", date: "Jun 16, 2026", time: "08:20 PM",
    description: "The street lights in our lane have not been working for the past 3 days, causing safety concerns at night.",
    location: "Lane 4, Vasant Vihar", phone: "+91 87654 32109"
  },
  { 
    id: "GRV-10271", citizen: "Arjun Nair", subject: "Garbage not collected", dept: "Sanitation", 
    priority: "Low", status: "In Progress", date: "Jun 15, 2026", time: "11:05 AM",
    description: "The municipal garbage truck has skipped our sector for the last two days. Bins are overflowing.",
    location: "Sector 12, Phase 1", phone: "+91 76543 21098"
  },
  { 
    id: "GRV-10260", citizen: "Sana Khan", subject: "Pothole near school", dept: "Public Works", 
    priority: "High", status: "Resolved", date: "Jun 14, 2026", time: "02:15 PM",
    description: "A huge pothole has developed right outside the primary school gate. It is dangerous for kids and school buses.",
    location: "St. Mary's School, Ring Road", phone: "+91 65432 10987"
  },
  { 
    id: "GRV-10255", citizen: "Vikram Rao", subject: "Drainage overflow", dept: "Public Works", 
    priority: "High", status: "Under Review", date: "Jun 13, 2026", time: "04:30 PM",
    description: "The storm water drain is choked and overflowing onto the main street, causing severe foul smell and mosquito breeding.",
    location: "Market Area, Phase 2", phone: "+91 54321 09876"
  },
  { 
    id: "GRV-10241", citizen: "Priya Das", subject: "Traffic signal fault", dept: "Traffic", 
    priority: "Medium", status: "Closed", date: "Jun 12, 2026", time: "10:10 AM",
    description: "The traffic signal at the main junction is stuck on red for the western corridor, causing massive jams.",
    location: "Central Junction", phone: "+91 43210 98765"
  },
];

const statusColors: Record<string, string> = {
  "Submitted": "bg-slate-100 text-slate-600 border-slate-200",
  "Under Review": "bg-blue-50 text-blue-600 border-blue-200",
  "Assigned": "bg-indigo-50 text-indigo-600 border-indigo-200",
  "In Progress": "bg-amber-50 text-amber-600 border-amber-200",
  "Resolved": "bg-emerald-50 text-emerald-600 border-emerald-200",
  "Closed": "bg-slate-100 text-slate-500 border-slate-200",
};

const priorityIcon: Record<string, any> = {
  High: <ArrowUpCircle className="h-4 w-4 text-red-500" />,
  Medium: <MinusCircle className="h-4 w-4 text-amber-500" />,
  Low: <ArrowDownCircle className="h-4 w-4 text-slate-400" />,
};

function Grievances() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeItem, setActiveItem] = useState<typeof ROWS[0] | null>(null);
  const [updateStatus, setUpdateStatus] = useState("");

  const rows = ROWS.filter(
    (r) =>
      (statusFilter === "all" || r.status === statusFilter) &&
      (q === "" ||
        r.subject.toLowerCase().includes(q.toLowerCase()) ||
        r.citizen.toLowerCase().includes(q.toLowerCase()) ||
        r.id.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="-m-6 flex flex-col h-[calc(100vh-4rem)] relative overflow-hidden font-sans" style={{ background: "#f1f5f9" }}>
      
      {/* ── Ambient Background (Light Theme Premium) ── */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-60" style={{
        backgroundImage: `
          radial-gradient(circle at 10% 20%, rgba(244, 63, 94, 0.1), transparent 30%),
          radial-gradient(circle at 90% 70%, rgba(245, 158, 11, 0.12), transparent 30%),
          radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.08), transparent 40%)
        `
      }} />
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

      {/* ── Top Header Glass ── */}
      <div className="flex items-center justify-between px-8 py-5 z-10 shrink-0" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.5)" }}>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-rose-600 shadow-xl shadow-rose-500/10" style={{ background: "linear-gradient(135deg, #fff1f2 0%, #fecdd3 100%)", border: "1px solid rgba(255,255,255,0.8)" }}>
            <MessageSquareWarning className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-900 text-xl tracking-tight">Citizen Grievances</h1>
            <p className="text-xs text-slate-500 font-semibold tracking-wide">Public Resolution Network</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative shadow-sm rounded-xl">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="h-11 pl-10 pr-10 text-sm w-72 bg-white/70 border-white shadow-sm text-slate-800 focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10 rounded-xl transition-all placeholder:text-slate-400" placeholder="Search by ID, citizen, or subject..." value={q} onChange={e => setQ(e.target.value)} />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 text-sm w-44 bg-white/70 border-white shadow-sm text-slate-700 rounded-xl font-bold"><Filter className="h-3.5 w-3.5 mr-2 opacity-50" /><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white/90 backdrop-blur-xl border-white shadow-xl rounded-xl">
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.keys(statusColors).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Main Canvas Area ── */}
      <div className="flex-1 flex overflow-hidden p-8 justify-center z-10 relative">
        
        {/* VIEW 1: Premium Glass List */}
        {!activeItem && (
          <div className="w-full max-w-7xl h-full flex flex-col">
            
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[
                { label: "Total Grievances", value: "12,840", delta: "+5.2%", trend: "up", color: "text-blue-600" },
                { label: "Resolved", value: "9,612", delta: "74.8% rate", trend: "up", color: "text-emerald-600" },
                { label: "Avg. Response", value: "6.2h", delta: "-12%", trend: "down", color: "text-amber-600" },
                { label: "Escalated", value: "148", delta: "+3", trend: "up", color: "text-rose-600" },
              ].map((kpi, idx) => (
                <div key={idx} className="bg-white/60 backdrop-blur-xl border border-white shadow-lg shadow-slate-200/40 rounded-2xl p-5 flex flex-col justify-center">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">{kpi.label}</p>
                  <div className="flex items-end justify-between">
                    <h3 className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</h3>
                    <span className="text-xs font-bold bg-white px-2 py-1 rounded-md border border-slate-100 text-slate-500 shadow-sm">{kpi.delta}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-10" style={{ scrollbarWidth: 'none' }}>
              {rows.length === 0 ? (
                <div className="text-center p-20 bg-white/40 backdrop-blur-xl rounded-3xl border border-white shadow-xl text-slate-400 font-medium">
                  <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                  No grievances found matching your criteria.
                </div>
              ) : (
                rows.map((r, i) => (
                  <div 
                    key={r.id} 
                    onClick={() => { setActiveItem(r); setUpdateStatus(r.status); }}
                    className="group bg-white/60 backdrop-blur-xl border border-white shadow-lg shadow-slate-200/50 hover:shadow-xl hover:bg-white/80 rounded-2xl p-6 cursor-pointer transition-all hover:-translate-y-1 flex items-center gap-6"
                    style={{ animation: `slideIn 0.3s cubic-bezier(0.16,1,0.3,1) ${i * 0.05}s both` }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2.5">
                        <span className="text-[11px] text-slate-500 font-mono font-bold bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200">{r.id}</span>
                        <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-md border ${statusColors[r.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {r.status}
                        </span>
                        <span className="text-[11px] text-slate-400 font-semibold">{r.date}</span>
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-lg leading-tight truncate group-hover:text-rose-600 transition-colors">{r.subject}</h4>
                      <p className="text-sm text-slate-500 mt-1.5 flex items-center gap-2 font-medium">
                        <span className="font-bold text-slate-700">{r.citizen}</span> 
                        <span className="text-slate-300">•</span>
                        <Building2 className="h-3.5 w-3.5 text-slate-400" /> {r.dept}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-6 shrink-0 border-l border-slate-200/50 pl-6">
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Priority</p>
                        <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5 justify-end">
                          {priorityIcon[r.priority]} {r.priority}
                        </span>
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
          <div className="w-full max-w-5xl h-full flex flex-col bg-white/70 backdrop-blur-3xl border border-white shadow-2xl shadow-slate-300/60 rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* HUD Header */}
            <div className="px-10 py-8 border-b border-white/50 bg-white/40 flex justify-between items-start">
              <div className="flex items-start gap-6">
                <Button variant="ghost" size="icon" onClick={() => setActiveItem(null)} className="h-12 w-12 bg-white hover:bg-slate-50 border border-slate-100 text-slate-600 rounded-full shadow-sm shrink-0 transition-transform hover:scale-105">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-slate-800 text-white font-mono text-xs px-3 py-1 rounded-md font-bold shadow-md">{activeItem.id}</span>
                    <span className={`text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-md border shadow-sm ${statusColors[activeItem.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {activeItem.status}
                    </span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">{activeItem.subject}</h2>
                  <p className="text-sm text-slate-500 font-semibold mt-2 flex items-center gap-2">
                    Reported by <span className="font-bold text-slate-700">{activeItem.citizen}</span> on {activeItem.date}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Update Status</Label>
                <Select value={updateStatus} onValueChange={setUpdateStatus}>
                  <SelectTrigger className="h-10 text-sm font-bold bg-slate-50 border-transparent w-[200px] text-slate-800 rounded-xl focus:ring-4 focus:ring-rose-500/10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white rounded-xl shadow-xl border-slate-100">
                    {Object.keys(statusColors).map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* HUD Body */}
            <div className="p-10 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-10">
                  <div className="bg-white rounded-3xl p-8 border border-white shadow-xl shadow-slate-200/40">
                    <h3 className="text-[11px] font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2"><MessageSquareWarning className="h-4 w-4" /> Grievance Details</h3>
                    <p className="text-[16px] text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                      {activeItem.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6 bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "linear-gradient(45deg, #1e293b 25%, transparent 25%, transparent 75%, #1e293b 75%, #1e293b), linear-gradient(45deg, #1e293b 25%, transparent 25%, transparent 75%, #1e293b 75%, #1e293b)", backgroundSize: "20px 20px", backgroundPosition: "0 0, 10px 10px" }} />
                    <div className="relative z-10">
                      <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2">Priority</p>
                      <span className="text-xl font-bold flex items-center gap-3">{priorityIcon[activeItem.priority]} {activeItem.priority}</span>
                    </div>
                    <div className="relative z-10">
                      <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2">Routing Dept.</p>
                      <span className="text-xl font-bold flex items-center gap-3"><Building2 className="h-6 w-6 text-indigo-400" /> {activeItem.dept}</span>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-10">
                  {/* Citizen Card */}
                  <div className="bg-white rounded-3xl border border-white shadow-xl shadow-slate-200/40 p-6">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Citizen Profile</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-black text-lg">
                          {activeItem.citizen.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{activeItem.citizen}</p>
                          <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5"><Phone className="h-3 w-3" /> {activeItem.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Glass Map Widget */}
                  <div className="bg-white rounded-3xl border border-white shadow-xl shadow-slate-200/40 overflow-hidden relative h-[220px] flex items-center justify-center">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#64748b 2px, transparent 2px)", backgroundSize: "24px 24px" }} />
                    <div className="z-10 flex flex-col items-center p-6 text-center bg-white/60 backdrop-blur-md rounded-2xl m-6 border border-white">
                      <MapPin className="h-8 w-8 text-rose-600 mb-2 drop-shadow-lg" />
                      <p className="text-sm font-black text-slate-900 leading-tight">{activeItem.location}</p>
                    </div>
                  </div>

                  {/* Activity Timeline Widget */}
                  <div className="bg-white rounded-3xl p-8 border border-white shadow-xl shadow-slate-200/40">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Activity className="h-4 w-4" /> Activity Log</h3>
                    <div className="space-y-6 border-l-2 border-slate-100 ml-4 pl-8 relative">
                      <div className="relative">
                        <div className="absolute -left-[41px] top-0 h-6 w-6 rounded-full bg-slate-50 border-4 border-white flex items-center justify-center shadow-md"><AlertCircle className="h-3 w-3 text-slate-500" /></div>
                        <p className="text-xs text-slate-900"><span className="font-black">Citizen</span> logged grievance.</p>
                        <span className="text-[10px] text-slate-400 font-mono font-semibold block">{activeItem.date} {activeItem.time}</span>
                      </div>
                      {activeItem.status !== 'Submitted' && (
                        <div className="relative">
                          <div className="absolute -left-[41px] top-0 h-6 w-6 rounded-full bg-blue-50 border-4 border-white flex items-center justify-center shadow-md"><Pencil className="h-3 w-3 text-blue-600" /></div>
                          <p className="text-xs text-slate-900"><span className="font-black">System</span> routed to {activeItem.dept}.</p>
                          <span className="text-[10px] text-slate-400 font-mono font-semibold block">{activeItem.date}</span>
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
