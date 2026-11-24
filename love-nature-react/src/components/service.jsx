const Services = () => {
  const services = [
    {
      title: "Web Design",
      image:
        "https://websitedemos.net/love-nature-02/wp-content/uploads/sites/988/2021/11/service-1.jpg",
      text: "Focus on how you can help and benefit your user. Use simple words so that you don't confuse people",
    },
    {
      title: "Graphic Design",
      image:
        "https://websitedemos.net/love-nature-02/wp-content/uploads/sites/988/2021/11/service-2.jpg",
      text: "Focus on how you can help and benefit your user. Use simple words so that you don't confuse people",
    },
    {
      title: "Content Creation",
      image:
        "https://websitedemos.net/love-nature-02/wp-content/uploads/sites/988/2021/11/service-3.jpg",
      text: "Focus on how you can help and benefit your user. Use simple words so that you don't confuse people",
    },
  ];

  return (
    <section id="services" className="bg-white py-24">

      <div className="max-w-6xl mx-auto px-6">

        {/* Heading */}
        <div className="text-center mb-14">

          <p className="text-green-700 text-lg mb-3">
            Our Services
          </p>

          <div className="w-20 h-1 bg-green-700 mx-auto"></div>

        </div>

        {/* Services */}
        <div className="grid md:grid-cols-3 gap-10">

          {services.map((service, index) => (
            <div
              key={index}
              className="text-center"
            >

              <img
                src={service.image}
                alt={service.title}
                className="w-full h-80 object-cover mb-6"
              />

              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                {service.title}
              </h3>

              <p className="text-gray-600 leading-7">
                {service.text}
              </p>

            </div>
          ))}

        </div>

      </div>

    </section>
  );
};

export default Services;