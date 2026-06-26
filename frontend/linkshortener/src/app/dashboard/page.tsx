"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  ChartNoAxesCombined,
  Copy,
  ExternalLink,
  Link2,
  MousePointerClick,
  Plus,
  TrendingUp,
} from "lucide-react";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { listShortLinks } from "@/lib/api";
import type { LinkRead } from "@/lib/types";

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < day * 7) return `${Math.floor(diff / day)}d ago`;

  return date.toLocaleDateString();
}

function truncateUrl(url: string, max = 48) {
  return url.length > max ? `${url.slice(0, max)}…` : url;
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

export default function DashboardPage() {
  const { isSignedIn, getToken } = useAuth();
  const [links, setLinks] = useState<LinkRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLinks() {
      if (!isSignedIn) {
        setError("You must be signed in to view your dashboard.");
        setLoading(false);
        return;
      }

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
  }, [getToken, isSignedIn]);

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

  const topLinks = useMemo(() => {
    return [...links]
      .sort((a, b) => (b.click_count ?? 0) - (a.click_count ?? 0))
      .slice(0, 5)
      .map((link) => ({
        code: link.code,
        shortUrl: link.short_url,
        originalUrl: link.original_url,
        clicks: link.click_count ?? 0,
      }));
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

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <Navbar />

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

          {loading ? <DashboardSkeleton /> : null}

          {!loading && error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {!loading && !error && links.length === 0 ? <EmptyState /> : null}

          {!loading && !error && links.length > 0 ? (
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

                <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-background to-muted/20 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Total clicks</p>
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                      <MousePointerClick className="size-4" />
                    </div>
                  </div>
                  <p className="mt-4 text-3xl font-semibold tracking-tight">{stats.totalClicks}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Combined clicks across all links</p>
                </div>

                <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-background to-muted/20 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Avg. clicks</p>
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                      <TrendingUp className="size-4" />
                    </div>
                  </div>
                  <p className="mt-4 text-3xl font-semibold tracking-tight">{stats.avgClicks}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Average clicks per short link</p>
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
                <div className="rounded-2xl border border-border/50 bg-background p-6 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                      <ChartNoAxesCombined className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold tracking-tight">Creation trend</h2>
                      <p className="text-sm text-muted-foreground">How many links you created over time</p>
                    </div>
                  </div>

                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={creationTrend}>
                        <defs>
                          <linearGradient id="fillLinks" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.04} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.35} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "14px",
                            border: "1px solid hsl(var(--border))",
                            background: "hsl(var(--background))",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2.5}
                          fill="url(#fillLinks)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/50 bg-background p-6 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                      <BarChart3 className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold tracking-tight">Top links</h2>
                      <p className="text-sm text-muted-foreground">Your best-performing short URLs</p>
                    </div>
                  </div>

                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topLinks.map((link) => ({
                          name: link.code,
                          clicks: link.clicks,
                        }))}
                        layout="vertical"
                        margin={{ left: 4, right: 4, top: 4, bottom: 4 }}
                      >
                        <CartesianGrid horizontal={true} vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.35} />
                        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          width={52}
                          fontSize={12}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "14px",
                            border: "1px solid hsl(var(--border))",
                            background: "hsl(var(--background))",
                          }}
                        />
                        <Bar dataKey="clicks" radius={[0, 10, 10, 0]}>
                          {topLinks.map((link) => (
                            <Cell key={link.code} fill="hsl(var(--primary))" fillOpacity={0.85} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-border/50 bg-background p-3 shadow-sm sm:p-4">
                <div className="flex items-center justify-between px-2 pb-3 pt-1 sm:px-3">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">All links</h2>
                    <p className="text-sm text-muted-foreground">Recent links with clicks and quick actions</p>
                  </div>
                  <div className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
                    {links.length} total
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-muted-foreground">
                        <th className="px-3 py-3 text-left font-medium">Short link</th>
                        <th className="hidden px-3 py-3 text-left font-medium md:table-cell">Original URL</th>
                        <th className="px-3 py-3 text-left font-medium">Clicks</th>
                        <th className="hidden px-3 py-3 text-left font-medium sm:table-cell">Created</th>
                        <th className="px-3 py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {links.map((link) => (
                        <tr
                          key={link.code}
                          className="border-b border-border/40 last:border-0 hover:bg-muted/20"
                        >
                          <td className="px-3 py-4 align-top">
                            <div className="flex flex-col gap-1">
                              <a
                                href={link.short_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                              >
                                {link.code}
                                <ExternalLink className="size-3.5" />
                              </a>
                              <span className="text-xs text-muted-foreground">{truncateUrl(link.short_url, 36)}</span>
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
                                onClick={() => handleCopy(link.short_url, link.code)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-muted/30 text-muted-foreground transition-all hover:border-primary/20 hover:bg-primary/5 hover:text-foreground"
                                aria-label="Copy short URL"
                                title="Copy short URL"
                              >
                                <Copy className="size-4" />
                              </button>

                              <a
                                href={link.short_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-muted/30 text-muted-foreground transition-all hover:border-primary/20 hover:bg-primary/5 hover:text-foreground"
                                aria-label="Open short URL"
                                title="Open short URL"
                              >
                                <ExternalLink className="size-4" />
                              </a>
                            </div>

                            {copiedCode === link.code ? (
                              <p className="mt-2 text-right text-xs text-primary">Copied</p>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          ) : null}
        </section>
      </main>

      <Footer />
    </div>
  );
}