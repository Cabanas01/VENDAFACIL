import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.vendafacilbrasil.shop';
  const now = new Date();
  
  const seoRoutes = [
    '/pdv',
    '/pdv-online',
    '/pdv-simples',
    '/pdv-para-mei',
    '/pdv-para-pequenos-negocios',
    '/pdv-controle-de-caixa',
    '/pdv-controle-de-vendas',
    '/software-pdv',
    '/sistema-pdv'
  ];

  const mainRoutes = ['', '/login', '/signup'];

  return [...mainRoutes, ...seoRoutes].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: route === '/pdv' ? 1.0 : 0.8,
  }));
}
