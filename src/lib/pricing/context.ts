import { headers } from "next/headers";
import { db } from "../db";
import { TaxCountryConfig } from "@prisma/client";
import { auth } from "../auth";

export type PricingContext = {
  market: "IN" | "INTL";
  currency: "INR" | "USD";
  countryCode: string;          // ISO-2
  taxConfig: TaxCountryConfig;  // resolved config for countryCode, else ZZ
  source: "CLINIC_LOCKED" | "CLINIC_COUNTRY" | "GEO_HEADER" | "ADMIN_SIMULATION" | "DEV_ENV" | "FALLBACK";
};

let cachedTaxConfigs: TaxCountryConfig[] | null = null;
let taxConfigsLastFetched = 0;

async function getTaxConfig(countryCode: string): Promise<TaxCountryConfig> {
  const now = Date.now();
  if (!cachedTaxConfigs || now - taxConfigsLastFetched > 60000) {
    cachedTaxConfigs = await db.taxCountryConfig.findMany({ where: { isActive: true } });
    taxConfigsLastFetched = now;
  }
  
  const found = cachedTaxConfigs.find(c => c.countryCode === countryCode);
  if (found) return found;

  const fallback = cachedTaxConfigs.find(c => c.countryCode === "ZZ");
  if (fallback) return fallback;

  // Hardcoded fallback if ZZ is missing from DB
  return {
    id: "fallback-zz", countryCode: "ZZ", countryName: "Rest of World", currencyBucket: "USD", taxLabel: "Tax", taxIdLabel: null, calculationMode: "NONE" as any, flatRate: null, ourRegisteredRegion: null, invoiceNumberPrefix: null, isActive: true, sortOrder: 0, createdAt: new Date(), updatedAt: new Date(),
  } as TaxCountryConfig;
}

export async function resolvePricingContext(): Promise<PricingContext> {
  const reqHeaders = await headers();
  const geoHeaderParam = reqHeaders.get("x-geo-sim"); // Just in case, wait, spec says `?_geo=XX`. 
  // However we are inside a server context where `searchParams` isn't globally available easily without passing it.
  // The spec says "Super Admin simulation. ?_geo=XX is honored only when the session is SUPER_ADMIN."
  // To get the search param, we can read the Referer or rely on a cookie or proxy setting a header.
  // We'll look for an `x-admin-geo-sim` header set by middleware if `?_geo=XX` was present.
  
  const session = await auth();

  // 1. Super Admin simulation
  if (session?.user?.platformRole === "SUPER_ADMIN") {
    const simCountry = reqHeaders.get("x-admin-geo-sim");
    if (simCountry) {
      return {
        market: simCountry === "IN" ? "IN" : "INTL",
        currency: simCountry === "IN" ? "INR" : "USD",
        countryCode: simCountry,
        taxConfig: await getTaxConfig(simCountry),
        source: "ADMIN_SIMULATION",
      };
    }
  }

  // 2 & 3. Logged-in clinic
  if (session?.user) {
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    let clinic = null;
    if (user?.activeClinicId) { clinic = await db.clinic.findUnique({ where: { id: user.activeClinicId } }); }
    if (clinic) {
      
      if (clinic.pricingMarketLocked && clinic.countryCode) {
        return {
          market: clinic.countryCode === "IN" ? "IN" : "INTL",
          currency: clinic.countryCode === "IN" ? "INR" : "USD",
          countryCode: clinic.countryCode,
          taxConfig: await getTaxConfig(clinic.countryCode),
          source: "CLINIC_LOCKED",
        };
      }
      if (clinic.countryCode) {
        return {
          market: clinic.countryCode === "IN" ? "IN" : "INTL",
          currency: clinic.countryCode === "IN" ? "INR" : "USD",
          countryCode: clinic.countryCode,
          taxConfig: await getTaxConfig(clinic.countryCode),
          source: "CLINIC_COUNTRY",
        };
      }
    }
  }

  // 4. Anonymous visitor or clinic mid-onboarding: read from hosting geo header
  const geoCountry = reqHeaders.get("x-user-country") || reqHeaders.get("x-vercel-ip-country") || reqHeaders.get("cf-ipcountry");
  if (geoCountry) {
    return {
      market: geoCountry === "IN" ? "IN" : "INTL",
      currency: geoCountry === "IN" ? "INR" : "USD",
      countryCode: geoCountry,
      taxConfig: await getTaxConfig(geoCountry),
      source: "GEO_HEADER",
    };
  }

  // 5. Dev
  if (process.env.DEV_GEO_COUNTRY) {
    return {
      market: process.env.DEV_GEO_COUNTRY === "IN" ? "IN" : "INTL",
      currency: process.env.DEV_GEO_COUNTRY === "IN" ? "INR" : "USD",
      countryCode: process.env.DEV_GEO_COUNTRY,
      taxConfig: await getTaxConfig(process.env.DEV_GEO_COUNTRY),
      source: "DEV_ENV",
    };
  }

  // 6. Fallback
  // "if nothing resolves, use the admin-configured default market. The default is INTL/USD with the ZZ config."
  let fallbackCode = "ZZ"; // Assuming we have a global platform config for default market, but let's default to ZZ.
  const pf = await db.globalSetting.findUnique({ where: { key: "DEFAULT_MARKET" } });
  if (pf && pf.value === "IN") fallbackCode = "IN";

  return {
    market: fallbackCode === "IN" ? "IN" : "INTL",
    currency: fallbackCode === "IN" ? "INR" : "USD",
    countryCode: fallbackCode,
    taxConfig: await getTaxConfig(fallbackCode),
    source: "FALLBACK",
  };
}
