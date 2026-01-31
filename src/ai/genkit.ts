import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Configuração Central do Genkit v1.x
 * 
 * O Genkit é inicializado aqui. As variáveis de ambiente GOOGLE_GENAI_API_KEY 
 * ou GEMINI_API_KEY devem estar presentes no ambiente do servidor.
 */

// Centralizamos a detecção da chave para evitar problemas de carregamento no Next.js
const getApiKey = () => {
  return process.env.GOOGLE_GENAI_API_KEY || 
         process.env.GEMINI_API_KEY || 
         process.env.GOOGLE_API_KEY;
};

export const ai = genkit({
  plugins: [
    googleAI({ 
      apiKey: getApiKey() 
    })
  ],
  model: 'googleai/gemini-1.5-flash',
});
