import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Users, Search } from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { StatCard } from "@/components/portal/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/portal/citizens")({
  head: () => ({ meta: [{ title: "Citizen Directory — CIVICOS AI" }] }),
  component: Citizens,
});

const CITIZENS = [
  { name: "Ravi Sharma", id: "CIT-88210", ward: "Ward 3", schemes: 3, status: "Verified" },
  { name: "Meera Patel", id: "CIT-88211", ward: "Ward 1", schemes: 1, status: "Verified" },
  { name: "Arjun Nair", id: "CIT-88212", ward: "Ward 5", schemes: 2, status: "Pending" },
  { name: "Sana Khan", id: "CIT-88213", ward: "Ward 2", schemes: 4, status: "Verified" },
  { name: "Vikram Rao", id: "CIT-88214", ward: "Ward 4", schemes: 0, status: "Pending" },
  { name: "Priya Das", id: "CIT-88215", ward: "Ward 6", schemes: 2, status: "Verified" },
];

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2);
}

function Citizens() {
  const [q, setQ] = useState("");
  const rows = CITIZENS.filter(
    (c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.id.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Citizen Directory"
        description="Unified registry of citizens, verification status and scheme enrollment."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Registered Citizens" value="2.4M" delta="+8.2%" />
        <StatCard label="Verified" value="2.1M" delta="87.5%" />
        <StatCard label="Pending Verification" value="312K" delta="-4%" />
      </div>

      <Card className="shadow-card">
        <div className="border-b border-border p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 pl-9"
              placeholder="Search citizens..."
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Citizen</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Ward</TableHead>
                <TableHead>Schemes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id} className="cursor-pointer">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-secondary text-xs text-primary">
                          {initials(c.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{c.id}</TableCell>
                  <TableCell className="text-muted-foreground">{c.ward}</TableCell>
                  <TableCell>{c.schemes}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        c.status === "Verified"
                          ? "bg-success/15 text-success"
                          : "bg-warning/20 text-warning-foreground"
                      }
                      variant="secondary"
                    >
                      {c.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
