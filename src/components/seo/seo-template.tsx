'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, ShieldCheck, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type SEOTemplateProps = {
  title: string;
  subtitle: string;
  content: React.ReactNode;
  schema?: object;
};

export function SEOTemplate({ title, subtitle, content, schema }: SEOTemplateProps) {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRedirecting(true);
      router.push('/login');
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-white font-body text-slate-900">
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}

      {/* Header Estático para Bots */}
      <nav className="border-b py-4 px-6 sticky top-0 z-40 bg-white">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/pdv" className="text-xl font-black font-headline text-primary tracking-tighter uppercase">
            VendaFácil<span className="text-slate-400">Brasil</span>
          </Link>
          <div className="flex gap-4">
            <Button size="sm" variant="outline" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 bg-slate-50 border-b">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Sistema Homologado 2024</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black font-headline tracking-tighter uppercase leading-[1.1]">
            {title}
          </h1>
          <p className="text-lg md:text-xl text-slate-600 font-medium max-w-2xl mx-auto">
            {subtitle}
          </p>
          <div className="pt-8">
            <Button size="lg" className="h-14 px-10 text-lg font-black uppercase tracking-widest" asChild>
              <Link href="/login">Acessar Sistema Grátis <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Breadcrumbs SEO */}
      <div className="max-w-4xl mx-auto px-6 py-6 border-b">
        <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <Link href="/pdv" className="hover:text-primary">Início</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-900">{title}</span>
        </nav>
      </div>

      {/* Corpo do Texto */}
      <main className="max-w-4xl mx-auto py-16 px-6 prose prose-slate prose-lg lg:prose-xl prose-headings:font-headline prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter">
        {content}
        
        <div className="mt-20 p-8 bg-primary/5 rounded-3xl border border-primary/10 not-prose">
          <h3 className="text-2xl font-black font-headline uppercase tracking-tighter mb-4 text-primary">Pronto para profissionalizar sua loja?</h3>
          <p className="text-slate-600 font-medium mb-6">
            Para utilizar o <strong>sistema PDV completo</strong>, gerir seu estoque e controlar seu fluxo de caixa em tempo real, faça login ou crie sua conta gratuitamente agora mesmo.
          </p>
          <Button className="w-full h-14 font-black uppercase tracking-widest" asChild>
            <Link href="/login">Começar Agora <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-white py-20 px-6 text-center">
        <div className="max-w-xl mx-auto space-y-6">
          <h2 className="text-3xl font-headline font-black uppercase tracking-tighter">Venda Fácil Brasil</h2>
          <p className="text-slate-400 text-sm">O sistema PDV favorito de quem quer crescer com organização e simplicidade.</p>
          <div className="pt-8 text-[9px] text-slate-600 font-black uppercase tracking-widest">
            © 2024 - Todos os direitos reservados
          </div>
        </div>
      </footer>

      {/* Redirect Overlay */}
      {redirecting && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-[100] flex flex-col items-center justify-center animate-in fade-in">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <h3 className="font-headline font-black text-xl uppercase tracking-tighter">Carregando Terminal...</h3>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Redirecionando para login seguro</p>
        </div>
      )}
    </div>
  );
}
