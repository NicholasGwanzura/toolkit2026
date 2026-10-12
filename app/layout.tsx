import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';
import { AuthProvider } from '@/lib/auth';
import { EmergencyModeProvider } from '@/lib/emergencyMode';
import { I18nProvider } from '@/lib/i18n';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'HEVACRAZ - HVAC-R Association Zimbabwe',
  description: 'HVAC-R Association of Zimbabwe - Professional Training & Compliance Platform',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-icon.png', type: 'image/png', sizes: '180x180' }],
  },
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="min-h-screen bg-white text-[#1C1917] antialiased font-sans">
        <I18nProvider>
          <EmergencyModeProvider>
            <AuthProvider>
              <ToastProvider>
                <OfflineBanner />
                <ServiceWorkerRegistrar />
                {children}
              </ToastProvider>
            </AuthProvider>
          </EmergencyModeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
