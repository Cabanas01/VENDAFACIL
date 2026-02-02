'use client';

import type { Sale, Store } from '@/lib/types';

const paymentMethodLabels = {
  dinheiro: 'DINHEIRO',
  pix: 'PIX QR CODE',
  cartao: 'CARTÃO DÉBITO/CRÉDITO',
  cash: 'DINHEIRO',
  card: 'CARTÃO',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100);
};

export function generateReceiptHTML(
  sale: Sale,
  store: Store,
  width: '80mm' | '58mm' = '80mm',
  comandaInfo?: { numero: number; mesa: string; cliente: string }
): string {
  // Garantia de que items existe para evitar erro de compilação/execução
  const items = sale.items || [];
  
  const receiptItems = items
    .map(
      (item) => `
    <div class="item">
      <div class="item-name">${item.product_name_snapshot}</div>
      <div class="item-details">
        <span>${item.quantity} x ${formatCurrency(item.unit_price_cents)}</span>
        <span class="item-price">${formatCurrency(item.subtotal_cents)}</span>
      </div>
    </div>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>VendaFácil - Cupom Não Fiscal</title>
  <style>
    @page { size: ${width} auto; margin: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: ${width};
      padding: 5mm;
      box-sizing: border-box;
      font-size: 12px;
      color: #000;
      line-height: 1.2;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .header { font-size: 14px; margin-bottom: 5px; }
    .line { border-top: 1px dashed #000; margin: 8px 0; }
    .item { margin-bottom: 5px; }
    .item-name { text-transform: uppercase; font-weight: bold; }
    .item-details { display: flex; justify-content: space-between; font-size: 11px; }
    .total-row { display: flex; justify-content: space-between; font-size: 16px; margin-top: 10px; }
    .footer { margin-top: 15px; font-size: 10px; }
    .info-section { font-size: 11px; margin-bottom: 5px; }
  </style>
</head>
<body>
  <div class="center header bold">${store.name}</div>
  <div class="center info-section">${store.legal_name || ''}</div>
  <div class="center info-section">CNPJ: ${store.cnpj || ''}</div>
  <div class="center info-section">${store.phone || ''}</div>

  <div class="line"></div>
  <div class="center bold">CUPOM NÃO FISCAL</div>
  <div class="center">${new Date(sale.created_at || new Date()).toLocaleString('pt-BR')}</div>
  <div class="line"></div>

  ${comandaInfo ? `
    <div class="info-section"><b>COMANDA:</b> #${comandaInfo.numero}</div>
    <div class="info-section"><b>MESA:</b> ${comandaInfo.mesa || 'Balcão'}</div>
    <div class="info-section"><b>CLIENTE:</b> ${comandaInfo.cliente || 'Consumidor'}</div>
    <div class="line"></div>
  ` : ''}

  <div class="bold">DESCRIÇÃO DOS ITENS</div>
  ${receiptItems || '<div class="center">Nenhum item registrado</div>'}

  <div class="line"></div>
  <div class="total-row bold">
    <span>TOTAL GERAL</span>
    <span>${formatCurrency(sale.total_cents)}</span>
  </div>
  <div class="line"></div>

  <div class="bold">PAGAMENTO: ${paymentMethodLabels[sale.payment_method as keyof typeof paymentMethodLabels] || (sale.payment_method || 'NÃO INFORMADO').toUpperCase()}</div>

  <div class="center footer">
    <div>VendaFácil Brasil - Automação Comercial</div>
    <div>www.vendafacilbrasil.shop</div>
    <br/>
    <div class="bold">OBRIGADO PELA PREFERÊNCIA!</div>
  </div>
</body>
</html>
`;
}
