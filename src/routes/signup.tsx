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
  CheckCircle2,
  User,
  Briefcase,
  Settings,
  ShieldCheck,
  Zap,
  Globe,
  Mail,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account — CIVICOS AI" },
      { name: "description", content: "Create your CIVICOS AI governance account." },
    ],
  }),
  component: SignupPage,
});

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(150),
    email: z.string().email("Enter a valid email address"),
    role: z.enum(["citizen", "officer", "admin"]),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupForm = z.infer<typeof signupSchema>;

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "At least 6 characters", pass: password.length >= 6 },
    { label: "Contains a number", pass: /\d/.test(password) },
    { label: "Contains uppercase", pass: /[A-Z]/.test(password) },
  ];
  if (!password) return null;
  return (
    <ul className="mt-2.5 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
      {checks.map((c) => (
        <li key={c.label} className="flex items-center gap-1.5 text-xs">
          <CheckCircle2
            className={`h-3.5 w-3.5 shrink-0 ${c.pass ? "text-green-500" : "text-slate-300"}`}
          />
          <span className={c.pass ? "text-slate-700 font-medium" : "text-slate-400"}>{c.label}</span>
        </li>
      ))}
    </ul>
  );
}

const ROLE_OPTIONS = [
  { value: "citizen", label: "Citizen", desc: "Access public services" },
  { value: "officer", label: "Gov. Officer", desc: "Manage complaints" },
  { value: "admin", label: "Admin", desc: "Full system access" },
];

function SignupPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: "citizen" },
  });

  const password = watch("password", "");
  const selectedRole = watch("role", "citizen");

  const onSubmit = async (values: SignupForm) => {
    setIsLoading(true);
    try {
      await registerUser(values.name, values.email, values.password, values.role);
      toast.success("Welcome to CIVICOS!");
      await navigate({ to: "/portal" });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Registration failed. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#07051A] font-sans">
      {/* ── Left brand panel ── */}
      <div className="relative hidden flex-col items-center justify-center overflow-hidden lg:flex lg:w-[50%] xl:w-[55%] p-8">
        {/* Background grid */}
        <div 
          className="absolute inset-0 z-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
        
        {/* Background glow blobs */}
        <div className="absolute top-1/4 left-1/4 h-[350px] w-[350px] rounded-full bg-[#4F46E5]/10 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[350px] w-[350px] rounded-full bg-[#38BDF8]/10 blur-[100px]" />

        {/* Content Wrapper */}
        <div className="relative z-10 flex w-full max-w-[500px] flex-col items-center justify-center">
          
          {/* Central Graphic with connecting modules */}
          <div className="relative flex h-[320px] w-[320px] items-center justify-center">
            
            {/* Connecting lines SVG */}
            <svg className="absolute inset-0 h-full w-full opacity-20" viewBox="0 0 320 320">
              <line x1="160" y1="160" x2="160" y2="35" stroke="#818CF8" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="160" y1="160" x2="275" y2="95" stroke="#818CF8" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="160" y1="160" x2="275" y2="225" stroke="#818CF8" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="160" y1="160" x2="160" y2="285" stroke="#818CF8" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="160" y1="160" x2="45" y2="225" stroke="#818CF8" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="160" y1="160" x2="45" y2="95" stroke="#818CF8" strokeWidth="1" strokeDasharray="3 3" />
            </svg>

            {/* Central CIVICOS Shield Circle */}
            <div className="relative z-10 flex h-[110px] w-[110px] items-center justify-center rounded-full border border-[#4F46E5]/30 bg-[#0F0A1F] shadow-[0_0_50px_rgba(79,70,229,0.2)]">
              <div className="absolute inset-1.5 rounded-full border border-[#4F46E5]/15" />
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck className="h-6 w-6 text-[#818CF8]" />
                <span className="text-[11px] font-bold tracking-widest text-white">CIVICOS</span>
              </div>
            </div>

            {/* Modules */}
            {/* Voice AI */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full border border-white/5 bg-[#0F0A1F]/90 px-3 py-1.5 text-[10px] font-medium text-[#818CF8] shadow-lg backdrop-blur-md">
              <span className="mr-1.5 h-1 w-1 inline-block rounded-full bg-[#818CF8]" />
              Voice AI
            </div>

            {/* Smart City */}
            <div className="absolute top-[75px] right-0 rounded-full border border-white/5 bg-[#0F0A1F]/90 px-3 py-1.5 text-[10px] font-medium text-[#38BDF8] shadow-lg backdrop-blur-md">
              <span className="mr-1.5 h-1 w-1 inline-block rounded-full bg-[#38BDF8]" />
              Smart City
            </div>

            {/* Municipal */}
            <div className="absolute bottom-[75px] right-0 rounded-full border border-white/5 bg-[#0F0A1F]/90 px-3 py-1.5 text-[10px] font-medium text-[#34D399] shadow-lg backdrop-blur-md">
              <span className="mr-1.5 h-1 w-1 inline-block rounded-full bg-[#34D399]" />
              Municipal
            </div>

            {/* Agriculture */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-white/5 bg-[#0F0A1F]/90 px-3 py-1.5 text-[10px] font-medium text-[#A7F3D0] shadow-lg backdrop-blur-md">
              <span className="mr-1.5 h-1 w-1 inline-block rounded-full bg-[#10B981]" />
              Agriculture
            </div>

            {/* Emergency */}
            <div className="absolute bottom-[75px] left-0 rounded-full border border-white/5 bg-[#0F0A1F]/90 px-3 py-1.5 text-[10px] font-medium text-[#F87171] shadow-lg backdrop-blur-md">
              <span className="mr-1.5 h-1 w-1 inline-block rounded-full bg-[#EF4444]" />
              Emergency
            </div>

            {/* Scheme AI */}
            <div className="absolute top-[75px] left-0 rounded-full border border-white/5 bg-[#0F0A1F]/90 px-3 py-1.5 text-[10px] font-medium text-[#FBBF24] shadow-lg backdrop-blur-md">
              <span className="mr-1.5 h-1 w-1 inline-block rounded-full bg-[#F59E0B]" />
              Scheme AI
            </div>
          </div>

          <h2 className="mt-8 font-display text-[26px] font-semibold tracking-tight text-white leading-tight text-center">
            Join <span className="text-[#38BDF8]">9 Modules</span> of AI Governance
          </h2>
          <p className="mt-3 text-center text-xs text-white/55 leading-relaxed max-w-sm">
            From rural development to smart city management, CIVICOS connects every citizen service under one roof.
          </p>

          {/* Icon Badges */}
          <div className="mt-8 flex items-center gap-6">
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4F46E5]/10 text-[#818CF8]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="text-[9px] font-bold tracking-wider text-white/40 uppercase">Secure</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#38BDF8]/10 text-[#38BDF8]">
                <Zap className="h-4 w-4" />
              </div>
              <span className="text-[9px] font-bold tracking-wider text-white/40 uppercase">Instant</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#10B981]/10 text-[#34D399]">
                <Globe className="h-4 w-4" />
              </div>
              <span className="text-[9px] font-bold tracking-wider text-white/40 uppercase">Multilingual</span>
            </div>
          </div>

          {/* Footer Text */}
          <p className="mt-10 text-[10px] font-semibold tracking-wider text-white/20 uppercase">
            Govt. Grade Security · 24/7 AI Support
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#F8FAFC] px-6 py-12 sm:px-12 relative overflow-y-auto max-h-screen">
        <div className="w-full max-w-[480px] rounded-3xl bg-white p-8 sm:p-10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] relative my-auto">
          
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#6366F1] to-[#38BDF8] rounded-t-3xl" />

          <div className="mb-6 mt-2">
            <h2 className="font-display text-[26px] font-bold tracking-tight text-[#0F172A]">
              Create your account
            </h2>
            <p className="mt-1 text-[13px] text-[#64748B]">
              Join 10M+ citizens — free to get started
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            
            {/* Full Name & Email side-by-side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="signup-name" className="text-[10px] font-bold tracking-widest text-[#475569] uppercase">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#94A3B8]" />
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Priya Sharma"
                    autoComplete="name"
                    {...register("name")}
                    aria-invalid={!!errors.name}
                    className="h-12 pl-11 border-[#E2E8F0] focus-visible:border-[#6366F1] focus-visible:ring-1 focus-visible:ring-[#6366F1] shadow-sm text-[14px] rounded-xl placeholder:text-[#94A3B8]"
                  />
                </div>
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="signup-email" className="text-[10px] font-bold tracking-widest text-[#475569] uppercase">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#94A3B8]" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@gov.in"
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
            </div>

            {/* Select Role */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold tracking-widest text-[#475569] uppercase">Select Your Role</Label>
              <div className="grid grid-cols-3 gap-3">
                {ROLE_OPTIONS.map((r) => {
                  const isSelected = selectedRole === r.value;
                  
                  let activeStyles = "";
                  let iconColor = "";
                  let activeBorder = "";
                  
                  if (r.value === "citizen") {
                    activeStyles = "border-emerald-500 bg-emerald-500/[0.03] text-emerald-600";
                    iconColor = isSelected ? "text-emerald-600 bg-emerald-100/70" : "text-slate-400 bg-slate-50";
                    activeBorder = "border-emerald-500";
                  } else if (r.value === "officer") {
                    activeStyles = "border-[#6366F1] bg-[#6366F1]/[0.03] text-[#6366F1]";
                    iconColor = isSelected ? "text-[#6366F1] bg-indigo-50" : "text-slate-400 bg-slate-50";
                    activeBorder = "border-[#6366F1]";
                  } else {
                    activeStyles = "border-violet-500 bg-violet-500/[0.03] text-violet-600";
                    iconColor = isSelected ? "text-violet-600 bg-violet-50" : "text-slate-400 bg-slate-50";
                    activeBorder = "border-violet-500";
                  }

                  const RoleIcon = r.value === "citizen" ? User : r.value === "officer" ? Briefcase : Settings;

                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setValue("role", r.value as SignupForm["role"])}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer hover:border-slate-300 ${
                        isSelected 
                          ? `${activeStyles} ${activeBorder} shadow-sm font-medium` 
                          : "border-slate-100 bg-white text-slate-600"
                      }`}
                    >
                      <div className={`p-2 rounded-xl mb-1.5 transition-colors ${iconColor}`}>
                        <RoleIcon className="h-4.5 w-4.5" />
                      </div>
                      <span className="text-[11px] font-bold leading-none block">{r.label}</span>
                      <span className="text-[9px] text-slate-400 mt-1 leading-tight hidden sm:block">{r.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Password & Confirm side-by-side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="signup-password" className="text-[10px] font-bold tracking-widest text-[#475569] uppercase">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#94A3B8]" />
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 chars"
                    autoComplete="new-password"
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

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="signup-confirm" className="text-[10px] font-bold tracking-widest text-[#475569] uppercase">Confirm</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#94A3B8]" />
                  <Input
                    id="signup-confirm"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter"
                    autoComplete="new-password"
                    {...register("confirmPassword")}
                    aria-invalid={!!errors.confirmPassword}
                    className="h-12 pl-11 pr-11 border-[#E2E8F0] focus-visible:border-[#6366F1] focus-visible:ring-1 focus-visible:ring-[#6366F1] shadow-sm text-[14px] rounded-xl placeholder:text-[#94A3B8]"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirm((p) => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Password strength checks */}
            <PasswordStrength password={password} />

            {/* Submit */}
            <Button
              type="submit"
              className="h-12 w-full gap-2 text-[14px] font-semibold bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-[0_8px_16px_-6px_rgba(99,102,241,0.4)] rounded-xl transition-all"
              disabled={isLoading}
              id="signup-submit"
            >
              {isLoading ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <>
                  Create Account <ArrowRight className="h-4.5 w-4.5" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-[12px] text-[#94A3B8]">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-[#6366F1] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
        
        <p className="mt-8 text-center text-[12px] text-[#94A3B8]">
          By creating an account you agree to our <a href="#" className="font-semibold text-[#6366F1] hover:underline">Terms</a> & <a href="#" className="font-semibold text-[#6366F1] hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
