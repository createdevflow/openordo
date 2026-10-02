const fs = require('fs');
let code = fs.readFileSync('BUILD_LOG.md', 'utf8');
if (!code.includes('### 2. Video consultation')) {
  code += `
### 2. Video consultation
- **Root causes:** 
  1. Timezone ignorance: \`computeTokenWindow\` parses local time string and feeds it to \`setHours()\` which assumes the server's timezone (UTC on prod). This delays IST appointments by 5.5 hours.
  2. The join page did not implement the waiting screen with countdown, simply throwing a static error if visited early.
  3. Real video wasn't implemented (no WebRTC).
- **Fix:** Added \`timezone\` to Clinic, stored \`startsAt\` (UTC) in Appointment, migrated existing records (assuming they were in the clinic's local time), and added a dynamic waiting room polling mechanism. Integrated LiveKit as the VideoProvider.
`;
  fs.writeFileSync('BUILD_LOG.md', code);
}
