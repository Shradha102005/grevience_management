import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
      {
        name: "description",
        content: "Sign in to the CivicSaathi governance platform.",
      },
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
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    const savedEmail = localStorage.getItem("remembered_email");
    if (savedEmail) {
      setValue("email", savedEmail);
      setRememberMe(true);
    }
  }, [setValue]);

  const onSubmit = async (values: LoginForm) => {
    setIsLoading(true);
    try {
      await login(values.email, values.password);
      if (rememberMe) {
        localStorage.setItem("remembered_email", values.email);
      } else {
        localStorage.removeItem("remembered_email");
      }
      toast.success("Welcome back!");
      await navigate({ to: "/portal" });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Invalid email or password";
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

        {/* ── LEFT COLUMN: Form ── */}
        <div className="w-full lg:w-[45%] p-8 sm:p-10 md:p-16 flex flex-col justify-between min-h-screen bg-white dark:bg-slate-900">

          {/* Header */}
          <header className="flex items-center justify-between w-full">
            <Logo variant="dark" />
            <Link
              to="/signup"
              className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#0A4595] dark:hover:text-[#3B82F6] transition-colors uppercase tracking-wider"
            >
              Create Account
            </Link>
          </header>

          {/* Form body */}
          <div className="my-auto max-w-[320px] w-full mx-auto py-6">
            <div className="mb-8">
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-[#0F1E36] dark:text-white">
                Login
              </h1>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                Welcome to log in to your background management system.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
              {/* Email */}
              <div className="space-y-1">
                <Label
                  htmlFor="login-email"
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  Email
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@gov.in"
                  autoComplete="email"
                  {...register("email")}
                  aria-invalid={!!errors.email}
                  className="h-10 px-0 bg-transparent border-0 border-b border-slate-250 dark:border-slate-800 focus-visible:border-[#0A4595] dark:focus-visible:border-blue-500 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none text-sm text-[#0F1E36] dark:text-slate-100 placeholder:text-slate-350 dark:placeholder:text-slate-600 transition-all"
                />
                {errors.email && (
                  <p className="text-xs text-destructive pl-1 font-semibold mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <Label
                  htmlFor="login-password"
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Please enter your password"
                    autoComplete="current-password"
                    {...register("password")}
                    aria-invalid={!!errors.password}
                    className="h-10 pl-0 pr-8 bg-transparent border-0 border-b border-slate-250 dark:border-slate-800 focus-visible:border-[#0A4595] dark:focus-visible:border-blue-500 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none text-sm text-[#0F1E36] dark:text-slate-100 placeholder:text-slate-350 dark:placeholder:text-slate-600 transition-all"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-[#0A4595] dark:hover:text-blue-400 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive pl-1 font-semibold mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Helper row */}
              <div className="flex items-center justify-between text-xs font-medium text-slate-450 dark:text-slate-500">
                <label className="flex items-center gap-2 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-200 dark:border-slate-800 text-blue-600 focus:ring-blue-500/20 h-4 w-4 accent-[#0A4595]"
                  />
                  Remember email
                </label>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <Button
                  type="submit"
                  className="h-10 w-32 text-xs font-bold bg-[#2C7FF8] hover:bg-[#1C6FE8] text-white rounded-md shadow-md shadow-blue-500/20 transition-all uppercase tracking-wider"
                  disabled={isLoading}
                  id="login-submit"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Login"
                  )}
                </Button>
              </div>
            </form>

          </div>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#E2E8F0]" />
            <span className="text-[10px] font-bold tracking-widest text-[#94A3B8] uppercase">New to CivicSaathi?</span>
            <div className="h-px flex-1 bg-[#E2E8F0]" />
          </div>

          <footer className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            <p>© CivicSaathi 2026</p>
          </footer>
        </div>

        {/* ── RIGHT COLUMN: Uploaded Illustration ── */}
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
