import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

const NAV = [
  { label: "Architecture", href: "#architecture" },
  { label: "Modules", href: "#modules" },
  { label: "CivicPulse", href: "#civicpulse" },
];

export function SiteHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl">
      <div className="mx-auto flex py-3 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">

        {/* Left — Logo */}
        <Logo />

        {/* Center — Glassmorphic Nav Pill */}
        <nav className="hidden md:flex items-center gap-1 rounded-full border border-white/30 bg-white/20 dark:bg-white/5 dark:border-white/10 backdrop-blur-xl shadow-lg shadow-black/5 px-2 py-1.5">
          {NAV.map((n) => (
            <a
              key={n.label}
              href={n.href}
              className="px-4 py-1.5 rounded-full text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200"
            >
              {n.label}
            </a>
          ))}
        </nav>

        {/* Right — CTA */}
        <Button
          asChild
          className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 shadow-md shadow-indigo-500/30 transition-all hover:scale-105"
        >
          <Link to="/portal">Enter Portal</Link>
        </Button>

      </div>
    </header>
  );
}
