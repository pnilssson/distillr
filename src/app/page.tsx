import { createSupabaseServerClient } from "@/server/core/supabase/server";
import { MarketingNav } from "@/features/navigation/MarketingNav";
import { HeroSection } from "@/features/marketing/HeroSection";
import { SocialProofBar } from "@/features/marketing/SocialProofBar";
import { HowItWorksSection } from "@/features/marketing/HowItWorksSection";
import { FeaturesGridSection } from "@/features/marketing/FeaturesGridSection";
import { FeatureShowcaseChat } from "@/features/marketing/FeatureShowcaseChat";
import { FeatureShowcaseDark } from "@/features/marketing/FeatureShowcaseDark";
import { PricingSection } from "@/features/marketing/PricingSection";
import { FinalCtaSection } from "@/features/marketing/FinalCtaSection";
import { FooterSection } from "@/features/marketing/FooterSection";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  return (
    <main className="flex min-h-screen flex-col">
      <MarketingNav isAuthenticated={isAuthenticated} />
      <HeroSection isAuthenticated={isAuthenticated} />
      <SocialProofBar />
      <HowItWorksSection />
      <FeaturesGridSection />
      <FeatureShowcaseChat />
      <FeatureShowcaseDark />
      <PricingSection isAuthenticated={isAuthenticated} />
      <FinalCtaSection isAuthenticated={isAuthenticated} />
      <FooterSection />
    </main>
  );
}
