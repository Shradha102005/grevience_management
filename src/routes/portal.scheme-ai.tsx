import { useState, useCallback, useRef, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Landmark,
  Search,
  CheckCircle2,
  ExternalLink,
  Filter,
  Loader2,
  RefreshCw,
  MoreVertical,
  Download,
  SlidersHorizontal,
  Bot
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageSelector } from "@/components/portal/language-selector";
import { toast } from "sonner";
import { PageHeader } from "@/components/portal/portal-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ChatPanel } from "@/components/portal/chat-panel";

export const Route = createFileRoute("/portal/scheme-ai")({
  component: SchemeAI,
});

const API_BASE = "http://localhost:8000";
const CATEGORIES = ["All", "Agriculture", "Health", "Housing", "Education", "Finance", "Insurance", "Employment", "Women & Child"];

interface Scheme {
  id: string;
  name: string;
  category: string;
  ministry: string;
  benefit: string;
  eligibility: string;
  documents: string;
  portal_url: string;
  helpline: string;
  status: string;
}

function SchemeAI() {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [language, setLanguage] = useState("en");
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);

  const fetchSchemes = useCallback(async (q?: string, cat?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      if (cat && cat !== "All") params.set("category", cat);
      const resp = await fetch(`${API_BASE}/live/schemes?${params.toString()}`);
      if (!resp.ok) throw new Error("Failed");
      const data = await resp.json();
      setSchemes(data.schemes ?? []);
    } catch {
      toast.error("Failed to load schemes from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchemes(); }, [fetchSchemes]);

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      <PageHeader 
        title="Scheme Directory" 
        description="Master database of government schemes and subsidies. AI assistant available for eligibility matching."
        actions={
          <div className="flex gap-2">
            <LanguageSelector value={language} onChange={setLanguage} />
            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 text-xs border-primary text-primary">
                  <Bot className="mr-2 h-3.5 w-3.5" /> AI Assistant
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] p-0 border-l border-border">
                <ChatPanel
                  title="AI Scheme Matcher"
                  greeting="I can help find eligible schemes. What is the applicant's occupation, income, and state?"
                  suggestions={["Schemes for farmers", "Health insurance eligibility"]}
                  module="scheme"
                  showLanguageSelector={false}
                />
              </SheetContent>
            </Sheet>
            <Button size="sm" className="h-8 text-xs"><Download className="mr-2 h-3.5 w-3.5" /> Export DB</Button>
          </div>
        }
      />

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Left Filters Rail */}
        <Card className="w-64 shrink-0 shadow-none border-border overflow-y-auto hidden lg:block">
          <CardHeader className="p-4 border-b border-border/50">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Filter className="h-4 w-4" /> Filters</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Category</h4>
              <div className="flex flex-col gap-1">
                {CATEGORIES.map(c => (
                  <button
                    key={c}
                    onClick={() => { setActiveCat(c); fetchSchemes(search, c); }}
                    className={`text-left px-2 py-1.5 text-xs rounded-sm transition-colors ${
                      activeCat === c ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Beneficiary Type</h4>
              <div className="flex flex-col gap-2">
                {["Individuals", "Farmers", "Students", "Businesses", "Women"].map(type => (
                  <label key={type} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" className="rounded-sm border-muted-foreground/30" /> {type}
                  </label>
                ))}
              </div>
            </div>
            
            <Button variant="outline" size="sm" className="w-full text-xs h-7">Reset Filters</Button>
          </CardContent>
        </Card>

        {/* Main Data Table */}
        <Card className="flex-1 shadow-none border-border flex flex-col min-h-0">
          <CardHeader className="p-4 border-b border-border/50 shrink-0">
            <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">{schemes.length} records</Badge>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-8 pl-8 text-xs border-border bg-background focus-visible:ring-1"
                    placeholder="Search schemes ID, name, or keywords..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); fetchSchemes(e.target.value, activeCat); }}
                  />
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8 lg:hidden"><SlidersHorizontal className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 py-1 text-xs font-semibold">Scheme ID</TableHead>
                  <TableHead className="h-8 py-1 text-xs font-semibold">Name</TableHead>
                  <TableHead className="h-8 py-1 text-xs font-semibold">Category</TableHead>
                  <TableHead className="h-8 py-1 text-xs font-semibold hidden md:table-cell">Ministry</TableHead>
                  <TableHead className="h-8 py-1 text-xs font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schemes.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">No schemes found matching criteria.</TableCell>
                  </TableRow>
                )}
                {schemes.map(s => (
                  <TableRow key={s.id} className="group cursor-pointer hover:bg-muted/30" onClick={() => setSelectedScheme(s)}>
                    <TableCell className="py-2 text-xs font-mono text-muted-foreground">{s.id}</TableCell>
                    <TableCell className="py-2 text-xs font-medium max-w-[200px] truncate">{s.name}</TableCell>
                    <TableCell className="py-2"><Badge variant="outline" className="text-[9px] uppercase tracking-wider">{s.category}</Badge></TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground hidden md:table-cell truncate max-w-[150px]">{s.ministry}</TableCell>
                    <TableCell className="py-2 text-right">
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="h-3 w-3" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Side Detail View */}
        {selectedScheme && (
          <Card className="w-80 shrink-0 shadow-none border-border overflow-y-auto hidden xl:block animate-in slide-in-from-right-2">
            <CardHeader className="p-4 border-b border-border/50 sticky top-0 bg-card z-10 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">{selectedScheme.id}</CardTitle>
                <CardDescription className="text-xs">{selectedScheme.category}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-2" onClick={() => setSelectedScheme(null)}>✕</Button>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <h3 className="font-semibold text-sm mb-1">{selectedScheme.name}</h3>
                <p className="text-xs text-muted-foreground">{selectedScheme.ministry}</p>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-border/50">
                <div>
                  <h4 className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider mb-1">Benefits</h4>
                  <p className="text-xs leading-relaxed">{selectedScheme.benefit}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider mb-1">Eligibility</h4>
                  <p className="text-xs leading-relaxed">{selectedScheme.eligibility}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider mb-1">Documents Required</h4>
                  <p className="text-xs leading-relaxed">{selectedScheme.documents}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider mb-1">Helpline</h4>
                  <p className="text-xs font-mono">{selectedScheme.helpline}</p>
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-2">
                <Button size="sm" className="w-full h-8 text-xs"><CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Check Eligibility</Button>
                <Button size="sm" variant="outline" className="w-full h-8 text-xs" asChild>
                  <a href={selectedScheme.portal_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-3.5 w-3.5" /> Official Portal</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
