import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClass?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  widthClass,
  size,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const sizeMap: Record<string, string> = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };
  const resolvedWidthClass =
    widthClass ?? (size && sizeMap[size] ? sizeMap[size] : size) ?? 'max-w-2xl';

  // Auto-focus first input ONLY ONCE when drawer opens
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;

      const timer = setTimeout(() => {
        const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
          'input:not([type="hidden"]), select, textarea, button:not([aria-label="Close drawer"])'
        );
        firstFocusable?.focus();
      }, 50);

      document.body.style.overflow = 'hidden';

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
        previousFocusRef.current?.focus();
      };
    }
  }, [isOpen]);

  // Focus trap & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      aria-labelledby="drawer-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container: 0 padding on mobile (full width), pl-10 on sm+ */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div
          ref={drawerRef}
          className={`w-screen ${resolvedWidthClass} bg-surface border-l border-border shadow-2xl flex flex-col h-full max-h-dvh animate-in slide-in-from-right duration-200`}
        >
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between bg-surface shrink-0">
            <div className="min-w-0 pr-3">
              {title && (
                <div id="drawer-title" className="text-base sm:text-lg font-bold text-text-primary truncate">
                  {title}
                </div>
              )}
              {subtitle && (
                <div className="text-xs text-text-secondary mt-0.5 truncate">
                  {subtitle}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 min-h-[44px] min-w-[44px] text-text-secondary hover:text-text-primary rounded-xl hover:bg-surface-muted transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent shrink-0"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6 overscroll-contain">
            {children}
          </div>

          {/* Footer (with safe-area bottom padding) */}
          {footer && (
            <div
              className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border bg-surface-muted/50 shrink-0"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
