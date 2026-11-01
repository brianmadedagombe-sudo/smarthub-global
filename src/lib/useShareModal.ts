import { useState } from 'react';

export function useShareModal() {
  const [open, setOpen] = useState(false);
  return { open, setOpen, openShare: () => setOpen(true) };
}
