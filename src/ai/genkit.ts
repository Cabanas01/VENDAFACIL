import { config } from 'dotenv';
config(); // Força o carregamento do .env antes de qualquer plugin

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Configuração Central do Genkit v1.x
 * 
 * Inicialização robusta que garante o carregamento da chave de API
 * antes de qualquer fluxo ser executado.
 */

// Tentamos obter a chave de múltiplas variáveis de ambiente comuns
const apiKey = process.env.GOOGLE_GENAI_API_KEY || 
               process.env.GEMINI_API_KEY || 
               process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.warn('[GENKIT] Erro Crítico: Nenhuma chave de API (GOOGLE_GENAI_API_KEY ou GEMINI_API_KEY) foi detectada no process.env.');
}

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: apiKey || 'MISSING_KEY' })
  ],
  model: 'googleai/gemini-1.5-flash',
});
