import { createSupabaseServerClient } from "@/server/core/supabase/server";
import { MarketingNav } from "@/features/navigation/MarketingNav";
import { HeroSection } from "@/features/marketing/HeroSection";
import { SocialProofBar } from "@/features/marketing/SocialProofBar";
import { HowItWorksSection } from "@/features/marketing/HowItWorksSection";
import { FeaturesGridSection } from "@/features/marketing/FeaturesGridSection";
import { FeatureShowcaseDark } from "@/features/marketing/FeatureShowcaseDark";
import { PricingSection } from "@/features/marketing/PricingSection";
import { FaqSection } from "@/features/marketing/FaqSection";
import { FinalCtaSection } from "@/features/marketing/FinalCtaSection";
import { FooterSection } from "@/features/marketing/FooterSection";
import { BILLING_PLANS } from "@/lib/billing/plans";
import { JsonLd } from "@/components/json-ld";
import { getAppUrl } from "@/lib/site/url";

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Distillr",
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web",
  url: getAppUrl("/"),
  description:
    "Distillr turns the YouTube channels and playlists you follow into a searchable research library. Ask questions across your sources and get cited answers with timestamp links.",
  offers: [
    {
      "@type": "Offer",
      price: String(BILLING_PLANS.free.monthlyPriceUsd),
      priceCurrency: "USD",
      name: BILLING_PLANS.free.label,
      description: `Index up to ${BILLING_PLANS.free.monthlyVideoLimit} new videos each month, store up to ${BILLING_PLANS.free.lifetimeVideoLimit} indexed videos, ${BILLING_PLANS.free.monthlyChatCredits} AI chat credits each month, 1 library`,
    },
    {
      "@type": "Offer",
      price: String(BILLING_PLANS.builder.monthlyPriceUsd),
      priceCurrency: "USD",
      name: BILLING_PLANS.builder.label,
      description: `Index up to ${BILLING_PLANS.builder.monthlyVideoLimit} new videos each month, store up to ${BILLING_PLANS.builder.lifetimeVideoLimit} indexed videos, ${BILLING_PLANS.builder.monthlyChatCredits} AI chat credits each month, unlimited libraries`,
    },
    {
      "@type": "Offer",
      price: String(BILLING_PLANS.pro.monthlyPriceUsd),
      priceCurrency: "USD",
      name: BILLING_PLANS.pro.label,
      description: `Index up to ${BILLING_PLANS.pro.monthlyVideoLimit} new videos each month, store unlimited indexed videos, ${BILLING_PLANS.pro.monthlyChatCredits} AI chat credits each month, unlimited libraries, priority processing`,
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
      name: "Do you have to be technical to use it?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. You paste a YouTube URL. Distillr handles the rest. If you can use ChatGPT, you can use Distillr.",
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
        text: "Yes. Free supports TXT exports. Builder and Pro support TXT, Markdown, and PDF exports for chat sessions and content items.",
      },
    },
    {
      "@type": "Question",
      name: "What is the credit system?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Credits are the unit used for AI chat. Each message costs credits depending on which AI model you choose, faster models cost fewer credits, more capable models cost more. Monthly credits reset on your billing date. Paid plans can buy 100-credit top-ups for $3.",
      },
    },
    {
      "@type": "Question",
      name: "How are video limits counted?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Each indexed video counts as one video toward your monthly indexing allowance and your total stored video cap, regardless of video length.",
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
      <SocialProofBar />
      <HowItWorksSection />
      <FeaturesGridSection />
      <FeatureShowcaseDark />
      <PricingSection isAuthenticated={isAuthenticated} />
      <FaqSection />
      <FinalCtaSection isAuthenticated={isAuthenticated} />
      <FooterSection />
    </main>
  );
}
