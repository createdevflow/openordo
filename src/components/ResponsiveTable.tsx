import React, { useState } from 'react';
import { MoreVertical } from 'lucide-react';

export function ResponsiveTable({
  table,
  cards,
}: {
  table: React.ReactNode;
  cards: React.ReactNode;
}) {
  return (
    <>
      <div className="hidden md:block cw-table-wrap" style={{ overflowX: "auto" }}>
        {table}
      </div>
      <div className="md:hidden flex flex-col gap-3">
        {cards}
      </div>
    </>
  );
}

export function CardKebab({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button className="p-2 -mr-2 text-ink-soft hover:text-ink" onClick={() => setOpen(!open)}>
        <MoreVertical size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-line shadow-lg rounded-md z-50 py-1 flex flex-col gap-1" onClick={() => setOpen(false)}>
            {children}
          </div>
        </>
      )}
    </div>
  );
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (p: number) => void;
}) {
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);
  
  if (totalItems === 0) return null;
  
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-4 text-[13.5px] text-ink-soft gap-4 p-4 border-t border-line">
      <div className="w-full sm:w-auto text-center sm:text-left">
        Showing {start} to {end} of {totalItems} entries
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
        <button disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} className="px-3 py-1.5 border border-line rounded bg-white hover:bg-paper-raised disabled:opacity-50 text-ink transition-colors font-medium flex-1 sm:flex-none text-center">Previous</button>
        <button disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} className="px-3 py-1.5 border border-line rounded bg-white hover:bg-paper-raised disabled:opacity-50 text-ink transition-colors font-medium flex-1 sm:flex-none text-center">Next</button>
      </div>
    </div>
  );
}
