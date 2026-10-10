import Script from 'next/script';

/** Loads GA4 / Meta Pixel only when their public IDs are configured. */
export function Analytics() {
  const ga = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const gaOk = ga && /^G-[A-Z0-9]+$/.test(ga) && ga !== 'G-XXXXXXXXXX';
  const pixelOk = pixel && /^\d{8,20}$/.test(pixel) && pixel !== '123456789012345';

  return (
    <>
      {gaOk && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga}',{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {pixelOk && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
