import { MetadataRoute } from 'next';

/**
 * @fileOverview Sitemap Gerador para SEO.
 * Define as rotas que o Google deve indexar para o domínio principal.
 */

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.vendafacilbrasil.shop';
  const now = new Date();
  
  const seoRoutes = [
    '/pdv-online',
    '/pdv-simples',
    '/pdv-para-pequenos-negocios',
    '/pdv-controle-de-vendas',
    '/pdv-controle-de-caixa',
    '/pdv-para-mei',
    '/pdv-para-mercadinho',
    '/pdv-para-loja-pequena',
    '/software-pdv',
    '/sistema-pdv'
  ].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  return [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...seoRoutes
  ];
}
