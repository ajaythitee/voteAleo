'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Vote,
  Shield,
  Zap,
  Eye,
  ArrowRight,
  Lock,
  Users,
  CheckCircle,
  Circle,
  Clock,
  Calendar,
  Gavel,
  Plus,
} from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Badge } from '@/components/ui/Badge';
import { SkeletonCard } from '@/components/ui/LoadingSpinner';
import { RevealOnScroll } from '@/components/ui/RevealOnScroll';
import { DoomSection } from '@/components/ui/DoomSection';
import { Scene3D } from '@/components/Scene3D';
import { Section } from '@/components/layout';
import { useWalletStore } from '@/stores/walletStore';
import { Campaign } from '@/types';
import { aleoService } from '@/services/aleo';
import { auctionService } from '@/services/auction';
import { parseOnChainCampaign } from '@/services/campaignParser';
import { parseOnChainAuction, type ParsedAuction } from '@/services/auctionParser';
import { formatDistanceToNow, isPast, isFuture } from 'date-fns';

// Hero section features
const heroFeatures = [
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'Your vote is protected by zero-knowledge proofs',
  },
  {
    icon: Zap,
    title: 'Fast & Secure',
    description: 'Quick transactions on Aleo blockchain',
  },
  {
    icon: Eye,
    title: 'Anonymous',
    description: 'No one can trace your vote back to you',
  },
  {
    icon: Lock,
    title: 'Tamper-Proof',
    description: 'Blockchain-secured and immutable',
  },
];

type AuctionListItem = { auctionId: string; index: number; parsed: ParsedAuction | null };

export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [auctions, setAuctions] = useState<AuctionListItem[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [isLoadingAuctions, setIsLoadingAuctions] = useState(true);
  const { isConnected } = useWalletStore();

  useEffect(() => {
    loadCampaigns();
  }, []);
  useEffect(() => {
    loadAuctions();
  }, []);

  const loadCampaigns = async () => {
    setIsLoadingCampaigns(true);
    try {
      const allCampaigns = await aleoService.fetchAllCampaigns();
      const loadedCampaigns: Campaign[] = [];

      for (const entry of allCampaigns) {
        try {
          const idMatch = entry.id.match(/(\d+)/);
          const id = idMatch ? parseInt(idMatch[1]) : 0;

          if (id > 0 && typeof entry.data === 'string') {
            const campaignData = await parseOnChainCampaign(entry.data, id);
            if (campaignData) loadedCampaigns.push(campaignData);
          }
        } catch (err) {
          console.warn('Error parsing campaign:', err);
        }
      }

      loadedCampaigns.sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
      setCampaigns(loadedCampaigns.slice(0, 3));
    } catch (err) {
      console.error('Error loading campaigns:', err);
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  const loadAuctions = async () => {
    setIsLoadingAuctions(true);
    try {
      const list = await auctionService.listPublicAuctions();
      const top = list.slice(0, 3);
      const parsedTop: AuctionListItem[] = [];
      for (const a of top) {
        try {
          const parsed = await parseOnChainAuction(a.data, a.auctionId);
          parsedTop.push({ auctionId: a.auctionId, index: a.index, parsed: parsed });
        } catch {
          parsedTop.push({ auctionId: a.auctionId, index: a.index, parsed: null });
        }
      }
      setAuctions(parsedTop);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAuctions(false);
    }
  };

  const getCampaignStatus = (campaign: Campaign) => {
    if (isPast(campaign.endTime)) return 'ended';
    if (isFuture(campaign.startTime)) return 'upcoming';
    return 'active';
  };

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 80]);

  return (
    <div className="min-h-screen">
      {/* Subtle starfield background across homepage */}
      <div className="fixed inset-0 -z-20 opacity-60">
        <Scene3D variant="background" className="h-full w-full" />
      </div>
      {/* Hero - Parallax */}
      <section ref={heroRef} className="relative py-28 lg:py-36 overflow-hidden" aria-labelledby="hero-heading">
        {/* 3D hero background */}
        <div className="absolute inset-0 -z-10">
          <Scene3D
            variant="hero"
            className="h-full w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-transparent" />
        </div>
        <div className="absolute top-12 right-4 md:right-12 opacity-80">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
            zk-powered
          </span>
        </div>
        <motion.div style={{ y: heroY }} className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
            Voting &amp; Auctions on Aleo
          </h1>
          <p className="text-lg sm:text-xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            Private voting and first-price sealed-bid auctions. Create campaigns, cast anonymous votes, or run auctions with privacy on Aleo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap">
            <Link href="/campaigns">
              <GlassButton size="lg" icon={<Vote className="w-5 h-5" />}>
                Campaigns
              </GlassButton>
            </Link>
            <Link href="/auctions">
              <GlassButton size="lg" variant="secondary" icon={<Gavel className="w-5 h-5" />}>
                Auctions
              </GlassButton>
            </Link>
            {isConnected && (
              <Link href="/create">
                <GlassButton size="lg" variant="secondary" icon={<Plus className="w-5 h-5" />}>
                  Create
                </GlassButton>
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 mt-20 text-white/45 text-sm">
            {heroFeatures.map((f) => (
              <span key={f.title} className="flex items-center gap-2">
                <f.icon className="w-4 h-4 text-emerald-400" />
                {f.title}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Product pillars */}
      <DoomSection intensity={0.7}>
        <RevealOnScroll>
          <section className="py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Section
                eyebrow="Built for Aleo"
                title="Private voting and sealed-bid auctions in one place"
                description="Design secure voting campaigns or run first-price sealed-bid auctions, all powered by Aleo’s privacy-preserving infrastructure."
              >
                <div className="grid gap-6 md:grid-cols-2">
                  <GlassCard>
                    <div className="flex items-start gap-4">
                      <div className="mt-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-2.5">
                        <Vote className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1.5">
                          Private voting campaigns
                        </h3>
                        <p className="text-sm text-white/65 mb-3">
                          Create campaigns with anonymous voting and verifiable results that never expose individual choices.
                        </p>
                        <ul className="space-y-1.5 text-xs text-white/55">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            Zero-knowledge protected ballots
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            Wallet-based transactions
                          </li>
                        </ul>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard>
                    <div className="flex items-start gap-4">
                      <div className="mt-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-2.5">
                        <Gavel className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1.5">
                          Sealed-bid auctions
                        </h3>
                        <p className="text-sm text-white/65 mb-3">
                          Run first-price auctions where bids stay hidden until reveal time, with on-chain settlement and transparent outcomes.
                        </p>
                        <ul className="space-y-1.5 text-xs text-white/55">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            Sealed bids on Aleo
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            Public or private participation
                          </li>
                        </ul>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              </Section>
            </div>
          </section>
        </RevealOnScroll>
      </DoomSection>

      {/* What's next - glass highlight */}
      <DoomSection intensity={0.9}>
        <RevealOnScroll>
          <section className="py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Section
                eyebrow="Roadmap"
                title="What’s coming next"
                description="VeilProtocol is evolving into a full governance and auction platform on Aleo, with more advanced voting and analytics."
              >
                <GlassCard>
                  <ul className="space-y-3 text-white/80">
                    <li className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      Core voting: campaigns, Leo/Puzzle wallets, private tally
                    </li>
                    <li className="flex items-center gap-3">
                      <Circle className="w-5 h-5 text-white/40 flex-shrink-0" />
                      Campaign analytics, richer insights, and ranked-choice voting
                    </li>
                    <li className="flex items-center gap-3">
                      <Circle className="w-5 h-5 text-white/40 flex-shrink-0" />
                      Multi-language support and DAO-focused workflows
                    </li>
                    <li className="flex items-center gap-3">
                      <Circle className="w-5 h-5 text-white/40 flex-shrink-0" />
                      Cross-chain integrations and optional reputation layers
                    </li>
                  </ul>
                </GlassCard>
              </Section>
            </div>
          </section>
        </RevealOnScroll>
      </DoomSection>

      {/* Featured Campaigns */}
      <DoomSection intensity={1}>
        <RevealOnScroll>
          <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Active Campaigns</h2>
                <p className="text-white/55 text-lg">
                Participate in live voting campaigns on the Aleo blockchain
              </p>
            </div>
            <Link href="/campaigns">
              <GlassButton variant="secondary" icon={<ArrowRight className="w-5 h-5" />}>
                View All
              </GlassButton>
            </Link>
          </div>

            {/* Campaigns Grid */}
          {isLoadingCampaigns ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <GlassCard className="p-12 text-center relative overflow-hidden">
              <div className="absolute top-6 right-6 w-20 h-20 rounded-full bg-emerald-500/5 border border-emerald-500/10" aria-hidden />
              <div className="absolute bottom-8 left-8 w-12 h-12 rounded-full bg-white/5" aria-hidden />
              <Vote className="w-16 h-16 text-white/20 mx-auto mb-4 relative" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No campaigns yet
              </h3>
              <p className="text-white/60 mb-6">
                Be the first to create a voting campaign!
              </p>
              {isConnected && (
                <Link href="/create">
                  <GlassButton icon={<Vote className="w-5 h-5" />}>
                    Create Campaign
                  </GlassButton>
                </Link>
              )}
            </GlassCard>
          ) : (
            <motion.div
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
            >
              {campaigns.map((campaign, index) => {
                const status = getCampaignStatus(campaign);
                const statusConfig = {
                  active: {
                    label: 'Active',
                    color: 'bg-green-500/20 text-green-400 border-green-500/30',
                    icon: Clock,
                  },
                  upcoming: {
                    label: 'Upcoming',
                    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                    icon: Calendar,
                  },
                  ended: {
                    label: 'Ended',
                    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
                    icon: CheckCircle,
                  },
                };
                const config = statusConfig[status];
                const StatusIcon = config.icon;

                return (
                  <motion.div key={campaign.id} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
                  <Link href={`/campaign/${campaign.id}`}>
                    <GlassCard hover className="h-full flex flex-col overflow-hidden p-0 rounded-[16px]">
                        {/* Image */}
                        <div className="relative h-48 overflow-hidden bg-emerald-500/10">
                          <img
                            src={campaign.imageUrl || '/images/default-campaign.svg'}
                            alt={campaign.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/images/default-campaign.svg';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                          {/* Status Badge */}
                          <div className="absolute top-4 right-4">
                            <Badge variant={status} icon={<StatusIcon className="w-3.5 h-3.5" />}>
                              {config.label}
                            </Badge>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex flex-col flex-1">
                          <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                            {campaign.title}
                          </h3>
                          <p className="text-sm text-white/60 mb-4 line-clamp-2 flex-1">
                            {campaign.description}
                          </p>

                          {/* Stats */}
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-white/50">
                              <Users className="w-4 h-4" />
                              <span>{campaign.totalVotes} votes</span>
                            </div>

                            <div className="flex items-center gap-2 text-white/50">
                              <Clock className="w-4 h-4" />
                              <span>
                                {status === 'ended'
                                  ? `Ended ${formatDistanceToNow(campaign.endTime, { addSuffix: true })}`
                                  : status === 'upcoming'
                                    ? `Starts ${formatDistanceToNow(campaign.startTime, { addSuffix: true })}`
                                    : `Ends ${formatDistanceToNow(campaign.endTime, { addSuffix: true })}`
                                }
                              </span>
                            </div>
                          </div>

                          {/* Vote CTA */}
                          {status === 'active' && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-emerald-400">Cast your vote</span>
                                <ArrowRight className="w-4 h-4 text-emerald-400" />
                              </div>
                            </div>
                          )}
                        </div>
                    </GlassCard>
                  </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
          </div>
          </section>
        </RevealOnScroll>
      </DoomSection>

      {/* Auctions section */}
      <DoomSection intensity={1}>
        <RevealOnScroll>
          <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Public Auctions</h2>
                <p className="text-white/55 text-lg">
                First-price sealed-bid auctions on Aleo. Place public or private bids.
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/auctions">
                <GlassButton variant="secondary" icon={<ArrowRight className="w-4 h-4" />}>
                  View All
                </GlassButton>
              </Link>
              {isConnected && (
                <Link href="/auctions/create">
                  <GlassButton icon={<Gavel className="w-4 h-4" />}>Create Auction</GlassButton>
                </Link>
              )}
            </div>
          </div>
          {isLoadingAuctions ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : auctions.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <Gavel className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No auctions yet</h3>
              <p className="text-white/60 mb-6">Be the first to create a public auction.</p>
              {isConnected && (
                <Link href="/auctions/create">
                  <GlassButton icon={<Gavel className="w-5 h-5" />}>Create Auction</GlassButton>
                </Link>
              )}
            </GlassCard>
          ) : (
            <motion.div
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
            >
              {auctions.map((a, i) => {
                const parsed = a.parsed;
                const name = parsed?.name ?? 'Untitled';
                const startingBid = parsed?.startingBid ?? 0;
                return (
                  <motion.div key={a.auctionId} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
                    <Link href={`/auctions/${encodeURIComponent(a.auctionId)}`}>
                      <GlassCard hover className="h-full p-6 rounded-[16px]">
                        <div className="flex items-start justify-end mb-3">
                          <Badge variant="active">Open</Badge>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                          {name}
                        </h3>
                        <p className="text-sm text-white/60">
                          Starting bid:{' '}
                          <span className="text-emerald-400">{startingBid} credits</span>
                        </p>
                        <div className="mt-4 flex items-center text-emerald-400 text-sm">
                          <span>View &amp; bid</span>
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </div>
                      </GlassCard>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
          </div>
          </section>
        </RevealOnScroll>
      </DoomSection>

      {/* CTA */}
      <DoomSection intensity={0.85}>
        <RevealOnScroll>
          <section className="py-24 pb-32">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <GlassCard className="p-10 sm:p-12 rounded-[16px]">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Ready to get started?</h2>
              <p className="text-white/55 text-lg mb-8">
              Connect your wallet to vote in campaigns or create and bid in private auctions on Aleo.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
              <Link href="/campaigns">
                <GlassButton size="lg" icon={<Vote className="w-5 h-5" />}>
                  Browse Campaigns
                </GlassButton>
              </Link>
              <Link href="/auctions">
                <GlassButton size="lg" variant="secondary" icon={<Gavel className="w-5 h-5" />}>
                  Browse Auctions
                </GlassButton>
              </Link>
              <a href="https://aleo.org" target="_blank" rel="noopener noreferrer">
                <GlassButton size="lg" variant="secondary">Learn about Aleo</GlassButton>
              </a>
            </div>
          </GlassCard>
        </div>
          </section>
        </RevealOnScroll>
      </DoomSection>
    </div>
  );
}
