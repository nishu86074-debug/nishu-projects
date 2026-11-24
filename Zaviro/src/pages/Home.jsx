import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import {
  Smartphone,
  Laptop,
  Shirt,
  Home as HomeIcon,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import ProductCard from "../components/ProductCard";
import { getProducts } from "../services/productApi";
import ProductSkeleton from "../components/ProductSkeleton";

function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    {
      name: "Electronics",
      icon: <Smartphone size={38} />,
      path: "/products",
    },
    {
      name: "Laptops",
      icon: <Laptop size={38} />,
      path: "/products",
    },
    {
      name: "Fashion",
      icon: <Shirt size={38} />,
      path: "/products",
    },
    {
      name: "Home & Living",
      icon: <HomeIcon size={38} />,
      path: "/products",
    },
    {
      name: "Beauty",
      icon: <Sparkles size={38} />,
      path: "/products",
    },
  ];

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);

        const data = await getProducts();

        setProducts(data.slice(0, 8));
      } catch (error) {
        console.error("Error loading products:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  return (
    <main className="bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-orange-500 via-orange-400 to-yellow-400">
        <div className="mx-auto flex min-h-[500px] max-w-7xl flex-col items-center justify-center gap-10 px-6 py-16 md:flex-row md:justify-between">
          {/* Hero Content */}
          <div className="max-w-2xl text-center md:text-left">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[4px] text-white/80">
              Welcome to Zaviro
            </p>

            <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
              Discover Products You'll Love
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/90">
              Explore trending products, discover amazing deals and shop
              everything you need in one place.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row md:justify-start">
              <Link
                to="/products"
                className="rounded-xl bg-white px-7 py-3 text-center font-bold text-orange-500 shadow-lg transition hover:-translate-y-1"
              >
                Shop Now
              </Link>

              <Link
                to="/products"
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-white px-7 py-3 font-bold text-white transition hover:bg-white hover:text-orange-500"
              >
                Explore Products
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="flex h-72 w-72 items-center justify-center rounded-full bg-white/20 shadow-2xl backdrop-blur-sm sm:h-80 sm:w-80">
            <div className="flex h-56 w-56 items-center justify-center rounded-full bg-white shadow-xl sm:h-64 sm:w-64">
              <span className="text-7xl sm:text-8xl">🛍️</span>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-10 text-center">
          <p className="font-semibold text-orange-500">
            SHOP BY CATEGORY
          </p>

          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            Explore Popular Categories
          </h2>

          <p className="mt-3 text-gray-500">
            Find exactly what you're looking for.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-5">
          {categories.map((category) => (
            <Link
              key={category.name}
              to={category.path}
              className="group rounded-2xl bg-white p-6 text-center shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-500 transition group-hover:bg-orange-500 group-hover:text-white">
                {category.icon}
              </div>

              <h3 className="mt-4 font-bold text-gray-800">
                {category.name}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="font-semibold text-orange-500">
                TRENDING NOW
              </p>

              <h2 className="mt-2 text-3xl font-bold text-gray-900">
                Featured Products
              </h2>
            </div>

            <Link
              to="/products"
              className="hidden items-center gap-2 font-semibold text-orange-500 hover:text-orange-600 sm:flex"
            >
              View All
              <ArrowRight size={18} />
            </Link>
          </div>

          {/* Skeleton or Products */}
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {[...Array(8)].map((_, index) => (
                <ProductSkeleton key={index} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          )}

          <div className="mt-8 text-center sm:hidden">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 font-semibold text-orange-500"
            >
              View All Products
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Special Offer */}
      <section className="bg-gray-900 py-16">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="font-semibold tracking-widest text-orange-400">
            SPECIAL OFFER
          </p>

          <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
            Find Amazing Deals Every Day
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-gray-300">
            Discover products you'll love and explore exciting offers on Zaviro.
          </p>

          <Link
            to="/products"
            className="mt-8 inline-block rounded-xl bg-orange-500 px-8 py-3 font-bold text-white transition hover:bg-orange-600"
          >
            Start Shopping
          </Link>
        </div>
      </section>
    </main>
  );
}

export default Home;