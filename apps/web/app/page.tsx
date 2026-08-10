import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import Features from "@/components/Features";
import ForDentists from "@/components/ForDentists";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <ForDentists />
      <HowItWorks />
      <Pricing />
      <CTASection />
      <Footer />
    </main>
  );
}
