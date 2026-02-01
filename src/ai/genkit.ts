import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Configuração Central do Genkit v1.x
 * 
 * Utiliza o alias 'gemini-pro' para garantir compatibilidade total 
 * com o endpoint v1beta e evitar erros de "model not found" (404).
 */

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-pro', 
});
