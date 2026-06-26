"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createShortLink } from "@/lib/api";

export default function Home() {
  const { getToken, isSignedIn } = useAuth();
  const [url, setUrl] = useState("");
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShorten() {
    setError(null);
    setShortUrl(null);

    if (!url.trim()) {
      setError("Please enter a URL.");
      return;
    }

    if (!isSignedIn) {
      setError("You must be signed in to shorten links.");
      return;
    }

    try {
      setLoading(true);
      const token = await getToken();
      const result = await createShortLink({ url }, token ?? undefined);
      setShortUrl(result.short_url);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to shorten URL.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-5xl px-6 py-24 flex flex-col items-center justify-center text-center">
        <h1 className="text-5xl font-bold tracking-tighter mb-4">
          Short links that <span className="text-primary">actually work</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mb-10">
          Shorten any URL in seconds. Track clicks, set expiry dates, and get a clean short link.
        </p>
        <div className="flex w-full max-w-xl gap-2">
          <input
            type="url"
            placeholder="Paste a long URL here..."
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            onClick={handleShorten}
            disabled={loading}
            className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Shortening..." : "Shorten"}
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        {shortUrl ? (
          <p className="mt-4 text-sm">
            Short link: {" "}
            <a href={shortUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
              {shortUrl}
            </a>
          </p>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}