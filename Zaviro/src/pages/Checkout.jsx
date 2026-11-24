import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CreditCard,
  ShoppingBag,
} from "lucide-react";

import { clearCart } from "../redux/cartSlice";

function Checkout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const cartItems = useSelector(
    (state) => state.cart.items
  );

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  // ================= PRICE CALCULATION =================

  const subtotal = cartItems.reduce(
    (total, item) =>
      total + Number(item.price) * Number(item.quantity),
    0
  );

  const tax = subtotal * 0.18;

  const shipping =
    subtotal === 0
      ? 0
      : subtotal >= 100
      ? 0
      : 10;

  const total = subtotal + tax + shipping;

  // ================= HANDLE INPUT =================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ================= PLACE ORDER =================

  const handlePlaceOrder = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!formData.email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    if (!formData.phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    if (!formData.address.trim()) {
      toast.error("Please enter your address");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      navigate("/products");
      return;
    }

    // ================= GET OLD ORDERS =================

    let existingOrders = [];

    try {
      const savedOrders =
        localStorage.getItem("adminOrders");

      existingOrders = savedOrders
        ? JSON.parse(savedOrders)
        : [];
    } catch {
      existingOrders = [];
    }

    // ================= CREATE ORDER =================

    const newOrder = {
      id: `ORD-${Date.now()}`,

      customer: formData.name.trim(),

      email: formData.email.trim(),

      phone: formData.phone.trim(),

      address: formData.address.trim(),

      products: cartItems.map((item) => ({
        id: item.id,
        title: item.title,
        price: Number(item.price),
        quantity: Number(item.quantity),
        thumbnail: item.thumbnail,
      })),

      subtotal: Number(subtotal.toFixed(2)),

      tax: Number(tax.toFixed(2)),

      shipping: Number(shipping.toFixed(2)),

      total: Number(total.toFixed(2)),

      status: "Pending",

      createdAt: new Date().toLocaleString(),
    };

    // ================= SAVE ORDER =================

    const updatedOrders = [
      newOrder,
      ...existingOrders,
    ];

    localStorage.setItem(
      "adminOrders",
      JSON.stringify(updatedOrders)
    );

    // IMPORTANT: Notify Admin Dashboard
    window.dispatchEvent(
      new Event("adminOrdersUpdated")
    );

    // ================= CLEAR CART =================

    dispatch(clearCart());

    toast.success("Order placed successfully!");

    // Go to Admin for testing
    navigate("/admin");
  };

  // ================= EMPTY CART =================

  if (cartItems.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">

          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-orange-100 text-orange-500">
            <ShoppingBag size={55} />
          </div>

          <h1 className="mt-6 text-3xl font-bold text-gray-900">
            Your Cart is Empty
          </h1>

          <p className="mt-3 text-gray-500">
            Add some products before checkout.
          </p>

          <button
            onClick={() => navigate("/products")}
            className="mt-7 rounded-xl bg-orange-500 px-7 py-3 font-bold text-white hover:bg-orange-600"
          >
            Continue Shopping
          </button>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10">

      <div className="mx-auto max-w-7xl px-4">

        {/* BACK */}
        <button
          onClick={() => navigate("/cart")}
          className="mb-6 flex items-center gap-2 font-semibold text-gray-600 hover:text-orange-500"
        >
          <ArrowLeft size={20} />
          Back to Cart
        </button>

        <h1 className="mb-8 text-3xl font-bold text-gray-900">
          Checkout
        </h1>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">

          {/* ================= FORM ================= */}

          <form
            onSubmit={handlePlaceOrder}
            className="rounded-2xl bg-white p-6 shadow-sm"
          >

            <h2 className="text-xl font-bold text-gray-900">
              Shipping Information
            </h2>

            <div className="mt-6 grid gap-5">

              {/* NAME */}
              <div>
                <label className="mb-2 block font-semibold">
                  Full Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
                />
              </div>

              {/* EMAIL */}
              <div>
                <label className="mb-2 block font-semibold">
                  Email Address
                </label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
                />
              </div>

              {/* PHONE */}
              <div>
                <label className="mb-2 block font-semibold">
                  Phone Number
                </label>

                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
                />
              </div>

              {/* ADDRESS */}
              <div>
                <label className="mb-2 block font-semibold">
                  Delivery Address
                </label>

                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter your complete address"
                  rows="4"
                  className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
                />
              </div>

              {/* PLACE ORDER */}
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-4 font-bold text-white transition hover:bg-orange-600"
              >
                <CreditCard size={20} />
                Place Order
              </button>

            </div>
          </form>

          {/* ================= ORDER SUMMARY ================= */}

          <aside className="h-fit rounded-2xl bg-white p-6 shadow-sm lg:sticky lg:top-24">

            <h2 className="text-xl font-bold text-gray-900">
              Order Summary
            </h2>

            {/* PRODUCTS */}

            <div className="mt-6 max-h-[400px] space-y-4 overflow-y-auto border-b pb-5">

              {cartItems.map((item) => (

                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4"
                >

                  <div className="flex min-w-0 items-center gap-3">

                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="h-14 w-14 rounded-lg bg-gray-100 object-contain p-1"
                    />

                    <div className="min-w-0">

                      <p className="truncate font-semibold text-gray-800">
                        {item.title}
                      </p>

                      <p className="text-sm text-gray-500">
                        Qty: {item.quantity}
                      </p>

                    </div>

                  </div>

                  <span className="whitespace-nowrap font-semibold">
                    $
                    {(
                      Number(item.price) *
                      Number(item.quantity)
                    ).toFixed(2)}
                  </span>

                </div>

              ))}

            </div>

            {/* PRICE DETAILS */}

            <div className="mt-5 space-y-3">

              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>

                <span>
                  ${subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Tax (18%)</span>

                <span>
                  ${tax.toFixed(2)}
                </span>
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
                  {shipping === 0
                    ? "FREE"
                    : `$${shipping.toFixed(2)}`}
                </span>
              </div>

              <div className="flex justify-between border-t pt-5 text-xl font-bold">

                <span>Total</span>

                <span className="text-orange-500">
                  ${total.toFixed(2)}
                </span>

              </div>

            </div>

          </aside>

        </div>
      </div>
    </main>
  );
}

export default Checkout; 
