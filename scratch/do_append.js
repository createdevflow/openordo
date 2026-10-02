const fs = require('fs');
let code = fs.readFileSync('src/server/actions/video-consultation.ts', 'utf8');
const creds = fs.readFileSync('scratch/append_creds.js', 'utf8');

// Insert the import if not present
if (!code.includes('import jwt')) {
  code = code.replace('import { randomBytes } from "crypto"', 'import { randomBytes } from "crypto"\nimport jwt from "jsonwebtoken"');
}

code += "\n\n" + creds;

fs.writeFileSync('src/server/actions/video-consultation.ts', code);
