import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/settings")({
  head: () => ({ meta: [{ title: "Settings — CIVICOS AI" }] }),
  component: SettingsPage,
});

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function SettingsPage() {
  const { theme, toggle } = useTheme();
  return (
    <div>
      <PageHeader icon={SettingsIcon} title="Settings" description="Manage your profile and preferences." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" defaultValue="Anita Kumar" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="anita.kumar@gov.in" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" defaultValue="Super Admin" disabled />
            </div>
            <Button onClick={() => toast.success("Profile updated.")}>Save changes</Button>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Row title="Dark mode" desc="Use the dark color theme">
              <Switch checked={theme === "dark"} onCheckedChange={toggle} />
            </Row>
            <Row title="Email notifications" desc="Receive grievance and alert updates">
              <Switch defaultChecked />
            </Row>
            <Row title="Voice alerts" desc="Enable voice notifications for emergencies">
              <Switch defaultChecked />
            </Row>
            <Row title="Multilingual interface" desc="Auto-detect citizen language">
              <Switch defaultChecked />
            </Row>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
