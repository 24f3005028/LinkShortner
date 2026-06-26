"use client";

import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Link2, Sun, Moon, LayoutDashboard } from "lucide-react";

function ModeSwitcher() {
  const { setTheme, resolvedTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-11 cursor-pointer rounded-xl border border-border/60 bg-muted/30 text-muted-foreground transition-all hover:border-primary/20 hover:bg-primary/5 hover:text-foreground"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-4.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export default function Navbar() {
  return (
    <>
      {/* Signed In State */}
      <Show when="signed-in" fallback={null}>
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-5 px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-foreground/90 transition-colors hover:text-foreground">
              <Link2 size={18} className="text-primary" />
              <span>Shawty</span>
            </Link>

            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 items-center justify-center rounded-xl border border-border/60 bg-muted/30 px-3">
                <UserButton>
                  {/* Injects the custom Dashboard item inside Clerk's user profile menu */}
                  <UserButton.MenuItems>
                    <UserButton.Link
                      label="Dashboard"
                      labelIcon={<LayoutDashboard size={14} />}
                      href="/dashboard"
                    />
                  </UserButton.MenuItems>
                </UserButton>
              </div>
              <ModeSwitcher />
            </div>
          </div>
        </header>
      </Show>

      {/* Signed Out State */}
      <Show when="signed-out" fallback={null}>
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-5 px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-foreground/90 transition-colors hover:text-foreground">
              <Link2 size={18} className="text-primary" />
              <span>Shawty</span>
            </Link>

            <div className="flex items-center gap-3">
              <SignInButton mode="modal">
                <Button className="inline-flex h-11 items-center justify-center rounded-xl border border-border/60 bg-muted/30 px-4 text-sm font-medium text-muted-foreground transition-all hover:border-primary/20 hover:bg-primary/5 hover:text-foreground">
                  Sign in
                </Button>
              </SignInButton>
              <ModeSwitcher />
            </div>
          </div>
        </header>
      </Show>
    </>
  );
}