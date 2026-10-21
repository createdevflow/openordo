import { NextRequest, NextResponse } from "next/server";
import { authorizeFileAccess } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { getPatientAccountSession } from "@/lib/patient-auth";
import { db } from "@/lib/db";
import { verifySignalToken } from "../../../../../shared/video-token";
import { getStorageDriver } from "@/lib/storage/driver";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".gif":
      return "image/gif";
    case ".txt":
      return "text/plain";
    case ".csv":
      return "text/csv";
    default:
      return "application/octet-stream";
  }
}

// Helper to build session context for authorizeFileAccess
async function buildSessionContext(req: NextRequest, file?: any) {
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
      };
    } catch (err) {}
  }

  const adminSession = await auth();
  const patSession = await getPatientAccountSession();

  let context: any = null;

  if (adminSession?.user) {
    // Admin / Doctor context
    const isSuperAdmin = (adminSession.user as any).platformRole === "SUPER_ADMIN";

    const memberships = await db.membership.findMany({
      where: { userId: adminSession.user.id },
      include: { clinic: true },
    });

    const matched = file?.clinicId
      ? memberships.find((m) => m.clinicId === file.clinicId)
      : memberships[0];

    context = {
      userId: adminSession.user.id,
      superAdmin: isSuperAdmin,
      clinicId: matched?.clinicId || memberships[0]?.clinicId || null,
      role: matched?.role || memberships[0]?.role || null,
      shareRecordsWithPatients: matched?.clinic?.shareRecordsWithPatients ?? false,
      allClinicIds: memberships.map((m) => m.clinicId),
    };
  } else if (patSession) {
    // Patient context
    const links = await db.patientAccountLink.findMany({
      where: { patientAccountId: patSession.patientAccountId },
      include: { clinic: true },
    });

    const accessMap = new Map();
    const shareMap = new Map();
    for (const link of links) {
      accessMap.set(link.clinicId, link.patientId);
      shareMap.set(link.clinicId, link.clinic.shareRecordsWithPatients);
    }

    const currentClinicId = file?.clinicId || (links[0]?.clinicId ?? null);

    context = {
      patientAccountId: patSession.patientAccountId,
      clinicId: currentClinicId,
      hasPatientAccess: true,
      accessiblePatientId: currentClinicId ? accessMap.get(currentClinicId) : null,
      shareRecordsWithPatients: currentClinicId ? shareMap.get(currentClinicId) : false,
      _accessMap: accessMap,
      _shareMap: shareMap,
    };
  }

  return context;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string | string[] }> }
) {
  const { fileId } = await params;
  const rawSegments = Array.isArray(fileId) ? fileId : [fileId];
  const rawPath = rawSegments.join("/").replace(/^\/+/, "");

  const cleanPath = rawPath.replace(/^uploads\//, "");
  const baseFilename = path.basename(cleanPath);
  const idWithoutExt = baseFilename.replace(/\.[^/.]+$/, "");

  // 1. Search database storedFile
  let file = await db.storedFile.findFirst({
    where: {
      OR: [
        { id: rawPath },
        { id: cleanPath },
        { id: baseFilename },
        { id: idWithoutExt },
        { originalName: rawPath },
        { originalName: cleanPath },
        { originalName: baseFilename },
        { storageKey: rawPath },
        { storageKey: cleanPath },
        { storageKey: { endsWith: cleanPath } },
        { storageKey: { endsWith: baseFilename } },
      ],
      deletedAt: null,
    },
  });

  const sessionContext = await buildSessionContext(req, file);

  if (file) {
    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch === `"${file.sha256}"`) {
      return new NextResponse(null, { status: 304 });
    }

    // Check authorization
    const isAuthorized = authorizeFileAccess(file, sessionContext);
    if (!isAuthorized) {
      if (
        !sessionContext?.userId &&
        !sessionContext?.patientAccountId &&
        !sessionContext?.isSignalToken
      ) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
      return new NextResponse("Forbidden", { status: 403 });
    }

    const v = req.nextUrl.searchParams.get("v");
    let targetKey = file.storageKey;
    let targetMime = file.mimeType;

    if ((v === "webp" || v === "thumb") && file.variants) {
      try {
        const vars = JSON.parse(file.variants);
        if (v === "webp" && vars.webp) {
          targetKey = vars.webp;
          targetMime = "image/webp";
        }
        if (v === "thumb" && vars.thumb) {
          targetKey = vars.thumb;
          targetMime = "image/webp";
        }
      } catch {}
    }

    const driver = getStorageDriver();
    let stream: ReadableStream;
    let size: number;

    try {
      const res = await driver.get(targetKey);
      stream = res.stream;
      size = res.size;
    } catch {
      // Fallback: Check if file exists on disk in legacy locations
      const legacyPrivate = path.join(process.cwd(), "private_uploads", file.originalName);
      const legacyPublic = path.join(process.cwd(), "public", "uploads", file.originalName);
      let fallbackPath: string | null = null;
      if (fs.existsSync(legacyPrivate)) fallbackPath = legacyPrivate;
      else if (fs.existsSync(legacyPublic)) fallbackPath = legacyPublic;

      if (fallbackPath) {
        const stats = await fs.promises.stat(fallbackPath);
        const nodeStream = fs.createReadStream(fallbackPath);
        stream = Readable.toWeb(nodeStream as any) as any;
        size = stats.size;
      } else {
        return new NextResponse("File Not Found on Storage", { status: 404 });
      }
    }

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

    const filename = file.originalName || baseFilename;
    if (targetMime.startsWith("image/") || targetMime === "application/pdf") {
      headers.set("Content-Disposition", `inline; filename="${filename}"`);
    } else {
      headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    }

    return new NextResponse(stream, { headers });
  }

  // 2. Fallback for legacy files that exist only on disk without a storedFile record
  const publicDiskPath = path.join(process.cwd(), "public", "uploads", baseFilename);
  const privateDiskPath = path.join(process.cwd(), "private_uploads", baseFilename);

  let diskPath: string | null = null;
  let isPublicAsset = false;

  if (fs.existsSync(publicDiskPath)) {
    diskPath = publicDiskPath;
    isPublicAsset = true;
  } else if (fs.existsSync(privateDiskPath)) {
    diskPath = privateDiskPath;
    isPublicAsset = false;
  }

  if (diskPath) {
    if (
      !isPublicAsset &&
      !sessionContext?.userId &&
      !sessionContext?.patientAccountId &&
      !sessionContext?.isSignalToken
    ) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const stats = await fs.promises.stat(diskPath);
    const nodeStream = fs.createReadStream(diskPath);
    const stream = Readable.toWeb(nodeStream as any) as any;
    const targetMime = getMimeType(baseFilename);

    const headers = new Headers();
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Content-Type", targetMime);
    headers.set("Content-Length", stats.size.toString());

    if (isPublicAsset) {
      headers.set("Cache-Control", "public, max-age=86400, immutable");
    } else {
      headers.set("Cache-Control", "private, max-age=300");
    }

    if (targetMime.startsWith("image/") || targetMime === "application/pdf") {
      headers.set("Content-Disposition", `inline; filename="${baseFilename}"`);
    } else {
      headers.set("Content-Disposition", `attachment; filename="${baseFilename}"`);
    }

    return new NextResponse(stream, { headers });
  }

  return new NextResponse("Not Found", { status: 404 });
}
