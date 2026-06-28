import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Chart from "react-apexcharts";

export function StatCard({
  label,
  value,
  delta,
  trend = "up",
  icon: Icon,
  data,
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down";
  icon?: LucideIcon;
  data?: number[];
}) {
  const chartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "area",
      sparkline: { enabled: true },
      animations: { enabled: false },
    },
    stroke: {
      curve: "smooth",
      width: 2,
      colors: [trend === "up" ? "#16A34A" : "#DC2626"],
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0,
        stops: [0, 100],
        colorStops: [
          {
            offset: 0,
            color: trend === "up" ? "#16A34A" : "#DC2626",
            opacity: 0.2,
          },
          {
            offset: 100,
            color: trend === "up" ? "#16A34A" : "#DC2626",
            opacity: 0,
          },
        ],
      },
    },
    tooltip: {
      fixed: { enabled: false },
      x: { show: false },
      y: { title: { formatter: () => "" } },
      marker: { show: false },
    },
  };

  const chartSeries = [
    {
      name: "Value",
      data: data || [],
    },
  ];

  return (
    <Card className="p-4 shadow-sm border border-border bg-card transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
          <div className="mt-1 font-sans text-2xl font-semibold tracking-tight text-foreground">{value}</div>
          {delta && (
            <div
              className={cn(
                "mt-2 flex items-center gap-1 text-xs font-medium",
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
        </div>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-muted-foreground">
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
        )}
      </div>
      {data && data.length > 0 && (
        <div className="mt-4 h-10 w-full">
          <Chart options={chartOptions} series={chartSeries} type="area" height="100%" width="100%" />
        </div>
      )}
    </Card>
  );
}
