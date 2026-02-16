import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  unit: string;
  imageUrl?: string;
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
        item.quantity = action.payload.quantity;
        if (item.quantity <= 0) {
          state.items = state.items.filter(i => i.productId !== action.payload.productId);
        }
      }
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

export const { setCartCustomer, addToCart, updateQuantity, removeFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
