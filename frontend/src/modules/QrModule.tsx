import { useMemo, useState } from 'react';
import { Download, QrCode } from 'lucide-react';
import { sanitize } from '@/lib/security';
import { Button, Card, Field, inputClass, SectionTitle } from '@/components/ui';
import { toast } from '@/components/Toast';

const SIZES = [128, 256, 512];

export function QrModule() {
  const [value, setValue] = useState('https://smarthub.global');
  const [size, setSize] = useState(256);
  const [color, setColor] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');

  // Use the public, dependency-free goqr API for the rendered image. Input is
  // sanitized and encoded; the URL is constructed strictly (no user-controlled
  // scheme), so only the data payload reaches the QR service.
  const src = useMemo(() => {
    const data = sanitize(value) || ' ';
    const params = new URLSearchParams({
      data,
      size: `${size}x${size}`,
      color: color.replace('#', ''),
      bgcolor: bg.replace('#', ''),
    });
    return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
  }, [value, size, color, bg]);

  const download = async () => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smarthub-qr-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast('QR code downloaded.');
    } catch {
      // Fallback: open the image in a new tab so the user can save it manually.
      window.open(src, '_blank', 'noopener,noreferrer');
      toast('Opened the QR image in a new tab — long-press or right-click to save.', 'info');
    }
  };

  return (
    <div className="space-y-5">
      <SectionTitle title="Dynamic QR Generator" subtitle="Turn a URL, payment detail, or contact into a downloadable QR code graphic." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-3">
          <Field label="Content to encode" hint="Paste a link, M-Pesa till number, Wi-Fi detail, or any text.">
            <textarea className={inputClass} rows={4} value={value} onChange={(e) => setValue(sanitize(e.target.value))} />
          </Field>
          <Field label="Size">
            <div className="flex gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${size === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
                >
                  {s}px
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Foreground">
              <input type="color" className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700" value={color} onChange={(e) => setColor(e.target.value)} />
            </Field>
            <Field label="Background">
              <input type="color" className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700" value={bg} onChange={(e) => setBg(e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card className="flex flex-col items-center justify-center gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700">
            <img src={src} alt="Generated QR code" width={size} height={size} className="h-auto w-48 sm:w-56" />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <QrCode className="h-4 w-4" /> Encodes: {value.slice(0, 40) || '—'}
          </div>
          <Button onClick={download} icon={<Download className="h-4 w-4" />}>Download PNG</Button>
        </Card>
      </div>
    </div>
  );
}
