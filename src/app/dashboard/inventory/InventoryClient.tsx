"use client"

import { useState } from "react"
import { Package, Plus, TrendingUp, TrendingDown, AlertTriangle, Pencil, Trash2, RefreshCw } from "lucide-react"
import { createInventoryItem, logInventoryTransaction, deleteInventoryItem } from "@/server/actions/inventory"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useConfirm } from "@/components/ui/ConfirmDialog"

type InventoryItem = {
  id: string
  name: string
  sku: string | null
  unit: string
  quantityOnHand: number
  reorderThreshold: number
  unitCost: number | null
  _count: { transactions: number }
  transactions: { id: string; change: number; reason: string; createdAt: Date }[]
}

function AddItemModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({ name: "", sku: "", unit: "box", quantityOnHand: "0", reorderThreshold: "5", unitCost: "" })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createInventoryItem({
        name: form.name,
        sku: form.sku || undefined,
        unit: form.unit,
        quantityOnHand: Number(form.quantityOnHand),
        reorderThreshold: Number(form.reorderThreshold),
        unitCost: form.unitCost ? Math.round(parseFloat(form.unitCost) * 100) : undefined,
      })
      toast.success("Item added")
      onSave()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}>
      <div style={{ background: "var(--paper-raised)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 420 }}>
        <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 20 }}>Add Inventory Item</h3>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>Name *</label>
            <input className="cw-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Paracetamol 500mg" style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 14, background: "var(--paper)" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>SKU</label>
              <input className="cw-input" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="Optional" style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 14, background: "var(--paper)" }} />
            </div>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>Unit *</label>
              <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 14, background: "var(--paper)" }}>
                {["box", "vial", "strip", "tablet", "sachet", "bottle", "unit"].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>Qty on hand</label>
              <input type="number" value={form.quantityOnHand} onChange={e => setForm(f => ({ ...f, quantityOnHand: e.target.value }))} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 14, background: "var(--paper)" }} />
            </div>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>Reorder at</label>
              <input type="number" value={form.reorderThreshold} onChange={e => setForm(f => ({ ...f, reorderThreshold: e.target.value }))} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 14, background: "var(--paper)" }} />
            </div>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>Unit cost (₹)</label>
              <input type="number" step="0.01" value={form.unitCost} onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))} placeholder="Optional" style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 14, background: "var(--paper)" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button type="submit" className="cw-btn cw-btn-primary" disabled={loading} style={{ flex: 1 }}>{loading ? "Adding…" : "Add Item"}</button>
            <button type="button" className="cw-btn cw-btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AdjustModal({ item, onClose, onSave }: { item: InventoryItem; onClose: () => void; onSave: () => void }) {
  const [reason, setReason] = useState<"RESTOCK" | "USED_IN_VISIT" | "ADJUSTMENT">("RESTOCK")
  const [qty, setQty] = useState("1")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const change = reason === "USED_IN_VISIT" ? -Math.abs(Number(qty)) : Math.abs(Number(qty))
    try {
      await logInventoryTransaction({ itemId: item.id, change, reason })
      toast.success("Stock updated")
      onSave()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}>
      <div style={{ background: "var(--paper-raised)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 360 }}>
        <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Adjust Stock</h3>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 20 }}>{item.name} — currently {item.quantityOnHand} {item.unit}(s)</p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value as any)} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 14, background: "var(--paper)" }}>
              <option value="RESTOCK">Restock (+)</option>
              <option value="USED_IN_VISIT">Used in visit (−)</option>
              <option value="ADJUSTMENT">Manual adjustment</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>
              {reason === "ADJUSTMENT" ? "Net change (use − for decrease)" : "Quantity"}
            </label>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 14, background: "var(--paper)" }} required />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" className="cw-btn cw-btn-primary" disabled={loading} style={{ flex: 1 }}>{loading ? "Saving…" : "Apply"}</button>
            <button type="button" className="cw-btn cw-btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function InventoryClient({ items }: { items: InventoryItem[] }) {
  const router = useRouter()
  const { confirm } = useConfirm()
  const [showAdd, setShowAdd] = useState(false)
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)

  const lowStock = items.filter(i => i.quantityOnHand <= i.reorderThreshold)

  const handleDelete = async (item: InventoryItem) => {
    const ok = await confirm({ title: `Delete ${item.name}?`, body: "This will remove all transaction history for this item.", tone: "danger" })
    if (!ok) return
    try {
      await deleteInventoryItem(item.id)
      toast.success("Item deleted")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="cw" style={{ padding: "24px 28px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", marginBottom: 4 }}>Inventory</h1>
          <p style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>{items.length} items · {lowStock.length} low stock</p>
        </div>
        <button className="cw-btn cw-btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add Item
        </button>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div style={{ background: "#fffbeb", border: "1.5px solid #f59e0b40", borderRadius: 10, padding: "12px 16px", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={18} style={{ color: "#d97706", flexShrink: 0 }} />
          <div style={{ fontSize: 13.5, color: "#92400e" }}>
            <strong>{lowStock.length} item{lowStock.length > 1 ? "s" : ""}</strong> at or below reorder threshold:{" "}
            {lowStock.map(i => i.name).join(", ")}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-soft)" }}>
          <Package size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontWeight: 600 }}>No inventory items yet</p>
          <p style={{ fontSize: 13 }}>Add your first item to start tracking stock.</p>
          <button className="cw-btn cw-btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add First Item
          </button>
        </div>
      ) : (
        <div style={{ background: "var(--paper-raised)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--paper)", borderBottom: "1px solid var(--line)" }}>
                {["Name / SKU", "Unit", "In Stock", "Reorder At", "Unit Cost", "Transactions", ""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", fontSize: 11.5, fontWeight: 700, color: "var(--ink-soft)", textAlign: "left", letterSpacing: ".03em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const isLow = item.quantityOnHand <= item.reorderThreshold
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--line)", background: isLow ? "#fffbeb" : undefined }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{item.name}</div>
                      {item.sku && <div style={{ fontSize: 11.5, color: "var(--ink-soft)", fontFamily: "monospace" }}>{item.sku}</div>}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--ink-soft)" }}>{item.unit}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontWeight: 800, fontSize: 16, color: isLow ? "#b45309" : "var(--forest)" }}>
                        {item.quantityOnHand}
                      </span>
                      {isLow && <AlertTriangle size={13} style={{ color: "#d97706", marginLeft: 6, display: "inline" }} />}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--ink-soft)" }}>{item.reorderThreshold}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--ink-soft)" }}>
                      {item.unitCost ? `₹${(item.unitCost / 100).toFixed(2)}` : "—"}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--ink-soft)", textAlign: "center" }}>
                      {item._count.transactions}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          title="Adjust stock"
                          onClick={() => setAdjustItem(item)}
                          style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid var(--line)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600 }}
                        >
                          <RefreshCw size={13} /> Adjust
                        </button>
                        <button
                          title="Delete"
                          onClick={() => handleDelete(item)}
                          style={{ padding: "6px", borderRadius: 7, border: "1px solid var(--line)", background: "transparent", cursor: "pointer", color: "var(--coral)" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddItemModal
          onClose={() => setShowAdd(false)}
          onSave={() => { setShowAdd(false); router.refresh() }}
        />
      )}
      {adjustItem && (
        <AdjustModal
          item={adjustItem}
          onClose={() => setAdjustItem(null)}
          onSave={() => { setAdjustItem(null); router.refresh() }}
        />
      )}
    </div>
  )
}
