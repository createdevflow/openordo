"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

interface AdminPaginationProps {
  page: number
  pageSize: number
  total?: number
  totalItems?: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
}

export function AdminPagination({
  page,
  pageSize,
  total,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: AdminPaginationProps) {
  const actualTotal = total ?? totalItems ?? 0
  const totalPages = Math.ceil(actualTotal / pageSize)
  if (actualTotal === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, actualTotal)

  // Generate page numbers with ellipsis
  const pages: (number | "...")[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push("...")
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i)
    }
    if (page < totalPages - 2) pages.push("...")
    pages.push(totalPages)
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 16px",
      borderTop: "1px solid var(--adm-border)",
      flexWrap: "wrap",
      gap: 12,
    }}>
      {/* Left: count + page size selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "var(--adm-muted)" }}>
        <span>
          Showing <strong style={{ color: "var(--adm-text)" }}>{from}–{to}</strong> of{" "}
          <strong style={{ color: "var(--adm-text)" }}>{actualTotal}</strong>
        </span>
        {onPageSizeChange && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={e => {
                onPageSizeChange(Number(e.target.value))
                onPageChange(1)
              }}
              style={{
                border: "1px solid var(--adm-border)",
                borderRadius: 6,
                padding: "3px 6px",
                fontSize: 12.5,
                background: "var(--adm-card)",
                color: "var(--adm-text)",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {pageSizeOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: page buttons */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 30, height: 30, borderRadius: 6,
              border: "1px solid var(--adm-border)",
              background: "var(--adm-card)",
              color: "var(--adm-muted)",
              cursor: page === 1 ? "not-allowed" : "pointer",
              opacity: page === 1 ? 0.4 : 1,
            }}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </button>

          {pages.map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} style={{ padding: "0 4px", fontSize: 13, color: "var(--adm-muted)" }}>…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 30, height: 30, borderRadius: 6,
                  border: "1px solid var(--adm-border)",
                  background: p === page ? "var(--adm-accent)" : "var(--adm-card)",
                  color: p === page ? "white" : "var(--adm-text)",
                  fontWeight: p === page ? 700 : 400,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 30, height: 30, borderRadius: 6,
              border: "1px solid var(--adm-border)",
              background: "var(--adm-card)",
              color: "var(--adm-muted)",
              cursor: page === totalPages ? "not-allowed" : "pointer",
              opacity: page === totalPages ? 0.4 : 1,
            }}
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

/** Slice data for client-side pagination */
export function paginateData<T>(data: T[], page: number, pageSize: number): T[] {
  return data.slice((page - 1) * pageSize, page * pageSize)
}
