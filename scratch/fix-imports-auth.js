const fs = require('fs');
['src/app/api/files/[fileId]/route.ts', 'src/app/api/upload/route.ts'].forEach(f => {
  let code = fs.readFileSync(f, 'utf8');
  code = code.replace(/import \{ patientAuth \} from "@\/lib\/patient-auth";/g, 'import { getPatientAccountSession } from "@/lib/patient-auth";');
  code = code.replace(/const patientSession = await patientAuth\(\);/g, 'const patientSession = await getPatientAccountSession();');
  fs.writeFileSync(f, code);
});
