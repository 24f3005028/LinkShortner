import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function buildDisplayUrl(shortUrl: string, isLocked: boolean | undefined, code: string): string {
  if (!isLocked) return shortUrl;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/unlock/${code}`;
  }
  return shortUrl;
}
