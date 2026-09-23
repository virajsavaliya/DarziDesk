import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SmoothRevenueChart } from '../components/admin/SmoothRevenueChart';

describe('SmoothRevenueChart', () => {
  const mockProps = {
    currentMrr: 48500,
    currentArr: 582000,
    totalTenantsCount: 12,
    activePaidTenantsCount: 8,
    recentPayments: [
      {
        id: 'p-1',
        amount: 5000,
        recordedAt: new Date().toISOString(),
      },
    ],
  };

  it('renders the revenue trajectory title, live curve badge, and metric cards', () => {
    render(<SmoothRevenueChart {...mockProps} />);

    expect(screen.getByText('Recurring Revenue Trajectory')).toBeInTheDocument();
    expect(screen.getByText('Live Curve')).toBeInTheDocument();
    expect(screen.getByText('Current Run-Rate')).toBeInTheDocument();
    expect(screen.getByText('Avg MoM Growth')).toBeInTheDocument();
    expect(screen.getByText('Peak Month')).toBeInTheDocument();
    expect(screen.getByText('Total Invoiced')).toBeInTheDocument();
  });

  it('allows toggling between MRR and ARR', () => {
    render(<SmoothRevenueChart {...mockProps} />);

    const arrButton = screen.getByRole('button', { name: /arr/i });
    expect(arrButton).toBeInTheDocument();
    fireEvent.click(arrButton);

    // After clicking ARR, the active styling or updated values are reflected
    expect(arrButton).toHaveClass('bg-brand');
  });

  it('allows toggling between 6 Months and 12 Months', () => {
    render(<SmoothRevenueChart {...mockProps} />);

    const twelveMonthsButton = screen.getByRole('button', { name: /12 months/i });
    expect(twelveMonthsButton).toBeInTheDocument();
    fireEvent.click(twelveMonthsButton);

    expect(twelveMonthsButton).toHaveClass('bg-surface');
  });

  it('renders skeleton loading when loading is true', () => {
    const { container } = render(<SmoothRevenueChart {...mockProps} loading={true} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders SVG paths with smooth curves and animation classes', () => {
    const { container } = render(<SmoothRevenueChart {...mockProps} />);
    const drawLine = container.querySelector('.anim-draw-line');
    expect(drawLine).toBeInTheDocument();

    const fadeArea = container.querySelector('.anim-fade-area');
    expect(fadeArea).toBeInTheDocument();
  });
});
