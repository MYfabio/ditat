import type { MetadataRoute } from "next";

/** Les pagines publiques. Les de dins no hi son: demanen sessio. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.dictats.cat";
  const ara = new Date();
  return [
    { url: `${base}/`, lastModified: ara, changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/dictats-c1-c2`,
      lastModified: ara,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    { url: `${base}/login`, lastModified: ara, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacitat`, lastModified: ara, changeFrequency: "yearly", priority: 0.3 },
  ];
}
