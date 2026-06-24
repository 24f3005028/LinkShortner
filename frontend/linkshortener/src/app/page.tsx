import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-dvh flex flex-col">
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
            className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Shorten
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}