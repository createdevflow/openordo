"use client"

import { useState, useEffect } from "react"
import { getStorageStats, getVaultDocuments } from "@/server/actions/documents"
import { HardDrive, FileText, Download, FolderOpen, Archive, Image as ImageIcon, Search } from "lucide-react"

export function StorageTab() {
  const [stats, setStats] = useState<any>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeVault, setActiveVault] = useState<string>("ALL")
  
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [statsRes, docsRes] = await Promise.all([
        getStorageStats(),
        getVaultDocuments(activeVault === "ALL" ? undefined : activeVault)
      ])
      if (statsRes.ok) setStats(statsRes)
      if (docsRes.ok) setDocs(docsRes.documents || [])
      setLoading(false)
      setCurrentPage(1)
    }
    load()
  }, [activeVault])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0.00 MB";
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return (bytes / 1024).toFixed(2) + " KB";
    if (mb < 1000) return mb.toFixed(2) + " MB";
    return (mb / 1024).toFixed(2) + " GB";
  }

  const renderProgressBar = () => {
    if (!stats) return null
    const { usedBytes, totalBytes, isUnlimited } = stats
    
    const usedStr = formatBytes(usedBytes)
    const totalStr = isUnlimited ? "Unlimited" : formatBytes(totalBytes)
    const percentage = isUnlimited ? 0 : Math.min(100, (usedBytes / totalBytes) * 100)
    
    return (
      <div className="bg-paper-raised border border-line rounded-[14px] p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center text-forest">
            <HardDrive size={20} />
          </div>
          <div>
            <h3 className="text-[17px] font-bold text-ink m-0">Storage Usage</h3>
            <p className="text-[13.5px] text-ink-soft m-0 mt-0.5">Track your document and report storage</p>
          </div>
        </div>
        
        <div className="mb-2 flex justify-between items-end text-[13.5px]">
          <span className="font-semibold text-ink">{usedStr} used</span>
          <span className="text-ink-soft">{totalStr} total</span>
        </div>
        <div className="w-full bg-line rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-forest h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        
        {!isUnlimited && percentage > 90 && (
          <div className="mt-4 bg-amber-soft text-amber px-3 py-2 rounded-[7px] text-[13px] font-medium flex items-center gap-2">
            <span className="font-bold">!</span> You are running out of storage. Consider upgrading your plan or buying a Document Storage add-on.
          </div>
        )}
      </div>
    )
  }

  const vaults = [
    { id: "ALL", label: "All Documents", icon: FolderOpen },
    { id: "LAB_REPORT", label: "Lab Reports", icon: FileText },
    { id: "XRAY", label: "X-Rays", icon: ImageIcon },
    { id: "PRESCRIPTION", label: "Scanned Prescriptions", icon: Archive },
  ]

  const filteredDocs = docs.filter(d => 
    (d.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.patient?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / itemsPerPage))
  const paginatedDocs = filteredDocs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="mb-6">
        <h2 className="text-[24px] font-serif font-bold text-ink mb-1">Storage & Vaults</h2>
        <p className="text-[14.5px] text-ink-soft m-0">Manage patient documents, lab reports, and x-rays.</p>
      </div>

      {renderProgressBar()}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <div className="flex flex-wrap gap-2 pb-2 sm:pb-0">
          {vaults.map(v => (
            <button
              key={v.id}
              onClick={() => setActiveVault(v.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-[7px] text-[13.5px] font-medium transition-colors whitespace-nowrap border
                ${activeVault === v.id ? "bg-forest text-white border-forest" : "bg-paper-raised text-ink-soft border-line hover:text-ink hover:border-ink/20"}
              `}
            >
              <v.icon size={14} />
              {v.label}
            </button>
          ))}
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search files..." 
            value={searchTerm} 
            onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1)}}
            className="cw-input !pl-9 w-full sm:w-64 !m-0 !py-2 !h-auto"
          />
        </div>
      </div>

      <div className="bg-paper-raised border border-line rounded-[14px] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-ink-soft text-[13.5px]">Loading documents...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center">
            <FolderOpen size={32} className="mx-auto text-moss opacity-50 mb-3" />
            <div className="text-[14.5px] font-medium text-ink">No documents found</div>
            <div className="text-[13px] text-ink-soft mt-1">Try adjusting your search or filters.</div>
          </div>
        ) : (
          <table className="w-full text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-paper/50">
                <th className="font-semibold text-ink-soft px-4 py-3">Document Name</th>
                <th className="font-semibold text-ink-soft px-4 py-3">Patient</th>
                <th className="font-semibold text-ink-soft px-4 py-3">Size</th>
                <th className="font-semibold text-ink-soft px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {paginatedDocs.map(doc => (
                <tr key={doc.id} className="hover:bg-paper/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-ink flex items-center gap-2">
                    <FileText size={14} className="text-moss" />
                    {doc.name}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{doc.patient?.name}</td>
                  <td className="px-4 py-3 text-ink-soft">{(doc.sizeBytes / 1024 / 1024).toFixed(2)} MB</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <a href={doc.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12.5px] font-medium bg-paper border border-line text-ink hover:bg-paper-raised transition-colors">
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filteredDocs.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 text-[13.5px] text-ink-soft gap-4">
          <div>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredDocs.length)} of {filteredDocs.length} entries</div>
          <div className="flex items-center gap-2">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1.5 border border-line rounded bg-white hover:bg-paper-raised disabled:opacity-50 text-ink transition-colors font-medium">Previous</button>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1.5 border border-line rounded bg-white hover:bg-paper-raised disabled:opacity-50 text-ink transition-colors font-medium">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
