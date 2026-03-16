import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { Providers } from "@/lib/providers";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CookieBanner } from "@/features/cookies/CookieBanner";
import { CookieConsentProvider } from "@/features/cookies/CookieConsentProvider";
import "./globals.css";

function getMetadataBase() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL must be set.");
  }

  const normalizedUrl = appUrl.startsWith("http") ? appUrl : `https://${appUrl}`;

  try {
    return new URL(normalizedUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_APP_URL must be a valid URL.");
  }
}

const siteName = "Distillr";
const title = "Distillr - YouTube knowledge base";
const description =
  "Turn YouTube channels, playlists, and videos into a searchable knowledge base you can chat with and export.";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
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
  },
  twitter: {
    card: "summary",
    title,
    description,
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
