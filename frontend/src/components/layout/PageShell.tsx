import { ReactNode } from 'react';

interface PageShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
}

const maxWidthClassMap: Record<NonNullable<PageShellProps['maxWidth']>, string> = {
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
};

export function PageShell({
  title,
  description,
  actions,
  children,
  maxWidth = '7xl',
}: PageShellProps) {
  const maxWidthClass = maxWidthClassMap[maxWidth];

  return (
    <div className={`mx-auto ${maxWidthClass} px-4 sm:px-6 lg:px-8 py-10 md:py-12`}>
      <div className="relative mb-8 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(56,189,248,0.08)_40%,rgba(251,146,60,0.14))] p-6 shadow-[0_30px_80px_-40px_rgba(15,118,110,0.7)] md:mb-10 md:p-8">
        <div className="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-44 w-44 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-amber-300/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
          <div>
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/75">
              Aleo Native
            </span>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-2xl text-sm text-white/72 md:text-base">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-3 shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}

