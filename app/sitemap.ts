import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://badfos.co.il'

  return [
    {
      url: baseUrl,
      lastModified: '2026-04-04',
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/designer`,
      lastModified: '2026-04-04',
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/designer/tshirt`,
      lastModified: '2026-04-04',
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/designer/sweatshirt`,
      lastModified: '2026-04-04',
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/designer/buff`,
      lastModified: '2026-03-30',
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/designer/apron`,
      lastModified: '2026-03-30',
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/packages`,
      lastModified: '2026-04-02',
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/reviews`,
      lastModified: '2026-04-04',
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: '2026-03-15',
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: '2026-04-04',
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: '2026-03-29',
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: '2026-03-08',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: '2026-03-08',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/accessibility`,
      lastModified: '2026-03-08',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
