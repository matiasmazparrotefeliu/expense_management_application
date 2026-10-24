import type { Metadata } from 'next';

import '@/styles/globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Expense Management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
