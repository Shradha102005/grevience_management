import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Terminal, Activity, BrainCircuit } from "lucide-react";
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
    <div className="min-h-screen bg-slate-50 font-sans overflow-hidden text-slate-900 selection:bg-indigo-500/30" onMouseMove={handleMouseMove}>
      
      {/* Light Theme Header */}
      <div className="absolute top-0 w-full z-50 bg-white/50 backdrop-blur-md border-b border-slate-200">
        <SiteHeader />
      </div>

      {/* ── 3D HERO SECTION ── */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden perspective-[2000px]">
        
        {/* Abstract 3D Geometric Core */}
        <motion.div 
          style={{ y, opacity, rotateX: transformY, rotateY: transformX }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none transform-style-3d z-0"
        >
          <div className="relative w-[600px] h-[600px] flex items-center justify-center">
            {/* Core Glow */}
            <div className="absolute w-[200px] h-[200px] bg-indigo-500/20 rounded-full blur-[100px]" />
            <div className="absolute w-[300px] h-[300px] bg-cyan-400/20 rounded-full blur-[120px] mix-blend-multiply" />
            
            {/* 3D Wireframe Rings */}
            {[...Array(6)].map((_, i) => (
              <div 
                key={i}
                className="absolute inset-0 rounded-full border border-indigo-300/40 shadow-[0_0_50px_rgba(99,102,241,0.05)_inset]"
                style={{
                  transform: `rotateX(${i * 30}deg) rotateY(${i * 15}deg)`,
                  animation: `spin-slow ${20 + i * 5}s linear infinite ${i % 2 === 0 ? 'reverse' : ''}`
                }}
              />
            ))}
            
            {/* Outer Data Particles */}
            <div className="absolute inset-[-50%] border border-cyan-400/20 rounded-full border-dashed animate-[spin_60s_linear_infinite]" />
            <div className="absolute inset-[-100%] border border-indigo-400/10 rounded-full animate-[spin_90s_linear_infinite_reverse]" />
          </div>
        </motion.div>

        {/* Ambient Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.05)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)] pointer-events-none z-0" style={{ transform: "perspective(1000px) rotateX(60deg) translateY(-200px) scale(3)", transformOrigin: "top" }} />

        {/* Typography & Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 text-center flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/60 backdrop-blur-md px-4 py-1.5 text-xs font-black uppercase tracking-widest text-indigo-600 shadow-sm mb-8">
              <Activity className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
              Civicos OS Engine v2.0
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-[90px] font-black text-slate-900 tracking-tighter leading-[0.9] mb-8">
              Build the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500">
                Future.
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-500 font-medium max-w-2xl mx-auto mb-12 leading-relaxed">
              A deeply integrated, AI-native operating system for modern governance. Data-driven, spatial, and infinitely scalable.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center w-full">
              <Button asChild className="h-16 px-10 rounded-full bg-indigo-600 text-white font-black text-lg transition-transform hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(99,102,241,0.3)] hover:bg-indigo-700">
                <Link to="/portal">
                  Deploy OS <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-16 px-10 rounded-full bg-white backdrop-blur-md border-slate-200 text-slate-700 font-bold text-lg hover:bg-slate-50 hover:text-indigo-600 transition-transform hover:scale-105 active:scale-95 shadow-sm">
                <Link to="/portal">
                  <Terminal className="mr-2 h-5 w-5 text-slate-400" /> Read the Docs
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── PLATFORM CAPABILITIES SECTION ── */}
      <section className="relative py-32 bg-white z-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-6">
              A Unified Governance Architecture.
            </h2>
            <p className="text-lg text-slate-500 font-semibold leading-relaxed">
              CIVICOS OS isn't just a collection of apps. It is a deeply integrated platform built on three core pillars that transform how municipalities operate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                title: "Voice-First Multilingual AI",
                desc: "Break down the digital divide. Citizens can access schemes, file grievances, and get information simply by talking to the platform in their native regional language.",
                icon: "🗣️"
              },
              {
                title: "Unified Data Lake",
                desc: "No more data silos. From traffic sensors to public health reports and citizen grievances, all data flows into a single, intelligent backend for real-time analytics.",
                icon: "📊"
              },
              {
                title: "Automated Workflows",
                desc: "Remove bureaucratic bottlenecks. The AI automatically routes complaints to the right officers, verifies scheme eligibility, and triggers emergency alerts instantly.",
                icon: "⚡"
              }
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
                <h3 className="text-xl font-black text-slate-900 mb-4">{feature.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>



      {/* ── MODULE DEEP DIVES (ALTERNATING LAYOUT) ── */}
      <section className="relative py-32 bg-slate-50 z-20 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 space-y-32">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-6">
              Nine Modules. <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-indigo-600">One Brain.</span>
            </h2>
            <p className="text-xl text-slate-500 font-medium">
              Every tool your municipality needs, broken down into powerful, native applications.
            </p>
          </div>

          {MODULES.map((m, i) => {
            const isEven = i % 2 === 0;
            return (
              <div key={m.id} className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-16`}>
                
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
                    <Button asChild className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
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
                  <div className="bg-white rounded-[2rem] p-6 shadow-2xl shadow-indigo-500/10 border border-slate-200 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    
                    <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 flex flex-col items-center justify-center min-h-[300px] relative z-10">
                      <div className="h-20 w-20 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                        <m.icon className="h-10 w-10 text-indigo-600" />
                      </div>
                      <div className="text-center space-y-3">
                        <div className="h-3 w-48 bg-slate-200 rounded-full mx-auto" />
                        <div className="h-3 w-32 bg-slate-200 rounded-full mx-auto" />
                        <div className="h-3 w-40 bg-slate-200 rounded-full mx-auto" />
                      </div>
                      
                      {/* Floating UI Elements based on index */}
                      {i % 3 === 0 && (
                        <div className="absolute top-4 left-4 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-xs font-bold text-emerald-600 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> System Online
                        </div>
                      )}
                      {i % 3 === 1 && (
                        <div className="absolute bottom-4 right-4 bg-slate-900 px-3 py-1.5 rounded-lg shadow-xl text-xs font-mono text-cyan-400">
                          &gt; syncing data...
                        </div>
                      )}
                      {i % 3 === 2 && (
                        <div className="absolute top-1/2 -right-4 bg-white p-2 rounded-xl border border-slate-200 shadow-lg text-xs font-bold text-indigo-600">
                          + 124 Tasks
                        </div>
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
      <section className="relative py-40 overflow-hidden bg-slate-50">
        
        {/* Animated Perspective Grid */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-40" 
          style={{ 
            backgroundImage: "linear-gradient(rgba(99,102,241,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.1) 1px, transparent 1px)", 
            backgroundSize: "80px 80px",
            transform: "perspective(1000px) rotateX(70deg) translateY(100px) scale(2)",
            transformOrigin: "bottom"
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
              The Core is <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-500">Active.</span>
            </h2>
            
            <p className="text-lg md:text-xl text-slate-500 font-medium mb-10 max-w-2xl leading-relaxed">
              Step into the control center. Integrate your municipality's data and unleash the intelligence of CIVICOS OS.
            </p>
            
            <Button asChild size="xl" className="h-16 px-12 rounded-full bg-slate-900 text-white hover:bg-slate-800 hover:-translate-y-1 font-black text-lg shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3)] transition-all duration-300 group">
              <Link to="/portal">
                Deploy Now <ArrowRight className="ml-4 h-6 w-6 group-hover:translate-x-2 transition-transform" />
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
