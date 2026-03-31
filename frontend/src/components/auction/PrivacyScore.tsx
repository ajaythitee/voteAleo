'use client';

type Props = {
  strategy?: 'first_price' | 'vickrey' | 'dutch' | 'english';
  tokenType?: 'aleo' | 'usdcx' | 'usad';
};

function score(strategy: Props['strategy'], tokenType: Props['tokenType']) {
  const s = strategy ?? 'first_price';
  const t = tokenType ?? 'aleo';
  if (s === 'vickrey' && t === 'aleo') return 'A+';
  if (s === 'first_price' && t === 'aleo') return 'A';
  if ((s === 'dutch' || s === 'english') && t === 'aleo') return 'B';
  if (s === 'vickrey' && (t === 'usdcx' || t === 'usad')) return 'B';
  if (s === 'first_price' && (t === 'usdcx' || t === 'usad')) return 'C';
  return 'D';
}

export function PrivacyScore({ strategy, tokenType }: Props) {
  const grade = score(strategy, tokenType);
  return (
    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300">
      Privacy {grade}
    </span>
  );
}
