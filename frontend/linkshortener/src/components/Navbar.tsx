"use client";

import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { buttonVariants, Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Separator } from "@/components/ui/separator";
import { Link2, Sun, Moon } from "lucide-react";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "https://api-linkshortener.brewwithcrew.com/docs", label: "API Docs", external: true },
];

function ModeSwitcher() {
  const { setTheme, resolvedTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 cursor-pointer"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export default function Navbar() {
  return (
    <>
      <Show when="signed-in" fallback={null}>
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-6">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
                <Link2 size={18} className="text-primary" />
                <span>snip</span>
              </Link>

              <NavigationMenu className="hidden md:flex">
                <NavigationMenuList>
                  {navLinks.map((link) => (
                    <NavigationMenuItem key={link.href}>
                      <NavigationMenuLink asChild>
                        <Link
                          href={link.href}
                          target={link.external ? "_blank" : undefined}
                          className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {link.label}
                        </Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  ))}
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            <div className="flex items-center gap-2">
              <UserButton />
              <Separator orientation="vertical" className="data-[orientation=vertical]:h-5" />
              <ModeSwitcher />
            </div>
          </div>
        </header>
      </Show>

      <Show when="signed-out" fallback={null}>
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <Link2 size={18} className="text-primary" />
              <span>snip</span>
            </Link>

            <div className="flex items-center gap-2">
              <SignInButton mode="modal">
                <Button className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
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