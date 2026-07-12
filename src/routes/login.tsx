import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Mail,
  Lock,
  Bell,
  Activity,
  MapPin,
  Siren,
  ShieldCheck,
  Zap,
  Globe,
  Lock as LockIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — CivicSaathi" },
      { name: "description", content: "Sign in to the CivicSaathi governance platform." },
    ],
  }),
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginForm) => {
    setIsLoading(true);
    try {
      await login(values.email, values.password);
      toast.success("Welcome back!");
      await navigate({ to: "/portal" });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Invalid email or password";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#07051A] font-sans">
      {/* ── Left brand panel ── */}
      <div className="relative hidden flex-col items-center justify-center overflow-hidden lg:flex lg:w-[55%] xl:w-[60%] p-8">
        {/* Background grid */}
        <div 
          className="absolute inset-0 z-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
        
        {/* Background glow blobs */}
        <div className="absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-[#4F46E5]/15 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-[#38BDF8]/15 blur-[120px]" />

        {/* Content Wrapper — 3-col grid: left widgets | circle | right widgets */}
        <div className="relative z-10 flex w-full items-center justify-center gap-6 px-4">

          {/* Left widget column */}
          <div className="hidden xl:flex flex-col gap-4 flex-shrink-0">
            <div className="relative flex items-center gap-3 rounded-2xl border border-white/5 bg-[#0F0A1F]/80 p-3.5 shadow-2xl backdrop-blur-xl transition-transform hover:scale-105 w-[180px]">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#D97706]/10 text-[#F59E0B]">
                <Bell className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-white/90 leading-tight">Alert Broadcast</h4>
                <p className="text-[10px] text-white/50 mt-0.5 leading-tight">Mass SMS sent - 2.4M</p>
              </div>
              <div className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_8px_#F59E0B]" />
            </div>
            <div className="relative flex items-center gap-3 rounded-2xl border border-white/5 bg-[#0F0A1F]/80 p-3.5 shadow-2xl backdrop-blur-xl transition-transform hover:scale-105 w-[180px]">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#10B981]/10 text-[#34D399]">
                <MapPin className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-white/90 leading-tight">Complaint Resolved</h4>
                <p className="text-[10px] text-white/50 mt-0.5 leading-tight">Ward 12 - Road issue</p>
              </div>
              <div className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]" />
            </div>
          </div>

          {/* Central Graphic */}
          <div className="flex flex-col items-center justify-center flex-shrink-0">
            <div className="relative flex h-[260px] w-[260px] items-center justify-center rounded-full">
              
              <div className="absolute inset-0 rounded-full border border-[#4F46E5]/10" />
              <div className="absolute inset-4 rounded-full border border-[#4F46E5]/20" />
              <div className="absolute inset-8 rounded-full border border-[#4F46E5]/30 bg-[#4F46E5]/5 backdrop-blur-3xl shadow-[0_0_80px_#4F46E530]" />
              <div className="absolute inset-16 rounded-full border border-[#4F46E5]/40 bg-gradient-to-b from-[#4F46E5]/20 to-transparent" />
              
              <div className="relative z-10 flex flex-col items-center justify-center gap-2">
                <ShieldCheck className="h-10 w-10 text-white" />
                <div className="text-center">
                  <h2 className="font-display text-xl font-bold tracking-widest text-white">CivicSaathi</h2>
                  <p className="text-[10px] font-medium tracking-widest text-[#818CF8] mt-1">OS V2.0</p>
                </div>
              </div>

              {/* Orbiting dots */}
              <div className="absolute inset-0 animate-[spin_12s_linear_infinite] rounded-full border border-dashed border-white/10">
                <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#34D399] shadow-[0_0_12px_#34D399]" />
                <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-[#818CF8] shadow-[0_0_12px_#818CF8]" />
              </div>
              <div className="absolute inset-[-24px] animate-[spin_18s_linear_infinite_reverse] rounded-full border border-dashed border-white/5">
                 <div className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#38BDF8] shadow-[0_0_12px_#38BDF8]" />
                 <div className="absolute right-0 top-1/2 h-2 w-2 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F59E0B] shadow-[0_0_12px_#F59E0B]" />
              </div>
            </div>

            {/* Title + subtitle */}
            <h1 className="mt-10 font-display text-[28px] font-semibold tracking-tight text-white leading-tight text-center">
              The Future of <span className="text-[#38BDF8]">Governance</span> is Here
            </h1>
            <p className="mt-3 text-[13px] text-white/50 font-medium tracking-wide text-center">
              AI-native · Voice-first · Multilingual · Real-time
            </p>

            {/* Stats */}
            <div className="mt-8 flex items-center justify-center gap-10 border-t border-white/5 pt-8">
              <div className="text-center">
                <p className="text-[28px] font-bold text-white">10M+</p>
                <p className="text-[10px] mt-1 font-bold tracking-widest text-white/40">CITIZENS</p>
              </div>
              <div className="h-10 w-px bg-white/5" />
              <div className="text-center">
                <p className="text-[28px] font-bold text-[#38BDF8]">99.9%</p>
                <p className="text-[10px] mt-1 font-bold tracking-widest text-[#38BDF8]/50">UPTIME</p>
              </div>
              <div className="h-10 w-px bg-white/5" />
              <div className="text-center">
                <p className="text-[28px] font-bold text-white">9</p>
                <p className="text-[10px] mt-1 font-bold tracking-widest text-white/40">MODULES</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center items-center gap-5 text-[10px] font-bold tracking-widest text-white/30">
              <div className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" /> AES-256</div>
              <div className="flex items-center gap-2"><Zap className="h-3.5 w-3.5" /> 99.9% SLA</div>
              <div className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> 8 LANGUAGES</div>
              <div className="flex items-center gap-2"><LockIcon className="h-3.5 w-3.5" /> GOVT. GRADE</div>
            </div>
          </div>

          {/* Right widget column */}
          <div className="hidden xl:flex flex-col gap-4 flex-shrink-0">
            <div className="relative flex items-center gap-3 rounded-2xl border border-white/5 bg-[#0F0A1F]/80 p-3.5 shadow-2xl backdrop-blur-xl transition-transform hover:scale-105 w-[180px]">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#4F46E5]/10 text-[#818CF8]">
                <Activity className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-white/90 leading-tight">Scheme Matched</h4>
                <p className="text-[10px] text-white/50 mt-0.5 leading-tight">PM Kisan - 842 eligible</p>
              </div>
              <div className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-[#818CF8] shadow-[0_0_8px_#818CF8]" />
            </div>
            <div className="relative flex items-center gap-3 rounded-2xl border border-white/5 bg-[#0F0A1F]/80 p-3.5 shadow-2xl backdrop-blur-xl transition-transform hover:scale-105 w-[180px]">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#E11D48]/10 text-[#FB7185]">
                <Siren className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-white/90 leading-tight">Emergency Active</h4>
                <p className="text-[10px] text-white/50 mt-0.5 leading-tight">NE-4 Zone - Live</p>
              </div>
              <div className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-[#FB7185] shadow-[0_0_8px_#FB7185]" />
            </div>
          </div>

        </div>
      </div>


      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#F8FAFC] px-6 py-12 sm:px-12 relative overflow-y-auto max-h-screen">
        <div className="w-full max-w-[420px] rounded-3xl bg-white p-8 sm:p-10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] relative my-auto">
          
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#6366F1] to-[#38BDF8] rounded-t-3xl" />

          <div className="mb-8 mt-2">
            <h2 className="font-display text-[28px] font-bold tracking-tight text-[#0F172A]">
              Welcome back
            </h2>
            <p className="mt-2 text-[14px] text-[#64748B]">
              Sign in to your governance account
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            {/* Email */}
            <div className="space-y-2.5">
              <Label htmlFor="login-email" className="text-[11px] font-bold tracking-widest text-[#475569] uppercase">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#94A3B8]" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@civic.gov.in"
                  autoComplete="email"
                  {...register("email")}
                  aria-invalid={!!errors.email}
                  className="h-12 pl-11 border-[#E2E8F0] focus-visible:border-[#6366F1] focus-visible:ring-1 focus-visible:ring-[#6366F1] shadow-sm text-[14px] rounded-xl placeholder:text-[#94A3B8]"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password" className="text-[11px] font-bold tracking-widest text-[#475569] uppercase">Password</Label>
                <Link to="/login" className="text-[12px] font-semibold text-[#6366F1] hover:text-[#4F46E5] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#94A3B8]" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  {...register("password")}
                  aria-invalid={!!errors.password}
                  className="h-12 pl-11 pr-11 border-[#E2E8F0] focus-visible:border-[#6366F1] focus-visible:ring-1 focus-visible:ring-[#6366F1] shadow-sm text-[14px] rounded-xl placeholder:text-[#94A3B8]"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="h-12 w-full gap-2 text-[14px] font-semibold bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-[0_8px_16px_-6px_rgba(99,102,241,0.4)] rounded-xl transition-all"
              disabled={isLoading}
              id="login-submit"
            >
              {isLoading ? (
               <Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight className="h-4.5 w-4.5" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#E2E8F0]" />
            <span className="text-[10px] font-bold tracking-widest text-[#94A3B8] uppercase">New to CivicSaathi?</span>
            <div className="h-px flex-1 bg-[#E2E8F0]" />
          </div>

          <Button
            variant="outline"
            className="h-12 w-full gap-2 text-[14px] font-semibold border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC] rounded-xl"
            onClick={() => navigate({ to: '/signup' })}
          >
            Create an account <ArrowRight className="h-4.5 w-4.5" />
          </Button>

        </div>
        
        <p className="mt-10 text-center text-[12px] text-[#94A3B8]">
          By signing in, you agree to our <a href="#" className="font-semibold text-[#6366F1] hover:underline">Terms</a> & <a href="#" className="font-semibold text-[#6366F1] hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}

