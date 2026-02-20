'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Gavel, ArrowRight, RefreshCw, PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Badge } from '@/components/ui/Badge';
import { SkeletonCard } from '@/components/ui/LoadingSpinner';
import { useWalletStore } from '@/stores/walletStore';
import { auctionService } from '@/services/auction';
import { parseOnChainAuction, type ParsedAuction } from '@/services/auctionParser';
import { PageShell, EmptyState } from '@/components/layout';

type AuctionRow = { auctionId: string; index: number; data: unknown };

export default function AuctionsPage() {
  const [list, setList] = useState<AuctionRow[]>([]);
  const [parsedById, setParsedById] = useState<Record<string, ParsedAuction>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected } = useWalletStore();

  const load = async () => {
    setIsLoading(true);
    try {
      const items = await auctionService.listPublicAuctions();
      setList(items);

      const next: Record<string, ParsedAuction> = {};
      await Promise.all(
        items.slice(0, 24).map(async (a) => {
          const parsed = await parseOnChainAuction(a.data, a.auctionId);
          if (parsed) next[a.auctionId] = parsed;
        })
      );
      setParsedById((prev) => ({ ...prev, ...next }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <PageShell
      title="Public auctions"
      description="First-price sealed-bid auctions on Aleo. Place public or private bids."
      actions={
        <>
          <GlassButton
            variant="secondary"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={load}
            disabled={isLoading}
          >
            Refresh
          </GlassButton>
          {isConnected && (
            <Link href="/auctions/create">
              <GlassButton icon={<PlusCircle className="w-4 h-4" />}>Create auction</GlassButton>
            </Link>
          )}
        </>
      }
      maxWidth="7xl"
    >
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          title="No auctions yet"
          description="There are no public auctions yet. Be the first to create one."
          icon={<Gavel className="w-10 h-10" />}
          action={
            isConnected ? (
              <Link href="/auctions/create">
                <GlassButton icon={<Gavel className="w-5 h-5" />}>Create auction</GlassButton>
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map((a, i) => {
            const parsed = parsedById[a.auctionId];
            const name = parsed?.name ?? 'Untitled';
            const startingBid = parsed?.startingBid ?? 0;
            return (
              <Link key={a.auctionId} href={`/auctions/${encodeURIComponent(a.auctionId)}`}>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <GlassCard hover className="h-full p-0 overflow-hidden flex flex-col rounded-[16px]">
                    {parsed?.imageUrl ? (
                      <div className="relative h-36 w-full bg-white/[0.06]">
                        <img src={parsed.imageUrl} alt={name} className="h-full w-full object-cover" crossOrigin="anonymous" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      </div>
                    ) : null}
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-start justify-end mb-3">
                        <Badge variant="active">Open</Badge>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">{name}</h3>
                      <p className="text-sm text-white/60 mb-3 line-clamp-2 flex-1">
                        {parsed?.description ?? ''}
                      </p>
                      <p className="text-sm text-white/60 mb-4">
                        Starting bid: <span className="text-emerald-400">{startingBid} credits</span>
                      </p>
                      <div className="mt-auto flex items-center text-emerald-400 text-sm">
                        <span>View &amp; place bid</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
