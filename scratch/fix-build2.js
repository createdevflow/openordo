const fs = require('fs');

// 1. files/[fileId]/route.ts
let froute = fs.readFileSync('src/app/api/files/[fileId]/route.ts', 'utf8');
froute = froute.replace(/patSession\.patientAccount\.id/g, 'patSession.patientAccountId');
fs.writeFileSync('src/app/api/files/[fileId]/route.ts', froute);

// 2. upload/route.ts
let uroute = fs.readFileSync('src/app/api/upload/route.ts', 'utf8');
uroute = uroute.replace(/patSession\.id/g, 'patSession.patientAccountId');
uroute = uroute.replace(/patSession\.patientAccount\.id/g, 'patSession.patientAccountId');
uroute = uroute.replace(/patSession\.patientAccount/g, 'patSession');
fs.writeFileSync('src/app/api/upload/route.ts', uroute);

// 3. storage/index.ts
let storeCode = fs.readFileSync('src/lib/storage/index.ts', 'utf8');
storeCode = storeCode.replace(/cat\.read\.includes\(\("SUPER_ADMIN" as any\)\)/g, '(cat.read as string[]).includes("SUPER_ADMIN")');
storeCode = storeCode.replace(/cat\.read\.includes\(role\)/g, '(cat.read as string[]).includes(role as string)');
storeCode = storeCode.replace(/cat\.read\.includes\(\("CLINIC_MEMBER" as any\)\)/g, '(cat.read as string[]).includes("CLINIC_MEMBER")');
storeCode = storeCode.replace(/cat\.read\.includes\(\("PATIENT_SELF" as any\)\)/g, '(cat.read as string[]).includes("PATIENT_SELF")');
storeCode = storeCode.replace(/cat\.read\.includes\(\("PATIENT_SELF_IF_SHARED" as any\)\)/g, '(cat.read as string[]).includes("PATIENT_SELF_IF_SHARED")');
fs.writeFileSync('src/lib/storage/index.ts', storeCode);
