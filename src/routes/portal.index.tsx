import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  MessageSquareWarning,
  Landmark,
  Siren,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  TrendingUp,
  AlertTriangle,
  FileText,
  Activity,
  Zap,
  MoreHorizontal
} from "lucide-react";
import Chart from "react-apexcharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/portal/portal-shell";

export const Route = createFileRoute("/portal/")({
  component: Dashboard,
});

const activeAlerts = [
  { id: "ALT-882", type: "Critical", location: "District 4, Flood Zone A", time: "10 min ago" },
  { id: "ALT-881", type: "Warning", location: "Sector 9, Power Grid", time: "45 min ago" },
  { id: "ALT-880", type: "Info", location: "State Highway 12, Traffic", time: "2 hrs ago" },
];

const pendingTasks = [
  { id: "TSK-001", task: "Review Agriculture Subsidies (Q3)", assign: "Dept. of Agri", status: "Pending" },
  { id: "TSK-002", task: "Approve Ward 4 Budget", assign: "Municipal Council", status: "Urgent" },
  { id: "TSK-003", task: "Dispatch Disaster Relief Team", assign: "Emergency Ops", status: "In Progress" },
  { id: "TSK-004", task: "Audit Scheme Beneficiaries", assign: "Social Welfare", status: "Pending" },
];

const departmentHealth = [
  { name: "Agriculture", score: 94, trend: "+2.1%" },
  { name: "Municipal", score: 82, trend: "-1.4%" },
  { name: "Health & Welfare", score: 88, trend: "+0.5%" },
  { name: "Infrastructure", score: 76, trend: "-3.2%" },
  { name: "Emergency Response", score: 98, trend: "+1.1%" },
];

function Dashboard() {
  const heatmapOptions: ApexCharts.ApexOptions = {
    chart: { type: "heatmap", toolbar: { show: false }, fontFamily: "Inter, sans-serif" },
    dataLabels: { enabled: false },
    colors: ["#2563EB"],
    xaxis: { categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], labels: { style: { colors: "#64748B", fontSize: "10px" } } },
    yaxis: { labels: { style: { colors: "#64748B", fontSize: "10px" } } },
    plotOptions: { heatmap: { shadeIntensity: 0.5, radius: 2, useFillColorAsStroke: false } }
  };
  const heatmapSeries = [
    { name: "Morning", data: [20, 30, 40, 80, 20, 10, 5] },
    { name: "Afternoon", data: [40, 60, 80, 90, 50, 20, 10] },
    { name: "Evening", data: [30, 40, 50, 60, 40, 30, 20] },
  ];

  const trendOptions: ApexCharts.ApexOptions = {
    chart: { type: "area", sparkline: { enabled: true } },
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.2, opacityTo: 0 } },
    colors: ["#2563EB"],
  };
  const trendSeries = [{ data: [12, 14, 15, 14, 18, 22, 24, 28] }];

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Operations Command Center" 
        description="Enterprise overview of state-wide telemetry, department health, and citizen requests."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs"><FileText className="mr-2 h-3 w-3" /> Generate Report</Button>
            <Button size="sm" className="h-8 text-xs"><Zap className="mr-2 h-3 w-3" /> Action Center</Button>
          </div>
        }
      />

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Citizen Requests", value: "142,392", trend: "+12.5%", color: "text-blue-600", bg: "bg-blue-600/10" },
          { title: "Pending Tasks", value: "3,842", trend: "-4.2%", color: "text-orange-600", bg: "bg-orange-600/10" },
          { title: "Service Uptime", value: "99.98%", trend: "+0.01%", color: "text-green-600", bg: "bg-green-600/10" },
          { title: "Active AI Insights", value: "48", trend: "+12", color: "text-purple-600", bg: "bg-purple-600/10" },
        ].map((stat, i) => (
          <Card key={i} className="shadow-none rounded-md border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{stat.title}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold tracking-tight">{stat.value}</h3>
                  <span className={`text-[10px] font-semibold ${stat.trend.startsWith('+') ? 'text-success' : 'text-destructive'}`}>
                    {stat.trend}
                  </span>
                </div>
              </div>
              <div className={`h-10 w-10 rounded-sm flex items-center justify-center ${stat.bg} ${stat.color}`}>
                <Activity className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Map & Heatmap */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-none rounded-md border-border">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between border-b border-border/50">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Regional Service Heatmap</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px]">Live Updates</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[240px] w-full p-4">
                <Chart options={heatmapOptions} series={heatmapSeries} type="heatmap" height="100%" width="100%" />
              </div>
              <div className="grid grid-cols-3 border-t border-border/50 divide-x divide-border/50 text-center">
                <div className="p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">High Traffic</p>
                  <p className="text-sm font-bold mt-1">Zone North</p>
                </div>
                <div className="p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Anomalies</p>
                  <p className="text-sm font-bold mt-1 text-destructive">2 Detected</p>
                </div>
                <div className="p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Resolution Rate</p>
                  <p className="text-sm font-bold mt-1 text-success">94.2%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none rounded-md border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/50">
              <CardTitle className="text-sm font-semibold">Department Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {departmentHealth.map((dept, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-32 text-xs font-medium truncate">{dept.name}</div>
                  <div className="flex-1">
                    <Progress value={dept.score} className="h-2" />
                  </div>
                  <div className="w-12 text-right text-xs font-bold">{dept.score}%</div>
                  <div className={`w-12 text-right text-[10px] font-semibold ${dept.trend.startsWith('+') ? 'text-success' : 'text-destructive'}`}>
                    {dept.trend}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Alerts & Tasks */}
        <div className="space-y-4">
          <Card className="shadow-none rounded-md border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/50 bg-destructive/5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" /> Active Critical Alerts</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border/50">
              {activeAlerts.map(alert => (
                <div key={alert.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <Badge variant={alert.type === "Critical" ? "destructive" : "secondary"} className="text-[10px] rounded-sm h-4 px-1">{alert.type}</Badge>
                    <span className="text-[10px] text-muted-foreground">{alert.time}</span>
                  </div>
                  <p className="text-xs font-semibold">{alert.location}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">ID: {alert.id}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-none rounded-md border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/50 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Pending Executive Tasks</CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border/50">
              {pendingTasks.map(task => (
                <div key={task.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <p className="text-xs font-semibold mb-1">{task.task}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {task.assign}</span>
                    <Badge variant="outline" className={`text-[9px] rounded-sm h-4 px-1 ${task.status === 'Urgent' ? 'border-destructive text-destructive' : ''}`}>{task.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
