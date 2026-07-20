import { useState, useEffect, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  ShieldCheck,
  Grip,
  X,
  MessageSquareWarning,
  Leaf,
  Building2,
  Sparkles,
  Siren,
  Sprout,
  Mic,
  PhoneCall,
  Megaphone,
  type LucideIcon,
  BarChart3,
  Users,
  FileText
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  color: string;
}

const MODULES: NavItem[] = [
  { label: "Grievances", to: "/portal/grievances", icon: MessageSquareWarning, color: "from-indigo-400 to-indigo-600 shadow-indigo-500/40" },
  { label: "Agriculture", to: "/portal/agriculture", icon: Leaf, color: "from-emerald-400 to-emerald-600 shadow-emerald-500/40" },
  { label: "Smart City", to: "/portal/smart-city", icon: Building2, color: "from-blue-400 to-blue-600 shadow-blue-500/40" },
  { label: "Scheme AI", to: "/portal/scheme-ai", icon: Sparkles, color: "from-purple-400 to-purple-600 shadow-purple-500/40" },
  { label: "Disaster Alerts", to: "/portal/disaster", icon: Siren, color: "from-rose-400 to-rose-600 shadow-rose-500/40" },
  { label: "Rural Dev", to: "/portal/rural", icon: Sprout, color: "from-orange-400 to-orange-600 shadow-orange-500/40" },
  { label: "Municipal", to: "/portal/municipal", icon: Building2, color: "from-sky-400 to-sky-600 shadow-sky-500/40" },
  { label: "Voice Assistant", to: "/portal/voice", icon: Mic, color: "from-violet-400 to-violet-600 shadow-violet-500/40" },
  { label: "Helpline", to: "/portal/helpline", icon: PhoneCall, color: "from-teal-400 to-teal-600 shadow-teal-500/40" },
  { label: "Campaigns", to: "/portal/election", icon: Megaphone, color: "from-pink-400 to-pink-600 shadow-pink-500/40" },
];

const GOVERNANCE: NavItem[] = [
  { label: "Admin Console", to: "/portal/admin", icon: ShieldCheck, color: "bg-slate-700" },
  { label: "Analytics", to: "/portal/analytics", icon: BarChart3, color: "bg-indigo-600" },
  { label: "Citizen Directory", to: "/portal/citizens", icon: Users, color: "bg-blue-600" },
  { label: "Reports", to: "/portal/reports", icon: FileText, color: "bg-teal-600" },
  { label: "Settings", to: "/portal/settings", icon: Settings, color: "bg-slate-600" },
];

export function PortalShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [launchpadOpen, setLaunchpadOpen] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLaunchpadOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const roleLabel =
    user?.role === "admin" ? "Administrator"
      : user?.role === "officer" ? "Government Officer" : "Citizen";

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#FAFBFF] dark:bg-[#0B0F19] font-sans text-slate-900 dark:text-slate-50 relative">
      
      {/* ── Global Ambient Mesh Background ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-400/20 dark:bg-indigo-900/30 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-purple-400/15 dark:bg-purple-900/20 blur-[100px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] rounded-full bg-sky-300/20 dark:bg-sky-900/20 blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
        <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[60px]" />
      </div>

      {/* Top App Bar (Mockup Style) */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/60 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-3xl px-6 z-30 sticky top-0 shadow-sm shadow-slate-200/20">
        
        {/* Left: App Grid & Logo */}
        <div className="flex items-center gap-4">
          <button 
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white/80 dark:hover:bg-white/10 rounded-xl transition-all shadow-sm border border-transparent hover:border-white/60"
            onClick={() => setLaunchpadOpen(true)}
          >
            <Grip className="h-5 w-5" />
          </button>
          <Logo variant="dark" /> 
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-xl mx-auto hidden md:block">
          <div className="relative flex items-center h-10 w-full rounded-full border border-white/60 dark:border-white/10 bg-white/50 dark:bg-black/50 px-4 shadow-inner shadow-slate-200/50 dark:shadow-none focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-300 transition-all focus-within:bg-white/80 backdrop-blur-md">
            <Search className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
            <input
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none font-medium"
              placeholder="Search services, schemes, or ask AI..."
            />
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-slate-200/60 dark:border-white/10 bg-white/60 dark:bg-white/5 px-1.5 font-sans text-[10px] font-bold text-slate-400 shadow-sm">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: Notifications & Profile */}
        <div className="flex items-center gap-4">
          
          <button className="relative p-2 text-slate-500 hover:text-indigo-600 hover:bg-white/80 dark:hover:bg-white/10 rounded-xl transition-all shadow-sm border border-transparent hover:border-white/60">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white ring-2 ring-white dark:ring-black shadow-sm shadow-rose-500/40">3</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 outline-none hover:bg-white/80 dark:hover:bg-white/5 px-2 py-1 rounded-full transition-all border border-transparent hover:border-white/60 shadow-sm hover:shadow-md">
                <Avatar className="h-8 w-8 shadow-sm border-2 border-white">
                  <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? 'User')}&background=random`} />
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-bold">
                    {mounted ? (user?.name?.[0]?.toUpperCase() ?? "?") : "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 hidden sm:block">
                  Hello, {user?.name ?? "User"}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl border-white/60 dark:border-slate-800 shadow-2xl shadow-slate-300/50 bg-white/90 backdrop-blur-xl dark:bg-[#1A1F2E] p-2">
              <DropdownMenuLabel className="py-2 px-3">
                <div className="text-sm font-bold text-slate-900 dark:text-white">{user?.name ?? "User"}</div>
                <div className="text-sm font-semibold text-slate-500 mt-0.5">{roleLabel}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
              <DropdownMenuItem asChild className="text-sm font-semibold cursor-pointer rounded-xl py-2 px-3 focus:bg-slate-50 dark:focus:bg-white/5 transition-colors">
                <Link to="/portal/settings"><Settings className="mr-2 h-4 w-4" /> Preferences</Link>
              </DropdownMenuItem>
              {user?.role === "admin" && (
                <DropdownMenuItem asChild className="text-sm font-semibold cursor-pointer rounded-xl py-2 px-3 focus:bg-slate-50 dark:focus:bg-white/5 transition-colors">
                  <Link to="/portal/admin"><ShieldCheck className="mr-2 h-4 w-4" /> System Admin</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
              <DropdownMenuItem onClick={() => logout()} className="text-sm font-bold text-rose-600 focus:text-rose-700 focus:bg-rose-50 dark:focus:bg-rose-500/10 cursor-pointer rounded-xl py-2 px-3 transition-colors">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mac-style Launchpad Overlay */}
      {launchpadOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center pt-24 pb-12 px-6 bg-white/70 dark:bg-[#0B0F19]/80 backdrop-blur-[40px] animate-in fade-in zoom-in-95 duration-200 overflow-y-auto">
          
          {/* Ambient Glowing Orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-400/20 rounded-full blur-[100px] pointer-events-none" />

          <button 
            className="absolute top-8 right-8 h-12 w-12 flex items-center justify-center rounded-full bg-slate-100/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-slate-500 transition-colors z-10 shadow-sm border border-white/50"
            onClick={() => setLaunchpadOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>

          <div className="w-full max-w-5xl mx-auto space-y-12 relative z-10">
            {/* Search & Greeting */}
            <div className="text-center space-y-8 mb-16">
              <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Where do you want to go?</h2>
              <div className="max-w-xl mx-auto relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
                <div className="relative flex items-center h-14 w-full rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/60 dark:border-white/10 px-6 shadow-xl transition-all group-hover:shadow-2xl">
                  <Search className="h-5 w-5 text-slate-400 shrink-0 mr-3" />
                  <input
                    className="flex-1 bg-transparent border-none focus:ring-0 text-lg text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none font-medium"
                    placeholder="Search modules..."
                    autoFocus
                  />
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-center text-sm font-bold tracking-widest text-slate-400 uppercase">Workspace Modules</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-6 gap-y-12">
                {MODULES.map((item) => (
                  <Link 
                    key={item.to} 
                    to={item.to} 
                    onClick={() => setLaunchpadOpen(false)}
                    className="flex flex-col items-center gap-4 group"
                  >
                    <div className={cn(
                      "h-24 w-24 rounded-[2.25rem] flex items-center justify-center text-white shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-2 bg-gradient-to-br border border-white/20 dark:border-white/10",
                      item.color
                    )}>
                      <item.icon className="h-10 w-10 drop-shadow-md" strokeWidth={1.5} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 text-center transition-colors group-hover:text-indigo-600">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area - Full Width */}
      <main className="flex-1 overflow-y-auto relative w-full flex flex-col z-10">
        {children}
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  icon: Icon,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200/60 dark:border-white/10 pb-4">
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>
          {description && (
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
