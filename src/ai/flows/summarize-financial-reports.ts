'use server';

/**
 * @fileOverview Sumarização de Relatórios Financeiros via Genkit v1.x.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeFinancialReportsInputSchema = z.object({
  financialReportData: z.string().describe('The financial report data to summarize.'),
});

export type SummarizeFinancialReportsInput = z.infer<typeof SummarizeFinancialReportsInputSchema>;

const SummarizeFinancialReportsOutputSchema = z.object({
  summary: z.string().describe('A summarized blurb of the financial report data.'),
  trends: z.string().describe('Identified trends in the financial report data.'),
  opportunities: z.string().describe('Identified opportunities in the financial report data.'),
  risks: z.string().describe('Identified risks in the financial report data.'),
});

export type SummarizeFinancialReportsOutput = z.infer<typeof SummarizeFinancialReportsOutputSchema>;

export async function summarizeFinancialReports(input: SummarizeFinancialReportsInput): Promise<SummarizeFinancialReportsOutput> {
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      output: {
        schema: SummarizeFinancialReportsOutputSchema,
      },
      prompt: `Você é um analista financeiro sênior. Analise os dados do relatório abaixo e retorne um objeto JSON com o resumo, tendências, oportunidades e riscos. Use português do Brasil.

DADOS DO RELATÓRIO:
${input.financialReportData}`,
    });

    const output = response.output;
    if (!output) throw new Error('EMPTY_RESPONSE');

    return output;
  } catch (error: any) {
    console.error('[REPORT_AI_ERROR]', error);
    throw new Error('Falha ao processar análise do relatório via Gemini 2.0.');
  }
}
