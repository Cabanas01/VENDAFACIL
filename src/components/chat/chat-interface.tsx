'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, User, Send, Loader2, Sparkles, AlertCircle } from 'lucide-react';
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
};

export function ChatInterface({ title, subtitle, contextData, scope, suggestions }: ChatInterfaceProps) {
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
    if (!text.trim() || isLoading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
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
    } catch (error) {
      setMessages([...newMessages, { 
        role: 'model', 
        content: '⚠️ Ocorreu um erro ao processar sua análise. Por favor, tente novamente.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

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
          Modo Leitura de Dados
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
                  <h3 className="font-bold">Olá! Eu sou seu assistente inteligente.</h3>
                  <p className="text-sm text-muted-foreground px-12">
                    Analiso seus dados em tempo real para encontrar tendências e responder dúvidas operacionais.
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
                  <span className="text-xs text-muted-foreground">Analisando snapshot do sistema...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-4 border-t bg-background">
        <form className="flex w-full items-center gap-3" onSubmit={(e) => { e.preventDefault(); handleSend(input); }}>
          <Input 
            placeholder="Digite sua dúvida sobre os dados..." 
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
