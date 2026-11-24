const Footer = () => {
  return (
    <footer className="bg-white py-8">
      <div className="max-w-6xl mx-auto px-6">

        <div className="flex items-center justify-between">

          {/* Left - Menu */}
          <div className="flex items-center gap-5">
            <a
              href="#home"
              className="text-green-800 text-base hover:text-green-600 transition"
            >
              Home
            </a>

            <a
              href="#about"
              className="text-green-800 text-base hover:text-green-600 transition"
            >
              About
            </a>

            <a
              href="#services"
              className="text-green-800 text-base hover:text-green-600 transition"
            >
              Services
            </a>

            <a
              href="#contact"
              className="text-green-800 text-base hover:text-green-600 transition"
            >
              Contact
            </a>
          </div>

          {/* Center - Logo */}
          <div>
            <img
              src="https://websitedemos.net/love-nature-02/wp-content/uploads/sites/988/2021/11/logo-green.svg"
              alt="Love Nature"
              className="w-14 h-14"
            />
          </div>

          {/* Right - Copyright text */}
          <div>
            <p className="text-green-800 text-base">
              Love Nature by Tyler Moore
            </p>
          </div>

        </div>

      </div>
    </footer>
  );
};

export default Footer;