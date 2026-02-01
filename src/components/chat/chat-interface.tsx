'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User, Send, Loader2, Sparkles, Settings, AlertTriangle } from 'lucide-react';
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
  const [infraError, setInfraError] = useState<string | null>(null);
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
        if (result.error === 'API_KEY_MISSING') {
          setInfraError('CONFIG');
        } else {
          setMessages([...newMessages, { role: 'model', content: 'IA indisponível no momento. Tente novamente.', isError: true }]);
        }
      } else {
        setMessages([...newMessages, { role: 'model', content: result.text }]);
      }
    } catch (err) {
      setMessages([...newMessages, { role: 'model', content: 'Falha técnica na conexão.', isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (infraError === 'CONFIG') {
    return (
      <Card className="border-yellow-200 bg-[#FFFAEB]/50 py-16 flex flex-col items-center justify-center text-center">
        <div className="p-5 bg-white rounded-full border border-yellow-200 shadow-sm mb-6">
          <Settings className="h-10 w-10 text-yellow-500" />
        </div>
        <div className="space-y-4 max-w-sm px-6">
          <h3 className="text-xl font-black text-[#713F12] uppercase tracking-tighter">IA Desativada</h3>
          <p className="text-sm text-[#854D0E] font-medium leading-relaxed opacity-80">
            A chave <strong className="font-bold">GOOGLE_GENAI_API_KEY</strong> não foi detectada. Configure seu ambiente para ativar o assistente.
          </p>
          <Button variant="outline" className="border-yellow-400 text-[#854D0E] hover:bg-yellow-100 font-bold" onClick={() => window.location.reload()}>
            Validar Infraestrutura
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
            <CardTitle className="text-lg font-headline">{title}</CardTitle>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1 bg-background border-primary/20 text-primary">
          <Sparkles className="h-3 w-3" />
          Modo Inteligente
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden bg-[#F8FAFC]">
        <ScrollArea className="h-full p-6" ref={scrollRef}>
          <div className="space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="p-4 bg-primary/5 rounded-full">
                  <Bot className="h-12 w-12 text-primary/40" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold">Como posso ajudar sua loja hoje?</h3>
                  <p className="text-sm text-muted-foreground px-12">
                    Analiso faturamento, CMV e estoque para te dar respostas precisas.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-4">
                  {suggestions.map((s, i) => (
                    <Button key={i} variant="outline" size="sm" className="text-[11px] font-bold text-left justify-start h-auto py-2.5 px-4 bg-background hover:bg-primary/5" onClick={() => handleSend(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <Avatar className={`h-8 w-8 ${m.role === 'model' ? 'bg-primary text-primary-foreground' : 'bg-muted shadow-sm'}`}>
                  <AvatarFallback className="text-[10px] font-bold">
                    {m.role === 'model' ? 'AI' : 'EU'}
                  </AvatarFallback>
                </Avatar>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-none font-medium' 
                    : m.isError 
                      ? 'bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-tl-none flex items-start gap-2'
                      : 'bg-background border border-primary/5 rounded-tl-none prose prose-slate max-w-none'
                }`}>
                  {m.isError && <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />}
                  {m.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 animate-pulse">
                <Avatar className="h-8 w-8 bg-primary/20"><AvatarFallback className="text-[10px]">AI</AvatarFallback></Avatar>
                <div className="bg-background border rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Analisando dados...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-4 border-t bg-background">
        <form className="flex w-full items-center gap-3" onSubmit={(e) => { e.preventDefault(); handleSend(input); }}>
          <Input 
            placeholder="Ex: Qual meu produto mais lucrativo?" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="h-12 shadow-inner border-primary/5 bg-[#F8FAFC]"
          />
          <Button type="submit" size="icon" className="h-12 w-12 shadow-lg shadow-primary/20" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
