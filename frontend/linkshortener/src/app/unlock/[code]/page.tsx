"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Link2, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { unlockLink } from "@/lib/api";

export default function UnlockPage() {
  const params = useParams();
  const router = useRouter();
  const code = params?.code as string;

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleUnlock(e?: React.FormEvent) {
    e?.preventDefault();
    if (!password.trim()) {
      setError("Please enter the password.");
      inputRef.current?.focus();
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await unlockLink(code, { password: password.trim() });
      setSuccess(true);
      // Small delay so user sees success state before redirect
      setTimeout(() => {
        router.push(result.url);
      }, 600);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Incorrect password.";
      setError(
        msg.toLowerCase().includes("401") || msg.toLowerCase().includes("incorrect")
          ? "Incorrect password. Please try again."
          : msg
      );
      setLoading(false);
      setPassword("");
      inputRef.current?.focus();
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      

      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-sm">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div
              className={[
                "flex h-16 w-16 items-center justify-center rounded-2xl border transition-all duration-500",
                success
                  ? "border-primary/40 bg-primary/10"
                  : "border-border bg-muted/40",
              ].join(" ")}
            >
              {success ? (
                <ShieldCheck className="size-8 text-primary" />
              ) : (
                <Lock
                  className={[
                    "size-8 transition-colors duration-300",
                    error ? "text-destructive" : "text-muted-foreground",
                  ].join(" ")}
                />
              )}
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              {success ? "Unlocked!" : "Password required"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {success
                ? "Redirecting you now…"
                : "This link is protected. Enter the password to continue."}
            </p>
          </div>

          {/* Form */}
          {!success && (
            <form onSubmit={handleUnlock} noValidate className="space-y-3">
              {/* Password input */}
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={inputRef}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password…"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  autoComplete="current-password"
                  aria-label="Link password"
                  aria-describedby={error ? "unlock-error" : undefined}
                  className={[
                    "w-full h-12 rounded-xl border pl-10 pr-11 text-sm ring-offset-background",
                    "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2",
                    "transition-all duration-200 disabled:opacity-50 bg-background",
                    error
                      ? "border-destructive/60 focus-visible:ring-destructive/40"
                      : "border-input focus-visible:ring-ring",
                  ].join(" ")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>

              {/* Error message */}
              {error && (
                <p
                  id="unlock-error"
                  role="alert"
                  className="flex items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-3.5 py-2.5 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  {error}
                </p>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading || !password.trim()}
                aria-busy={loading}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 14 14"
                      fill="none"
                      className="animate-spin"
                    >
                      <circle
                        cx="7"
                        cy="7"
                        r="5.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeOpacity="0.25"
                      />
                      <path
                        d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    Verifying…
                  </>
                ) : (
                  <>
                    Unlock & Continue
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Success state */}
          {success && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2 text-sm text-primary animate-in fade-in duration-300">
                <svg width="16" height="16" viewBox="0 0 14 14" fill="none" className="animate-spin">
                  <circle
                    cx="7"
                    cy="7"
                    r="5.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeOpacity="0.25"
                  />
                  <path
                    d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                Redirecting…
              </div>
            </div>
          )}

          {/* Footer note */}
          {!success && (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              This link was created with{" "}
              <Link href="/" className="text-primary hover:underline underline-offset-2">
                Shawty
              </Link>
              . Password protection is end-to-end.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
