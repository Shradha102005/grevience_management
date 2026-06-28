import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Megaphone, Sparkles, Phone, MessageSquare, Users, Send, Copy,
  CheckCircle2, RefreshCw, ChevronRight, Plus, Calendar, Download, Languages, BarChart2, Briefcase
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api";
import { PageHeader } from "@/components/portal/portal-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/portal/election")({
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

const AUDIENCE_OPTIONS = [
  { value: "all_voters", label: "All Voters" },
  { value: "youth", label: "Youth (18–29)" },
  { value: "farmers", label: "Farmers" },
  { value: "urban", label: "Urban Professionals" },
  { value: "senior", label: "Senior Citizens" },
];

const VOTER_SEGMENTS = [
  { label: "Farmers", pct: 34, color: "bg-emerald-500" },
  { label: "Youth (18–29)", pct: 28, color: "bg-violet-500" },
  { label: "Urban professionals", pct: 21, color: "bg-sky-500" },
  { label: "Senior citizens", pct: 17, color: "bg-amber-500" },
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

// ── CRM Interface ────────────────────────────────────────────────────────────

function Election() {
  const { user } = useAuth();
  const isStaff = user?.role === "admin" || user?.role === "officer";

  const [campaigns, setCampaigns] = useState<CampaignSession[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignSession | null>(null);
  const [loading, setLoading] = useState(true);

  // New Campaign State
  const [newCampOpen, setNewCampOpen] = useState(false);
  const [newCampForm, setNewCampForm] = useState({ candidate_name: "", theme: "", audience: "all_voters", key_points: "" });
  const [generating, setGenerating] = useState(false);

  // Outreach State
  const [phonesInput, setPhonesInput] = useState("");
  const [sendSms, setSendSms] = useState(true);
  const [sendCall, setSendCall] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [outreachResult, setOutreachResult] = useState<OutreachResult | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<CampaignSession[]>("/api/election/campaigns");
      setCampaigns(data);
    } catch {
      toast.error("Failed to load campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const handleGenerate = async () => {
    if (!newCampForm.candidate_name || !newCampForm.theme || !newCampForm.key_points) {
      toast.error("Please fill all fields."); return;
    }
    setGenerating(true);
    try {
      const { data } = await api.post<SpeechResult>("/api/election/generate-speech", newCampForm);
      toast.success("Campaign created successfully!");
      setNewCampOpen(false);
      await fetchCampaigns();
      const created = (await api.get<CampaignSession[]>("/api/election/campaigns")).data.find(c => c.id === data.session_id);
      if(created) setSelectedCampaign(created);
    } catch {
      toast.error("Failed to create campaign.");
    } finally {
      setGenerating(false);
    }
  };

  const handleLaunchOutreach = async () => {
    if (!selectedCampaign) return;
    const phones = phonesInput.split(/[\n,]+/).map(p => p.trim()).filter(p => p.length > 0);
    if (!phones.length || (!sendSms && !sendCall)) { toast.error("Invalid configuration."); return; }
    setLaunching(true);
    try {
      const { data } = await api.post<OutreachResult>("/api/election/outreach", {
        session_id: selectedCampaign.id, phones, send_sms: sendSms, send_call: sendCall,
      });
      setOutreachResult(data);
      toast.success(`Launched to ${data.total_phones} contacts`);
      fetchCampaigns();
    } catch {
      toast.error("Outreach failed.");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4">
      <PageHeader 
        title="Campaign Management CRM" 
        description="Unified workspace for AI speech generation and voter outreach."
        actions={
          isStaff && (
            <Dialog open={newCampOpen} onOpenChange={setNewCampOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 text-xs"><Plus className="mr-2 h-3.5 w-3.5" /> New Campaign</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px]">
                <DialogHeader><DialogTitle className="text-sm font-semibold">Initialize New Campaign</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="grid gap-2">
                    <Label className="text-xs">Candidate Name</Label>
                    <Input className="h-8 text-xs" value={newCampForm.candidate_name} onChange={e => setNewCampForm(f => ({ ...f, candidate_name: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs">Campaign Theme</Label>
                    <Input className="h-8 text-xs" value={newCampForm.theme} onChange={e => setNewCampForm(f => ({ ...f, theme: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs">Target Audience</Label>
                    <Select value={newCampForm.audience} onValueChange={v => setNewCampForm(f => ({ ...f, audience: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{AUDIENCE_OPTIONS.map(a => <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs">Key Talking Points</Label>
                    <Textarea className="h-20 text-xs resize-none" placeholder="Enter key points..." value={newCampForm.key_points} onChange={e => setNewCampForm(f => ({ ...f, key_points: e.target.value }))} />
                  </div>
                  <Button className="w-full h-8 text-xs" onClick={handleGenerate} disabled={generating}>{generating ? "Generating AI Assets..." : "Create Campaign"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Left: Campaign Pipeline Pipeline */}
        <Card className="w-80 shrink-0 shadow-none border-border flex flex-col min-h-0 bg-muted/10">
          <CardHeader className="p-4 border-b border-border/50 sticky top-0 bg-card z-10 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> Active Pipelines</CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchCampaigns}><RefreshCw className="h-3 w-3" /></Button>
          </CardHeader>
          <div className="flex-1 overflow-auto p-3 space-y-2">
             {loading ? <p className="text-xs text-muted-foreground text-center py-4">Loading pipeline...</p> : campaigns.map(c => (
               <div 
                 key={c.id} 
                 onClick={() => { setSelectedCampaign(c); setOutreachResult(null); }}
                 className={`p-3 rounded-sm border cursor-pointer transition-colors ${selectedCampaign?.id === c.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'}`}
               >
                 <div className="flex justify-between items-start mb-2">
                   <Badge variant="outline" className="text-[9px] uppercase tracking-wider bg-background">{AUDIENCE_OPTIONS.find(a => a.value === c.audience)?.label}</Badge>
                   <span className="text-[10px] text-muted-foreground font-mono">{timeAgo(c.created_at)}</span>
                 </div>
                 <h4 className="text-xs font-bold truncate">{c.theme}</h4>
                 <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{c.candidate_name}</p>
                 <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/50 text-[10px] text-muted-foreground font-mono">
                   <span className="flex items-center gap-1" title="SMS Sent"><MessageSquare className="h-3 w-3 text-primary" /> {c.sms_sent}</span>
                   <span className="flex items-center gap-1" title="Calls Made"><Phone className="h-3 w-3 text-warning" /> {c.calls_made}</span>
                 </div>
               </div>
             ))}
          </div>
        </Card>

        {/* Right: Workspace */}
        <div className="flex-1 flex flex-col min-h-0 bg-card border border-border shadow-none rounded-xl overflow-hidden">
          {selectedCampaign ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-border/50 bg-muted/10 flex justify-between items-center shrink-0">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-bold">{selectedCampaign.theme}</h2>
                    {selectedCampaign.is_mock_ai && <Badge variant="secondary" className="text-[9px]">Mock AI</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">Candidate: <span className="font-semibold text-foreground">{selectedCampaign.candidate_name}</span> · Audience: <span className="font-semibold text-foreground">{AUDIENCE_OPTIONS.find(a => a.value === selectedCampaign.audience)?.label}</span></p>
                </div>
                <div className="flex gap-2">
                   <Button variant="outline" size="sm" className="h-8 text-xs border-border" onClick={() => { navigator.clipboard.writeText(selectedCampaign.generated_speech); toast.success("Copied to clipboard!"); }}><Copy className="mr-2 h-3.5 w-3.5" /> Copy Transcript</Button>
                </div>
              </div>
              
              <div className="flex-1 flex min-h-0">
                {/* Speech Transcript */}
                <div className="flex-1 p-6 overflow-auto border-r border-border/50 bg-background">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-4">AI Generated Transcript</h3>
                  <div className="prose prose-sm max-w-none font-serif text-sm leading-loose dark:prose-invert whitespace-pre-wrap text-muted-foreground">
                    {selectedCampaign.generated_speech}
                  </div>
                </div>

                {/* Outreach Config Panel */}
                <div className="w-80 shrink-0 bg-muted/10 flex flex-col">
                  <div className="p-4 border-b border-border/50 font-semibold text-sm flex items-center gap-2"><Send className="h-4 w-4 text-primary" /> Launch Outreach</div>
                  <div className="p-4 space-y-4 flex-1 overflow-auto">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Target List (Phone Numbers)</Label>
                      <Textarea 
                        placeholder="+919876543210&#10;+918765432100" 
                        className="h-24 text-xs font-mono resize-none bg-background" 
                        value={phonesInput} 
                        onChange={e => setPhonesInput(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Delivery Channels</Label>
                      <div className="flex flex-col gap-2 p-3 rounded-sm border border-border bg-background">
                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer"><Checkbox checked={sendSms} onCheckedChange={c => setSendSms(!!c)} /> SMS Broadcast</label>
                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer"><Checkbox checked={sendCall} onCheckedChange={c => setSendCall(!!c)} /> Automated Voice Call</label>
                      </div>
                    </div>
                    <Button className="w-full h-8 text-xs" onClick={handleLaunchOutreach} disabled={launching}>{launching ? "Executing..." : "Execute Campaign"}</Button>

                    {outreachResult && (
                      <div className="mt-6 border-t border-border/50 pt-4 animate-in fade-in">
                         <Label className="text-[10px] font-bold uppercase text-muted-foreground block mb-2">Delivery Log</Label>
                         <div className="space-y-2">
                           {outreachResult.results.map((r, i) => (
                             <div key={i} className="text-[10px] border border-border/50 rounded-sm p-2 bg-background flex flex-col gap-1">
                               <span className="font-mono font-semibold">{r.phone}</span>
                               <div className="flex items-center justify-between">
                                 <span className="text-muted-foreground">SMS: <span className={r.sms_status === 'sent' || r.sms_status === 'mock' ? 'text-success' : 'text-destructive'}>{r.sms_status || 'N/A'}</span></span>
                                 <span className="text-muted-foreground">Call: <span className={r.call_status === 'sent' || r.call_status === 'mock' ? 'text-success' : 'text-destructive'}>{r.call_status || 'N/A'}</span></span>
                               </div>
                             </div>
                           ))}
                         </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 h-full flex flex-col">
              <div className="mb-6">
                <h2 className="text-lg font-bold">Voter Demographics Overview</h2>
                <p className="text-xs text-muted-foreground">Select a campaign from the pipeline to manage it, or view macro insights below.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Card className="shadow-none border-border">
                   <CardHeader className="p-4 border-b border-border/50"><CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart2 className="h-4 w-4 text-primary" /> Segmentation Analysis</CardTitle></CardHeader>
                   <CardContent className="p-4 space-y-5">
                     {VOTER_SEGMENTS.map(seg => (
                       <div key={seg.label} className="space-y-2">
                         <div className="flex justify-between text-xs font-semibold"><span>{seg.label}</span><span>{seg.pct}%</span></div>
                         <div className="h-2 w-full rounded-sm bg-muted overflow-hidden">
                           <div className={`h-full rounded-sm ${seg.color}`} style={{ width: `${seg.pct}%` }} />
                         </div>
                       </div>
                     ))}
                   </CardContent>
                 </Card>
                 <Card className="shadow-none border-border bg-primary/5 border-primary/20">
                   <CardHeader className="p-4"><CardTitle className="text-sm font-semibold text-primary">Strategic Insight</CardTitle></CardHeader>
                   <CardContent className="p-4 pt-0">
                     <p className="text-xs leading-relaxed text-foreground">Targeting <strong>Farmers</strong> and <strong>Youth (18-29)</strong> will maximize outreach efficiency, capturing 62% of the registered voter base in this constituency. Ensure campaigns heavily emphasize agricultural subsidies and job creation themes.</p>
                   </CardContent>
                 </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
