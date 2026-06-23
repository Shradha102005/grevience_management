import { Check, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function FeatureGrid({ features }: { features: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((f) => (
        <Card key={f} className="flex items-center gap-3 p-4 shadow-card">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-success/15 text-success">
            <Check className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium">{f}</span>
        </Card>
      ))}
    </div>
  );
}

export function HighlightCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
}) {
  return (
    <Card className="p-5 shadow-card">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 font-display text-base font-bold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
    </Card>
  );
}
