import { ReactNode } from 'react';

interface SectionProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Section({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = '',
}: SectionProps) {
  return (
    <section className={`space-y-6 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="text-xs font-semibold tracking-wide uppercase text-emerald-400 mb-1.5">
              {eyebrow}
            </p>
          )}
          <h2 className="text-xl md:text-2xl font-semibold text-white">
            {title}
          </h2>
          {description && (
            <p className="mt-2 text-sm text-text-subtle max-w-2xl">
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

      {children && (
        <div>
          {children}
        </div>
      )}
    </section>
  );
}

