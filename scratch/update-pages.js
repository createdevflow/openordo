const fs = require('fs');

// page.tsx
let code = fs.readFileSync('src/app/(marketing)/page.tsx', 'utf8');
if (!code.includes('resolvePricingContext')) {
  code = code.replace(/import \{ headers \} from "next\/headers"/, 'import { headers } from "next/headers"\nimport { resolvePricingContext } from "@/lib/pricing"');
  code = code.replace(/const headersList = await headers\(\)\s*const country = headersList\.get\("x-user-country"\) \|\| "US"\s*const initialCurrency = country === "IN" \? "INR" : "USD"/, 'const pricingContext = await resolvePricingContext()');
  code = code.replace(/initialCurrency=\{initialCurrency as "USD" \| "INR"\}/g, 'currency={pricingContext.currency} countryCode={pricingContext.countryCode} taxConfig={pricingContext.taxConfig}');
  fs.writeFileSync('src/app/(marketing)/page.tsx', code);
}

// pricing/page.tsx
if (fs.existsSync('src/app/(marketing)/pricing/page.tsx')) {
  let codePricing = fs.readFileSync('src/app/(marketing)/pricing/page.tsx', 'utf8');
  if (!codePricing.includes('resolvePricingContext')) {
    codePricing = codePricing.replace(/import \{ headers \} from "next\/headers"/, 'import { headers } from "next/headers"\nimport { resolvePricingContext } from "@/lib/pricing"');
    codePricing = codePricing.replace(/const headersList = await headers\(\)\s*const country = headersList\.get\("x-user-country"\) \|\| "US"\s*const initialCurrency = country === "IN" \? "INR" : "USD"/, 'const pricingContext = await resolvePricingContext()');
    codePricing = codePricing.replace(/initialCurrency=\{initialCurrency as "USD" \| "INR"\}/g, 'currency={pricingContext.currency} countryCode={pricingContext.countryCode} taxConfig={pricingContext.taxConfig}');
    fs.writeFileSync('src/app/(marketing)/pricing/page.tsx', codePricing);
  }
}
