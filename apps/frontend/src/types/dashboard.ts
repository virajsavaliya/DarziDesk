export type OrderStatus =
  | 'PLACED'
  | 'MEASUREMENT_CONFIRMED'
  | 'CUTTING'
  | 'STITCHING'
  | 'QUALITY_CHECK'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

export type GarmentType = 'SHIRT' | 'PANT' | 'TSHIRT' | 'KURTA' | 'CUSTOM';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
}

export interface Fabric {
  id: string;
  name: string;
  color: string;
  type: string;
  pricePerMeter: string;
}

export interface MeasurementVersion {
  id: string;
  versionNumber: number;
  isCurrent: boolean;
  values: Record<string, string | number>;
  unit?: string;
  fitPreference?: string;
  fitNotes?: string | null;
  createdAt: string;
}

export interface MeasurementProfile {
  id: string;
  tenantId?: string;
  customerId?: string;
  name: string;
  garmentType: GarmentType;
  notes?: string | null;
  versions?: MeasurementVersion[];
}

export interface AssignedStaff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface OrderStatusLog {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedById: string;
  changedAt: string;
  note: string | null;
  changedBy?: {
    firstName: string;
    lastName: string;
  };
}

export interface Order {
  id: string;
  tenantId: string;
  customerId: string;
  measurementProfileId: string;
  fabricId: string;
  garmentType: GarmentType;
  metersUsed: string;
  status: OrderStatus;
  assignedStaffId: string | null;
  priceSnapshot: string;
  estimatedDeliveryDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  fabric?: Fabric;
  measurementProfile?: MeasurementProfile;
  assignedStaff?: AssignedStaff | null;
  statusLogs?: OrderStatusLog[];
  allowedNextTransitions?: OrderStatus[];
  invoices?: Invoice[];
}

export interface DailySummary {
  completedToday: number;
  pendingCount: number;
  dueNext48Hours: number;
  timezone: string;
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: 'SHOP_OWNER' | 'STAFF' | 'CUSTOMER' | 'SUPER_ADMIN';
  token: string;
}

export interface DemoSessionData {
  tenant: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
  };
  users: DemoUser[];
}

// ---------------------------------------------------------------------------
// Phase 9 — Customer Portal Types
// ---------------------------------------------------------------------------

export interface CustomerPortalShop {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
  allowsSelfMeasurement: boolean;
}

export interface CustomerPortalOrder extends Order {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface CustomerPortalInvoice extends Invoice {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface CustomerPortalMeasurementProfile extends MeasurementProfile {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

// ---------------------------------------------------------------------------
// Phase 6 — Owner Dashboard Types
// ---------------------------------------------------------------------------

export interface OwnerDashboardSummary {
  todaysOrders: number;
  activeOrders: number;
  readyForDelivery: number;
  lowStockFabrics: number;
  ordersThisWeek: { date: string; count: number }[];
  ordersByStatus: { status: OrderStatus; count: number }[];
}

export interface AttentionOrder {
  id: string;
  garmentType: GarmentType;
  status: OrderStatus;
  estimatedDeliveryDate: string | null;
  customer: { firstName: string; lastName: string } | null;
}

export interface LowStockFabric {
  id: string;
  name: string;
  color: string;
  availableMeters: string;
  lowStockThreshold: string;
}

export interface AttentionRequired {
  overdueOrders: AttentionOrder[];
  dueTodayOrders: AttentionOrder[];
  lowStockFabrics: LowStockFabric[];
}

export interface ActivityEntry {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedAt: string;
  note: string | null;
  order: {
    id: string;
    garmentType: GarmentType;
    customer: { firstName: string; lastName: string } | null;
  } | null;
  changedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface FabricItem {
  id: string;
  name: string;
  color: string;
  type: string;
  pricePerMeter: string;
  availableMeters: string;
  reservedMeters: string;
  lowStockThreshold: string;
  supplierName: string | null;
  photoUrl: string | null;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'SHOP_OWNER' | 'STAFF';
  createdAt: string;
  _count?: { assignedOrders: number };
}

/**
 * Status display configuration with exact design token classes
 */
export const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bgClass: string; textClass: string; dotClass: string }
> = {
  PLACED: {
    label: 'Placed',
    bgClass: 'bg-status-placed/15',
    textClass: 'text-status-placed',
    dotClass: 'bg-status-placed',
  },
  MEASUREMENT_CONFIRMED: {
    label: 'Measurement Verified',
    bgClass: 'bg-status-measurement/15',
    textClass: 'text-status-measurement',
    dotClass: 'bg-status-measurement',
  },
  CUTTING: {
    label: 'Cutting',
    bgClass: 'bg-status-cutting/15',
    textClass: 'text-status-cutting',
    dotClass: 'bg-status-cutting',
  },
  STITCHING: {
    label: 'Stitching',
    bgClass: 'bg-status-stitching/15',
    textClass: 'text-status-stitching',
    dotClass: 'bg-status-stitching',
  },
  QUALITY_CHECK: {
    label: 'Quality Check',
    bgClass: 'bg-status-qc/15',
    textClass: 'text-status-qc',
    dotClass: 'bg-status-qc',
  },
  READY: {
    label: 'Ready for Pickup',
    bgClass: 'bg-status-ready/15',
    textClass: 'text-status-ready',
    dotClass: 'bg-status-ready',
  },
  DELIVERED: {
    label: 'Delivered',
    bgClass: 'bg-status-delivered/15',
    textClass: 'text-status-delivered',
    dotClass: 'bg-status-delivered',
  },
  CANCELLED: {
    label: 'Cancelled',
    bgClass: 'bg-status-cancelled/15',
    textClass: 'text-status-cancelled',
    dotClass: 'bg-status-cancelled',
  },
};

/**
 * Phase 4 state machine valid transitions map
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ['MEASUREMENT_CONFIRMED', 'CANCELLED'],
  MEASUREMENT_CONFIRMED: ['CUTTING', 'CANCELLED'],
  CUTTING: ['STITCHING', 'CANCELLED'],
  STITCHING: ['QUALITY_CHECK'],
  QUALITY_CHECK: ['READY', 'STITCHING'],
  READY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

// ---------------------------------------------------------------------------
// Phase 7A — Invoice & Billing Types
// ---------------------------------------------------------------------------

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'VOID';
export type PaymentMethod = 'CASH' | 'UPI_MANUAL' | 'BANK_TRANSFER' | 'GATEWAY';

export interface InvoicePayment {
  id: string;
  amount: string;
  paymentMethod: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  recordedAt: string;
  recordedBy?: { id: string; firstName: string; lastName: string };
}

export interface Invoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  orderId: string;
  customerId: string;
  fabricCost: string;
  stitchingCharge: string;
  urgentSurcharge: string;
  taxRatePercent: string;
  taxAmount: string;
  totalAmount: string;
  advancePaid: string;
  balanceDue: string;
  status: InvoiceStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; firstName: string; lastName: string; phone: string; email?: string | null };
  order?: {
    id: string;
    garmentType: GarmentType;
    status: OrderStatus;
    metersUsed?: string;
    priceSnapshot?: string;
    fabric?: { id: string; name: string; color: string; type: string };
    measurementProfile?: { id: string; name: string };
  };
  payments?: InvoicePayment[];
}

export interface TenantPricingRule {
  id: string;
  garmentType: GarmentType;
  stitchingCharge: string;
}

export const INVOICE_STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; bgClass: string; textClass: string; dotClass: string }
> = {
  DRAFT: {
    label: 'Draft',
    bgClass: 'bg-slate-100 dark:bg-slate-800',
    textClass: 'text-slate-600 dark:text-slate-400',
    dotClass: 'bg-slate-400',
  },
  ISSUED: {
    label: 'Issued / Unpaid',
    bgClass: 'bg-blue-50 dark:bg-blue-950/40',
    textClass: 'text-blue-700 dark:text-blue-300',
    dotClass: 'bg-blue-500',
  },
  PARTIALLY_PAID: {
    label: 'Partially Paid',
    bgClass: 'bg-amber-50 dark:bg-amber-950/40',
    textClass: 'text-amber-700 dark:text-amber-300',
    dotClass: 'bg-amber-500',
  },
  PAID: {
    label: 'Paid in Full',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
  },
  VOID: {
    label: 'Void',
    bgClass: 'bg-rose-50 dark:bg-rose-950/40',
    textClass: 'text-rose-600 dark:text-rose-400',
    dotClass: 'bg-rose-400',
  },
};

// ---------------------------------------------------------------------------
// Marketplace Types
// ---------------------------------------------------------------------------

export type ListingStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface PublicShop {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  specialtyTags: string[];
  coverPhotoUrl: string | null;
  portfolioPhotoUrls: string[];
  workingHours: Record<string, string> | null;
  avgRating: number | null;
  reviewCount: number;
  distanceKm?: number | null;
  reviews?: ShopReview[];
}

export interface ShopReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  customerName: string;
}

export interface MarketplaceSettings {
  id: string;
  name: string;
  slug: string;
  isListedOnMarketplace: boolean;
  listingStatus: ListingStatus;
  rejectionReason: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  specialtyTags: string[];
  coverPhotoUrl: string | null;
  portfolioPhotoUrls: string[];
  workingHours: Record<string, string> | null;
  updatedAt?: string;
}

export interface FlaggedReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  isFlagged: boolean;
  flagReason: string | null;
  flaggedBy: string | null;
  createdAt: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
}

// ---------------------------------------------------------------------------
// Phase 11: Subscriptions, Plans & Super Admin Platform Dashboard Types
// ---------------------------------------------------------------------------

export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'EXPIRED';

export type SubscriptionBillingCycle = 'MONTHLY' | 'YEARLY';

export type SubscriptionPaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'UPI'
  | 'CHEQUE'
  | 'GATEWAY';

export interface SubscriptionPlanItem {
  id: string;
  name: string;
  priceMonthly: string | number;
  priceYearly: string | number;
  maxStaffAccounts: number;
  maxOrdersPerMonth: number;
  maxSmsCredits: number;
  features: string[];
  isActive: boolean;
  isDefault?: boolean;
  createdAt?: string;
  _count?: { subscriptions: number };
}

export interface TenantSubscriptionItem {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: SubscriptionBillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string | null;
  cancelledAt?: string | null;
  plan: SubscriptionPlanItem;
  payments?: TenantSubscriptionPaymentItem[];
}

export interface TenantSubscriptionPaymentItem {
  id: string;
  tenantName?: string;
  planName?: string;
  amount: number | string;
  paymentMethod: SubscriptionPaymentMethod;
  referenceNote?: string | null;
  periodStart: string;
  periodEnd: string;
  recordedAt: string;
}

export interface AdminTenantSummaryItem {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  isActive: boolean;
  createdAt: string;
  staffCount: number;
  totalOrdersCount: number;
  orderCountThisPeriod: number;
  subscription: {
    id: string;
    status: SubscriptionStatus;
    billingCycle: SubscriptionBillingCycle;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    trialEndsAt: string | null;
    plan: SubscriptionPlanItem;
  } | null;
}

export interface AdminTenantDetailItem {
  tenant: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    isActive: boolean;
    isListedOnMarketplace: boolean;
    listingStatus: ListingStatus;
    createdAt: string;
    updatedAt: string;
    staffCount: number;
    totalOrdersCount: number;
    orderCountThisPeriod: number;
  };
  currentSubscription: TenantSubscriptionItem | null;
  subscriptionHistory: TenantSubscriptionItem[];
}

export interface PlatformRevenueSummary {
  mrr: number;
  arr: number;
  totalTenantsCount: number;
  activePaidTenantsCount: number;
  trialTenantsCount: number;
  pastDueTenantsCount: number;
  churnedTenantsCount: number;
  recentPayments: TenantSubscriptionPaymentItem[];
}

