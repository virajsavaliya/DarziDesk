import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface ActionOverflowMenuProps {
  items: ActionMenuItem[];
  ariaLabel?: string;
}

export const ActionOverflowMenu: React.FC<ActionOverflowMenuProps> = ({
  items,
  ariaLabel = 'More actions',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (items.length === 0) return null;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={ariaLabel}
        className="p-2 min-h-[44px] min-w-[44px] rounded-xl border border-border bg-surface hover:bg-surface-muted text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 bottom-full sm:bottom-auto sm:top-full mb-2 sm:mb-0 sm:mt-1.5 w-52 rounded-2xl bg-surface border border-border shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150"
        >
          {items.map((item) => (
            <button
              key={item.id}
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setIsOpen(false);
                item.onClick();
              }}
              className={`w-full min-h-[44px] px-4 py-2 text-left text-xs font-semibold flex items-center gap-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                item.variant === 'danger'
                  ? 'text-error hover:bg-error-light/50'
                  : 'text-text-primary hover:bg-surface-muted'
              }`}
            >
              {item.icon && <span className="w-4 h-4 shrink-0">{item.icon}</span>}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
