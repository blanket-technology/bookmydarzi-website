"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  BadgeCheck,
  Lock,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Truck,
} from "lucide-react";
import { useAuth } from "@/lib/useAuth";

const RESEND_COOLDOWN_SECONDS = 30;

const emailSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type EmailFormValues = z.infer<typeof emailSchema>;

const BRAND_POINTS = [
  { icon: Truck, text: "Free doorstep pickup & delivery" },
  { icon: ShieldCheck, text: "Verified, background-checked tailors" },
  { icon: Sparkles, text: "Perfect-fit guarantee on every order" },
];

function OtpDigitInput({
  value,
  onChange,
  disabled,
  onComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  onComplete?: (v: string) => void;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  // A rejected OTP clears `value` from the parent (see submitOtp's error
  // branch) so the boxes empty out - refocus box 1 in the same moment so
  // the user can start retyping immediately instead of having to click
  // back into the field themselves.
  useEffect(() => {
    if (value === "") refs.current[0]?.focus();
  }, [value]);

  const setDigit = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, "").slice(-1);
    const next = digits.slice();
    next[i] = d;
    const joined = next.join("").slice(0, 6);
    onChange(joined);
    if (d && i < 5) refs.current[i + 1]?.focus();
    if (joined.length === 6) onComplete?.(joined);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    refs.current[Math.min(text.length, 5)]?.focus();
    if (text.length === 6) onComplete?.(text);
  };

  return (
    <div className="flex justify-center gap-2.5">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          disabled={disabled}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={handlePaste}
          inputMode="numeric"
          maxLength={1}
          autoFocus={i === 0}
          className="h-14 w-11 rounded-xl border-2 border-black/10 bg-white text-center text-xl font-black text-ink outline-none transition focus:-translate-y-0.5 focus:border-ink focus:shadow-[0_0_0_4px_rgba(23,23,23,0.08)] disabled:opacity-50 sm:h-16 sm:w-12"
        />
      ))}
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, requestMobileOtp, verifyMobileOtp } = useAuth();

  const [mode, setMode] = useState<"mobile" | "email">("mobile");

  // Mobile OTP state
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState<"phone" | "otp">("phone");
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Email/password state
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = () => {
    setCountdown(RESEND_COOLDOWN_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const goToDestination = () => {
    const redirect = searchParams.get("redirect");
    router.push(redirect && redirect.startsWith("/") ? redirect : "/");
    router.refresh();
  };

  const handleSendOtp = async () => {
    setOtpError(null);
    if (!/^\d{10}$/.test(mobile)) {
      setOtpError("Enter a valid 10-digit mobile number.");
      return;
    }
    setOtpSubmitting(true);
    const result = await requestMobileOtp(mobile);
    setOtpSubmitting(false);
    if (!result.ok) {
      setOtpError(result.message ?? "Could not send OTP.");
      return;
    }
    setOtpStep("otp");
    startCountdown();
  };

  const submitOtp = async (code: string) => {
    if (code.length !== 6 || otpSubmitting) return;
    setOtpError(null);
    setOtpSubmitting(true);
    const result = await verifyMobileOtp(mobile, code);
    setOtpSubmitting(false);
    if (!result.ok) {
      // Wrong OTPs previously left all 6 boxes full with no obvious way to
      // retry - the "Verify" button stayed enabled but silently resubmitted
      // the same rejected code, and re-typing required manually backspacing
      // through every digit first. Clearing the code (and refocusing box 1)
      // makes the dead-end retry loop obvious: the boxes empty out and the
      // user can immediately type the correct code.
      setOtp("");
      setOtpError(result.message ?? "Invalid OTP. Please try again.");
      return;
    }
    goToDestination();
  };

  const handleResend = async () => {
    if (countdown > 0 || otpSubmitting) return;
    setOtpError(null);
    setOtp("");
    setOtpSubmitting(true);
    const result = await requestMobileOtp(mobile);
    setOtpSubmitting(false);
    if (!result.ok) {
      setOtpError(result.message ?? "Could not resend OTP.");
      return;
    }
    startCountdown();
  };

  const onEmailSubmit = async (values: EmailFormValues) => {
    setEmailError(null);
    setEmailSubmitting(true);
    const result = await login(values.email, values.password);
    setEmailSubmitting(false);
    if (!result.ok) {
      setEmailError(result.message ?? "Login failed. Please try again.");
      return;
    }
    goToDestination();
  };

  return (
    <main className="relative min-h-[calc(100vh-76px)] overflow-hidden bg-cream">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-gold/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-ink/5 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-76px)] max-w-6xl items-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-black/5 lg:grid-cols-2 lg:my-14">
          {/* Brand panel */}
          <div className="hidden flex-col justify-center gap-14 overflow-hidden bg-ink px-12 py-16 text-white lg:flex">
            <div className="animate-[fadeInUp_0.6s_ease_both]">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/logo.png"
                  alt="BookMyDarzi"
                  width={44}
                  height={44}
                  className="h-11 w-11 object-contain"
                />
                <span className="text-[19px] font-black tracking-[-.03em]">
                  BookMy<span className="text-gold">Darzi</span>
                </span>
              </Link>

              <h1 className="mt-16 max-w-sm text-4xl font-black leading-[1.15] tracking-tight">
                Tailoring that comes to your door.
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-white/55">
                Log in to track live orders, manage saved measurements and book your next fitting
                in under a minute.
              </p>
            </div>

            <div className="space-y-4 animate-[fadeInUp_0.6s_ease_0.15s_both]">
              {BRAND_POINTS.map((p, i) => (
                <div key={i} className="flex items-center gap-3 text-sm font-semibold text-white/80">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10">
                    <p.icon size={16} className="text-gold" />
                  </span>
                  {p.text}
                </div>
              ))}
            </div>
          </div>

          {/* Form panel */}
          <div className="flex flex-col justify-center px-5 py-14 sm:px-10 lg:px-14">
            <div className="mx-auto w-full max-w-sm animate-[fadeInUp_0.5s_ease_both]">
              <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">
                Welcome back
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-.03em]">Log in</h2>
              <p className="mt-2 text-sm text-muted">
                Choose how you&apos;d like to continue.
              </p>

              {/* Mode tabs */}
              <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-cream-deep p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("mobile");
                    setEmailError(null);
                  }}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition-all ${
                  mode === "mobile" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                <Smartphone size={15} /> Mobile OTP
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("email");
                  setOtpError(null);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition-all ${
                  mode === "email" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                <Mail size={15} /> Email
              </button>
            </div>

            {/* Mobile OTP flow */}
            {mode === "mobile" && (
              <div key={otpStep} className="mt-7 animate-[fadeInUp_0.35s_ease_both]">
                {otpError && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {otpError}
                  </div>
                )}

                {otpStep === "phone" ? (
                  <>
                    <label
                      htmlFor="mobile"
                      className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted"
                    >
                      Mobile number
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="flex h-[50px] shrink-0 items-center rounded-xl border border-black/10 bg-white px-3.5 text-sm font-bold text-ink">
                        +91
                      </span>
                      <div className="relative flex-1">
                        <Phone
                          size={17}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          id="mobile"
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          autoComplete="tel-national"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                          placeholder="98765 43210"
                          className="w-full rounded-xl border border-black/10 bg-white py-3 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-ink focus:shadow-[0_0_0_4px_rgba(23,23,23,0.06)]"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpSubmitting || mobile.length !== 10}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {otpSubmitting ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <>Send OTP</>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted">
                        Enter the 6-digit code
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpStep("phone");
                          setOtp("");
                          setOtpError(null);
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-gold-deep hover:text-ink"
                      >
                        <ArrowLeft size={12} /> Change
                      </button>
                    </div>
                    <p className="mb-4 mt-1 text-sm text-muted">
                      Sent to <span className="font-bold text-ink">+91 {mobile}</span>
                    </p>

                    <OtpDigitInput
                      value={otp}
                      onChange={setOtp}
                      disabled={otpSubmitting}
                      onComplete={submitOtp}
                    />

                    <button
                      type="button"
                      onClick={() => submitOtp(otp)}
                      disabled={otpSubmitting || otp.length !== 6}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {otpSubmitting ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <>
                          <BadgeCheck size={16} /> Verify & log in
                        </>
                      )}
                    </button>

                    <p className="mt-4 text-center text-sm text-muted">
                      Didn&apos;t get the code?{" "}
                      {countdown > 0 ? (
                        <span className="font-semibold text-gray-400">Resend in {countdown}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResend}
                          className="font-bold text-ink underline underline-offset-2 hover:text-gold-deep"
                        >
                          Resend
                        </button>
                      )}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Email/password flow */}
            {mode === "email" && (
              <form
                onSubmit={handleSubmit(onEmailSubmit)}
                className="mt-7 animate-[fadeInUp_0.35s_ease_both] space-y-4"
                noValidate
              >
                {emailError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {emailError}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      {...register("email")}
                      className="w-full rounded-xl border border-black/10 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-ink focus:shadow-[0_0_0_4px_rgba(23,23,23,0.06)]"
                      placeholder="you@example.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1.5 text-xs font-semibold text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      {...register("password")}
                      className="w-full rounded-xl border border-black/10 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-ink focus:shadow-[0_0_0_4px_rgba(23,23,23,0.06)]"
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-1.5 text-xs font-semibold text-red-600">{errors.password.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={emailSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {emailSubmitting ? <Loader2 className="animate-spin" size={16} /> : "Log in"}
                </button>
              </form>
            )}

            <p className="mt-7 text-center text-sm text-muted">
              New to BookMyDarzi?{" "}
              <Link href="/signup" className="font-bold text-ink hover:text-gold-deep">
                Create an account
              </Link>
            </p>
          </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
