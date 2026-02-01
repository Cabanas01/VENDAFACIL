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
    '/sistema-pdv',
    '/pdv-barato',
    '/pdv-facil',
    '/pdv-gratuito',
    '/pdv-para-mercadinho',
    '/pdv-para-loja-pequena',
    '/pdv-para-padaria',
    '/pdv-para-restaurante',
    '/pdv-para-farmacia',
    '/pdv-para-acougue',
    '/melhor-pdv',
    '/pdv-ou-planilha',
    '/sistema-pdv-gratuito',
    '/vendafacilbrasil',
    '/venda-facil-brasil-pdv',
    '/venda-facil-brasil-pdv-online',
    '/venda-facil-brasil-sistema-pdv',
    '/venda-facil-brasil-sistema-de-vendas'
  ];

  const mainRoutes = ['', '/login', '/signup'];

  return [...mainRoutes, ...seoRoutes].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: route === '/pdv' ? 1.0 : route === '' ? 0.9 : 0.8,
  }));
}
