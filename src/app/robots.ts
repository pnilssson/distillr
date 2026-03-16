import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/library/",
          "/auth/",
          "/monitoring/",
        ],
      },
    ],
    sitemap: "https://distillr.co/sitemap.xml",
  };
}
