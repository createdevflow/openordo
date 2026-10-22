"use client"
import { getFileUrl } from "@/lib/file-utils";


import React, { useState, useEffect } from "react"
import { MapPin, Phone, Clock, Globe, CheckCircle, Loader2, ChevronDown, User2 } from "lucide-react"
import { BookingForm } from "./BookingForm"

interface Props {
  clinicId: string
  clinicName: string
  clinicAddress: string
  clinicPhone: string
  clinicOpenTime: string
  clinicCloseTime: string
  doctors: any[]
  appointmentTypes: string[]
  accentColor: string
  displayName: string
  tagline: string
  aboutText: string
  logoUrl: string
  coverUrl: string
  faviconUrl: string
  showAddress: boolean
  showPhone: boolean
  showHours: boolean
  socialLinks: Record<string, string>
  showBadge: boolean
  isBookingEnabled?: boolean
  isBookingLimitReached?: boolean
  bookingLimitMessage?: string
  slotCapacityConfig?: {
    defaultCapacity: number
    slotOverrides: Record<string, number>
  }
}

export function BookingPageLayout({
  clinicId, clinicName, clinicAddress, clinicPhone, clinicOpenTime, clinicCloseTime,
  doctors, appointmentTypes, accentColor,
  displayName, tagline, aboutText, logoUrl, coverUrl, faviconUrl,
  showAddress, showPhone, showHours,
  socialLinks, showBadge,
  isBookingEnabled = true,
  isBookingLimitReached = false,
  bookingLimitMessage = "",
  slotCapacityConfig,
}: Props) {

  // Inject favicon dynamically
  useEffect(() => {
    if (!faviconUrl) return
    const resolvedFavicon = getFileUrl(faviconUrl)
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null
    if (!link) {
      link = document.createElement("link")
      link.rel = "icon"
      document.head.appendChild(link)
    }
    link.href = resolvedFavicon
  }, [faviconUrl])

  const resolvedCoverUrl = coverUrl ? getFileUrl(coverUrl) : ""
  const resolvedLogoUrl = logoUrl ? getFileUrl(logoUrl) : ""
  const hasCover = !!resolvedCoverUrl
  const hasInfo  = (showAddress && clinicAddress) || (showPhone && clinicPhone) || (showHours && clinicOpenTime)

  // ── Brand CSS vars injected inline on the root ────────────────────────────
  const cssVars = { "--accent": accentColor } as React.CSSProperties

  // ── Social links present? ─────────────────────────────────────────────────
  const hasSocial = Object.values(socialLinks).some(Boolean)

  return (
    <div className="cw" style={{ minHeight: "100vh", background: "var(--paper)", fontFamily: "var(--font-inter, Inter, sans-serif)", ...cssVars }}>

      {/* ── HERO / HEADER AREA ─────────────────────────────────────────────── */}
      <div style={{ position: "relative", width: "100%" }}>

        {/* Cover image (full-bleed) */}
        {hasCover ? (
          <div style={{ width: "100%", height: 260, overflow: "hidden", position: "relative" }}>
            <img src={resolvedCoverUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {/* Scrim so card always reads on top of any image */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 100%)"
            }} />
          </div>
        ) : (
          /* Branded gradient hero banner when no custom image is uploaded */
          <div style={{
            width: "100%",
            height: 180,
            position: "relative",
            overflow: "hidden",
            background: `linear-gradient(135deg, ${accentColor} 0%, #0F231C 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 32px"
          }}>
            <div style={{
              position: "absolute",
              inset: 0,
              opacity: 0.12,
              backgroundImage: `radial-gradient(circle at 20% 50%, #fff 1.5px, transparent 1.5px), radial-gradient(circle at 80% 50%, #fff 1.5px, transparent 1.5px)`,
              backgroundSize: "28px 28px"
            }} />
            <div style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              gap: 12
            }}>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.85)",
                background: "rgba(255,255,255,0.15)",
                padding: "5px 14px",
                borderRadius: 20,
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(255,255,255,0.2)"
              }}>
                Verified Healthcare Provider
              </span>
            </div>
          </div>
        )}

        {/* Clinic identity card — overlaps cover bottom */}
        <div style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "0 24px",
          position: "relative",
          marginTop: hasCover ? -76 : -48,
        }}>
          <div style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 18,
            background: "rgba(255,255,255,0.98)",
            backdropFilter: "blur(12px)",
            borderRadius: 16,
            border: "1px solid var(--line)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
            padding: "20px 24px",
          }}>
            {/* Logo or initial avatar */}
            {resolvedLogoUrl ? (
              <img src={resolvedLogoUrl} alt={displayName} style={{
                width: 68, height: 68, objectFit: "contain", borderRadius: 12,
                border: "2px solid var(--line)", flexShrink: 0, background: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
              }} />
            ) : (
              <div style={{
                width: 68, height: 68, borderRadius: 12, flexShrink: 0,
                background: accentColor,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, fontWeight: 700, color: "#fff",
                border: "3px solid #fff",
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)"
              }}>
                {displayName?.[0]?.toUpperCase() ?? "C"}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h1 style={{
                  margin: 0, fontSize: 22, fontWeight: 700,
                  color: "var(--ink)", lineHeight: 1.25,
                }}>
                  {displayName}
                </h1>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 11, fontWeight: 600, color: accentColor,
                  background: `${accentColor}15`, padding: "2px 8px", borderRadius: 12
                }}>
                  <CheckCircle size={12} /> Official Portal
                </span>
              </div>
              {tagline && (
                <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.4 }}>
                  {tagline}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── PAGE BODY ──────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 24px 64px" }}>

        {/* ── TWO-COLUMN BOOKING LAYOUT ─────────────────────────────────────── */}
        {/*
          Desktop: two columns [left: context info & clinic details] [right: form]
          Mobile:  single column, context first then form
          Breakpoint: 860px
        */}
        <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }} className="booking-cols">

          {/* ── LEFT COLUMN: Context panel ───────────────────────────────── */}
          <div className="booking-col-left" style={{
            flex: "0 0 340px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}>

            {/* 1. Clinic Info / About Card (relocated to left column as requested) */}
            {(aboutText || hasInfo) && (
              <div style={{
                background: "var(--paper-raised)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                overflow: "hidden",
              }}>
                <div style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--line)",
                  background: "var(--paper)",
                  fontSize: 11, fontWeight: 700, color: "var(--moss)",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  About Clinic
                </div>
                <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
                  {aboutText && (
                    <p style={{
                      margin: 0,
                      fontSize: 13.5, lineHeight: 1.6,
                      color: "var(--ink-soft)",
                    }}>
                      {aboutText}
                    </p>
                  )}

                  {hasInfo && (
                    <div style={{
                      display: "flex", flexDirection: "column", gap: 10,
                      borderTop: aboutText ? "1px solid var(--line)" : "none",
                      paddingTop: aboutText ? 12 : 0,
                    }}>
                      {showAddress && clinicAddress && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--ink-soft)" }}>
                          <MapPin size={15} style={{ color: accentColor, flexShrink: 0, marginTop: 2 }} />
                          <span style={{ lineHeight: 1.4 }}>{clinicAddress}</span>
                        </div>
                      )}
                      {showPhone && clinicPhone && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-soft)" }}>
                          <Phone size={15} style={{ color: accentColor, flexShrink: 0 }} />
                          <span>{clinicPhone}</span>
                        </div>
                      )}
                      {showHours && clinicOpenTime && clinicCloseTime && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-soft)" }}>
                          <Clock size={15} style={{ color: accentColor, flexShrink: 0 }} />
                          <span>{clinicOpenTime} – {clinicCloseTime}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Doctors available */}
            {doctors.length > 0 && (
              <div style={{
                background: "var(--paper-raised)", border: "1px solid var(--line)",
                borderRadius: 12, overflow: "hidden",
              }}>
                <div style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--line)",
                  background: "var(--paper)",
                  fontSize: 11, fontWeight: 700, color: "var(--moss)",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  Our Doctors
                </div>
                {doctors.map((d, i) => (
                  <div key={d.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px",
                    borderBottom: i < doctors.length - 1 ? "1px solid var(--line)" : "none",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: accentColor,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700, color: "#fff",
                    }}>
                      {d.name?.[0]?.toUpperCase() ?? <User2 size={16} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{d.name}</div>
                      {d.specialty && (
                        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 1 }}>{d.specialty}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Appointment types (if configured) */}
            {appointmentTypes.length > 0 && (
              <div style={{
                background: "var(--paper-raised)", border: "1px solid var(--line)",
                borderRadius: 12, overflow: "hidden",
              }}>
                <div style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--line)",
                  background: "var(--paper)",
                  fontSize: 11, fontWeight: 700, color: "var(--moss)",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  Services Offered
                </div>
                <div style={{ padding: "10px 16px", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {appointmentTypes.map(t => (
                    <span key={t} style={{
                      fontSize: 12.5, padding: "4px 10px",
                      background: "var(--paper)", border: "1px solid var(--line)",
                      borderRadius: 20, color: "var(--ink-soft)",
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* What to expect */}
            <div style={{
              background: "var(--paper-raised)", border: "1px solid var(--line)",
              borderRadius: 12, padding: "16px",
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: "var(--moss)",
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10,
              }}>
                What to Expect
              </div>
              {[
                { n: "1", text: "Submit your appointment request with your details." },
                { n: "2", text: "We'll review and confirm your slot by phone or email." },
                { n: "3", text: "Arrive 5 minutes early on the day of your appointment." },
              ].map(({ n, text }) => (
                <div key={n} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    background: accentColor,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: "#fff",
                  }}>
                    {n}
                  </div>
                  <span style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>

            {/* Social links (desktop only; also shown in footer on mobile) */}
            {hasSocial && (
              <div style={{
                background: "var(--paper-raised)", border: "1px solid var(--line)",
                borderRadius: 12, padding: "14px 16px",
                display: "flex", flexWrap: "wrap", gap: 10,
              }}>
                {socialLinks.website && (
                  <a href={socialLinks.website} target="_blank" rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: accentColor, textDecoration: "none" }}>
                    <Globe size={13} /> Website
                  </a>
                )}
                {socialLinks.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12.5, color: accentColor, textDecoration: "none" }}>📸 Instagram</a>
                )}
                {socialLinks.facebook && (
                  <a href={socialLinks.facebook} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12.5, color: accentColor, textDecoration: "none" }}>📘 Facebook</a>
                )}
                {socialLinks.twitter && (
                  <a href={socialLinks.twitter} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12.5, color: accentColor, textDecoration: "none" }}>🐦 X / Twitter</a>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN: Booking form ────────────────────────────────── */}
          <div className="booking-col-right" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)", margin: "0 0 6px" }}>
                {!isBookingEnabled
                  ? "Clinic Appointments"
                  : isBookingLimitReached
                  ? "Online Booking Capacity Reached"
                  : "Book an Appointment"}
              </h2>
              <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: 0 }}>
                {!isBookingEnabled
                  ? "Online booking is not currently active for this clinic — please contact them directly."
                  : isBookingLimitReached
                  ? "This clinic has filled all allocated online booking slots for this month."
                  : "Fill in your details below — we'll confirm your slot shortly."}
              </p>
            </div>

            <BookingForm
              clinicId={clinicId}
              doctors={doctors}
              clinicPhone={clinicPhone}
              clinicOpenTime={clinicOpenTime}
              clinicCloseTime={clinicCloseTime}
              appointmentTypes={appointmentTypes}
              accentColor={accentColor}
              isBookingEnabled={isBookingEnabled}
              isBookingLimitReached={isBookingLimitReached}
              bookingLimitMessage={bookingLimitMessage}
              slotCapacityConfig={slotCapacityConfig}
            />
          </div>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        {showBadge && (
          <div style={{ marginTop: 32, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>
              Powered by{" "}
              <strong style={{ color: accentColor }}>OpenORDO</strong>
            </p>
          </div>
        )}
      </div>

      {/* ── RESPONSIVE STYLES ─────────────────────────────────────────────── */}
      <style>{`
        .booking-cols { flex-direction: row; }
        .booking-col-left { display: flex !important; }
        @media (max-width: 860px) {
          .booking-cols { flex-direction: column !important; }
          .booking-col-left { flex: none !important; width: 100% !important; }
          .booking-col-right { flex: none !important; width: 100% !important; }
        }
      `}</style>
    </div>
  )
}
