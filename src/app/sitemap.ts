import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/site/url";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: getAppUrl("/"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: getAppUrl("/login"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
