'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Gavel, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { TransactionStatusCard } from '@/components/transactions/TransactionStatusCard';
import { useWalletSession } from '@/hooks/useWalletSession';
import { useToastStore } from '@/stores/toastStore';
import { auctionService } from '@/services/auction';
import { parseOnChainAuction, type ParsedAuction } from '@/services/auctionParser';
import {
  awaitTransactionConfirmation,
  buildBidDutchAleoParams,
  buildBidDutchUsdcxParams,
  buildBidEnglishAleoParams,
  buildBidEnglishUsdcxParams,
  buildCancelAuctionParams,
  buildClaimRefundAleoParams,
  buildClaimRefundUsadParams,
  buildClaimRefundUsdcxParams,
  buildClaimWinAleoParams,
  buildClaimWinUsadParams,
  buildClaimWinUsdcxParams,
  buildClaimWinVickreyAleoParams,
  buildClaimWinVickreyUsdcxParams,
  buildCloseBiddingParams,
  buildDisputeAuctionParams,
  buildFinalizeAuctionParams,
  buildPlaceBidParams,
  buildProveWonAuctionParams,
  buildRevealBidAleoParams,
  buildRevealBidUsadParams,
  buildRevealBidUsdcxParams,
  buildResolveDisputeParams,
  buildSettleEnglishParams,
  createTransaction,
  isTemporaryWalletTransactionId,
} from '@/utils/transaction';
import { useTransactionLifecycle } from '@/hooks/useTransactionLifecycle';
import { PrivacyMonitor } from '@/components/auction/PrivacyMonitor';
import { PrivacyScore } from '@/components/auction/PrivacyScore';

type AuctionInfo = {
  status: number;
  mode: number;
  tokenType: number;
  bidCount: number;
  deadline: number;
};

const parseField = (raw: string, key: string) => {
  const match = raw.match(new RegExp(`${key}\\s*:\\s*(\\d+)`, 'i'));
  return match ? Number(match[1]) : 0;
};

export default function AuctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [auctionId, setAuctionId] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedAuction | null>(null);
  const [auctionInfo, setAuctionInfo] = useState<AuctionInfo | null>(null);
  const [highestBid, setHighestBid] = useState(0);
  const [secondHighest, setSecondHighest] = useState(0);
  const [winnerBidHash, setWinnerBidHash] = useState<string | null>(null);
  const [originalDeadline, setOriginalDeadline] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [reserveToFinalize, setReserveToFinalize] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');
  const [itemHash, setItemHash] = useState('');
  const [disputeReasonHash, setDisputeReasonHash] = useState('');
  const [disputeBondAmount, setDisputeBondAmount] = useState('');
  const [resolveUpheld, setResolveUpheld] = useState(false);
  const tx = useTransactionLifecycle();
  const { success, error: showError } = useToastStore();
  const { walletName, executeTransaction, connect, transactionStatus } = useWalletSession();

  const refresh = async (resolvedId: string) => {
    const raw = await auctionService.getPublicAuction(resolvedId);
    if (raw == null) return;
    const rawText = typeof raw === 'string' ? raw : JSON.stringify(raw);
    setAuctionInfo({
      status: parseField(rawText, 'status'),
      mode: parseField(rawText, 'auction_mode'),
      tokenType: parseField(rawText, 'token_type'),
      bidCount: parseField(rawText, 'bid_count'),
      deadline: parseField(rawText, 'deadline'),
    });
    setParsed(await parseOnChainAuction(raw, resolvedId));
    const highest = await auctionService.getHighestBid(resolvedId);
    setHighestBid(highest);
    if (!disputeBondAmount.trim() && highest > 0) {
      setDisputeBondAmount(String(Math.ceil(highest * 0.1)));
    }
    setSecondHighest(await auctionService.getSecondHighestBid(resolvedId));
    setWinnerBidHash(await auctionService.getWinningBidId(resolvedId));
    try {
      const metaRes = await fetch(`/api/auctions/${encodeURIComponent(resolvedId)}`, { cache: 'no-store' });
      if (metaRes.ok) {
        const payload = (await metaRes.json()) as { item?: { originalDeadline?: number } };
        setOriginalDeadline(Number(payload.item?.originalDeadline || 0));
      }
    } catch {
      setOriginalDeadline(0);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const decodedId = decodeURIComponent(id);
      const resolvedId = /^\d+$/.test(decodedId)
        ? (await auctionService.getPublicAuctionIdByIndex(Number(decodedId))) || decodedId
        : decodedId;
      if (cancelled) return;
      setAuctionId(resolvedId);
      await refresh(resolvedId);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const checkStatus = async (transactionId: string) => {
    if (!transactionStatus) return null;
    try {
      const result = await transactionStatus(transactionId);
      if (typeof result === 'string') return { status: result, transactionId };
      if (result && typeof result === 'object' && 'status' in result) {
        return { status: String(result.status), transactionId };
      }
      return null;
    } catch {
      if (isTemporaryWalletTransactionId(transactionId)) return { status: 'pending', transactionId };
      return null;
    }
  };

  const run = async (title: string, paramsBuilder: () => ReturnType<typeof buildPlaceBidParams>) => {
    if (!walletName || !auctionId) {
      showError('Wallet required', 'Connect your wallet first.');
      return;
    }
    tx.setPreparing(`${title}...`, 'Opening wallet approval.');
    const result = await createTransaction(paramsBuilder(), executeTransaction, walletName, { recoverConnection: connect });
    if (!result.success) {
      tx.setFailed(`${title} failed`, result.error || 'Unknown error');
      showError(`${title} failed`, result.error || 'Unknown error');
      return;
    }
    const confirmation = await awaitTransactionConfirmation(result.transactionId, checkStatus, { attempts: 90, delayMs: 1000 });
    if (!confirmation.confirmed) {
      tx.setAwaiting(`${title} submitted`, 'Waiting for indexer visibility.', confirmation.transactionId || result.transactionId);
    } else {
      tx.setConfirmed(`${title} confirmed`, 'Transaction confirmed on-chain.', confirmation.transactionId || result.transactionId);
    }
    await refresh(auctionId);
    success(title, 'Action sent successfully.');
  };

  if (loading || !auctionId) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-400" /></div>;
  }

  const tokenType = auctionInfo?.tokenType === 3 ? 'usad' : auctionInfo?.tokenType === 2 ? 'usdcx' : 'aleo';
  const mode = auctionInfo?.mode === 4 ? 'english' : auctionInfo?.mode === 3 ? 'dutch' : auctionInfo?.mode === 2 ? 'vickrey' : 'first-price';
  const isDutch = auctionInfo?.mode === 3;
  const isEnglish = auctionInfo?.mode === 4;
  const antiSnipeExtended = !!(originalDeadline > 0 && (auctionInfo?.deadline || 0) > originalDeadline);
  const status = auctionInfo?.status ?? 0;
  const statusLabel =
    status === 1 ? 'ACTIVE' :
    status === 3 ? 'REVEALING' :
    status === 4 ? 'SETTLED' :
    status === 6 ? 'FAILED' :
    status === 8 ? 'EXPIRED' : `STATUS_${status}`;

  const canCancel = status === 1 && (auctionInfo?.bidCount ?? 0) === 0;
  const canDispute = status === 4;
  const canProveWon = status === 4;
  const canResolveDispute = status === 7;

  return (
    <div className="min-h-screen pb-16">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/auctions" className="mb-6 inline-flex items-center gap-2 text-white/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to auctions
        </Link>

        <GlassCard className="mb-6 p-6">
          <h1 className="text-2xl font-semibold text-white">{parsed?.name || 'Auction'}</h1>
          <div className="mt-2">
            <PrivacyScore strategy={parsed?.strategy} tokenType={parsed?.tokenType} />
          </div>
          <p className="mt-2 text-sm text-white/60">{parsed?.description || 'On-chain privacy auction.'}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <p className="text-white/70">Status: <span className="text-emerald-300">{statusLabel}</span></p>
            <p className="text-white/70">Mode: <span className="text-emerald-300">{mode}</span></p>
            <p className="text-white/70">Token: <span className="text-emerald-300">{tokenType}</span></p>
            <p className="text-white/70">Bids: <span className="text-emerald-300">{auctionInfo?.bidCount ?? 0}</span></p>
            <p className="text-white/70">Highest: <span className="text-emerald-300">{highestBid}</span></p>
            <p className="text-white/70">Second: <span className="text-emerald-300">{secondHighest}</span></p>
            <p className="text-white/70">Deadline: <span className="text-emerald-300">{auctionInfo?.deadline ?? 0}</span></p>
          </div>
          {antiSnipeExtended && (
            <p className="mt-2 text-xs text-amber-300">
              Anti-snipe extension detected: deadline moved from {originalDeadline} to {auctionInfo?.deadline}.
            </p>
          )}
          <p className="mt-3 break-all text-xs text-white/50">Auction ID: {auctionId}</p>
          {winnerBidHash && <p className="mt-2 break-all text-xs text-white/50">Winner hash: {winnerBidHash}</p>}
        </GlassCard>

        <div className="mb-6">
          <PrivacyMonitor strategy={parsed?.strategy} tokenType={parsed?.tokenType} />
        </div>

        <TransactionStatusCard
          state={tx.state}
          explorerUrl={tx.state.transactionId ? auctionService.getTransactionExplorerUrl(tx.state.transactionId) : undefined}
        />

        <div className="mt-6 grid gap-4">
          {canCancel && (
            <GlassCard className="p-5">
              <h2 className="mb-3 text-lg font-medium text-white">Cancel Auction</h2>
              <p className="mb-3 text-xs text-white/50">Only the seller can successfully cancel; others will be rejected on-chain.</p>
              <GlassButton variant="secondary" onClick={() => run('Cancel Auction', () => buildCancelAuctionParams([auctionId]))}>
                Cancel Auction
              </GlassButton>
            </GlassCard>
          )}

          <GlassCard className="p-5">
            <h2 className="mb-3 text-lg font-medium text-white">
              1) {isDutch ? 'Dutch instant purchase bid' : isEnglish ? 'English ascending bid' : 'Place sealed bid'}
            </h2>
            <div className="flex gap-2">
              <GlassInput type="number" placeholder="Bid amount" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} />
              <GlassButton
                icon={<Gavel className="h-4 w-4" />}
                onClick={() =>
                  run(isDutch ? 'Dutch bid' : isEnglish ? 'English bid' : 'Place bid', () => {
                    const amount = `${Math.max(1000, Math.floor(Number(bidAmount || 0)))}u128`;
                    const nonce = `${Date.now()}field`;
                    if (isDutch) {
                      return tokenType === 'usdcx'
                        ? buildBidDutchUsdcxParams([auctionId, amount, nonce])
                        : buildBidDutchAleoParams([auctionId, amount, nonce]);
                    }
                    if (isEnglish) {
                      return tokenType === 'usdcx'
                        ? buildBidEnglishUsdcxParams([auctionId, amount, nonce])
                        : buildBidEnglishAleoParams([auctionId, amount, nonce]);
                    }
                    return buildPlaceBidParams([
                      auctionId,
                      amount,
                      nonce,
                      `${tokenType === 'usad' ? 3 : tokenType === 'usdcx' ? 2 : 1}u8`,
                    ]);
                  })
                }
              >
                Place
              </GlassButton>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="mb-3 text-lg font-medium text-white">2) Reveal bid (escrow)</h2>
            <div className="flex gap-2">
              <GlassButton
                icon={<CheckCircle className="h-4 w-4" />}
                onClick={() =>
                  run('Reveal bid', () =>
                    tokenType === 'usdcx'
                      ? buildRevealBidUsdcxParams([])
                      : tokenType === 'usad'
                        ? buildRevealBidUsadParams([])
                        : buildRevealBidAleoParams([])
                  )
                }
              >
                Reveal
              </GlassButton>
              <p className="text-xs text-white/50 self-center">Wallet will ask for your `SealedBid` record (and credits for ALEO).</p>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="mb-3 text-lg font-medium text-white">3) Close + finalize</h2>
            <div className="mb-3">
              {!isEnglish && !isDutch ? (
                <GlassButton onClick={() => run('Close bidding', () => buildCloseBiddingParams([auctionId]))}>Close bidding</GlassButton>
              ) : (
                <GlassButton onClick={() => run('Settle english', () => buildSettleEnglishParams([auctionId, `${Math.max(0, Math.floor(Number(reserveToFinalize || 0)))}u128`]))}>
                  Settle {isEnglish ? 'english' : 'dutch'}
                </GlassButton>
              )}
            </div>
            <div className="flex gap-2">
              <GlassInput
                type="number"
                placeholder="Reserve price used at creation"
                value={reserveToFinalize}
                onChange={(e) => setReserveToFinalize(e.target.value)}
              />
              <GlassButton onClick={() => run('Finalize auction', () => buildFinalizeAuctionParams([auctionId, `${Math.max(0, Math.floor(Number(reserveToFinalize || 0)))}u128`]))}>
                Finalize
              </GlassButton>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="mb-3 text-lg font-medium text-white">4) Claim win / refund</h2>
            <div className="grid gap-3">
              <GlassInput placeholder="Seller address (for claim win)" value={sellerAddress} onChange={(e) => setSellerAddress(e.target.value)} />
              <GlassInput placeholder="Item hash (field)" value={itemHash} onChange={(e) => setItemHash(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <GlassButton
                  onClick={() =>
                    run('Claim win', () => {
                      if (mode === 'vickrey' && secondHighest > 0) {
                        return tokenType === 'usdcx'
                          ? buildClaimWinVickreyUsdcxParams([sellerAddress, itemHash, `${secondHighest}u128`])
                          : buildClaimWinVickreyAleoParams([sellerAddress, itemHash, `${secondHighest}u128`]);
                      }
                      return tokenType === 'usdcx'
                        ? buildClaimWinUsdcxParams([sellerAddress, itemHash])
                        : tokenType === 'usad'
                          ? buildClaimWinUsadParams([sellerAddress, itemHash])
                        : buildClaimWinAleoParams([sellerAddress, itemHash]);
                    })
                  }
                >
                  Claim win
                </GlassButton>
                <GlassButton
                  variant="secondary"
                  onClick={() =>
                    run('Claim refund', () =>
                      tokenType === 'usdcx'
                        ? buildClaimRefundUsdcxParams([])
                        : tokenType === 'usad'
                          ? buildClaimRefundUsadParams([])
                          : buildClaimRefundAleoParams([])
                    )
                  }
                >
                  Claim refund
                </GlassButton>
              </div>
              <p className="text-xs text-white/50">Wallet prompts for your `EscrowReceipt` record during claim transitions.</p>
            </div>
          </GlassCard>

          {canDispute && (
            <GlassCard className="p-5">
              <h2 className="mb-3 text-lg font-medium text-white">Dispute Auction</h2>
              <div className="grid gap-3">
                <GlassInput
                  placeholder="Reason hash (field)"
                  value={disputeReasonHash}
                  onChange={(e) => setDisputeReasonHash(e.target.value)}
                />
                <GlassInput
                  type="number"
                  placeholder="Bond amount (10% of highest bid)"
                  value={disputeBondAmount}
                  onChange={(e) => setDisputeBondAmount(e.target.value)}
                />
                <GlassButton
                  onClick={() => {
                    if (!disputeReasonHash.trim()) {
                      showError('Missing reason hash', 'Enter a reason hash (field).');
                      return;
                    }
                    const bond = Math.max(0, Math.floor(Number(disputeBondAmount || 0)));
                    run('Dispute Auction', () => buildDisputeAuctionParams([auctionId, disputeReasonHash.trim(), `${bond}u128`]));
                  }}
                >
                  Dispute Auction
                </GlassButton>
                <p className="text-xs text-white/50">Wallet prompts for a `credits.aleo/credits` record to pay the bond.</p>
              </div>
            </GlassCard>
          )}

          {canResolveDispute && (
            <GlassCard className="p-5">
              <h2 className="mb-3 text-lg font-medium text-white">Resolve Dispute (Admin)</h2>
              <div className="grid gap-3">
                <label className="flex items-center gap-2 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={resolveUpheld}
                    onChange={(e) => setResolveUpheld(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Uphold dispute
                </label>
                <GlassButton
                  onClick={() => run('Resolve Dispute', () => buildResolveDisputeParams([auctionId, resolveUpheld ? 'true' : 'false']))}
                >
                  Resolve Dispute
                </GlassButton>
              </div>
            </GlassCard>
          )}

          {canProveWon && (
            <GlassCard className="p-5">
              <h2 className="mb-3 text-lg font-medium text-white">Prove You Won</h2>
              <p className="mb-3 text-xs text-white/50">Your wallet will present your `WinnerCertificate` record. This proves you won without revealing the bid amount.</p>
              <GlassButton onClick={() => run('Prove You Won', () => buildProveWonAuctionParams([auctionId]))}>
                Prove You Won
              </GlassButton>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
