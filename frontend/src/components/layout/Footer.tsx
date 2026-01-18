'use client';

import Link from 'next/link';
import { Vote, Github, Twitter, MessageCircle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="glass border-t border-white/5 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Vote className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">VoteAleo</span>
            </div>
            <p className="text-white/60 max-w-md">
              Privacy-preserving voting platform powered by Aleo blockchain.
              Create campaigns, cast anonymous votes, and participate in
              decentralized governance with complete privacy.
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

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/campaigns" className="text-white/60 hover:text-white transition-colors">
                  Browse Campaigns
                </Link>
              </li>
              <li>
                <Link href="/create" className="text-white/60 hover:text-white transition-colors">
                  Create Campaign
                </Link>
              </li>
              <li>
                <a
                  href="https://aleo.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  About Aleo
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-white mb-4">Resources</h3>
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
          <p className="text-white/40 text-sm">
            &copy; {new Date().getFullYear()} VoteAleo. All rights reserved.
          </p>
          <p className="text-white/40 text-sm">
            Built with privacy in mind on{' '}
            <a
              href="https://aleo.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:underline"
            >
              Aleo
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
