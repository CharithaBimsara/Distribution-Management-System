import { createPortal } from 'react-dom';
import { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { RootState } from '../../store/store';
import { updateQuantity, removeFromCart, clearCart } from '../../store/slices/cartSlice';
import { formatCurrency } from '../../utils/formatters';
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import QuantityModal from '../common/QuantityModal';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items } = useSelector((state: RootState) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const QuantityCell = ({ productId, qty, maxAllowed, onSave }: { productId: string; qty: number; maxAllowed?: number; onSave: (q: number) => void }) => {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(String(qty));
    useEffect(() => setValue(String(qty)), [qty]);
    useEffect(() => { if (editingProductId === productId) setEditing(true); else setEditing(false); }, [editingProductId, productId]);
    const save = () => {
      let n = Math.max(1, Math.floor(Number(value) || 1));
      if (typeof maxAllowed === 'number' && n > maxAllowed) n = maxAllowed;
      onSave(n);
      setEditing(false); setEditingProductId(null);
    };
    return editing ? (
      <input
        autoFocus
        inputMode="numeric"
        type="number"
        min={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setEditingProductId(null); setValue(String(qty)); } }}
        className="w-12 text-sm font-bold text-center border border-slate-200 rounded-md px-1"
      />
    ) : (
      <button onClick={() => setEditingProductId(productId)} className="text-sm font-bold w-6 text-center text-slate-900">{qty}</button>
    );
  };

  const [qtyModalOpen, setQtyModalOpen] = useState(false);
  const [qtyModalProductId, setQtyModalProductId] = useState<string | null>(null);
  const [qtyModalValue, setQtyModalValue] = useState(1);
  const pressTimersRef = useRef<Record<string, number | null>>({});
  const pressTriggeredRef = useRef<Record<string, boolean>>({});

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  const openQtyModalForItem = (id: string, qty: number) => {
    setQtyModalProductId(id);
    setQtyModalValue(qty);
    setQtyModalOpen(true);
  };

  const startPress = (id: string, qty: number) => {
    pressTimersRef.current[id] = window.setTimeout(() => {
      pressTriggeredRef.current[id] = true;
      openQtyModalForItem(id, qty);
    }, 600);
  };

  const cancelPress = (id: string) => {
    const t = pressTimersRef.current[id];
    if (t) { clearTimeout(t); pressTimersRef.current[id] = null; }
    pressTriggeredRef.current[id] = false;
  };

  const handlePlusMouseUp = (id: string, qty: number, addFn: () => void) => {
    const triggered = !!pressTriggeredRef.current[id];
    cancelPress(id);
    if (triggered) { pressTriggeredRef.current[id] = false; return; }
    addFn();
  };

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-[70]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* ── Desktop: right slide panel ── */}
      <div className="hidden md:flex absolute right-0 top-0 bottom-0 w-full max-w-md flex-col bg-white shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Your Cart</h3>
            <p className="text-xs text-slate-400">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={() => dispatch(clearCart())}
                className="text-[11px] text-red-500 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-sm font-semibold text-slate-500">Cart is empty</p>
              <p className="text-xs text-slate-400 mt-1">Start adding products from the list</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{item.productName}</p>
                  <p className="text-[11px] text-slate-400">{item.unit} &bull; {formatCurrency(item.unitPrice)}</p>
                  {item.allowBackorder && item.quantity > (item.stockQuantity ?? 0) && (
                    <div className="text-[11px] text-amber-600 mt-1">Backordered • ETA {item.backorderLeadTimeDays ?? 'TBD'} days</div>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5">
                  <button
                    onClick={() => dispatch(updateQuantity({ productId: item.productId, quantity: item.quantity - 1 }))}
                    className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-md transition active:scale-90"
                  >
                    <Minus className="w-3 h-3" />
                  </button>

                  <QuantityCell
                    productId={item.productId}
                    qty={item.quantity}
                    maxAllowed={typeof item.backorderLimit === 'number' ? item.backorderLimit : (item.allowBackorder ? undefined : item.stockQuantity)}
                    onSave={(q) => dispatch(updateQuantity({ productId: item.productId, quantity: q }))}
                  />

                  <button
                    onMouseDown={() => startPress(item.productId, item.quantity)}
                    onMouseUp={() => handlePlusMouseUp(item.productId, item.quantity, () => {
                      const maxAllowed = typeof item.backorderLimit === 'number'
                        ? item.backorderLimit
                        : (item.allowBackorder ? undefined : item.stockQuantity);

                      if (typeof maxAllowed === 'number' && item.quantity >= maxAllowed) {
                        toast.error(`Maximum allowed quantity is ${maxAllowed}`);
                        return;
                      }

                      if (!item.allowBackorder && typeof item.stockQuantity === 'number' && item.quantity >= item.stockQuantity) {
                        toast.error(`Only ${item.stockQuantity} left in stock`);
                        return;
                      }

                      dispatch(updateQuantity({ productId: item.productId, quantity: item.quantity + 1 }));
                    })}
                    onMouseLeave={() => cancelPress(item.productId)}
                    onTouchStart={() => startPress(item.productId, item.quantity)}
                    onTouchEnd={() => handlePlusMouseUp(item.productId, item.quantity, () => dispatch(updateQuantity({ productId: item.productId, quantity: item.quantity + 1 })))}
                    className="w-7 h-7 flex items-center justify-center text-white bg-orange-500 rounded-md hover:bg-orange-600 transition active:scale-90"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-right flex-shrink-0 w-20">
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(item.unitPrice * item.quantity)}</p>
                </div>
                <button
                  onClick={() => dispatch(removeFromCart(item.productId))}
                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-slate-100 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-bold text-slate-900">{formatCurrency(total)}</span>
            </div>
            <button
              onClick={() => { onClose(); navigate('/shop/cart'); }}
              className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-xl active:scale-[0.98] transition-all text-sm"
            >
              Checkout &bull; {formatCurrency(total)} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Mobile: bottom sheet ── */}
      <div className="md:hidden absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Your Cart</h3>
            <p className="text-xs text-slate-400">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={() => dispatch(clearCart())}
                className="text-[11px] text-red-500 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingBag className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-sm font-semibold text-slate-500">Cart is empty</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{item.productName}</p>
                  <p className="text-[11px] text-slate-400">{item.unit} &bull; {formatCurrency(item.unitPrice)}</p>
                </div>
                <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5">
                  <button
                    onClick={() => dispatch(updateQuantity({ productId: item.productId, quantity: item.quantity - 1 }))}
                    className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-md transition active:scale-90"
                  >
                    <Minus className="w-3 h-3" />
                  </button>

                  <QuantityCell
                    productId={item.productId}
                    qty={item.quantity}
                    maxAllowed={typeof item.backorderLimit === 'number' ? item.backorderLimit : (item.allowBackorder ? undefined : item.stockQuantity)}
                    onSave={(q) => dispatch(updateQuantity({ productId: item.productId, quantity: q }))}
                  />

                  <button
                    onMouseDown={() => startPress(item.productId, item.quantity)}
                    onMouseUp={() => handlePlusMouseUp(item.productId, item.quantity, () => {
                      const maxAllowed = typeof item.backorderLimit === 'number'
                        ? item.backorderLimit
                        : (item.allowBackorder ? undefined : item.stockQuantity);

                      if (typeof maxAllowed === 'number' && item.quantity >= maxAllowed) {
                        toast.error(`Maximum allowed quantity is ${maxAllowed}`);
                        return;
                      }

                      if (!item.allowBackorder && typeof item.stockQuantity === 'number' && item.quantity >= item.stockQuantity) {
                        toast.error(`Only ${item.stockQuantity} left in stock`);
                        return;
                      }

                      dispatch(updateQuantity({ productId: item.productId, quantity: item.quantity + 1 }));
                    })}
                    onMouseLeave={() => cancelPress(item.productId)}
                    onTouchStart={() => startPress(item.productId, item.quantity)}
                    onTouchEnd={() => handlePlusMouseUp(item.productId, item.quantity, () => dispatch(updateQuantity({ productId: item.productId, quantity: item.quantity + 1 })))}
                    className="w-7 h-7 flex items-center justify-center text-white bg-orange-500 rounded-md hover:bg-orange-600 transition active:scale-90"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <button
                  onClick={() => dispatch(removeFromCart(item.productId))}
                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-slate-100 p-4 pb-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-bold text-slate-900">{formatCurrency(total)}</span>
            </div>
            <button
              onClick={() => { onClose(); navigate('/shop/cart'); }}
              className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all text-sm"
            >
              Checkout &bull; {formatCurrency(total)} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <QuantityModal
          open={qtyModalOpen}
          initial={qtyModalValue}
          min={1}
          max={undefined}
          description={qtyModalProductId ? 'Edit quantity' : undefined}
          onConfirm={(v) => { if (qtyModalProductId) dispatch(updateQuantity({ productId: qtyModalProductId, quantity: v })); setQtyModalOpen(false); }}
          onCancel={() => setQtyModalOpen(false)}
        />
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
