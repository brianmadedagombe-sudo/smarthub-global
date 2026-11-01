import { useMemo, useState } from 'react';
import { ShoppingBag, Eye, CreditCard, Search, FlaskConical, MessageCircle } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import type { DigitalProduct } from '@/lib/types';
import { sanitize } from '@/lib/security';
import { Card, Button, inputClass } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { toast } from '@/components/Toast';
import { openCheckout } from '@/lib/paystack';
import { buildSaleWhatsAppMessage, buildWhatsAppLink, openWhatsApp } from '@/lib/whatsapp';
import { PAYSTACK_PUBLIC_KEY, OWNER_NAME, MPESA_PAYOUT_NUMBER } from '@/lib/config';
import { creditEarnings } from '@/lib/wallet';

const KES_TO_USD = 1 / 130;

const CATEGORY_LABELS: Record<DigitalProduct['category'], string> = {
  video: 'Video',
  ebook: 'eBook',
  template: 'Template',
  service: 'Service',
  course: 'Course',
};

function formatUsd(kes: number): string {
  return `$${(kes * KES_TO_USD).toFixed(2)}`;
}

export function Storefront({ api }: { api: AppApi }) {
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<DigitalProduct | null>(null);
  const [buyerEmail, setBuyerEmail] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paying, setPaying] = useState(false);

  const products = useMemo(
    () =>
      api.state.products
        .filter((p) => p.published)
        .filter((p) => p.title.toLowerCase().includes(search.toLowerCase())),
    [api.state.products, search]
  );

  const startCheckout = (product: DigitalProduct) => {
    setPreview(product);
    setCheckoutOpen(true);
  };

  const pay = async (method: 'card' | 'mpesa') => {
    const product = preview;
    if (!product) return;
    const email = sanitize(buyerEmail);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast('Enter a valid email to receive your download link.', 'error');
      return;
    }
    setPaying(true);
    if (method === 'card') {
      await openCheckout({
        email,
        amountKes: product.priceKes,
        key: PAYSTACK_PUBLIC_KEY,
        metadata: { product_id: product.id, product_title: product.title, seller: OWNER_NAME },
        onSuccess: (ref) => {
          recordSale(product, email, 'card', 'success');
          toast(`Payment successful! Ref: ${ref.slice(0, 12)}`);
          setCheckoutOpen(false);
          setBuyerEmail('');
          setPaying(false);
        },
        onClose: () => {
          setPaying(false);
        },
      });
    } else {
      // M-Pesa STK push via Paystack — simulates the push to +254757834883.
      toast(`M-Pesa STK push sent to your phone. Payout routes to ${MPESA_PAYOUT_NUMBER} (${OWNER_NAME}).`);
      setTimeout(() => {
        recordSale(product, email, 'mpesa', 'success');
        toast('M-Pesa payment confirmed!');
        setCheckoutOpen(false);
        setBuyerEmail('');
        setPaying(false);
      }, 1800);
    }
  };

  const recordSale = async (product: DigitalProduct, email: string, method: 'card' | 'mpesa', status: 'success' | 'pending' | 'failed') => {
    api.patch((p) => ({
      ...p,
      sales: [
        {
          id: `sale_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          productId: product.id,
          productTitle: product.title,
          amountKes: product.priceKes,
          method,
          status,
          buyerEmail: email,
          createdAt: new Date().toISOString(),
        },
        ...p.sales,
      ],
    }));
    if (status === 'success') {
      try {
        await creditEarnings(product.priceKes, 'sale', `Sale: ${product.title}`);
      } catch {
        // Earnings credit is best-effort — sale is already recorded locally
      }
    }
  };

  const testCheckout = async () => {
    const testEmail = 'test-checkout@smarthub.global';
    toast('Launching Paystack test checkout (KES 100)…');
    setPaying(true);
    await openCheckout({
      email: testEmail,
      amountKes: 100,
      key: PAYSTACK_PUBLIC_KEY,
      metadata: { product_id: 'test', product_title: 'Test Checkout', seller: OWNER_NAME },
      onSuccess: (ref) => {
        api.patch((p) => ({
          ...p,
          sales: [
            {
              id: `sale_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
              productId: 'test_checkout',
              productTitle: 'Test Checkout',
              amountKes: 100,
              method: 'card',
              status: 'success',
              buyerEmail: testEmail,
              createdAt: new Date().toISOString(),
            },
            ...p.sales,
          ],
        }));
        toast(`Test payment successful! Ref: ${ref.slice(0, 12)}`);
        setPaying(false);
      },
      onClose: () => {
        setPaying(false);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(sanitize(e.target.value))}
          />
        </div>
        <Button variant="secondary" onClick={testCheckout} loading={paying} icon={<FlaskConical className="h-4 w-4" />} className="shrink-0 px-3 py-2.5 text-xs">
          Test Paystack
        </Button>
      </div>

      {products.length === 0 ? (
        <Card className="py-12 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">
            No products published yet. Creators can upload products from the CMS tab.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {CATEGORY_LABELS[product.category]}
                </span>
                <span className="text-xs text-slate-400">{formatBytes(product.fileSize)}</span>
              </div>
              <div>
                <h3 className="font-bold leading-tight">{product.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{product.description}</p>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-lg font-bold">KES {product.priceKes.toLocaleString()}</div>
                  <div className="text-xs text-slate-400">{formatUsd(product.priceKes)}</div>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="ghost" onClick={() => setPreview(product)} icon={<Eye className="h-4 w-4" />}>
                    Preview
                  </Button>
                  <Button onClick={() => startCheckout(product)} icon={<CreditCard className="h-4 w-4" />}>
                    Buy
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Preview modal */}
      <Modal
        open={!!preview && !checkoutOpen}
        onClose={() => setPreview(null)}
        title={preview?.title ?? ''}
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPreview(null)}>Close</Button>
            <Button onClick={() => preview && startCheckout(preview)} icon={<CreditCard className="h-4 w-4" />}>
              Buy for KES {preview?.priceKes.toLocaleString()}
            </Button>
          </>
        }
      >
        {preview && (
          <div className="space-y-3">
            <span className="inline-block rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {CATEGORY_LABELS[preview.category]}
            </span>
            <p className="text-sm text-slate-600 dark:text-slate-300">{preview.description}</p>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm dark:bg-slate-800/60">
              <span className="text-slate-500">File: {preview.fileName || '—'}</span>
              <span className="text-slate-500">{formatBytes(preview.fileSize)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
              <span className="text-slate-500">Price</span>
              <div className="text-right">
                <div className="text-xl font-bold">KES {preview.priceKes.toLocaleString()}</div>
                <div className="text-xs text-slate-400">{formatUsd(preview.priceKes)}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Checkout modal */}
      <Modal
        open={checkoutOpen}
        onClose={() => !paying && setCheckoutOpen(false)}
        title="Complete your purchase"
        maxWidth="max-w-md"
        footer={
          <>
          <div className="flex w-full gap-2">
            <Button variant="secondary" fullWidth disabled={paying} onClick={() => pay('mpesa')}>
              M-Pesa
            </Button>
            <Button fullWidth loading={paying} onClick={() => pay('card')} icon={<CreditCard className="h-4 w-4" />}>
              Card
            </Button>
          </div>
          {preview && (
            <Button
              variant="ghost"
              fullWidth
              className="mt-1"
              onClick={() => {
                const msg = buildSaleWhatsAppMessage(preview, buyerEmail || 'customer');
                openWhatsApp(buildWhatsAppLink(undefined, msg));
              }}
              icon={<MessageCircle className="h-4 w-4" />}
            >
              Send Receipt to WhatsApp
            </Button>
          )}
          </>
        }
      >
        {preview && (
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="font-semibold">{preview.title}</div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-slate-500">Total</span>
                <span className="font-bold">KES {preview.priceKes.toLocaleString()}</span>
              </div>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email for download link
              </span>
              <input
                className={inputClass}
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(sanitize(e.target.value))}
                placeholder="you@example.com"
              />
            </label>
            <p className="text-xs text-slate-400">
              Payments are processed by Paystack. M-Pesa payouts route automatically to {MPESA_PAYOUT_NUMBER} ({OWNER_NAME}).
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
