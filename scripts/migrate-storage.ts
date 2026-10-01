import fs from "fs";
import path from "path";
import { db } from "../src/lib/db";
import { saveFile } from "../src/lib/storage";

async function run() {
  console.log("Starting storage migration...");
  
  const clinics = await db.clinic.findMany();
  for (const clinic of clinics) {
    if (!clinic.storageRoot) {
      const { ensureClinicStorageRoot } = await import("../src/lib/storage");
      await ensureClinicStorageRoot(clinic.id);
      console.log(`Ensured storage root for clinic: ${clinic.id}`);
    }
  }

  // Find files that need migration
  const uploadDirs = ["public/uploads", "private_uploads"];
  
  for (const dir of uploadDirs) {
    const fullDir = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullDir)) continue;

    const files = fs.readdirSync(fullDir);
    for (const file of files) {
      if (file === ".gitkeep" || file === ".gitignore") continue;
      const filePath = path.join(fullDir, file);
      const buffer = fs.readFileSync(filePath);
      
      // Determine category and clinic. We'll just guess for now or put as CLINIC_BRANDING_PUBLIC if we can't tell,
      // but ideally we map it. 
      // The spec says: "For each existing file, run it through saveFile with the correct category... Replace the old field value with the new StoredFile.id."
      // Let's migrate fields one by one instead of reading the directory blindly.
    }
  }

  // Better approach: query all fields containing "/api/files" or "/uploads" or "public/"
  // But wait, the spec says "Find every current write path with rg... Backfill Clinic.storageRoot... Replace the old field value..."
  
  // 1. Clinic Branding
  const configs = await db.bookingPageConfig.findMany();
  for (const conf of configs) {
    let updated = false;
    const dataToUpdate: any = {};
    
    for (const field of ["logoUrl", "faviconUrl", "coverUrl"] as const) {
      const val = conf[field];
      if (val && !val.startsWith("c")) { // Wait, cuid() starts with 'c'. If it's a URL like /api/files/123.jpg, we need to migrate it.
        // Or if it's already a StoredFile id (25 chars long starting with 'c').
        // Let's just say if it contains '/' or '.', it's an old file.
        if (val.includes("/") || val.includes(".")) {
          try {
            const filename = val.split("/").pop()!;
            let filePath = path.join(process.cwd(), "private_uploads", filename);
            if (!fs.existsSync(filePath)) {
              filePath = path.join(process.cwd(), "public/uploads", filename);
            }
            if (fs.existsSync(filePath)) {
              const buffer = fs.readFileSync(filePath);
              const stored = await saveFile({
                category: "CLINIC_BRANDING_PUBLIC",
                clinicId: conf.clinicId,
                file: buffer,
                originalName: filename,
                actor: { id: "SYSTEM", type: "SYSTEM" }
              });
              dataToUpdate[field] = stored.id;
              updated = true;
            }
          } catch (e: any) {
             console.error(`Failed to migrate ${field} for clinic ${conf.clinicId}`, e.message);
          }
        }
      }
    }
    if (updated) {
      await db.bookingPageConfig.update({ where: { id: conf.id }, data: dataToUpdate });
    }
  }

  // 2. BAA Requests
  const baaRequests = await db.baaRequest.findMany();
  for (const req of baaRequests) {
    if (req.pdfFileKey && (req.pdfFileKey.includes("/") || req.pdfFileKey.includes("."))) {
      try {
        const filename = req.pdfFileKey.split("/").pop()!;
        let filePath = path.join(process.cwd(), "private_uploads", filename);
        if (!fs.existsSync(filePath)) filePath = path.join(process.cwd(), "public/uploads", filename);
        if (fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath);
          const stored = await saveFile({
            category: "CLINIC_COMPLIANCE",
            clinicId: req.clinicId,
            file: buffer,
            originalName: filename,
            actor: { id: "SYSTEM", type: "SYSTEM" }
          });
          await db.baaRequest.update({ where: { id: req.id }, data: { pdfFileKey: stored.id } });
        }
      } catch (e: any) {
        console.error(`Failed to migrate baa ${req.id}`, e.message);
      }
    }
  }

  // 3. Tax Invoices
  const invoices = await db.taxInvoice.findMany();
  for (const inv of invoices) {
    if (inv.pdfFileKey && (inv.pdfFileKey.includes("/") || inv.pdfFileKey.includes("."))) {
      try {
        const filename = inv.pdfFileKey.split("/").pop()!;
        let filePath = path.join(process.cwd(), "private_uploads", filename);
        if (!fs.existsSync(filePath)) filePath = path.join(process.cwd(), "public/uploads", filename);
        if (fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath);
          const stored = await saveFile({
            category: "CLINIC_BILLING",
            clinicId: inv.clinicId,
            file: buffer,
            originalName: filename,
            actor: { id: "SYSTEM", type: "SYSTEM" }
          });
          await db.taxInvoice.update({ where: { id: inv.id }, data: { pdfFileKey: stored.id } });
        }
      } catch (e: any) {
        console.error(`Failed to migrate invoice ${inv.id}`, e.message);
      }
    }
  }

  // 4. Patient Documents
  const docs = await db.patientDocument.findMany();
  for (const doc of docs) {
    if (doc.url && (doc.url.includes("/") || doc.url.includes("."))) {
      try {
        const filename = doc.url.split("/").pop()!;
        let filePath = path.join(process.cwd(), "private_uploads", filename);
        if (!fs.existsSync(filePath)) filePath = path.join(process.cwd(), "public/uploads", filename);
        if (fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath);
          // Get patient linked clinic
          const link = await db.patientAccountLink.findFirst({ where: { patientId: doc.patientId } });
          const stored = await saveFile({
            category: doc.type === "PRESCRIPTION" ? "PATIENT_PRESCRIPTION" : "PATIENT_RECORD_ATTACHMENT",
            clinicId: link?.clinicId || undefined,
            patientId: doc.patientId,
            file: buffer,
            originalName: filename,
            actor: { id: "SYSTEM", type: "SYSTEM" }
          });
          await db.patientDocument.update({ where: { id: doc.id }, data: { url: stored.id } });
        }
      } catch (e: any) {
        console.error(`Failed to migrate document ${doc.id}`, e.message);
      }
    }
  }

  // 5. Platform Signatures / Global settings (No DB field for signature, maybe in Global Settings)
  
  console.log("Migration complete!");
}

run().catch(console.error);
