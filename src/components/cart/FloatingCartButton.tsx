import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import type { RootState } from '../../store/store';
import { formatCurrency } from '../../utils/formatters';

export default function FloatingCartButton() {
  const items = useSelector((s: RootState) => s.cart.items);
  const navigate = useNavigate();
  const location = useLocation();
  const [pulse, setPulse] = useState(false);
  const prevCountRef = useRef<number | null>(null);

  // hide floating button on the cart page (and any nested cart route)
  if (location.pathname.startsWith('/shop/cart')) return null;

  const itemCount = items.reduce((s, i) => s + (i.quantity || 0), 0);
  const total = items.reduce((s, i) => s + (i.quantity * i.unitPrice || 0), 0);

  useEffect(() => {
    if (prevCountRef.current === null) {
      prevCountRef.current = itemCount;
      return;
    }
    if (itemCount > (prevCountRef.current || 0)) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 900);
      return () => clearTimeout(t);
    }
    prevCountRef.current = itemCount;
  }, [itemCount]);

  if (!itemCount) return null;

  return (
    <button
      onClick={() => navigate('/shop/cart')}
      aria-label={`Open cart (${itemCount} items)`}
      className={`fixed right-4 bottom-24 lg:bottom-8 z-50 animate-fade-in-scale shadow-2xl ${pulse ? 'ring-pulse' : ''}`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Mobile / small: large pill */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-orange-600 to-rose-600 text-white rounded-full px-4 py-3 md:hidden shadow-2xl ring-1 ring-orange-300/20 backdrop-blur-sm">
        <div className={`${pulse ? 'animate-pop' : ''}`}>
          <ShoppingCart className="w-5 h-5" />
        </div>
        <div className="text-sm font-semibold">View cart</div>
        <div className={`ml-2 bg-white/95 text-orange-600 px-2 py-0.5 rounded-full text-[12px] font-semibold ${pulse ? 'badge-bounce' : ''}`}>{itemCount}</div>
        <div className="ml-2 text-sm font-bold">{formatCurrency(total)}</div>
      </div>

      {/* Desktop: compact floating circle with badge */}
      <div className="hidden md:flex items-center gap-3 bg-white rounded-full px-3 py-2 border border-slate-200 shadow-2xl hover:scale-105 transition-transform ring-1 ring-slate-100/60">
        <div className="relative">
          <div className={`w-11 h-11 rounded-full bg-gradient-to-br from-orange-600 to-rose-600 flex items-center justify-center text-white shadow-2xl ${pulse ? 'animate-pop' : ''}`}>
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div className={`absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-semibold rounded-full min-w-[18px] h-5 flex items-center justify-center px-1.5 shadow-sm ${pulse ? 'badge-bounce' : ''}`}>{itemCount}</div>
        </div>
        <div className="hidden lg:flex flex-col items-start">
          <div className="text-xs text-slate-500">Cart total</div>
          <div className="text-sm font-bold text-slate-900">{formatCurrency(total)}</div>
        </div>
      </div>
    </button>
  );
}
