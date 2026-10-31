// Paystack inline checkout helper. Loads the Paystack inline script on demand
// and resolves with the transaction reference on success. No secrets here —
// only the public key is used client-side, which is safe by design.

let scriptLoaded = false;
let loadPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://js.paystack.co/v1/inline.js';
    s.async = true;
    s.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    s.onerror = () => reject(new Error('Failed to load Paystack checkout.'));
    document.head.appendChild(s);
  });
  return loadPromise;
}

export interface CheckoutParams {
  email: string;
  amountKes: number; // Paystack expects the amount in the smallest currency unit (kobo/cents). We send KES * 100.
  key: string;
  metadata?: Record<string, string>;
  onSuccess: (ref: string) => void;
  onClose: () => void;
}

export async function openCheckout(params: CheckoutParams): Promise<void> {
  try {
    await loadScript();
  } catch {
    params.onClose();
    return;
  }
  const handler = (window as unknown as { PaystackPop?: { setup: (o: Record<string, unknown>) => { openIframe: () => void } } }).PaystackPop;
  if (!handler) {
    params.onClose();
    return;
  }
  const popup = handler.setup({
    key: params.key,
    email: params.email,
    amount: Math.round(params.amountKes * 100),
    currency: 'KES',
    metadata: params.metadata ?? {},
    callback: (response: { reference: string }) => params.onSuccess(response.reference),
    onClose: params.onClose,
  });
  popup.openIframe();
}
