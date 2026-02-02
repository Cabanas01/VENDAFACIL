
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import Script from "next/script";
import { Providers } from "./providers";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import "./globals.css";

/**
 * @fileOverview Root Layout com Otimização de SEO e Verificação do Google Search Console.
 */

export const metadata: Metadata = {
  title: {
    default: 'VendaFácil | PDV Online Simples para Pequenos Negócios',
    template: '%s | VendaFácil'
  },
  description: 'O PDV online mais simples e rápido para pequenos negócios. Controle suas vendas, caixa, clientes e estoque em um só lugar. Teste grátis agora.',
  keywords: [
    'pdv online',
    'sistema pdv',
    'pdv simples',
    'pdv para pequenos negócios',
    'sistema de vendas',
    'frente de caixa online',
    'controle de estoque simples',
    'venda fácil brasil'
  ],
  metadataBase: new URL('https://www.vendafacilbrasil.shop'),
  alternates: {
    canonical: '/',
  },
  verification: {
    google: 'UxfEnipfr5bCVjQ7rpII_5thkJa3QsoQsN-FZu3SA1A',
  },
  openGraph: {
    title: 'VendaFácil | PDV Online para Pequenos Negócios',
    description: 'Sistema PDV online completo para controlar vendas e estoque sem complicação.',
    url: 'https://www.vendafacilbrasil.shop',
    siteName: 'VendaFácil',
    locale: 'pt_BR',
    type: 'website',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'VendaFácil Logo',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Schema.org Global Organization
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "VendaFácil Brasil",
    "url": "https://www.vendafacilbrasil.shop",
    "logo": "https://www.vendafacilbrasil.shop/logo.png",
    "sameAs": [
      "https://www.instagram.com/vendafacilbrasil"
    ]
  };

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        {/* Google AdSense Direct Script to avoid data-nscript attribute warning */}
        <script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7101977987227464" 
          crossOrigin="anonymous"
        ></script>
      </head>
      <body className="font-body antialiased min-h-screen">
        <Suspense fallback={null}>
          <Providers>
            {/* Analytics */}
            <AnalyticsTracker />
            {children}
          </Providers>
        </Suspense>
        
        <Script 
          src="https://www.googletagmanager.com/gtag/js?id=G-FZGT4B73XF" 
          strategy="afterInteractive" 
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-FZGT4B73XF', { send_page_view: false });
          `}
        </Script>
      </body>
    </html>
  );
}
