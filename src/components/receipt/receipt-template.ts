'use client';

import type { Sale, Store } from '@/lib/types';

// A simple mapping for payment methods to make them more readable
const paymentMethodLabels = {
  cash: 'Dinheiro',
  pix: 'Pix',
  card: 'Cartão',
};

// Helper to format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100);
};

export function generateReceiptHTML(
  sale: Sale,
  store: Store,
  width: '80mm' | '58mm' = '80mm'
): string {
  const receiptItems = sale.items
    .map(
      (item) => `
    <div class="item">
      <div class="item-name">${item.quantity}x ${item.product_name_snapshot}</div>
      <div class="item-price">${formatCurrency(item.subtotal_cents)}</div>
    </div>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Comprovante de Venda</title>
  <style>
    @page {
      size: ${width} auto;
      margin: 0;
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: ${width};
      padding: 4mm;
      box-sizing: border-box;
      font-size: 10px;
      color: #000;
    }
    .center {
      text-align: center;
    }
    .header {
      font-weight: bold;
      text-transform: uppercase;
    }
    .line {
      border-top: 1px dashed #000;
      margin: 5px 0;
    }
    .item {
      display: flex;
      justify-content: space-between;
    }
    .item-name {
      flex: 1;
      text-align: left;
      margin-right: 10px;
      word-break: break-word;
    }
    .item-price {
      text-align: right;
    }
    .total {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      font-size: 12px;
    }
    .footer {
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="center header">
    <div>${store.name}</div>
    ${store.phone ? `<div>${store.phone}</div>` : ''}
  </div>

  <div class="line"></div>
  <div>Cupom não fiscal</div>
  <div>${new Date(sale.created_at).toLocaleString('pt-BR')}</div>
  <div class="line"></div>

  ${receiptItems}

  <div class="line"></div>
  <div class="total">
    <span>TOTAL</span>
    <span>${formatCurrency(sale.total_cents)}</span>
  </div>
  <div class="line"></div>

  <div class="center footer">
    <div>Forma de pagamento: ${paymentMethodLabels[sale.payment_method]}</div>
    <br/>
    <div>Obrigado pela preferência!</div>
  </div>
</body>
</html>
`;
}
