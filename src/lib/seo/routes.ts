export const NEVER_INDEX_PREFIXES = [
  "/dashboard", "/admin", "/onboarding", "/portal", "/patient", "/consultation",
  "/api", "/login", "/register", "/verify", "/set-password", "/billing", "/maintenance",
] as const;

export const PUBLIC_ROUTES = [
  { path: "/", priority: 1.0, changefreq: "weekly" },
  { path: "/pricing", priority: 0.9, changefreq: "weekly" },
  { path: "/contact", priority: 0.8, changefreq: "monthly" },
  { path: "/legal/terms", priority: 0.3, changefreq: "monthly" },
  { path: "/legal/privacy", priority: 0.3, changefreq: "monthly" },
] as const;

export function assertIndexable(url: string) {
  try {
    const parsed = new URL(url, process.env.NEXT_PUBLIC_APP_URL || "https://openordo.com");
    if (parsed.searchParams.toString().length > 0) {
      throw new Error("Query parameters are not allowed in sitemap URLs");
    }
    const path = parsed.pathname;
    
    if (path.startsWith("/api/files")) {
      throw new Error("File routes cannot be indexed");
    }
    
    for (const prefix of NEVER_INDEX_PREFIXES) {
      if (path === prefix || path.startsWith(`${prefix}/`)) {
        throw new Error(`Path matches denylist prefix: ${prefix}`);
      }
    }
    return true;
  } catch (e: any) {
    throw new Error(`assertIndexable failed: ${e.message}`);
  }
}
