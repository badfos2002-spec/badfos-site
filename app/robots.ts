import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://badfos.co.il'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/payment/', '/share/', '/cart'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
