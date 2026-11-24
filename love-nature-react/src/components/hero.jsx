const Hero = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage:
          "url('https://websitedemos.net/love-nature-02/wp-content/uploads/sites/988/2022/01/header-hero.jpg')",
      }}
    >

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30"></div>

      {/* Hero Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center text-center text-white px-6">

        <div>

          <p className="text-xl md:text-2xl mb-4">
            We all love
          </p>

          <h1 className="text-6xl md:text-8xl font-bold mb-6">
            Nature
          </h1>

          <p className="text-lg md:text-2xl mb-10">
            Look deep into nature, and then you will understand everything better.
          </p>

          <a
            href="#services"
            className="inline-block bg-white text-green-700 px-10 py-4 rounded-full font-semibold hover:bg-green-700 hover:text-white transition"
          >
            Get Started
          </a>

        </div>

      </div>
    </section>
  );
};

export default Hero;