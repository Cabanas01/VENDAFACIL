import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Configuração Central do Genkit v1.x
 * 
 * Inicialização que permite o uso dinâmico da chave de API.
 * As chaves secretas não são expostas ao cliente.
 */

const apiKey = process.env.GOOGLE_GENAI_API_KEY || 
               process.env.GEMINI_API_KEY || 
               process.env.GOOGLE_API_KEY;

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: apiKey || 'UNDEFINED' })
  ],
  model: 'googleai/gemini-1.5-flash',
});
