"use server"

import { db } from "@/lib/db"
import { requireSuperAdmin } from "./admin-base"
import { randomBytes } from "crypto"

export async function createDemoRequestAction(data: any) {
  try {
    const req = await db.demoRequest.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        jobTitle: data.jobTitle,
        country: data.country,
        phone: data.phone,
        companyName: data.companyName,
        employees: data.employees,
        message: data.message,
        newsletterOptIn: data.newsletterOptIn
      }
    })
    return { success: true, id: req.id }
  } catch (error: any) {
    console.error("Failed to create demo request:", error)
    return { error: error.message }
  }
}

export async function generateDemoCredentialsAction(id: string) {
  try {
    await requireSuperAdmin()

    const req = await db.demoRequest.findUnique({ where: { id } })
    if (!req) return { error: "Demo request not found" }
    
    if (req.status === "USED") return { error: "Demo request already used" }

    // Generate random token
    const token = randomBytes(32).toString("hex")
    
    // Check if temp user already generated but not used
    let tempUserId = req.tempUserId

    if (!tempUserId) {
      // Fetch demo default plan
      const demoPlanSetting = await db.globalSetting.findUnique({ where: { key: "demo_default_plan_id" } })
      const planId = demoPlanSetting?.value

      // 1. Create a dummy clinic
      const clinicName = `${req.companyName || req.firstName + "'s"} Demo Clinic`
      const clinicSlug = `demo-${randomBytes(6).toString("hex")}`
      
      const clinicData: any = {
        name: clinicName,
        slug: clinicSlug,
        type: "Demo",
        country: req.country || "US",
        status: "ACTIVE"
      }
      
      if (planId) {
        clinicData.subscription = {
          create: {
            planId,
            status: "ACTIVE",
            currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) // 1 year
          }
        }
      }

      const clinic = await db.clinic.create({ data: clinicData })

      // 2. Create a dummy user
      const dummyEmail = `demo_${randomBytes(6).toString("hex")}@demo.openordo.com`
      const user = await db.user.create({
        data: {
          username: dummyEmail,
          email: dummyEmail,
          name: `${req.firstName} ${req.lastName}`,
          platformRole: "TEMPORARY_DEMO",
          activeClinicId: clinic.id,
          onboardingStep: "COMPLETED",
          status: "ACTIVE",
          memberships: {
            create: {
              clinicId: clinic.id,
              role: "OWNER"
            }
          }
        }
      })
      tempUserId = user.id
    }

    // 3. Update DemoRequest
    const updated = await db.demoRequest.update({
      where: { id },
      data: {
        tempUserId,
        token,
        status: "CREDENTIALS_GENERATED",
        expiresAt: new Date(Date.now() + 1000 * 60 * 30) // 30 minutes
      }
    })

    return { success: true, token: updated.token }
  } catch (error: any) {
    console.error("Failed to generate demo credentials:", error)
    return { error: error.message }
  }
}

export async function getDemoRequestsAction() {
  try {
    await requireSuperAdmin()
    
    // Auto-cleanup any expired demo accounts before fetching
    await cleanupExpiredDemosAction()

    const requests = await db.demoRequest.findMany({
      orderBy: { createdAt: "desc" }
    })
    return { success: true, requests }
  } catch (error: any) {
    return { error: error.message }
  }
}

import { sendDemoCredentialsEmail } from "@/lib/email"

export async function sendDemoCredentialsEmailAction(id: string, baseUrl: string) {
  try {
    await requireSuperAdmin()

    const req = await db.demoRequest.findUnique({ where: { id } })
    if (!req) return { error: "Demo request not found" }
    if (!req.token) return { error: "Credentials not generated yet" }

    const link = `${baseUrl}/demo-login?token=${req.token}`
    
    const sent = await sendDemoCredentialsEmail(req.email, req.firstName, link)
    if (!sent) {
      return { error: "Failed to send email" }
    }

    await db.demoRequest.update({ where: { id }, data: { status: "SENT" } })

    return { success: true }
  } catch (error: any) {
    console.error("Failed to send demo credentials email:", error)
    return { error: error.message }
  }
}

export async function cleanupExpiredDemosAction() {
  try {
    const expiredRequests = await db.demoRequest.findMany({
      where: {
        expiresAt: { lt: new Date() },
        status: { in: ["CREDENTIALS_GENERATED", "USED", "SENT"] },
        tempUserId: { not: null }
      }
    })

    for (const req of expiredRequests) {
      if (req.tempUserId) {
        const user = await db.user.findUnique({ where: { id: req.tempUserId } })
        if (user && user.activeClinicId) {
          // Hard delete the clinic (cascades to all clinic data: patients, records, etc.)
          await db.clinic.delete({ where: { id: user.activeClinicId } })
        }
        // Hard delete the user
        await db.user.delete({ where: { id: req.tempUserId } }).catch(() => {})
      }
      
      // Update DemoRequest status to EXPIRED and remove the tempUserId mapping so we don't try to delete it again
      await db.demoRequest.update({
        where: { id: req.id },
        data: { status: "EXPIRED", tempUserId: null }
      })
    }
    return { success: true, count: expiredRequests.length }
  } catch (error) {
    console.error("Failed to cleanup expired demos:", error)
    return { success: false }
  }
}
