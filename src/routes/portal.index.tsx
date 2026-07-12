import { createFileRoute, Link } from "@tanstack/react-router";
import {
<<<<<<< HEAD
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
=======
  MessageSquareWarning,
  Leaf,
  Building2,
  Sparkles,
  Siren,
  Sprout,
  Mic,
  PhoneCall,
  Megaphone,
  ArrowRightCircle,
  MapPin,
  Sun,
  ClipboardList,
  CheckCircle2,
  BellRing,
  Users,
  Send,
  ArrowUpRight,
  ShieldCheck,
  Search,
  HelpCircle,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
>>>>>>> 4b6b11d5b8430477f7a10a0fb94cf381a9b34171

export const Route = createFileRoute("/portal/")({
  component: MockupDashboard,
});

// Module Data
const MODULES = [
  {
    title: "Grievances",
    desc: "Report issues and track resolutions",
    icon: MessageSquareWarning,
    color: "text-indigo-600",
    bg: "bg-indigo-100",
    link: "/portal/grievances",
    illustration: "from-indigo-500/5 to-transparent",
  },
  {
    title: "Agriculture",
    desc: "Smart farming and market insights",
    icon: Leaf,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    link: "/portal/agriculture",
    illustration: "from-emerald-500/10 to-transparent",
  },
  {
    title: "Smart City",
    desc: "Urban services at your fingertips",
    icon: Building2,
    color: "text-blue-600",
    bg: "bg-blue-100",
    link: "/portal/smart-city",
    illustration: "from-blue-500/10 to-transparent",
  },
  {
    title: "Scheme AI",
    desc: "Find schemes you're eligible for",
    icon: Sparkles,
    color: "text-purple-600",
    bg: "bg-purple-100",
    link: "/portal/scheme-ai",
    illustration: "from-purple-500/10 to-transparent",
  },
  {
    title: "Disaster Alerts",
    desc: "Live alerts and safety updates",
    icon: Siren,
    color: "text-rose-600",
    bg: "bg-rose-100",
    link: "/portal/disaster",
    illustration: "from-rose-500/10 to-transparent",
  },
  {
    title: "Rural Development",
    desc: "Empowering villages, building tomorrow",
    icon: Sprout,
    color: "text-orange-500",
    bg: "bg-orange-100",
    link: "/portal/rural",
    illustration: "from-orange-500/10 to-transparent",
  },
  {
    title: "Municipal Services",
    desc: "Access local municipal services",
    icon: Building2,
    color: "text-sky-600",
    bg: "bg-sky-100",
    link: "/portal/municipal",
    illustration: "from-sky-500/10 to-transparent",
  },
  {
    title: "Voice Assistant",
    desc: "Ask anything, get instant help",
    icon: Mic,
    color: "text-violet-600",
    bg: "bg-violet-100",
    link: "/portal/voice",
    illustration: "from-violet-500/10 to-transparent",
  },
  {
    title: "Public Helpline",
    desc: "Connect with helplines and support",
    icon: PhoneCall,
    color: "text-teal-600",
    bg: "bg-teal-100",
    link: "/portal/helpline",
    illustration: "from-teal-500/10 to-transparent",
  },
  {
    title: "Campaigns",
    desc: "Join campaigns and make an impact",
    icon: Megaphone,
    color: "text-pink-600",
    bg: "bg-pink-100",
    link: "/portal/election",
    illustration: "from-pink-500/10 to-transparent",
  },
];

<<<<<<< HEAD
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
=======
const METRICS = [
  { icon: ClipboardList, color: "text-indigo-600", bg: "bg-indigo-100", val: "12", label: "Active Grievances", trend: "+ 8%", trendColor: "text-emerald-500" },
  { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100", val: "8", label: "Resolved Today", trend: "+ 12%", trendColor: "text-emerald-500" },
  { icon: BellRing, color: "text-orange-500", bg: "bg-orange-100", val: "5", label: "New Alerts", trend: "+ 2%", trendColor: "text-rose-500" },
  { icon: Users, color: "text-blue-600", bg: "bg-blue-100", val: "23", label: "Schemes for You", trend: "+ 6%", trendColor: "text-emerald-500" },
];
>>>>>>> 4b6b11d5b8430477f7a10a0fb94cf381a9b34171

function MockupDashboard() {
  return (
<<<<<<< HEAD
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
=======
    <div className="mx-auto w-full max-w-[1400px] p-6 lg:p-10 flex flex-col gap-10 pb-10 animate-in fade-in duration-500">
      
      {/*  Header  */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-3">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 animate-gradient-x">
              Welcome back, Shradha!
            </span>
            <span className="text-3xl animate-bounce" style={{ animationDuration: '2s' }}>👋</span>
          </h1>
          <p className="text-slate-500/80 dark:text-slate-400 mt-2 font-medium text-sm md:text-base">How can we help you today?</p>
        </div>
        <div className="flex items-center gap-4 bg-white/60 backdrop-blur-2xl dark:bg-[#1A1F2E]/60 px-5 py-3 rounded-[1.25rem] shadow-xl shadow-slate-200/40 border border-white/60 dark:border-slate-700 text-sm font-bold transition-all hover:scale-105 hover:shadow-2xl">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <MapPin className="h-4 w-4" /> Hyderabad, India
          </div>
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <Sun className="h-4 w-4 text-orange-500" /> 33°C <span className="text-slate-400 font-semibold">Clear</span>
>>>>>>> 4b6b11d5b8430477f7a10a0fb94cf381a9b34171
          </div>
        </div>
      </div>

<<<<<<< HEAD
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
=======
      {/*  Module Grid  */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {MODULES.map((mod, i) => (
          <Link key={i} to={mod.link} className="group relative bg-white/70 dark:bg-[#1A1F2E]/80 backdrop-blur-3xl rounded-[2.25rem] p-6 shadow-xl shadow-slate-200/50 border border-white/80 dark:border-slate-700/50 overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-2 flex flex-col h-full min-h-[220px]">
            {/* Background Illustration Simulation */}
            <div className={`absolute top-0 right-0 bottom-0 w-3/4 bg-gradient-to-l ${mod.illustration} pointer-events-none opacity-50 dark:opacity-20 transition-opacity group-hover:opacity-100`} />
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/40 rounded-bl-[100px] pointer-events-none opacity-50" />
            
            <div className="absolute -bottom-8 -right-8 opacity-[0.03] dark:opacity-[0.02] transform rotate-12 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-700 pointer-events-none">
              <mod.icon className="w-48 h-48" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col">
              <div className={`h-12 w-12 rounded-[1.25rem] shadow-inner border border-white/50 flex items-center justify-center mb-5 ${mod.bg} dark:bg-opacity-10 ${mod.color} transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                <mod.icon className="h-6 w-6 drop-shadow-sm" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white leading-tight group-hover:text-indigo-600 transition-colors">{mod.title}</h3>
              <p className="text-sm font-semibold text-slate-500/90 dark:text-slate-400 mt-2 mb-6 leading-relaxed flex-1">
                {mod.desc}
              </p>
              <div className={`mt-auto ${mod.color} opacity-80 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 duration-300`}>
                <ArrowRightCircle className="h-7 w-7 stroke-[1.5]" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/*  Bottom Section  */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Today at a Glance */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <h2 className="text-base font-extrabold text-slate-800 dark:text-white tracking-tight">Today at a Glance</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 flex-1">
            {METRICS.map((metric, i) => (
              <div key={i} className="bg-white/70 backdrop-blur-3xl dark:bg-[#1A1F2E]/80 rounded-[2rem] p-5 shadow-xl shadow-slate-200/50 border border-white/80 dark:border-slate-700/50 flex flex-col group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <div className={`h-10 w-10 rounded-[1rem] shadow-inner border border-white/50 flex items-center justify-center mb-4 ${metric.bg} dark:bg-opacity-10 ${metric.color} transition-transform group-hover:scale-110`}>
                  <metric.icon className="h-5 w-5" />
                </div>
                <div className="mt-auto">
                  <h4 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-1 tracking-tight">{metric.val}</h4>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">{metric.label}</p>
                  <p className={`text-sm font-extrabold flex items-center gap-1 ${metric.trendColor} bg-white/50 px-2 py-1 rounded-full w-fit shadow-sm border border-white`}>
                    <ArrowUpRight className="h-3 w-3" /> {metric.trend} <span className="text-slate-400/80 font-bold ml-1">vs y'day</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Assistant */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          <h2 className="text-base font-extrabold text-slate-800 dark:text-white tracking-tight">AI Assistant</h2>
          <div className="bg-gradient-to-br from-indigo-50/90 to-purple-50/90 backdrop-blur-3xl dark:from-indigo-950/40 dark:to-purple-950/40 rounded-[2rem] p-6 border border-white shadow-xl shadow-indigo-100/50 flex-1 flex flex-col relative overflow-hidden group hover:shadow-2xl hover:shadow-indigo-200/50 transition-all duration-500">
            {/* Glowing blur behind AI */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-400/20 blur-[50px] rounded-full" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-400/20 blur-[50px] rounded-full" />

            <div className="relative z-10 flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-[1rem] bg-white shadow-sm border border-indigo-100 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
              </div>
              <h3 className="text-base font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-600">Hi Shradha!</h3>
            </div>
            <p className="relative z-10 text-sm text-indigo-800/80 dark:text-indigo-300/80 font-bold mb-6">
              I'm your AI Assistant. How can I help you today?
            </p>
            
            <div className="relative mt-auto z-10">
              <input
                type="text"
                placeholder="Ask me anything..."
                className="w-full bg-white/80 backdrop-blur-md dark:bg-[#1A1F2E]/80 text-slate-800 dark:text-slate-200 rounded-2xl py-4 pl-5 pr-14 shadow-inner border border-white focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all text-sm font-bold placeholder:text-slate-400"
              />
              <button className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all rounded-[14px] w-12 flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95">
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>

            <div className="relative z-10 flex flex-wrap items-center gap-2 mt-4">
              {[{i: CheckCircle2, l: "Find schemes", c: "indigo"}, {i: MessageSquareWarning, l: "Track grievance", c: "rose"}, {i: Leaf, l: "Farming tips", c: "emerald"}, {i: HelpCircle, l: "Help", c: "purple"}].map((tag, idx) => (
                <button key={idx} className="bg-white/60 hover:bg-white backdrop-blur-sm px-3 py-1.5 rounded-[12px] text-sm font-bold text-slate-700 flex items-center gap-1.5 transition-all shadow-sm border border-white hover:shadow-md hover:-translate-y-0.5 active:scale-95">
                  <tag.i className={`h-3.5 w-3.5 text-${tag.c}-500`} /> {tag.l}
                </button>
              ))}
            </div>
>>>>>>> 4b6b11d5b8430477f7a10a0fb94cf381a9b34171
          </div>
        </div>
      </div>

<<<<<<< HEAD
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
=======
      {/*  Footer Banner  */}
      <div className="w-full bg-gradient-to-r from-indigo-600/90 via-purple-600/90 to-pink-500/90 backdrop-blur-xl dark:from-indigo-900/80 dark:via-purple-900/80 dark:to-indigo-900/80 rounded-[2.5rem] p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-8 border border-white/40 dark:border-indigo-800/50 relative overflow-hidden shadow-2xl shadow-indigo-500/20 group">
        {/* Subtle background glow */}
        <div className="absolute -left-20 top-0 w-60 h-60 bg-white/20 blur-[80px] rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-1000" />
        <div className="absolute -right-20 bottom-0 w-60 h-60 bg-white/10 blur-[60px] rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-1000" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="h-16 w-16 rounded-[1.25rem] bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-xl">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-white tracking-tight">Your Voice, Our Priority</h3>
            <p className="text-sm font-bold text-white/80 mt-1">Together, let's build a better tomorrow.</p>
          </div>
        </div>
        
        <Button className="relative z-10 bg-white hover:bg-slate-50 text-indigo-600 rounded-2xl px-8 h-14 shadow-2xl shadow-black/20 font-extrabold transition-all hover:scale-105 active:scale-95 text-base">
          Report an Issue <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>

>>>>>>> 4b6b11d5b8430477f7a10a0fb94cf381a9b34171
    </div>
  );
}
