const fs = require('fs');
const files = [
  'src/app/dashboard/records/RecordsClient.tsx',
  'src/app/dashboard/settings/StorageTab.tsx',
  'src/app/portal/[slug]/PatientPortalClient.tsx'
];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('getFileUrl(') && !content.includes('import { getFileUrl }')) {
    content = content.replace(/("use client"|'use client')/, '$1\nimport { getFileUrl } from "@/lib/file-utils";\n');
    fs.writeFileSync(f, content);
    console.log("Fixed " + f);
  }
});
