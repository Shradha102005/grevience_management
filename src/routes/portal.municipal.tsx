import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Building2, MapPin, RefreshCw, Plus, Search, Filter, Pencil, 
  MoreHorizontal, MessageSquare, Clock, AlignLeft, CheckCircle2,
  AlertCircle, ChevronRight, X, ArrowUpCircle, ArrowDownCircle, MinusCircle, ListTodo
} from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
const PRIORITIES = ["Low", "Medium", "High"];

const priorityIcon: Record<string, any> = {
  High: <ArrowUpCircle className="h-3 w-3 text-destructive" />,
  Medium: <MinusCircle className="h-3 w-3 text-warning" />,
  Low: <ArrowDownCircle className="h-3 w-3 text-muted-foreground" />,
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
    const timer = setTimeout(fetchIssues, 300);
    return () => clearTimeout(timer);
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
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-0 bg-background text-foreground">
      {/* Top Header / View Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center text-primary"><ListTodo className="h-4 w-4" /></div>
            <span className="font-semibold text-sm">Issue Tracker</span>
            <span className="text-muted-foreground text-sm px-2">/</span>
            <span className="text-sm font-medium">All Issues</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-7 pl-8 text-xs w-64 bg-muted/20 border-transparent hover:border-border focus:border-border" placeholder="Search issues..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-7 text-xs w-32 bg-muted/20 border-transparent hover:border-border focus:border-border"><Filter className="h-3.5 w-3.5 mr-2 opacity-50" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchIssues}><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Dialog open={newIssueOpen} onOpenChange={setNewIssueOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs px-3 ml-2"><Pencil className="mr-2 h-3 w-3" /> New Issue</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader><DialogTitle className="text-sm">Create Issue</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                 <div className="grid gap-2"><Label className="text-xs">Title</Label><Input className="h-8 text-xs" value={newForm.title} onChange={e => setNewForm(f => ({...f, title: e.target.value}))} /></div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="grid gap-2"><Label className="text-xs">Category</Label><Select value={newForm.category} onValueChange={v => setNewForm(f => ({...f, category: v}))}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent></Select></div>
                   <div className="grid gap-2"><Label className="text-xs">Location</Label><Input className="h-8 text-xs" value={newForm.location} onChange={e => setNewForm(f => ({...f, location: e.target.value}))} /></div>
                 </div>
                 <div className="grid gap-2"><Label className="text-xs">Description</Label><Textarea className="h-20 text-xs resize-none" value={newForm.description} onChange={e => setNewForm(f => ({...f, description: e.target.value}))} /></div>
                 <div className="flex justify-end gap-2 pt-2">
                   <Button variant="ghost" className="h-8 text-xs" onClick={() => setNewIssueOpen(false)}>Cancel</Button>
                   <Button className="h-8 text-xs" onClick={handleCreate} disabled={submitting}>Create Issue</Button>
                 </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Main List */}
        <div className={`flex-1 flex flex-col min-h-0 bg-background ${activeItem ? 'hidden md:flex border-r border-border' : 'flex'}`}>
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="h-8 py-1 px-4 text-[10px] font-semibold uppercase tracking-wider w-24">ID</TableHead>
                  <TableHead className="h-8 py-1 text-[10px] font-semibold uppercase tracking-wider w-10"></TableHead>
                  <TableHead className="h-8 py-1 text-[10px] font-semibold uppercase tracking-wider">Title</TableHead>
                  <TableHead className="h-8 py-1 text-[10px] font-semibold uppercase tracking-wider w-32">Status</TableHead>
                  <TableHead className="h-8 py-1 text-[10px] font-semibold uppercase tracking-wider w-32 hidden lg:table-cell">Category</TableHead>
                  <TableHead className="h-8 py-1 text-[10px] font-semibold uppercase tracking-wider w-24 text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints.length === 0 && !loading && (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">No issues found.</TableCell></TableRow>
                )}
                {complaints.map(c => (
                  <TableRow 
                    key={c.id} 
                    className={`cursor-pointer group border-b border-border/30 ${activeItem?.id === c.id ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                    onClick={() => { setActiveItem(c); setUpdateStatus(c.status); }}
                  >
                    <TableCell className="py-2.5 px-4 text-[11px] font-mono text-muted-foreground font-medium">{c.complaint_number}</TableCell>
                    <TableCell className="py-2.5 text-center">{priorityIcon[c.priority]}</TableCell>
                    <TableCell className="py-2.5 text-[13px] font-medium truncate max-w-[200px]">{c.title}</TableCell>
                    <TableCell className="py-2.5">
                       <span className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded-sm border border-border/50 bg-background">
                         <div className={`h-1.5 w-1.5 rounded-full mr-1.5 ${c.status === 'Resolved' || c.status === 'Closed' ? 'bg-success' : c.status === 'In Progress' ? 'bg-warning' : 'bg-muted-foreground'}`} />
                         {c.status}
                       </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-[12px] text-muted-foreground hidden lg:table-cell">{c.category}</TableCell>
                    <TableCell className="py-2.5 text-[11px] text-muted-foreground text-right font-mono">{timeAgo(c.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Side Panel Detail */}
        {activeItem && (
          <div className="w-full md:w-[400px] lg:w-[450px] shrink-0 bg-card flex flex-col min-h-0 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] z-20 animate-in slide-in-from-right-8 duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/50 backdrop-blur sticky top-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-mono bg-background">{activeItem.complaint_number}</Badge>
                {isStaff && (
                  <Select value={updateStatus} onValueChange={v => { setUpdateStatus(v); handleUpdateStatus(); }}>
                    <SelectTrigger className="h-6 text-[10px] bg-background border-border/50 w-[120px] shadow-none"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setActiveItem(null)}><X className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-5 space-y-6">
               <div>
                 <h2 className="text-lg font-bold leading-tight mb-2">{activeItem.title}</h2>
                 <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{activeItem.description || "No description provided."}</p>
               </div>

               <div className="grid grid-cols-2 gap-y-4 gap-x-6 py-4 border-y border-border/50">
                 <div>
                   <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Status</p>
                   <span className="text-xs font-medium flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-primary" /> {activeItem.status}</span>
                 </div>
                 <div>
                   <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Priority</p>
                   <span className="text-xs font-medium flex items-center gap-1.5">{priorityIcon[activeItem.priority]} {activeItem.priority}</span>
                 </div>
                 <div>
                   <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Category</p>
                   <span className="text-xs font-medium">{activeItem.category}</span>
                 </div>
                 <div>
                   <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Location</p>
                   <span className="text-xs font-medium flex items-center gap-1.5"><MapPin className="h-3 w-3 text-muted-foreground" /> {activeItem.location}</span>
                 </div>
                 <div className="col-span-2">
                   <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Department</p>
                   <span className="text-xs font-medium flex items-center gap-1.5"><Building2 className="h-3 w-3 text-muted-foreground" /> {activeItem.department}</span>
                 </div>
               </div>

               <div>
                 <p className="text-[10px] uppercase font-bold text-muted-foreground mb-3 flex items-center gap-1.5"><AlignLeft className="h-3 w-3" /> Activity</p>
                 <div className="space-y-4">
                   <div className="flex gap-3">
                     <div className="mt-0.5 h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0"><AlertCircle className="h-3 w-3 text-muted-foreground" /></div>
                     <div>
                       <p className="text-xs"><span className="font-semibold text-foreground">System</span> logged the issue.</p>
                       <span className="text-[10px] text-muted-foreground font-mono">{new Date(activeItem.created_at).toLocaleString()}</span>
                     </div>
                   </div>
                   {activeItem.status !== 'Submitted' && (
                     <div className="flex gap-3">
                       <div className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Pencil className="h-3 w-3 text-primary" /></div>
                       <div>
                         <p className="text-xs"><span className="font-semibold text-foreground">Operator</span> updated status to {activeItem.status}.</p>
                         <span className="text-[10px] text-muted-foreground font-mono">{new Date(activeItem.updated_at).toLocaleString()}</span>
                       </div>
                     </div>
                   )}
                 </div>
               </div>
            </div>
            
            {/* Comment Input */}
            <div className="p-3 border-t border-border/50 bg-background/50">
              <div className="relative">
                 <Input className="pr-10 text-xs h-9 bg-card border-border shadow-none" placeholder="Add a comment..." />
                 <Button size="icon" variant="ghost" className="absolute right-1 top-1 h-7 w-7 text-muted-foreground"><MessageSquare className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
