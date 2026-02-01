'use client';

/**
 * Retorna o rótulo de exibição amigável para um tipo de plano do banco de dados.
 * Mapeia as chaves originais (inglês ou português lowercase) para rótulos em português.
 */
export function getPlanLabel(planoTipo?: string | null): string {
  if (!planoTipo) {
    return 'Sem Plano';
  }
  
  const normalized = planoTipo.toLowerCase();
  
  switch (normalized) {
    case 'mensal':
    case 'monthly':
      return 'Mensal';
    case 'anual':
    case 'yearly':
      return 'Anual';
    case 'semanal':
    case 'weekly':
      return 'Semanal';
    case 'trial':
    case 'free':
    case 'avaliacao':
      return 'Avaliação';
    case 'vitalicio':
      return 'Vitalício';
    default:
      return planoTipo.charAt(0).toUpperCase() + planoTipo.slice(1);
  }
}
