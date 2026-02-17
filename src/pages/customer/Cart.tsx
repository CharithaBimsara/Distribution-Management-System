import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState, useRef } from 'react';
import type { RootState } from '../../store/store';
import { updateQuantity, removeFromCart, clearCart, updateItemSnapshot } from '../../store/slices/cartSlice';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight, ShoppingBag, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '../../services/api/productsApi';
import QuantityModal from '../../components/common/QuantityModal';

export default function CustomerCart() {
  const { items } = useSelector((state: RootState) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [qtyModalOpen, setQtyModalOpen] = useState(false);
  const [qtyModalProductId, setQtyModalProductId] = useState<string | null>(null);
  const [qtyModalValue, setQtyModalValue] = useState(1);
  const pressTimers = useRef<Record<string, number | null>>({});
  const pressTriggered = useRef<Record<string, boolean>>({});

  const QuantityEditor = ({ productId, qty, maxAllowed, onSave }: { productId: string; qty: number; maxAllowed?: number; onSave: (q: number) => void }) => {
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
      <button onClick={() => setEditingProductId(productId)} className="text-sm font-bold w-8 text-center text-slate-900">{qty}</button>
    );
  };

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const openQtyModalForItem = (itemId: string, qty: number, max?: number) => {
    setQtyModalProductId(itemId);
    setQtyModalValue(qty);
    setQtyModalOpen(true);
  };

  const startPressForItem = (id: string, itemQty: number, max?: number) => {
    pressTimers.current[id] = window.setTimeout(() => {
      pressTriggered.current[id] = true;
      openQtyModalForItem(id, itemQty, max);
    }, 600);
  };

  const cancelPressForItem = (id: string) => {
    const t = pressTimers.current[id];
    if (t) { clearTimeout(t); pressTimers.current[id] = null; }
    pressTriggered.current[id] = false;
  };

  const handlePlusMouseUpForItem = (id: string, itemQty: number, addFn: () => void) => {
    const triggered = !!pressTriggered.current[id];
    cancelPressForItem(id);
    if (triggered) { pressTriggered.current[id] = false; return; }
    addFn();
  };

  const handleQtyModalConfirm = (value: number) => {
    if (!qtyModalProductId) { setQtyModalOpen(false); return; }
    dispatch(updateQuantity({ productId: qtyModalProductId, quantity: value }));
    setQtyModalOpen(false);
  };

  // Refresh cart snapshots on mount to ensure UI enforces current server rules (stock / backorder)
  useEffect(() => {
    if (!items.length) return;
    (async () => {
      try {
        await Promise.all(items.map(async (it) => {
          try {
            const res = await productsApi.customerGetById(it.productId);
            const p = res.data.data;
            dispatch(updateItemSnapshot({
              productId: it.productId,
              stockQuantity: p.stockQuantity,
              allowBackorder: !!p.allowBackorder,
              backorderLeadTimeDays: p.backorderLeadTimeDays ?? null,
              backorderLimit: p.backorderLimit ?? null,
            }));
            // if quantity was clamped by the snapshot reducer, notify user
            const updatedQty = (document.querySelector(`[data-cart-qty-${it.productId}]`) as HTMLElement | null)?.innerText;
            // (we cannot reliably read updated state synchronously here, so show a generic toast when snapshot differs)
          } catch (err) {
            // ignore per-item failures
          }
        }));
      } catch (err) {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[70vh] px-6">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-rose-100 rounded-3xl flex items-center justify-center mb-5">
          <ShoppingCart className="w-9 h-9 text-orange-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Your cart is empty</h2>
        <p className="text-sm text-slate-400 mb-6 text-center">Browse our products and add items to get started</p>
        <button
          onClick={() => navigate('/shop/products')}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-orange-500/25 hover:shadow-xl active:scale-95 transition-all flex items-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" /> Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-32">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cart</h1>
          <p className="text-xs text-slate-400 mt-0.5">{items.length} item{items.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => dispatch(clearCart())}
          className="text-xs text-red-500 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
        >
          Clear All
        </button>
      </div>

      {/* Cart Items */}
      <div className="px-4 space-y-3">
        {items.map((item) => (
          <div key={item.productId} className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-100 p-4">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-slate-50 to-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 text-slate-200" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.productName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.unit} &bull; {formatCurrency(item.unitPrice)} each</p>
                  </div>
                  <button
                    onClick={() => dispatch(removeFromCart(item.productId))}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-0.5 bg-slate-50 rounded-xl p-0.5">
                    <button
                      onClick={() => dispatch(updateQuantity({ productId: item.productId, quantity: item.quantity - 1 }))}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm transition active:scale-90"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <QuantityEditor
                      productId={item.productId}
                      qty={item.quantity}
                      maxAllowed={typeof item.backorderLimit === 'number' ? item.backorderLimit : (!item.allowBackorder ? item.stockQuantity : undefined)}
                      onSave={(q) => dispatch(updateQuantity({ productId: item.productId, quantity: q }))}
                    />

                    <button
                      onMouseDown={() => startPressForItem(item.productId, item.quantity, typeof item.backorderLimit === 'number' ? item.backorderLimit : undefined)}
                      onMouseUp={() => handlePlusMouseUpForItem(item.productId, item.quantity, () => {
                        if (typeof item.backorderLimit === 'number' && item.quantity >= item.backorderLimit) {
                          toast.error(`Maximum allowed quantity is ${item.backorderLimit}`);
                          return;
                        }
                        if (!item.allowBackorder && typeof item.stockQuantity === 'number' && item.quantity >= item.stockQuantity) {
                          toast.error(`Only ${item.stockQuantity} left in stock`);
                          return;
                        }
                        dispatch(updateQuantity({ productId: item.productId, quantity: item.quantity + 1 }));
                      })}
                      onMouseLeave={() => cancelPressForItem(item.productId)}
                      onTouchStart={() => startPressForItem(item.productId, item.quantity, typeof item.backorderLimit === 'number' ? item.backorderLimit : undefined)}
                      onTouchEnd={() => handlePlusMouseUpForItem(item.productId, item.quantity, () => dispatch(updateQuantity({ productId: item.productId, quantity: item.quantity + 1 })))}
                      className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center text-white shadow-sm shadow-orange-500/20 hover:shadow-md transition active:scale-90"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(item.unitPrice * item.quantity)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="px-4 mt-5">
        <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-100 p-5 space-y-3">
          <h3 className="font-semibold text-slate-900 text-sm">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Subtotal ({items.length} items)</span><span className="text-slate-700">{formatCurrency(total)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Tax (est.)</span><span className="text-slate-700">{formatCurrency(total * 0.08)}</span></div>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <div className="flex justify-between font-bold text-base"><span className="text-slate-900">Total</span><span className="text-orange-600">{formatCurrency(total * 1.08)}</span></div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Checkout */}
      <div className="fixed bottom-14 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 p-4 z-40 pb-safe">
        <button
          onClick={() => navigate('/shop/checkout')}
          className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-xl active:scale-[0.98] transition-all"
        >
          Checkout &bull; {formatCurrency(total * 1.08)} <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <QuantityModal
        open={qtyModalOpen}
        initial={qtyModalValue}
        min={1}
        max={undefined}
        description={qtyModalProductId ? `Edit quantity` : undefined}
        onConfirm={handleQtyModalConfirm}
        onCancel={() => setQtyModalOpen(false)}
      />
    </div>
  );
}
