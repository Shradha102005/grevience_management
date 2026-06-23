import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Sparkles } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/portal/portal-shell";
import { StatCard } from "@/components/portal/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/portal/analytics")({
  head: () => ({ meta: [{ title: "Analytics Center — CIVICOS AI" }] }),
  component: Analytics,
});

const usage = [
  { m: "Jan", schemes: 3200, voice: 1800 },
  { m: "Feb", schemes: 3800, voice: 2200 },
  { m: "Mar", schemes: 4100, voice: 2600 },
  { m: "Apr", schemes: 4700, voice: 3100 },
  { m: "May", schemes: 5200, voice: 3600 },
  { m: "Jun", schemes: 5900, voice: 4200 },
];

const satisfaction = [
  { m: "Jan", v: 78 },
  { m: "Feb", v: 80 },
  { m: "Mar", v: 82 },
  { m: "Apr", v: 85 },
  { m: "May", v: 86 },
  { m: "Jun", v: 89 },
];

function Analytics() {
  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="Analytics Center"
        description="Enterprise KPIs, citizen metrics and AI-powered predictive insights."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Citizen Metrics" value="2.4M" delta="+8.2%" />
        <StatCard label="Scheme Usage" value="48.2K" delta="+12.4%" />
        <StatCard label="Avg. Response Time" value="6.2h" delta="-12%" />
        <StatCard label="Satisfaction" value="89%" delta="+3pt" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Module Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={usage}>
                <defs>
                  <linearGradient id="a1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="a2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="m" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="schemes" stroke="var(--color-chart-1)" fill="url(#a1)" strokeWidth={2} />
                <Area type="monotone" dataKey="voice" stroke="var(--color-chart-2)" fill="url(#a2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Citizen Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={satisfaction}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="m" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={[60, 100]} stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="v" stroke="var(--color-chart-3)" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 shadow-card">
        <CardHeader className="flex-row items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <CardTitle>AI Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Grievance volume in Ward 3 is projected to rise 18% next month — pre-allocate staff.</p>
          <p>• Voice assistant adoption grew 33% QoQ, led by Hindi and Telugu speakers.</p>
          <p>• PM-KISAN enrollment gaps detected in 12 rural blocks — targeted outreach recommended.</p>
        </CardContent>
      </Card>
    </div>
  );
}
