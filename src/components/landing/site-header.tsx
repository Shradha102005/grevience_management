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
    <header className="sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <a
              key={n.label}
              href={n.href}
              className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button
            asChild
            className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6"
          >
            <Link to="/portal">Enter Portal</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
