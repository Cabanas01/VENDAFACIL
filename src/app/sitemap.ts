import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.vendafacilbrasil.shop';
  const now = new Date();
  
  const routes = [
    '',
    '/login',
    '/signup',
    '/pdv',
    '/pdv-online',
    '/pdv-simples',
    '/pdv-para-pequenos-negocios',
    '/pdv-controle-de-vendas',
    '/pdv-controle-de-caixa',
    '/pdv-para-mei',
    '/pdv-para-mercadinho',
    '/pdv-para-loja-pequena',
    '/pdv-para-padaria',
    '/pdv-para-restaurante',
    '/pdv-para-farmacia',
    '/melhor-pdv-online',
    '/software-pdv',
    '/sistema-pdv'
  ].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: route === '/pdv' ? 1.0 : route === '' ? 0.9 : 0.8,
  }));

  return routes;
}
