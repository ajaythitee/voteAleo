'use client';

import Link from 'next/link';
import { Github, Twitter, MessageCircle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[rgba(10,10,15,0.9)] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/logo.svg" alt="" className="w-10 h-10 rounded-xl" width={40} height={40} />
              <span className="text-xl font-bold text-white">Privote</span>
            </div>
            <p className="text-white/60 max-w-md text-sm">
              Privacy-preserving voting and auctions on Aleo. Create campaigns, cast anonymous votes, and run sealed-bid auctions with a single unified experience.
            </p>
            <div className="flex gap-4 mt-6">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Github className="w-5 h-5 text-white/70" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Twitter className="w-5 h-5 text-white/70" />
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-white/70" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm tracking-wide uppercase">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/campaigns" className="text-white/60 hover:text-white transition-colors">
                  Browse campaigns
                </Link>
              </li>
              <li>
                <Link href="/create" className="text-white/60 hover:text-white transition-colors">
                  Create campaign
                </Link>
              </li>
              <li>
                <Link href="/auctions" className="text-white/60 hover:text-white transition-colors">
                  Explore auctions
                </Link>
              </li>
              <li>
                <a
                  href="https://aleo.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  What is Aleo?
                </a>
              </li>
            </ul>
          </div>

          {/* Ecosystem */}
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm tracking-wide uppercase">Ecosystem</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://developer.aleo.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  Aleo Docs
                </a>
              </li>
              <li>
                <a
                  href="https://leo.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  Leo Wallet
                </a>
              </li>
              <li>
                <a
                  href="https://puzzle.online"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  Puzzle Wallet
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-xs sm:text-sm">
            &copy; {new Date().getFullYear()} Privote. All rights reserved.
          </p>
          <p className="text-white/40 text-xs sm:text-sm">
            Built with privacy in mind on{' '}
            <a
              href="https://aleo.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline"
            >
              Aleo
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
