import Link from "next/link";
import { Link2 } from "lucide-react";
import { SiGithub } from "react-icons/si"; 

const footerLinks = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "API Docs", href: "http://localhost:8000/docs" },
  { title: "GitHub", href: "https://github.com/ashboi005" },
  { title: "Status", href: "#" },
];

export default function Footer() {
  return (
    <footer className="py-12 border-t border-border/40">
      <div className="mx-auto max-w-5xl px-6">
        <Link href="/" className="mx-auto flex w-fit items-center gap-2 font-semibold tracking-tight mb-8">
          <Link2 size={16} className="text-primary" />
          <span>snip</span>
        </Link>

        <div className="flex flex-wrap justify-center gap-6 text-sm mb-8">
          {footerLinks.map((link) => (
            <Link
              key={link.title}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              className="text-muted-foreground hover:text-primary transition-colors duration-150"
            >
              {link.title}
            </Link>
          ))}
        </div>

        <div className="flex justify-center mb-8">
          <Link
            href="https://github.com/24f3005028"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <SiGithub className="size-5" />
          </Link>
        </div>

        <p className="text-muted-foreground text-center text-sm">
          (c) {new Date().getFullYear()} snip. Built with FastAPI &amp; Next.js.
        </p>
      </div>
    </footer>
  );
}
