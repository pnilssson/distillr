import { createSupabaseServerClient } from "@/server/core/supabase/server";
import { MarketingNav } from "@/features/navigation/MarketingNav";
import { HeroSection } from "@/features/marketing/HeroSection";
import { HowItWorksSection } from "@/features/marketing/HowItWorksSection";
import { FeaturesGridSection } from "@/features/marketing/FeaturesGridSection";
import { FeatureShowcaseChat } from "@/features/marketing/FeatureShowcaseChat";
import { FeatureShowcaseDark } from "@/features/marketing/FeatureShowcaseDark";
import { PricingSection } from "@/features/marketing/PricingSection";
import { FaqSection } from "@/features/marketing/FaqSection";
import { FinalCtaSection } from "@/features/marketing/FinalCtaSection";
import { FooterSection } from "@/features/marketing/FooterSection";
import { JsonLd } from "@/components/json-ld";

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Distillr",
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web",
  url: "https://distillr.co",
  description:
    "Distillr turns the YouTube channels and playlists you follow into a searchable research library. Ask questions across your sources and get cited answers with timestamp links.",
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      name: "Free",
      description: "10 videos/month, 100 credits, 1 library",
    },
    {
      "@type": "Offer",
      price: "19",
      priceCurrency: "USD",
      name: "Builder",
      description: "100 videos/month, 900 credits, unlimited libraries",
    },
    {
      "@type": "Offer",
      price: "49",
      priceCurrency: "USD",
      name: "Pro",
      description: "300 videos/month, 2500 credits, unlimited libraries, priority processing",
    },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Distillr?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Distillr is a YouTube research library. It indexes transcripts from channels, playlists, and videos you choose, so you can search and ask questions across your sources with cited answers and timestamp links.",
      },
    },
    {
      "@type": "Question",
      name: "How does Distillr work with YouTube?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Paste a YouTube channel URL, playlist URL, or individual video URL into Distillr. We automatically extract transcripts, index them into your research library, and keep channels and playlists up to date with new uploads.",
      },
    },
    {
      "@type": "Question",
      name: "Which YouTube formats are supported?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Distillr supports YouTube channels, playlists, and individual videos. Once you add a channel or playlist, new uploads are indexed automatically so your research library stays current.",
      },
    },
    {
      "@type": "Question",
      name: "How long does it take to process a video?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most videos are processed and ready to search within minutes. Processing time depends on video length and current queue, but you can typically start asking questions shortly after adding your sources.",
      },
    },
    {
      "@type": "Question",
      name: "Is my library private?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Your libraries are private by default and tied to your account. Nothing you add is shared publicly or accessible to other users.",
      },
    },
    {
      "@type": "Question",
      name: "Can I export my knowledge base data?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Distillr supports exports in Markdown, PDF, TXT, and full chat log formats, ready for Notion, Obsidian, or any note-taking tool you use.",
      },
    },
    {
      "@type": "Question",
      name: "What is the credit system?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Credits are the unit used for AI chat. Each message costs credits depending on which AI model you choose, faster models cost fewer credits, more capable models cost more. Monthly credits reset on your billing date, and top-ups are available on paid plans.",
      },
    },
    {
      "@type": "Question",
      name: "Does Distillr work with videos that have no subtitles?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Distillr relies on YouTube's auto-generated or manually uploaded transcripts. Most videos with spoken content have auto-generated transcripts available. Videos without any transcript (e.g. silent or music-only videos) cannot be indexed.",
      },
    },
  ],
};

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  return (
    <main className="flex min-h-screen flex-col">
      <JsonLd data={softwareApplicationSchema} />
      <JsonLd data={faqSchema} />
      <MarketingNav isAuthenticated={isAuthenticated} />
      <HeroSection isAuthenticated={isAuthenticated} />
      <HowItWorksSection />
      <FeaturesGridSection />
      <FeatureShowcaseChat />
      <FeatureShowcaseDark />
      <PricingSection isAuthenticated={isAuthenticated} />
      <FaqSection />
      <FinalCtaSection isAuthenticated={isAuthenticated} />
      <FooterSection />
    </main>
  );
}
