'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, User, Send, Loader2, Sparkles, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { askAi } from '@/ai/flows/ai-chat-flow';

type Message = {
  role: 'user' | 'model';
  content: string;
};

type ChatInterfaceProps = {
  title: string;
  subtitle: string;
  contextData: any;
  scope: 'store' | 'admin';
  suggestions: string[];
  isAiConfigured?: boolean;
};

export function ChatInterface({ title, subtitle, contextData, scope, suggestions, isAiConfigured = true }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
    }
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading || !isAiConfigured) return;

    const userMsg: Message = { role: 'user', content: text };
    const newMessages: Message[] = [...messages, userMsg];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const result = await askAi({
        messages: newMessages,
        contextData: JSON.stringify(contextData),
        scope: scope
      });

      setMessages([...newMessages, { role: 'model', content: result.text }]);
    } catch (error: any) {
      console.error('[CHAT_UI_ERROR]', error);
      const errorMsg = error.message === 'API_KEY_MISSING' 
        ? '⚠️ A chave de API da IA não está configurada no servidor.'
        : '⚠️ Falha técnica na análise. Verifique sua conexão ou tente novamente.';
      
      setMessages([...newMessages, { role: 'model', content: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAiConfigured) {
    return (
      <Card className="border-yellow-200 bg-yellow-50/30">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-6">
          <div className="p-4 bg-yellow-100/50 rounded-full border border-yellow-200">
            <Settings className="h-12 w-12 text-yellow-600 animate-pulse" />
          </div>
          <div className="space-y-3 max-w-md">
            <h3 className="text-2xl font-black text-yellow-900 font-headline uppercase tracking-tighter">Configuração de IA Necessária</h3>
            <p className="text-sm text-yellow-800/80 leading-relaxed px-4">
              Para ativar o assistente inteligente, você precisa configurar a chave <strong className="text-yellow-900">GOOGLE_GENAI_API_KEY</strong> no seu ambiente de hospedagem ou arquivo .env local.
            </p>
          </div>
          <Button 
            variant="outline" 
            className="border-yellow-400 text-yellow-900 hover:bg-yellow-100 font-bold h-12 px-8" 
            onClick={() => window.location.reload()}
          >
            Verificar Novamente
          </Button>
        </CardContent>
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
        <Badge variant="outline" className="gap-1 bg-background">
          <Sparkles className="h-3 w-3 text-primary" />
          Modo Inteligente
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden bg-muted/5">
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
                    <Button key={i} variant="outline" size="sm" className="text-xs text-left justify-start h-auto py-2 px-4" onClick={() => handleSend(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <Avatar className={`h-8 w-8 ${m.role === 'model' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {m.role === 'model' ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
                </Avatar>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-none' 
                    : 'bg-background border rounded-tl-none prose prose-slate dark:prose-invert max-w-none'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 animate-pulse">
                <Avatar className="h-8 w-8 bg-primary/20"><Bot className="h-5 w-5 text-primary" /></Avatar>
                <div className="bg-background border rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Consultando dados operacionais...</span>
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
            className="h-12 shadow-inner"
          />
          <Button type="submit" size="icon" className="h-12 w-12" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
