import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Configuração Central do Genkit v1.x
 * 
 * Centraliza a detecção da chave de API e configura o plugin do Google AI.
 * A chave é lida em runtime para evitar erros de cache de build.
 */

export const ai = genkit({
  plugins: [
    googleAI({ 
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY 
    })
  ],
  model: 'googleai/gemini-1.5-flash',
});
