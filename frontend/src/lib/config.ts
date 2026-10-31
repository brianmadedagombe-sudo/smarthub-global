// App configuration read from Vite env vars. These are public (VITE_ prefixed)
// and safe to ship to the browser — they contain no secrets.

export const OWNER_EMAIL =
  (import.meta.env.VITE_OWNER_EMAIL as string | undefined) ??
  'brian.madeda.gombe@gmail.com';

export const MPESA_PAYOUT_NUMBER =
  (import.meta.env.VITE_MPESA_PAYOUT_NUMBER as string | undefined) ??
  '+254757834883';

export const PAYSTACK_PUBLIC_KEY =
  (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined) ??
  'pk_test_505dfa8c09631f33deab9';

export const OWNER_NAME = 'Brian Gombe';

export function isOwnerEmail(email: string): boolean {
  return email.trim().toLowerCase() === OWNER_EMAIL;
}

export const COMMUNITY_LINKS = {
  whatsapp: 'https://chat.whatsapp.com/Da85fdG83Lm2FL7k9xD8DJ?s=cl&p=a&mlu=4&ilr=4',
  facebook: 'https://facebook.com/groups/1658229969005207/?mibextid=rS40aB7S9Ucbxw6v',
  supportEmail: 'brian.madeda.gombe@gmail.com',
  supportPhone: '+254757834883',
} as const;
