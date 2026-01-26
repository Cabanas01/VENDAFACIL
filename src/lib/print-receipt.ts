'use client';

import { generateReceiptHTML } from '@/components/receipt/receipt-template';
import type { Sale, Store } from '@/lib/types';

export function printReceipt(sale: Sale, store: Store) {
  // We can get settings from store.settings if we want to make width configurable
  const receiptWidth = store.settings?.receiptWidth === '58mm' ? '58mm' : '80mm';
  const html = generateReceiptHTML(sale, store, receiptWidth);

  const printWindow = window.open('', '_blank', 'width=300,height=500');
  if (!printWindow) {
    alert('Não foi possível abrir a janela de impressão. Verifique se o seu navegador está bloqueando pop-ups.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.focus();

  // Use a timeout to ensure all content and styles are loaded before printing
  setTimeout(() => {
    try {
      printWindow.print();
    } finally {
      // Use another timeout to ensure the print dialog has been processed
      // before closing the window, especially in browsers like Firefox.
      setTimeout(() => {
        printWindow.close();
      }, 500);
    }
  }, 300);
}
