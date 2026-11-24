import { Link, NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
  ShoppingCart,
  User,
  Menu,
  X,
  Search,
  LogOut,
  Heart,
} from "lucide-react";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  // Cart Redux Data
  const cartItems = useSelector((state) => state.cart.items);

  // Wishlist Redux Data
  const wishlistItems = useSelector(
    (state) => state.wishlist.items
  );

  // Firebase user check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);

      toast.success("Logged out successfully!");

      setMenuOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Logout failed");
    }
  };

  // Total Cart Quantity
  const cartCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  // Wishlist Count
  const wishlistCount = wishlistItems.length;

  const navLinkClass = ({ isActive }) =>
    `font-medium transition ${
      isActive
        ? "text-orange-500"
        : "text-gray-700 hover:text-orange-500"
    }`;

  // User name
  const userName =
    user?.displayName || user?.email?.split("@")[0] || "User";

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">

        {/* Logo */}
        <Link
          to="/"
          className="text-2xl font-extrabold tracking-tight text-gray-900"
        >
          Zavi<span className="text-orange-500">ro</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-7 md:flex">
          <NavLink to="/" className={navLinkClass}>
            Home
          </NavLink>

          <NavLink to="/products" className={navLinkClass}>
            Products
          </NavLink>
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-4">

          {/* Search */}
          <Link
            to="/products"
            className="hidden text-gray-700 transition hover:text-orange-500 sm:block"
          >
            <Search size={22} />
          </Link>

          {/* User Login / Profile */}
          {user ? (
            <div className="hidden items-center gap-3 sm:flex">

              <div className="flex items-center gap-2 text-gray-700">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-500">
                  <User size={19} />
                </div>

                <span className="max-w-[120px] truncate text-sm font-semibold">
                  {userName}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-red-50 hover:text-red-500"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden text-gray-700 transition hover:text-orange-500 sm:block"
            >
              <User size={22} />
            </Link>
          )}

          {/* ❤️ Wishlist */}
          <Link
            to="/wishlist"
            className="relative text-gray-700 transition hover:text-red-500"
          >
            <Heart size={24} />

            {wishlistCount > 0 && (
              <span className="absolute -right-3 -top-3 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {wishlistCount > 99
                  ? "99+"
                  : wishlistCount}
              </span>
            )}
          </Link>

          {/* 🛒 Cart */}
          <Link
            to="/cart"
            className="relative text-gray-700 transition hover:text-orange-500"
          >
            <ShoppingCart size={25} />

            {cartCount > 0 && (
              <span className="absolute -right-3 -top-3 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-gray-700 md:hidden"
          >
            {menuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="border-t bg-white px-4 py-5 md:hidden">
          <nav className="flex flex-col gap-5">

            <NavLink
              to="/"
              onClick={() => setMenuOpen(false)}
              className={navLinkClass}
            >
              Home
            </NavLink>

            <NavLink
              to="/products"
              onClick={() => setMenuOpen(false)}
              className={navLinkClass}
            >
              Products
            </NavLink>

            {/* Mobile Wishlist */}
            <NavLink
              to="/wishlist"
              onClick={() => setMenuOpen(false)}
              className={navLinkClass}
            >
              Wishlist ({wishlistCount})
            </NavLink>

            {/* Mobile Cart */}
            <NavLink
              to="/cart"
              onClick={() => setMenuOpen(false)}
              className={navLinkClass}
            >
              Cart ({cartCount})
            </NavLink>

            {/* Mobile User Section */}
            {user ? (
              <>
                <div className="flex items-center gap-2 font-semibold text-gray-700">
                  <User size={20} className="text-orange-500" />
                  {userName}
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 font-semibold text-red-500"
                >
                  <LogOut size={20} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className={navLinkClass}
                >
                  Login
                </NavLink>

                <NavLink
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="font-semibold text-orange-500"
                >
                  Create Account
                </NavLink>
              </>
            )}

          </nav>
        </div>
      )}
    </header>
  );
}

export default Navbar;