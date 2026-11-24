import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";

import {
  ShoppingCart,
  Star,
  Heart,
} from "lucide-react";

import { addToCart } from "../redux/cartSlice";
import { toggleWishlist } from "../redux/wishlistSlice";

function ProductCard({ product }) {
  const dispatch = useDispatch();

  const wishlistItems = useSelector(
    (state) => state.wishlist.items
  );

  const isWishlisted = wishlistItems.some(
    (item) => item.id === product.id
  );

  const handleAddToCart = (event) => {
    event.preventDefault();
    event.stopPropagation();

    dispatch(
      addToCart({
        product: product,
        quantity: 1,
      })
    );

    toast.success(`${product.title} added to cart! 🛒`);
  };

  const handleWishlist = (event) => {
    event.preventDefault();
    event.stopPropagation();

    dispatch(toggleWishlist(product));

    if (isWishlisted) {
      toast.success("Removed from wishlist");
    } else {
      toast.success("Added to wishlist ❤️");
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">

      {/* Wishlist Button */}
      <button
        onClick={handleWishlist}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition hover:scale-110"
      >
        <Heart
          size={20}
          className={
            isWishlisted
              ? "fill-red-500 text-red-500"
              : "text-gray-500"
          }
        />
      </button>

      {/* Product Image */}
      <Link
        to={`/products/${product.id}`}
        className="block h-56 overflow-hidden bg-gray-100"
      >
        <img
          src={product.thumbnail}
          alt={product.title}
          className="h-full w-full object-contain p-4 transition duration-300 hover:scale-105"
        />
      </Link>

      {/* Product Information */}
      <div className="p-5">

        <p className="text-sm capitalize text-orange-500">
          {product.category?.replace(/-/g, " ")}
        </p>

        <Link to={`/products/${product.id}`}>
          <h2 className="mt-2 line-clamp-1 text-lg font-bold text-gray-900 hover:text-orange-500">
            {product.title}
          </h2>
        </Link>

        {/* Rating */}
        <div className="mt-3 flex items-center gap-2">
          <Star
            size={18}
            className="fill-yellow-400 text-yellow-400"
          />

          <span className="font-semibold text-gray-700">
            {product.rating}
          </span>

          <span className="text-sm text-gray-400">
            Rating
          </span>
        </div>

        {/* Price */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xl font-bold text-gray-900">
            ${product.price}
          </span>

          {product.discountPercentage > 0 && (
            <span className="text-sm font-semibold text-green-600">
              {Math.round(product.discountPercentage)}% OFF
            </span>
          )}
        </div>

        {/* Add To Cart */}
        <button
          onClick={handleAddToCart}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-bold text-white transition hover:bg-orange-600 active:scale-[0.98]"
        >
          <ShoppingCart size={20} />
          Add to Cart
        </button>

      </div>
    </div>
  );
}

export default ProductCard;