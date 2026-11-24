import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  Heart,
  ShoppingCart,
  Trash2,
  ArrowLeft,
  Star,
} from "lucide-react";

import { removeFromWishlist } from "../redux/wishlistSlice";
import { addToCart } from "../redux/cartSlice";

function Wishlist() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const wishlistItems = useSelector(
    (state) => state.wishlist.items
  );

  const handleRemove = (id, title) => {
    dispatch(removeFromWishlist(id));

    toast.success(`${title} removed from wishlist`);
  };

  const handleAddToCart = (product) => {
    dispatch(
      addToCart({
        product,
        quantity: 1,
      })
    );

    toast.success(`${product.title} added to cart! 🛒`);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              My Wishlist
            </h1>

            <p className="mt-2 text-gray-500">
              {wishlistItems.length}{" "}
              {wishlistItems.length === 1
                ? "product"
                : "products"}{" "}
              saved
            </p>
          </div>

          <button
            onClick={() => navigate("/products")}
            className="flex w-fit items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700 transition hover:border-orange-500 hover:text-orange-500"
          >
            <ArrowLeft size={19} />
            Continue Shopping
          </button>
        </div>

        {/* Empty Wishlist */}
        {wishlistItems.length === 0 ? (
          <div className="rounded-3xl bg-white px-6 py-20 text-center shadow-sm">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-50">
              <Heart
                size={40}
                className="text-orange-500"
              />
            </div>

            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Your Wishlist is Empty
            </h2>

            <p className="mx-auto mt-3 max-w-md text-gray-500">
              Save products you love and come back to them
              anytime.
            </p>

            <Link
              to="/products"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-7 py-3 font-bold text-white transition hover:bg-orange-600"
            >
              <ShoppingCart size={20} />
              Explore Products
            </Link>
          </div>
        ) : (
          /* Wishlist Products */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

            {wishlistItems.map((product) => (
              <div
                key={product.id}
                className="overflow-hidden rounded-2xl bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >

                {/* Image */}
                <div className="relative">

                  <Link
                    to={`/products/${product.id}`}
                    className="block h-60 bg-gray-100"
                  >
                    <img
                      src={product.thumbnail}
                      alt={product.title}
                      className="h-full w-full object-contain p-5"
                    />
                  </Link>

                  {/* Remove */}
                  <button
                    onClick={() =>
                      handleRemove(
                        product.id,
                        product.title
                      )
                    }
                    className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-red-500 shadow-md transition hover:bg-red-500 hover:text-white"
                    title="Remove from wishlist"
                  >
                    <Trash2 size={18} />
                  </button>

                  {/* Wishlist icon */}
                  <div className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange-50">
                    <Heart
                      size={19}
                      className="fill-orange-500 text-orange-500"
                    />
                  </div>
                </div>

                {/* Information */}
                <div className="p-5">

                  {/* Category */}
                  <p className="text-sm capitalize text-orange-500">
                    {product.category?.replace(
                      /-/g,
                      " "
                    )}
                  </p>

                  {/* Title */}
                  <Link
                    to={`/products/${product.id}`}
                  >
                    <h2 className="mt-2 line-clamp-2 min-h-[56px] text-lg font-bold text-gray-900 transition hover:text-orange-500">
                      {product.title}
                    </h2>
                  </Link>

                  {/* Rating */}
                  <div className="mt-3 flex items-center gap-2">

                    <div className="flex items-center gap-1">
                      <Star
                        size={17}
                        className="fill-yellow-400 text-yellow-400"
                      />

                      <span className="font-semibold text-gray-700">
                        {product.rating || "4.5"}
                      </span>
                    </div>

                    <span className="text-sm text-gray-400">
                      Rating
                    </span>
                  </div>

                  {/* Price */}
                  <div className="mt-4">
                    <span className="text-2xl font-extrabold text-gray-900">
                      $
                      {Number(product.price || 0).toFixed(
                        2
                      )}
                    </span>
                  </div>

                  {/* Add to Cart */}
                  <button
                    onClick={() =>
                      handleAddToCart(product)
                    }
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-bold text-white transition hover:bg-orange-600 active:scale-[0.98]"
                  >
                    <ShoppingCart size={19} />
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default Wishlist;