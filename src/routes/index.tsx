import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import heroImg from "@/assets/hero-dashboard.jpg";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { MODULES, STATS, TRUST_POINTS } from "@/lib/modules";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CIVICOS AI — AI-Powered Citizen Governance Platform" },
      {
        name: "description",
        content:
          "Transform citizen services with AI-powered governance. One unified platform for schemes, grievances, emergency response, municipal services and voice assistants.",
      },
      { property: "og:title", content: "CIVICOS AI — AI-Powered Citizen Governance Platform" },
      {
        property: "og:description",
        content:
          "One unified platform for schemes, grievances, emergency response, municipal services and governance automation.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="bg-hero">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28 lg:px-8">
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Modern Government Technology Platform
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.07] tracking-tight sm:text-5xl lg:text-6xl">
              Transform Citizen Services with{" "}
              <span className="text-gradient">AI-Powered Governance</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              One unified platform for schemes, grievances, emergency response, municipal services,
              citizen engagement, voice assistants and governance automation.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild variant="hero" size="xl">
                <Link to="/portal">
                  Enter Portal <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link to="/portal">Request Demo</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["No-setup deployment", "Multilingual", "Voice-first"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" /> {t}
                </span>
              ))}
            </div>
          </div>

          <div className="relative animate-scale-in">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-primary/10 blur-2xl" />
            <img
              src={heroImg}
              alt="CIVICOS AI governance dashboard with analytics, maps and citizen service data"
              width={1280}
              height={960}
              className="w-full rounded-2xl border border-border shadow-elevated"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="border-y border-border bg-card/60">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
            {STATS.map((s) => (
              <div key={s.label} className="py-8 text-center">
                <div className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
                  {s.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features / Modules */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            Unified Modules
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Every citizen service, one governance operating system
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Nine production-grade modules working together — from scheme discovery to disaster
            response — all powered by AI and accessible by voice.
          </p>
        </div>

        <div id="modules" className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <Link
              key={m.id}
              to={m.href}
              className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-primary/40"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <m.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 font-display text-lg font-bold">{m.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{m.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Open module <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-accent">
              Built for the public sector
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Trusted, secure and government-ready
            </h2>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TRUST_POINTS.map((t) => (
              <div key={t.title} className="rounded-2xl border border-border bg-background p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                  <h3 className="font-display text-base font-bold">{t.title}</h3>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-border bg-primary px-8 py-16 text-center shadow-elevated">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold tracking-tight text-primary-foreground sm:text-4xl">
            Ready to modernize citizen governance?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
            Launch the unified CIVICOS AI portal and bring all nine governance modules online.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="xl" variant="secondary">
              <Link to="/portal">
                Enter Portal <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
