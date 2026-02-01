import { MetadataRoute } from 'next';

/**
 * @fileOverview Sitemap Gerador para SEO.
 * Define as rotas públicas que o Google deve indexar.
 */

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.vendafacilbrasil.shop';
  
  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
