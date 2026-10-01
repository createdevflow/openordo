import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const baaText = `HIPAA BUSINESS ASSOCIATE AGREEMENT

This Business Associate Agreement ("BAA") is entered into by and between the Customer (the "Covered Entity") and OpenORDO (the "Business Associate").

1. Definitions
Unless otherwise specified in this BAA, all capitalized terms used in this BAA shall have the meanings established for purposes of Title II of HIPAA and the HITECH Act.

2. Obligations and Activities of Business Associate
Business Associate agrees to:
(a) Not use or disclose Protected Health Information (PHI) other than as permitted or required by this BAA or as Required by Law.
(b) Use appropriate safeguards to prevent use or disclosure of the PHI other than as provided for by this BAA.
(c) Report to Covered Entity any use or disclosure of PHI not provided for by this BAA of which it becomes aware, including breaches of unsecured PHI.

3. Permitted Uses and Disclosures by Business Associate
Business Associate may use or disclose PHI to perform functions, activities, or services for, or on behalf of, Covered Entity as specified in the underlying Services Agreement, provided that such use or disclosure would not violate HIPAA if done by Covered Entity.

4. Term and Termination
This BAA shall remain in effect indefinitely until terminated by either party. Upon termination of this BAA for any reason, Business Associate shall return or destroy all PHI received from Covered Entity.

5. Miscellaneous
This BAA constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior agreements. The parties will amend this BAA as needed to comply with changes to HIPAA.`

async function main() {
  const existing = await prisma.baaTemplateVersion.findFirst({
    where: { isCurrent: true }
  })
  
  if (!existing) {
    // We assume the first user is the super admin
    const firstAdmin = await prisma.user.findFirst({
      where: { platformRole: "SUPER_ADMIN" }
    })
    
    if (firstAdmin) {
      await prisma.baaTemplateVersion.create({
        data: {
          bodyText: baaText,
          versionLabel: "2026-09-24",
          isCurrent: true,
          publishedByAdminId: firstAdmin.id
        }
      })
      console.log("Seeded initial BAA template version.")
    } else {
      console.log("No super admin found to attach the template version to.")
    }
  } else {
    console.log("BAA template already exists.")
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
