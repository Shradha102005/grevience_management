import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

export function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const text =
    variant === "light" ? "text-sidebar-foreground" : "text-foreground";
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <span
        className={`font-display text-lg font-extrabold tracking-tight ${text}`}
      >
        CIVICOS <span className="text-accent">AI</span>
      </span>
    </Link>
  );
}
