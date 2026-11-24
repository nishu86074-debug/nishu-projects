import { Link } from "react-router-dom";
import { Heart } from "lucide-react";

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-4">
        
        {/* Brand */}
        <div>
          <Link
            to="/"
            className="text-3xl font-extrabold text-white"
          >
            Zavi<span className="text-orange-500">ro</span>
          </Link>

          <p className="mt-4 leading-relaxed text-gray-400">
            Discover amazing products and enjoy a simple and modern
            shopping experience.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="mb-4 text-lg font-bold text-white">
            Quick Links
          </h3>

          <div className="flex flex-col gap-3">
            <Link to="/" className="hover:text-orange-500">
              Home
            </Link>

            <Link to="/products" className="hover:text-orange-500">
              Products
            </Link>

            <Link to="/cart" className="hover:text-orange-500">
              Cart
            </Link>

            <Link to="/wishlist" className="hover:text-orange-500">
              Wishlist
            </Link>
          </div>
        </div>

        {/* Account */}
        <div>
          <h3 className="mb-4 text-lg font-bold text-white">
            Account
          </h3>

          <div className="flex flex-col gap-3">
            <Link to="/login" className="hover:text-orange-500">
              Login
            </Link>

            <Link to="/register" className="hover:text-orange-500">
              Register
            </Link>

            <Link to="/admin" className="hover:text-orange-500">
              Admin Dashboard
            </Link>
          </div>
        </div>

        {/* Support */}
        <div>
          <h3 className="mb-4 text-lg font-bold text-white">
            Customer Support
          </h3>

          <p className="mb-3 text-gray-400">
            We're here to help you with your shopping experience.
          </p>

          <p className="text-sm text-gray-500">
            Email: support@zaviro.com
          </p>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-gray-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-5 text-sm md:flex-row">
          
          <p>
            © {new Date().getFullYear()} Zaviro. All rights reserved.
          </p>

          <p className="flex items-center gap-1">
            Made with
            <Heart size={16} className="fill-red-500 text-red-500" />
            for shopping
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;