import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Receipt,
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import type { Invoice, InvoiceStatus } from '../../types/dashboard';
import { INVOICE_STATUS_CONFIG } from '../../types/dashboard';
import { StatCard } from '../common/StatCard';
import { SectionCard } from '../common/SectionCard';
import { DataTable, type TableColumn } from '../common/DataTable';
import { InvoiceDetailDrawer } from './InvoiceDetailDrawer';
import { EmptyState } from '../common/EmptyState';

const STATUS_FILTERS: { id: string; label: string; status?: InvoiceStatus }[] = [
  { id: 'all', label: 'All Invoices' },
  { id: 'ISSUED', label: 'Issued / Unpaid', status: 'ISSUED' },
  { id: 'PARTIALLY_PAID', label: 'Partially Paid', status: 'PARTIALLY_PAID' },
  { id: 'PAID', label: 'Paid in Full', status: 'PAID' },
  { id: 'VOID', label: 'Void', status: 'VOID' },
];

interface OwnerInvoicesViewProps {
  authToken: string;
}

export const OwnerInvoicesView: React.FC<OwnerInvoicesViewProps> = ({ authToken }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus !== 'all') {
        params.set('status', selectedStatus);
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }
      params.set('limit', '50');

      const res = await fetch(`/api/invoices?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch invoices');
      }

      const data = await res.json();
      setInvoices(data.data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [authToken, selectedStatus, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchInvoices]);

  // Compute summary metrics across fetched invoices
  const totalInvoiced = invoices.reduce((acc, i) => acc + Number(i.totalAmount), 0);
  const totalCollected = invoices.reduce((acc, i) => acc + Number(i.advancePaid), 0);
  const totalOutstanding = invoices.reduce((acc, i) => acc + Number(i.balanceDue), 0);
  const unpaidCount = invoices.filter(
    (i) => i.status === 'ISSUED' || i.status === 'PARTIALLY_PAID',
  ).length;

  const handleInvoiceUpdated = (updated: Invoice) => {
    setSelectedInvoice(updated);
    setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
  };

  const columns: TableColumn<Invoice>[] = [
    {
      key: 'invoiceNumber',
      label: 'Invoice #',
      render: (inv) => (
        <button
          onClick={() => setSelectedInvoice(inv)}
          className="flex items-center gap-2 font-bold text-text-primary text-xs hover:text-brand transition-colors text-left"
        >
          <Receipt className="w-3.5 h-3.5 text-brand" />
          <span>{inv.invoiceNumber}</span>
        </button>
      ),
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (inv) => (
        <span className="text-xs text-text-muted">
          {new Date(inv.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (inv) => (
        <div>
          <div className="font-semibold text-text-primary text-xs">
            {inv.customer ? `${inv.customer.firstName} ${inv.customer.lastName}` : '—'}
          </div>
          <div className="text-[11px] text-text-muted">{inv.customer?.phone}</div>
        </div>
      ),
    },
    {
      key: 'order',
      label: 'Garment',
      render: (inv) => (
        <span className="font-medium text-xs text-text-primary">
          {inv.order?.garmentType ?? 'Garment'}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      label: 'Total',
      render: (inv) => (
        <span className="font-bold text-xs text-text-primary">
          ₹{Number(inv.totalAmount).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'advancePaid',
      label: 'Paid',
      render: (inv) => (
        <span className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
          ₹{Number(inv.advancePaid).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'balanceDue',
      label: 'Balance Due',
      render: (inv) => {
        const bal = Number(inv.balanceDue);
        return (
          <span
            className={`font-bold text-xs ${
              bal > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            ₹{bal.toFixed(2)}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (inv) => {
        const config = INVOICE_STATUS_CONFIG[inv.status];
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${config.bgClass} ${config.textClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      className: 'text-right',
      render: (inv) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedInvoice(inv);
          }}
          className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline px-2 py-1 rounded hover:bg-brand/10 transition-colors ml-auto"
        >
          View <ArrowRight className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          Billing & Invoices
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Generate, track, and record payments for tailoring orders
        </p>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Invoiced"
          value={loading ? '—' : `₹${totalInvoiced.toLocaleString('en-IN')}`}
          icon={<Receipt className="w-5 h-5" />}
          variant="brand"
          loading={loading}
        />
        <StatCard
          title="Collected Revenue"
          value={loading ? '—' : `₹${totalCollected.toLocaleString('en-IN')}`}
          icon={<CheckCircle2 className="w-5 h-5" />}
          variant="success"
          loading={loading}
        />
        <StatCard
          title="Outstanding Balance"
          value={loading ? '—' : `₹${totalOutstanding.toLocaleString('en-IN')}`}
          icon={<DollarSign className="w-5 h-5" />}
          variant={totalOutstanding > 0 ? 'warning' : 'neutral'}
          loading={loading}
        />
        <StatCard
          title="Unpaid Invoices"
          value={loading ? '—' : unpaidCount}
          icon={<Clock className="w-5 h-5" />}
          variant={unpaidCount > 0 ? 'accent' : 'neutral'}
          loading={loading}
        />
      </div>

      {/* ── Invoices Table Section ─────────────────────────────────── */}
      <SectionCard
        title="All Invoices"
        action={
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search invoice # or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
              />
            </div>
          </div>
        }
      >
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 pb-4 border-b border-border-default overflow-x-auto">
          {STATUS_FILTERS.map((tab) => {
            const active = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-brand text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-muted'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* DataTable */}
        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-surface-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : invoices.length > 0 ? (
          <DataTable
            columns={columns}
            rows={invoices}
            getRowKey={(inv) => inv.id}
          />
        ) : (
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title="No Invoices Found"
            description="No invoices match the current filter or search criteria."
          />
        )}
      </SectionCard>

      {/* Invoice Detail Drawer */}
      <InvoiceDetailDrawer
        invoice={selectedInvoice}
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        authToken={authToken}
        onInvoiceUpdated={handleInvoiceUpdated}
      />
    </div>
  );
};
