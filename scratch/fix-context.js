const fs = require('fs');

let code = fs.readFileSync('src/lib/pricing/context.ts', 'utf8');

// Fix isSuperAdmin
code = code.replace(/session\?\.user\?\.isSuperAdmin/, 'session?.user?.platformRole === "SUPER_ADMIN"');

// Fix activeClinic
code = code.replace(/const user = await db\.user\.findUnique\(\{ where: \{ id: session\.user\.id \}, include: \{ activeClinic: true \} \}\);/, 'const user = await db.user.findUnique({ where: { id: session.user.id } });\n    let clinic = null;\n    if (user?.activeClinicId) { clinic = await db.clinic.findUnique({ where: { id: user.activeClinicId } }); }');
code = code.replace(/if \(user\?\.activeClinic\) \{/g, 'if (clinic) {');
code = code.replace(/const clinic = user\.activeClinic;/g, '');

// Fix PlatformFlag -> GlobalSetting
code = code.replace(/const pf = await db\.platformFlag\.findUnique\(\{ where: \{ name: "DEFAULT_MARKET" \} \}\);/, 'const pf = await db.globalSetting.findUnique({ where: { key: "DEFAULT_MARKET" } });');

// Fix fallback TaxCountryConfig
code = code.replace(/id: "fallback-zz",\s*countryCode: "ZZ",\s*countryName: "Rest of World",\s*taxName: "Tax",\s*taxRateBase: 0,\s*taxRatePlatform: 0,\s*taxRatePayment: 0,\s*isActive: true,\s*currencyCode: "USD",\s*taxCalculationMode: "INCLUSIVE",\s*createdAt: new Date\(\),\s*updatedAt: new Date\(\),/g, 'id: "fallback-zz", countryCode: "ZZ", countryName: "Rest of World", currencyBucket: "USD", taxLabel: "Tax", taxIdLabel: null, calculationMode: "NONE" as any, flatRate: null, ourRegisteredRegion: null, invoiceNumberPrefix: null, isActive: true, sortOrder: 0, createdAt: new Date(), updatedAt: new Date(),');

fs.writeFileSync('src/lib/pricing/context.ts', code);
