import type { ButtonHTMLAttributes } from 'react';

/**
 * Button — DarziDesk proof component for Phase 1 design tokens
 *
 * Variants:
 *   primary     — Navy (bg-brand / hover:bg-brand-dark). Use for primary actions.
 *   accent      — Orange (bg-accent). Use for CTA / "most important" action ONLY.
 *                 Never use orange on every button on a page.
 *   secondary   — White surface with border. Use for secondary / cancel actions.
 *   destructive — Red (bg-error). Use only for irreversible destructive actions.
 *
 * Token classes demonstrated:
 *   bg-brand, bg-brand-dark, bg-accent, bg-surface,
 *   bg-error, text-text-primary, text-text-secondary,
 *   border-border, border-border-strong
 */

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  // Navy — structure / trust. Hover deepens to brand-dark.
  primary:
    'bg-brand text-white hover:bg-brand-dark focus-visible:ring-brand/50 shadow-sm',

  // Orange — CTA / action / attention ONLY. Hover darkens slightly.
  accent:
    'bg-accent text-white hover:opacity-90 focus-visible:ring-accent/50 shadow-sm',

  // White surface with border — for non-primary actions.
  secondary:
    'bg-surface text-text-primary border border-border hover:bg-surface-muted hover:border-border-strong focus-visible:ring-brand/30',

  // Red — irreversible / destructive actions only.
  destructive:
    'bg-error text-white hover:opacity-90 focus-visible:ring-error/50 shadow-sm',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-base rounded-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium ' +
    'transition-colors duration-150 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
    'disabled:pointer-events-none disabled:opacity-50';

  return (
    <button
      className={`${base} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
