import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  MessageSquareWarning,
  Landmark,
  Siren,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/portal/portal-shell";
import { StatCard } from "@/components/portal/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MODULES } from "@/lib/modules";

export const Route = createFileRoute("/portal/")({
  component: Dashboard,
});

const trend = [
  { m: "Jan", complaints: 820, resolved: 720 },
  { m: "Feb", complaints: 932, resolved: 860 },
  { m: "Mar", complaints: 1010, resolved: 940 },
  { m: "Apr", complaints: 1180, resolved: 1090 },
  { m: "May", complaints: 1290, resolved: 1210 },
  { m: "Jun", complaints: 1402, resolved: 1340 },
];

const byWard = [
  { ward: "Ward 1", v: 240 },
  { ward: "Ward 2", v: 188 },
  { ward: "Ward 3", v: 312 },
  { ward: "Ward 4", v: 156 },
  { ward: "Ward 5", v: 274 },
  { ward: "Ward 6", v: 198 },
];

const activity = [
  { id: "GRV-10293", text: "New grievance: Water leakage on MG Road", time: "2m ago", status: "Submitted" },
  { id: "SCH-4421", text: "PM-KISAN eligibility matched for 412 citizens", time: "18m ago", status: "Resolved" },
  { id: "EMG-0087", text: "Flood alert broadcast to Ward 3 (12,400 citizens)", time: "1h ago", status: "Active" },
  { id: "GRV-10288", text: "Street light complaint assigned to Officer R. Singh", time: "2h ago", status: "Assigned" },
];

const statusColor: Record<string, string> = {
  Submitted: "bg-secondary text-secondary-foreground",
  Resolved: "bg-success/15 text-success",
  Active: "bg-destructive/15 text-destructive",
  Assigned: "bg-accent/20 text-accent-foreground",
};

function Dashboard() {
  return (
    <div>
      <PageHeader
        title="Governance Dashboard"
        description="Real-time overview of citizen services across all modules."
        actions={
          <Button asChild size="sm">
            <Link to="/portal/analytics">View Analytics</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Citizens" value="2.4M" delta="+8.2% MoM" icon={Users} />
        <StatCard label="Open Grievances" value="1,402" delta="+3.1%" trend="down" icon={MessageSquareWarning} />
        <StatCard label="Schemes Matched" value="48,210" delta="+12.4%" icon={Landmark} />
        <StatCard label="Active Alerts" value="3" delta="2 critical" trend="down" icon={Siren} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle>Complaints vs Resolution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="c1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="c2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-3)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-chart-3)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="m" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    color: "var(--color-popover-foreground)",
                  }}
                />
                <Area type="monotone" dataKey="complaints" stroke="var(--color-chart-1)" fill="url(#c1)" strokeWidth={2} />
                <Area type="monotone" dataKey="resolved" stroke="var(--color-chart-3)" fill="url(#c2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Complaints by Ward</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byWard}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="ward" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)" }}
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    color: "var(--color-popover-foreground)",
                  }}
                />
                <Bar dataKey="v" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {activity.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                  {a.status === "Resolved" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.id} · {a.time}
                  </p>
                </div>
                <Badge className={statusColor[a.status]} variant="secondary">
                  {a.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {MODULES.slice(0, 6).map((m) => (
              <Link
                key={m.id}
                to={m.href}
                className="group rounded-xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-muted/50"
              >
                <m.icon className="h-5 w-5 text-primary" />
                <p className="mt-2 text-xs font-semibold leading-tight">{m.short}</p>
                <ArrowRight className="mt-1 h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
