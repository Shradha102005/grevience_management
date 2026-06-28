import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Activity, Zap, Droplets, Bus, TrafficCone, Wifi,
  AlertTriangle, CheckCircle2, Clock, Map, RefreshCw, BarChart2,
  Terminal, Server, BatteryCharging
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/portal/portal-shell";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";
import api from "@/lib/api";

export const Route = createFileRoute("/portal/smart-city")({
  component: SmartCity,
});

const API_BASE = "http://localhost:8000";

interface CityService {
  id: string;
  label: string;
  icon: string;
  value: string;
  detail: string;
  status: string;
}

const LIVE_LOGS = [
  { time: "10:24:01", level: "INFO", source: "TRAFFIC_CAM_04", msg: "Congestion detected at MG Road intersection. Rerouting suggested." },
  { time: "10:23:45", level: "WARN", source: "GRID_NODE_12", msg: "Voltage fluctuation detected in Sector 4. Compensators engaged." },
  { time: "10:22:10", level: "INFO", source: "WATER_PUMP_02", msg: "Main reservoir level nominal. Pressure stabilized at 4.2 bar." },
  { time: "10:20:05", level: "ERROR", source: "TRANSIT_API", msg: "Lost telemetry from Bus Fleet B. Attempting reconnect..." },
  { time: "10:19:30", level: "INFO", source: "WASTE_MGT", msg: "Route 7 collection completed. Trucks returning to depot." },
];

const ENERGY_DATA = [
  { time: "06:00", load: 450 }, { time: "07:00", load: 600 }, { time: "08:00", load: 850 },
  { time: "09:00", load: 920 }, { time: "10:00", load: 890 }, { time: "11:00", load: 870 }
];

const TRAFFIC_DATA = [
  { zone: "North", index: 85 }, { zone: "South", index: 45 }, { zone: "East", index: 60 }, { zone: "West", index: 30 }, { zone: "Center", index: 95 }
];

function SmartCity() {
  const [services, setServices] = useState<CityService[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/live/city-services`);
      if (resp.ok) {
        const data = await resp.json();
        setServices(data.services || []);
      }
    } catch (err) {
      console.error("Failed to load services", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
    const interval = setInterval(fetchServices, 60000);
    return () => clearInterval(interval);
  }, [fetchServices]);

  const getIcon = (name: string) => {
    switch (name) {
      case "TrafficCone": return TrafficCone;
      case "Droplets": return Droplets;
      case "Zap": return Zap;
      case "Bus": return Bus;
      case "Wifi": return Wifi;
      default: return Activity;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4 bg-background text-foreground">
      <div className="px-6 py-4 border-b border-border/50 bg-card flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> City Telemetry Center</h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">NOC: SYSTEM_NOMINAL | UPTIME: 99.99%</p>
        </div>
        <div className="flex gap-3">
          <Badge variant="outline" className="text-[10px] font-mono bg-success/10 text-success border-success/20 animate-pulse"><div className="h-1.5 w-1.5 rounded-full bg-success mr-2" /> LIVE STREAM</Badge>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={fetchServices}><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /></Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6 min-h-0 space-y-4">
        {/* Core Infrastructure Health */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {services.map((l) => {
            const Icon = getIcon(l.icon);
            const isAlert = l.status === 'alert';
            const isWarn = l.status === 'warn';
            return (
              <Card key={l.id} className={`p-4 shadow-none border ${isAlert ? 'border-destructive bg-destructive/5' : isWarn ? 'border-warning bg-warning/5' : 'border-border bg-card'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-1.5 rounded-sm ${isAlert ? 'bg-destructive/20 text-destructive' : isWarn ? 'bg-warning/20 text-warning' : 'bg-primary/10 text-primary'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={`h-2 w-2 rounded-full ${isAlert ? 'bg-destructive animate-ping' : isWarn ? 'bg-warning' : 'bg-success'}`} />
                </div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{l.label}</h3>
                <p className={`text-lg font-bold font-mono mt-1 ${isAlert ? 'text-destructive' : ''}`}>{l.value}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{l.detail}</p>
              </Card>
            );
          })}
        </div>

        {/* Dashboards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[300px]">
          {/* Energy Grid */}
          <Card className="col-span-1 lg:col-span-2 shadow-none border-border bg-card flex flex-col min-h-0">
            <CardHeader className="p-3 border-b border-border/50 shrink-0">
              <CardTitle className="text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2"><BatteryCharging className="h-4 w-4 text-warning" /> Energy Grid Load (MW)</span>
                <Badge variant="outline" className="text-[9px] font-mono">PEAK: 920MW</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ENERGY_DATA} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="load" stroke="hsl(var(--warning))" fillOpacity={1} fill="url(#colorLoad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Traffic Congestion */}
          <Card className="col-span-1 shadow-none border-border bg-card flex flex-col min-h-0">
            <CardHeader className="p-3 border-b border-border/50 shrink-0">
              <CardTitle className="text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2"><Map className="h-4 w-4 text-primary" /> Traffic Index</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={TRAFFIC_DATA} margin={{ top: 5, right: 0, left: -25, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis dataKey="zone" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: 'hsl(var(--muted)/0.5)'}} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '12px' }} />
                  <Bar dataKey="index" radius={[0, 2, 2, 0]}>
                    {TRAFFIC_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.index > 80 ? 'hsl(var(--destructive))' : entry.index > 50 ? 'hsl(var(--warning))' : 'hsl(var(--primary))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Live Event Stream */}
        <Card className="shadow-none border-border bg-[#0D0D0D] text-green-500 font-mono flex flex-col">
          <CardHeader className="p-2 border-b border-[#222] bg-[#111] shrink-0">
            <CardTitle className="text-[10px] uppercase flex items-center gap-2 text-green-500/70">
              <Terminal className="h-3 w-3" /> System Event Log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 text-[11px] space-y-1">
             {LIVE_LOGS.map((log, i) => (
               <div key={i} className="flex gap-3">
                 <span className="opacity-50">[{log.time}]</span>
                 <span className={log.level === 'ERROR' ? 'text-red-500' : log.level === 'WARN' ? 'text-yellow-500' : 'text-blue-400'}>{log.level}</span>
                 <span className="opacity-70">[{log.source}]</span>
                 <span className="text-green-300">{log.msg}</span>
               </div>
             ))}
             <div className="flex gap-3 animate-pulse">
               <span className="opacity-50">[{new Date().toLocaleTimeString('en-GB')}]</span>
               <span className="text-green-500 opacity-50">Listening for telemetry...</span>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
