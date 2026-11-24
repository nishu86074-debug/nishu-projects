import { useEffect, useMemo, useState } from "react";
import { Search, X, SlidersHorizontal, ArrowUpDown } from "lucide-react";

import ProductCard from "../components/ProductCard";

import { getProducts, getCategories } from "../services/productApi";

function Products() {
  // --------------------------------------------------
  // STATES
  // --------------------------------------------------

  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("all");

  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [selectedRating, setSelectedRating] = useState("all");

  const [sortBy, setSortBy] = useState("default");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // LOAD PRODUCTS
  // --------------------------------------------------

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [apiProducts, apiCategories] = await Promise.all([
          getProducts(),
          getCategories(),
        ]);

        if (!isMounted) return;

        // Admin Products
        let savedAdminProducts = [];

        try {
          savedAdminProducts =
            JSON.parse(localStorage.getItem("adminProducts")) || [];
        } catch (storageError) {
          console.error("Error reading admin products:", storageError);
        }

        // Combine Admin + API Products
        const combinedProducts = [...savedAdminProducts, ...apiProducts];

        setAllProducts(combinedProducts);

        // API Categories
        const categoryNames = apiCategories
          .map((category) =>
            typeof category === "string" ? category : category?.slug,
          )
          .filter(Boolean);

        // Admin Categories
        const adminCategories = savedAdminProducts
          .map((product) => product.category)
          .filter(Boolean);

        // Unique Categories
        const allCategories = [
          ...new Set([...categoryNames, ...adminCategories]),
        ].sort();

        setCategories(allCategories);
        setLoading(false);
      } catch (err) {
        console.error("Error loading products:", err);

        if (!isMounted) return;

        setError("Failed to load products");
        setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // --------------------------------------------------
  // DEBOUNCE SEARCH
  // --------------------------------------------------

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [search]);

  // --------------------------------------------------
  // FILTER + SORT PRODUCTS
  // --------------------------------------------------

  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // -----------------------------
    // SEARCH
    // -----------------------------

    const searchValue = debouncedSearch.trim().toLowerCase();

    if (searchValue) {
      result = result.filter((product) => {
        const title = product.title?.toLowerCase() || "";

        const category = product.category?.toLowerCase() || "";

        const description = product.description?.toLowerCase() || "";

        return (
          title.includes(searchValue) ||
          category.includes(searchValue) ||
          description.includes(searchValue)
        );
      });
    }

    // -----------------------------
    // CATEGORY
    // -----------------------------

    if (selectedCategory !== "all") {
      result = result.filter(
        (product) => product.category === selectedCategory,
      );
    }

    // -----------------------------
    // MIN PRICE
    // -----------------------------

    if (minPrice !== "") {
      result = result.filter(
        (product) => Number(product.price) >= Number(minPrice),
      );
    }

    // -----------------------------
    // MAX PRICE
    // -----------------------------

    if (maxPrice !== "") {
      result = result.filter(
        (product) => Number(product.price) <= Number(maxPrice),
      );
    }

    // -----------------------------
    // RATING
    // -----------------------------

    if (selectedRating !== "all") {
      result = result.filter(
        (product) => Number(product.rating || 0) >= Number(selectedRating),
      );
    }

    // -----------------------------
    // SORT
    // -----------------------------

    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => Number(a.price) - Number(b.price));
        break;

      case "price-high":
        result.sort((a, b) => Number(b.price) - Number(a.price));
        break;

      case "rating-high":
        result.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
        break;

      case "name-az":
        result.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        break;

      case "name-za":
        result.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
        break;

      default:
        break;
    }

    return result;
  }, [
    allProducts,
    debouncedSearch,
    selectedCategory,
    minPrice,
    maxPrice,
    selectedRating,
    sortBy,
  ]);

  // --------------------------------------------------
  // CLEAR FILTERS
  // --------------------------------------------------

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedCategory("all");
    setMinPrice("");
    setMaxPrice("");
    setSelectedRating("all");
    setSortBy("default");
  };

  const hasFilters =
    search.trim() !== "" ||
    selectedCategory !== "all" ||
    minPrice !== "" ||
    maxPrice !== "" ||
    selectedRating !== "all" ||
    sortBy !== "default";

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-7xl px-4">
          {/* Heading Skeleton */}
          <div className="mb-8">
            <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />

            <div className="mt-3 h-10 w-64 animate-pulse rounded bg-gray-200" />

            <div className="mt-3 h-5 w-80 animate-pulse rounded bg-gray-200" />
          </div>

          {/* Filter Skeleton */}
          <div className="mb-10 h-64 animate-pulse rounded-2xl bg-white shadow-sm" />

          {/* Product Skeletons */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl bg-white shadow-sm"
              >
                <div className="h-56 animate-pulse bg-gray-200" />

                <div className="space-y-3 p-5">
                  <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />

                  <div className="h-6 w-full animate-pulse rounded bg-gray-200" />

                  <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />

                  <div className="h-8 w-28 animate-pulse rounded bg-gray-200" />

                  <div className="h-12 w-full animate-pulse rounded-xl bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">{error}</h1>

          <p className="mt-2 text-gray-500">
            Something went wrong while loading products.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-orange-500 px-6 py-3 font-bold text-white transition hover:bg-orange-600"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // MAIN UI
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4">
        {/* ------------------------------------------- */}
        {/* HEADING */}
        {/* ------------------------------------------- */}

        <div className="mb-8">
          <p className="font-semibold text-orange-500">Explore Zaviro</p>

          <h1 className="mt-2 text-4xl font-bold text-gray-900">
            All Products
          </h1>

          <p className="mt-3 text-gray-500">
            Discover amazing products at great prices.
          </p>
        </div>

        {/* ------------------------------------------- */}
        {/* FILTER BOX */}
        {/* ------------------------------------------- */}

        <div className="mb-10 rounded-2xl bg-white p-5 shadow-sm">
          {/* Search + Category */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Search */}
            <div className="relative">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-300 py-3 pl-12 pr-4 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>

            {/* Category */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-gray-300 px-4 py-3 capitalize outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            >
              <option value="all">All Categories</option>

              {categories.map((category) => (
                <option key={category} value={category}>
                  {category.replace(/-/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* ----------------------------------------- */}
          {/* ADVANCED FILTERS */}
          {/* ----------------------------------------- */}

          <div className="mt-5 border-t border-gray-100 pt-5">
            <div className="mb-4 flex items-center gap-2 font-bold text-gray-800">
              <SlidersHorizontal size={19} />
              Filters
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Min Price */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-600">
                  Min Price
                </label>

                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 10"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-orange-500"
                />
              </div>

              {/* Max Price */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-600">
                  Max Price
                </label>

                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 500"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-orange-500"
                />
              </div>

              {/* Rating */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-600">
                  Minimum Rating
                </label>

                <select
                  value={selectedRating}
                  onChange={(e) => setSelectedRating(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-orange-500"
                >
                  <option value="all">All Ratings</option>

                  <option value="4.5">⭐ 4.5 & above</option>

                  <option value="4">⭐ 4.0 & above</option>

                  <option value="3">⭐ 3.0 & above</option>

                  <option value="2">⭐ 2.0 & above</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="mb-2 flex items-center gap-1 text-sm font-semibold text-gray-600">
                  <ArrowUpDown size={15} />
                  Sort By
                </label>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-orange-500"
                >
                  <option value="default">Default</option>

                  <option value="price-low">Price: Low to High</option>

                  <option value="price-high">Price: High to Low</option>

                  <option value="rating-high">Rating: High to Low</option>

                  <option value="name-az">Name: A to Z</option>

                  <option value="name-za">Name: Z to A</option>
                </select>
              </div>
            </div>
          </div>

          {/* ----------------------------------------- */}
          {/* CLEAR FILTERS */}
          {/* ----------------------------------------- */}

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-5 flex items-center gap-2 font-semibold text-orange-500 transition hover:text-orange-600"
            >
              <X size={18} />
              Clear All Filters
            </button>
          )}
        </div>

        {/* ------------------------------------------- */}
        {/* PRODUCT COUNT */}
        {/* ------------------------------------------- */}

        <div className="mb-6">
          <p className="text-gray-500">
            Showing{" "}
            <span className="font-bold text-gray-900">
              {filteredProducts.length}
            </span>{" "}
            products
          </p>
        </div>

        {/* ------------------------------------------- */}
        {/* PRODUCTS */}
        {/* ------------------------------------------- */}

        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl bg-white py-20 text-center shadow-sm">
            <Search size={55} className="mx-auto text-gray-300" />

            <h2 className="mt-5 text-2xl font-bold text-gray-900">
              No Products Found
            </h2>

            <p className="mt-2 text-gray-500">
              Try changing your search or filters.
            </p>

            <button
              onClick={clearFilters}
              className="mt-6 rounded-xl bg-orange-500 px-6 py-3 font-bold text-white transition hover:bg-orange-600"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default Products;
