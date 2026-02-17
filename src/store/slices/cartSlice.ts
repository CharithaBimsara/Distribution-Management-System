import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  unit: string;
  imageUrl?: string;
  // optional snapshot of stock when item was added — used to prevent over-adding in UI
  stockQuantity?: number;
  // backorder snapshot (copied from product at add-to-cart time)
  allowBackorder?: boolean;
  backorderLeadTimeDays?: number;
  backorderLimit?: number;
}

interface CartState {
  items: CartItem[];
  customerId: string | null;
}

const saved = localStorage.getItem('cart');
const initialState: CartState = saved ? JSON.parse(saved) : { items: [], customerId: null };

const persist = (state: CartState) => localStorage.setItem('cart', JSON.stringify(state));

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCartCustomer(state, action: PayloadAction<string>) {
      state.customerId = action.payload;
      persist(state);
    },
    addToCart(state, action: PayloadAction<CartItem>) {
      const existing = state.items.find(i => i.productId === action.payload.productId);
      if (existing) {
        existing.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
      persist(state);
    },
    updateQuantity(state, action: PayloadAction<{ productId: string; quantity: number }>) {
      const item = state.items.find(i => i.productId === action.payload.productId);
      if (item) {
        const requested = action.payload.quantity;

        // determine maximum allowed for this cart item (product-level backorderLimit if set,
        // otherwise if backorder not allowed enforce stockQuantity)
        let maxAllowed: number | undefined = undefined;
        if (typeof item.backorderLimit === 'number') maxAllowed = item.backorderLimit;
        else if (!item.allowBackorder && typeof item.stockQuantity === 'number') maxAllowed = item.stockQuantity;

        if (typeof maxAllowed === 'number' && requested > maxAllowed) {
          // clamp silently to maxAllowed to keep state consistent (UI also prevents exceed)
          item.quantity = maxAllowed;
        } else {
          item.quantity = requested;
        }

        if (item.quantity <= 0) {
          state.items = state.items.filter(i => i.productId !== action.payload.productId);
        }
      }
      persist(state);
    },

    // refresh a cart item's product snapshot (stock / backorder flags) from server
    updateItemSnapshot(state, action: PayloadAction<{ productId: string; stockQuantity?: number; allowBackorder?: boolean; backorderLeadTimeDays?: number | null; backorderLimit?: number | null }>) {
      const item = state.items.find(i => i.productId === action.payload.productId);
      if (!item) return;
      if (typeof action.payload.stockQuantity === 'number') item.stockQuantity = action.payload.stockQuantity;
      if (typeof action.payload.allowBackorder === 'boolean') item.allowBackorder = action.payload.allowBackorder;
      if (typeof action.payload.backorderLeadTimeDays !== 'undefined') item.backorderLeadTimeDays = action.payload.backorderLeadTimeDays ?? undefined;
      if (typeof action.payload.backorderLimit !== 'undefined') item.backorderLimit = action.payload.backorderLimit ?? undefined;
      // ensure quantity still respects latest limits
      let maxAllowed: number | undefined = undefined;
      if (typeof item.backorderLimit === 'number') maxAllowed = item.backorderLimit;
      else if (!item.allowBackorder && typeof item.stockQuantity === 'number') maxAllowed = item.stockQuantity;
      if (typeof maxAllowed === 'number' && item.quantity > maxAllowed) item.quantity = maxAllowed;
      persist(state);
    },
    removeFromCart(state, action: PayloadAction<string>) {
      state.items = state.items.filter(i => i.productId !== action.payload);
      persist(state);
    },
    clearCart(state) {
      state.items = [];
      state.customerId = null;
      localStorage.removeItem('cart');
    },
  },
});

export const { setCartCustomer, addToCart, updateQuantity, updateItemSnapshot, removeFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
