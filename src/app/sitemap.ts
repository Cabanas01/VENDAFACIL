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
    '/pdv-controle-de-estoque',
    '/pdv-fechamento-de-caixa',
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
    '/software-pdv',
    '/sistema-pdv',
    '/vendafacilbrasil',
    '/venda-facil-brasil-pdv',
    '/venda-facil-brasil-pdv-online',
    '/venda-facil-brasil-sistema-pdv',
    '/venda-facil-brasil-sistema-de-vendas'
  ];

  const mainRoutes = ['', '/login', '/signup'];

  const routes = [...mainRoutes, ...seoRoutes].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: route === '/pdv' ? 1.0 : route === '' ? 0.9 : 0.8,
  }));

  return routes;
}