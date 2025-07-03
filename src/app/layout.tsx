import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'Veritas',
  description: 'Veritas - Sondaggi interattivi per la verità.',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
        { url: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
        { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
        { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [
        { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ]
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
