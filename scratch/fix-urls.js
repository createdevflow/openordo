const fs = require('fs');
const glob = require('glob');
const files = glob.sync('src/app/**/*.tsx');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;
  // Replace: process.env.NEXT_PUBLIC_CDN_URL && doc.url?.startsWith("/") ? process.env.NEXT_PUBLIC_CDN_URL + doc.url : doc.url
  if (content.includes('process.env.NEXT_PUBLIC_CDN_URL')) {
    content = content.replace(/process\.env\.NEXT_PUBLIC_CDN_URL\s*&&\s*([\w.]+)\?\.startsWith\("\/"\)\s*\?\s*process\.env\.NEXT_PUBLIC_CDN_URL\s*\+\s*\1\s*:\s*\1/g, 'getFileUrl($1)');
    if (!content.includes('import { getFileUrl }')) {
      content = content.replace(/("use client"|'use client'|import [^\n]+;?\n)/, '$1\nimport { getFileUrl } from "@/lib/file-utils";\n');
    }
    changed = true;
  }
  if (content.includes('src={logoUrl}')) {
    content = content.replace(/src=\{logoUrl\}/g, 'src={getFileUrl(logoUrl)}');
    if (!content.includes('import { getFileUrl }')) {
      content = content.replace(/("use client"|'use client'|import [^\n]+;?\n)/, '$1\nimport { getFileUrl } from "@/lib/file-utils";\n');
    }
    changed = true;
  }
  if (content.includes('logoUrl={config?.logoUrl}')) {
    content = content.replace(/logoUrl=\{config\?\.logoUrl\}/g, 'logoUrl={getFileUrl(config?.logoUrl)}');
    if (!content.includes('import { getFileUrl }')) {
      content = content.replace(/("use client"|'use client'|import [^\n]+;?\n)/, '$1\nimport { getFileUrl } from "@/lib/file-utils";\n');
    }
    changed = true;
  }
  if (content.includes('src={config.logoUrl}')) {
    content = content.replace(/src=\{config\.logoUrl\}/g, 'src={getFileUrl(config.logoUrl)}');
    if (!content.includes('import { getFileUrl }')) {
      content = content.replace(/("use client"|'use client'|import [^\n]+;?\n)/, '$1\nimport { getFileUrl } from "@/lib/file-utils";\n');
    }
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(f, content);
    console.log(`Updated ${f}`);
  }
});
