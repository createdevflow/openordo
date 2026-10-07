import { NextRequest, NextResponse } from "next/server";
import { getFileForRequest } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { getPatientAccountSession } from "@/lib/patient-auth";
import { db } from "@/lib/db";
import { verifySignalToken } from "../../../../../shared/video-token";

// Helper to build session context for authorizeFileAccess
async function buildSessionContext(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token) {
    try {
      const claims = await verifySignalToken(token);
      return {
        isSignalToken: true,
        role: claims.role,
        patientAccountId: claims.role === "patient" ? claims.sub : null,
        userId: claims.role === "doctor" ? claims.sub : null,
        hasPatientAccess: true,
        // We set a marker so authorizeFileAccess knows it's a call participant
      };
    } catch (err) {}
  }

  const adminSession = await auth();
  const patSession = await getPatientAccountSession();

  let context: any = null;

  if (adminSession?.user) {
    // Admin context
    let clinicId = null;
    let role = null;
    let shareRecordsWithPatients = false;
    
    // Find active membership
    const membership = await db.membership.findFirst({
      where: { userId: adminSession.user.id },
      include: { clinic: true }
    });
    
    if (membership) {
      clinicId = membership.clinicId;
      role = membership.role;
      shareRecordsWithPatients = membership.clinic.shareRecordsWithPatients;
    }

    context = {
      userId: adminSession.user.id,
      superAdmin: (adminSession.user as any).platformRole === "SUPER_ADMIN",
      clinicId,
      role,
      shareRecordsWithPatients
    };
  } else if (patSession) {
    // Patient context
    // Actually patient portal routes use the slug to determine clinic. 
    // Wait, the file URL doesn't have slug. We need to check if they have a link.
    // Let's assume patient can only access files of clinics they are linked to.
    // The authorizeFileAccess will check if `accessiblePatientId` matches.
    // We should load their links.
    const links = await db.patientAccountLink.findMany({
      where: { patientAccountId: patSession.patientAccountId },
      include: { clinic: true }
    });

    // In authorizeFileAccess we need to know if they have access to file.clinicId & file.patientId
    // We'll pass a helper function or map.
    const accessMap = new Map();
    const shareMap = new Map();
    for (const link of links) {
      accessMap.set(link.clinicId, link.patientId);
      shareMap.set(link.clinicId, link.clinic.shareRecordsWithPatients);
    }
    
    context = {
      patientAccountId: patSession.patientAccountId,
      _accessMap: accessMap,
      _shareMap: shareMap
    };

    // We patch context so that for a given file it can resolve:
    Object.defineProperty(context, "hasPatientAccess", {
      get: function() { return true; } // Checked via accessiblePatientId
    });
    Object.defineProperty(context, "accessiblePatientId", {
      get: function() { return this._accessMap.get(this.clinicId); }
    });
    Object.defineProperty(context, "shareRecordsWithPatients", {
      get: function() { return this._shareMap.get(this.clinicId); }
    });
    Object.defineProperty(context, "clinicId", {
      get: function() { return this._currentClinicId; },
      set: function(id: string) { this._currentClinicId = id; }
    });
  }

  return context;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  
  const ifNoneMatch = req.headers.get("if-none-match");
  
  const sessionContext = await buildSessionContext(req);
  
  // We need to fetch the file to know its clinicId, then patch context if patient
  // getFileForRequest will fetch and authorize. 
  // Let's modify the file fetching part to pass the file's clinicId into context if needed.
  
  // Actually, getFileForRequest does this: 
  // authorizeFileAccess(file, sessionContext)
  // If we pass sessionContext, we can intercept or just let the authorizeFileAccess read from it.
  
  // Patch context before passing:
  const ctx = sessionContext || {};
  
  // A small wrapper around authorizeFileAccess would be better, but we already wrote it in index.ts.
  // We'll let `authorizeFileAccess` read `ctx.hasPatientAccess` etc.
  // We need to set `ctx.clinicId = file.clinicId` dynamically inside `authorizeFileAccess`?
  // Yes, JS getters can't magically know the file unless we pass it. 
  // Wait, in `authorizeFileAccess`, we check `file.clinicId !== clinicId`.
  // This means `clinicId` in context must match `file.clinicId`!
  // If the patient is linked to multiple clinics, their `clinicId` isn't static.
  // We should update `authorizeFileAccess` in index.ts to handle patient multi-clinic properly.
  
  // For now, let's fetch the file here to patch context.
  const file = await db.storedFile.findUnique({ where: { id: fileId } });
  if (!file || file.deletedAt) {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (ifNoneMatch === `"${file.sha256}"`) {
    return new NextResponse(null, { status: 304 });
  }

  // Patch patient context for this specific file
  if (ctx._accessMap) {
    ctx.clinicId = file.clinicId;
  }

  const { getStream } = await getFileForRequest(fileId, ctx) || {};
  if (!getStream) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const v = req.nextUrl.searchParams.get("v");
  let targetKey = file.storageKey;
  let targetMime = file.mimeType;
  
  if ((v === "webp" || v === "thumb") && file.variants) {
    const vars = JSON.parse(file.variants);
    if (v === "webp" && vars.webp) {
      targetKey = vars.webp;
      targetMime = "image/webp";
    }
    if (v === "thumb" && vars.thumb) {
      targetKey = vars.thumb;
      targetMime = "image/webp";
    }
  }

  const { getStorageDriver } = await import("@/lib/storage/driver");
  const driver = getStorageDriver();
  const { stream, size } = await driver.get(targetKey);

  const headers = new Headers();
  headers.set("ETag", `"${file.sha256}"`);
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Type", targetMime);
  headers.set("Content-Length", size.toString());

  if (file.isPublicAsset) {
    headers.set("Cache-Control", "public, max-age=86400, immutable");
  } else {
    headers.set("Cache-Control", "private, max-age=300");
  }

  if (targetMime.startsWith("image/") || targetMime === "application/pdf") {
    headers.set("Content-Disposition", `inline; filename="${file.originalName}"`);
  } else {
    headers.set("Content-Disposition", `attachment; filename="${file.originalName}"`);
  }

  return new NextResponse(stream, { headers });
}
