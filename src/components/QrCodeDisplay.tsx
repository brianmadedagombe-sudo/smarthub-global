import { useMemo } from 'react';
import { Download, QrCode } from 'lucide-react';
import { sanitize } from '@/lib/security';
import { Button } from '@/components/ui';
import { toast } from '@/components/Toast';

interface QrCodeDisplayProps {
  value: string;
  size?: number;
  label?: string;
  downloadName?: string;
}

export function QrCodeDisplay({ value, size = 200, label, downloadName = 'smarthub-qr' }: QrCodeDisplayProps) {
  const src = useMemo(() => {
    const data = sanitize(value) || ' ';
    const params = new URLSearchParams({
      data,
      size: `${size}x${size}`,
      color: '000000',
      bgcolor: 'ffffff',
    });
    return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
  }, [value, size]);

  const download = async () => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${downloadName}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast('QR code downloaded.');
    } catch {
      window.open(src, '_blank', 'noopener,noreferrer');
      toast('Opened QR in a new tab — long-press or right-click to save.', 'info');
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700">
        <img src={src} alt={label ?? 'QR code'} width={size} height={size} className="h-auto w-full max-w-[200px]" />
      </div>
      {label && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <QrCode className="h-3.5 w-3.5" /> {label}
        </div>
      )}
      <Button variant="secondary" onClick={download} icon={<Download className="h-4 w-4" />} className="text-xs">
        Download QR
      </Button>
    </div>
  );
}
