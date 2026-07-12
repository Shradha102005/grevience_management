import { cn } from "@/lib/utils";
import { Mic, Loader2 } from "lucide-react";

export type VoiceOrbState = "idle" | "listening" | "processing" | "speaking";

export function VoiceOrb({
  state,
  onClick,
  size = "lg",
  className,
}: {
  state: VoiceOrbState;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: { orb: "h-16 w-16", icon: "h-7 w-7", rings: "h-24 w-24" },
    md: { orb: "h-24 w-24", icon: "h-10 w-10", rings: "h-36 w-36" },
    lg: { orb: "h-32 w-32", icon: "h-14 w-14", rings: "h-48 w-48" },
  };
  const s = sizes[size];

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Animated pulse rings — visible when listening or speaking */}
      {(state === "listening" || state === "speaking") && (
        <>
          <span
            className={cn(
              "absolute rounded-full border-2 opacity-0",
              state === "listening"
                ? "border-primary animate-ping"
                : "border-accent animate-ping",
              s.rings,
            )}
            style={{ animationDuration: "1.2s" }}
          />
          <span
            className={cn(
              "absolute rounded-full border opacity-0",
              state === "listening"
                ? "border-primary/40 animate-ping"
                : "border-accent/40 animate-ping",
              "scale-90",
            )}
            style={{
              width: `calc(${size === "lg" ? "12rem" : size === "md" ? "9rem" : "6rem"} * 1.3)`,
              height: `calc(${size === "lg" ? "12rem" : size === "md" ? "9rem" : "6rem"} * 1.3)`,
              animationDuration: "1.6s",
              animationDelay: "0.3s",
            }}
          />
        </>
      )}

      {/* Core orb */}
      <button
        onClick={onClick}
        aria-label={
          state === "idle"
            ? "Start voice input"
            : state === "listening"
              ? "Stop listening"
              : state === "processing"
                ? "Processing..."
                : "Speaking..."
        }
        disabled={state === "processing"}
        className={cn(
          "relative grid place-items-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40",
          s.orb,
          state === "idle" &&
            "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-elevated hover:scale-105 hover:shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.4)]",
          state === "listening" &&
            "bg-gradient-to-br from-destructive to-destructive/80 text-white shadow-elevated scale-110",
          state === "processing" &&
            "bg-gradient-to-br from-muted to-muted/80 text-muted-foreground shadow-card cursor-not-allowed",
          state === "speaking" &&
            "bg-gradient-to-br from-accent to-accent/80 text-accent-foreground shadow-elevated scale-105",
        )}
      >
        {state === "processing" ? (
          <Loader2 className={cn(s.icon, "animate-spin")} />
        ) : (
          <Mic
            className={cn(s.icon, state === "listening" && "animate-pulse")}
          />
        )}

        {/* Waveform bars when speaking */}
        {state === "speaking" && (
          <div className="absolute bottom-3 flex items-end gap-0.5">
            {[4, 7, 5, 9, 6, 8, 4].map((h, i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-white/70"
                style={{
                  height: `${h}px`,
                  animation: `voiceBar 0.6s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
        )}
      </button>

      {/* State label */}
      <p className="absolute -bottom-8 text-xs font-medium text-muted-foreground">
        {state === "idle" && "Tap to speak"}
        {state === "listening" && "Listening…"}
        {state === "processing" && "Processing…"}
        {state === "speaking" && "Speaking…"}
      </p>
    </div>
  );
}

// Inject keyframe once
if (typeof document !== "undefined") {
  const styleId = "voice-orb-keyframes";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes voiceBar {
        from { transform: scaleY(0.4); }
        to   { transform: scaleY(1.2); }
      }
    `;
    document.head.appendChild(style);
  }
}
