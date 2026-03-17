import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { PlatformsSection } from "@/components/landing/PlatformsSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { ResellerSection } from "@/components/landing/ResellerSection";
import { LiveOrderFeed } from "@/components/landing/LiveOrderFeed";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <PlatformsSection />
        <StatsSection />
        <FeaturesSection />
        <ResellerSection />
        <LiveOrderFeed />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
