import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  ArrowLeft,
  ShoppingBag,
} from "lucide-react";

import {
  removeFromCart,
  updateQuantity,
  clearCart,
} from "../redux/cartSlice";

function Cart() {
  const dispatch = useDispatch();

  const cartItems = useSelector((state) => state.cart.items);

  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const tax = subtotal * 0.18;
  const shipping = subtotal === 0 ? 0 : subtotal >= 100 ? 0 : 10;
  const total = subtotal + tax + shipping;

  const increaseQuantity = (item) => {
    if (item.quantity < item.stock) {
      dispatch(
        updateQuantity({
          id: item.id,
          quantity: item.quantity + 1,
        })
      );
    }
  };

  const decreaseQuantity = (item) => {
    if (item.quantity > 1) {
      dispatch(
        updateQuantity({
          id: item.id,
          quantity: item.quantity - 1,
        })
      );
    }
  };

  const handleRemove = (item) => {
    dispatch(removeFromCart(item.id));
    toast.success(`${item.title} removed from cart`);
  };

  const handleClearCart = () => {
    dispatch(clearCart());
    toast.success("Cart cleared successfully");
  };

  if (cartItems.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-orange-100 text-orange-500">
            <ShoppingCart size={55} />
          </div>

          <h1 className="mt-6 text-3xl font-bold text-gray-900">
            Your Cart is Empty
          </h1>

          <p className="mt-3 text-gray-500">
            Looks like you haven't added anything to your cart yet.
          </p>

          <Link
            to="/products"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-7 py-3 font-bold text-white hover:bg-orange-600"
          >
            <ShoppingBag size={20} />
            Start Shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-orange-500"
            >
              <ArrowLeft size={18} />
              Continue Shopping
            </Link>

            <h1 className="mt-3 text-3xl font-bold text-gray-900">
              Shopping Cart
            </h1>

            <p className="mt-1 text-gray-500">
              {cartItems.length} product
              {cartItems.length !== 1 ? "s" : ""} in your cart
            </p>
          </div>

          <button
            onClick={handleClearCart}
            className="rounded-lg border border-red-200 px-4 py-2 font-semibold text-red-500 hover:bg-red-50"
          >
            Clear Cart
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <section className="space-y-5">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-5 rounded-2xl bg-white p-5 shadow-sm sm:flex-row"
              >
                <div className="h-32 w-full overflow-hidden rounded-xl bg-gray-100 sm:w-32">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="h-full w-full object-contain p-2"
                  />
                </div>

                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <p className="text-sm capitalize text-orange-500">
                      {item.category?.replace(/-/g, " ")}
                    </p>

                    <h2 className="mt-1 text-lg font-bold text-gray-900">
                      {item.title}
                    </h2>

                    <p className="mt-2 text-xl font-bold text-gray-900">
                      ${item.price}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center overflow-hidden rounded-lg border border-gray-300">
                      <button
                        onClick={() => decreaseQuantity(item)}
                        className="p-2.5 hover:bg-gray-100"
                      >
                        <Minus size={18} />
                      </button>

                      <span className="min-w-10 text-center font-bold">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => increaseQuantity(item)}
                        className="p-2.5 hover:bg-gray-100"
                      >
                        <Plus size={18} />
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemove(item)}
                      className="flex items-center gap-2 font-semibold text-red-500 hover:text-red-600"
                    >
                      <Trash2 size={19} />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <aside className="h-fit rounded-2xl bg-white p-6 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-xl font-bold text-gray-900">
              Order Summary
            </h2>

            <div className="mt-6 space-y-4 border-b pb-5">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Tax (18%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>

                <span
                  className={
                    shipping === 0
                      ? "font-semibold text-green-600"
                      : ""
                  }
                >
                  {shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <span className="text-lg font-bold text-gray-900">
                Total
              </span>

              <span className="text-2xl font-extrabold text-orange-500">
                ${total.toFixed(2)}
              </span>
            </div>

            <Link
              to="/checkout"
              className="mt-7 flex w-full items-center justify-center rounded-xl bg-orange-500 py-4 font-bold text-white hover:bg-orange-600"
            >
              Proceed to Checkout
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default Cart;