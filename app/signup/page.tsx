"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  BadgeCheck,
  KeyRound,
  Lock,
  Loader2,
  Mail,
  Phone,
  Ruler,
  Smartphone,
  Truck,
  User,
} from "lucide-react";
import { useAuth } from "@/lib/useAuth";

const RESEND_COOLDOWN_SECONDS = 30;

const detailsSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  mobile: z
    .string()
    .min(1, "Mobile number is required")
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type DetailsFormValues = z.infer<typeof detailsSchema>;

const otpSchema = z.object({
  otp: z.string().min(4, "Enter the OTP sent to your email"),
});
type OtpFormValues = z.infer<typeof otpSchema>;

const BRAND_POINTS = [
  { icon: Truck, text: "Book in minutes, we pick up at your door" },
  { icon: Ruler, text: "Save measurements once, reuse every order" },
  { icon: BadgeCheck, text: "Track every order from stitch to delivery" },
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

export default function SignupPage() {
  const router = useRouter();
  const { fetchSession, requestMobileOtp, verifyMobileOtp } = useAuth();

  const [mode, setMode] = useState<"mobile" | "email">("mobile");

  // Mobile OTP state (same [PRIMARY] flow as login - the backend's
  // /auth/mobile/verify-otp creates the account on first verification, so
  // there is no separate "signup" step for this path).
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState<"phone" | "otp">("phone");
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Email/password 2-step signup state
  const [step, setStep] = useState<"details" | "otp">("details");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const detailsForm = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { first_name: "", last_name: "", email: "", mobile: "", password: "" },
  });
  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
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

  const handleSendMobileOtp = async () => {
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

  const submitMobileOtp = async (code: string) => {
    if (code.length !== 6 || otpSubmitting) return;
    setOtpError(null);
    setOtpSubmitting(true);
    const result = await verifyMobileOtp(mobile, code);
    setOtpSubmitting(false);
    if (!result.ok) {
      setOtpError(result.message ?? "Invalid OTP. Please try again.");
      return;
    }
    router.push("/");
    router.refresh();
  };

  const handleResendMobileOtp = async () => {
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

  const onSubmitDetails = async (values: DetailsFormValues) => {
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message ?? "Signup failed. Please try again.");
        setSubmitting(false);
        return;
      }
      setEmail(values.email);
      setStep("otp");
      setSubmitting(false);
    } catch {
      setFormError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  const onSubmitOtp = async (values: OtpFormValues) => {
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: values.otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message ?? "Invalid OTP. Please try again.");
        setSubmitting(false);
        return;
      }
      await fetchSession();
      setSubmitting(false);
      router.push("/");
      router.refresh();
    } catch {
      setFormError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  const onResendOtp = async () => {
    setResendMessage(null);
    setResending(true);
    try {
      const res = await fetch("/api/auth/signup-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(detailsForm.getValues()),
      });
      const data = await res.json();
      setResendMessage(res.ok ? "OTP resent to your email." : data.message ?? "Could not resend OTP.");
    } catch {
      setResendMessage("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="relative min-h-[calc(100vh-76px)] overflow-hidden bg-cream">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-gold/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-ink/5 blur-3xl"
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
                Join India&apos;s premium doorstep tailoring platform.
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-white/55">
                Create your account in under a minute and book your first fitting today.
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
              <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">Get started</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-.03em]">Create account</h2>
              <p className="mt-2 text-sm text-muted">Choose how you&apos;d like to sign up.</p>

              {/* Mode tabs */}
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-cream-deep p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("mobile");
                  setFormError(null);
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
                      htmlFor="signup-mobile"
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
                          id="signup-mobile"
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          autoComplete="tel-national"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          onKeyDown={(e) => e.key === "Enter" && handleSendMobileOtp()}
                          placeholder="98765 43210"
                          className="w-full rounded-xl border border-black/10 bg-white py-3 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-ink focus:shadow-[0_0_0_4px_rgba(23,23,23,0.06)]"
                        />
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-muted">
                      We&apos;ll text you a 6-digit code. New here? This creates your account automatically.
                    </p>

                    <button
                      type="button"
                      onClick={handleSendMobileOtp}
                      disabled={otpSubmitting || mobile.length !== 10}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {otpSubmitting ? <Loader2 className="animate-spin" size={16} /> : <>Send OTP</>}
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
                      onComplete={submitMobileOtp}
                    />

                    <button
                      type="button"
                      onClick={() => submitMobileOtp(otp)}
                      disabled={otpSubmitting || otp.length !== 6}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {otpSubmitting ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <>
                          <BadgeCheck size={16} /> Verify & continue
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
                          onClick={handleResendMobileOtp}
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

            {/* Email 2-step signup flow */}
            {mode === "email" && (
              <div key={step} className="mt-7 animate-[fadeInUp_0.35s_ease_both]">
                {step === "details" ? (
                  <form onSubmit={detailsForm.handleSubmit(onSubmitDetails)} className="space-y-4" noValidate>
                    {formError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        {formError}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                          First name
                        </label>
                        <div className="relative">
                          <User
                            size={16}
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                          />
                          <input
                            {...detailsForm.register("first_name")}
                            className="w-full rounded-xl border border-black/10 bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-ink focus:shadow-[0_0_0_4px_rgba(23,23,23,0.06)]"
                            placeholder="Priya"
                          />
                        </div>
                        {detailsForm.formState.errors.first_name && (
                          <p className="mt-1.5 text-xs font-semibold text-red-600">
                            {detailsForm.formState.errors.first_name.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                          Last name
                        </label>
                        <input
                          {...detailsForm.register("last_name")}
                          className="w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm outline-none transition focus:border-ink focus:shadow-[0_0_0_4px_rgba(23,23,23,0.06)]"
                          placeholder="Sharma"
                        />
                        {detailsForm.formState.errors.last_name && (
                          <p className="mt-1.5 text-xs font-semibold text-red-600">
                            {detailsForm.formState.errors.last_name.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                        Email
                      </label>
                      <div className="relative">
                        <Mail
                          size={17}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="email"
                          autoComplete="email"
                          {...detailsForm.register("email")}
                          className="w-full rounded-xl border border-black/10 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-ink focus:shadow-[0_0_0_4px_rgba(23,23,23,0.06)]"
                          placeholder="you@example.com"
                        />
                      </div>
                      {detailsForm.formState.errors.email && (
                        <p className="mt-1.5 text-xs font-semibold text-red-600">
                          {detailsForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                        Mobile number
                      </label>
                      <div className="relative">
                        <Phone
                          size={17}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="tel"
                          autoComplete="tel"
                          {...detailsForm.register("mobile")}
                          className="w-full rounded-xl border border-black/10 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-ink focus:shadow-[0_0_0_4px_rgba(23,23,23,0.06)]"
                          placeholder="9876543210"
                        />
                      </div>
                      {detailsForm.formState.errors.mobile && (
                        <p className="mt-1.5 text-xs font-semibold text-red-600">
                          {detailsForm.formState.errors.mobile.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                        Password
                      </label>
                      <div className="relative">
                        <Lock
                          size={17}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="password"
                          autoComplete="new-password"
                          {...detailsForm.register("password")}
                          className="w-full rounded-xl border border-black/10 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-ink focus:shadow-[0_0_0_4px_rgba(23,23,23,0.06)]"
                          placeholder="At least 8 characters"
                        />
                      </div>
                      {detailsForm.formState.errors.password && (
                        <p className="mt-1.5 text-xs font-semibold text-red-600">
                          {detailsForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {submitting ? <Loader2 className="animate-spin" size={16} /> : "Send OTP"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={otpForm.handleSubmit(onSubmitOtp)} className="space-y-4" noValidate>
                    {formError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        {formError}
                      </div>
                    )}
                    {resendMessage && (
                      <div className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-gray-600">
                        {resendMessage}
                      </div>
                    )}

                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                        One-time code
                      </label>
                      <div className="relative">
                        <KeyRound
                          size={17}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          {...otpForm.register("otp")}
                          className="w-full rounded-xl border border-black/10 bg-white py-3 pl-11 pr-4 text-center text-lg font-bold tracking-[.3em] outline-none transition focus:border-ink focus:shadow-[0_0_0_4px_rgba(23,23,23,0.06)]"
                          placeholder="••••••"
                        />
                      </div>
                      {otpForm.formState.errors.otp && (
                        <p className="mt-1.5 text-xs font-semibold text-red-600">
                          {otpForm.formState.errors.otp.message}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {submitting ? <Loader2 className="animate-spin" size={16} /> : "Verify & create account"}
                    </button>

                    <div className="flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => setStep("details")}
                        className="flex items-center gap-1 font-bold text-muted hover:text-ink"
                      >
                        <ArrowLeft size={12} /> Edit details
                      </button>
                      <button
                        type="button"
                        onClick={onResendOtp}
                        disabled={resending}
                        className="font-bold text-gold-deep hover:text-ink disabled:opacity-60"
                      >
                        {resending ? "Resending…" : "Resend OTP"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            <p className="mt-7 text-center text-sm text-muted">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-ink hover:text-gold-deep">
                Log in
              </Link>
            </p>
          </div>
          </div>
        </div>
      </div>
    </main>
  );
}
