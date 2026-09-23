#!/usr/bin/env node
/**
 * scripts/check-legal-placeholders.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Prints every unresolved {{TOKEN}} in docs/legal/*.md so you can fill them
 * in src/lib/legal-config.ts before launch.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/check-legal-placeholders.ts
 *
 * Or add a package.json script:
 *   "check:legal": "ts-node --project tsconfig.json scripts/check-legal-placeholders.ts"
 */

import fs from "fs"
import path from "path"

// Import the config — values that are empty strings are unresolved.
// We use a dynamic require so this file can be run by ts-node without
// needing the full Next.js environment.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { LEGAL_CONFIG } = require("../src/lib/legal-config") as {
  LEGAL_CONFIG: Record<string, string>
}

const docsDir = path.join(__dirname, "..", "docs", "legal")
const TOKEN_RE = /\{\{([A-Z_]+)\}\}/g

const files = fs.readdirSync(docsDir).filter((f) => f.endsWith(".md"))

let totalUnresolved = 0

console.log("\n📋  Legal placeholder check\n")

for (const file of files.sort()) {
  const content = fs.readFileSync(path.join(docsDir, file), "utf-8")
  const unresolvedInFile: string[] = []

  let m: RegExpExecArray | null
  while ((m = TOKEN_RE.exec(content)) !== null) {
    const key = m[1]
    const val = LEGAL_CONFIG[key]
    if (!val || val === "") {
      unresolvedInFile.push(key)
    }
  }

  // Reset regex lastIndex for the next file
  TOKEN_RE.lastIndex = 0

  if (unresolvedInFile.length > 0) {
    const unique = [...new Set(unresolvedInFile)]
    totalUnresolved += unique.length
    console.log(`  ❌  ${file}`)
    unique.forEach((key) => {
      console.log(`       • {{${key}}}`)
    })
  } else {
    console.log(`  ✅  ${file}`)
  }
}

console.log("")

if (totalUnresolved === 0) {
  console.log("✅  All placeholders are resolved. Ready for launch.\n")
  process.exit(0)
} else {
  console.log(
    `⚠️   ${totalUnresolved} unique placeholder(s) unresolved. ` +
      `Fill them in src/lib/legal-config.ts\n`
  )
  process.exit(1)
}
