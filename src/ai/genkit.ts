import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Configuração Central do Genkit v1.x
 * 
 * Atualizado para gemini-1.0-pro para garantir compatibilidade total 
 * com o endpoint v1beta e evitar erros de "model not found".
 */

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.0-pro', 
});
