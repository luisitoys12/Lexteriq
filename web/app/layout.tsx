import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Lexteriq — YouTube SEO Intelligence',
  description: 'Analiza, optimiza y domina YouTube con inteligencia SEO en tiempo real. La alternativa a VidIQ hecha para creadores hispanohablantes.',
  keywords: 'youtube seo, keyword research, video optimization, lexteriq',
  openGraph: {
    title: 'Lexteriq — YouTube SEO Intelligence',
    description: 'Analiza y optimiza tus videos de YouTube con métricas en tiempo real',
    url: 'https://lexteriq.vercel.app',
    siteName: 'Lexteriq',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
