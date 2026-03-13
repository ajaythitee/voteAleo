'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Gavel, ArrowRight, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Badge } from '@/components/ui/Badge';
import { SkeletonCard } from '@/components/ui/LoadingSpinner';
import { useWalletStore } from '@/stores/walletStore';
import { auctionService } from '@/services/auction';

type AuctionRow = { auctionId: string; index: number; data: unknown; owner: string | null };

function parseAuctionData(data: unknown): { name: string; startingBid: number } {
  if (data && typeof data === 'object' && 'starting_bid' in (data as object)) {
    const d = data as { starting_bid?: number; name?: string };
    return {
      name: d.name != null ? String(d.name) : 'Untitled',
      startingBid: Number(d.starting_bid) || 0,
    };
  }
  return { name: 'Untitled', startingBid: 0 };
}

export default function MyAuctionsPage() {
  const [list, setList] = useState<AuctionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected, address } = useWalletStore();

  const load = async () => {
    if (!address) {
      setList([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const items = await auctionService.listPublicAuctions();
      const withOwners = await Promise.all(
        items.map(async (a) => ({
          ...a,
          owner: await auctionService.getAuctionOwner(a.auctionId),
        }))
      );
      const mine = withOwners.filter((a) => a.owner && a.owner.toLowerCase() === address.toLowerCase());
      setList(mine);
    } catch (e) {
      console.error(e);
      setList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [address]);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <GlassCard className="p-8 max-w-md text-center">
          <Gavel className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Connect your wallet</h2>
          <p className="text-white/60 mb-6">Connect a wallet to see auctions you created.</p>
          <Link href="/auctions">
            <GlassButton variant="secondary">Browse Auctions</GlassButton>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <section className="pt-8 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">My Auctions</h1>
              <p className="text-white/60">Auctions you created (public, with revealed owner).</p>
            </div>
            <div className="flex gap-3">
              <GlassButton variant="secondary" icon={<RefreshCw className="w-4 h-4" />} onClick={load} disabled={isLoading}>
                Refresh
              </GlassButton>
              <Link href="/auctions/create">
                <GlassButton icon={<Gavel className="w-4 h-4" />}>Create Auction</GlassButton>
              </Link>
            </div>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : list.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <Gavel className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No auctions created yet</h2>
              <p className="text-white/60 mb-6">
                Auctions you create with &quot;reveal address&quot; will appear here.
              </p>
              <Link href="/auctions/create">
                <GlassButton icon={<Gavel className="w-5 h-5" />}>Create Auction</GlassButton>
              </Link>
            </GlassCard>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {list.map((a, i) => {
                const { name, startingBid } = parseAuctionData(a.data);
                return (
                  <Link key={a.auctionId} href={`/auctions/${encodeURIComponent(a.auctionId)}`}>
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <GlassCard hover className="h-full p-6 flex flex-col">
                        <div className="flex items-start justify-end mb-3">
                          <Badge variant="your-campaign">Yours</Badge>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">{name}</h3>
                        <p className="text-sm text-white/60 mb-4">
                          Starting bid: <span className="text-emerald-400">{startingBid} credits</span>
                        </p>
                        <div className="mt-auto flex items-center text-emerald-400 text-sm">
                          <span>View</span>
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </div>
                      </GlassCard>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
