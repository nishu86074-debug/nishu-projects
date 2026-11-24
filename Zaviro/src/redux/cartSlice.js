import { createSlice } from "@reduxjs/toolkit";

const getInitialCart = () => {
  try {
    const savedCart = localStorage.getItem("zaviroCart");

    return savedCart ? JSON.parse(savedCart) : [];
  } catch (error) {
    console.error("Error loading cart:", error);
    return [];
  }
};

const initialState = {
  items: getInitialCart(),
};

const cartSlice = createSlice({
  name: "cart",

  initialState,

  reducers: {
    // Add product to cart
    addToCart: (state, action) => {
      const { product, quantity = 1 } = action.payload;

      const existingItem = state.items.find(
        (item) => String(item.id) === String(product.id)
      );

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;

        // Stock limit
        if (product.stock && newQuantity <= product.stock) {
          existingItem.quantity = newQuantity;
        } else if (!product.stock) {
          existingItem.quantity = newQuantity;
        }
      } else {
        state.items.push({
          ...product,
          quantity,
        });
      }

      localStorage.setItem(
        "zaviroCart",
        JSON.stringify(state.items)
      );
    },

    // Remove product from cart
    removeFromCart: (state, action) => {
      state.items = state.items.filter(
        (item) => String(item.id) !== String(action.payload)
      );

      localStorage.setItem(
        "zaviroCart",
        JSON.stringify(state.items)
      );
    },

    // Update product quantity
    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;

      const item = state.items.find(
        (item) => String(item.id) === String(id)
      );

      if (item) {
        const maxStock = item.stock || Infinity;

        item.quantity = Math.min(
          Math.max(quantity, 1),
          maxStock
        );
      }

      localStorage.setItem(
        "zaviroCart",
        JSON.stringify(state.items)
      );
    },

    // Clear complete cart
    clearCart: (state) => {
      state.items = [];

      localStorage.removeItem("zaviroCart");
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;