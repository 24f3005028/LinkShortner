"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import Footer from "@/components/Footer";
import ExpiryPicker from "@/components/ExpiryPicker";
import {
  Copy,
  ExternalLink,
  Check,
  X,
  Infinity,
  Circle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
} from "lucide-react";
import { createShortLink, listShortLinks } from "@/lib/api";
import { deleteLocalLink, getLocalLinks, saveLocalLink } from "@/lib/localLinks";
import type { LinkRead } from "@/lib/types";


// --- Toast types ---
type ToastType = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;


// --- Utility: copy to clipboard ---
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}


// --- Toast component ---
function ToastNotification({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg pointer-events-auto",
            "text-sm font-medium border backdrop-blur-sm",
            "animate-in slide-in-from-bottom-2 fade-in duration-200",
            t.type === "success" && "bg-emerald-950/90 border-emerald-800 text-emerald-200",
            t.type === "error"   && "bg-red-950/90 border-red-800 text-red-200",
            t.type === "info"    && "bg-zinc-900/90 border-zinc-700 text-zinc-200",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {t.type === "success" && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-emerald-400">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {t.type === "error" && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-red-400">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6 6l4 4M10 6l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
          {t.type === "info" && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-zinc-400">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
          <span>{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
            className="ml-auto text-current opacity-50 hover:opacity-100 transition-opacity"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}


// --- Copy button with animated state ---
function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy to clipboard"}
      aria-label={copied ? "Copied!" : "Copy link"}
      className={[
        "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
        copied
          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          : "bg-muted text-muted-foreground border border-border/60 hover:bg-muted/80 hover:text-foreground",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {copied ? (
        <>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <rect x="6" y="6" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 6V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </>
      )}
    </button>
  );
}


// --- Build the displayable URL for a result (locked links use the frontend /unlock page) ---
function buildDisplayUrl(shortUrl: string, isLocked: boolean, code: string): string {
  if (!isLocked) return shortUrl;
  // Point locked links to the frontend unlock page so users see the password prompt
  if (typeof window !== "undefined") {
    return `${window.location.origin}/unlock/${code}`;
  }
  return shortUrl;
}


// --- Shorten result card ---
function ShortLinkResult({ shortUrl, isLocked, code, onDismiss }: { shortUrl: string; isLocked: boolean; code: string; onDismiss: () => void }) {
  const displayUrl = buildDisplayUrl(shortUrl, isLocked, code);
  return (
    <div className="mt-5 w-full max-w-xl animate-in slide-in-from-bottom-1 fade-in duration-300">
      <div className="flex items-center gap-3 bg-primary/8 border border-primary/20 rounded-xl px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium mb-0.5 flex items-center gap-1.5">
            Your short link
            {isLocked && (
              <span className="inline-flex items-center gap-1 text-primary">
                <Lock className="size-3" aria-hidden />
                Password protected
              </span>
            )}
          </p>
          <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-mono text-sm font-semibold underline-offset-2 hover:underline truncate block"
          >
            {displayUrl}
          </a>
        </div>
        <CopyButton text={displayUrl} />
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground transition-colors ml-1"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}


// --- Inline error banner ---
function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="mt-3 w-full max-w-xl flex items-start gap-2 bg-destructive/8 border border-destructive/25 text-destructive rounded-lg px-3.5 py-2.5 text-sm animate-in fade-in duration-200">
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-px">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="opacity-60 hover:opacity-100 transition-opacity shrink-0" aria-label="Dismiss error">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}


// --- Format URL for display ---
function formatDisplayUrl(url: string, maxLen = 48) {
  try {
    const u = new URL(url);
    const display = u.hostname + u.pathname;
    return display.length > maxLen ? display.slice(0, maxLen) + "\u2026" : display;
  } catch {
    return url.length > maxLen ? url.slice(0, maxLen) + "\u2026" : url;
  }
}


// --- Format relative time ---
function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}


function getForeverExpiryIso() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 10);
  return date.toISOString();
}


// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const { getToken, isSignedIn } = useAuth();
  const [url, setUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | null | undefined>(undefined);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);

  // Password lock state
  const [lockEnabled, setLockEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [shortLinkCode, setShortLinkCode] = useState<string | null>(null);
  const [shortLinkLocked, setShortLinkLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localLinks, setLocalLinks] = useState<LinkRead[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [recentLinks, setRecentLinks] = useState<LinkRead[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const expiryTriggerRef = useRef<HTMLDivElement>(null);


  // --- Toast helpers ---
  function addToast(message: string, type: ToastType = "info") {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => dismissToast(id), 3500);
  }

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }


  // Focus password input when lock is enabled
  useEffect(() => {
    if (lockEnabled) passwordRef.current?.focus();
  }, [lockEnabled]);


  // --- Load local links on mount ---
  useEffect(() => {
    async function load() {
      try {
        const links = await getLocalLinks();
        setLocalLinks(links);
      } finally {
        setLocalLoading(false);
      }
    }
    load();
  }, []);


  useEffect(() => {
    let active = true;
    async function loadRecentLinks() {
      if (!isSignedIn) {
        if (active) setRecentLinks([]);
        return;
      }
      try {
        const token = await getToken();
        const data = await listShortLinks({ page: 1, pageSize: 5 }, token ?? undefined);
        if (active) setRecentLinks(data.items);
      } catch {
        // Silent failure on home page.
      }
    }
    loadRecentLinks();
    return () => { active = false; };
  }, [getToken, isSignedIn]);


  // --- Shorten handler ---
  async function handleShorten() {
    setError(null);
    setShortUrl(null);
    setShortLinkLocked(false);

    if (!url.trim()) {
      setError("Please enter a valid URL.");
      inputRef.current?.focus();
      return;
    }

    try {
      new URL(url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`);
    } catch {
      setError("That doesn't look like a valid URL. Include https://");
      inputRef.current?.focus();
      return;
    }

    if (lockEnabled && !password.trim()) {
      setError("Enter a password for the locked link, or disable the lock.");
      passwordRef.current?.focus();
      return;
    }

    try {
      setLoading(true);
      const normalizedUrl = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
      const expiresAtIso = expiresAt === null ? getForeverExpiryIso() : expiresAt?.toISOString();
      const passwordValue = lockEnabled ? password.trim() : undefined;

      const payload = {
        url: normalizedUrl,
        ...(expiresAtIso ? { expires_at: expiresAtIso } : {}),
        ...(passwordValue ? { password: passwordValue } : {}),
      };

      let result: LinkRead;
      if (isSignedIn) {
        const token = await getToken();
        result = await createShortLink(payload, token ?? undefined);
        setRecentLinks((prev) => [result, ...prev].slice(0, 5));
      } else {
        result = await createShortLink(payload);
        await saveLocalLink(result);
        setLocalLinks(await getLocalLinks());
      }

      setShortUrl(result.short_url);
      setShortLinkCode(result.code);
      setShortLinkLocked(result.is_locked ?? false);
      addToast(
        lockEnabled ? "Password-protected link created!" : "Short link created!",
        "success",
      );

      setUrl("");
      setExpiresAt(undefined);
      setShowExpiryPicker(false);
      setLockEnabled(false);
      setPassword("");
      setShowPassword(false);
    } catch (caughtError) {
      const msg = caughtError instanceof Error ? caughtError.message : "Failed to shorten URL.";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }


  async function handleDeleteLocalLink(code: string) {
    await deleteLocalLink(code);
    setLocalLinks(await getLocalLinks());
    addToast("Link removed.", "info");
  }

  async function handleCopyRecentLink(shortUrl: string, code: string) {
    const ok = await copyToClipboard(shortUrl);
    if (!ok) return;
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !loading) handleShorten();
  }


  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">

      <main className="flex-1 w-full">
        {/* ── Hero ── */}
        <section className="mx-auto max-w-3xl px-6 pt-28 pb-20 flex flex-col items-center text-center">

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide mb-6 select-none">
            <Circle className="size-2.5 fill-current" aria-hidden="true" />
            Free \u2022 No account required
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter leading-[1.08] mb-5">
            Short links that{" "}
            <span className="text-primary relative">
              actually work
              <svg
                className="absolute -bottom-1 left-0 w-full"
                height="4" viewBox="0 0 100 4" preserveAspectRatio="none"
                fill="none" aria-hidden="true"
              >
                <path d="M0 3 Q25 0 50 2 Q75 4 100 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </span>
          </h1>

          <p className="text-muted-foreground text-lg max-w-sm mb-10 leading-relaxed">
            Shorten any URL in seconds. Track clicks, set expiry dates, and share clean links.
          </p>

          {/* ── Input row ── */}
          <div className="w-full max-w-xl flex gap-2">
            <div className="relative flex-1">
              <svg
                width="16" height="16" viewBox="0 0 16 16" fill="none"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                aria-hidden="true"
              >
                <path d="M6.5 10.5l-2-2a3.536 3.536 0 0 1 5-5L11 5m-1.5 1.5 2 2a3.536 3.536 0 0 1-5 5L5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                type="url"
                placeholder="https://your-very-long-url.com/page"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                aria-label="URL to shorten"
                className="w-full h-11 rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent transition-shadow disabled:opacity-50 shadow-sm"
              />
            </div>

            {/* ── Expiry button ── */}
            <div ref={expiryTriggerRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowExpiryPicker((v) => !v)}
                aria-label="Set expiry"
                title={
                  expiresAt === undefined
                    ? "Set expiry (optional)"
                    : expiresAt === null
                    ? "Never expires"
                    : `Expires ${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                }
                className={[
                  "h-11 px-3 rounded-xl border text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm",
                  expiresAt === undefined
                    ? "border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    : "border-primary/40 bg-primary/8 text-primary hover:bg-primary/12",
                ].join(" ")}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>

                {expiresAt === undefined
                  ? ""
                  : expiresAt === null
                  ? (
                    <span className="inline-flex items-center gap-1">
                      <Infinity className="size-3.5" aria-hidden="true" />
                      Forever
                    </span>
                  )
                  : `${expiresAt.toLocaleDateString([], { month: "short", day: "numeric" })}`}

                {expiresAt !== undefined && (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Clear expiry"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpiresAt(undefined);
                      setShowExpiryPicker(false);
                    }}
                    className="ml-0.5 opacity-50 hover:opacity-100 leading-none inline-flex items-center"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </span>
                )}
              </button>

              {showExpiryPicker && (
                <ExpiryPicker
                  value={expiresAt ?? null}
                  onChange={(date) => setExpiresAt(date)}
                  onClose={() => setShowExpiryPicker(false)}
                />
              )}
            </div>

            {/* ── Lock button ── */}
            <button
              type="button"
              onClick={() => {
                setLockEnabled((v) => !v);
                if (lockEnabled) setPassword("");
              }}
              aria-label={lockEnabled ? "Remove password lock" : "Add password lock"}
              title={lockEnabled ? "Click to remove password protection" : "Only open with a password"}
              className={[
                "h-11 px-3 rounded-xl border text-xs font-medium transition-all duration-200 flex items-center gap-1.5 shadow-sm shrink-0",
                lockEnabled
                  ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
                  : "border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
            >
              {lockEnabled
                ? <Lock className="size-3.5" aria-hidden />
                : <Unlock className="size-3.5" aria-hidden />
              }
              {lockEnabled ? "Locked" : "Lock"}
            </button>

            <button
              onClick={handleShorten}
              disabled={loading}
              aria-busy={loading}
              className="h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm whitespace-nowrap flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="animate-spin">
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
                    <path d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Shortening\u2026
                </>
              ) : (
                <>
                  Shorten URL
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {/* ── Password input (shown when lock is enabled) ── */}
          {lockEnabled && (
            <div className="mt-2 w-full max-w-xl animate-in slide-in-from-top-1 fade-in duration-200">
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none"
                  aria-hidden
                />
                <input
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  placeholder="Set a password for this link…"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  aria-label="Link password"
                  className="w-full h-10 rounded-xl border border-input bg-background pl-9 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent transition-shadow disabled:opacity-50 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword
                    ? <EyeOff className="size-3.5" aria-hidden />
                    : <Eye className="size-3.5" aria-hidden />
                  }
                </button>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground text-left pl-1">
                Visitors will be prompted to enter this password before being redirected.
              </p>
            </div>
          )}

          {/* Error banner */}
          {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

          {/* Result card */}
          {shortUrl ? (
            <ShortLinkResult
              shortUrl={shortUrl}
              isLocked={shortLinkLocked}
              code={shortLinkCode ?? ""}
              onDismiss={() => { setShortUrl(null); setShortLinkLocked(false); setShortLinkCode(null); }}
            />
          ) : null}

          {/* Feature pills */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
            {[
              { icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", label: "No account needed" },
              { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", label: "Click analytics" },
              { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", label: "Expiry dates" },
              { icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", label: "Password lock" },
            ].map(({ icon, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={icon} />
                </svg>
                {label}
              </span>
            ))}
          </div>

          {isSignedIn && recentLinks.length > 0 ? (
            <div className="mt-12 w-full max-w-xl text-left">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your recent links</h2>
                <Link href="/dashboard" className="text-xs text-primary hover:underline">
                  View all \u2192
                </Link>
              </div>

              <ul className="space-y-2">
                {recentLinks.map((link) => (
                  <li
                    key={link.code}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <a
                        href={link.short_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate font-medium text-primary hover:underline inline-flex items-center gap-1.5"
                      >
                        {link.short_url}
                              {link.is_locked && <Lock className="size-3 text-primary shrink-0" aria-label="Password protected" />}
                      </a>
                      <span className="truncate text-xs text-muted-foreground">
                        {link.original_url.length > 50
                          ? `${link.original_url.slice(0, 50)}\u2026`
                          : link.original_url}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="tabular-nums text-xs text-muted-foreground">{link.click_count} clicks</span>
                      <button
                        type="button"
                        onClick={() => handleCopyRecentLink(link.short_url, link.code)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                        aria-label="Copy"
                      >
                        {copiedCode === link.code ? (
                          <Check className="size-3.5 text-primary" aria-hidden="true" />
                        ) : (
                          <Copy className="size-3.5" aria-hidden="true" />
                        )}
                      </button>
                      <a
                        href={link.short_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                        aria-label="Open"
                      >
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* ── Local links table (guests only) ── */}
        {!isSignedIn ? (
          <section className="mx-auto max-w-5xl px-6 pb-20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold">Your links on this device</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sign in to sync links across devices
                </p>
              </div>
              {localLinks.length > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
                  {localLinks.length} link{localLinks.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {localLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-muted/60 animate-pulse" />
                ))}
              </div>
            ) : localLinks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 rounded-2xl border border-dashed border-border/60 text-center">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted-foreground">
                    <path d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No links yet</p>
                <p className="text-xs text-muted-foreground max-w-[22ch]">
                  Shorten a URL above and it will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/40">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Short URL</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Original</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Created</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localLinks.map((link) => (
                        <tr
                          key={link.code}
                          className="border-b border-border/40 last:border-0 transition-colors hover:bg-muted/30"
                        >
                          <td className="px-4 py-3.5">
                            <a
                              href={link.short_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary font-mono text-xs font-semibold hover:underline underline-offset-2 truncate max-w-[140px] flex items-center gap-1.5"
                            >
                              {link.short_url.replace(/^https?:\/\//, "")}
                                    {link.is_locked && <Lock className="size-3 text-primary shrink-0" aria-label="Password protected" />}
                            </a>
                          </td>
                          <td className="px-4 py-3.5 hidden sm:table-cell">
                            <span className="text-muted-foreground text-xs font-mono" title={link.original_url}>
                              {formatDisplayUrl(link.original_url)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 hidden md:table-cell">
                            <span className="text-muted-foreground text-xs" title={new Date(link.created_at).toLocaleString()}>
                              {formatRelativeTime(link.created_at)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <CopyButton text={link.short_url} />
                              <button
                                onClick={() => handleDeleteLocalLink(link.code)}
                                title="Remove link"
                                aria-label="Remove link"
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                                  <path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M3 3.5l.667 7.5a1 1 0 0 0 1 .917h4.666a1 1 0 0 0 1-.917L11 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        ) : null}
      </main>

      <Footer />
      <ToastNotification toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
