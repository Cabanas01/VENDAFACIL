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
    }, 3000); // 3 segundos para garantir leitura completa do crawler

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-body text-slate-900">
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}

      {/* Header SEO Navigation */}
      <nav className="bg-white border-b py-4 px-6 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/pdv" className="text-xl font-black font-headline text-primary tracking-tighter uppercase">
            VendaFácil<span className="text-slate-400">Brasil</span>
          </Link>
          <div className="hidden md:flex gap-6 items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <Link href="/pdv-online" className="hover:text-primary transition-colors">Online</Link>
            <Link href="/pdv-para-mei" className="hover:text-primary transition-colors">Para MEI</Link>
            <Link href="/pdv-para-mercadinho" className="hover:text-primary transition-colors">Mercadinhos</Link>
            <Button size="sm" variant="outline" className="h-8 text-[9px]" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-white pt-24 pb-20 px-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 -skew-x-12 translate-x-1/2" />
        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full border border-primary/20 animate-bounce">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Sistema Autorizado 2024</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black font-headline tracking-tighter uppercase leading-[0.9] text-slate-950">
            {title}
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
          
          <div className="pt-10 flex flex-col items-center gap-6">
            <Button size="lg" className="h-16 px-12 text-xl font-black uppercase tracking-widest shadow-2xl shadow-primary/30 group" asChild>
              <Link href="/login">
                Acessar o PDV Agora 
                <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
              </Link>
            </Button>
            
            <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sincronizando ambiente seguro...</span>
            </div>
          </div>
        </div>
      </section>

      {/* Breadcrumbs for SEO */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 overflow-x-auto whitespace-nowrap">
          <Link href="/pdv" className="hover:text-primary">PDV Brasil</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-900">{title}</span>
        </nav>
      </div>

      {/* Content Area */}
      <main className="max-w-4xl mx-auto py-12 px-6 prose prose-slate prose-lg lg:prose-xl prose-headings:font-headline prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter prose-strong:text-primary prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
        {content}
        
        {/* Internal Authority Link */}
        <div className="mt-20 p-8 bg-primary/5 rounded-3xl border border-primary/10 not-prose">
          <h3 className="text-2xl font-black font-headline uppercase tracking-tighter mb-4">Guia de Especialista</h3>
          <p className="text-slate-600 font-medium leading-relaxed mb-6">
            Quer aprofundar seus conhecimentos sobre gestão de pontos de venda? Confira nosso guia mestre sobre <strong>Ponto de Venda (PDV)</strong> e descubra como escalar seu faturamento com tecnologia.
          </p>
          <Button variant="link" className="p-0 h-auto font-black uppercase text-xs tracking-widest" asChild>
            <Link href="/pdv">Explorar Guia Completo de PDV <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </main>

      {/* Trust Section */}
      <section className="bg-slate-50 border-y py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <h4 className="font-black font-headline uppercase text-lg">100% Cloud</h4>
            <p className="text-sm text-slate-500 font-medium">Acesse de qualquer lugar, a qualquer hora, sem necessidade de instalações complexas.</p>
          </div>
          <div className="space-y-4">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <h4 className="font-black font-headline uppercase text-lg">Segurança Total</h4>
            <p className="text-sm text-slate-500 font-medium">Seus dados são protegidos por criptografia de ponta a ponta e backups automáticos.</p>
          </div>
          <div className="space-y-4">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <h4 className="font-black font-headline uppercase text-lg">Suporte BR</h4>
            <p className="text-sm text-slate-500 font-medium">Atendimento humanizado em português para ajudar você a crescer sua loja.</p>
          </div>
        </div>
      </section>

      {/* Final Footer CTA */}
      <footer className="bg-slate-950 text-white py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto space-y-10">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-headline font-black uppercase tracking-tighter leading-none">O Futuro da sua Loja Começa Aqui</h2>
            <p className="text-slate-400 text-lg font-medium">Abandone as planilhas e o caderninho. Junte-se a milhares de lojistas profissionais.</p>
          </div>
          <Button size="lg" variant="default" className="h-16 px-12 bg-white text-slate-950 hover:bg-slate-200 font-black uppercase tracking-widest shadow-2xl" asChild>
            <Link href="/signup">Criar Conta Gratuita Agora</Link>
          </Button>
          <div className="pt-10 text-[10px] text-slate-600 font-black uppercase tracking-[0.3em]">
            Venda Fácil Brasil &copy; 2024 - Otimizado para Pequenos Negócios
          </div>
        </div>
      </footer>

      {/* Smart Redirect Overlay */}
      {redirecting && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="p-8 bg-primary/5 rounded-full mb-6">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
          <h3 className="font-headline font-black text-2xl uppercase tracking-tighter mb-2">Preparando Terminal</h3>
          <p className="font-bold text-slate-400 uppercase text-[10px] tracking-[0.2em]">Você será redirecionado para o login...</p>
        </div>
      )}
    </div>
  );
}
