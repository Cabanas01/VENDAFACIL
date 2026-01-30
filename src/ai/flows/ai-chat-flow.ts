'use server';

/**
 * @fileOverview Fluxo de IA para análise de dados do VendaFácil.
 * 
 * Este fluxo atua como um Analista de Negócios puramente passivo.
 * Ele recebe dados contextuais e responde perguntas sem nunca executar ações.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const AiChatInputSchema = z.object({
  messages: z.array(MessageSchema),
  contextData: z.string().describe('Snapshot de dados reais do sistema para análise'),
  scope: z.enum(['store', 'admin']).describe('Define se a IA analisa uma loja ou o sistema global'),
});

export type AiChatInput = z.infer<typeof AiChatInputSchema>;

const AiChatOutputSchema = z.object({
  text: z.string().describe('Resposta da IA formatada em Markdown'),
});

export type AiChatOutput = z.infer<typeof AiChatOutputSchema>;

export async function askAi(input: AiChatInput): Promise<AiChatOutput> {
  return aiChatFlow(input);
}

const aiChatFlow = ai.defineFlow(
  {
    name: 'aiChatFlow',
    inputSchema: AiChatInputSchema,
    outputSchema: AiChatOutputSchema,
  },
  async (input) => {
    const systemPrompt = input.scope === 'admin' 
      ? `Você é o ANALISTA ESTRATÉGICO do SaaS VendaFácil. 
         Seu objetivo é analisar métricas GLOBAIS de faturamento, logs e tenants.
         RESTRIÇÕES:
         1. NÃO execute ações.
         2. NÃO sugira alterações de banco de dados.
         3. Responda apenas com base nos DADOS FORNECIDOS abaixo.
         4. Se não souber, diga que os dados atuais não permitem a conclusão.`
      : `Você é o CONSULTOR DE NEGÓCIOS da loja no VendaFácil.
         Seu objetivo é analisar VENDAS, CMV, PRODUTOS e CLIENTES.
         RESTRIÇÕES:
         1. Você é um LEITOR de dados. Nunca sugira deletar ou alterar nada.
         2. Foco em lucratividade e gestão de estoque.
         3. Use tom profissional e direto.
         4. Responda apenas com base nos DADOS FORNECIDOS abaixo.`;

    const response = await ai.generate({
      system: systemPrompt,
      prompt: `CONTEÚDO PARA ANÁLISE:
      ${input.contextData}
      
      PERGUNTA DO USUÁRIO:
      ${input.messages[input.messages.length - 1].content}`,
      // Passamos o histórico de mensagens para manter o contexto da conversa
      messages: input.messages.slice(0, -1).map(m => ({
        role: m.role,
        content: [{ text: m.content }]
      }))
    });

    return { text: response.text };
  }
);
