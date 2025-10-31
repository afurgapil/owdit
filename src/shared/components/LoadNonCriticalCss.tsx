'use client';

import { useEffect } from 'react';

export default function LoadNonCriticalCss() {
  useEffect(() => {
    const id = 'noncritical-css';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = '/noncritical.css';
    link.media = 'all';
    document.head.appendChild(link);
  }, []);
  return null;
}


