// Encode all untrusted strings to defend against XSS when injecting into the DOM.
export function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Strip control chars and trim. Use before persistence and before AI calls.
export function sanitize(input: string): string {
  return String(input ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();
}

// Strip control chars only, keeping spaces so live typing isn't trimmed.
export function sanitizeInput(input: string): string {
  return String(input ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, '');
}

// Validate a URL is http(s) or tel: or mailto: — blocks javascript: schemes.
export function isSafeUrl(url: string): boolean {
  const u = String(url ?? '').trim();
  if (!u) return false;
  return /^https?:\/\//i.test(u) || /^tel:/i.test(u) || /^mailto:/i.test(u) || /^https:\/\/wa\.me\//i.test(u);
}

// Format a Kenyan/intl phone into digits for wa.me / tel links.
export function phoneDigits(phone: string): string {
  return String(phone ?? '').replace(/[^\d+]/g, '');
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Mask an email for public display: "brian.gombe@gmail.com" -> "b***@gmail.com"
export function maskEmail(email: string): string {
  const e = String(email ?? '').trim();
  if (!e || !e.includes('@')) return '';
  const [user, domain] = e.split('@');
  if (!user || !domain) return '';
  const head = user[0] ?? '';
  return `${head}${'•'.repeat(Math.max(2, user.length - 1))}@${domain}`;
}

// Mask a phone number for public display: "+254757834883" -> "+254•••••883"
export function maskPhone(phone: string): string {
  const p = String(phone ?? '').trim();
  if (!p) return '';
  if (p.length <= 4) return p;
  const head = p.slice(0, Math.max(3, p.length - 4));
  const tail = p.slice(-3);
  return `${head}${'•'.repeat(4)}${tail}`;
}
