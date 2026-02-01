'use server';

/**
 * @fileOverview Sumarização de Relatórios Financeiros via REST v1 (Modo JSON)
 */

import { askGemini } from '@/lib/ai/gemini';

export type SummarizeFinancialReportsInput = {
  financialReportData: string;
};

export type SummarizeFinancialReportsOutput = {
  summary: string;
  trends: string;
  opportunities: string;
  risks: string;
};

export async function summarizeFinancialReports(input: SummarizeFinancialReportsInput): Promise<SummarizeFinancialReportsOutput> {
  const prompt = `Você é um analista financeiro sênior. Analise os dados do relatório abaixo e retorne um JSON com exatamente estes campos: summary (string), trends (string), opportunities (string), risks (string). Use português do Brasil.

DADOS DO RELATÓRIO:
${input.financialReportData}`;

  try {
    const result = await askGemini(prompt, true);
    return result as SummarizeFinancialReportsOutput;
  } catch (error) {
    console.error('[REPORT_AI_ERROR]', error);
    throw new Error('Falha ao processar análise do relatório.');
  }
}
