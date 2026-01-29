
'use client';

/**
 * Retorna o rótulo de exibição amigável para um tipo de plano do banco de dados.
 * @param planoTipo O valor do campo 'plano_tipo' do banco (ex: 'mensal', 'anual').
 * @returns O rótulo formatado para a UI (ex: 'Mensal', 'Anual').
 */
export function getPlanLabel(planoTipo?: string | null): string {
  if (!planoTipo) {
    return '-';
  }
  
  switch (planoTipo) {
    case 'mensal':
      return 'Mensal';
    case 'anual':
      return 'Anual';
    case 'semanal':
      return 'Semanal';
    case 'free':
      return 'Gratuito';
    case 'trial':
      return 'Avaliação';
    default:
      return 'N/A';
  }
}
