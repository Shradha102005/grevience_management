import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  User,
  Briefcase,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account — CivicSaathi" },
      {
        name: "description",
        content: "Create your CivicSaathi governance account.",
      },
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
    { label: "At least 6 chars", pass: password.length >= 6 },
    { label: "Contains a number", pass: /\d/.test(password) },
    { label: "Contains uppercase", pass: /[A-Z]/.test(password) },
  ];
  if (!password) return null;
  const passedCount = checks.filter((c) => c.pass).length;
  const barColors = [
    "bg-slate-200",
    "bg-red-500",
    "bg-amber-500",
    "bg-emerald-500",
  ];
  const barColor = barColors[passedCount];

  return (
    <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800/80">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">
          Strength
        </span>
        <span className="text-[9px] font-bold text-slate-700 dark:text-slate-350">
          {passedCount === 0
            ? "Weak"
            : passedCount === 1
              ? "Fair"
              : passedCount === 2
                ? "Good"
                : "Strong"}
        </span>
      </div>
      <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${(passedCount / 3) * 100}%` }}
        />
      </div>
      <ul className="grid grid-cols-3 gap-1">
        {checks.map((c) => (
          <li
            key={c.label}
            className="flex items-center gap-1 text-[9px] font-semibold leading-none"
          >
            <CheckCircle2
              className={`h-2.5 w-2.5 shrink-0 transition-colors ${c.pass ? "text-emerald-500" : "text-slate-300 dark:text-slate-750"}`}
            />
            <span
              className={
                c.pass
                  ? "text-slate-755 dark:text-slate-300"
                  : "text-slate-400 dark:text-slate-600"
              }
            >
              {c.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const ROLE_OPTIONS = [
  { value: "citizen", label: "Citizen", desc: "Public services" },
  { value: "officer", label: "Officer", desc: "Review portal" },
  { value: "admin", label: "Admin", desc: "Configure system" },
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
      await registerUser(
        values.name,
        values.email,
        values.password,
        values.role,
      );
      toast.success("Welcome to CivicSaathi!");
      await navigate({ to: "/portal" });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Registration failed. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#EBF2FC] dark:bg-slate-950 flex font-sans relative overflow-hidden">
      {/* Background Soft Organic Shapes */}
      <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-300/30 dark:bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-400/20 dark:bg-blue-800/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[40%] right-[60%] w-[450px] h-[450px] rounded-full bg-sky-300/25 dark:bg-sky-900/10 blur-[130px] pointer-events-none" />

      {/* Main Full-Screen Container */}
      <div className="relative w-full min-h-screen bg-white dark:bg-slate-900 flex overflow-hidden z-10">
        {/* Left Column: Form Content */}
        <div className="w-full lg:w-[45%] p-8 sm:p-10 md:p-16 flex flex-col justify-between min-h-screen bg-white dark:bg-slate-900">
          {/* Top Header */}
          <header className="flex items-center justify-between w-full relative z-25">
            <Logo variant="dark" />
            <Link
              to="/login"
              className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#0A4595] dark:hover:text-[#3B82F6] transition-colors uppercase tracking-wider"
            >
              Sign In
            </Link>
          </header>

          {/* Scrollable Form wrapper */}
          <div className="my-auto max-w-[320px] w-full mx-auto py-4 overflow-y-auto scrollbar-none h-[420px]">
            <div className="mb-4">
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#0F1E36] dark:text-white">
                Sign Up
              </h1>
              <p className="mt-1 text-xs text-slate-450 dark:text-slate-500 font-medium leading-relaxed">
                Welcome to join the CivicSaathi governance portal.
              </p>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              {/* Full Name */}
              <div className="space-y-0.5">
                <Label
                  htmlFor="signup-name"
                  className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Full Name
                </Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="John Doe"
                  autoComplete="name"
                  {...register("name")}
                  aria-invalid={!!errors.name}
                  className="h-9 px-0 bg-transparent border-0 border-b border-slate-250 dark:border-slate-800 focus-visible:border-[#0A4595] dark:focus-visible:border-blue-500 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none text-xs text-[#0F1E36] dark:text-slate-100 placeholder:text-slate-350 dark:placeholder:text-slate-600 transition-all focus:scale-[1.005]"
                />
                {errors.name && (
                  <p className="text-xs text-destructive pl-1 font-semibold">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Email Address */}
              <div className="space-y-0.5">
                <Label
                  htmlFor="signup-email"
                  className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Email Address
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  {...register("email")}
                  aria-invalid={!!errors.email}
                  className="h-9 px-0 bg-transparent border-0 border-b border-slate-250 dark:border-slate-800 focus-visible:border-[#0A4595] dark:focus-visible:border-blue-500 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none text-xs text-[#0F1E36] dark:text-slate-100 placeholder:text-slate-350 dark:placeholder:text-slate-600 transition-all focus:scale-[1.005]"
                />
                {errors.email && (
                  <p className="text-xs text-destructive pl-1 font-semibold">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Role Cards Selector */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">
                  Select Role
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLE_OPTIONS.map((r) => {
                    const isSelected = selectedRole === r.value;
                    const RoleIcon =
                      r.value === "citizen"
                        ? User
                        : r.value === "officer"
                          ? Briefcase
                          : Settings;

                    const activeBorder = isSelected
                      ? "border-[#2C7FF8] bg-blue-50/10 dark:bg-blue-950/10 text-[#2C7FF8] ring-1 ring-[#2C7FF8]"
                      : "border-slate-200 dark:border-slate-800 bg-transparent text-slate-500 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-700";

                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() =>
                          setValue("role", r.value as SignupForm["role"])
                        }
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${activeBorder}`}
                      >
                        <RoleIcon
                          className={`h-4 w-4 mb-1.5 transition-colors ${isSelected ? "text-[#2C7FF8]" : "text-slate-400 dark:text-slate-500"}`}
                        />
                        <span className="text-[10px] font-bold leading-none">
                          {r.label}
                        </span>
                        <span className="text-[8px] text-slate-400 dark:text-slate-600 mt-0.5 leading-none font-medium scale-90">
                          {r.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Password & Confirm Side-by-Side */}
              <div className="grid grid-cols-2 gap-3">
                {/* Password */}
                <div className="space-y-0.5">
                  <Label
                    htmlFor="signup-password"
                    className="text-[11px] font-bold uppercase tracking-wider text-slate-555 dark:text-slate-400"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      autoComplete="new-password"
                      {...register("password")}
                      aria-invalid={!!errors.password}
                      className="h-9 pl-0 pr-8 bg-transparent border-0 border-b border-slate-250 dark:border-slate-800 focus-visible:border-[#0A4595] dark:focus-visible:border-blue-500 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none text-xs text-[#0F1E36] dark:text-slate-100 placeholder:text-slate-350 dark:placeholder:text-slate-600 transition-all focus:scale-[1.005]"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-[#0A4595]"
                    >
                      {showPassword ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-0.5">
                  <Label
                    htmlFor="signup-confirm"
                    className="text-[11px] font-bold uppercase tracking-wider text-slate-555 dark:text-slate-400"
                  >
                    Confirm
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-confirm"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm"
                      autoComplete="new-password"
                      {...register("confirmPassword")}
                      aria-invalid={!!errors.confirmPassword}
                      className="h-9 pl-0 pr-8 bg-transparent border-0 border-b border-slate-250 dark:border-slate-800 focus-visible:border-[#0A4595] dark:focus-visible:border-blue-500 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none text-xs text-[#0F1E36] dark:text-slate-100 placeholder:text-slate-350 dark:placeholder:text-slate-600 transition-all focus:scale-[1.005]"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirm((p) => !p)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-[#0A4595]"
                    >
                      {showConfirm ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {errors.password && (
                <p className="text-xs text-destructive font-semibold">
                  {errors.password.message}
                </p>
              )}
              {errors.confirmPassword && (
                <p className="text-xs text-destructive font-semibold">
                  {errors.confirmPassword.message}
                </p>
              )}

              {/* Password strength indicators */}
              <PasswordStrength password={password} />

              {/* Submit Button */}
              <div className="pt-1 flex items-center justify-between">
                <Button
                  type="submit"
                  className="h-9 w-32 text-xs font-bold bg-[#2C7FF8] hover:bg-[#1C6FE8] text-white rounded-md shadow-md shadow-blue-500/20 transition-all uppercase tracking-wider"
                  disabled={isLoading}
                  id="signup-submit"
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Register"
                  )}
                </Button>
                <Link
                  to="/login"
                  className="text-xs font-bold text-[#2C7FF8] hover:underline"
                >
                  Sign In
                </Link>
              </div>
            </form>
          </div>

          {/* Bottom copyright */}
          <footer className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            <p>© CivicSaathi 2026</p>
          </footer>
        </div>

        {/* Right Column: Uploaded Illustration */}
        <div className="hidden lg:flex lg:flex-1 h-full bg-white dark:bg-slate-900 rounded-r-[26px] items-center justify-center overflow-hidden">
          <img
            src="/login-illustration.png"
            alt="Data analytics collaboration illustration"
            className="w-full h-full object-contain p-8"
          />
        </div>
      </div>
    </div>
  );
}
