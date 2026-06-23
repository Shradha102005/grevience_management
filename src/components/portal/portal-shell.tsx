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
  type LucideIcon,
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

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

const WORKSPACE: NavItem[] = [
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

function NavSection({
  title,
  items,
  pathname,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="px-3">
      <p className="px-3 pb-2 text-[0.68rem] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
        {title}
      </p>
      <nav className="space-y-1">
        {items.map((item) => {
          const active = item.to === "/portal" ? pathname === "/portal" : pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-[1.1rem] w-[1.1rem] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function SidebarBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 py-5">
      <div className="px-5">
        <Logo variant="light" />
      </div>
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
        <NavSection title="Workspace" items={WORKSPACE} pathname={pathname} onNavigate={onNavigate} />
        <NavSection title="Governance" items={GOVERNANCE} pathname={pathname} onNavigate={onNavigate} />
      </div>
      <div className="mx-3 rounded-xl bg-sidebar-accent/60 p-4">
        <p className="text-sm font-semibold text-sidebar-foreground">AI Assistant</p>
        <p className="mt-1 text-xs text-sidebar-foreground/60">
          Ask anything about citizens, schemes or complaints.
        </p>
      </div>
    </div>
  );
}

export function PortalShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  // Compute initials from user name (e.g. "Priya Sharma" → "PS")
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const roleLabel =
    user?.role === "admin"
      ? "Administrator"
      : user?.role === "officer"
        ? "Government Officer"
        : "Citizen";

  return (
    <div className="flex min-h-screen bg-muted/40">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarBody pathname={pathname} />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-sidebar">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-3 text-sidebar-foreground"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
            <SidebarBody pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 pl-9"
              placeholder="Search services, schemes, complaint IDs, citizens..."
            />
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 flex items-center gap-2 rounded-full p-0.5 outline-none">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-semibold">{user?.name ?? "Guest"}</div>
                  <div className="text-xs font-normal text-muted-foreground">{roleLabel}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/portal/settings">Settings</Link>
                </DropdownMenuItem>
                {user?.role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link to="/portal/admin">Admin Console</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary sm:grid">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-extrabold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
