import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search, Terminal, Command, Sparkles, Building2, Landmark, 
  MapPin, MessageSquareWarning, ArrowRight, CornerDownLeft, 
  FileText, Briefcase
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/portal/voice")({
  component: AICommandCenter,
});

const QUICK_ACTIONS = [
  { icon: Landmark, label: "Lookup Scheme Eligibility", shortcut: "S" },
  { icon: Building2, label: "Check Smart City Alerts", shortcut: "C" },
  { icon: MessageSquareWarning, label: "Review Pending Grievances", shortcut: "G" },
  { icon: Briefcase, label: "Generate Outreach Campaign", shortcut: "O" },
];

const RECENT_QUERIES = [
  "Show me all high priority traffic alerts in Sector 4",
  "Generate a speech for farmers in North District",
  "How many open water complaints do we have?",
  "List active housing schemes for urban poor"
];

function AICommandCenter() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    // Simulate AI response
    setTimeout(() => {
      setResults({
        intent: "Traffic Analysis",
        summary: "There are currently 3 active high-priority traffic alerts in Sector 4. The main congestion is at MG Road due to an accident reported 15 minutes ago.",
        actions: [
          { label: "View Smart City Dashboard", icon: Building2 },
          { label: "Dispatch Traffic Police", icon: Terminal },
        ]
      });
      setLoading(false);
    }, 800);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-background items-center pt-24 px-4">
      {/* Title */}
      <div className="text-center mb-8 max-w-2xl mx-auto">
        <Badge variant="outline" className="mb-4 bg-primary/5 text-primary border-primary/20"><Sparkles className="h-3 w-3 mr-2" /> Copilot Active</Badge>
        <h1 className="text-3xl font-bold mb-2">AI Command Center</h1>
        <p className="text-sm text-muted-foreground">Type a natural language query to search across all government modules, generate reports, or execute actions.</p>
      </div>

      {/* Main Search Box */}
      <div className="w-full max-w-3xl relative">
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <Input 
            className="h-14 w-full pl-12 pr-20 text-lg bg-card shadow-sm border-border/50 hover:border-border focus:border-primary rounded-xl"
            placeholder="Ask anything... (e.g. 'Show open tickets in my ward')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="absolute inset-y-0 right-3 flex items-center">
            <Button size="sm" type="submit" disabled={loading || !query} className="h-8 rounded-md bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground border border-border shadow-none">
              <CornerDownLeft className="h-3.5 w-3.5 mr-1.5" /> Return
            </Button>
          </div>
        </form>

        {/* Results Area */}
        {loading ? (
           <div className="mt-8 flex flex-col items-center justify-center animate-pulse text-muted-foreground">
              <Sparkles className="h-6 w-6 mb-2 text-primary" />
              <p className="text-sm font-medium">Analyzing intelligence across modules...</p>
           </div>
        ) : results ? (
           <Card className="mt-8 shadow-none border-border bg-card animate-in fade-in slide-in-from-bottom-4">
             <div className="p-5 border-b border-border/50 flex justify-between items-center bg-muted/10">
                <div className="flex items-center gap-2">
                   <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center"><Terminal className="h-3 w-3 text-primary" /></div>
                   <span className="text-sm font-semibold">{results.intent}</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">CONFIDENCE: 98%</Badge>
             </div>
             <div className="p-6">
                <p className="text-sm leading-relaxed mb-6">{results.summary}</p>
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-3">Suggested Actions</p>
                <div className="grid grid-cols-2 gap-3">
                   {results.actions.map((a: any, i: number) => (
                     <Button key={i} variant="outline" className="h-10 justify-start text-xs border-border bg-background shadow-none">
                       <a.icon className="h-4 w-4 mr-2 text-primary" /> {a.label}
                     </Button>
                   ))}
                </div>
             </div>
           </Card>
        ) : (
           <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Quick Actions */}
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2"><Command className="h-3 w-3" /> Suggested Commands</p>
                <div className="space-y-2">
                  {QUICK_ACTIONS.map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:border-border transition-colors cursor-pointer group" onClick={() => { setQuery(a.label); }}>
                      <div className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors"><a.icon className="h-3 w-3" /></div>
                        <span className="text-xs font-medium">{a.label}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-mono bg-background">/{a.shortcut}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent */}
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2"><FileText className="h-3 w-3" /> Recent Queries</p>
                <div className="space-y-2">
                  {RECENT_QUERIES.map((q, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-transparent hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => { setQuery(q); }}>
                      <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">{q}</span>
                    </div>
                  ))}
                </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
