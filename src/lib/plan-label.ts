
'use client';

/**
 * Retorna o rótulo de exibição amigável para um tipo de plano do banco de dados.
 * Mapeia as chaves originais em inglês para rótulos em português.
 */
export function getPlanLabel(planoTipo?: string | null): string {
  if (!planoTipo) {
    return '-';
  }
  
  switch (planoTipo) {
    case 'monthly':
      return 'Mensal';
    case 'yearly':
      return 'Anual';
    case 'weekly':
      return 'Semanal';
    case 'free':
      return 'Avaliação';
    case 'vitalicio':
      return 'Vitalício';
    default:
      return planoTipo.charAt(0).toUpperCase() + planoTipo.slice(1);
  }
}
