import type { Metadata } from "next";
import { Geist, Geist_Mono, Open_Sans, Raleway } from "next/font/google";
import "./globals.css";
import { Layout } from "../shared/components/Layout";
import Script from "next/script";
import ClientRoot from "./ClientRoot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  preload: false,
});

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Owdit - Smart Contract Security Score",
  description:
    "AI-powered smart contract security analysis with real-time verification and risk assessment.",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Owdit - Smart Contract Security Score",
    description:
      "AI-powered smart contract security analysis with real-time verification and risk assessment.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Owdit - Smart Contract Security Score",
    description:
      "AI-powered smart contract security analysis with real-time verification and risk assessment.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#00f3ff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to external domains for better performance */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />

        {/* Preconnect to Sentry - 240ms improvement */}
        <link
          rel="preconnect"
          href="https://o4510277157715968.ingest.de.sentry.io"
          crossOrigin="anonymous"
        />
        <link
          rel="dns-prefetch"
          href="https://o4510277157715968.ingest.de.sentry.io"
        />

        {/* Critical CSS - Inline for immediate rendering and better LCP */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          :root {
            --neon-blue: #00f3ff;
            --neon-purple: #b400ff;
            --neon-green: #00ff41;
            --neon-pink: #ff0080;
            --neon-orange: #ff6b35;
            --dark-bg: #0a0a0a;
            --darker-bg: #050505;
            --card-bg: rgba(15, 15, 15, 0.9);
            --border-glow: rgba(0, 243, 255, 0.3);
            --owl-gold: #ffd700;
          }
          
          * { box-sizing: border-box; }
          
          body {
            background: linear-gradient(135deg, var(--dark-bg) 0%, #0f0f23 30%, #1a1a2e 50%, #16213e 70%, var(--darker-bg) 100%);
            background-attachment: fixed;
            color: #e0e0e0;
            font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
            overflow-x: hidden;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            margin: 0;
            padding: 0;
            min-height: 100vh;
          }
          
          h1, h2, h3, h4, h5, h6 { margin: 0; font-weight: 900; }
          p { margin: 0; }
          a { color: inherit; text-decoration: none; }
          
          .neon-text {
            text-shadow: 0 0 3px currentColor, 0 0 6px currentColor;
            will-change: auto;
          }
          .neon-blue { color: var(--neon-blue); }
          .neon-purple { color: var(--neon-purple); }
          .neon-green { color: var(--neon-green); }
          
          .glass-card {
            background: var(--card-bg);
            backdrop-filter: blur(15px);
            border: 1px solid var(--border-glow);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          }
          
          .btn-cyberpunk {
            background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple));
            border: none;
            color: #fff;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            position: relative;
            overflow: hidden;
            border-radius: 8px;
            padding: 16px 32px;
            cursor: pointer;
            display: inline-block;
          }
          
          nav {
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(0, 243, 255, 0.4);
            position: sticky;
            top: 0;
            z-index: 50;
          }
          
          .min-h-screen { min-height: 100vh; contain: layout style paint; }
          .relative { position: relative; }
          .overflow-hidden { overflow: hidden; }
          
          .grid-pattern {
            background-image: linear-gradient(rgba(0, 243, 255, 0.05) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(0, 243, 255, 0.05) 1px, transparent 1px);
            background-size: 32px 32px;
            opacity: 0.15;
            position: absolute;
            inset: 0;
            pointer-events: none;
            contain: paint;
          }
          
          /* Prevent layout thrashing */
          img { content-visibility: auto; }
          .glass-card { content-visibility: auto; contain: layout style; }
        `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${openSans.variable} ${raleway.variable} antialiased`}
      >
        {/* Google Analytics - Defer to reduce TBT */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${
            process.env.NEXT_PUBLIC_GA_ID ?? ""
          }`}
          strategy="lazyOnload"
        />
        <Script id="ga-init" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);} 
            gtag('js', new Date());
            const id = '${process.env.NEXT_PUBLIC_GA_ID ?? ""}';
            if (id) {
              gtag('config', id, { 
                page_path: window.location.pathname,
                send_page_view: false
              });
            }
          `}
        </Script>
        <ClientRoot>
          <Layout>{children}</Layout>
        </ClientRoot>
      </body>
    </html>
  );
}
