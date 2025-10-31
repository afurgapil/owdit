'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

export default function DeferredGA({ id }: { id?: string }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!id) return;

    const enable = () => setEnabled(true);
    const idle = (cb: () => void) => {
      const hasRIC = typeof window !== 'undefined' && 'requestIdleCallback' in window;
      if (hasRIC) {
        const ric = (window as Window & { requestIdleCallback: (callback: () => void) => number }).requestIdleCallback;
        ric(() => cb());
        return;
      }
      setTimeout(cb, 0);
    };

    const onFirstInput = () => {
      idle(() => enable());
      cleanup();
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        idle(() => setEnabled(true));
        document.removeEventListener('visibilitychange', onVisible);
      }
    };

    const cleanup = () => {
      window.removeEventListener('pointerdown', onFirstInput);
      window.removeEventListener('keydown', onFirstInput);
    };

    if (document.visibilityState === 'visible') {
      window.addEventListener('pointerdown', onFirstInput, { once: true });
      window.addEventListener('keydown', onFirstInput, { once: true });
    } else {
      document.addEventListener('visibilitychange', onVisible, { once: true });
    }

    return cleanup;
  }, [id]);

  if (!enabled) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);} 
        gtag('js', new Date());
        gtag('config', '${''}${id}', { send_page_view: false });
      `}</Script>
    </>
  );
}


