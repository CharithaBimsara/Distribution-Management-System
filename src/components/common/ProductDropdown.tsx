import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Package } from 'lucide-react';
import type { Product } from '../../types/product.types';

export interface ProductDropdownProps {
  rowId: string;
  value: string;
  products: Product[];
  selectedProductIds: Set<string>;
  currentProductId?: string;
  onSelect: (product: Product) => void;
  onChange: (value: string) => void;
}

export default function ProductDropdown({
  rowId,
  value,
  products,
  selectedProductIds,
  currentProductId,
  onSelect,
  onChange,
}: ProductDropdownProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [dropUp, setDropUp] = useState(false);
  const [floatingStyle, setFloatingStyle] = useState<CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [visibleCount, setVisibleCount] = useState(60);

  useEffect(() => {
    setVisibleCount(60);
  }, [value, products.length, currentProductId]);

  // Auto-resize textarea based on content length
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [value]);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const base = products.filter(
      (p) => !selectedProductIds.has(p.id) || p.id === currentProductId
    );
    if (!q) return base;
    return base
      .filter((p) => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q))
      .sort((a, b) => {
        const aS = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bS = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        return aS - bS || a.name.localeCompare(b.name);
      });
  }, [products, value, selectedProductIds, currentProductId]);

  const visibleItems = filtered.slice(0, visibleCount);

  const updatePosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const buffer = 12;
    const dropdownMaxHeight = 320;
    const availableBelow = window.innerHeight - rect.bottom - buffer;
    const availableAbove = rect.top - buffer;

    const shouldDropUp = availableBelow < 220 && availableAbove > availableBelow;
    setDropUp(shouldDropUp);

    const top = shouldDropUp ? rect.top - (dropdownMaxHeight <= availableAbove ? dropdownMaxHeight : availableAbove) : rect.bottom + 8;
    const maxHeight = shouldDropUp ? Math.min(dropdownMaxHeight, availableAbove) : Math.min(dropdownMaxHeight, availableBelow);

    setFloatingStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      top: shouldDropUp ? undefined : top,
      bottom: shouldDropUp ? window.innerHeight - rect.top + 8 : undefined,
      maxHeight,
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[highlighted] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlighted]) { onSelect(filtered[highlighted]); setOpen(false); }
    } else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className={`relative flex items-center bg-transparent rounded-xl transition-all ${open ? 'ring-2 ring-orange-500/20 bg-white' : 'hover:bg-slate-50'}`}>
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          placeholder="Search product..."
          onChange={e => { onChange(e.target.value); setOpen(true); setHighlighted(0); }}
          onFocus={() => { setOpen(true); setHighlighted(0); }}
          onKeyDown={handleKeyDown}
          className="w-full pl-3 pr-8 py-2.5 text-sm font-bold text-slate-800 bg-transparent border-transparent focus:outline-none focus:ring-0 focus:border-transparent resize-none overflow-hidden placeholder-slate-400 break-words"
          style={{ minHeight: '40px' }}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => { setOpen(o => !o); inputRef.current?.focus(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180 text-orange-500' : ''}`} />
        </button>
      </div>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="w-full max-w-full rounded-2xl overflow-hidden overflow-x-hidden bg-white border border-slate-200 animate-fade-in"
          style={{
            ...floatingStyle,
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)',
          }}
        >
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Select Product</span>
            <span className="text-[10px] text-slate-400 font-bold bg-white px-2 py-0.5 rounded-full border border-slate-200">{filtered.length} found</span>
          </div>

          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Package className="w-8 h-8 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-700 font-bold">No products found</p>
              <p className="text-xs text-slate-500 mt-1">Try a different keyword</p>
            </div>
          ) : (
            <ul
              ref={listRef}
              className="max-h-60 overflow-y-auto overflow-x-hidden overscroll-contain"
              style={{ scrollbarWidth: 'thin' }}
              onScroll={(e) => {
                const t = e.target as HTMLElement;
                if (t.scrollHeight - t.scrollTop - t.clientHeight < 36 && visibleCount < filtered.length) {
                  setVisibleCount(prev => Math.min(prev + 50, filtered.length));
                }
              }}
            >
              {visibleItems.map((p, i) => (
                <li
                  key={p.id}
                  onMouseDown={e => { e.preventDefault(); onSelect(p); setOpen(false); }}
                  onMouseEnter={() => setHighlighted(i)}
                  className={`px-4 py-3 cursor-pointer border-b border-slate-50 last:border-b-0 transition-all duration-100 ${
                    i === highlighted
                      ? 'bg-orange-50/50 border-l-[3px] border-l-orange-500'
                      : 'border-l-[3px] border-l-transparent hover:bg-slate-50'
                  }`}
                >
                  <p className={`text-sm font-bold leading-snug break-words ${i === highlighted ? 'text-orange-900' : 'text-slate-800'}`} style={{ whiteSpace: 'normal' }}>
                    {p.name}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><span>↑↓</span> Navigate</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><span>↵</span> Select</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><span>ESC</span> Close</span>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
