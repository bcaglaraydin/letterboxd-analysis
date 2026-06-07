import type { Metadata, Viewport } from 'next';
import { Playfair_Display, DM_Sans, Lora } from 'next/font/google';
import { GoogleTagManager } from '@next/third-parties/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { DebugControls } from '@/components/debug/DebugControls';
import { StateBridge } from '@/components/debug/StateBridge';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Letterboxd Analysis',
  description: 'Analyze your Letterboxd profile',
  icons: {
    icon: '/logo.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {process.env.NEXT_PUBLIC_GTM_ID && (
        <GoogleTagManager
          gtmId={process.env.NEXT_PUBLIC_GTM_ID}
          auth={process.env.NEXT_PUBLIC_GTM_AUTH}
          preview={process.env.NEXT_PUBLIC_GTM_PREVIEW}
        />
      )}
      <body
        className={cn(
          'h-[100dvh] overflow-hidden bg-background font-sans antialiased',
          playfair.variable,
          lora.variable,
          dmSans.variable,
        )}
      >
        {children}
        {process.env.NODE_ENV === 'development' && <DebugControls />}
        {process.env.NODE_ENV === 'development' && <StateBridge />}
      </body>
    </html>
  );
}
