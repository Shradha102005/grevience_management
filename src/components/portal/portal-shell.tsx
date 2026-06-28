import { useState, type ReactNode } from "react";
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
import { Logo } from "@/components/logo";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const roleLabel =
    user?.role === "admin" ? "Administrator"
      : user?.role === "officer" ? "Government Officer" : "Citizen";

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background font-sans text-foreground">
      {/* Top App Bar (Microsoft / ServiceNow Style) */}
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border bg-sidebar px-4 text-sidebar-foreground">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Grip className="h-5 w-5 text-sidebar-primary" />
            <span className="font-semibold text-sm tracking-wide">CIVICOS<span className="opacity-70">OS</span></span>
          </div>
        </div>

        <div className="mx-4 h-4 w-px bg-sidebar-border hidden lg:block" />

        {/* Global Breadcrumb / Workspace context */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-sidebar-foreground/70">
          <span>Enterprise Workspace</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-sidebar-foreground">{activeItem.label}</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="relative hidden w-64 lg:block">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sidebar-foreground/50" />
            <Input
              className="h-8 w-full border-sidebar-border bg-sidebar-accent/50 pl-8 text-xs text-sidebar-foreground placeholder:text-sidebar-foreground/50 focus-visible:ring-1 focus-visible:ring-sidebar-primary rounded-sm"
              placeholder="Search global directory (Ctrl+K)..."
            />
          </div>
          
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="relative h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 outline-none">
                <Avatar className="h-7 w-7 border-border rounded-sm">
                  <AvatarFallback className="bg-sidebar-primary text-primary-foreground text-[10px] font-medium rounded-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-sm">
              <DropdownMenuLabel className="py-2">
                <div className="text-sm font-semibold">{user?.name ?? "Guest"}</div>
                <div className="text-xs font-normal text-muted-foreground">{roleLabel}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="text-xs">
                <Link to="/portal/settings">Preferences</Link>
              </DropdownMenuItem>
              {user?.role === "admin" && (
                <DropdownMenuItem asChild className="text-xs">
                  <Link to="/portal/admin">System Admin</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()} className="text-xs text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (Expanded Navigation) */}
        <aside className="hidden w-64 flex-col border-r border-border bg-sidebar lg:flex py-4 overflow-y-auto">
          <div className="px-4 pb-2 text-xs font-semibold text-sidebar-foreground/70 tracking-wide">Workspace</div>
          <div className="flex w-full flex-col gap-1 px-2">
            {MODULES.map((item) => {
              const active = item.to === "/portal" ? pathname === "/portal" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" strokeWidth={active ? 2.5 : 2} />
                  {item.label}
                </Link>
              );
            })}
          </div>
          
          <div className="px-4 pt-6 pb-2 text-xs font-semibold text-sidebar-foreground/70 tracking-wide">Governance</div>
          <div className="flex w-full flex-col gap-1 px-2">
            {GOVERNANCE.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" strokeWidth={active ? 2.5 : 2} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Mobile sidebar overlay (unchanged logic but updated styles) */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-64 bg-background border-r border-border shadow-xl flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <span className="font-semibold text-sm">Modules</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                <div className="px-3 pb-2 text-xs font-semibold text-muted-foreground">Workspace</div>
                {MODULES.map(item => (
                  <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                    <item.icon className="h-4 w-4" /> {item.label}
                  </Link>
                ))}
                <div className="px-3 pt-4 pb-2 text-xs font-semibold text-muted-foreground">Governance</div>
                {GOVERNANCE.map(item => (
                  <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                    <item.icon className="h-4 w-4" /> {item.label}
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-muted/10 p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">
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
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary border border-primary/20">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
