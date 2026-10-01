const fs = require('fs');
let code = fs.readFileSync('src/app/(marketing)/LandingPricingSection.tsx', 'utf8');

// Replace imports
code = code.replace(/import React, \{ useState, useEffect \} from "react"/, 'import React from "react"');
code = code.replace(/import \{ getAllActiveTaxCountryConfigs \} from "@\/server\/actions\/tax"\n/, '');

// Replace component signature and state
code = code.replace(/export function LandingPricingSection\(\{[\s\S]*?useEffect\([\s\S]*?\}, \[\]\)/,
`export function LandingPricingSection({
  plans,
  promo,
  currency,
  countryCode,
  taxConfig,
  defaultTrialDays = 14
}: {
  plans: PlanItem[]
  promo?: any | null
  currency: "USD" | "INR"
  countryCode: string
  taxConfig: any
  defaultTrialDays?: number
}) {`);

// Remove switchers
// They are inside <div className="flex flex-col gap-3">
code = code.replace(/<div className="flex flex-col gap-3">[\s\S]*?\{\/\* Currency Switcher \*\/\}[\s\S]*?<\/div>\s*<\/div>/, '</div>');

fs.writeFileSync('src/app/(marketing)/LandingPricingSection.tsx', code);
