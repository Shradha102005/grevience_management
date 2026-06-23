import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Eye, EyeOff, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/logo";

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
    <ul className="mt-2 space-y-1">
      {checks.map((c) => (
        <li key={c.label} className="flex items-center gap-1.5 text-xs">
          <CheckCircle2
            className={`h-3.5 w-3.5 shrink-0 ${c.pass ? "text-green-500" : "text-muted-foreground/40"}`}
          />
          <span className={c.pass ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
        </li>
      ))}
    </ul>
  );
}

const ROLE_OPTIONS = [
  { value: "citizen", label: "Citizen", desc: "Access public services and schemes" },
  { value: "officer", label: "Government Officer", desc: "Manage complaints and services" },
  { value: "admin", label: "Administrator", desc: "Full system access and analytics" },
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

  const onSubmit = async (values: SignupForm) => {
    setIsLoading(true);
    try {
      await registerUser(values.name, values.email, values.password, values.role);
      toast.success("Account created! Welcome to CIVICOS AI.");
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
    <div className="flex min-h-screen">
      {/* ── Left brand panel ── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 lg:flex lg:w-[45%]">
        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-white/5 blur-3xl" />

        <div className="relative z-10">
          <Logo variant="light" />
        </div>

        <div className="relative z-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary-foreground/60">
            Join the platform
          </p>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight text-primary-foreground">
            Built for
            <br />
            Modern Governance
          </h1>
          <p className="mt-5 max-w-sm text-base text-primary-foreground/75">
            Thousands of officers, administrators and citizens already use CIVICOS AI to deliver
            faster, smarter public services.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { value: "10M+", label: "Citizens served" },
              { value: "500+", label: "Govt. programs" },
              { value: "99.9%", label: "Uptime SLA" },
              { value: "9", label: "Service modules" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl bg-white/10 p-4 backdrop-blur-sm"
              >
                <p className="font-display text-2xl font-extrabold text-primary-foreground">
                  {s.value}
                </p>
                <p className="mt-1 text-xs text-primary-foreground/65">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-primary-foreground/40">
          © {new Date().getFullYear()} CIVICOS AI. Government-grade security.
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12 sm:px-12">
        <div className="mb-8 lg:hidden">
          <Logo />
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Get started with CIVICOS AI in under a minute
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="signup-name">Full Name</Label>
              <Input
                id="signup-name"
                type="text"
                placeholder="Priya Sharma"
                autoComplete="name"
                {...register("name")}
                aria-invalid={!!errors.name}
                className="h-11"
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="signup-email">Email address</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="you@civicos.gov.in"
                autoComplete="email"
                {...register("email")}
                aria-invalid={!!errors.email}
                className="h-11"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label htmlFor="signup-role">Account type</Label>
              <Select
                defaultValue="citizen"
                onValueChange={(v) => setValue("role", v as SignupForm["role"])}
              >
                <SelectTrigger id="signup-role" className="h-11">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <span className="font-medium">{r.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">— {r.desc}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-xs text-destructive">{errors.role.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="signup-password">Password</Label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register("password")}
                  aria-invalid={!!errors.password}
                  className="h-11 pr-11"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
              <PasswordStrength password={password} />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="signup-confirm">Confirm password</Label>
              <div className="relative">
                <Input
                  id="signup-confirm"
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                  aria-invalid={!!errors.confirmPassword}
                  className="h-11 pr-11"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="h-11 w-full gap-2 text-sm font-semibold"
              disabled={isLoading}
              id="signup-submit"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Create Account <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
