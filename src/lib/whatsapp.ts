import type { Invoice, DigitalProduct } from '@/lib/types';

function formatMoney(currency: string, amount: number): string {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildInvoiceWhatsAppMessage(inv: Invoice): string {
  const total = inv.items.reduce((s, it) => s + it.qty * it.price, 0);
  const lines = [
    `*SmartHub ${inv.kind === 'quote' ? 'Quote' : 'Invoice'}*`,
    `Number: ${inv.number}`,
    `Date: ${inv.date}`,
    `Due: ${inv.dueDate}`,
    ``,
    `*From:* ${inv.ownerName || '—'}`,
    `*Bill To:* ${inv.clientName || '—'}`,
    ``,
    `*Items:*`,
    ...inv.items
      .filter((it) => it.description.trim())
      .map((it) => `• ${it.description} x${it.qty} — ${formatMoney(inv.currency, it.qty * it.price)}`),
    ``,
    `*Total: ${formatMoney(inv.currency, total)}*`,
    ``,
    inv.notes ? `Notes: ${inv.notes}` : '',
    `Status: ${inv.status}`,
    ``,
    `— Sent via SmartHub Global`,
  ].filter(Boolean);
  return lines.join('\n');
}

export function buildSaleWhatsAppMessage(product: DigitalProduct, buyerEmail: string): string {
  const lines = [
    `*SmartHub Store — Payment Receipt*`,
    ``,
    `Product: ${product.title}`,
    `Category: ${product.category}`,
    `Price: KES ${product.priceKes.toLocaleString()}`,
    `Buyer: ${buyerEmail}`,
    `Date: ${new Date().toLocaleString()}`,
    ``,
    `Thank you for your purchase!`,
    `— Sent via SmartHub Global`,
  ];
  return lines.join('\n');
}

export function buildWhatsAppLink(phone: string | undefined, message: string): string {
  const encoded = encodeURIComponent(message);
  if (phone) {
    const clean = phone.replace(/[^\d]/g, '');
    return `https://wa.me/${clean}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

export function openWhatsApp(link: string) {
  window.open(link, '_blank', 'noopener,noreferrer');
}
