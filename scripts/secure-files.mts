import { PrismaClient } from "@prisma/client"
import * as fs from "fs/promises"
import * as path from "path"

const db = new PrismaClient()

async function main() {
  const publicDir = path.join(process.cwd(), "public", "uploads")
  const privateDir = path.join(process.cwd(), "private_uploads")
  
  await fs.mkdir(privateDir, { recursive: true }).catch(() => {})

  const docs = await db.patientDocument.findMany()
  console.log(`Found ${docs.length} documents.`)

  let moved = 0

  for (const doc of docs) {
    if (doc.url && doc.url.startsWith("/uploads/")) {
      const filename = doc.url.replace("/uploads/", "")
      const oldPath = path.join(publicDir, filename)
      const newPath = path.join(privateDir, filename)
      const newUrl = `/api/files/${filename}`

      try {
        await fs.rename(oldPath, newPath)
        
        await db.patientDocument.update({
          where: { id: doc.id },
          data: { url: newUrl }
        })

        await db.storageUsage.updateMany({
          where: { filePath: doc.url },
          data: { filePath: newUrl }
        })

        console.log(`Moved ${filename}`)
        moved++
      } catch (e: any) {
        if (e.code === "ENOENT") {
          console.warn(`File missing for ${filename}, updating DB anyway.`)
          await db.patientDocument.update({
            where: { id: doc.id },
            data: { url: newUrl }
          })
          await db.storageUsage.updateMany({
            where: { filePath: doc.url },
            data: { filePath: newUrl }
          })
        } else {
          console.error(`Error moving ${filename}:`, e)
        }
      }
    }
  }

  console.log(`Migration complete. Moved ${moved} files.`)
}

main()
  .catch(e => console.error(e))
  .finally(() => db.$disconnect())
