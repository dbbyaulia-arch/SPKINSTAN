import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'] });

export const metadata: Metadata = {
  // Tambahkan metadataBase agar resolusi URL Next.js konsisten
  metadataBase: new URL('https://www.spkinstan.my.id'),
  title: 'SPKInstan',
  description: 'Buat dokumen SPK, NDA, dan BAST hukum perdata Indonesia secara instan tanpa registrasi.',
  openGraph: {
    title: 'SPKInstan - LegalTech Platform',
    description: 'Buat dokumen SPK, NDA, dan BAST hukum perdata Indonesia secara instan.',
    url: 'https://www.spkinstan.my.id',
    siteName: 'SPKInstan',
    type: 'website',
  },
  verification: {
    google: 'E7yGOswW_pAZnFjX0NHo85CLGSiRKKFXaM_qDSSbax4',
  },
icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' }, // Untuk browser biasa (Chrome, Firefox, Edge)
    ],
    apple: [
      { url: '/apple-icon.png?v=2', sizes: '180x180', type: 'image/png' }, // Wajib PNG untuk Apple Ecosystem
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <html lang="id">
      {/* Tag <head> manual dihapus agar Next.js mengelola metadata secara bersih */}
      <body className={plusJakartaSans.className}>
        {pixelId && (
          <Script
            id="meta-pixel-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${pixelId}');
                fbq('track', 'PageView');
              `,
            }}
          />
        )}
        {children}
        <Analytics />
      </body>
    </html>
  );
}