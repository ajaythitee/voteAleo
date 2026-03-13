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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6 mb-8 md:mb-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm md:text-base text-text-subtle max-w-2xl">
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

      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}

