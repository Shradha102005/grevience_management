import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  BrainCircuit,
  Activity,
  Zap,
  CheckCircle2,
  MapPin,
  Radio,
  Users,
  Landmark,
  MessageSquareWarning,
  Flame,
  ArrowUpRight,
  ShieldCheck,
  ArrowRight,
  Bot,
  Sparkles,
  BarChart3,
  Wifi,
  Phone,
} from "lucide-react";
import Chart from "react-apexcharts";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/portal/")({
  component: BentoDashboard,
});

function BentoDashboard() {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setPulse((p) => !p), 2000);
    return () => clearInterval(interval);
  }, []);

  // ── Fake Data for Chart ──
  const outreachOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "area",
      sparkline: { enabled: true },
      background: "transparent",
    },
    stroke: { curve: "smooth", width: 3 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0,
        stops: [0, 100],
      },
    },
    colors: ["#ec4899"],
    tooltip: {
      fixed: { enabled: false },
      x: { show: false },
      marker: { show: false },
    },
  };
  const outreachSeries = [
    { name: "Live Calls", data: [42, 58, 48, 72, 65, 89, 78, 110, 95] },
  ];

  const radarOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "scatter",
      toolbar: { show: false },
      background: "transparent",
      zoom: { enabled: false },
    },
    grid: {
      show: false,
      padding: { left: -10, right: -10, top: -10, bottom: -10 },
    },
    xaxis: {
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
      min: 0,
      max: 100,
    },
    yaxis: {
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
      min: 0,
      max: 100,
    },
    markers: { size: 6, strokeWidth: 0, hover: { size: 9 } },
    colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
    legend: { show: false },
    tooltip: { theme: "light" },
  };

  const radarSeries = [
    {
      name: "Traffic",
      data: [
        [20, 30],
        [25, 45],
        [15, 60],
        [40, 20],
      ],
    },
    {
      name: "Public Health",
      data: [
        [60, 80],
        [70, 75],
        [55, 90],
      ],
    },
    {
      name: "Municipal",
      data: [
        [80, 30],
        [85, 40],
        [90, 20],
        [75, 25],
      ],
    },
    {
      name: "Critical",
      data: [
        [50, 50],
        [45, 55],
      ],
    },
  ];

  const liveMatches = [
    { name: "Ravi S.", scheme: "PM Kisan Samman Nidhi", time: "Just now" },
    { name: "Meera P.", scheme: "Ayushman Bharat", time: "2m ago" },
    { name: "Arjun N.", scheme: "Mudra Yojana", time: "5m ago" },
    { name: "Sana K.", scheme: "Stand-Up India", time: "12m ago" },
  ];

  return (
    <div
      className="-m-6 flex flex-col h-[calc(100vh-4rem)] relative overflow-hidden font-sans"
      style={{ background: "#f8fafc" }}
    >
      {/* ── Ambient Background (Light Theme Premium) ── */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-60"
        style={{
          backgroundImage: `
          radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.15), transparent 40%),
          radial-gradient(circle at 100% 100%, rgba(236, 72, 153, 0.1), transparent 40%),
          radial-gradient(circle at 50% 100%, rgba(16, 185, 129, 0.1), transparent 40%)
        `,
        }}
      />
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* ── Live Command Ticker ── */}
      <div className="h-10 border-b border-white/60 bg-white/40 backdrop-blur-md flex items-center px-6 z-20 shrink-0">
        <div className="flex items-center gap-3 w-full">
          <Badge className="bg-rose-500 text-white hover:bg-rose-600 animate-pulse border-none shadow-sm shadow-rose-500/20 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
            Live
          </Badge>
          <div className="flex-1 overflow-hidden relative h-full flex items-center">
            <div className="whitespace-nowrap animate-marquee text-xs font-bold text-slate-600 flex gap-12">
              <span className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-indigo-500" /> AI routed 42 new
                grievances in the last hour.
              </span>
              <span className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-emerald-500" /> Voice Agent
                successfully resolved 89% of incoming helpline calls.
              </span>
              <span className="flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-amber-500" /> Scheme Matcher
                identified 120 eligible citizens for PM-Kisan.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-6 lg:p-8 z-10 relative"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="max-w-[1400px] mx-auto h-full flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                System Core
              </h1>
              <p className="text-sm font-bold text-slate-500 tracking-wide mt-1">
                CIVICOS AI Command Hub
              </p>
            </div>
          </div>

          {/* ── Bento Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
            {/* 1. The Civicos Brain (Hero Left) */}
            <div className="lg:col-span-1 bg-white/70 backdrop-blur-2xl border border-white shadow-2xl shadow-slate-300/60 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none" />

              <div className="flex items-center justify-between z-10">
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                  <Bot className="h-3.5 w-3.5" /> AI Engine
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
                  Online
                </span>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center py-10 z-10 relative">
                {/* Glowing Orb */}
                <div className="relative h-40 w-40 flex items-center justify-center">
                  <div
                    className={`absolute inset-0 rounded-full bg-indigo-400 blur-[40px] opacity-20 transition-transform duration-1000 ${pulse ? "scale-110" : "scale-90"}`}
                  />
                  <div
                    className={`absolute inset-4 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-400 blur-[15px] opacity-40 transition-transform duration-1000 ${pulse ? "scale-105" : "scale-95"}`}
                  />
                  <div className="absolute inset-8 rounded-full bg-white border-2 border-indigo-100 shadow-2xl flex items-center justify-center z-20">
                    <BrainCircuit
                      className={`h-12 w-12 text-indigo-600 transition-transform duration-1000 ${pulse ? "scale-110" : "scale-100"}`}
                    />
                  </div>
                  {/* Orbital rings */}
                  <div
                    className="absolute inset-0 rounded-full border border-indigo-200/50 animate-[spin_10s_linear_infinite]"
                    style={{
                      borderTopColor: "transparent",
                      borderLeftColor: "transparent",
                    }}
                  />
                  <div
                    className="absolute -inset-4 rounded-full border border-sky-200/50 animate-[spin_15s_linear_infinite_reverse]"
                    style={{
                      borderBottomColor: "transparent",
                      borderRightColor: "transparent",
                    }}
                  />
                </div>

                <h2 className="text-4xl font-black text-slate-800 tracking-tight mt-8">
                  14.2M
                </h2>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mt-1">
                  Tokens Processed Today
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-auto z-10">
                <div className="bg-white/80 rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <Zap className="h-5 w-5 text-amber-500 mb-2" />
                  <p className="text-xl font-black text-slate-800 leading-none mb-1">
                    742
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Active Agents
                  </p>
                </div>
                <div className="bg-white/80 rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <Activity className="h-5 w-5 text-emerald-500 mb-2" />
                  <p className="text-xl font-black text-slate-800 leading-none mb-1">
                    24ms
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Avg Latency
                  </p>
                </div>
              </div>
            </div>

            {/* Middle & Right Content */}
            <div className="lg:col-span-3 flex flex-col gap-6 h-full min-h-0">
              {/* 2. Civic Radar (Top Row) */}
              <div className="bg-white/70 backdrop-blur-2xl border border-white shadow-2xl shadow-slate-300/60 rounded-[2.5rem] flex flex-col overflow-hidden relative min-h-[300px]">
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage:
                      "radial-gradient(#94a3b8 2px, transparent 2px)",
                    backgroundSize: "32px 32px",
                  }}
                />

                <div className="p-8 flex items-start justify-between z-10 pointer-events-none">
                  <div>
                    <span className="flex items-center w-fit gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/80 px-3 py-1.5 rounded-full border border-slate-100 shadow-sm backdrop-blur-md mb-3">
                      <MapPin className="h-3.5 w-3.5 text-blue-500" /> Live
                      Civic Radar
                    </span>
                    <h3 className="text-2xl font-black text-slate-800">
                      12 Active Hotspots
                    </h3>
                    <p className="text-xs font-bold text-slate-500 mt-1">
                      State-wide telemetry and grievance mapping
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {["Traffic", "Health", "Municipal", "Critical"].map(
                      (l, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-bold bg-white/80 border border-slate-100 shadow-sm px-2 py-1 rounded-md text-slate-600 flex items-center gap-1.5 backdrop-blur-md"
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-blue-500" : i === 1 ? "bg-emerald-500" : i === 2 ? "bg-amber-500" : "bg-rose-500"}`}
                          />
                          {l}
                        </span>
                      ),
                    )}
                  </div>
                </div>

                <div className="absolute inset-0 z-0 flex items-center justify-center p-4 pt-20">
                  <Chart
                    options={radarOptions}
                    series={radarSeries}
                    type="scatter"
                    height="100%"
                    width="100%"
                  />
                </div>
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* 3. Outreach Engine */}
                <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 relative overflow-hidden text-white shadow-2xl shadow-slate-900/40 flex flex-col">
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage:
                        "linear-gradient(45deg, #1e293b 25%, transparent 25%, transparent 75%, #1e293b 75%, #1e293b), linear-gradient(45deg, #1e293b 25%, transparent 25%, transparent 75%, #1e293b 75%, #1e293b)",
                      backgroundSize: "20px 20px",
                      backgroundPosition: "0 0, 10px 10px",
                    }}
                  />

                  <div className="flex items-start justify-between z-10 relative">
                    <div>
                      <span className="flex items-center w-fit gap-2 text-[10px] font-black uppercase tracking-widest text-pink-400 bg-pink-500/10 px-3 py-1.5 rounded-full border border-pink-500/20 mb-4">
                        <Radio className="h-3.5 w-3.5" /> Campaign Architect
                      </span>
                      <h3 className="text-3xl font-black text-white">
                        4,892 Calls
                      </h3>
                      <p className="text-xs font-bold text-slate-400 mt-1">
                        Outbound AI interactions this hour
                      </p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center">
                      <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">
                        Engagement
                      </p>
                      <p className="text-2xl font-black text-emerald-400">
                        74%
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 mt-6 -mx-4 -mb-8 z-10 relative pointer-events-none">
                    <Chart
                      options={outreachOptions}
                      series={outreachSeries}
                      type="area"
                      height="100%"
                      width="100%"
                    />
                  </div>
                </div>

                {/* 4. Welfare Engine */}
                <div className="md:col-span-1 bg-white/70 backdrop-blur-2xl border border-white shadow-2xl shadow-slate-300/60 rounded-[2.5rem] p-6 flex flex-col">
                  <span className="flex items-center w-fit gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm mb-5">
                    <Landmark className="h-3.5 w-3.5" /> Scheme Matcher
                  </span>

                  <h3 className="text-lg font-black text-slate-800 mb-4">
                    Live Auto-Matches
                  </h3>

                  <div
                    className="space-y-3 flex-1 overflow-y-auto pr-2"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {liveMatches.map((m, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-emerald-200 transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
                            {m.name}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5 max-w-[120px] truncate">
                            {m.scheme}
                          </p>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md">
                          {m.time}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button className="w-full mt-4 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest py-3 rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-2">
                    View All <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
