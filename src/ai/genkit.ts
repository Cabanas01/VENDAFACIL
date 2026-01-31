import { genkit } from 'genkit';
import { googleAI, gemini15Flash } from '@genkit-ai/google-genai';

/**
 * @fileOverview Configuração Central do Genkit v1.x
 * 
 * Centraliza a detecção da chave de API e configura o plugin do Google AI.
 * A chave é lida em runtime para evitar erros de cache de build.
 * Utilizamos a referência 'gemini15Flash' para evitar erros de 404 Not Found.
 */

export const ai = genkit({
  plugins: [
    googleAI({ 
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY 
    })
  ],
  model: gemini15Flash, // Referência oficial do plugin para evitar erros de rota de API
});
