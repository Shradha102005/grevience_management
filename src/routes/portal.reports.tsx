import { createFileRoute } from "@tanstack/react-router";
import { FileText, Download } from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/reports")({
  head: () => ({ meta: [{ title: "Reports — CIVICOS AI" }] }),
  component: Reports,
});

const REPORTS = [
  { name: "Monthly Grievance Summary", type: "Operations", date: "Jun 2026", size: "2.4 MB" },
  { name: "Scheme Enrollment Report", type: "Schemes", date: "Jun 2026", size: "1.8 MB" },
  { name: "Emergency Response Audit", type: "Disaster", date: "May 2026", size: "3.1 MB" },
  { name: "Department Performance Review", type: "Analytics", date: "May 2026", size: "4.2 MB" },
  { name: "Citizen Satisfaction Survey", type: "Citizens", date: "Q2 2026", size: "1.2 MB" },
  { name: "Voice Assistant Usage", type: "Operations", date: "Jun 2026", size: "980 KB" },
];

function Reports() {
  return (
    <div>
      <PageHeader
        icon={FileText}
        title="Reports"
        description="Generate, schedule and export governance reports."
        actions={
          <Button size="sm" onClick={() => toast.success("New report generation started.")}>
            Generate Report
          </Button>
        }
      />

      <Card className="shadow-card">
        <CardContent className="divide-y divide-border p-0">
          {REPORTS.map((r) => (
            <div key={r.name} className="flex items-center gap-4 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.date} · {r.size}
                </p>
              </div>
              <Badge variant="secondary">{r.type}</Badge>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Download ${r.name}`}
                onClick={() => toast.success(`Downloading ${r.name}`)}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
