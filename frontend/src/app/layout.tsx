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
  title: "VoteAleo - Privacy-Preserving Voting on Aleo",
  description: "Create campaigns, cast anonymous votes, and participate in decentralized governance with complete privacy using Aleo's zero-knowledge proofs.",
  keywords: ["voting", "aleo", "blockchain", "privacy", "zero-knowledge", "zk-snarks", "dao", "governance"],
  authors: [{ name: "VoteAleo Team" }],
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-icon.svg', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    title: "VoteAleo - Privacy-Preserving Voting",
    description: "Anonymous voting powered by Aleo blockchain",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <Providers>
          {/* Aurora Background Effect */}
          <div className="aurora-bg" />

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
