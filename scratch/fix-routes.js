const fs = require('fs');

['src/app/api/files/[fileId]/route.ts', 'src/app/api/upload/route.ts'].forEach(f => {
  let code = fs.readFileSync(f, 'utf8');
  code = code.replace(/import\s*\{\s*patientAuth\s*\}\s*from\s*"@\/lib\/patient-auth";/, 'import { getPatientAccountSession } from "@/lib/patient-auth";');
  code = code.replace(/await\s*patientAuth\(\)/g, 'await getPatientAccountSession()');
  code = code.replace(/session\?\.user\?\.isSuperAdmin/g, 'session?.user?.platformRole === "SUPER_ADMIN"');
  fs.writeFileSync(f, code);
});
