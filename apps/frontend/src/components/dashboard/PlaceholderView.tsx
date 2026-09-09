import React from 'react';
import { Construction } from 'lucide-react';
import { SectionCard } from '../common/SectionCard';
import { EmptyState } from '../common/EmptyState';

const PLACEHOLDER_CONFIG: Record<
  string,
  { title: string; description: string }
> = {
  billing: {
    title: 'Billing & Invoices',
    description:
      'Track payments, generate invoices, and manage customer balances. Coming in a future release.',
  },
  marketplace: {
    title: 'Marketplace',
    description:
      'List your shop on the DarziDesk Marketplace and attract new customers across the city. Coming soon.',
  },
  reports: {
    title: 'Reports & Analytics',
    description:
      'Detailed revenue reports, order trends, staff performance, and fabric consumption analytics. Coming soon.',
  },
  products: {
    title: 'Products & Services',
    description:
      'Define your service catalog — garment types, standard prices, and add-ons. Coming soon.',
  },
  settings: {
    title: 'Shop Settings',
    description:
      'Manage your shop profile, working hours, tax settings, and notification preferences. Coming soon.',
  },
};

interface PlaceholderViewProps {
  viewId: string;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({ viewId }) => {
  const config = PLACEHOLDER_CONFIG[viewId] ?? {
    title: 'Coming Soon',
    description: 'This section is under development and will be available in a future release.',
  };

  return (
    <SectionCard title={config.title}>
      <EmptyState
        icon={<Construction className="w-8 h-8" />}
        title={`${config.title} — Coming Soon`}
        description={config.description}
        action={
          <div className="flex items-center gap-2 px-4 py-2 bg-surface-muted border border-border rounded-xl text-sm text-text-muted cursor-default">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            In Development
          </div>
        }
      />
    </SectionCard>
  );
};
