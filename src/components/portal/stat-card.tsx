import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  trend = "up",
  icon: Icon,
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down";
  icon?: LucideIcon;
}) {
  return (
    <Card className="p-5 shadow-card">
      <div className="flex items-start justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon && (
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-primary">
            <Icon className="h-[1.1rem] w-[1.1rem]" />
          </span>
        )}
      </div>
      <div className="mt-3 font-display text-2xl font-extrabold tracking-tight">{value}</div>
      {delta && (
        <div
          className={cn(
            "mt-1 inline-flex items-center gap-1 text-xs font-medium",
            trend === "up" ? "text-success" : "text-destructive",
          )}
        >
          {trend === "up" ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
          {delta}
        </div>
      )}
    </Card>
  );
}
