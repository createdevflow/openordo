import { NEVER_INDEX_PREFIXES } from "../src/lib/seo/routes";
import fetch from "node-fetch";

async function verify() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  console.log(`Verifying SEO on ${baseUrl}`);
  
  // 1. Robots.txt
  const robotsRes = await fetch(`${baseUrl}/robots.txt`);
  if (!robotsRes.ok) throw new Error("robots.txt missing or returned error");
  const robotsText = await robotsRes.text();
  for (const prefix of NEVER_INDEX_PREFIXES) {
    if (!robotsText.includes(`Disallow: ${prefix}`)) {
      console.warn(`[WARN] robots.txt is missing Disallow for ${prefix}`);
    }
  }

  // 2. Sitemap.xml
  const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
  if (!sitemapRes.ok) throw new Error("sitemap.xml missing or returned error");
  const sitemapText = await sitemapRes.text();
  
  for (const prefix of NEVER_INDEX_PREFIXES) {
    if (sitemapText.includes(`> ${baseUrl}${prefix}`)) {
      throw new Error(`Sitemap contains forbidden prefix ${prefix}`);
    }
  }
  if (sitemapText.includes("/api/files")) {
    throw new Error("Sitemap contains /api/files route");
  }

  // 3. Noindex Headers
  for (const prefix of ["/dashboard", "/api/health"]) {
    const res = await fetch(`${baseUrl}${prefix}`);
    const robotsTag = res.headers.get("x-robots-tag");
    if (!robotsTag || !robotsTag.includes("noindex")) {
      console.warn(`[WARN] Missing X-Robots-Tag: noindex on ${prefix}`);
    }
  }

  // 4. 404
  const notFoundRes = await fetch(`${baseUrl}/some-random-route-that-does-not-exist`);
  if (notFoundRes.status !== 404) {
    throw new Error(`Expected 404 status for unknown route, got ${notFoundRes.status}`);
  }

  console.log("SEO Verification Passed!");
}

verify().catch(e => {
  console.error("SEO Verification Failed:", e.message);
  process.exit(1);
});
