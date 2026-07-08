import { useState, useCallback, useRef, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search, ExternalLink, Loader2, Bot, X, Sparkles, RefreshCw,
  CheckCircle2, Clock, ArrowUpRight, MapPin, Building2, AlertCircle,
  FileText, Landmark, Phone, ArrowLeft, HeartHandshake
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChatPanel } from "@/components/portal/chat-panel";

export const Route = createFileRoute("/portal/scheme-ai")({
  head: () => ({ meta: [{ title: "Scheme Finder — CIVICOS AI" }] }),
  component: SchemeAI,
});

const API_BASE = "http://localhost:8000";

interface Scheme {
  id: string;
  name: string;
  full_name?: string;
  description?: string;
  benefit?: string;
  eligibility?: string;
  category: string;
  ministry?: string;
  state?: string;
  tags?: string[];
  apply_url?: string;
  portal_url?: string;
  documents?: string;
  helpline?: string;
  launched_year?: number;
  status?: string;
  source?: string;
}

const CATEGORY_DOT: Record<string, string> = {
  Agriculture: "bg-emerald-500",
  Health:      "bg-rose-500",
  Housing:     "bg-amber-500",
  Education:   "bg-blue-500",
  Employment:  "bg-violet-500",
  Finance:     "bg-cyan-500",
  Energy:      "bg-yellow-500",
  Women:       "bg-pink-500",
  Disability:  "bg-indigo-500",
  Digital:     "bg-sky-500",
  "Food Security": "bg-lime-500",
  Infrastructure: "bg-orange-500",
  Insurance:   "bg-teal-500",
  Minorities:  "bg-purple-500",
};

const CATEGORY_PILL: Record<string, string> = {
  Agriculture: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Health:      "bg-rose-50 text-rose-700 border-rose-200",
  Housing:     "bg-amber-50 text-amber-700 border-amber-200",
  Education:   "bg-blue-50 text-blue-700 border-blue-200",
  Employment:  "bg-violet-50 text-violet-700 border-violet-200",
  Finance:     "bg-cyan-50 text-cyan-700 border-cyan-200",
  Energy:      "bg-yellow-50 text-yellow-700 border-yellow-200",
  Women:       "bg-pink-50 text-pink-700 border-pink-200",
  Disability:  "bg-indigo-50 text-indigo-700 border-indigo-200",
  Digital:     "bg-sky-50 text-sky-700 border-sky-200",
};

function getCategoryPill(cat: string) {
  return CATEGORY_PILL[cat] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

// ── Eligibility HUD Modal ────────────────────────────────────────────────────────
function EligibilityModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    age: "", gender: "", income: "", occupation: "",
    residence: "", category: "", state: "", land_hectares: "",
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [checked, setChecked] = useState(false);

  if (!open) return null;

  const handleCheck = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/live/schemes/check-eligibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: form.age ? parseInt(form.age) : null,
          gender: form.gender || null,
          income: form.income ? parseInt(form.income) : null,
          occupation: form.occupation || null,
          residence: form.residence || null,
          category: form.category || null,
          state: form.state || null,
          land_hectares: form.land_hectares ? parseFloat(form.land_hectares) : null,
        }),
      });
      const data = await res.json();
      setResults(data.matches || []);
      setChecked(true);
    } catch {
      toast.error("Could not check eligibility");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white/90 backdrop-blur-2xl border border-white shadow-2xl rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto m-4 animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-xl z-10">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" /> Auto-Eligibility Match
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">AI analyzes your profile to find schemes you qualify for.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8">
          {!checked ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {[
                  { key: "age",          label: "Age",               placeholder: "e.g. 35",     type: "number" },
                  { key: "income",       label: "Annual Income (₹)", placeholder: "e.g. 150000", type: "number" },
                  { key: "land_hectares",label: "Land (Hectares)",   placeholder: "e.g. 2",      type: "number" },
                ].map(({ key, label, placeholder, type }) => (
                  <div key={key} className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</Label>
                    <Input type={type} placeholder={placeholder}
                      value={(form as any)[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="h-11 bg-slate-50/50 border-slate-200 rounded-xl"
                    />
                  </div>
                ))}
                {[
                  { key: "gender",     label: "Gender",          opts: ["Male", "Female", "Other"] },
                  { key: "residence",  label: "Residence",        opts: ["rural", "urban", "semi-urban"] },
                  { key: "occupation", label: "Occupation",       opts: ["farmer", "student", "business", "government", "self-employed", "labourer", "unemployed"] },
                  { key: "category",   label: "Social Category",  opts: ["General", "OBC", "SC", "ST", "EWS"] },
                ].map(({ key, label, opts }) => (
                  <div key={key} className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</Label>
                    <select
                      value={(form as any)[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">Select…</option>
                      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <Button onClick={handleCheck} disabled={loading} className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/20 text-base">
                {loading
                  ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing Profile…</>
                  : <><Sparkles className="w-5 h-5 mr-2" /> Find My Schemes</>}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                <p className="text-sm text-indigo-900 font-medium">
                  <span className="font-extrabold text-indigo-700 text-lg mr-1">{results.length}</span> schemes matched your profile.
                </p>
                <button onClick={() => setChecked(false)} className="text-xs font-bold text-indigo-600 hover:underline">← Edit Profile</button>
              </div>
              
              <div className="space-y-4">
                {results.map(({ scheme, score, reasons }, i) => (
                  <div key={i} className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 relative overflow-hidden group hover:border-indigo-200 transition-colors">
                    <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-indigo-500" />
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-extrabold text-slate-800 text-base">{scheme.name}</p>
                        <p className="text-xs text-slate-500 font-semibold mt-1">{scheme.ministry || scheme.state}</p>
                      </div>
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 shrink-0">{score}% Match</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {reasons.slice(0, 3).map((r: string, j: number) => (
                        <span key={j} className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">✓ {r}</span>
                      ))}
                    </div>
                    {(scheme.apply_url || scheme.portal_url) && (
                      <a href={scheme.apply_url || scheme.portal_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-white bg-slate-800 hover:bg-slate-900 px-4 py-2 rounded-lg font-bold mt-4 transition-colors">
                        Apply Now <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Custom Searchable Dropdown ────────────────────────────────────────────────
function SearchableDropdown({ options, value, onChange }: { options: string[], value: string, onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} className="relative w-[280px]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full h-11 px-4 bg-white/80 backdrop-blur-sm border border-white shadow-sm text-slate-800 hover:bg-white focus:ring-4 focus:ring-indigo-500/10 rounded-xl font-bold outline-none flex justify-between items-center transition-all"
      >
        <span className="truncate pr-2">{value === "All" ? "All Categories" : value}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="opacity-40 shrink-0">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      
      {open && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                autoFocus
                className="w-full bg-slate-100/50 text-slate-800 border-none outline-none pl-9 pr-3 py-2 text-sm rounded-lg font-medium placeholder:text-slate-400 focus:bg-slate-100 transition-colors"
                placeholder="Search categories..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-1" style={{ scrollbarWidth: 'none' }}>
            <button
              className={`w-full text-left px-3 py-2.5 text-sm font-bold rounded-lg transition-colors ${value === "All" ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
              onClick={() => { onChange("All"); setOpen(false); setSearch(""); }}
            >
              All Categories
            </button>
            {filtered.map(opt => (
              <button
                key={opt}
                className={`w-full text-left px-3 py-2.5 text-sm font-bold rounded-lg transition-colors ${value === opt ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                onClick={() => { onChange(opt); setOpen(false); setSearch(""); }}
              >
                {opt}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-sm text-slate-400 font-medium text-center">
                No categories found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
function SchemeAI() {
  const [schemes, setSchemes]         = useState<Scheme[]>([]);
  const [categories, setCategories]   = useState<string[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selected, setSelected]       = useState<Scheme | null>(null);
  const [eligibilityOpen, setEligibilityOpen] = useState(false);
  const [chatOpen, setChatOpen]       = useState(false);
  const [scrapeInfo, setScrapeInfo]   = useState<{ source?: string; is_scraping?: boolean; total?: number } | null>(null);
  const [totalCount, setTotalCount]   = useState(0);
  const [page, setPage]               = useState(1);
  const [hasMore, setHasMore]         = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchSchemes = useCallback(async (q = "", cat = "", p = 1, isLoadMore = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      if (cat && cat !== "All") params.set("category", cat);
      params.set("page", p.toString());
      params.set("limit", "50");

      const res  = await fetch(`${API_BASE}/schemes/?${params}`);
      const data = await res.json();
      
      if (isLoadMore) {
        setSchemes(prev => [...prev, ...(data.schemes || [])]);
      } else {
        setSchemes(data.schemes || []);
        // Only update categories on initial load/search to avoid dropdown flicker
        if (p === 1 && (!cat || cat === "All")) {
          setCategories(data.categories || []);
        }
      }
      
      setTotalCount(data.total || 0);
      setHasMore(data.page < data.pages);
      setPage(p);
      setScrapeInfo(prev => ({ ...prev, source: data.source || "myscheme.gov.in" }));
    } catch {
      toast.error("Failed to load schemes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchemes("", "All", 1, false);
    const interval = setInterval(async () => {
      try {
        const res  = await fetch(`${API_BASE}/schemes/stats`);
        const data = await res.json();
        setScrapeInfo({
          source: "myscheme.gov.in",
          is_scraping: true, // We know the seeder is running in the background right now
          total: data.total_schemes
        });
      } catch { /* ignore */ }
    }, 10_000);
    return () => clearInterval(interval);
  }, [fetchSchemes]);

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchSchemes(val, activeCategory, 1, false), 300);
  };

  const handleCategory = (cat: string) => {
    setActiveCategory(cat);
    fetchSchemes(search, cat, 1, false);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchSchemes(search, activeCategory, page + 1, true);
    }
  };

  return (
    <div className="-m-6 flex flex-col h-[calc(100vh-4rem)] relative overflow-hidden font-sans" style={{ background: "#f1f5f9" }}>
      
      {/* ── Ambient Background (Light Theme Premium) ── */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-60" style={{
        backgroundImage: `
          radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.15), transparent 30%),
          radial-gradient(circle at 90% 70%, rgba(236, 72, 153, 0.12), transparent 30%),
          radial-gradient(circle at 50% 50%, rgba(14, 165, 233, 0.1), transparent 40%)
        `
      }} />
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

      {/* ── Top Header Glass ── */}
      {!selected && (<div className="flex items-center justify-between px-8 py-5 z-10 shrink-0" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.5)" }}>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-indigo-600 shadow-xl shadow-indigo-500/10" style={{ background: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)", border: "1px solid rgba(255,255,255,0.8)" }}>
            <HeartHandshake className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-900 text-xl tracking-tight">Scheme Finder AI</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-slate-500 font-semibold tracking-wide">Government Welfare & Grants</p>
              {scrapeInfo?.is_scraping && (
                <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-indigo-100">
                  <Loader2 className="w-3 h-3 animate-spin" /> Syncing live data...
                </span>
              )}
              {scrapeInfo?.source === "myscheme.gov.in" && !scrapeInfo?.is_scraping && (
                <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-100">
                  <CheckCircle2 className="w-3 h-3" /> Live Synced ({scrapeInfo?.total} schemes)
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative shadow-sm rounded-xl">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="h-11 pl-10 pr-10 text-sm w-72 bg-white/70 border-white shadow-sm text-slate-800 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 rounded-xl transition-all placeholder:text-slate-400" placeholder="Search by name, ministry, tags..." value={search} onChange={e => handleSearch(e.target.value)} />
            {search && (
              <button onClick={() => handleSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <Button onClick={() => setEligibilityOpen(true)} className="h-11 bg-white hover:bg-slate-50 text-indigo-600 border border-white shadow-sm font-bold px-4 ml-2 rounded-xl transition-transform hover:-translate-y-0.5">
            <Sparkles className="mr-2 h-4 w-4" /> Check Eligibility
          </Button>
          
          <Button onClick={() => setChatOpen(!chatOpen)} className={`h-11 font-bold px-4 rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 ${chatOpen ? 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-900/20' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'}`}>
            {chatOpen ? <><X className="mr-2 h-4 w-4" /> Close AI</> : <><Bot className="mr-2 h-4 w-4" /> Scheme Assistant</>}
          </Button>
        </div>
      </div>)}

      {/* ── Main Canvas Area ── */}
      <div className="flex-1 flex overflow-hidden p-3 justify-center z-10 relative">
        
        {/* VIEW 1: Scheme Grid / List */}
        {!selected && (
          <div className="w-full max-w-7xl h-full flex flex-col">
            
            {/* Categories Dropdown */}
            <div className="mb-6 flex items-center gap-3 relative z-20">
              <span className="text-slate-500 font-bold text-sm shrink-0">
                Filter by Category:
              </span>
              <SearchableDropdown 
                options={categories} 
                value={activeCategory} 
                onChange={handleCategory} 
              />
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-10" style={{ scrollbarWidth: 'none' }}>
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  <p className="text-slate-500 font-bold">Scanning Schemes...</p>
                </div>
              ) : schemes.length === 0 ? (
                <div className="text-center p-20 bg-white/40 backdrop-blur-xl rounded-3xl border border-white shadow-xl text-slate-500 font-bold">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                  No schemes found matching your criteria.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-5">
                  {schemes.map((scheme, i) => (
                    <div 
                      key={scheme.id} 
                      onClick={() => setSelected(scheme)}
                      className="group bg-white/60 backdrop-blur-xl border border-white shadow-lg shadow-slate-200/50 hover:shadow-xl hover:bg-white/80 rounded-3xl p-7 cursor-pointer transition-all hover:-translate-y-1.5 flex flex-col justify-between min-h-[220px]"
                      style={{ animation: `slideIn 0.3s cubic-bezier(0.16,1,0.3,1) ${i * 0.05}s both` }}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <span className={`text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-lg border ${getCategoryPill(scheme.category)}`}>
                            {scheme.category}
                          </span>
                          {scheme.state && scheme.state !== "Central" && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100/80 px-2 py-1 rounded-md border border-slate-200 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{scheme.state}
                            </span>
                          )}
                        </div>
                        
                        <h4 className="font-extrabold text-slate-800 text-xl leading-tight mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">{scheme.name}</h4>
                        
                        {(scheme.benefit || scheme.description) && (
                          <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-2">
                            {scheme.benefit || scheme.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-5 pt-5 border-t border-slate-200/50 flex items-center justify-between">
                         <div className="flex flex-col">
                           {scheme.ministry && <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 line-clamp-1">{scheme.ministry}</span>}
                           {scheme.tags && scheme.tags.length > 0 && (
                             <div className="flex gap-2">
                               {scheme.tags.slice(0, 2).map((tag, idx) => (
                                 <span key={idx} className="text-[10px] bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-md font-semibold">{tag}</span>
                               ))}
                               {scheme.tags.length > 2 && <span className="text-[10px] text-slate-400 font-bold">+{scheme.tags.length - 2}</span>}
                             </div>
                           )}
                         </div>
                         <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors text-slate-400 shrink-0">
                           <ArrowUpRight className="h-5 w-5" />
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {hasMore && (
                <div className="flex justify-center mt-6 mb-4">
                  <Button onClick={loadMore} disabled={loading} className="bg-white hover:bg-slate-50 text-indigo-600 border border-slate-200 shadow-sm font-bold px-6 rounded-xl transition-all hover:-translate-y-0.5">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Load More Schemes
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: Premium Detail HUD */}
        {selected && (
          <div className="w-full max-w-full h-full flex flex-col bg-white/80 backdrop-blur-3xl border border-white shadow-2xl shadow-slate-300/60 rounded-[2rem] overflow-hidden animate-in zoom-in-95 duration-300">
            
            <div className={`h-1.5 w-full ${CATEGORY_DOT[selected.category] || "bg-slate-300"}`} />

            {/* HUD Header — compact */}
            <div className="px-6 py-4 border-b border-slate-100/80 bg-white/60 flex items-center gap-4 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)} className="h-9 w-9 bg-white hover:bg-slate-50 border border-slate-100 text-slate-600 rounded-full shadow-sm shrink-0 transition-transform hover:scale-105">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-md border ${getCategoryPill(selected.category)}`}>
                    {selected.category}
                  </span>
                  {selected.state && selected.state !== "Central" && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                      <MapPin className="w-3 h-3" /> {selected.state}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-snug line-clamp-2">{selected.name}</h2>
                {selected.ministry && (
                  <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5 font-semibold truncate">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> {selected.ministry}
                  </p>
                )}
              </div>
            </div>

            {/* HUD Body — single column, buttons at bottom */}
            <div className="px-10 py-8 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              <div className="space-y-8">

                {/* Benefits & Details — plain */}
                {(selected.benefit || selected.description) && (
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-indigo-500 mb-4 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Benefits & Details</p>
                    <p className="text-base text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                      {selected.benefit || selected.description}
                    </p>
                  </div>
                )}

                {/* Tags — plain */}
                {selected.tags && selected.tags.length > 0 && (
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.tags.map((tag, i) => (
                        <span key={i} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-600">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Eligibility */}
                {selected.eligibility && (
                  <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "linear-gradient(45deg, #1e293b 25%, transparent 25%, transparent 75%, #1e293b 75%, #1e293b), linear-gradient(45deg, #1e293b 25%, transparent 25%, transparent 75%, #1e293b 75%, #1e293b)", backgroundSize: "20px 20px", backgroundPosition: "0 0, 10px 10px" }} />
                    <div className="relative z-10">
                      <p className="text-[11px] font-black uppercase tracking-widest text-indigo-400 mb-4 flex items-center gap-2">Who is Eligible?</p>
                      <p className="text-base font-medium leading-relaxed whitespace-pre-wrap text-slate-200">{selected.eligibility}</p>
                    </div>
                  </div>
                )}

                {/* Documents */}
                {selected.documents && (
                  <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-slate-500" /> Required Documents</p>
                    <p className="text-base text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{selected.documents}</p>
                  </div>
                )}

                {/* Action Buttons — bottom row with divider */}
                <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-slate-100">
                  {(selected.apply_url || selected.portal_url) && (
                    <a
                      href={selected.apply_url || selected.portal_url}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 px-7 rounded-xl transition-transform hover:-translate-y-0.5 shadow-md shadow-indigo-500/20 text-sm"
                    >
                      Apply Online <ArrowUpRight className="w-4 h-4" />
                    </a>
                  )}
                  <a
                    href={`https://www.myscheme.gov.in/schemes/${selected.id}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-3.5 px-7 rounded-xl transition-colors shadow-sm text-sm"
                  >
                    View on myScheme <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  {selected.launched_year && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-400 font-bold ml-auto"><Clock className="w-3.5 h-3.5 text-indigo-400" /> Est. {selected.launched_year}</span>
                  )}
                  {selected.helpline && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-400 font-bold"><Phone className="w-3.5 h-3.5 text-indigo-400" /> {selected.helpline}</span>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Floating AI Chat Modal ── */}
      {chatOpen && (
        <div className="fixed bottom-6 right-6 w-[28rem] z-50 bg-white/90 backdrop-blur-2xl shadow-2xl shadow-slate-300/60 rounded-3xl overflow-hidden border border-white animate-in slide-in-from-bottom-8 duration-300">
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
            <span className="flex items-center gap-3 font-bold text-lg"><Bot className="w-5 h-5 text-indigo-400" /> Scheme Assistant</span>
            <button onClick={() => setChatOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="bg-slate-50/50">
            <ChatPanel module="schemes" />
          </div>
        </div>
      )}

      <EligibilityModal open={eligibilityOpen} onClose={() => setEligibilityOpen(false)} />

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
