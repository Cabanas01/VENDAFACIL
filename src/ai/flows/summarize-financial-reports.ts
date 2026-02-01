'use server';

/**
 * @fileOverview Sumarização de Relatórios Financeiros via Genkit 1.x
 * 
 * Refatorado para usar ai.generate diretamente e garantir compatibilidade com a API v1.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeFinancialReportsInputSchema = z.object({
  financialReportData: z.string().describe('Dados do relatório financeiro para sumarização.'),
});

export type SummarizeFinancialReportsInput = z.infer<typeof SummarizeFinancialReportsInputSchema>;

const SummarizeFinancialReportsOutputSchema = z.object({
  summary: z.string(),
  trends: z.string(),
  opportunities: z.string(),
  risks: z.string(),
});

export type SummarizeFinancialReportsOutput = z.infer<typeof SummarizeFinancialReportsOutputSchema>;

export async function summarizeFinancialReports(input: SummarizeFinancialReportsInput): Promise<SummarizeFinancialReportsOutput> {
  const response = await ai.generate({
    model: 'googleai/gemini-1.5-flash',
    messages: [
      { 
        role: 'system', 
        content: [{ text: `Você é um analista financeiro sênior especializado em varejo. Analise os dados e forneça uma visão estratégica.
        Sua resposta deve ser estruturada com os campos: summary, trends, opportunities, risks.` }] 
      },
      { 
        role: 'user', 
        content: [{ text: `DADOS DO RELATÓRIO:\n${input.financialReportData}` }] 
      }
    ],
    output: {
      schema: SummarizeFinancialReportsOutputSchema
    }
  });

  if (!response.output) {
    throw new Error('Falha ao gerar saída estruturada da IA.');
  }

  return response.output;
}
