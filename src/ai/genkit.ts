import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Configuração Central do Genkit v1.x
 * 
 * Utiliza o modelo Gemini 1.5 Flash para análise de dados e chat.
 * Este modelo é otimizado para latência e suporta o contexto necessário para o SaaS.
 */

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash',
});
