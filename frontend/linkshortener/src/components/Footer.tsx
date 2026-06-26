import Link from "next/link";
import {  ArrowUpRight } from "lucide-react";
import { SiGithub } from "react-icons/si";

const footerLinks = [
  { title: "API Docs", href: "https://api-linkshortener.brewwithcrew.com/docs" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="mx-auto max-w-5xl px-6 py-10 sm:py-12">
        <div className="flex flex-col gap-8 sm:gap-10">
        <div className="flex flex-col items-center justify-between gap-5 sm:flex-row sm:items-center">
  {/* Left Side: Tagline */}
  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/80">
    Minimal. Fast. Reliable.
  </p>

  {/* Right Side: Links Container */}
  <div className="flex flex-wrap items-center gap-3">
    {footerLinks.map((link) => (
      <Link
        key={link.title}
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 text-sm font-medium text-muted-foreground transition-all hover:border-primary/20 hover:bg-primary/5 hover:text-foreground"
      >
        {link.title}
        <ArrowUpRight size={14} className="opacity-70" />
      </Link>
    ))}

    {/* GitHub Icon Link */}
    <Link
      href="https://github.com/24f3005028"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="GitHub"
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-muted/30 text-muted-foreground transition-all hover:border-primary/20 hover:bg-primary/5 hover:text-foreground"
    >
      <SiGithub className="size-4.5" />
    </Link>
  </div>
</div>

          <div className="h-px w-full bg-border/50" />

         
           
          
        </div>
      </div>
    </footer>
  );
}