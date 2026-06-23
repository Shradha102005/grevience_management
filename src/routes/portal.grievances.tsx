import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MessageSquareWarning, Search } from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { StatCard } from "@/components/portal/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/portal/grievances")({
  head: () => ({ meta: [{ title: "Grievances — CIVICOS AI" }] }),
  component: Grievances,
});

const ROWS = [
  { id: "GRV-10293", citizen: "Ravi Sharma", subject: "Water leakage on MG Road", dept: "Water Board", priority: "High", status: "Submitted", date: "Jun 17" },
  { id: "GRV-10288", citizen: "Meera Patel", subject: "Street light outage", dept: "Electrical", priority: "Medium", status: "Assigned", date: "Jun 16" },
  { id: "GRV-10271", citizen: "Arjun Nair", subject: "Garbage not collected", dept: "Sanitation", priority: "Low", status: "In Progress", date: "Jun 15" },
  { id: "GRV-10260", citizen: "Sana Khan", subject: "Pothole near school", dept: "Public Works", priority: "High", status: "Resolved", date: "Jun 14" },
  { id: "GRV-10255", citizen: "Vikram Rao", subject: "Drainage overflow", dept: "Public Works", priority: "High", status: "Under Review", date: "Jun 13" },
  { id: "GRV-10241", citizen: "Priya Das", subject: "Traffic signal fault", dept: "Traffic", priority: "Medium", status: "Closed", date: "Jun 12" },
];

const statusColor: Record<string, string> = {
  Submitted: "bg-secondary text-secondary-foreground",
  "Under Review": "bg-accent/20 text-accent-foreground",
  Assigned: "bg-chart-2/15 text-chart-2",
  "In Progress": "bg-warning/20 text-warning-foreground",
  Resolved: "bg-success/15 text-success",
  Closed: "bg-muted text-muted-foreground",
};
const prioColor: Record<string, string> = {
  High: "bg-destructive/15 text-destructive",
  Medium: "bg-warning/20 text-warning-foreground",
  Low: "bg-muted text-muted-foreground",
};

function Grievances() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const rows = ROWS.filter(
    (r) =>
      (status === "all" || r.status === status) &&
      (q === "" ||
        r.subject.toLowerCase().includes(q.toLowerCase()) ||
        r.citizen.toLowerCase().includes(q.toLowerCase()) ||
        r.id.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div>
      <PageHeader
        icon={MessageSquareWarning}
        title="Grievances"
        description="Track, route and resolve citizen complaints across departments."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Grievances" value="12,840" delta="+5.2%" />
        <StatCard label="Resolved" value="9,612" delta="74.8% rate" />
        <StatCard label="Avg. Response" value="6.2h" delta="-12%" />
        <StatCard label="Escalated" value="148" delta="+3" trend="down" />
      </div>

      <Card className="shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 pl-9"
              placeholder="Search by ID, citizen or subject..."
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.keys(statusColor).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Citizen</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer">
                  <TableCell className="font-mono text-xs">{r.id}</TableCell>
                  <TableCell className="font-medium">{r.citizen}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{r.subject}</TableCell>
                  <TableCell className="text-muted-foreground">{r.dept}</TableCell>
                  <TableCell>
                    <Badge className={prioColor[r.priority]} variant="secondary">
                      {r.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColor[r.status]} variant="secondary">
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
