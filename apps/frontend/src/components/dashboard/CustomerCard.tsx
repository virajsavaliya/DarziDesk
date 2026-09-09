import React from 'react';
import type { Customer } from '../../types/dashboard';
import { Phone, ChevronRight } from 'lucide-react';

interface CustomerCardProps {
  customer: Customer;
  isSelected?: boolean;
  onClick: () => void;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({
  customer,
  isSelected = false,
  onClick,
}) => {
  const initials = `${customer.firstName?.[0] || ''}${customer.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`p-4 rounded-xl border transition-all cursor-pointer min-h-[44px] flex items-center justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-accent ${
        isSelected
          ? 'bg-brand/5 border-brand ring-1 ring-brand'
          : 'bg-surface border-border hover:border-brand/40'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand font-bold text-sm flex items-center justify-center shrink-0">
          {initials || 'CU'}
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-text-primary text-sm truncate">
            {customer.firstName} {customer.lastName}
          </h4>
          <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-0.5">
            <Phone className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <span className="truncate">{customer.phone}</span>
          </div>
          {customer.email && (
            <span className="text-[11px] text-text-muted truncate block">
              {customer.email}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs text-brand font-semibold shrink-0">
        <span className="hidden sm:inline">Profiles</span>
        <ChevronRight className="w-4 h-4" />
      </div>
    </div>
  );
};
