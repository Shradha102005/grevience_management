import { useState, useEffect, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  MessageSquareWarning,
  Landmark,
  Building2,
  Mic,
  Siren,
  ShieldCheck,
  BarChart3,
  Users,
  FileText,
  Settings,
  Search,
  Bell,
  Menu,
  X,
  LogOut,
  Megaphone,
  PhoneCall,
  Sprout,
  Leaf,
  HelpCircle,
  type LucideIcon,
  ChevronRight,
  Grip,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

const MODULES: NavItem[] = [
  { label: "Dashboard", to: "/portal", icon: LayoutDashboard },
  { label: "Grievances", to: "/portal/grievances", icon: MessageSquareWarning },
  { label: "Scheme AI", to: "/portal/scheme-ai", icon: Landmark },
  { label: "Municipal", to: "/portal/municipal", icon: Building2 },
  { label: "Voice Assistant", to: "/portal/voice", icon: Mic },
  { label: "Public Helpline", to: "/portal/helpline", icon: PhoneCall },
  { label: "Smart City", to: "/portal/smart-city", icon: Building2 },
  { label: "Rural Dev", to: "/portal/rural", icon: Sprout },
  { label: "Agriculture", to: "/portal/agriculture", icon: Leaf },
  { label: "Disaster Alerts", to: "/portal/disaster", icon: Siren },
  { label: "Campaigns", to: "/portal/election", icon: Megaphone },
];

const GOVERNANCE: NavItem[] = [
  { label: "Admin Console", to: "/portal/admin", icon: ShieldCheck },
  { label: "Analytics", to: "/portal/analytics", icon: BarChart3 },
  { label: "Citizen Directory", to: "/portal/citizens", icon: Users },
  { label: "Reports", to: "/portal/reports", icon: FileText },
  { label: "Settings", to: "/portal/settings", icon: Settings },
];

export function PortalShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  
  const allNavItems = [...MODULES, ...GOVERNANCE];
  const activeItem = allNavItems.find(item => item.to === "/portal" ? pathname === "/portal" : pathname.startsWith(item.to)) || { label: "Portal Workspace" };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const roleLabel =
    user?.role === "admin" ? "Administrator"
      : user?.role === "officer" ? "Government Officer" : "Citizen";

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50 font-sans text-slate-900">
      
      {/* Top App Bar (Light Theme Premium) */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6 shadow-sm z-30">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Grip className="h-4 w-4 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900">CIVICOS<span className="text-indigo-600">OS</span></span>
          </Link>
        </div>

        <div className="mx-6 h-5 w-px bg-slate-200 hidden lg:block" />

        {/* Global Breadcrumb */}
        <div className="hidden lg:flex items-center gap-2 text-sm font-bold text-slate-400">
          <span>Enterprise Workspace</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-slate-800">{activeItem.label}</span>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="relative hidden w-72 lg:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-9 w-full border-slate-200 bg-slate-50 pl-9 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-500/20 rounded-xl transition-all"
              placeholder="Search global directory (Ctrl+K)..."
            />
          </div>
          
          <div className="flex items-center gap-1 border-l border-slate-200 pl-4">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 outline-none ml-2">
                <Avatar className="h-9 w-9 border-2 border-white shadow-sm rounded-xl">
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl">
                    {mounted ? initials : "?"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl border-slate-100 shadow-xl bg-white/90 backdrop-blur-xl">
              <DropdownMenuLabel className="py-3 px-4 bg-slate-50/50">
                <div className="text-sm font-bold text-slate-900">{user?.name ?? "Guest"}</div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">{roleLabel}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem asChild className="text-sm font-semibold cursor-pointer">
                <Link to="/portal/settings">Preferences</Link>
              </DropdownMenuItem>
              {user?.role === "admin" && (
                <DropdownMenuItem asChild className="text-sm font-semibold cursor-pointer">
                  <Link to="/portal/admin">System Admin</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem onClick={() => logout()} className="text-sm font-bold text-rose-600 focus:text-rose-700 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (Premium Light Theme) */}
        <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex py-6 overflow-y-auto shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
          <div className="px-6 pb-3 text-[11px] font-black uppercase tracking-widest text-slate-400">Workspace</div>
          <div className="flex w-full flex-col gap-1 px-3">
            {MODULES.map((item) => {
              const active = item.to === "/portal" ? pathname === "/portal" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                    active
                      ? "bg-indigo-50 text-indigo-700 font-bold shadow-sm border border-indigo-100/50"
                      : "text-slate-600 font-semibold hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.5 : 2} />
                  {item.label}
                </Link>
              );
            })}
          </div>
          
          <div className="px-6 pt-8 pb-3 text-[11px] font-black uppercase tracking-widest text-slate-400">Governance</div>
          <div className="flex w-full flex-col gap-1 px-3">
            {GOVERNANCE.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                    active
                      ? "bg-indigo-50 text-indigo-700 font-bold shadow-sm border border-indigo-100/50"
                      : "text-slate-600 font-semibold hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.5 : 2} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 bg-white border-r border-slate-200 shadow-2xl flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <Link to="/" onClick={() => setMobileOpen(false)} className="hover:opacity-80 transition-opacity">
                  <span className="font-extrabold text-lg tracking-tight text-slate-900">CIVICOS<span className="text-indigo-600">OS</span></span>
                </Link>
                <Button variant="ghost" size="icon" className="h-9 w-9 bg-slate-50 rounded-xl" onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto py-4">
                <div className="px-6 pb-3 text-[11px] font-black uppercase tracking-widest text-slate-400">Workspace</div>
                <div className="flex flex-col gap-1 px-3">
                  {MODULES.map(item => (
                    <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl">
                      <item.icon className="h-5 w-5" /> {item.label}
                    </Link>
                  ))}
                </div>
                <div className="px-6 pt-6 pb-3 text-[11px] font-black uppercase tracking-widest text-slate-400">Governance</div>
                <div className="flex flex-col gap-1 px-3">
                  {GOVERNANCE.map(item => (
                    <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl">
                      <item.icon className="h-5 w-5" /> {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-100/50 p-6 lg:p-8 relative">
          <div className="mx-auto w-full max-w-[1600px] h-full">
            {children}
          </div>
        </main>
      </div>
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
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-4">
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
          {description && <p className="text-sm font-semibold text-slate-500 mt-1">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
