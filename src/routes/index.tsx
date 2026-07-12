import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Sparkles,
  Terminal,
  Activity,
  BrainCircuit,
  Shield,
  TriangleAlert,
  Sprout,
  Sun,
  Droplets,
  Wind,
  CloudRain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { MODULES } from "@/lib/modules";
import { motion, useScroll, useTransform, useMotionValue } from "framer-motion";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: LightLanding3D,
});

function LightLanding3D() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    mouseX.set(clientX - innerWidth / 2);
    mouseY.set(clientY - innerHeight / 2);
  };

  const transformX = useTransform(mouseX, [-500, 500], [-15, 15]);
  const transformY = useTransform(mouseY, [-500, 500], [15, -15]);

  if (!mounted) return null;

  return (
    <div
      className="min-h-screen bg-slate-50 font-sans overflow-hidden text-slate-900 selection:bg-indigo-500/30"
      onMouseMove={handleMouseMove}
    >
      {/* Light Theme Header */}
      <div className="absolute top-0 w-full z-50 bg-white/50 backdrop-blur-md border-b border-slate-200">
        <SiteHeader />
      </div>

      {/* ── 3D HERO SECTION ── */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden perspective-[2000px]">
        {/* Ambient Grid */}
        <div
          className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.05)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)] pointer-events-none z-0"
          style={{
            transform:
              "perspective(1000px) rotateX(60deg) translateY(-200px) scale(3)",
            transformOrigin: "top",
          }}
        />

        {/* ── TWO-COLUMN LAYOUT ── */}
        <div className="relative z-10 mx-auto max-w-7xl w-full px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12 lg:gap-0 min-h-[calc(100vh-80px)]">
          {/* LEFT COLUMN — Text & CTAs */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col items-start text-left"
          >

            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/70 backdrop-blur-md px-4 py-1.5 text-xs font-black uppercase tracking-widest text-indigo-600 shadow-sm mb-8">
              <Activity className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
              CivicSaathi · AI Governance
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-[80px] xl:text-[90px] font-black text-slate-900 tracking-tighter leading-[0.9] mb-8">
              Build the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500">
                Future.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-500 font-medium max-w-xl mb-12 leading-relaxed">
              A deeply integrated, AI-native operating system for modern
              governance. Data-driven, spatial, and infinitely scalable.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <Button
                asChild
                className="h-14 px-10 rounded-full bg-indigo-600 text-white font-black text-base transition-transform hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(99,102,241,0.35)] hover:bg-indigo-700"
              >
                <Link to="/portal">
                  Explore Services <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            {/* Mini stats row */}
            <div className="mt-14 flex items-center gap-8 flex-wrap">
              {[
                { value: "9+", label: "CORE MODULES" },
                { value: "24x7", label: "VOICE SUPPORT" },
                { value: "100%", label: "CITIZEN FOCUSED" },
              ].map((s) => (
                <div key={s.label} className="flex flex-col">
                  <span className="text-2xl font-black text-indigo-600">
                    {s.value}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* RIGHT COLUMN — Orbiting Modules Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="flex-1 relative h-[480px] sm:h-[580px] w-full flex items-center justify-center"
          >
            {/* Glow blob behind orbit */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] bg-indigo-400/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] bg-cyan-400/10 rounded-full blur-[60px] pointer-events-none" />

            {/* Orbit track rings */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full border border-indigo-200/50 border-dashed pointer-events-none hidden sm:block" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full border border-indigo-100/40 pointer-events-none hidden sm:block" />

            {/* Orbiting Container — spins the whole ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 w-full h-full flex items-center justify-center"
              style={{ transformStyle: "preserve-3d" }}
            >
              {MODULES.map((module, i) => {
                const angle = (i / MODULES.length) * Math.PI * 2;
                const radiusX = 220;
                const radiusY = 220;
                const x = Math.cos(angle) * radiusX;
                const y = Math.sin(angle) * radiusY;
                return (
                  <div
                    key={module.id}
                    style={{
                      position: "absolute",
                      left: `calc(50% + ${x}px)`,
                      top: `calc(50% + ${y}px)`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className="z-20 hidden sm:block"
                  >
                    {/* Counter-rotate icon to stay upright */}
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{
                        duration: 40,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <motion.button
                        animate={{ y: [-6, 6, -6] }}
                        transition={{
                          y: {
                            duration: 4 + (i % 3),
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.25,
                          },
                        }}
                        title={module.short}
                        className="group flex h-14 w-14 items-center justify-center rounded-2xl bg-white/90 backdrop-blur-xl border border-indigo-100 shadow-[0_8px_30px_rgba(99,102,241,0.12)] hover:bg-indigo-600 hover:border-indigo-600 transition-all duration-300 cursor-pointer"
                      >
                        <module.icon className="w-6 h-6 text-indigo-500 group-hover:text-white transition-colors duration-300" />
                      </motion.button>
                    </motion.div>
                  </div>
                );
              })}
            </motion.div>

            {/* Center Core */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 hidden sm:flex h-36 w-36 items-center justify-center">
              {/* Pulsing rings */}
              <motion.div
                animate={{ scale: [1, 1.9, 2.6], opacity: [0.7, 0.3, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-full border-2 border-indigo-400/50"
              />
              <motion.div
                animate={{ scale: [1, 1.9, 2.6], opacity: [0.7, 0.3, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 1,
                }}
                className="absolute inset-0 rounded-full border-2 border-cyan-400/50"
              />
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-[0_0_60px_rgba(99,102,241,0.25)] border border-indigo-100 z-10"
              >
                <div className="flex flex-col items-center gap-0.5">
                  <Sparkles className="w-6 h-6 text-indigo-500 mb-1" />
                  <span className="text-[11px] font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-cyan-500 tracking-wider leading-tight text-center">
                    CivicSaathi
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Mobile fallback — simple icon grid */}
            <div className="sm:hidden grid grid-cols-3 gap-4 p-4">
              {MODULES.slice(0, 6).map((module) => (
                <div
                  key={module.id}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="h-14 w-14 rounded-2xl bg-white border border-indigo-100 shadow-sm flex items-center justify-center">
                    <module.icon className="w-6 h-6 text-indigo-500" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 text-center">
                    {module.short}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── PLATFORM CAPABILITIES SECTION ── */}
      <section id="architecture" className="relative py-32 bg-white z-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-6">
              A Unified Governance Architecture.
            </h2>
            <p className="text-lg text-slate-500 font-semibold leading-relaxed">
              CivicSaathi isn't just a collection of apps. It is a deeply
              integrated platform built on three core pillars that transform how
              municipalities operate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                title: "Voice-First Multilingual AI",
                desc: "Break down the digital divide. Citizens can access schemes, file grievances, and get information simply by talking to the platform in their native regional language.",
                icon: "🗣️",
              },
              {
                title: "Unified Data Lake",
                desc: "No more data silos. From traffic sensors to public health reports and citizen grievances, all data flows into a single, intelligent backend for real-time analytics.",
                icon: "📊",
              },
              {
                title: "Automated Workflows",
                desc: "Remove bureaucratic bottlenecks. The AI automatically routes complaints to the right officers, verifies scheme eligibility, and triggers emergency alerts instantly.",
                icon: "⚡",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="flex flex-col items-center text-center group"
              >
                <div className="h-20 w-20 rounded-[2rem] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-3xl mb-8 group-hover:-translate-y-2 transition-transform shadow-sm">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODULE DEEP DIVES (ALTERNATING LAYOUT) ── */}
      <section
        id="modules"
        className="relative py-32 bg-slate-50 z-20 overflow-hidden"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8 space-y-32">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-6">
              Nine Modules.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-indigo-600">
                One Brain.
              </span>
            </h2>
            <p className="text-xl text-slate-500 font-medium">
              Every tool your municipality needs, broken down into powerful,
              native applications.
            </p>
          </div>

          {MODULES.map((m, i) => {
            const isEven = i % 2 === 0;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-16`}
              >
                {/* Text Content */}
                <motion.div
                  initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8 }}
                  className="flex-1 space-y-6"
                >
                  <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-indigo-700">
                    Module 0{i + 1}
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                    {m.title}
                  </h2>
                  <p className="text-lg text-slate-500 font-medium leading-relaxed">
                    {m.description}
                  </p>

                  <div className="pt-4">
                    <Button
                      asChild
                      className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                    >
                      <Link to={m.href}>
                        Initialize <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </motion.div>

                {/* Visual Mockup */}
                <motion.div
                  initial={{ opacity: 0, x: isEven ? 50 : -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8 }}
                  className="flex-1 w-full"
                >
                  <div className="bg-white rounded-[2rem] p-4 sm:p-6 shadow-2xl shadow-indigo-500/10 border border-slate-200 relative overflow-hidden group">
                    <div className="bg-[#0B0F19] rounded-2xl border border-slate-800/60 flex flex-col items-center justify-center min-h-[360px] relative z-10 overflow-hidden">
                      {/* Dark Grid Background */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />

                      {/* Center glowing element */}
                      <div className="relative z-10 flex flex-col items-center justify-center">
                        <div
                          className={`absolute inset-0 ${i === 4 ? "bg-blue-600/20" : i === 3 ? "bg-purple-500/30" : i === 2 ? "bg-cyan-500/30" : i === 1 ? "bg-fuchsia-500/30" : "bg-indigo-500/30"} blur-2xl rounded-full scale-150`}
                        />
                        <div className="h-20 w-20 flex items-center justify-center relative">
                          <m.icon
                            className={`h-14 w-14 ${i === 3 || i === 4 || i === 5 ? "hidden" : i === 2 ? "text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" : i === 1 ? "text-fuchsia-400 drop-shadow-[0_0_15px_rgba(217,70,239,0.5)]" : "text-indigo-400 drop-shadow-[0_0_15px_rgba(129,140,248,0.5)]"}`}
                            strokeWidth={1.5}
                          />
                          {i === 3 && (
                            <div className="absolute inset-0 m-auto h-16 w-16 rounded-full bg-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.6)]" />
                          )}
                        </div>
                        {i === 3 && (
                          <div className="absolute -bottom-6 text-[9px] font-bold text-purple-400 tracking-widest uppercase">
                            Hub
                          </div>
                        )}
                      </div>

                      {/* Specific Floating Elements for Module 1 */}
                      {i === 0 ? (
                        <>
                          {/* Top Left: PM Housing */}
                          <div className="absolute top-12 left-6 bg-[#131826] border border-slate-700/60 rounded-lg p-3 text-left w-32 shadow-xl backdrop-blur-md">
                            <div className="text-[10px] font-bold text-yellow-500 tracking-wider mb-1">
                              PM HOUSING
                            </div>
                            <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{" "}
                              Eligible
                            </div>
                          </div>

                          {/* Top Right: Schemes */}
                          <div className="absolute top-8 right-8 bg-[#131826] border border-yellow-500/30 rounded-lg p-3 text-left shadow-[0_0_15px_rgba(234,179,8,0.1)] backdrop-blur-md z-20">
                            <div className="text-[10px] font-bold text-yellow-500 tracking-wider mb-1">
                              SCHEMES
                            </div>
                            <div className="text-[12px] font-black text-white">
                              500+ Active
                            </div>
                          </div>

                          <div className="absolute top-20 right-14 bg-[#131826] border border-slate-700/60 rounded-lg p-3 text-left w-32 shadow-xl backdrop-blur-md z-10">
                            <div className="text-[10px] font-bold text-yellow-500 tracking-wider mb-1">
                              PM KISAN
                            </div>
                            <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{" "}
                              Approved
                            </div>
                          </div>

                          {/* Bottom Left: Skill India */}
                          <div className="absolute bottom-16 left-8 bg-[#131826] border border-slate-700/60 rounded-lg p-3 text-left w-32 shadow-xl backdrop-blur-md">
                            <div className="text-[10px] font-bold text-yellow-500 tracking-wider mb-1">
                              SKILL INDIA
                            </div>
                            <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{" "}
                              Verified ✓
                            </div>
                          </div>

                          {/* Bottom Right: Ayushman */}
                          <div className="absolute bottom-20 right-10 bg-[#131826] border border-slate-700/60 rounded-lg p-3 text-left w-32 shadow-xl backdrop-blur-md">
                            <div className="text-[10px] font-bold text-yellow-500 tracking-wider mb-1">
                              AYUSHMAN
                            </div>
                            <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{" "}
                              Active
                            </div>
                          </div>

                          {/* AI Engine Live */}
                          <div className="absolute bottom-6 right-6 bg-[#131826] border border-emerald-500/40 rounded-lg px-3 py-2 text-center shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                            <div className="text-[9px] font-bold text-slate-400 tracking-wider mb-0.5">
                              AI ENGINE
                            </div>
                            <div className="text-[11px] font-black text-emerald-400">
                              LIVE
                            </div>
                          </div>

                          {/* Connecting SVG Lines */}
                          <svg
                            className="absolute inset-0 h-full w-full pointer-events-none z-0"
                            aria-hidden="true"
                          >
                            <line
                              x1="50%"
                              y1="50%"
                              x2="20%"
                              y2="25%"
                              stroke="rgba(234,179,8,0.2)"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                            />
                            <line
                              x1="50%"
                              y1="50%"
                              x2="80%"
                              y2="25%"
                              stroke="rgba(234,179,8,0.2)"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                            />
                            <line
                              x1="50%"
                              y1="50%"
                              x2="20%"
                              y2="75%"
                              stroke="rgba(234,179,8,0.2)"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                            />
                            <line
                              x1="50%"
                              y1="50%"
                              x2="80%"
                              y2="75%"
                              stroke="rgba(234,179,8,0.2)"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                            />
                          </svg>
                        </>
                      ) : i === 1 ? (
                        <>
                          {/* Top Left: Voter Reach */}
                          <div className="absolute top-10 left-10 bg-[#131826] border border-fuchsia-500/40 rounded-lg p-3 text-left w-32 shadow-[0_0_15px_rgba(217,70,239,0.15)] backdrop-blur-md">
                            <div className="text-[9px] font-bold text-fuchsia-400 tracking-wider mb-1">
                              VOTER REACH
                            </div>
                            <div className="text-[12px] font-black text-white">
                              2.4M Citizens
                            </div>
                          </div>

                          {/* Top Right: Manifesto AI */}
                          <div className="absolute top-10 right-10 bg-[#131826] border border-fuchsia-500/40 rounded-lg p-3 text-left w-32 shadow-[0_0_15px_rgba(217,70,239,0.15)] backdrop-blur-md">
                            <div className="text-[9px] font-bold text-fuchsia-400 tracking-wider mb-1">
                              MANIFESTO AI
                            </div>
                            <div className="text-[12px] font-black text-white">
                              GENERATING
                            </div>
                          </div>

                          {/* Concentric Radar Rings */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-fuchsia-500/20 rounded-full z-0" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-fuchsia-500/30 rounded-full z-0" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border border-fuchsia-500/40 rounded-full z-0 bg-fuchsia-500/5" />

                          {/* Horizontal Radar Line */}
                          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-fuchsia-500/40 to-transparent z-0" />

                          {/* Bottom Center: Sentiment & Chart */}
                          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-end justify-center gap-1 z-10 w-full h-16 pointer-events-none">
                            {[40, 60, 30, 80, 45, 30, 60].map((h, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ height: 10 }}
                                animate={{ height: h }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  repeatType: "reverse",
                                  delay: idx * 0.2,
                                }}
                                className="w-4 rounded-t-sm bg-gradient-to-t from-fuchsia-600 to-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.5)] opacity-80"
                              />
                            ))}
                          </div>
                          <div className="absolute bottom-8 right-1/4 translate-x-4 bg-[#131826] border border-fuchsia-500/40 rounded-lg p-2.5 text-left shadow-[0_0_15px_rgba(217,70,239,0.15)] backdrop-blur-md z-20">
                            <div className="text-[9px] font-bold text-fuchsia-400 tracking-wider mb-1">
                              SENTIMENT
                            </div>
                            <div className="text-[11px] font-black text-white">
                              78% Positive ↑
                            </div>
                          </div>
                        </>
                      ) : i === 2 ? (
                        <>
                          {/* Top Right: Call Center Status */}
                          <div className="absolute top-8 right-8 bg-[#131826] border border-cyan-500/40 rounded-lg p-2.5 text-left shadow-[0_0_15px_rgba(6,182,212,0.15)] backdrop-blur-md z-20">
                            <div className="text-[9px] font-bold text-cyan-400 tracking-wider mb-1 uppercase">
                              Call Center
                            </div>
                            <div className="text-[11px] font-black text-white flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
                              24/7 LIVE
                            </div>
                          </div>

                          {/* Language Nodes */}
                          <div className="absolute top-16 left-12 h-10 w-10 rounded-full border border-cyan-500/40 flex items-center justify-center text-xs font-bold text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] bg-[#131826]/80 backdrop-blur-sm z-10">
                            हिंदी
                          </div>
                          <div className="absolute top-16 right-12 h-10 w-10 rounded-full border border-cyan-500/40 flex items-center justify-center text-xs font-bold text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] bg-[#131826]/80 backdrop-blur-sm z-10">
                            தமிழ்
                          </div>
                          <div className="absolute bottom-20 left-12 h-10 w-10 rounded-full border border-cyan-500/40 flex items-center justify-center text-xs font-bold text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] bg-[#131826]/80 backdrop-blur-sm z-10">
                            বাংলা
                          </div>
                          <div className="absolute bottom-20 right-12 h-10 w-16 rounded-full border border-cyan-500/40 flex items-center justify-center text-xs font-bold text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] bg-[#131826]/80 backdrop-blur-sm z-10">
                            English
                          </div>

                          {/* Connecting Lines for Languages */}
                          <svg
                            className="absolute inset-0 h-full w-full pointer-events-none z-0"
                            aria-hidden="true"
                          >
                            <line
                              x1="50%"
                              y1="50%"
                              x2="20%"
                              y2="30%"
                              stroke="rgba(6,182,212,0.3)"
                              strokeWidth="1"
                            />
                            <line
                              x1="50%"
                              y1="50%"
                              x2="80%"
                              y2="30%"
                              stroke="rgba(6,182,212,0.3)"
                              strokeWidth="1"
                            />
                            <line
                              x1="50%"
                              y1="50%"
                              x2="20%"
                              y2="70%"
                              stroke="rgba(6,182,212,0.3)"
                              strokeWidth="1"
                            />
                            <line
                              x1="50%"
                              y1="50%"
                              x2="80%"
                              y2="70%"
                              stroke="rgba(6,182,212,0.3)"
                              strokeWidth="1"
                            />
                          </svg>

                          {/* Audio Waveform */}
                          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
                            {[12, 24, 16, 32, 20, 12, 28, 16, 24, 12].map(
                              (h, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={{ height: 8 }}
                                  animate={{ height: h }}
                                  transition={{
                                    duration: 0.8,
                                    repeat: Infinity,
                                    repeatType: "reverse",
                                    delay: idx * 0.1,
                                  }}
                                  className="w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                                />
                              ),
                            )}
                          </div>

                          {/* Bottom Right: Queries */}
                          <div className="absolute bottom-8 right-8 bg-[#131826] border border-cyan-500/40 rounded-lg p-2.5 text-left shadow-[0_0_15px_rgba(6,182,212,0.15)] backdrop-blur-md z-20">
                            <div className="text-[9px] font-bold text-cyan-400 tracking-wider mb-1 uppercase">
                              Queries
                            </div>
                            <div className="text-[11px] font-black text-white">
                              1,240 Resolved Today
                            </div>
                          </div>
                        </>
                      ) : i === 3 ? (
                        <>
                          {/* City Skyline Silhouette */}
                          <div className="absolute bottom-0 left-0 right-0 h-16 flex items-end opacity-60 pointer-events-none z-0">
                            {[
                              2, 4, 3, 5, 2, 6, 3, 4, 2, 5, 3, 4, 2, 3, 5, 2, 4,
                              3, 2, 5,
                            ].map((h, idx) => (
                              <div
                                key={idx}
                                className="flex-1 bg-cyan-900/40 border-t border-cyan-500/30"
                                style={{ height: `${h * 8}px` }}
                              />
                            ))}
                          </div>

                          {/* Top Left: Traffic Node */}
                          <div className="absolute top-[20%] left-[25%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
                            <div className="h-8 w-8 rounded-full border border-cyan-500/40 bg-[#131826] shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center">
                              <div className="h-4 w-4 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                            </div>
                            <span className="text-[9px] font-bold text-cyan-400 tracking-wider">
                              Traffic
                            </span>
                          </div>

                          {/* Top Right: Power Node */}
                          <div className="absolute top-[25%] left-[75%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
                            <div className="h-8 w-8 rounded-full border border-yellow-500/40 bg-[#131826] shadow-[0_0_15px_rgba(234,179,8,0.3)] flex items-center justify-center">
                              <div className="h-4 w-4 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.8)]" />
                            </div>
                            <span className="text-[9px] font-bold text-yellow-400 tracking-wider">
                              Power
                            </span>
                          </div>

                          {/* Bottom Left: Water Node */}
                          <div className="absolute top-[75%] left-[25%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
                            <div className="h-8 w-8 rounded-full border border-blue-500/40 bg-[#131826] shadow-[0_0_15px_rgba(59,130,246,0.3)] flex items-center justify-center">
                              <div className="h-4 w-4 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                            </div>
                            <span className="text-[9px] font-bold text-blue-400 tracking-wider">
                              Water
                            </span>
                          </div>

                          {/* Bottom Right: Transit Node */}
                          <div className="absolute top-[70%] left-[75%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
                            <div className="h-8 w-8 rounded-full border border-emerald-500/40 bg-[#131826] shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center">
                              <div className="h-4 w-4 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                            </div>
                            <span className="text-[9px] font-bold text-emerald-400 tracking-wider">
                              Transit
                            </span>
                          </div>

                          {/* Connecting Dashed Lines */}
                          <svg
                            className="absolute inset-0 h-full w-full pointer-events-none z-0"
                            aria-hidden="true"
                          >
                            <line
                              x1="50%"
                              y1="50%"
                              x2="25%"
                              y2="20%"
                              stroke="rgba(168,85,247,0.4)"
                              strokeWidth="1.5"
                              strokeDasharray="4 4"
                            />
                            <line
                              x1="50%"
                              y1="50%"
                              x2="75%"
                              y2="25%"
                              stroke="rgba(168,85,247,0.4)"
                              strokeWidth="1.5"
                              strokeDasharray="4 4"
                            />
                            <line
                              x1="50%"
                              y1="50%"
                              x2="25%"
                              y2="75%"
                              stroke="rgba(168,85,247,0.4)"
                              strokeWidth="1.5"
                              strokeDasharray="4 4"
                            />
                            <line
                              x1="50%"
                              y1="50%"
                              x2="75%"
                              y2="70%"
                              stroke="rgba(168,85,247,0.4)"
                              strokeWidth="1.5"
                              strokeDasharray="4 4"
                            />
                          </svg>

                          {/* Floating Status Box - Traffic (Top Left) */}
                          <div className="absolute top-6 left-6 bg-[#131826] border border-cyan-500/40 rounded-lg p-2.5 text-left shadow-[0_0_15px_rgba(6,182,212,0.15)] backdrop-blur-md z-20">
                            <div className="text-[8px] font-bold text-cyan-400 tracking-wider mb-0.5 uppercase">
                              Traffic
                            </div>
                            <div className="text-[11px] font-black text-white flex items-center gap-1.5">
                              Live <span className="text-cyan-400">+</span> 98%
                              Flow
                            </div>
                          </div>

                          {/* Floating Status Box - Power (Top Right) */}
                          <div className="absolute top-6 right-6 bg-[#131826] border border-yellow-500/40 rounded-lg p-2.5 text-left shadow-[0_0_15px_rgba(234,179,8,0.15)] backdrop-blur-md z-20">
                            <div className="text-[8px] font-bold text-yellow-400 tracking-wider mb-0.5 uppercase">
                              Power Grid
                            </div>
                            <div className="text-[11px] font-black text-white">
                              99.9% Uptime
                            </div>
                          </div>

                          {/* Floating Status Box - Smart Hub (Bottom Center Right) */}
                          <div className="absolute bottom-28 right-1/4 translate-x-8 bg-[#131826] border border-purple-500/40 rounded-lg p-2.5 text-left shadow-[0_0_15px_rgba(168,85,247,0.15)] backdrop-blur-md z-20">
                            <div className="text-[8px] font-bold text-purple-400 tracking-wider mb-0.5 uppercase">
                              Smart Hub
                            </div>
                            <div className="text-[11px] font-black text-white">
                              4 Sensors Active
                            </div>
                          </div>
                        </>
                      ) : i === 4 ? (
                        <>
                          {/* Center Shield & Alert Elements */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 overflow-hidden">
                            {/* Background radar sweep */}
                            <div className="absolute top-1/2 left-1/2 w-[800px] h-[800px] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_90deg_at_50%_50%,rgba(59,130,246,0.1)_0deg,transparent_60deg)] animate-[spin_4s_linear_infinite]" />

                            {/* Animated Concentric Rings at bottom */}
                            <div
                              className="absolute bottom-12 w-64 h-24 border border-blue-500/20 rounded-[100%] z-0"
                              style={{ transform: "rotateX(75deg)" }}
                            />
                            <div
                              className="absolute bottom-12 w-48 h-16 border border-blue-500/30 rounded-[100%] z-0"
                              style={{ transform: "rotateX(75deg)" }}
                            />
                            <div
                              className="absolute bottom-12 w-32 h-10 border border-blue-500/40 rounded-[100%] z-0"
                              style={{ transform: "rotateX(75deg)" }}
                            />

                            {/* Laser / Line shooting down */}
                            <div
                              className="absolute top-1/2 left-1/2 w-[1px] h-64 bg-gradient-to-b from-orange-500 to-transparent shadow-[0_0_15px_rgba(249,115,22,0.8)] z-0"
                              style={{
                                transformOrigin: "top center",
                                transform: "rotate(20deg) translate(-15px, 0)",
                              }}
                            />

                            {/* Top Orange Bracket */}
                            <div className="absolute top-[18%] w-40 h-16 border-t border-l border-r border-orange-500/40 z-0" />

                            {/* Large Blue Shield */}
                            <div className="relative flex items-center justify-center z-10 mb-12">
                              <Shield
                                className="w-48 h-48 text-blue-500/80 drop-shadow-[0_0_25px_rgba(59,130,246,0.6)]"
                                strokeWidth={1}
                              />
                              <Shield
                                className="absolute w-40 h-40 text-blue-400/50"
                                strokeWidth={0.5}
                              />

                              {/* Inner Orange Triangle Alert */}
                              <div className="absolute flex items-center justify-center -translate-y-2">
                                <TriangleAlert
                                  className="w-16 h-16 text-orange-500 drop-shadow-[0_0_20px_rgba(249,115,22,0.8)]"
                                  strokeWidth={2}
                                />
                                {/* Pulsing rings behind triangle */}
                                <div className="absolute inset-0 rounded-full border border-orange-500/50 animate-ping" />
                              </div>
                            </div>
                          </div>

                          {/* Emergency Active Label (Bottom Center) */}
                          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-[#131826]/80 border border-orange-500/40 rounded-lg py-2 px-6 text-center shadow-[0_0_20px_rgba(249,115,22,0.15)] backdrop-blur-md z-20 flex flex-col items-center">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                            <div className="text-[9px] font-bold text-orange-500 tracking-widest pl-3 uppercase">
                              Emergency
                            </div>
                            <div className="text-[10px] font-black text-orange-400 pl-3 uppercase">
                              Active
                            </div>
                          </div>

                          {/* Top Left: Alert Status */}
                          <div className="absolute top-8 left-8 bg-[#131826]/80 border border-orange-500/40 rounded-lg p-2.5 text-left shadow-[0_0_15px_rgba(249,115,22,0.15)] backdrop-blur-md z-20">
                            <div className="text-[8px] font-bold text-orange-500 tracking-wider mb-0.5 uppercase">
                              Alert Status
                            </div>
                            <div className="text-[11px] font-black text-white uppercase">
                              Hazard Detected
                            </div>
                          </div>

                          {/* Top Right: Region */}
                          <div className="absolute top-8 right-8 bg-[#131826]/80 border border-blue-500/40 rounded-lg p-2.5 text-left shadow-[0_0_15px_rgba(59,130,246,0.15)] backdrop-blur-md z-20">
                            <div className="text-[8px] font-bold text-blue-400 tracking-wider mb-0.5 uppercase">
                              Region
                            </div>
                            <div className="text-[11px] font-black text-white uppercase">
                              NE-4 Zone
                            </div>
                          </div>

                          {/* Bottom Left: Response */}
                          <div className="absolute bottom-10 left-8 bg-[#131826]/80 border border-green-500/40 rounded-lg p-2.5 text-left shadow-[0_0_15px_rgba(34,197,94,0.15)] backdrop-blur-md z-20">
                            <div className="text-[8px] font-bold text-green-500 tracking-wider mb-0.5 uppercase">
                              Response
                            </div>
                            <div className="text-[11px] font-black text-white uppercase">
                              Active
                            </div>
                          </div>

                          {/* Bottom Right: Broadcast */}
                          <div className="absolute bottom-10 right-8 bg-[#131826]/80 border border-purple-500/40 rounded-lg p-2.5 text-left shadow-[0_0_15px_rgba(168,85,247,0.15)] backdrop-blur-md z-20">
                            <div className="text-[8px] font-bold text-purple-400 tracking-wider mb-0.5 uppercase">
                              Broadcast
                            </div>
                            <div className="text-[11px] font-black text-white uppercase">
                              SMS + Call
                            </div>
                          </div>
                        </>
                      ) : i === 5 ? (
                        <>
                          {/* Dark Grid Background override */}
                          <div className="absolute inset-0 bg-[#0B1511] z-0 pointer-events-none" />
                          <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.05)_1px,transparent_1px)] bg-[size:32px_32px] z-0 pointer-events-none" />

                          {/* Floating Fireflies/Dots */}
                          {[
                            { top: "15%", left: "15%", size: 4, delay: 0 },
                            { top: "35%", left: "35%", size: 3, delay: 1 },
                            { top: "25%", left: "80%", size: 5, delay: 0.5 },
                            { top: "65%", left: "10%", size: 3, delay: 1.5 },
                            { top: "80%", left: "70%", size: 4, delay: 2 },
                            { top: "10%", left: "60%", size: 2, delay: 0.8 },
                            { top: "50%", left: "85%", size: 3, delay: 1.2 },
                          ].map((firefly, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0.2, y: 0 }}
                              animate={{
                                opacity: [0.2, 0.8, 0.2],
                                y: [-10, 10, -10],
                              }}
                              transition={{
                                duration: 3 + Math.random() * 2,
                                repeat: Infinity,
                                delay: firefly.delay,
                              }}
                              className="absolute rounded-full bg-green-400 shadow-[0_0_10px_rgba(34,197,94,0.8)] z-10"
                              style={{
                                top: firefly.top,
                                left: firefly.left,
                                width: firefly.size,
                                height: firefly.size,
                              }}
                            />
                          ))}

                          {/* Center Plant Icon */}
                          <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-10">
                            <div className="absolute inset-0 bg-green-500/20 blur-[40px] rounded-full scale-150" />
                            <m.icon
                              className="h-16 w-16 text-green-400 drop-shadow-[0_0_20px_rgba(34,197,94,0.8)] z-10"
                              strokeWidth={1}
                            />

                            {/* Scanning horizontal line over plant */}
                            <motion.div
                              animate={{ y: [-20, 20, -20] }}
                              transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                              className="absolute w-24 h-[1.5px] bg-green-400 shadow-[0_0_15px_rgba(34,197,94,0.8)] z-20"
                            />

                            {/* Small concentric circles below plant */}
                            <div className="absolute -bottom-6 w-12 h-2 border border-green-500/40 rounded-[100%]" />
                            <div className="absolute -bottom-5 w-6 h-1 border border-green-500/60 rounded-[100%]" />
                          </div>

                          {/* Top Left: Villages Box */}
                          <div className="absolute top-8 left-8 bg-[#131826]/90 border border-cyan-500/40 rounded-lg p-3 text-left shadow-[0_0_15px_rgba(6,182,212,0.15)] backdrop-blur-md z-20">
                            <div className="text-[9px] font-bold text-cyan-400 tracking-wider mb-1 uppercase">
                              Villages
                            </div>
                            <div className="text-[12px] font-black text-white">
                              6,48,000 Covered
                            </div>
                          </div>

                          {/* Top Right: Subsidies Box */}
                          <div className="absolute top-8 right-8 bg-[#131826]/90 border border-yellow-500/40 rounded-lg p-3 text-left shadow-[0_0_15px_rgba(234,179,8,0.15)] backdrop-blur-md z-20">
                            <div className="text-[9px] font-bold text-yellow-400 tracking-wider mb-1 uppercase">
                              Subsidies
                            </div>
                            <div className="text-[12px] font-black text-white">
                              ₹2.4K Cr Disbursed
                            </div>
                          </div>

                          {/* Bottom List of Programs */}
                          <div className="absolute bottom-6 left-8 right-8 flex flex-col gap-2 z-20">
                            {[
                              { name: "PM Gramin Sadak", status: "Active" },
                              { name: "MGNREGS", status: "Active" },
                              { name: "Jal Jeevan Mission", status: "Active" },
                              { name: "PM Awas Yojana", status: "Active" },
                            ].map((program, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between bg-[#131826]/60 border border-green-500/20 rounded px-4 py-2 backdrop-blur-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                                  <span className="text-[10px] font-bold text-cyan-400">
                                    {program.name}
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold text-green-400">
                                  {program.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : i === 6 ? (
                        <>
                          {/* Dark Grid Background override */}
                          <div className="absolute inset-0 bg-[#0B100C] z-0 pointer-events-none rounded-[2rem]" />
                          <div className="absolute inset-0 bg-[linear-gradient(rgba(181,240,44,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(181,240,44,0.03)_1px,transparent_1px)] bg-[size:32px_32px] z-0 pointer-events-none rounded-[2rem]" />

                          {/* Connecting Line from AI Scan */}
                          <div className="absolute top-[42px] left-[130px] w-[80px] h-[1px] bg-[#b5f02c]/40 z-0" />

                          {/* Connecting Line from Soil Health */}
                          <div className="absolute top-[42px] right-[145px] w-[60px] h-[1px] bg-[#b5f02c]/40 z-0" />

                          {/* Top Left: AI Scan Status */}
                          <div className="absolute top-6 left-6 bg-[#0D1218]/90 border border-[#b5f02c]/30 rounded-lg py-2 px-3 text-left shadow-lg backdrop-blur-md z-20">
                            <div className="text-[9px] font-bold text-[#b5f02c] tracking-wider mb-0.5 uppercase">
                              AI Scan
                            </div>
                            <div className="text-[13px] font-black text-white flex items-center gap-1.5">
                              <Sprout className="w-4 h-4 text-[#b5f02c]" /> Crop
                              Healthy
                            </div>
                          </div>

                          {/* Top Right: Soil Health */}
                          <div className="absolute top-6 right-6 bg-[#0D1218]/90 border border-[#b5f02c]/30 rounded-lg py-2 px-3 text-left shadow-lg backdrop-blur-md z-20 min-w-[120px]">
                            <div className="text-[9px] font-bold text-[#b5f02c] tracking-wider mb-0.5 uppercase">
                              Soil Health
                            </div>
                            <div className="text-[13px] font-black text-white">
                              pH 6.8 — Optimal
                            </div>
                          </div>

                          {/* Central Leaf Scanning Graphic */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] flex items-center justify-center z-10 w-56 h-56">
                            <div className="absolute inset-0 bg-[#b5f02c]/5 blur-[60px] rounded-full scale-150" />

                            {/* SVG Leaf Outline - smoother shield like shape */}
                            <svg
                              className="absolute w-48 h-48 text-[#b5f02c]/80 drop-shadow-[0_0_10px_rgba(181,240,44,0.3)]"
                              viewBox="0 0 100 100"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="0.8"
                            >
                              <path d="M50 90 C 20 70 10 40 15 25 C 25 15 40 10 50 10 C 60 10 75 15 85 25 C 90 40 80 70 50 90 Z" />
                            </svg>

                            {/* Center vertical line */}
                            <div className="absolute top-[8%] bottom-[8%] w-[2px] bg-[#b5f02c] shadow-[0_0_15px_rgba(181,240,44,0.8)] z-10" />

                            {/* Scanning wavy lines crossing center */}
                            <svg
                              className="absolute w-full h-full pointer-events-none z-10"
                              viewBox="0 0 100 100"
                            >
                              <path
                                d="M40 35 C 50 25 60 45 45 40"
                                fill="none"
                                stroke="rgba(181,240,44,0.6)"
                                strokeWidth="0.5"
                              />
                              <path
                                d="M55 50 C 40 60 55 70 40 55"
                                fill="none"
                                stroke="rgba(181,240,44,0.6)"
                                strokeWidth="0.5"
                              />
                              <path
                                d="M30 45 Q 50 50 70 40"
                                fill="none"
                                stroke="rgba(181,240,44,0.4)"
                                strokeWidth="0.5"
                              />
                            </svg>

                            {/* Nodes inside leaf */}
                            <div className="absolute top-[32%] left-[38%] w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.8)] z-20" />
                            <div className="absolute top-[55%] left-[44%] w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.8)] z-20" />
                            <div className="absolute top-[42%] right-[36%] w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-[0_0_15px_rgba(239,68,68,1)] animate-pulse z-20" />
                          </div>

                          {/* Line from Pest Alert to red node */}
                          <div
                            className="absolute top-[41%] right-[125px] w-[50px] h-[1px] bg-red-500/40 z-0"
                            style={{ transform: "rotate(-10deg)" }}
                          />

                          {/* Dotted horizontal line below leaf */}
                          <div className="absolute top-[72%] left-[35%] right-[35%] h-[1px] border-t-2 border-dashed border-[#b5f02c]/60 z-0" />

                          {/* Pest Alert Floating Box */}
                          <div className="absolute top-[38%] right-6 bg-[#0D1218]/90 border border-red-500/40 rounded-sm py-1.5 px-3 text-left shadow-[0_0_15px_rgba(239,68,68,0.2)] backdrop-blur-md z-20 flex flex-col justify-center">
                            <div className="flex items-center gap-1.5">
                              <TriangleAlert className="w-3 h-3 text-red-500 fill-red-500/20" />
                              <div className="text-[8px] font-bold text-red-500 tracking-wider uppercase">
                                Pest Alert
                              </div>
                            </div>
                            <div className="text-[10px] font-bold text-slate-300 mt-0.5 ml-4">
                              Node C2
                            </div>
                          </div>

                          {/* Bottom 4 Weather/Soil Cards */}
                          <div className="absolute bottom-6 left-6 right-6 grid grid-cols-4 gap-3 z-20">
                            {[
                              {
                                label: "Sunny",
                                value: "34°C",
                                icon: Sun,
                                iconColor: "text-amber-500 fill-amber-500",
                              },
                              {
                                label: "Humidity",
                                value: "62%",
                                icon: Droplets,
                                iconColor: "text-blue-400 fill-blue-400",
                              },
                              {
                                label: "Wind",
                                value: "14 km/h",
                                icon: Wind,
                                iconColor: "text-cyan-400",
                              },
                              {
                                label: "Rain",
                                value: "Low Risk",
                                icon: CloudRain,
                                iconColor: "text-indigo-400 fill-indigo-400/30",
                              },
                            ].map((item, idx) => (
                              <div
                                key={idx}
                                className="bg-[#0D1218]/90 border border-slate-700/50 rounded-xl py-3 px-2 flex flex-col items-center justify-center gap-1.5 backdrop-blur-md shadow-lg"
                              >
                                <item.icon
                                  className={`w-5 h-5 ${item.iconColor}`}
                                  strokeWidth={1.5}
                                />
                                <div className="text-center mt-1">
                                  <div className="text-[8px] font-black tracking-wider uppercase text-[#b5f02c] mb-0.5">
                                    {item.label}
                                  </div>
                                  <div className="text-[11px] font-black text-white">
                                    {item.value}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : i === 7 ? (
                        <>
                          {/* Dark Background */}
                          <div className="absolute inset-0 bg-[#0B0910] z-0 pointer-events-none rounded-[2rem]" />
                          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] z-0 pointer-events-none rounded-[2rem]" />

                          {/* Top floating label */}
                          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#13101A]/90 border border-orange-500/30 rounded py-1.5 px-3 text-left shadow-[0_0_15px_rgba(249,115,22,0.15)] backdrop-blur-md z-20 flex flex-col justify-center items-center">
                            <div className="text-[7px] font-bold text-orange-500 tracking-widest mb-0.5 uppercase">
                              Complaint Engine
                            </div>
                            <div className="text-[10px] font-black text-white flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                              AI ROUTING ACTIVE
                            </div>
                          </div>

                          {/* 3 Columns for Kanban board style */}
                          <div className="absolute inset-0 top-20 bottom-20 px-6 grid grid-cols-3 gap-3 z-10">
                            {/* Column 1: NEW */}
                            <div className="flex flex-col gap-2">
                              {/* Header */}
                              <div className="flex items-center gap-1.5 bg-[#13101A]/80 border border-orange-500/20 rounded py-1 px-2 mb-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                <span className="text-[8px] font-bold text-orange-500 uppercase tracking-widest">
                                  New
                                </span>
                              </div>
                              {/* Card 1 */}
                              <div className="bg-[#13101A]/90 border border-slate-700/50 rounded py-2.5 px-2.5 shadow-sm text-left">
                                <div className="text-[9px] font-bold text-slate-200 leading-tight">
                                  Road Pothole — Sector 4
                                </div>
                              </div>
                            </div>

                            {/* Column 2: ROUTING */}
                            <div className="flex flex-col gap-2 relative">
                              {/* Header */}
                              <div className="flex items-center gap-1.5 bg-[#13101A]/80 border border-blue-500/30 rounded py-1 px-2 mb-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                <span className="text-[8px] font-bold text-blue-500 uppercase tracking-widest">
                                  Routing
                                </span>
                              </div>
                              {/* Card 1 */}
                              <div className="bg-[#13101A]/90 border border-blue-500/20 rounded py-2.5 px-2.5 shadow-sm text-left">
                                <div className="text-[9px] font-bold text-slate-200 leading-tight mb-2">
                                  Streetlight Fault — MG Rd
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-1">
                                  <div className="bg-blue-500 h-1 rounded-full w-[40%]" />
                                </div>
                              </div>
                              {/* Card 2 */}
                              <div className="bg-[#13101A]/90 border border-blue-500/20 rounded py-2.5 px-2.5 shadow-sm text-left">
                                <div className="text-[9px] font-bold text-slate-200 leading-tight mb-2">
                                  Water Leakage — Block B
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-1">
                                  <div className="bg-blue-500 h-1 rounded-full w-[70%]" />
                                </div>
                              </div>
                              {/* Arrow */}
                              <div className="mt-0.5 text-blue-500 font-bold text-[12px] flex items-center">
                                <ArrowRight className="w-3 h-3" />
                              </div>
                            </div>

                            {/* Column 3: RESOLVED */}
                            <div className="flex flex-col gap-2">
                              {/* Header */}
                              <div className="flex items-center gap-1.5 bg-[#13101A]/80 border border-green-500/20 rounded py-1 px-2 mb-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                <span className="text-[8px] font-bold text-green-500 uppercase tracking-widest">
                                  Resolved
                                </span>
                              </div>
                              {/* Card 1 */}
                              <div className="bg-[#13101A]/90 border border-green-500/20 rounded py-2.5 px-2.5 shadow-sm text-left">
                                <div className="text-[9px] font-bold text-slate-200 leading-tight mb-1.5">
                                  Garbage Pickup — Ward 7
                                </div>
                                <div className="text-[8px] font-bold text-green-500 flex items-center gap-1">
                                  ✓ Closed
                                </div>
                              </div>
                              {/* Card 2 */}
                              <div className="bg-[#13101A]/90 border border-green-500/20 rounded py-2.5 px-2.5 shadow-sm text-left">
                                <div className="text-[9px] font-bold text-slate-200 leading-tight mb-1.5">
                                  Park Maintenance
                                </div>
                                <div className="text-[8px] font-bold text-green-500 flex items-center gap-1">
                                  ✓ Closed
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Bottom Row Stats */}
                          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between z-20">
                            {/* Left Stat */}
                            <div className="bg-[#13101A]/90 border border-slate-700/50 rounded p-2 text-center shadow-lg min-w-[50px]">
                              <div className="text-[11px] font-black text-orange-500">
                                124
                              </div>
                              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                Open
                              </div>
                            </div>

                            {/* Center Stat */}
                            <div className="bg-[#13101A]/90 border border-slate-700/50 rounded p-2 text-center shadow-lg min-w-[60px]">
                              <div className="text-[11px] font-black text-green-500">
                                89%
                              </div>
                              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                SLA Met
                              </div>
                            </div>

                            {/* Right Stat */}
                            <div className="bg-[#13101A]/90 border border-slate-700/50 rounded p-2 text-center shadow-lg min-w-[60px]">
                              <div className="text-[11px] font-black text-blue-500">
                                6.4m
                              </div>
                              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                Avg Close
                              </div>
                            </div>
                          </div>
                        </>
                      ) : i === 8 ? (
                        <>
                          {/* Dark Background */}
                          <div className="absolute inset-0 bg-[#090514] z-0 pointer-events-none rounded-[2rem]" />
                          <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:32px_32px] z-0 pointer-events-none rounded-[2rem]" />

                          {/* Center Microphone & Rings */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] flex items-center justify-center z-10 w-64 h-64">
                            <div className="absolute inset-0 bg-violet-600/10 blur-[50px] rounded-full scale-150" />

                            {/* Radar rings */}
                            <div className="absolute w-24 h-24 border border-violet-500/30 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
                            <div className="absolute w-40 h-40 border border-violet-500/20 rounded-full" />
                            <div className="absolute w-56 h-56 border border-violet-500/10 rounded-full" />

                            {/* Horizontal scan line */}
                            <div className="absolute w-[150%] h-[1px] bg-violet-500/20 z-0" />

                            {/* Microphone Icon */}
                            <div className="relative z-20 flex flex-col items-center bg-[#090514] rounded-full p-3">
                              <m.icon
                                className="w-10 h-10 text-violet-400 drop-shadow-[0_0_15px_rgba(139,92,246,0.6)]"
                                strokeWidth={1}
                              />
                            </div>
                          </div>

                          {/* Floating Language Bubbles */}
                          {[
                            { lang: "Kannada", top: "15%", left: "45%" },
                            { lang: "Gujarati", top: "25%", left: "15%" },
                            { lang: "Malayalam", top: "25%", left: "65%" },
                            { lang: "Marathi", top: "45%", left: "5%" },
                            { lang: "Hindi", top: "45%", left: "75%" },
                            { lang: "Telugu", top: "65%", left: "15%" },
                            { lang: "Bengali", top: "75%", left: "35%" },
                          ].map((l, idx) => (
                            <div
                              key={idx}
                              className="absolute bg-[#1A102A]/80 border border-violet-500/30 rounded-full px-3 py-1 text-[8px] font-bold text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.2)] backdrop-blur-md z-20"
                              style={{ top: l.top, left: l.left }}
                            >
                              {l.lang}
                            </div>
                          ))}

                          {/* Bottom Waveform & Tamil */}
                          <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 flex items-center justify-center gap-1 z-20 w-full px-8">
                            {[12, 16, 24, 18, 32, 20, 14, 28].map((h, idx) => (
                              <motion.div
                                key={`left-${idx}`}
                                animate={{ height: [h * 0.6, h, h * 0.6] }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  delay: idx * 0.1,
                                }}
                                className="w-1.5 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]"
                                style={{ height: h }}
                              />
                            ))}
                            <div className="px-2 text-[9px] font-bold text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.2)]">
                              Tamil
                            </div>
                            {[28, 14, 20, 32, 18, 24, 16, 12].map((h, idx) => (
                              <motion.div
                                key={`right-${idx}`}
                                animate={{ height: [h * 0.6, h, h * 0.6] }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  delay: idx * 0.1,
                                }}
                                className="w-1.5 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]"
                                style={{ height: h }}
                              />
                            ))}
                          </div>

                          {/* Top Right Floating Box */}
                          <div className="absolute top-6 right-6 bg-[#1A102A]/90 border border-violet-500/40 rounded-lg py-2 px-3 text-left shadow-[0_0_15px_rgba(139,92,246,0.2)] backdrop-blur-md z-30 min-w-[130px]">
                            <div className="text-[8px] font-bold text-violet-400 tracking-wider mb-0.5 uppercase">
                              Voice AI
                            </div>
                            <div className="text-[9px] font-black text-white flex items-center gap-1.5 uppercase tracking-wide">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                              Listening — 8 Langs
                            </div>
                          </div>

                          {/* Bottom Right Floating Box */}
                          <div className="absolute bottom-6 right-6 bg-[#1A102A]/90 border border-violet-500/40 rounded-lg py-2 px-3 text-left shadow-[0_0_15px_rgba(139,92,246,0.2)] backdrop-blur-md z-30 min-w-[130px]">
                            <div className="text-[8px] font-bold text-violet-400 tracking-wider mb-0.5 uppercase">
                              Queries
                            </div>
                            <div className="text-[10px] font-black text-white">
                              98% Recognition Rate
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Generic Dark Mockups for other modules */
                        <>
                          {i % 3 === 0 && (
                            <div className="absolute top-6 left-6 bg-[#131826] px-4 py-2 rounded-lg border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] text-xs font-bold text-emerald-400 flex items-center gap-2 backdrop-blur-md">
                              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />{" "}
                              System Online
                            </div>
                          )}
                          {i % 3 === 1 && (
                            <div className="absolute bottom-6 right-6 bg-[#131826] px-4 py-2 rounded-lg border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)] text-xs font-mono text-cyan-400 backdrop-blur-md">
                              &gt; syncing data...
                            </div>
                          )}
                          {i % 3 === 2 && (
                            <div className="absolute top-1/2 -right-2 bg-[#131826] p-3 rounded-xl border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)] text-xs font-bold text-indigo-400 backdrop-blur-md">
                              + 124 Tasks Active
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SPATIAL RADAR CTA SECTION ── */}
      <section
        id="civicpulse"
        className="relative py-40 overflow-hidden bg-slate-50"
      >
        {/* Animated Perspective Grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(99,102,241,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.1) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            transform:
              "perspective(1000px) rotateX(70deg) translateY(100px) scale(2)",
            transformOrigin: "bottom",
          }}
        />

        {/* Glowing Radar Core */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none">
          <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute inset-20 border border-indigo-400/20 rounded-full animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <div className="absolute inset-40 border border-indigo-400/30 rounded-full animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite_1s]" />
          <div className="absolute inset-60 border border-indigo-400/40 rounded-full" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 lg:px-8 z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="flex flex-col items-center text-center"
          >
            <div className="h-24 w-24 rounded-full bg-white shadow-2xl shadow-indigo-500/20 border border-slate-100 flex items-center justify-center mb-8 relative">
              <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-50" />
              <Activity className="h-10 w-10 text-indigo-600 relative z-10" />
            </div>

            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 mb-6 leading-[1.1]">
              The Core is{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-500">
                Active.
              </span>
            </h2>

            <p className="text-lg md:text-xl text-slate-500 font-medium mb-10 max-w-2xl leading-relaxed">
              Step into the control center. Integrate your municipality's data
              and unleash the intelligence of CivicSaathi.
            </p>

            <Button
              asChild
              size="xl"
              className="h-16 px-12 rounded-full bg-slate-900 text-white hover:bg-slate-800 hover:-translate-y-1 font-black text-lg shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3)] transition-all duration-300 group"
            >
              <Link to="/portal">
                Deploy Now{" "}
                <ArrowRight className="ml-4 h-6 w-6 group-hover:translate-x-2 transition-transform" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <SiteFooter />

      <style>{`
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        @keyframes spin-slow {
          from { transform: rotateX(var(--rx, 0)) rotateY(var(--ry, 0)) rotateZ(0deg); }
          to { transform: rotateX(var(--rx, 0)) rotateY(var(--ry, 0)) rotateZ(360deg); }
        }
      `}</style>
    </div>
  );
}
