import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'] });

// Menggunakan ID dari env jika ada, dengan fallback langsung ke Pixel ID '959282193322785'
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '959282193322785';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.spkinstan.my.id'),
  title: 'SPKInstan - LegalTech Platform',
  description: 'Buat dokumen SPK, NDA, dan BAST hukum perdata Indonesia secara instan tanpa registrasi.',
  openGraph: {
    title: 'SPKInstan - LegalTech Platform',
    description: 'Buat dokumen SPK, NDA, dan BAST hukum perdata Indonesia secara instan.',
    url: 'https://www.spkinstan.my.id',
    siteName: 'SPKInstan',
    locale: 'id_ID',
    type: 'website',
  },
  verification: {
    google: 'E7yGOswW_pAZnFjX0NHo85CLGSiRKKFXaM_qDSSbax4',
    other: {
      'facebook-domain-verification': 't492cwwopjqmdtt5il0u1zqu3idn1h',
    },
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        {/* Meta Domain Verification & iOS Safari Touch Icons */}
        <meta name="facebook-domain-verification" content="t492cwwopjqmdtt5il0u1zqu3idn1h" />
        <link 
          rel="apple-touch-icon" 
          sizes="180x180" 
          href="https://www.spkinstan.my.id/apple-touch-icon.png?v=3" 
        />
        <link 
          rel="apple-touch-icon-precomposed" 
          href="https://www.spkinstan.my.id/apple-touch-icon.png?v=3" 
        />
      </head>
      <body className={plusJakartaSans.className}>
        {/* Meta Pixel Script */}
        <Script
          id="fb-pixel"
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
              fbq('init', '${FB_PIXEL_ID}');
              fbq('track', 'PageView');
            `,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>

        {children}

        {/* Vercel Analytics */}
        <Analytics />
      </body>
    </html>
  );
}