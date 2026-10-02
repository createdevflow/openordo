const fs = require('fs');
let code = fs.readFileSync('BUILD_LOG.md', 'utf8');
if (!code.includes('### 3. Patient portal login')) {
  code += `
### 3. Patient portal login
- **Root causes:** 
  1. The Auth.js \`Credentials\` provider only queried the staff \`User\` table, meaning no patient could ever log in.
  2. Accounts were not reliably created across all entry points.
  3. The login form demanded a password even for accounts without one.
- **Fix:** Separated patient auth provider to query \`PatientAccount\`, enforced account creation via \`ensurePatientAccount\` on all paths, implemented login flow step 1 (send code) vs step 2 (password), and normalized identifiers.

### 4. Email links
- **Root causes:** Email templates used hardcoded \`openordo.com\` paths that didn't match the actual \`src/app\` folder structure (e.g. \`/privacy\` instead of \`/legal/privacy\`).
- **Fix:** Created \`src/lib/routes.ts\` as the single source of truth for all URLs, updated all templates, and added permanent redirects for old URLs.
`;
  fs.writeFileSync('BUILD_LOG.md', code);
}
