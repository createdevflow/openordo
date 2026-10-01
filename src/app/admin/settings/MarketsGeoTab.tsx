"use client"

import { useState } from "react"
import { TaxCountryConfig, TaxCalculationMode } from "@prisma/client"
import { upsertTaxCountryConfig, deleteTaxCountryConfig } from "@/server/actions/tax"
import { toast } from "sonner"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Modal } from "@/components/ui/Modal"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table"

export function MarketsGeoTab({ 
  initialConfigs, 
  globalSettings, 
  handleSaveGlobal, 
  savingGlobal 
}: { 
  initialConfigs: TaxCountryConfig[]
  globalSettings: Record<string, string>
  handleSaveGlobal: (s: Record<string, string>) => void
  savingGlobal: boolean
}) {
  const [configs, setConfigs] = useState(initialConfigs)
  const [isOpen, setIsOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<Partial<TaxCountryConfig> | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEdit = (config: TaxCountryConfig) => {
    setEditingConfig(config)
    setIsOpen(true)
  }

  const handleCreate = () => {
    setEditingConfig({
      countryCode: "",
      countryName: "",
      currencyBucket: "INR",
      taxLabel: "GST",
      calculationMode: TaxCalculationMode.NONE,
      isActive: true,
    })
    setIsOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return
    try {
      await deleteTaxCountryConfig(id)
      setConfigs(configs.filter(c => c.id !== id))
      toast.success("Deleted successfully")
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingConfig) return

    setIsSubmitting(true)
    try {
      await upsertTaxCountryConfig({
        id: editingConfig.id,
        countryCode: editingConfig.countryCode!,
        countryName: editingConfig.countryName!,
        currencyBucket: editingConfig.currencyBucket!,
        taxLabel: editingConfig.taxLabel!,
        taxIdLabel: editingConfig.taxIdLabel || null,
        calculationMode: editingConfig.calculationMode as TaxCalculationMode,
        flatRate: editingConfig.flatRate ? Number(editingConfig.flatRate) : null,
        ourRegisteredRegion: editingConfig.ourRegisteredRegion || null,
        invoiceNumberPrefix: editingConfig.invoiceNumberPrefix || null,
        isActive: editingConfig.isActive ?? true,
      })
      toast.success("Saved successfully")
      setIsOpen(false)
      // For a real app we'd reload router, but we can just use revalidatePath in action
      window.location.reload()
    } catch (error: any) {
      toast.error("Failed to save: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const [defaultMarket, setDefaultMarket] = useState(globalSettings.DEFAULT_MARKET || 'US')

  return (
    <div className="space-y-6">
      <section>
        <div style={{ marginBottom: 20 }}>
          <div className="adm-section-label" style={{ marginBottom: 4 }}>Default Market</div>
          <p style={{ fontSize: 13.5, color: "var(--adm-muted)", margin: 0 }}>
            Choose the default fallback market for pricing and taxes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Select value={defaultMarket} onChange={(e) => setDefaultMarket(e.target.value)} style={{ width: 200 }}>
            <option value="US">US / Rest of World</option>
            <option value="IN">India (IN)</option>
          </Select>
          <Button 
            disabled={savingGlobal} 
            onClick={() => handleSaveGlobal({ DEFAULT_MARKET: defaultMarket })}
          >
            {savingGlobal ? 'Saving...' : 'Save Default Market'}
          </Button>
        </div>
      </section>
      <hr style={{ border: 0, borderTop: '1px solid var(--adm-border)' }} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tax & Country Configs</h2>
          <p className="text-ink-soft">Manage multi-country tax settings</p>
        </div>
        <Button onClick={handleCreate}>Add Config</Button>
      </div>

      <div className="border border-line rounded-control bg-paper-raised">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Country</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-ink-soft py-6">
                  No configurations found.
                </TableCell>
              </TableRow>
            ) : (
              configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">{config.countryName}</TableCell>
                  <TableCell>{config.countryCode}</TableCell>
                  <TableCell>{config.currencyBucket}</TableCell>
                  <TableCell>{config.calculationMode}</TableCell>
                  <TableCell>{config.flatRate ? `${config.flatRate}%` : '-'}</TableCell>
                  <TableCell>{config.isActive ? "Active" : "Inactive"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(config)}>
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(config.id)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        title={`${editingConfig?.id ? 'Edit' : 'Create'} Config`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-semibold">Country Name</label>
            <Input
              required
              value={editingConfig?.countryName || ''}
              onChange={e => setEditingConfig({ ...editingConfig, countryName: e.target.value })}
              placeholder="e.g. India"
            />
          </div>
          
          <div className="grid gap-2">
            <label className="text-sm font-semibold">Country Code (ISO 2)</label>
            <Input
              required
              value={editingConfig?.countryCode || ''}
              onChange={e => setEditingConfig({ ...editingConfig, countryCode: e.target.value })}
              placeholder="e.g. IN"
              maxLength={2}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-semibold">Currency Bucket</label>
            <Input
              required
              value={editingConfig?.currencyBucket || ''}
              onChange={e => setEditingConfig({ ...editingConfig, currencyBucket: e.target.value })}
              placeholder="e.g. INR or USD"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-semibold">Tax Label</label>
            <Input
              required
              value={editingConfig?.taxLabel || ''}
              onChange={e => setEditingConfig({ ...editingConfig, taxLabel: e.target.value })}
              placeholder="e.g. GST"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-semibold">Tax ID Label</label>
            <Input
              value={editingConfig?.taxIdLabel || ''}
              onChange={e => setEditingConfig({ ...editingConfig, taxIdLabel: e.target.value })}
              placeholder="e.g. GSTIN (optional)"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-semibold">Calculation Mode</label>
            <Select
              value={editingConfig?.calculationMode || TaxCalculationMode.NONE}
              onChange={(e) => setEditingConfig({ ...editingConfig, calculationMode: e.target.value as TaxCalculationMode })}
            >
              <option value={TaxCalculationMode.NONE}>NONE</option>
              <option value={TaxCalculationMode.FLAT_PERCENTAGE}>FLAT PERCENTAGE</option>
              <option value={TaxCalculationMode.SPLIT_BY_SUPPLY_REGION}>SPLIT BY SUPPLY REGION (India)</option>
            </Select>
          </div>

          {editingConfig?.calculationMode !== TaxCalculationMode.NONE && (
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Flat Rate (%)</label>
              <Input
                type="number"
                step="0.01"
                required
                value={editingConfig?.flatRate || ''}
                onChange={e => setEditingConfig({ ...editingConfig, flatRate: Number(e.target.value) })}
                placeholder="e.g. 18"
              />
            </div>
          )}

          {editingConfig?.calculationMode === TaxCalculationMode.SPLIT_BY_SUPPLY_REGION && (
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Our Registered Region</label>
              <Input
                required
                value={editingConfig?.ourRegisteredRegion || ''}
                onChange={e => setEditingConfig({ ...editingConfig, ourRegisteredRegion: e.target.value })}
                placeholder="e.g. Karnataka"
              />
            </div>
          )}

          <div className="grid gap-2">
            <label className="text-sm font-semibold">Invoice Number Prefix</label>
            <Input
              value={editingConfig?.invoiceNumberPrefix || ''}
              onChange={e => setEditingConfig({ ...editingConfig, invoiceNumberPrefix: e.target.value })}
              placeholder="e.g. OO-IN"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={editingConfig?.isActive ?? true}
              onChange={(e) => setEditingConfig({ ...editingConfig, isActive: e.target.checked })}
              className="rounded border-line h-4 w-4 text-forest focus:ring-forest"
            />
            <label htmlFor="isActive" className="text-sm font-semibold cursor-pointer">Active (shown in onboarding)</label>
          </div>

          <div className="flex justify-end gap-2 pt-6">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

