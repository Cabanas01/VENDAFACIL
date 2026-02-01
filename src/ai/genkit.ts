import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Configuração Central do Genkit v1.x
 * 
 * Utilizamos strings identificadoras para os modelos para garantir 
 * compatibilidade total com o build do Next.js e evitar erros de exportação.
 */

export const ai = genkit({
  plugins: [
    googleAI({ 
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY 
    })
  ],
  model: 'googleai/gemini-1.5-flash', 
});
