"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

export function CardKebab({ 
  children,
  direction = "auto"
}: { 
  children: React.ReactNode;
  direction?: "up" | "down" | "auto";
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Smart auto-flip: flip upwards if requested or if there is not enough room below (< 240px) and more space above
    const shouldGoUp = direction === "up" || (direction === "auto" && spaceBelow < 240 && spaceAbove > spaceBelow) || spaceBelow < 180;

    if (shouldGoUp) {
      setMenuPos({
        bottom: Math.max(8, window.innerHeight - rect.top + 4),
        right: Math.max(8, window.innerWidth - rect.right),
      });
    } else {
      setMenuPos({
        top: Math.max(8, rect.bottom + 4),
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open) {
      updatePosition();
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const handleClose = () => setOpen(false);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);
    return () => {
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
    };
  }, [open]);

  return (
    <div className="relative inline-flex items-center" onClick={e => e.stopPropagation()}>
      <button 
        ref={buttonRef}
        type="button"
        className="p-1.5 text-ink-soft hover:text-ink hover:bg-paper-raised rounded-md transition-colors cursor-pointer" 
        onClick={handleToggle} 
        title="Actions"
      >
        <MoreVertical size={16} />
      </button>
      {open && mounted && menuPos && createPortal(
        <>
          <div 
            className="fixed inset-0 z-[9998]" 
            style={{ backgroundColor: "transparent" }}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }} 
          />
          <div 
            style={{
              position: "fixed",
              top: menuPos.top !== undefined ? `${menuPos.top}px` : "auto",
              bottom: menuPos.bottom !== undefined ? `${menuPos.bottom}px` : "auto",
              right: `${menuPos.right}px`,
              zIndex: 9999,
            }}
            className="min-w-[160px] w-max max-w-[240px] bg-white border border-line shadow-xl rounded-md py-1 flex flex-col gap-0.5 text-left" 
            onClick={() => setOpen(false)}
          >
            {children}
          </div>
        </>,
        document.body
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
