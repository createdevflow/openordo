"use client"

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
}

export function BookingPageLayout({
  clinicId, clinicName, clinicAddress, clinicPhone, clinicOpenTime, clinicCloseTime,
  doctors, appointmentTypes, accentColor,
  displayName, tagline, aboutText, logoUrl, coverUrl, faviconUrl,
  showAddress, showPhone, showHours,
  socialLinks, showBadge,
}: Props) {

  // Inject favicon dynamically
  useEffect(() => {
    if (!faviconUrl) return
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null
    if (!link) {
      link = document.createElement("link")
      link.rel = "icon"
      document.head.appendChild(link)
    }
    link.href = faviconUrl
  }, [faviconUrl])

  const hasCover = !!coverUrl
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
          <div style={{ width: "100%", height: 220, overflow: "hidden", position: "relative" }}>
            <img src={coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {/* Scrim so card always reads on top of any image */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.55) 100%)"
            }} />
          </div>
        ) : (
          /* No cover: solid brand-coloured bar (thin) */
          <div style={{ width: "100%", height: 8, background: accentColor }} />
        )}

        {/* Clinic identity card — overlaps cover bottom (or sits flush below the bar) */}
        <div style={{
          maxWidth: 940,
          margin: "0 auto",
          padding: "0 20px",
          position: "relative",
          marginTop: hasCover ? -72 : 0,
        }}>
          <div style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 16,
            background: hasCover ? "rgba(255,255,255,0.96)" : "transparent",
            backdropFilter: hasCover ? "blur(8px)" : "none",
            borderRadius: hasCover ? 14 : 0,
            border: hasCover ? "1px solid var(--line)" : "none",
            boxShadow: hasCover ? "0 4px 20px rgba(0,0,0,0.10)" : "none",
            padding: hasCover ? "16px 20px" : "20px 0 0",
          }}>
            {/* Logo or initial avatar */}
            {logoUrl ? (
              <img src={logoUrl} alt={displayName} style={{
                width: 56, height: 56, objectFit: "contain", borderRadius: 10,
                border: "2px solid var(--line)", flexShrink: 0, background: "#fff",
              }} />
            ) : (
              <div style={{
                width: 56, height: 56, borderRadius: 10, flexShrink: 0,
                background: accentColor,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, fontWeight: 700, color: "#fff",
                border: "2px solid rgba(255,255,255,0.6)",
              }}>
                {displayName?.[0]?.toUpperCase() ?? "C"}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
              <h1 style={{
                margin: 0, fontSize: 20, fontWeight: 700,
                color: "var(--ink)", lineHeight: 1.25,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {displayName}
              </h1>
              {tagline && (
                <p style={{ margin: "3px 0 0", fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.4 }}>
                  {tagline}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── PAGE BODY ──────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 940, margin: "0 auto", padding: "24px 20px 56px" }}>

        {/* ── ABOUT / CLINIC INFO CARD (combined, single card) ─────────────── */}
        {(aboutText || hasInfo) && (
          <div style={{
            background: "var(--paper-raised)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "18px 22px",
            marginBottom: 24,
          }}>
            {aboutText && (
              <p style={{
                margin: hasInfo ? "0 0 14px" : 0,
                fontSize: 14, lineHeight: 1.7,
                color: "var(--ink-soft)",
              }}>
                {aboutText}
              </p>
            )}

            {hasInfo && (
              <div style={{
                display: "flex", flexWrap: "wrap", gap: "8px 24px",
                borderTop: aboutText ? "1px solid var(--line)" : "none",
                paddingTop: aboutText ? 14 : 0,
              }}>
                {showAddress && clinicAddress && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-soft)" }}>
                    <MapPin size={14} style={{ color: accentColor, flexShrink: 0 }} />
                    {clinicAddress}
                  </span>
                )}
                {showPhone && clinicPhone && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-soft)" }}>
                    <Phone size={14} style={{ color: accentColor, flexShrink: 0 }} />
                    {clinicPhone}
                  </span>
                )}
                {showHours && clinicOpenTime && clinicCloseTime && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-soft)" }}>
                    <Clock size={14} style={{ color: accentColor, flexShrink: 0 }} />
                    {clinicOpenTime} – {clinicCloseTime}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── BOOKING SECTION HEADING ───────────────────────────────────────── */}
        <div style={{ marginBottom: 20, textAlign: "center" }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: "var(--ink)", margin: "0 0 6px" }}>
            Book an Appointment
          </h2>
          <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: 0 }}>
            Fill in your details below — we&apos;ll confirm your slot shortly.
          </p>
        </div>

        {/* ── TWO-COLUMN BOOKING LAYOUT ─────────────────────────────────────── */}
        {/*
          Desktop: two columns [left: context info] [right: form]
          Mobile:  single column, context first then form
          Breakpoint: 768px (md) — matching CHARTWELL_BUILD_SPEC §1 pattern
        */}
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }} className="booking-cols">

          {/* ── LEFT COLUMN: Context panel ───────────────────────────────── */}
          <div className="booking-col-left" style={{
            flex: "0 0 280px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}>

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
            <BookingForm
              clinicId={clinicId}
              doctors={doctors}
              clinicPhone={clinicPhone}
              appointmentTypes={appointmentTypes}
              accentColor={accentColor}
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
        @media (max-width: 767px) {
          .booking-cols { flex-direction: column !important; }
          .booking-col-left { flex: none !important; width: 100% !important; }
          .booking-col-right { flex: none !important; width: 100% !important; }
        }
      `}</style>
    </div>
  )
}
