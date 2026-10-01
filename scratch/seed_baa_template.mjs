import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  const bodyText = fs.readFileSync("docs/legal/hipaa.md", "utf8");
  
  await prisma.baaTemplateVersion.create({
    data: {
      bodyText,
      versionLabel: "2026-09-24",
      isCurrent: true,
      publishedByAdminId: "system", // Or pick the first super admin
    }
  });
  console.log("Seeded BaaTemplateVersion");
}

main().catch(console.error).finally(() => prisma.$disconnect());
