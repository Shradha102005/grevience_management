import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { FeatureGrid } from "@/components/portal/feature-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/portal/admin")({
  head: () => ({ meta: [{ title: "Admin Console — CivicSaathi" }] }),
  component: Admin,
});

const ROLES = [
  { role: "Super Admin", users: 4, scope: "Full platform access" },
  { role: "Department Officer", users: 86, scope: "Department-level operations" },
  { role: "Municipal Officer", users: 142, scope: "Complaints & services" },
  { role: "Scheme Officer", users: 38, scope: "Scheme management" },
  { role: "Emergency Officer", users: 21, scope: "Broadcast & alerts" },
  { role: "Analytics Manager", users: 12, scope: "Reports & insights" },
];

const FEATURES = [
  "User Management",
  "Citizen Management",
  "Complaint Management",
  "Scheme Management",
  "Voice Bot Configuration",
  "Campaign Management",
  "Emergency Broadcast Controls",
  "Audit Logs",
];

function Admin() {
  return (
    <div>
      <PageHeader
        icon={ShieldCheck}
        title="Admin Console"
        description="Role-based access control and platform-wide management."
      />

      <Card className="mb-8 shadow-card">
        <CardHeader>
          <CardTitle>Roles & Access</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r) => (
            <div key={r.role} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{r.role}</h3>
                <Badge variant="secondary">{r.users}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{r.scope}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <h2 className="mb-4 font-display text-base font-bold">Management Tools</h2>
      <FeatureGrid features={FEATURES} />
    </div>
  );
}
