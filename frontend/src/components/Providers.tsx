'use client';

import { ReactNode } from 'react';
import { WalletWrapper } from './wallet/WalletWrapper';
import { ThemeProvider } from './ThemeProvider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <WalletWrapper>
        {children}
      </WalletWrapper>
    </ThemeProvider>
  );
}
