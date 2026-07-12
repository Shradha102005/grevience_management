import { Link } from "@tanstack/react-router";

export function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const text =
    variant === "light" ? "text-sidebar-foreground" : "text-foreground";
  return (
    <Link to="/" className="flex items-center gap-1">
      <img
        src="/logo.png"
        alt="CivicSaathi Logo"
        className="h-9 w-9 shrink-0 object-contain"
      />
      <span className={`font-display text-xl font-extrabold tracking-tight ${text}`}>
        Civic<span className="text-indigo-600">Saathi</span>
      </span>
    </Link>
  );
}
