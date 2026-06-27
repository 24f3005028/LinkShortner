"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Show, SignInButton, useAuth } from "@clerk/nextjs";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartNoAxesCombined,
  Copy,
  ExternalLink,
  Link2,
  Lock,
  MousePointerClick,
  Plus,
  TrendingUp,
} from "lucide-react";

import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { listShortLinks } from "@/lib/api";
import { buildDisplayUrl } from "@/lib/utils";
import type { LinkRead } from "@/lib/types";

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  return `${Math.floor(diff / day)}d ago`;
}

function truncateUrl(url: string, maxLength = 42) {
  if (url.length <= maxLength) return url;
  return `${url.slice(0, maxLength)}...`;
}

async function copyToClipboard(value: string) {
  await navigator.clipboard.writeText(value);
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="rounded-2xl border border-border/50 bg-muted/30 p-5">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="mt-4 h-8 w-20 rounded bg-muted" />
            <div className="mt-3 h-3 w-32 rounded bg-muted" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-2xl border border-border/50 bg-muted/30 p-6">
          <div className="h-5 w-40 rounded bg-muted" />
          <div className="mt-4 h-[260px] rounded-xl bg-muted" />
        </div>
        <div className="rounded-2xl border border-border/50 bg-muted/30 p-6">
          <div className="h-5 w-36 rounded bg-muted" />
          <div className="mt-4 h-[260px] rounded-xl bg-muted" />
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-muted/30 p-6">
        <div className="h-5 w-44 rounded bg-muted" />
        <div className="mt-4 space-y-3">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="h-14 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="rounded-3xl border border-border/50 bg-gradient-to-br from-background to-muted/20 p-10 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-muted/40">
        <Link2 className="size-6 text-primary" />
      </div>
      <h2 className="mt-5 text-xl font-semibold tracking-tight">No links yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Your dashboard will show link activity, creation trends, and top-performing short URLs once you create your first one.
      </p>
      <Button asChild className="mt-6 h-11 rounded-xl px-5">
        <Link href="/">
          <Plus className="mr-2 size-4" />
          Create your first link
        </Link>
      </Button>
    </section>
  );
}

function SignedOutState() {
  return (
    <div className="my-12 mx-auto max-w-md rounded-3xl border border-border/50 bg-gradient-to-br from-background to-muted/20 p-10 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-muted/40">
        <Lock className="size-6 text-primary" />
      </div>
      <h2 className="mt-5 text-xl font-semibold tracking-tight">Sign in required</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Please sign in to view your short link analytics and dashboard.
      </p>
      <div className="mt-6">
        <SignInButton mode="modal">
          <Button className="h-11 rounded-xl px-6">Sign in</Button>
        </SignInButton>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { getToken } = useAuth();
  const [links, setLinks] = useState<LinkRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#22c55e");
  const [borderColor, setBorderColor] = useState("#e2e8f0");
  const [bgColor, setBgColor] = useState("#ffffff");

  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const primary = style.getPropertyValue("--primary").trim();
    const border = style.getPropertyValue("--border").trim();
    const background = style.getPropertyValue("--background").trim();

    function applyColors() {
      if (primary) setPrimaryColor(`hsl(${primary})`);
      if (border) setBorderColor(`hsl(${border})`);
      if (background) setBgColor(`hsl(${background})`);
    }

    applyColors();
  }, []);

  useEffect(() => {
    async function fetchLinks() {
      setError(null);
      try {
        const token = await getToken();
        const data = await listShortLinks({ page: 1, pageSize: 50 }, token ?? undefined);
        setLinks(data.items);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Failed to load your links.");
      } finally {
        setLoading(false);
      }
    }

    fetchLinks();
  }, [getToken]);

  const stats = useMemo(() => {
    const totalLinks = links.length;
    const totalClicks = links.reduce((sum, link) => sum + (link.click_count ?? 0), 0);
    const avgClicks = totalLinks > 0 ? (totalClicks / totalLinks).toFixed(1) : "0.0";

    return { totalLinks, totalClicks, avgClicks };
  }, [links]);

  const creationTrend = useMemo(() => {
    const map = new Map<string, number>();

    links.forEach((link) => {
      const key = new Date(link.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      map.set(key, (map.get(key) ?? 0) + 1);
    });

    return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
  }, [links]);

  async function handleCopy(shortUrl: string, code: string) {
    try {
      await copyToClipboard(shortUrl);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1800);
    } catch {
      setCopiedCode(null);
    }
  }

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (links.length === 0) return <EmptyState />;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-background to-muted/20 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total links</p>
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Link2 className="size-4" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-tight">{stats.totalLinks}</p>
          <p className="mt-2 text-xs text-muted-foreground">All short URLs in your account</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total clicks</p>
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <MousePointerClick className="size-4" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-tight">{stats.totalClicks}</p>
          <p className="mt-2 text-xs text-muted-foreground">Combined clicks across all links</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Avg. clicks</p>
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-tight">{stats.avgClicks}</p>
          <p className="mt-2 text-xs text-muted-foreground">Average clicks per shortened link</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-2xl border border-border/50 bg-muted/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold tracking-tight">Click activity</h2>
              <p className="text-xs text-muted-foreground">Engagement overview across your links</p>
            </div>
            <ChartNoAxesCombined className="size-4 text-muted-foreground" />
          </div>

          <div className="mt-6 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={creationTrend}>
                <defs>
                  <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={primaryColor} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={primaryColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={borderColor} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="currentColor"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="currentColor"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                    borderRadius: "0.75rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={primaryColor}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#clicksGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-muted/30 p-6">
          <h2 className="font-semibold tracking-tight">Quick insights</h2>
          <p className="text-xs text-muted-foreground">Summary of your account performance</p>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-border/60 bg-background p-4">
              <p className="text-xs text-muted-foreground">Most active link metric</p>
              <p className="mt-1 text-sm font-medium">
                {links.length > 0
                  ? `${Math.max(...links.map((link) => link.click_count ?? 0))} peak clicks on a single URL`
                  : "No data available"}
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background p-4">
              <p className="text-xs text-muted-foreground">Account status</p>
              <p className="mt-1 text-sm font-medium text-primary">Active & tracking properly</p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background p-4">
              <p className="text-xs text-muted-foreground">Recommendation</p>
              <p className="mt-1 text-sm font-medium">
                Share links across social channels to improve average click volume.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/50 bg-muted/30 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold tracking-tight">Your links</h2>
            <p className="text-xs text-muted-foreground">Manage and review all your shortened URLs</p>
          </div>
          <span className="rounded-full bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {links.length} total
          </span>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs text-muted-foreground">
                <th className="pb-3 font-medium">Short link</th>
                <th className="hidden pb-3 font-medium md:table-cell">Original URL</th>
                <th className="pb-3 font-medium">Clicks</th>
                <th className="hidden pb-3 font-medium sm:table-cell">Created</th>
                <th className="pb-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => {
                const displayUrl = buildDisplayUrl(link.short_url, link.is_locked, link.code);
                return (
                <tr
                  key={link.code}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/20"
                >
                  <td className="px-3 py-4 align-top">
                    <div className="flex flex-col gap-1">
                      <a
                        href={displayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                      >
                        {link.code}
                        {link.is_locked && <Lock className="size-3 text-primary shrink-0" aria-label="Password protected" />}
                        <ExternalLink className="size-3.5" />
                      </a>
                      <span className="text-xs text-muted-foreground">{truncateUrl(displayUrl, 36)}</span>
                    </div>
                  </td>

                  <td className="hidden max-w-xs px-3 py-4 text-muted-foreground md:table-cell">
                    <span title={link.original_url}>{truncateUrl(link.original_url)}</span>
                  </td>

                  <td className="px-3 py-4">
                    <div className="inline-flex rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-medium">
                      {link.click_count}
                    </div>
                  </td>

                  <td className="hidden px-3 py-4 text-muted-foreground sm:table-cell">
                    <span title={new Date(link.created_at).toLocaleString()}>
                      {formatRelativeDate(link.created_at)}
                    </span>
                  </td>

                  <td className="px-3 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(displayUrl, link.code)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-muted/30 text-muted-foreground transition-all hover:border-primary/20 hover:bg-primary/5 hover:text-foreground"
                        aria-label="Copy short URL"
                        title="Copy short URL"
                      >
                        {copiedCode === link.code ? (
                          <span className="text-xs text-primary">✓</span>
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </button>

                      <a
                        href={displayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-muted/30 text-muted-foreground transition-all hover:border-primary/20 hover:bg-primary/5 hover:text-foreground"
                        aria-label="Open short URL"
                        title="Open short URL"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-6 py-10 sm:py-12">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                Personal analytics
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Your short links, <span className="text-primary">organized</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Track what you’ve created, see which links get clicks, and manage everything from one clean dashboard.
              </p>
            </div>

            <Button asChild className="h-11 rounded-xl px-5">
              <Link href="/">
                <Plus className="mr-2 size-4" />
                Create link
              </Link>
            </Button>
          </div>

          <Show when="signed-in" fallback={<DashboardSkeleton />}>
            <DashboardContent />
          </Show>

          <Show when="signed-out">
            <SignedOutState />
          </Show>
        </section>
      </main>

      <Footer />
    </div>
  );
}