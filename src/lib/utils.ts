import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Strip trailing slash (except `/`) so nav matches with `trailingSlash: true` in Next config */
export function normalizePathname(path: string): string {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

export function isAdminNavActive(itemHref: string, pathname: string): boolean {
  const p = normalizePathname(pathname);
  const h = normalizePathname(itemHref);
  if (h === "/admin/dashboard") {
    return p === "/admin/dashboard" || p === "/admin";
  }
  return p === h;
}

export function isHrNavActive(itemHref: string, pathname: string): boolean {
  const p = normalizePathname(pathname);
  const h = normalizePathname(itemHref);
  if (h === "/hr/dashboard") {
    return p === "/hr/dashboard" || p === "/hr";
  }
  if (h === "/hr/settings") {
    return p === "/hr/settings";
  }
  if (h === "/hr/history") {
    return p === "/hr/history" || p.startsWith(`${h}/`);
  }
  return p === h;
}
