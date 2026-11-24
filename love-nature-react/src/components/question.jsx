const Questions = () => {
  return (
    <section
      id="questions"
      className="relative min-h-[330px] flex items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage:
          "url('https://websitedemos.net/love-nature-02/wp-content/uploads/sites/988/2021/11/footer-hero-mobile.jpg')",
      }}
    >
      {/* Light Overlay */}
      <div className="absolute inset-0 bg-white/70"></div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-2xl px-6">

        <h2 className="text-3xl md:text-4xl font-normal text-green-700 mb-5">
          QUESTIONS?
        </h2>

        <p className="text-gray-700 text-base md:text-lg leading-7 mb-7">
          Whether you’re curious about features, a free trial,
          or even press, we’re here to answer any questions.
        </p>

        <a
          href="#contact"
          className="inline-block bg-yellow-400 hover:bg-yellow-500 text-gray-800 px-8 py-3 text-sm transition duration-300"
        >
          Let's Talk Now
        </a>

      </div>
    </section>
  );
};

export default Questions;