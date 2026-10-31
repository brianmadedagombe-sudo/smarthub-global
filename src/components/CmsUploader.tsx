import { useRef, useState } from 'react';
import { UploadCloud, Trash2, Eye, EyeOff, FileVideo, FileText, Layout, Wrench, GraduationCap } from 'lucide-react';
import type { AppApi } from '@/hooks/useApp';
import type { DigitalProduct } from '@/lib/types';
import { sanitize, uid } from '@/lib/security';
import { Card, Button, Field, inputClass } from '@/components/ui';
import { toast } from '@/components/Toast';

const CATEGORIES: { id: DigitalProduct['category']; label: string; icon: typeof FileVideo }[] = [
  { id: 'video', label: 'Video', icon: FileVideo },
  { id: 'ebook', label: 'eBook', icon: FileText },
  { id: 'template', label: 'Template', icon: Layout },
  { id: 'service', label: 'Service', icon: Wrench },
  { id: 'course', label: 'Course', icon: GraduationCap },
];

export function CmsUploader({ api }: { api: AppApi }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DigitalProduct['category']>('video');
  const [priceKes, setPriceKes] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast('File too large — max 50 MB.', 'error');
      return;
    }
    setFileName(sanitize(file.name));
    setFileSize(file.size);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const publish = () => {
    const cleanTitle = sanitize(title);
    if (!cleanTitle) {
      toast('Add a product title.', 'error');
      return;
    }
    if (!priceKes || !/^\d+(\.\d+)?$/.test(priceKes) || Number(priceKes) <= 0) {
      toast('Enter a valid price in KES.', 'error');
      return;
    }
    const product: DigitalProduct = {
      id: uid('prod'),
      title: cleanTitle,
      description: sanitize(description),
      category,
      priceKes: Math.round(Number(priceKes)),
      fileName: sanitize(fileName),
      fileSize,
      published: true,
      createdAt: new Date().toISOString(),
    };
    api.patch((p) => ({ ...p, products: [product, ...p.products] }));
    setTitle('');
    setDescription('');
    setPriceKes('');
    setFileName('');
    setFileSize(0);
    toast('Product published to your store.');
  };

  const saveDraft = () => {
    const cleanTitle = sanitize(title);
    if (!cleanTitle) {
      toast('Add a product title to save a draft.', 'error');
      return;
    }
    const product: DigitalProduct = {
      id: uid('prod'),
      title: cleanTitle,
      description: sanitize(description),
      category,
      priceKes: priceKes ? Math.round(Number(priceKes)) : 0,
      fileName: sanitize(fileName),
      fileSize,
      published: false,
      createdAt: new Date().toISOString(),
    };
    api.patch((p) => ({ ...p, products: [product, ...p.products] }));
    setTitle('');
    setDescription('');
    setPriceKes('');
    setFileName('');
    setFileSize(0);
    toast('Draft saved (unpublished).');
  };

  const togglePublish = (id: string) =>
    api.patch((p) => ({
      ...p,
      products: p.products.map((prod) => (prod.id === id ? { ...prod, published: !prod.published } : prod)),
    }));

  const remove = (id: string) =>
    api.patch((p) => ({ ...p, products: p.products.filter((prod) => prod.id !== id) }));

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition ${
            dragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
              : 'border-slate-300 hover:border-slate-400 dark:border-slate-700'
          }`}
        >
          <UploadCloud className="h-10 w-10 text-slate-400" />
          <div className="text-sm font-semibold">Drag & drop your file here</div>
          <div className="text-xs text-slate-400">or click to browse — max 50 MB</div>
          {fileName && (
            <div className="mt-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium dark:bg-slate-800">
              {fileName} {fileSize > 0 && `(${formatBytes(fileSize)})`}
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title">
            <input className={inputClass} value={title} onChange={(e) => setTitle(sanitize(e.target.value))} placeholder="e.g. Cinematic LUTs Pack" />
          </Field>
          <Field label="Price (KES)">
            <input type="number" min={0} className={inputClass} value={priceKes} onChange={(e) => setPriceKes(sanitize(e.target.value))} placeholder="e.g. 1500" />
          </Field>
        </div>

        <Field label="Description">
          <textarea className={inputClass} rows={3} value={description} onChange={(e) => setDescription(sanitize(e.target.value))} placeholder="What's included, who it's for, format…" />
        </Field>

        <Field label="Category">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-sm font-medium transition ${
                    active
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {c.label}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="flex gap-2">
          <Button fullWidth onClick={publish}>Publish to store</Button>
          <Button variant="secondary" onClick={saveDraft}>Save draft</Button>
        </div>
      </Card>

      {/* Product list */}
      {api.state.products.length > 0 && (
        <Card>
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Your products ({api.state.products.length})</div>
          <ul className="space-y-2">
            {api.state.products.map((prod) => (
              <li key={prod.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{prod.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      prod.published
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {prod.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {CATEGORIES.find((c) => c.id === prod.category)?.label} · KES {prod.priceKes.toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => togglePublish(prod.id)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label={prod.published ? 'Unpublish' : 'Publish'}
                  >
                    {prod.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => remove(prod.id)}
                    className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
