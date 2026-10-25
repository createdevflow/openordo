"use client";

import React from "react";
import { Printer } from "lucide-react";

export function PrintButton({ 
  label = "Print", 
  className = "cw-btn cw-btn-primary cw-btn-sm" 
}: { 
  label?: string; 
  className?: string 
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.print()}
      style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
    >
      <Printer size={13} /> {label}
    </button>
  );
}
