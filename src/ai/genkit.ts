import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Configuração Central do Genkit v1.x
 * 
 * Utilizamos a inicialização padrão que busca automaticamente a chave 
 * GOOGLE_GENAI_API_KEY no ambiente.
 */

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash', 
});
