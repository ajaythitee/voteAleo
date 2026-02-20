import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ToastContainer } from "@/components/ui/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Privote - Voting & Auctions on Aleo",
  description: "Privacy-preserving voting and first-price sealed-bid auctions on Aleo. Create campaigns, cast anonymous votes, and run private auctions.",
  keywords: ["voting", "auction", "aleo", "blockchain", "privacy", "zero-knowledge", "zk-snarks", "dao", "governance"],
  authors: [{ name: "Privote" }],
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-icon.svg', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    title: "Privote - Voting & Auctions",
    description: "Voting and private auctions powered by Aleo blockchain",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased min-h-screen flex flex-col bg-background transition-colors duration-500`}>
        <Providers>
          <div className="aurora-bg" aria-hidden />

          {/* Header */}
          <Header />

          {/* Main Content */}
          <main className="flex-1 pt-20 md:pt-24">
            {children}
          </main>

          {/* Footer */}
          <Footer />

          {/* Toast Notifications */}
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}
