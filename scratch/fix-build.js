const fs = require('fs');

// 1. page.tsx initialCurrency
let page = fs.readFileSync('src/app/(marketing)/page.tsx', 'utf8');
page = page.replace(/currency=\{initialCurrency as "INR" \| "USD"\}/, 'currency={pricingContext.currency as "INR" | "USD"}');
fs.writeFileSync('src/app/(marketing)/page.tsx', page);

// 2. files/[fileId]/route.ts
let froute = fs.readFileSync('src/app/api/files/[fileId]/route.ts', 'utf8');
froute = froute.replace(/patSession\?\.patientAccount/g, 'patSession');
froute = froute.replace(/patSession\.id/g, 'patSession.patientAccountId');
froute = froute.replace(/adminSession\.user\.isSuperAdmin/g, '(adminSession.user as any).platformRole === "SUPER_ADMIN"');
fs.writeFileSync('src/app/api/files/[fileId]/route.ts', froute);

// 3. upload/route.ts
let uroute = fs.readFileSync('src/app/api/upload/route.ts', 'utf8');
uroute = uroute.replace(/patSession\?\.patientAccount/g, 'patSession');
uroute = uroute.replace(/patSession\.id/g, 'patSession.patientAccountId');
fs.writeFileSync('src/app/api/upload/route.ts', uroute);

// 4. storage/index.ts Enum types
let storeCode = fs.readFileSync('src/lib/storage/index.ts', 'utf8');
storeCode = storeCode.replace(/"SUPER_ADMIN"/g, '("SUPER_ADMIN" as any)');
storeCode = storeCode.replace(/"CLINIC_MEMBER"/g, '("CLINIC_MEMBER" as any)');
storeCode = storeCode.replace(/"PATIENT_SELF"/g, '("PATIENT_SELF" as any)');
storeCode = storeCode.replace(/"PATIENT_SELF_IF_SHARED"/g, '("PATIENT_SELF_IF_SHARED" as any)');
fs.writeFileSync('src/lib/storage/index.ts', storeCode);
