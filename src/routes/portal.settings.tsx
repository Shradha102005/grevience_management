import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  User, Shield, Bell, Palette, Building, CreditCard, Key, 
  MonitorSmartphone, Save, Laptop, Moon, Sun, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/portal/settings")({
  component: Settings,
});

const SETTING_SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "account", label: "Account Security", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "team", label: "Workspace & Team", icon: Building },
  { id: "api", label: "API Keys", icon: Key },
];

function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState("profile");
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Settings updated successfully");
    }, 600);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-background">
      <div className="px-8 py-5 border-b border-border/50 shrink-0 bg-card">
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account settings and preferences.</p>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 shrink-0 border-r border-border/50 bg-muted/10 flex flex-col p-4 space-y-1">
          {SETTING_SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2 px-3 py-2 w-full text-left text-sm transition-colors rounded-sm ${activeSection === s.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
            >
              <s.icon className="h-4 w-4" />
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8 max-w-3xl">
          {activeSection === "profile" && (
            <div className="space-y-8 animate-in fade-in">
              <div>
                <h2 className="text-lg font-bold mb-1">Profile Information</h2>
                <p className="text-sm text-muted-foreground">Update your personal details and public profile.</p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">First Name</Label>
                    <Input className="h-9 shadow-none rounded-sm border-border bg-card" defaultValue="Anita" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Last Name</Label>
                    <Input className="h-9 shadow-none rounded-sm border-border bg-card" defaultValue="Kumar" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">Email Address</Label>
                  <Input className="h-9 shadow-none rounded-sm border-border bg-card" defaultValue={user?.email || "anita.kumar@gov.in"} disabled />
                  <p className="text-[10px] text-muted-foreground">To change your email address, please contact IT support.</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">Department</Label>
                  <Select defaultValue="municipal">
                    <SelectTrigger className="h-9 shadow-none rounded-sm border-border bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="municipal">Municipal Administration</SelectItem>
                      <SelectItem value="agriculture">Agriculture</SelectItem>
                      <SelectItem value="police">Law Enforcement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50">
                 <Button onClick={handleSave} disabled={saving} className="h-8 rounded-sm text-xs shadow-none">
                   {saving ? "Saving..." : <><Save className="h-3.5 w-3.5 mr-2" /> Save Changes</>}
                 </Button>
              </div>
            </div>
          )}

          {activeSection === "appearance" && (
            <div className="space-y-8 animate-in fade-in">
              <div>
                <h2 className="text-lg font-bold mb-1">Appearance</h2>
                <p className="text-sm text-muted-foreground">Customize how the application looks on your device.</p>
              </div>

              <div className="space-y-4">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Theme Preference</Label>
                <div className="grid grid-cols-3 gap-4">
                  <button onClick={() => setTheme("light")} className={`flex flex-col items-center gap-3 p-4 border rounded-sm transition-colors ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'}`}>
                     <Sun className={`h-6 w-6 ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
                     <span className="text-sm font-medium">Light</span>
                  </button>
                  <button onClick={() => setTheme("dark")} className={`flex flex-col items-center gap-3 p-4 border rounded-sm transition-colors ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'}`}>
                     <Moon className={`h-6 w-6 ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
                     <span className="text-sm font-medium">Dark</span>
                  </button>
                  <button onClick={() => setTheme("system")} className={`flex flex-col items-center gap-3 p-4 border rounded-sm transition-colors ${theme === 'system' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'}`}>
                     <Laptop className={`h-6 w-6 ${theme === 'system' ? 'text-primary' : 'text-muted-foreground'}`} />
                     <span className="text-sm font-medium">System</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border/50">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Density</Label>
                <div className="flex items-center justify-between p-3 border border-border/50 rounded-sm bg-card">
                  <div>
                    <p className="text-sm font-medium">Compact Mode</p>
                    <p className="text-xs text-muted-foreground">Reduce padding and margin to show more data.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="space-y-8 animate-in fade-in">
              <div>
                <h2 className="text-lg font-bold mb-1">Notification Preferences</h2>
                <p className="text-sm text-muted-foreground">Control what alerts you receive and where.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border border-border/50 rounded-sm bg-card">
                  <div>
                    <p className="text-sm font-medium">High Priority Grievances</p>
                    <p className="text-xs text-muted-foreground">Receive immediate push notifications.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 border border-border/50 rounded-sm bg-card">
                  <div>
                    <p className="text-sm font-medium">Daily Summary Email</p>
                    <p className="text-xs text-muted-foreground">A roll-up of activity sent at 8:00 AM.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 border border-border/50 rounded-sm bg-card">
                  <div>
                    <p className="text-sm font-medium">New System Broadcasts</p>
                    <p className="text-xs text-muted-foreground">Announcements from the admin team.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          )}

          {/* Fallback for others */}
          {!["profile", "appearance", "notifications"].includes(activeSection) && (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
               <Shield className="h-8 w-8 mb-4 opacity-20" />
               <p className="text-sm">This section is restricted by your organization administrator.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
