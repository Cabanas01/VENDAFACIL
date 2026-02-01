'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User, Send, Loader2, Sparkles, Settings, AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { askAi } from '@/ai/flows/ai-chat-flow';

type Message = {
  role: 'user' | 'model';
  content: string;
  isError?: boolean;
};

type ChatInterfaceProps = {
  title: string;
  subtitle: string;
  contextData: any;
  scope: 'store' | 'admin';
  suggestions: string[];
};

export function ChatInterface({ title, subtitle, contextData, scope, suggestions }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [infraError, setInfraError] = useState<'CONFIG' | 'QUOTA' | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
    }
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: text };
    const newMessages: Message[] = [...messages, userMsg];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setInfraError(null);

    try {
      const result = await askAi({
        messages: newMessages,
        contextData: JSON.stringify(contextData),
        scope: scope
      });

      if (result.error) {
        if (result.error === 'CONFIG_MISSING') {
          setInfraError('CONFIG');
        } else if (result.error === 'QUOTA_EXCEEDED') {
          setInfraError('QUOTA');
        } else {
          setMessages([...newMessages, { 
            role: 'model', 
            content: 'IA indisponível no momento. Por favor, tente novamente em instantes.', 
            isError: true 
          }]);
        }
      } else {
        setMessages([...newMessages, { role: 'model', content: result.text }]);
      }
    } catch (err) {
      setMessages([...newMessages, { 
        role: 'model', 
        content: 'Ocorreu uma falha na comunicação com o servidor de inteligência.', 
        isError: true 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (infraError === 'CONFIG') {
    return (
      <Card className="border-yellow-200 bg-yellow-50/30 py-16 flex flex-col items-center justify-center text-center">
        <div className="p-5 bg-white rounded-full border border-yellow-200 shadow-sm mb-6">
          <Settings className="h-10 w-10 text-yellow-500" />
        </div>
        <div className="space-y-4 max-w-sm px-6">
          <h3 className="text-xl font-black text-yellow-900 uppercase tracking-tighter">Configuração Pendente</h3>
          <p className="text-sm text-yellow-800 font-medium leading-relaxed opacity-80">
            A chave <strong className="font-bold">GOOGLE_GENAI_API_KEY</strong> não foi detectada. Adicione-a nas variáveis de ambiente da Vercel.
          </p>
          <Button variant="outline" className="border-yellow-400 text-yellow-800 hover:bg-yellow-100 font-bold" onClick={() => window.location.reload()}>
            Revalidar Acesso
          </Button>
        </div>
      </Card>
    );
  }

  if (infraError === 'QUOTA') {
    return (
      <Card className="border-orange-200 bg-orange-50/30 py-16 flex flex-col items-center justify-center text-center">
        <div className="p-5 bg-white rounded-full border border-orange-200 shadow-sm mb-6">
          <Clock className="h-10 w-10 text-orange-500" />
        </div>
        <div className="space-y-4 max-w-sm px-6">
          <h3 className="text-xl font-black text-orange-900 uppercase tracking-tighter">Limite de Cota Atingido</h3>
          <p className="text-sm text-orange-800 font-medium leading-relaxed opacity-80">
            O plano gratuito da API atingiu o limite de requisições por minuto. <br/>
            <strong>Aguarde 60 segundos e tente novamente.</strong>
          </p>
          <Button variant="outline" className="border-orange-400 text-orange-800 hover:bg-orange-100 font-bold uppercase text-xs tracking-widest" onClick={() => setInfraError(null)}>
            Tentar Novamente
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)] border-primary/10 shadow-xl overflow-hidden">
      <CardHeader className="bg-primary/5 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-lg font-headline font-bold">{title}</CardTitle>
            <p className="text-xs text-muted-foreground font-medium">{subtitle}</p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1 bg-background border-primary/20 text-primary font-black uppercase text-[9px]">
          <Sparkles className="h-3 w-3" />
          Gemini 1.5 Flash
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden bg-slate-50/50">
        <ScrollArea className="h-full p-6" ref={scrollRef}>
          <div className="space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="p-4 bg-primary/5 rounded-full">
                  <Bot className="h-12 w-12 text-primary/40" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg">Como posso ajudar seu negócio hoje?</h3>
                  <p className="text-sm text-muted-foreground px-12 font-medium">
                    Analiso faturamento, CMV e estoque em tempo real para te dar respostas precisas.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-4">
                  {suggestions.map((s, i) => (
                    <Button key={i} variant="outline" size="sm" className="text-[11px] font-bold text-left justify-start h-auto py-2.5 px-4 bg-background hover:bg-primary/5 transition-all" onClick={() => handleSend(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <Avatar className={`h-8 w-8 ring-2 ring-background ${m.role === 'model' ? 'bg-primary text-primary-foreground' : 'bg-slate-200'}`}>
                  <AvatarFallback className="text-[10px] font-black">
                    {m.role === 'model' ? 'AI' : 'EU'}
                  </AvatarFallback>
                </Avatar>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-none font-medium' 
                    : m.isError 
                      ? 'bg-red-50 border border-red-100 text-red-900 rounded-tl-none flex items-start gap-2'
                      : 'bg-background border border-primary/5 rounded-tl-none prose prose-slate max-w-none'
                }`}>
                  {m.isError && <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />}
                  <div className="leading-relaxed">
                    {m.content}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 animate-pulse">
                <Avatar className="h-8 w-8 bg-primary/20"><AvatarFallback className="text-[10px]">AI</AvatarFallback></Avatar>
                <div className="bg-background border border-primary/5 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-3 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Consultando Inteligência...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-4 border-t bg-background">
        <form className="flex w-full items-center gap-3" onSubmit={(e) => { e.preventDefault(); handleSend(input); }}>
          <Input 
            placeholder="Ex: Qual meu produto com maior margem?" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="h-12 shadow-inner border-primary/10 bg-slate-50 focus-visible:ring-primary/20"
          />
          <Button type="submit" size="icon" className="h-12 w-12 shadow-lg shadow-primary/20 shrink-0" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
