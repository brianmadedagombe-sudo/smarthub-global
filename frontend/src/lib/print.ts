// Shared print utility. Renders the print document into a hidden iframe (so it
// bypasses popup blockers and never opens a blank about:blank tab), writes a
// complete HTML document via document.open()/write()/close(), then triggers
// the browser's native print dialog. The iframe is removed after printing.

export interface PrintOptions {
  html: string;
}

let frameCounter = 0;

/**
 * Renders the provided HTML into a hidden iframe and triggers window.print()
 * on that iframe's document. Returns a promise that resolves once the print
 * dialog has been invoked, or rejects with a descriptive error.
 */
export function printDocument({ html }: PrintOptions): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      const id = `print-frame-${frameCounter++}`;
      const iframe = document.createElement('iframe');
      iframe.setAttribute('id', id);
      // Visually hidden but present in the DOM so the browser will print it.
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      const cleanup = () => {
        try {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        } catch {
          // ignore
        }
      };

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) {
        cleanup();
        reject(new Error('Could not create a print document.'));
        return;
      }

      // Write a complete HTML document to the iframe stream.
      doc.open();
      doc.write(html);
      doc.close();

      // Give the browser a frame to parse the document before printing.
      const triggerPrint = () => {
        try {
          const win = iframe.contentWindow;
          if (!win) {
            cleanup();
            resolve();
            return;
          }
          win.focus();
          win.print();
          // Resolve after the print call is dispatched. Some browsers call
          // onafterprint; others don't, so resolve on a short timer.
          setTimeout(() => {
            cleanup();
            resolve();
          }, 400);
        } catch {
          cleanup();
          resolve();
        }
      };

      // Wait for the iframe document to load before printing.
      if (doc.readyState === 'complete') {
        setTimeout(triggerPrint, 50);
      } else {
        const onLoad = () => {
          iframe.removeEventListener('load', onLoad);
          setTimeout(triggerPrint, 50);
        };
        iframe.addEventListener('load', onLoad);
        // Safety timeout in case load never fires.
        setTimeout(() => {
          if (iframe.parentNode) triggerPrint();
        }, 1000);
      }
    } catch {
      reject(new Error('Print failed to start. Please try again.'));
    }
  });
}

// Shared HTML document wrapper for building print-ready pages with professional styling.
export function buildPrintDocument(title: string, bodyHtml: string, extraStyles = ''): string {
  return `<!doctype html><html><head><title>${escapeHtml(title)}</title><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Inter,system-ui,-apple-system,sans-serif;color:#0f172a;padding:48px 40px;max-width:820px;margin:auto;background:#fff}
    .doc-header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #2563eb;padding-bottom:16px;margin-bottom:24px}
    .doc-header .brand{display:flex;align-items:center;gap:10px}
    .doc-header .brand .logo{width:36px;height:36px;border-radius:8px;background:#2563eb;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:18px}
    .doc-header .brand .name{font-size:18px;font-weight:700;color:#0f172a}
    .doc-header .meta{text-align:right;font-size:11px;color:#64748b;line-height:1.6}
    h1{font-size:24px;margin:0 0 6px;font-weight:700}
    h2{font-size:15px;margin:28px 0 10px;font-weight:600;color:#334155}
    .muted{color:#64748b;font-size:13px}
    .subtitle{color:#64748b;font-size:13px;margin-bottom:20px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:20px 0}
    .grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:20px 0}
    table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
    thead th{text-align:left;padding:10px 12px;background:#f1f5f9;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid #cbd5e1}
    tbody td{padding:9px 12px;border-bottom:1px solid #e2e8f0}
    tbody tr:nth-child(even){background:#f8fafc}
    tbody tr:hover{background:#eff6ff}
    .right{text-align:right}
    .tot{margin-top:16px;text-align:right;font-size:20px;font-weight:bold}
    .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:.03em}
    .badge-open{background:#e0f2fe;color:#0369a1}
    .badge-review{background:#fef3c7;color:#92400e}
    .badge-resolved{background:#d1fae5;color:#065f46}
    .badge-declined{background:#fee2e2;color:#991b1b}
    .badge-bug{background:#fee2e2;color:#991b1b}
    .badge-idea{background:#fef3c7;color:#92400e}
    .card{padding:16px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}
    .card .label{font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:.04em}
    .card .value{font-size:24px;font-weight:700;margin-top:4px;color:#0f172a}
    .card .sub{font-size:12px;color:#64748b;margin-top:2px}
    .stat-row{display:flex;gap:14px;margin:20px 0}
    .stat-box{flex:1;padding:14px 16px;border-radius:10px;border:1px solid #e2e8f0}
    .stat-box .num{font-size:28px;font-weight:700;color:#0f172a}
    .stat-box .lbl{font-size:11px;text-transform:uppercase;color:#64748b;margin-top:2px}
    .bar-chart{margin:16px 0}
    .bar-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
    .bar-row .bar-label{font-size:12px;font-weight:600;color:#334155;width:120px;flex-shrink:0}
    .bar-row .bar-track{flex:1;height:22px;background:#f1f5f9;border-radius:6px;overflow:hidden}
    .bar-row .bar-fill{height:100%;border-radius:6px;transition:width .3s;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;font-size:11px;font-weight:600;color:#fff}
    .footer{margin-top:48px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center}
    .section{margin:24px 0}
    .pill{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;background:#eff6ff;color:#2563eb}
    @media print{body{padding:24px 16px}.doc-header{page-break-after:avoid}h1,h2{page-break-after:avoid}table{page-break-inside:auto}tr{page-break-inside:avoid}}
    ${extraStyles}
  </style></head><body>
    <div class="doc-header">
      <div class="brand"><div class="logo">S</div><div class="name">SmartHub Global</div></div>
      <div class="meta">Generated ${new Date().toLocaleString()}<br>Community &amp; Support Hub</div>
    </div>
    ${bodyHtml}
    <div class="footer">Generated by SmartHub Global · ${new Date().toLocaleDateString()}</div>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
