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
      <button className="p-2 -mr-2 text-ink-soft hover:text-ink cursor-pointer" onClick={() => setOpen(!open)}>
        <MoreVertical size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 min-w-[140px] w-max max-w-[220px] bg-white border border-line shadow-lg rounded-md z-50 py-1 flex flex-col gap-1" onClick={() => setOpen(false)}>
            {children}
          </div>
        </>
      )}
    </div>
  );
}

function getPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
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

  const pageNumbers = getPageNumbers(currentPage, totalPages);
  
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center text-[13.5px] text-ink-soft gap-4 p-4 border-t border-line bg-paper-raised rounded-b-[11px]">
      <div className="w-full sm:w-auto text-center sm:text-left">
        Showing {start} to {end} of {totalItems} entries
      </div>
      <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center sm:justify-end flex-wrap">
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-3 py-1.5 border border-line rounded-md bg-white hover:bg-paper-raised disabled:opacity-40 disabled:hover:bg-white text-ink transition-colors font-medium text-xs sm:text-[13px] disabled:cursor-not-allowed cursor-pointer"
        >
          Previous
        </button>

        {pageNumbers.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-ink-soft select-none text-xs sm:text-[13px]">
                ...
              </span>
            );
          }
          const isCurrent = p === currentPage;
          return (
            <button
              key={`page-${p}`}
              onClick={() => onPageChange(p as number)}
              className={`min-w-[32px] h-8 px-2 flex items-center justify-center rounded-md border text-xs sm:text-[13px] font-medium transition-colors cursor-pointer ${
                isCurrent
                  ? 'bg-forest text-white border-forest shadow-xs font-semibold'
                  : 'bg-white hover:bg-paper-raised text-ink border-line'
              }`}
            >
              {p}
            </button>
          );
        })}

        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-3 py-1.5 border border-line rounded-md bg-white hover:bg-paper-raised disabled:opacity-40 disabled:hover:bg-white text-ink transition-colors font-medium text-xs sm:text-[13px] disabled:cursor-not-allowed cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  );
}
