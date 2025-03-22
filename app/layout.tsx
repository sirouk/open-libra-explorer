import './globals.css';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from "next/font/google";
import { BlockchainDataProvider } from './context/BlockchainDataContext';
import { TransactionProvider } from './context/TransactionContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Open Libra Explorer',
  description: 'Blockchain explorer for Open Libra',
  icons: {
    icon: [
      { url: '/images/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/images/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: { url: '/images/apple-touch-icon.png', sizes: '180x180' },
    other: [
      { url: '/images/safari-pinned-tab.svg', rel: 'mask-icon' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-libra-bg`}>
        <BlockchainDataProvider>
          <TransactionProvider>
            {children}
          </TransactionProvider>
        </BlockchainDataProvider>
      </body>
    </html>
  );
}
