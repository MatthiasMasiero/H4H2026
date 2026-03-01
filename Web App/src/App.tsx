import Nav from './components/Nav'
import Hero from './components/Hero'
import Process from "./components/Process";
import TechMarquee from "./components/TechMarquee";
import PrivacyStatement from "./components/PrivacyStatement";
import Architecture from "./components/Architecture";
import LaunchCta from "./components/LaunchCta";
import WhyQuantum from "./components/WhyQuantum";
import Footer from "./components/Footer";

import './App.css'

export default function App() {
  return (
    <>
      <Nav />
      <Hero />
      <TechMarquee />
      <Process />
      <PrivacyStatement />
      <Architecture />
      <LaunchCta />
      <WhyQuantum />
      <Footer />
    </>
  );
}
