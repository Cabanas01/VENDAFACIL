'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type SEOTemplateProps = {
  title: string;
  subtitle: string;
  content: React.ReactNode;
};

export function SEOTemplate({ title, subtitle, content }: SEOTemplateProps) {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRedirecting(true);
      router.push('/login');
    }, 2500); // Delay maior para garantir que o crawler processe o conteúdo

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F0F8FF] font-body text-slate-900">
      {/* Hero Section para SEO */}
      <section className="bg-white border-b pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="flex justify-center mb-4">
            <ShieldCheck className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black font-headline tracking-tighter uppercase leading-tight text-slate-950">
            {title}
          </h1>
          <p className="text-xl text-slate-600 font-medium max-w-2xl mx-auto">
            {subtitle}
          </p>
          
          <div className="pt-8 flex flex-col items-center gap-4">
            <Button size="lg" className="h-14 px-8 text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20" asChild>
              <Link href="/login">Acessar Sistema Agora <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <div className="flex items-center gap-2 text-sm font-bold text-primary animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sincronizando seu acesso...
            </div>
          </div>
        </div>
      </section>

      {/* Conteúdo Rico para Indexação */}
      <main className="max-w-4xl mx-auto py-16 px-6 prose prose-slate prose-lg">
        {content}
      </main>

      {/* Footer CTA */}
      <footer className="bg-slate-950 text-white py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-3xl font-headline font-black uppercase tracking-tight">Pronto para transformar sua gestão?</h2>
          <p className="text-slate-400 font-medium">O VendaFácil é o parceiro ideal para o pequeno empresário que não quer perder tempo com planilhas complicadas.</p>
          <Button size="lg" variant="outline" className="h-14 px-10 border-white text-white hover:bg-white hover:text-slate-950 font-black uppercase tracking-widest" asChild>
            <Link href="/signup">Criar Minha Conta Grátis</Link>
          </Button>
        </div>
      </footer>

      {/* Overlay de Redirecionamento Visual */}
      {redirecting && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="font-black uppercase tracking-widest text-slate-950">Carregando Ambiente de Vendas...</p>
        </div>
      )}
    </div>
  );
}
