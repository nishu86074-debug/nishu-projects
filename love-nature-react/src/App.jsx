import Navbar from "./components/navbar";
import Hero from "./components/hero";
import Services from "./components/service";
import Testimonial from "./components/testimonial";
import About from "./components/about";
import Question from "./components/question";
import Footer from "./components/footer";

// import Contact from "./components/contact";

function App() {
  return (
    <>
      <Navbar />
      <Hero />
      <Services />
      <Testimonial />
      <About />
      <Question />
      <Footer />
      {/* <Contact /> */}
    </>
  );
}

export default App;
