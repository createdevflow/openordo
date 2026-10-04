const fs = require('fs');
let c = fs.readFileSync('src/server/actions/video-consultation.ts', 'utf8');
if (!c.includes('import crypto')) {
  c = 'import crypto from "crypto";\n' + c;
  fs.writeFileSync('src/server/actions/video-consultation.ts', c);
}
