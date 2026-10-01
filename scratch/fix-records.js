const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/records/RecordsClient.tsx', 'utf8');
code = code.replace(/formData\.append\("patientId", patientId\)/, 'formData.append("patientId", data.patientId)');
fs.writeFileSync('src/app/dashboard/records/RecordsClient.tsx', code);
