const fs = require('fs');
let code = fs.readFileSync('src/server/actions/video-consultation.ts', 'utf8');

// 1. Remove generateToken
code = code.replace(/function generateToken\(\): string \{\n  return randomBytes\(32\).toString\("hex"\) \/\/ 256-bit, unguessable\n\}\n/, '');

// 2. Change require('crypto')
code = code.replace(/const crypto = require\('crypto'\);\n/, '');

// 3. Import crypto at top
code = code.replace(/import { randomBytes } from "crypto"\n/, 'import crypto, { randomBytes } from "crypto"\n');

// 4. Fix let turnPolicy
code = code.replace(/let turnPolicy: "all" \| "relay" = "all";\n/, 'const turnPolicy: "all" | "relay" = "all";\n');

// 5. Replace any with unknown (just generic any fixes)
// We won't do all of them, just the ones above.

fs.writeFileSync('src/server/actions/video-consultation.ts', code);
