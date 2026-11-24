const About = () => {
  return (
    <section id="about" className="bg-white py-24">

      <div className="max-w-6xl mx-auto px-6">

        {/* Heading */}
        <div className="text-center mb-16">

          <p className="text-green-700 text-lg mb-3">
            About Us
          </p>

          <div className="w-20 h-1 bg-green-700 mx-auto mt-6"></div>

        </div>

        {/* About Content */}
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-16 md:gap-24">

          {/* Text - LEFT */}
          <div className="w-full md:w-1/2">

            <h3 className="text-3xl md:text-4xl font-semibold text-gray-800 mb-6 leading-tight">
              Tell website visitors who you are and why they should choose your
              business.
            </h3>

            <p className="text-gray-600 text-lg leading-8 mb-8">
              Because when a visitor first lands on your website, you're a
              stranger to them. They have to get to know you in order to want to
              read your blog posts, subscribe to your email newsletter, or buy
              what you're selling.
            </p>

            <button className="border border-green-700 text-green-700 px-8 py-3 rounded-sm hover:bg-green-700 hover:text-white transition duration-300">
              Find Out More
            </button>

          </div>

          {/* Image - RIGHT */}
          <div className="w-full md:w-1/2 flex justify-center">

            <img
              src="https://websitedemos.net/love-nature-02/wp-content/uploads/sites/988/2021/11/leaf-400x485.jpg"
              alt="Nature"
              className="w-full max-w-md"
            />

          </div>

        </div>

      </div>

    </section>
  );
};

export default About;