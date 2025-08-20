import type { Metadata } from "next";
import { Geist, Geist_Mono, Open_Sans, Raleway } from "next/font/google";
import "./globals.css";
import { Layout } from "../shared/components/Layout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Owdit - Smart Contract Security Score",
  description:
    "AI-powered smart contract security analysis. Secure and transparent score storage on 0G Network.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${openSans.variable} ${raleway.variable} antialiased`}
      >
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
