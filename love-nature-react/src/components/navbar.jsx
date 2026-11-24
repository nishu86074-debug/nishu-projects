const Navbar = () => {
  return (
    <header className="absolute top-0 left-0 w-full z-50">
      <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">

        {/* Logo */}
        <a href="#home">
          <img
            src="https://websitedemos.net/love-nature-02/wp-content/uploads/sites/988/2021/11/logo-white.svg"
            alt="Love Nature"
            className="w-36 md:w-40"
          />
        </a>

        {/* Navigation */}
        <nav className="flex items-center gap-8 text-white text-lg">

          <a
            href="#home"
            className="hover:text-green-300 transition"
          >
            Home
          </a>

          <a
            href="#about"
            className="hover:text-green-300 transition"
          >
            About
          </a>

          <a
            href="#services"
            className="hover:text-green-300 transition"
          >
            Services
          </a>

          <a
            href="#contact"
            className="hover:text-green-300 transition"
          >
            Contact
          </a>

          <a
            href="tel:2025550188"
            className="border border-white rounded-full px-6 py-3 hover:bg-white hover:text-green-700 transition"
          >
            202-555-0188
          </a>

        </nav>
      </div>
    </header>
  );
};

export default Navbar;