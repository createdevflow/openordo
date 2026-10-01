"use server"

/**
 * DNS Health Check utility — CHARTWELL_PRELAUNCH_OPS_SPEC.md §5
 *
 * Verifies that a clinic's custom domain (e.g., booking.drsmith.com)
 * has a CNAME record correctly pointing to our infrastructure (cname.openordo.com).
 */

import dns from "dns/promises"
import { logger } from "@/lib/logger"

const EXPECTED_CNAME_TARGET = "cname.openordo.com"

export interface DnsCheckResult {
  success: boolean
  status: "OK" | "PENDING" | "ERROR"
  message: string
  recordsFound?: string[]
}

/**
 * Resolves the CNAME records for the given hostname and checks if it points
 * to the OpenORDO CNAME target.
 *
 * @param hostname The custom domain to check (e.g., "booking.drsmith.com")
 */
export async function checkCustomDomainHealth(hostname: string): Promise<DnsCheckResult> {
  if (!hostname || hostname.trim() === "") {
    return { success: false, status: "ERROR", message: "Hostname is required." }
  }

  const cleanHostname = hostname.trim().toLowerCase().replace(/^https?:\/\//, "")

  try {
    const records = await dns.resolveCname(cleanHostname)

    const isHealthy = records.some((record) =>
      record.toLowerCase().includes(EXPECTED_CNAME_TARGET)
    )

    if (isHealthy) {
      return {
        success: true,
        status: "OK",
        message: "DNS is correctly configured.",
        recordsFound: records,
      }
    } else {
      return {
        success: false,
        status: "PENDING",
        message: `CNAME record found, but does not point to ${EXPECTED_CNAME_TARGET}.`,
        recordsFound: records,
      }
    }
  } catch (error: any) {
    if (error.code === "ENODATA" || error.code === "ENOTFOUND") {
      return {
        success: false,
        status: "PENDING",
        message: "No CNAME records found for this domain. DNS propagation may take up to 24 hours.",
      }
    }

    logger.error("DNS health check failed", error, { hostname: cleanHostname })
    return {
      success: false,
      status: "ERROR",
      message: "An error occurred while checking DNS records.",
    }
  }
}
