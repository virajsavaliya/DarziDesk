import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxHeightClass?: string;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxHeightClass = 'max-h-[85dvh]',
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Auto-focus sheet ONLY ONCE when opened
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;

      const timer = setTimeout(() => {
        const firstInput = sheetRef.current?.querySelector<HTMLElement>(
          'input:not([type="hidden"]), select, textarea, button'
        );
        firstInput?.focus();
      }, 50);

      // Prevent body scroll behind sheet
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

      if (e.key === 'Tab' && sheetRef.current) {
        const focusableElements = sheetRef.current.querySelectorAll<HTMLElement>(
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
      className="fixed inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bottom-sheet-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Modal */}
      <div
        ref={sheetRef}
        className={`relative z-10 w-full bg-surface border-t border-border rounded-t-3xl shadow-2xl flex flex-col ${maxHeightClass} animate-in slide-in-from-bottom duration-300`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        {/* Drag Handle Bar */}
        <div className="w-full flex items-center justify-center pt-3 pb-1 cursor-grab" onClick={onClose}>
          <div className="w-12 h-1.5 rounded-full bg-border-strong/70 hover:bg-text-muted transition-colors" />
        </div>

        {/* Sheet Header */}
        <div className="px-5 py-3 border-b border-border/80 flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-3">
            <h2 id="bottom-sheet-title" className="text-base font-bold text-text-primary truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-text-secondary mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 min-h-[44px] min-w-[44px] rounded-full text-text-muted hover:text-text-primary hover:bg-surface-muted flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 overscroll-contain">
          {children}
        </div>

        {/* Optional Sticky Footer */}
        {footer && (
          <div className="px-5 py-3 border-t border-border bg-surface-muted/50 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
