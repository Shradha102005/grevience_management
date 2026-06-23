import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, type ReactElement } from "react";
import {
  Siren,
  Radio,
  MapPin,
  Phone,
  ShieldAlert,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  XCircle,
  MessageSquare,
  User,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { StatCard } from "@/components/portal/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api";

export const Route = createFileRoute("/portal/disaster")({
  head: () => ({ meta: [{ title: "Disaster & Emergency — CIVICOS AI" }] }),
  component: Disaster,
});

// ── Types ──────────────────────────────────────────────────────────────────

interface Alert {
  id: string;
  title: string;
  description: string;
  disaster_type: string;
  severity: "critical" | "high" | "watch";
  affected_zones: string[];
  status: "active" | "resolved" | "cancelled";
  broadcast_sms: boolean;
  broadcast_call: boolean;
  created_by: string;
  created_at: string;
  resolved_at: string | null;
  recipients_count: number;
  sms_sent: number;
  call_sent: number;
  acknowledged_count: number;
  creator_name: string | null;
}

interface AlertStats {
  total_alerts: number;
  active_alerts: number;
  total_sms_sent: number;
  total_calls_made: number;
  total_citizens_reached: number;
  critical_count: number;
  high_count: number;
  watch_count: number;
}

const ZONES = [
  "All Zones",
  "North District",
  "South District",
  "East District",
  "West District",
  "Coastal Zone",
  "Central Zone",
];

const DISASTER_TYPES = [
  { value: "flood", label: "Flood" },
  { value: "cyclone", label: "Cyclone" },
  { value: "earthquake", label: "Earthquake" },
  { value: "fire", label: "Fire" },
  { value: "landslide", label: "Landslide" },
  { value: "drought", label: "Drought" },
  { value: "other", label: "Other" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

const severityBadge: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  watch: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
};

const statusBadge: Record<string, string> = {
  active: "bg-green-500/15 text-green-600",
  resolved: "bg-secondary text-secondary-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

const severityIcon: Record<string, ReactElement> = {
  critical: <ShieldAlert className="h-5 w-5 text-destructive" />,
  high: <AlertTriangle className="h-5 w-5 text-orange-500" />,
  watch: <Eye className="h-5 w-5 text-yellow-500" />,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Alert Card ─────────────────────────────────────────────────────────────

function AlertCard({
  alert,
  onResolve,
  onCancel,
  onAcknowledge,
  userRole,
}: {
  alert: Alert;
  onResolve?: (id: string) => void;
  onCancel?: (id: string) => void;
  onAcknowledge?: (id: string) => void;
  userRole: string;
}) {
  return (
    <div
      className={`relative rounded-xl border p-5 transition-all ${
        alert.severity === "critical"
          ? "border-destructive/40 bg-destructive/5"
          : alert.severity === "high"
            ? "border-orange-500/30 bg-orange-500/5"
            : "border-border bg-card"
      }`}
    >
      {alert.severity === "critical" && alert.status === "active" && (
        <span className="absolute right-4 top-4 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
        </span>
      )}

      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary">
          {severityIcon[alert.severity] ?? <Siren className="h-5 w-5" />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{alert.title}</h3>
            <Badge className={`${severityBadge[alert.severity]} border text-xs`} variant="secondary">
              {alert.severity.toUpperCase()}
            </Badge>
            <Badge className={`${statusBadge[alert.status]} text-xs`} variant="secondary">
              {alert.status}
            </Badge>
          </div>

          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{alert.description}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {alert.affected_zones.join(", ")}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo(alert.created_at)}
            </span>
            {alert.creator_name && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {alert.creator_name}
              </span>
            )}
          </div>

          {userRole === "admin" && (
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                {alert.sms_sent} SMS sent
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Phone className="h-3 w-3" />
                {alert.call_sent} calls made
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <CheckCircle2 className="h-3 w-3" />
                {alert.acknowledged_count}/{alert.recipients_count} acknowledged
              </span>
            </div>
          )}
        </div>
      </div>

      {alert.status === "active" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {userRole === "admin" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 hover:text-green-700 border-green-500/30"
                onClick={() => onResolve?.(alert.id)}
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Resolve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-muted-foreground"
                onClick={() => onCancel?.(alert.id)}
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                Cancel
              </Button>
            </>
          )}
          {(userRole === "officer" || userRole === "citizen") && onAcknowledge && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAcknowledge(alert.id)}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Acknowledge
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Broadcast Form (Admin) ─────────────────────────────────────────────────

function BroadcastDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    disaster_type: "flood",
    severity: "watch",
    affected_zones: [] as string[],
    broadcast_sms: true,
    broadcast_call: false,
  });

  const toggleZone = (zone: string) => {
    setForm((f) => ({
      ...f,
      affected_zones: f.affected_zones.includes(zone)
        ? f.affected_zones.filter((z) => z !== zone)
        : [...f.affected_zones, zone],
    }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim() || form.affected_zones.length === 0) {
      toast.error("Please fill all fields and select at least one zone.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/disaster/alerts", form);
      toast.success("🚨 Alert broadcast initiated! SMS/calls are being sent.");
      setOpen(false);
      setForm({
        title: "",
        description: "",
        disaster_type: "flood",
        severity: "watch",
        affected_zones: [],
        broadcast_sms: true,
        broadcast_call: false,
      });
      onCreated();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail ?? "Failed to broadcast alert.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" id="broadcast-alert-btn">
          <Radio className="mr-2 h-4 w-4" />
          Broadcast Alert
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Siren className="h-5 w-5 text-destructive" />
            Create Emergency Alert
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid gap-1.5">
            <Label htmlFor="alert-title">Alert Title</Label>
            <Input
              id="alert-title"
              placeholder="e.g. Severe Flood Warning – Ward 3"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Disaster Type</Label>
              <Select
                value={form.disaster_type}
                onValueChange={(v) => setForm((f) => ({ ...f, disaster_type: v }))}
              >
                <SelectTrigger id="disaster-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISASTER_TYPES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Severity</Label>
              <Select
                value={form.severity}
                onValueChange={(v) => setForm((f) => ({ ...f, severity: v }))}
              >
                <SelectTrigger id="severity-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="watch">Watch</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="alert-description">Description / Instructions</Label>
            <Textarea
              id="alert-description"
              placeholder="Provide detailed information and safety instructions for citizens…"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label>Affected Zones</Label>
            <div className="grid grid-cols-2 gap-2">
              {ZONES.map((zone) => (
                <label
                  key={zone}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <Checkbox
                    checked={form.affected_zones.includes(zone)}
                    onCheckedChange={() => toggleZone(zone)}
                    id={`zone-${zone}`}
                  />
                  {zone}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="mb-3 text-sm font-medium">Broadcast Channels</p>
            <div className="flex gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  id="broadcast-sms"
                  checked={form.broadcast_sms}
                  onCheckedChange={(c) => setForm((f) => ({ ...f, broadcast_sms: !!c }))}
                />
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                SMS
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  id="broadcast-call"
                  checked={form.broadcast_call}
                  onCheckedChange={(c) => setForm((f) => ({ ...f, broadcast_call: !!c }))}
                />
                <Phone className="h-4 w-4 text-muted-foreground" />
                Voice Call
              </label>
            </div>
          </div>

          <Button
            className="w-full"
            variant="destructive"
            onClick={handleSubmit}
            disabled={loading}
            id="submit-broadcast-btn"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Broadcasting…
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Broadcast Emergency Alert
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Phone Registration (Citizen / Officer) ─────────────────────────────────

function PhoneRegistrationCard({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const [phone, setPhone] = useState(user?.phone_number ?? "");
  const [zone, setZone] = useState(user?.zone ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!phone.startsWith("+")) {
      toast.error("Phone must be in E.164 format, e.g. +919876543210");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/disaster/phone", { phone_number: phone, zone: zone || null });
      toast.success("Phone number registered! You'll now receive disaster alerts.");
      onSaved();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail ?? "Failed to save phone number.");
    } finally {
      setSaving(false);
    }
  };

  const isRegistered = !!user?.phone_number;

  return (
    <Card className="shadow-card border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Phone className="h-4 w-4 text-primary" />
          Emergency Contact Registration
        </CardTitle>
        <CardDescription>
          {isRegistered
            ? "Your phone is registered. Update it below to change your contact or zone."
            : "Register your phone number to receive SMS alerts and voice calls during disasters."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRegistered && (
          <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Registered: {user.phone_number}
            {user.zone && <span className="ml-2 text-muted-foreground">· {user.zone}</span>}
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="phone-input">Phone Number (E.164 format)</Label>
          <Input
            id="phone-input"
            placeholder="+919876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Include country code, e.g. +91 for India
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="zone-select">My Zone / District</Label>
          <Select value={zone} onValueChange={setZone}>
            <SelectTrigger id="zone-select">
              <SelectValue placeholder="Select your zone…" />
            </SelectTrigger>
            <SelectContent>
              {ZONES.filter((z) => z !== "All Zones").map((z) => (
                <SelectItem key={z} value={z}>
                  {z}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full" id="save-phone-btn">
          {saving ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {isRegistered ? "Update Registration" : "Register for Alerts"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}



// ── Admin View ─────────────────────────────────────────────────────────────

function AdminView() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [alertsRes, statsRes] = await Promise.all([
        api.get<Alert[]>("/api/disaster/alerts"),
        api.get<AlertStats>("/api/disaster/stats"),
      ]);
      setAlerts(alertsRes.data);
      setStats(statsRes.data);
    } catch {
      toast.error("Failed to load alert data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResolve = async (id: string) => {
    try {
      await api.put(`/api/disaster/alerts/${id}/resolve`);
      toast.success("Alert resolved.");
      fetchData();
    } catch {
      toast.error("Failed to resolve alert.");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.put(`/api/disaster/alerts/${id}/cancel`);
      toast.success("Alert cancelled.");
      fetchData();
    } catch {
      toast.error("Failed to cancel alert.");
    }
  };

  const activeAlerts = alerts.filter((a) => a.status === "active");
  const historyAlerts = alerts.filter((a) => a.status !== "active");

  return (
    <div>
      <PageHeader
        icon={Siren}
        title="Disaster & Emergency Response"
        description="Broadcast alerts via Twilio SMS & Voice. Monitor delivery and manage active incidents."
        actions={<BroadcastDialog onCreated={fetchData} />}
      />

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Alerts" value={String(stats?.active_alerts ?? "—")} delta={`${stats?.critical_count ?? 0} critical`} trend="down" icon={Siren} />
        <StatCard label="Citizens Reached" value={stats ? String(stats.total_citizens_reached) : "—"} delta={`${stats?.total_sms_sent ?? 0} SMS sent`} icon={Radio} />
        <StatCard label="Voice Calls" value={stats ? String(stats.total_calls_made) : "—"} delta="via Twilio" icon={Phone} />
        <StatCard label="Total Alerts" value={String(stats?.total_alerts ?? "—")} delta={`${stats?.high_count ?? 0} high severity`} icon={MapPin} />
      </div>

      <div className="space-y-6">
        {/* Active Alerts */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>Live incidents requiring attention</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading alerts…</p>
            ) : activeAlerts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <p className="text-sm">No active alerts. All clear!</p>
              </div>
            ) : (
              activeAlerts.map((a) => (
                <AlertCard
                  key={a.id}
                  alert={a}
                  userRole="admin"
                  onResolve={handleResolve}
                  onCancel={handleCancel}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Alert History */}
        {historyAlerts.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Alert History</CardTitle>
              <CardDescription>Resolved and cancelled alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {historyAlerts.map((a) => (
                <AlertCard key={a.id} alert={a} userRole="admin" />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Officer View ───────────────────────────────────────────────────────────

function OfficerView() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Alert[]>("/api/disaster/alerts");
      setAlerts(data);
    } catch {
      toast.error("Failed to load alerts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleAcknowledge = async (id: string) => {
    try {
      await api.post(`/api/disaster/alerts/${id}/acknowledge`);
      toast.success("Alert acknowledged.");
      fetchAlerts();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail ?? "Could not acknowledge alert.");
    }
  };

  return (
    <div>
      <PageHeader
        icon={Siren}
        title="Disaster & Emergency Response"
        description={`Zone: ${user?.zone ?? "Not assigned"} — Monitor and acknowledge alerts for your area.`}
        actions={
          <Button variant="ghost" size="sm" onClick={fetchAlerts}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Alerts" value={String(alerts.filter((a) => a.status === "active").length)} delta="in your zone" icon={Siren} />
        <StatCard label="Critical" value={String(alerts.filter((a) => a.severity === "critical" && a.status === "active").length)} trend="down" delta="severity level" icon={ShieldAlert} />
        <StatCard label="Your Zone" value={user?.zone ?? "—"} delta="coverage area" icon={MapPin} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Alerts in Your Zone</CardTitle>
            <CardDescription>Acknowledge alerts to confirm your response</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
            ) : alerts.filter((a) => a.status === "active").length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <p className="text-sm">No active alerts in your zone.</p>
              </div>
            ) : (
              alerts
                .filter((a) => a.status === "active")
                .map((a) => (
                  <AlertCard
                    key={a.id}
                    alert={a}
                    userRole="officer"
                    onAcknowledge={handleAcknowledge}
                  />
                ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <PhoneRegistrationCard onSaved={fetchAlerts} />

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Emergency Protocols</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {[
                "Acknowledge all Critical alerts within 15 minutes",
                "Coordinate with local relief centers immediately",
                "Update citizen count at your assigned shelter",
                "Report supply needs to district admin",
                "Maintain communication with command center",
              ].map((p, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  {p}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Citizen View ───────────────────────────────────────────────────────────

function CitizenView() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Alert[]>("/api/disaster/alerts");
      setAlerts(data);
    } catch {
      toast.error("Failed to load alerts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleAcknowledge = async (id: string) => {
    try {
      await api.post(`/api/disaster/alerts/${id}/acknowledge`);
      toast.success("Alert acknowledged. Stay safe!");
      fetchAlerts();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail ?? "Could not acknowledge.");
    }
  };

  const criticalAlerts = alerts.filter((a) => a.severity === "critical" && a.status === "active");
  const otherAlerts = alerts.filter((a) => a.severity !== "critical" && a.status === "active");

  return (
    <div>
      <PageHeader
        icon={Siren}
        title="Disaster & Emergency Alerts"
        description="Stay informed about emergencies in your area. Register your phone to receive SMS alerts."
      />

      {criticalAlerts.length > 0 && (
        <div className="mb-6 rounded-xl border-2 border-destructive/50 bg-destructive/10 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
            </span>
            <h2 className="font-bold text-destructive">
              {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? "s" : ""} Active
            </h2>
          </div>
          <p className="mb-4 text-sm text-destructive/80">
            Follow all official instructions and move to safety immediately.
          </p>
          <div className="space-y-3">
            {criticalAlerts.map((a) => (
              <AlertCard
                key={a.id}
                alert={a}
                userRole="citizen"
                onAcknowledge={handleAcknowledge}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>
                Showing alerts for {user?.zone ? `your zone (${user.zone})` : "all zones"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
              ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                  <p className="font-medium">All Clear</p>
                  <p className="text-sm text-center">No active alerts in your area. Stay prepared!</p>
                </div>
              ) : (
                otherAlerts.map((a) => (
                  <AlertCard
                    key={a.id}
                    alert={a}
                    userRole="citizen"
                    onAcknowledge={handleAcknowledge}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <PhoneRegistrationCard onSaved={fetchAlerts} />

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Safety Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { title: "Stay Informed", desc: "Monitor official channels and your SMS alerts" },
                { title: "Emergency Kit", desc: "Keep water, food, torch, and first aid ready" },
                { title: "Evacuation Plan", desc: "Know your nearest shelter and safe route" },
                { title: "Emergency Numbers", desc: "Dial 112 (national emergency) or 1078 (disaster)" },
              ].map((tip) => (
                <div key={tip.title} className="rounded-lg border border-border p-3">
                  <p className="font-medium">{tip.title}</p>
                  <p className="text-muted-foreground">{tip.desc}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Root Component ─────────────────────────────────────────────────────────

function Disaster() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === "admin") return <AdminView />;
  if (user.role === "officer") return <OfficerView />;
  return <CitizenView />;
}
