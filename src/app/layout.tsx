import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { Providers } from "@/lib/providers";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CookieBanner } from "@/features/cookies/CookieBanner";
import { CookieConsentProvider } from "@/features/cookies/CookieConsentProvider";
import { JsonLd } from "@/components/json-ld";
import { getAppBaseUrl, getAppUrl } from "@/lib/site/url";
import "./globals.css";

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Distillr",
  url: getAppUrl("/"),
  description:
    "Your YouTube research, finally searchable. Add your sources, ask anything, and get cited answers with timestamp links.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: getAppUrl("/login"),
    },
    "query-input": "required name=search_term_string",
  },
};

const siteName = "Distillr";
const title = "Distillr - Your YouTube research, finally searchable.";
const description =
  "Distillr builds a research library from the YouTube channels and playlists you actually follow. Ask questions across your sources and get cited answers with timestamp links.";
const socialImagePath = "/opengraph-image?v=2";

export const metadata: Metadata = {
  metadataBase: getAppBaseUrl(),
  title: {
    default: title,
    template: "%s | Distillr",
  },
  description,
  applicationName: siteName,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName,
    title,
    description,
    images: [
      {
        url: socialImagePath,
        width: 1200,
        height: 630,
        alt: "Distillr - YouTube research library",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [socialImagePath],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  referrer: "origin-when-cross-origin",
  category: "productivity",
  creator: siteName,
  publisher: siteName,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased">
        <JsonLd data={websiteSchema} />
        <Providers>
          <CookieConsentProvider>
            <TooltipProvider>
              {children}
              <Toaster />
              <CookieBanner />
            </TooltipProvider>
          </CookieConsentProvider>
        </Providers>
      </body>
    </html>
  );
}
