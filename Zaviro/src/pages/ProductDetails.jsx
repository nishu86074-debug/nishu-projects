import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";

import {
  ArrowLeft,
  ShoppingCart,
  Star,
  Minus,
  Plus,
  Package,
  Heart,
} from "lucide-react";

import { addToCart } from "../redux/cartSlice";
import {
  addToWishlist,
  removeFromWishlist,
} from "../redux/wishlistSlice";

import { getProducts } from "../services/productApi";

function ProductDetails() {
  const { id } = useParams();

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const wishlistItems = useSelector(
    (state) => state.wishlist.items
  );

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);

        // Admin products check
        const savedAdminProducts =
          JSON.parse(localStorage.getItem("adminProducts")) || [];

        const adminProduct = savedAdminProducts.find(
          (item) => String(item.id) === String(id)
        );

        // Agar Admin Product mil gaya
        if (adminProduct) {
          setProduct({
            ...adminProduct,
            rating: adminProduct.rating || 4.5,
            description:
              adminProduct.description ||
              "Product added by Zaviro admin.",
          });

          return;
        }

        // API products load
        const products = await getProducts();

        const foundProduct = products.find(
          (item) => String(item.id) === String(id)
        );

        setProduct(foundProduct || null);
      } catch (error) {
        console.error("Error loading product:", error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  // Check product already wishlist me hai ya nahi
  const isInWishlist = wishlistItems.some(
    (item) => String(item.id) === String(product?.id)
  );

  // Wishlist Handle
  const handleWishlist = () => {
    if (!product) return;

    if (isInWishlist) {
      dispatch(removeFromWishlist(product.id));
      toast.success(`${product.title} removed from wishlist`);
    } else {
      dispatch(addToWishlist(product));
      toast.success(`${product.title} added to wishlist ❤️`);
    }
  };

  const increaseQuantity = () => {
    if (product && quantity < product.stock) {
      setQuantity((prev) => prev + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    dispatch(
      addToCart({
        product,
        quantity,
      })
    );

    toast.success(
      `${quantity} ${product.title} added to cart! 🛒`
    );
  };

  // Loading
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-gray-500">
          Loading Product...
        </div>
      </main>
    );
  }

  // Product Not Found
  if (!product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Product Not Found
          </h1>

          <p className="mt-3 text-gray-500">
            The product you are looking for does not exist.
          </p>

          <button
            onClick={() => navigate("/products")}
            className="mt-6 rounded-xl bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-600"
          >
            Back to Products
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4">

        {/* Back Button */}
        <button
          onClick={() => navigate("/products")}
          className="mb-8 flex items-center gap-2 font-semibold text-gray-600 transition hover:text-orange-500"
        >
          <ArrowLeft size={20} />
          Back to Products
        </button>

        <div className="grid gap-10 rounded-3xl bg-white p-6 shadow-sm md:grid-cols-2 md:p-10">

          {/* Product Image */}
          <div className="flex min-h-[400px] items-center justify-center rounded-2xl bg-gray-100 p-8">
            <img
              src={product.thumbnail}
              alt={product.title}
              className="max-h-[450px] w-full object-contain"
            />
          </div>

          {/* Product Information */}
          <div className="flex flex-col justify-center">

            <p className="text-sm font-semibold capitalize text-orange-500">
              {product.category?.replace(/-/g, " ")}
            </p>

            <h1 className="mt-3 text-3xl font-bold text-gray-900 md:text-4xl">
              {product.title}
            </h1>

            {/* Rating */}
            <div className="mt-5 flex items-center gap-3">
              <div className="flex items-center gap-1 text-yellow-500">
                <Star
                  size={22}
                  className="fill-yellow-400"
                />

                <span className="font-bold text-gray-800">
                  {product.rating || 4.5}
                </span>
              </div>

              <span className="text-gray-400">
                Product Rating
              </span>
            </div>

            {/* Price */}
            <div className="mt-6">
              <span className="text-4xl font-extrabold text-orange-500">
                ${Number(product.price).toFixed(2)}
              </span>
            </div>

            {/* Description */}
            <div className="mt-6">
              <h3 className="font-bold text-gray-900">
                Description
              </h3>

              <p className="mt-2 leading-relaxed text-gray-600">
                {product.description ||
                  "Explore this amazing product available on Zaviro."}
              </p>
            </div>

            {/* Stock */}
            <div className="mt-6 flex items-center gap-2">
              <Package
                size={20}
                className="text-orange-500"
              />

              <span className="font-semibold text-gray-700">
                {product.stock > 0
                  ? `${product.stock} items available`
                  : "Out of Stock"}
              </span>
            </div>

            {/* Quantity */}
            {product.stock > 0 && (
              <div className="mt-8">
                <p className="mb-3 font-bold text-gray-900">
                  Quantity
                </p>

                <div className="flex w-fit items-center overflow-hidden rounded-xl border border-gray-300">

                  <button
                    onClick={decreaseQuantity}
                    className="p-3 hover:bg-gray-100"
                  >
                    <Minus size={20} />
                  </button>

                  <span className="min-w-14 text-center text-lg font-bold">
                    {quantity}
                  </span>

                  <button
                    onClick={increaseQuantity}
                    className="p-3 hover:bg-gray-100"
                  >
                    <Plus size={20} />
                  </button>

                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="mt-8 flex gap-4">

              {/* Add To Cart */}
              <button
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className="flex flex-1 items-center justify-center gap-3 rounded-xl bg-orange-500 py-4 text-lg font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                <ShoppingCart size={22} />

                {product.stock > 0
                  ? "Add to Cart"
                  : "Out of Stock"}
              </button>

              {/* Wishlist Button */}
              <button
                onClick={handleWishlist}
                className={`flex items-center justify-center rounded-xl border px-5 transition ${
                  isInWishlist
                    ? "border-red-500 bg-red-500 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:border-red-500 hover:text-red-500"
                }`}
              >
                <Heart
                  size={24}
                  className={
                    isInWishlist ? "fill-current" : ""
                  }
                />
              </button>

            </div>

          </div>
        </div>
      </div>
    </main>
  );
}

export default ProductDetails;