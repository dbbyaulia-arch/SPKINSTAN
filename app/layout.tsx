import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SPKInstan - Generator Perjanjian Kerja Sama Digital Resmi',
  description: 'Buat dokumen SPK, NDA, dan BAST hukum perdata Indonesia secara instan tanpa registrasi.',
  openGraph: {
    title: 'SPKInstan - LegalTech Platform',
    description: 'Buat dokumen SPK, NDA, dan BAST hukum perdata Indonesia secara instan.',
    url: 'https://spkinstan.my.id',
    siteName: 'SPKInstan',
    type: 'website',
  },
  // TAMBAHKAN BAGIAN INI:
  verification: {
    google: 'E7yGOswW_pAZnFjX0NHo85CLGSiRKKFXaM_qDSSbax4',
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
      <head>
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
      </head>
      <body className={plusJakartaSans.className}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}