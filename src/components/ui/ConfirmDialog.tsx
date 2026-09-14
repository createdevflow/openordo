"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react"
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react"

type ConfirmOptions = {
  title: string
  body: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: "danger" | "primary" | "neutral"
  verifyString?: string // If provided, user must type this exactly to confirm
}

type ConfirmContextType = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  showAlert: (options: Omit<ConfirmOptions, "verifyString" | "cancelLabel">) => Promise<void>
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider")
  return ctx
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [resolver, setResolver] = useState<{ resolve: (val: boolean) => void } | null>(null)
  const [verifyInput, setVerifyInput] = useState("")

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts)
    setIsOpen(true)
    setVerifyInput("")
    return new Promise<boolean>((resolve) => {
      setResolver({ resolve })
    })
  }, [])

  const showAlert = useCallback((opts: Omit<ConfirmOptions, "verifyString" | "cancelLabel">) => {
    // We treat showAlert as a confirm with no cancel button
    setOptions({ ...opts, cancelLabel: "null_cancel_flag" })
    setIsOpen(true)
    setVerifyInput("")
    return new Promise<void>((resolve) => {
      setResolver({ resolve: () => resolve() })
    })
  }, [])

  const handleClose = (result: boolean) => {
    setIsOpen(false)
    resolver?.resolve(result)
  }

  const isAlert = options?.cancelLabel === "null_cancel_flag"

  const isVerified = !options?.verifyString || verifyInput === options.verifyString

  return (
    <ConfirmContext.Provider value={{ confirm, showAlert }}>
      {children}
      {isOpen && options && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(18, 48, 37, 0.5)", backdropFilter: "blur(3px)" }}>
          <div style={{ background: "#FBFAF6", backgroundColor: "#FBFAF6", width: "100%", maxWidth: 460, borderRadius: 12, border: "1px solid #DAD6C9", overflow: "hidden", boxShadow: "0 24px 50px rgba(18, 48, 37, 0.28), 0 4px 16px rgba(18, 48, 37, 0.12)" }}>
            <div style={{ padding: "24px 24px 20px", background: "#FBFAF6", backgroundColor: "#FBFAF6" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  background: options.tone === "danger" ? "#F3DBD3" : options.tone === "primary" ? "#DCEADD" : "#EAE9E1",
                  color: options.tone === "danger" ? "#B5432F" : options.tone === "primary" ? "#1E4638" : "#3C4A45"
                }}>
                  {options.tone === "danger" ? <AlertTriangle size={22} /> : options.tone === "primary" ? <CheckCircle2 size={22} /> : <Info size={22} />}
                </div>
                <div style={{ flex: 1, paddingTop: 2 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px 0", color: "#16241F" }}>{options.title}</h3>
                  <p style={{ fontSize: 14, color: "#3C4A45", margin: 0, lineHeight: 1.55 }}>{options.body}</p>
                </div>
              </div>
              
              {options.verifyString && (
                <div style={{ marginTop: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#16241F", marginBottom: 8 }}>
                    To confirm, please type <strong style={{ color: "#16241F", userSelect: "all" }}>{options.verifyString}</strong> below:
                  </label>
                  <input
                    type="text"
                    value={verifyInput}
                    onChange={(e) => setVerifyInput(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #DAD6C9", borderRadius: 8, fontSize: 14, outline: "none", background: "#FFFFFF", color: "#16241F" }}
                    placeholder={options.verifyString}
                  />
                </div>
              )}
            </div>
            <div style={{ padding: "14px 24px", background: "#F1F0EA", backgroundColor: "#F1F0EA", borderTop: "1px solid #DAD6C9", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              {!isAlert && (
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  style={{ padding: "8px 16px", borderRadius: 7, border: "1px solid #DAD6C9", background: "#FFFFFF", backgroundColor: "#FFFFFF", color: "#16241F", fontSize: 13.5, fontWeight: 600, cursor: "pointer", transition: "background 0.15s" }}
                >
                  {options.cancelLabel || "Cancel"}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleClose(true)}
                disabled={!isVerified}
                style={{
                  padding: "8px 18px", borderRadius: 7, fontSize: 13.5, fontWeight: 600, cursor: isVerified ? "pointer" : "not-allowed",
                  border: "none",
                  background: !isVerified ? "#DAD6C9" : options.tone === "danger" ? "#B5432F" : options.tone === "primary" ? "#1E4638" : "#16241F",
                  color: !isVerified ? "#5C7A67" : "#FFFFFF",
                  opacity: !isVerified ? 0.7 : 1,
                  transition: "opacity 0.15s, background 0.15s"
                }}
              >
                {options.confirmLabel || (isAlert ? "OK" : "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
