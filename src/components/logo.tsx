import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

export function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const text = variant === "light" ? "text-sidebar-foreground" : "text-foreground";
  return (
    <Link to="/" className="flex items-center gap-1">
      <div 
        className="h-10 w-10 bg-foreground shrink-0" 
        style={{
          WebkitMaskImage: 'url(/logo.png)',
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskImage: 'url(/logo.png)',
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
        }}
      />
      <span className={`font-display text-xl font-extrabold tracking-tight ${text}`}>
        Civic<span className="text-indigo-600">Saathi</span>
      </span>
    </Link>
  );
}
