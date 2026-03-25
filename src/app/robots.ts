import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/site/url";

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
    sitemap: getAppUrl("/sitemap.xml"),
  };
}
