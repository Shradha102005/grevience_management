import { Link } from "@tanstack/react-router";

const COLUMNS = [
  { title: "Platform", links: ["Services", "Departments", "Modules", "Voice Interface"] },
  { title: "Resources", links: ["Help Center", "Documentation", "API Status", "Changelog"] },
  { title: "Legal", links: ["Privacy Policy", "Terms", "Security", "Accessibility"] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <div className="font-display text-lg font-extrabold tracking-tight">
              CivicSaathi <span className="text-accent">AI</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              The unified AI-powered platform for citizen governance ΓÇö schemes, grievances,
              emergency response and municipal services in one secure system.
            </p>
            <Link
              to="/portal"
              className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline"
            >
              Enter the governance portal ΓåÆ
            </Link>
          </div>
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <h4 className="text-sm font-semibold">{c.title}</h4>
              <ul className="mt-4 space-y-3">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>┬⌐ {new Date().getFullYear()} CivicSaathi. Government technology, reimagined.</p>
          <p>Built for public-sector scale ┬╖ ISO-aligned ┬╖ Multilingual</p>
        </div>
      </div>
    </footer>
  );
}
