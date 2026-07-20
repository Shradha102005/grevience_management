import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  User, Shield, Bell, Palette, Building, CreditCard, Key, 
  MonitorSmartphone, Save, CheckCircle2, ChevronRight, Settings as SettingsIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api";

export const Route = createFileRoute("/portal/settings")({
  component: Settings,
});

const SETTING_SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "workspace", label: "Workspace & Team", icon: Building },
];

function Settings() {
  const { user } = useAuth();

  const [activeSection, setActiveSection] = useState("profile");
  const [saving, setSaving] = useState(false);

  const firstName = user?.name?.split(" ")[0] || "";
  const lastName = user?.name?.split(" ").slice(1).join(" ") || "";

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    toast.success("Settings saved successfully.");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-6 md:p-12 w-full font-sans">
      
      {/* Header matching the screenshot */}
      <div className="flex items-center gap-4 mb-10 pl-2">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f3f0ff] text-[#553cfa] shadow-sm">
          <SettingsIcon className="h-6 w-6" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-[26px] font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            Settings
          </h1>
          <p className="text-[15px] font-medium text-slate-500">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 lg:gap-16 flex-1 min-h-0">
        
        {/* Sidebar */}
        <div className="w-full md:w-[260px] shrink-0 flex flex-col gap-3">
          {SETTING_SECTIONS.map(s => {
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center justify-between px-5 py-3.5 text-left transition-all rounded-[20px] ${
                  isActive 
                    ? 'bg-[#553cfa] text-white shadow-lg shadow-[#553cfa]/30' 
                    : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <s.icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} strokeWidth={isActive ? 2.5 : 2} />
                  <span className={`text-[14px] ${isActive ? 'font-bold' : 'font-semibold'}`}>{s.label}</span>
                </div>
                {isActive && <ChevronRight className="h-4 w-4 opacity-90" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>

        {/* Content Card */}
        <div className="flex-1 overflow-y-auto pb-12 pr-4">
          <div className="bg-white dark:bg-black/40 border border-slate-100 dark:border-white/10 rounded-[32px] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] p-10 w-full animate-in fade-in zoom-in-95 duration-400">
            
            {activeSection === "notifications" && (
              <div className="space-y-8">
                <div className="mb-8">
                  <h2 className="text-[24px] font-bold text-slate-900 dark:text-white tracking-tight">Notification Preferences</h2>
                  <p className="text-[15px] font-medium text-slate-500 mt-1">Control what alerts you receive and where.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-5 border border-slate-100 dark:border-slate-800 rounded-[20px] bg-white dark:bg-slate-900/50 hover:border-slate-200 transition-colors shadow-sm shadow-slate-100/50">
                    <div>
                      <p className="text-[15px] font-bold text-slate-900 dark:text-white">High Priority Grievances</p>
                      <p className="text-[14px] font-medium text-slate-500 mt-0.5">Receive immediate push notifications.</p>
                    </div>
                    <Switch defaultChecked className="data-[state=checked]:bg-[#553cfa] shadow-inner" />
                  </div>
                  
                  <div className="flex items-center justify-between p-5 border border-slate-100 dark:border-slate-800 rounded-[20px] bg-white dark:bg-slate-900/50 hover:border-slate-200 transition-colors shadow-sm shadow-slate-100/50">
                    <div>
                      <p className="text-[15px] font-bold text-slate-900 dark:text-white">Daily Summary Email</p>
                      <p className="text-[14px] font-medium text-slate-500 mt-0.5">A roll-up of activity sent at 8:00 AM.</p>
                    </div>
                    <Switch defaultChecked className="data-[state=checked]:bg-[#553cfa] shadow-inner" />
                  </div>
                  
                  <div className="flex items-center justify-between p-5 border border-slate-100 dark:border-slate-800 rounded-[20px] bg-white dark:bg-slate-900/50 hover:border-slate-200 transition-colors shadow-sm shadow-slate-100/50">
                    <div>
                      <p className="text-[15px] font-bold text-slate-900 dark:text-white">New System Broadcasts</p>
                      <p className="text-[14px] font-medium text-slate-500 mt-0.5">Announcements from the admin team.</p>
                    </div>
                    <Switch defaultChecked className="data-[state=checked]:bg-[#553cfa] shadow-inner" />
                  </div>
                </div>
              </div>
            )}

            {activeSection === "profile" && (
              <div className="space-y-8">
                <div className="mb-8">
                  <h2 className="text-[24px] font-bold text-slate-900 dark:text-white tracking-tight">Profile Information</h2>
                  <p className="text-[15px] font-medium text-slate-500 mt-1">Update your personal details and public profile.</p>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-6">
                    <div className="flex-1 space-y-2.5">
                      <Label className="text-[12px] uppercase font-bold tracking-wider text-slate-500">First Name</Label>
                      <Input className="h-[52px] rounded-[16px] border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 focus-visible:ring-[#553cfa] font-semibold text-[15px] px-4" defaultValue={firstName} />
                    </div>
                    <div className="flex-1 space-y-2.5">
                      <Label className="text-[12px] uppercase font-bold tracking-wider text-slate-500">Last Name</Label>
                      <Input className="h-[52px] rounded-[16px] border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 focus-visible:ring-[#553cfa] font-semibold text-[15px] px-4" defaultValue={lastName} />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[12px] uppercase font-bold tracking-wider text-slate-500">Email Address</Label>
                    <Input className="h-[52px] rounded-[16px] border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold text-[15px] px-4 cursor-not-allowed" defaultValue={user?.email || ""} disabled />
                    <p className="text-[13px] font-medium text-slate-400 mt-1">To change your email address, please contact IT support.</p>
                  </div>
                  
                  <div className="space-y-2.5">
                    <Label className="text-[12px] uppercase font-bold tracking-wider text-slate-500">Department</Label>
                    <Select defaultValue="municipal">
                      <SelectTrigger className="h-[52px] rounded-[16px] border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 font-semibold text-[15px] px-4">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-[16px] border-slate-200 dark:border-slate-700 shadow-xl">
                        <SelectItem value="municipal" className="font-semibold py-2.5 rounded-lg">Municipal Administration</SelectItem>
                        <SelectItem value="agriculture" className="font-semibold py-2.5 rounded-lg">Agriculture</SelectItem>
                        <SelectItem value="police" className="font-semibold py-2.5 rounded-lg">Law Enforcement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-8 mt-10 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                   <Button 
                     onClick={handleSave} 
                     disabled={saving} 
                     className="h-[48px] px-8 rounded-[14px] bg-[#553cfa] hover:bg-[#4329d9] text-white font-bold text-[15px] shadow-[0_4px_16px_rgba(85,60,250,0.3)] transition-all"
                   >
                     {saving ? "Saving..." : "Save Changes"}
                   </Button>
                </div>
              </div>
            )}

            {activeSection === "appearance" && (
              <div className="space-y-8">
                <div className="mb-8">
                  <h2 className="text-[24px] font-bold text-slate-900 dark:text-white tracking-tight">Appearance</h2>
                  <p className="text-[15px] font-medium text-slate-500 mt-1">Customize how the application looks on your device.</p>
                </div>

                <div className="space-y-6 pt-2">
                  <div className="space-y-3">
                    <Label className="text-[12px] uppercase font-bold tracking-wider text-slate-500">Interface Density</Label>
                    <div className="flex items-center justify-between p-5 border border-slate-100 dark:border-slate-800 rounded-[20px] bg-white dark:bg-slate-900/50 hover:border-slate-200 transition-colors shadow-sm shadow-slate-100/50">
                      <div>
                        <p className="text-[15px] font-bold text-slate-900 dark:text-white">Compact Mode</p>
                        <p className="text-[14px] font-medium text-slate-500 mt-0.5">Reduce padding and margin to show more data.</p>
                      </div>
                      <Switch defaultChecked className="data-[state=checked]:bg-[#553cfa] shadow-inner" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Fallback for others */}
            {!["profile", "appearance", "notifications"].includes(activeSection) && (
              <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 animate-in zoom-in-95 duration-500">
                 <Shield className="h-16 w-16 mb-5 opacity-20 text-[#553cfa]" />
                 <p className="text-[18px] font-bold text-slate-700 dark:text-slate-300">Restricted Section</p>
                 <p className="text-[15px] font-medium mt-2 text-center max-w-[280px]">This section is managed by your organization administrator.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
