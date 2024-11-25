// src/components/ClientLayout.tsx
'use client';

import { AuctionProvider } from '../contexts/AuctionContext';
import { useState, useEffect } from 'react';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <AuctionProvider>
      {children}
    </AuctionProvider>
  );
}