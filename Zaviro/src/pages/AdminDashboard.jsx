import { useEffect, useState } from "react";
import {
  Package,
  ShoppingBag,
  Users,
  DollarSign,
  Plus,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

function AdminDashboard() {
  // ================= PRODUCTS =================

  const [products, setProducts] = useState(() => {
    const savedProducts = localStorage.getItem("adminProducts");

    try {
      return savedProducts ? JSON.parse(savedProducts) : [];
    } catch {
      return [];
    }
  });

  // ================= ORDERS =================

  const [orders, setOrders] = useState(() => {
    const savedOrders = localStorage.getItem("adminOrders");

    try {
      return savedOrders ? JSON.parse(savedOrders) : [];
    } catch {
      return [];
    }
  });

  // ================= FORM =================

  const [formData, setFormData] = useState({
    title: "",
    price: "",
    category: "",
    stock: "",
  });

  // Save Products
  useEffect(() => {
    localStorage.setItem(
      "adminProducts",
      JSON.stringify(products)
    );
  }, [products]);

  // Save Orders
  useEffect(() => {
    localStorage.setItem(
      "adminOrders",
      JSON.stringify(orders)
    );
  }, [orders]);

  // Listen for new orders
  useEffect(() => {
    const loadOrders = () => {
      const savedOrders = localStorage.getItem("adminOrders");

      try {
        setOrders(savedOrders ? JSON.parse(savedOrders) : []);
      } catch {
        setOrders([]);
      }
    };

    window.addEventListener(
      "adminOrdersUpdated",
      loadOrders
    );

    window.addEventListener("storage", loadOrders);

    return () => {
      window.removeEventListener(
        "adminOrdersUpdated",
        loadOrders
      );

      window.removeEventListener("storage", loadOrders);
    };
  }, []);

  // ================= ADD PRODUCT =================

  const handleAddProduct = (e) => {
    e.preventDefault();

    if (
      !formData.title.trim() ||
      !formData.price ||
      !formData.category.trim() ||
      !formData.stock
    ) {
      toast.error("Please fill all product details");
      return;
    }

    const newProduct = {
      id: Date.now(),
      title: formData.title.trim(),
      price: Number(formData.price),
      category: formData.category.trim(),
      stock: Number(formData.stock),
      thumbnail:
        "https://via.placeholder.com/400x300?text=Zaviro+Product",
      rating: 4.5,
    };

    setProducts((prev) => [...prev, newProduct]);

    setFormData({
      title: "",
      price: "",
      category: "",
      stock: "",
    });

    toast.success("Product added successfully!");
  };

  // ================= DELETE PRODUCT =================

  const handleDeleteProduct = (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmDelete) return;

    setProducts((prev) =>
      prev.filter((product) => product.id !== id)
    );

    toast.success("Product deleted successfully!");
  };

  // ================= UPDATE ORDER STATUS =================

  const handleStatusChange = (id, newStatus) => {
    const updatedOrders = orders.map((order) =>
      order.id === id
        ? { ...order, status: newStatus }
        : order
    );

    setOrders(updatedOrders);

    localStorage.setItem(
      "adminOrders",
      JSON.stringify(updatedOrders)
    );

    toast.success("Order status updated!");
  };

  // ================= STATUS STYLE =================

  const getStatusStyle = (status) => {
    if (status === "Delivered") {
      return "bg-green-100 text-green-700";
    }

    if (status === "Processing") {
      return "bg-blue-100 text-blue-700";
    }

    return "bg-yellow-100 text-yellow-700";
  };

  // ================= STATS =================

  const revenue = orders.reduce(
    (total, order) => total + Number(order.total || 0),
    0
  );

  const customers = new Set(
    orders.map((order) => order.customer)
  ).size;

  return (
    <main className="min-h-screen bg-gray-100">
      {/* HEADER */}
      <section className="bg-gray-900 py-12 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-400">
            Zaviro Management
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Admin Dashboard
          </h1>

          <p className="mt-3 text-gray-300">
            Manage your products and orders from one place.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">

        {/* ================= STATS ================= */}

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

          {/* PRODUCTS */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Total Products
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  {products.length}
                </h2>
              </div>

              <div className="rounded-xl bg-orange-100 p-3 text-orange-500">
                <Package size={28} />
              </div>
            </div>
          </div>

          {/* ORDERS */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Total Orders
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  {orders.length}
                </h2>
              </div>

              <div className="rounded-xl bg-blue-100 p-3 text-blue-500">
                <ShoppingBag size={28} />
              </div>
            </div>
          </div>

          {/* CUSTOMERS */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Customers
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  {customers}
                </h2>
              </div>

              <div className="rounded-xl bg-purple-100 p-3 text-purple-500">
                <Users size={28} />
              </div>
            </div>
          </div>

          {/* REVENUE */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Revenue
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  ${revenue.toFixed(2)}
                </h2>
              </div>

              <div className="rounded-xl bg-green-100 p-3 text-green-500">
                <DollarSign size={28} />
              </div>
            </div>
          </div>

        </section>

        {/* ================= ADD PRODUCT ================= */}

        <section className="mt-10 rounded-2xl bg-white p-6 shadow-sm">

          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2 text-orange-500">
              <Plus size={24} />
            </div>

            <div>
              <h2 className="text-xl font-bold">
                Add New Product
              </h2>

              <p className="text-sm text-gray-500">
                Add a new product to Zaviro.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleAddProduct}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          >
            <input
              type="text"
              placeholder="Product Name"
              value={formData.title}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  title: e.target.value,
                })
              }
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
            />

            <input
              type="number"
              placeholder="Price"
              value={formData.price}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  price: e.target.value,
                })
              }
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
            />

            <input
              type="text"
              placeholder="Category"
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value,
                })
              }
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
            />

            <input
              type="number"
              placeholder="Stock"
              value={formData.stock}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  stock: e.target.value,
                })
              }
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
            />

            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 md:col-span-2 lg:col-span-4"
            >
              <Plus size={20} />
              Add Product
            </button>
          </form>
        </section>

        {/* ================= ADMIN PRODUCTS ================= */}

        <section className="mt-10 overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b p-6">
            <h2 className="text-xl font-bold">
              Admin Added Products
            </h2>
          </div>

          {products.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No products added yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">

                <thead className="bg-gray-50 text-sm text-gray-500">
                  <tr>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Stock</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="border-t"
                    >
                      <td className="px-6 py-4 font-semibold">
                        {product.title}
                      </td>

                      <td className="px-6 py-4">
                        {product.category}
                      </td>

                      <td className="px-6 py-4 font-semibold">
                        ${product.price}
                      </td>

                      <td className="px-6 py-4">
                        {product.stock}
                      </td>

                      <td className="px-6 py-4">
                        <button
                          onClick={() =>
                            handleDeleteProduct(product.id)
                          }
                          className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-red-500 hover:bg-red-100"
                        >
                          <Trash2 size={18} />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}
        </section>

        {/* ================= RECENT ORDERS ================= */}

        <section className="mt-10 overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b p-6">
            <h2 className="text-xl font-bold">
              Recent Orders
            </h2>
          </div>

          {orders.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No orders placed yet.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full text-left">

                <thead className="bg-gray-50 text-sm text-gray-500">
                  <tr>
                    <th className="px-6 py-4">Order ID</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Products</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-t align-top"
                    >
                      <td className="px-6 py-4 font-semibold">
                        {order.id}
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-semibold">
                          {order.customer}
                        </p>

                        {order.email && (
                          <p className="text-sm text-gray-500">
                            {order.email}
                          </p>
                        )}

                        {order.phone && (
                          <p className="text-sm text-gray-500">
                            {order.phone}
                          </p>
                        )}
                      </td>

                      {/* PRODUCTS */}
                      <td className="px-6 py-4">
                        {order.products &&
                        order.products.length > 0 ? (
                          <div className="space-y-2">
                            {order.products.map((product, index) => (
                              <div
                                key={`${product.id}-${index}`}
                                className="text-sm"
                              >
                                <p className="font-medium text-gray-800">
                                  {product.title}
                                </p>

                                <p className="text-gray-500">
                                  Qty: {product.quantity} × $
                                  {product.price}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">
                            No product details
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 font-semibold">
                        ${Number(order.total || 0).toFixed(2)}
                      </td>

                      <td className="px-6 py-4">
                        <select
                          value={order.status || "Pending"}
                          onChange={(e) =>
                            handleStatusChange(
                              order.id,
                              e.target.value
                            )
                          }
                          className={`rounded-lg px-3 py-2 font-semibold outline-none ${getStatusStyle(
                            order.status
                          )}`}
                        >
                          <option value="Pending">
                            Pending
                          </option>

                          <option value="Processing">
                            Processing
                          </option>

                          <option value="Delivered">
                            Delivered
                          </option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>

            </div>
          )}
        </section>

      </div>
    </main>
  );
}

export default AdminDashboard;