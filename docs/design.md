# DarziDesk Dashboard Design Specification

**Document:** `design.md`\
**Product:** DarziDesk\
**Purpose:** AI-ready dashboard UI/UX specification\
**Audience:** AI coding/design agents, frontend developers, UI
engineers, product designers

------------------------------------------------------------------------

## 1. Design Mission

Build DarziDesk as a modern SaaS platform for tailoring businesses.

The interface must feel: - Professional - Friendly - Simple - Fast -
Trustworthy - Modern - Indian/desi in personality without looking
outdated - Easy for a non-technical tailor/shop owner to understand

> **Core UX principle:** See what needs attention → take action → move
> the order forward.

Do not make users search through multiple screens for routine tailoring
work.

## 2. Brand Identity

**Brand:** DarziDesk

**Visual direction:** Deep Navy + Warm Darzi Orange + Clean Off-White.

Use navy for trust and structure, orange for action/brand recognition,
and neutral surfaces for clarity. Do not make the entire application
orange.

## 3. Color System

Use semantic tokens throughout. Do not invent random colors.

### Brand

``` text
brand-primary       #163B5C
brand-primary-dark  #102C44
brand-accent        #F28C28
brand-accent-light  #FFF1DF
```

### Neutrals

``` text
background           #F8FAFC
surface              #FFFFFF
surface-muted        #F1F5F9
text-primary         #1E293B
text-secondary       #64748B
text-muted           #94A3B8
border               #E2E8F0
border-strong        #CBD5E1
```

### Semantic

``` text
success              #22A06B
success-light        #E8F7F0
warning              #E9A23B
warning-light        #FFF6E5
error                #D64545
error-light          #FDECEC
info                 #3B82F6
info-light           #EFF6FF
```

### Order status

``` text
placed                 #3B82F6
measurement-confirmed #6366F1
cutting                #F59E0B
stitching              #F28C28
quality-check          #8B5CF6
ready                  #14B8A6
delivered              #22A06B
cancelled              #D64545
```

Approximate visual ratio: **70% neutral/white, 20% navy, 10% orange +
semantic colors**.

## 4. Typography

Use **Inter** as the primary UI font.

``` text
Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Recommended scale:

``` text
Display:       32px / 40px / 700
Page title:    28px / 36px / 700
Section title: 20px / 28px / 650
Card title:    16px / 24px / 600
Body:          14px / 22px / 400
Body strong:   14px / 22px / 600
Small:         12px / 18px / 500
Caption:       11px / 16px / 500
```

Avoid oversized dashboard typography.

## 5. Spacing, Radius, Shadows

Use a 4px base spacing scale:

``` text
4 8 12 16 20 24 32 40 48 64px
```

Preferred dashboard spacing: - Page padding: 24px - Card padding: 20px -
Section gap: 24px - Component gap: 12--16px

Radius:

``` text
sm 6px
md 8px
lg 12px
xl 16px
pill 999px
```

Use subtle borders rather than heavy shadows. Cards default to white
background and `1px solid #E2E8F0`. Shadows are mainly for dropdowns,
modals and popovers.

## 6. Application Shell

Desktop structure:

``` text
┌─────────────────────────────────────────────────────────────┐
│ Sidebar │ Top Header                                       │
│         ├───────────────────────────────────────────────────┤
│         │ Page Header                                       │
│         │ KPI / Summary Cards                               │
│         │ Work / Main Content                               │
│         │ Tables / Charts / Activity                        │
└─────────────────────────────────────────────────────────────┘
```

### Sidebar

-   Width approximately 240--260px
-   Background `#163B5C`
-   DarziDesk logo at top
-   Group navigation logically
-   Active item uses orange accent
-   Use Lucide React icons consistently
-   User/profile area at bottom

Sidebar text: white primary, `#B8C7D6` muted, `#F28C28` active.

### Top header

Left: page title/breadcrumb. Right: search, notifications, help if
needed, profile menu. Keep it lightweight.

## 7. Dashboard Hierarchy

Every role dashboard should follow: 1. Page header 2. Primary action 3.
KPI/summary cards 4. Work requiring attention 5. Main operational data
6. Secondary analytics/activity

The first screen should answer: **What is happening? What needs
attention? What should I do next?**

## 8. Role Dashboards

There are four primary dashboard experiences: 1. Super Admin 2. Shop
Owner 3. Staff 4. Customer

Do not create one generic dashboard and merely change its title.

### 8.1 Super Admin

Purpose: manage the DarziDesk platform rather than individual tailoring
work.

Focus on: - Platform health - Shops - Customers - Subscriptions -
Revenue - Marketplace - System activity - Security/audit events

KPIs:

``` text
Total Shops | Active Shops | New Shops | Platform Revenue
Active Subscriptions | Marketplace Activity
```

Main sections: - Platform Overview: shop growth, subscriptions, revenue
trends - Recent Shops: Shop, Owner, Plan, Status, Created, Actions -
System Alerts: failed payments, suspicious activity, service issues -
Audit Activity: recent privileged actions

Privileged tenant access must be explicitly authorized and auditable.

### 8.2 Shop Owner

This is the primary operational dashboard.

Header example:

``` text
Good morning, [Owner Name]
Here is what is happening in your shop today.
```

Primary CTA: `+ New Order` Secondary actions: `Add Customer`,
`Record Payment`

KPIs:

``` text
Today's Orders | Active Orders | Ready for Delivery
Pending Payments | Today's Revenue | Low Stock Items
```

Order pipeline:

``` text
Placed → Measurement Confirmed → Cutting → Stitching →
Quality Check → Ready → Delivered
```

Attention Required should surface: - Orders due today - Overdue orders -
Pending measurements - Pending payments - Low-stock fabric - QC issues

Recent Orders columns:

``` text
Order | Customer | Item | Due Date | Status | Amount | Payment | Action
```

Analytics should stay simple: revenue, orders, payments, customer
growth.

### 8.3 Staff

Purpose: show assigned work and next actions. Do not expose owner-only
financial data unless authorized.

KPIs should depend on staff role:

``` text
Assigned Today | In Progress | Due Today | Completed
```

Tailor example:

``` text
Stitching Queue | Due Today | QC Pending | Completed
```

Cutter example:

``` text
Cutting Queue | Urgent Orders | Due Today | Completed
```

Helper example:

``` text
Assigned Tasks | Due Today | In Progress | Completed
```

Primary section: **My Work**.

Example work card:

``` text
Order #DD-1051
Customer: Rahul
Item: Shirt
Due: Today
Status: Stitching
[Open Work] [Mark Complete]
```

Priority must be understandable without color alone: `Urgent`, `High`,
`Normal`.

### 8.4 Customer

Customer UI must be simpler and mobile-first.

Primary areas:

``` text
My Orders | Order Status | Measurements | Appointments | Payments | Notifications
```

Home example:

``` text
Welcome back, Rahul
Your latest order is in Stitching.
```

Active Order Card: - Order ID - Shop - Items - Expected delivery -
Current status - Payment status

Order timeline:

``` text
✓ Order Placed
✓ Measurement Confirmed
✓ Cutting
● Stitching
○ Quality Check
○ Ready
○ Delivered
```

Use horizontal timeline on desktop and vertical timeline on mobile.

## 9. Orders

Orders are the core operational object.

### Order list

Provide search, status/date/customer/assigned-staff/payment filters and
sorting.

Columns:

``` text
Order ID | Customer | Items | Assigned To | Due Date | Status | Payment | Actions
```

### Order detail

``` text
┌─────────────────────────────────────────────────────┐
│ Order #DD-1042                 Status: Stitching    │
│ Customer                         Due: 12 Sep        │
├─────────────────────────────────────────────────────┤
│ Order Timeline                                      │
├───────────────────────┬─────────────────────────────┤
│ Items                 │ Customer / Measurement      │
├───────────────────────┼─────────────────────────────┤
│ Notes / Instructions  │ Payment Summary             │
├───────────────────────┴─────────────────────────────┤
│ Activity / Audit                                     │
└─────────────────────────────────────────────────────┘
```

Only valid workflow actions should be offered. Backend state-machine
validation is authoritative.

### Kanban

Columns:

``` text
Placed | Measurement Confirmed | Cutting | Stitching | Quality Check | Ready | Delivered
```

Card content:

``` text
Order ID | Customer | Garment | Due date | Priority | Assigned staff | Payment indicator
```

Keep cards compact; do not show every field.

## 10. Measurements

Measurements are sensitive shop business data.

Group fields:

``` text
Basic
Upper Body
Lower Body
Sleeves
Special Notes
```

Example:

``` text
Chest 38 in | Waist 34 in | Shoulder 17 in | Sleeve 24 in | Length 29 in
```

Measurement history should show:

``` text
Version | Date | Updated By | Shop | Changes
```

Do not silently overwrite important measurement history.

**Critical tenancy rule:** global customer identity does not make
measurements global. Shop A must not see Shop B's measurements.

## 11. Customers

Customer list: search by phone/email, recent orders, outstanding
payment, measurement availability, status.

Profile tabs/sections:

``` text
Profile | Orders | Measurements | Payments | Appointments | Notes | Activity
```

Global identity may be shared, but shop-specific business relationships
and records remain tenant-scoped.

## 12. Inventory

Keep inventory operational.

Dashboard metrics:

``` text
Total Items | Low Stock | Out of Stock | Reserved | Available
```

Use stock states:

``` text
Available | Reserved | Consumed | Adjusted
```

Show stock movement history.

Do not treat order creation as final material consumption unless the
business workflow explicitly says so.

## 13. Billing & Payments

Clearly distinguish:

``` text
Total | Paid | Pending | Refunded
```

Payment statuses:

``` text
Paid | Partially Paid | Pending | Refunded | Failed
```

Use text + icons + semantic color. Payment processing must be idempotent
and duplicate-safe.

## 14. Marketplace

Marketplace should feel discovery-oriented rather than like an admin
dashboard.

Features:

``` text
Find Tailors Near Me | Search | Location | Specialization
Rating | Price Range | Availability | Portfolio | Reviews
```

Tailor/shop cards:

``` text
Shop image/logo
Shop name
Location
Specialties
Rating + review count
Starting price
CTA
```

## 15. Landing Page

Recommended structure:

``` text
Navbar
Hero
How DarziDesk Works
Features
For Shop Owners
For Staff
For Customers
Marketplace
Testimonials
Pricing
FAQ
CTA
Footer
```

Primary CTA: `Start Managing Your Shop` Secondary CTA:
`Explore Marketplace`

Use orange for the primary CTA. Avoid huge decorative gradients.

## 16. Core Components

Use/reuse:

``` text
AppShell
Sidebar
Topbar
PageHeader
StatCard
SectionCard
StatusBadge
PriorityBadge
DataTable
MobileDataCard
Button
Input
Select
DatePicker
SearchInput
Modal
Drawer
Dropdown
Tabs
Pagination
Timeline
KanbanBoard
KanbanCard
EmptyState
LoadingSkeleton
ErrorState
Toast
OrderCard
CustomerCard
MeasurementCard
PaymentSummary
ActivityFeed
```

Reuse existing components before creating visually different duplicates.

## 17. Buttons & Forms

Primary button:

``` text
Background #F28C28
Text #FFFFFF
Radius 8px
```

Secondary:

``` text
Background #FFFFFF
Border #CBD5E1
Text #163B5C
```

Form controls need Default, Hover, Focus, Filled, Disabled, Error and
Success states. Validation must never rely only on color.

Use one dominant primary action per section whenever possible.

## 18. Tables, Statuses & Feedback

Tables need clear headers, compact rows, right-aligned numeric values,
status badges and row actions. On mobile, convert important data into
cards or use horizontal scrolling only when appropriate.

Status badges always contain text. Example: `● Stitching`.

Every major data screen needs useful empty, loading and error states.

Example empty state:

``` text
No orders yet
Create your first order to start managing your tailoring workflow.
[+ New Order]
```

Loading: use skeletons for dashboard cards, tables, order details and
customer profiles. Prevent duplicate submissions.

Errors should be actionable and preserve entered data when possible.

## 19. Responsive Design

Breakpoints:

``` text
Mobile: < 768px
Tablet: 768px–1199px
Desktop: >= 1200px
```

Desktop: persistent sidebar, multi-column dashboard, full tables/charts.

Tablet: collapsible sidebar, two-column cards where appropriate, reduced
table columns.

Mobile: drawer/bottom navigation where appropriate, single-column cards,
touch-friendly controls, simplified tables and sticky primary actions
when useful.

Minimum touch target: **44px**.

## 20. Accessibility

Target WCAG 2.2 AA where practical.

Required: - Keyboard navigation - Visible focus states - Semantic HTML -
Accessible labels - Sufficient contrast - Screen-reader-friendly
controls - No color-only status communication - Meaningful errors -
\~44px minimum touch targets

Icons that perform actions need accessible labels.

## 21. Iconography

Use **Lucide React** or the established project icon library. Do not mix
unrelated icon families.

Suggested icons:

``` text
Orders       ClipboardList
Customers    Users
Measurements Ruler
Inventory    Package
Payments     CreditCard
Reports      BarChart3
Settings     Settings
Search       Search
Notification Bell
```

## 22. Charts

Every chart must answer a business question.

Examples: - Revenue trend → line chart - Orders by status → bar/donut
where useful - Order volume → bar/line - Customer growth → line

Charts require labels, useful legends, accessible data representation
and loading/empty states. Do not add charts only for decoration.

## 23. Data Isolation & Permissions

DarziDesk is multi-tenant.

> **Global identity is shared; shop business data is not.**

Tenant-scoped examples: - Measurements - Orders - Order notes - Files -
Payments - Inventory - Staff assignments - Shop-specific customer notes

Shop A must never display Shop B's records.

Frontend filtering is not a security boundary. Backend authorization and
database protections must enforce isolation. PostgreSQL RLS remains
defense-in-depth for tenant-owned data.

Role-based UI should hide/disable unauthorized actions, but backend
authorization remains authoritative.

## 24. Security-Sensitive UI

For destructive actions such as delete, cancel, refund, archive and
remove staff, use confirmation where appropriate and state exactly what
will happen.

Example:

``` text
Cancel Order #DD-1042?
This will stop the current tailoring workflow.
[Keep Order] [Cancel Order]
```

## 25. Dark Mode

If implemented, preserve semantic hierarchy instead of simply inverting
colors.

Suggested dark surfaces:

``` text
#0F172A
#111827
#1E293B
```

Maintain high contrast and use the brand accent consistently. Do not
introduce unrelated colors.

## 26. CSS / Tailwind Tokens

Use semantic tokens rather than hard-coded colors inside components.

``` css
:root {
  --color-brand-primary: #163B5C;
  --color-brand-primary-dark: #102C44;
  --color-brand-accent: #F28C28;
  --color-brand-accent-light: #FFF1DF;
  --color-background: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-surface-muted: #F1F5F9;
  --color-text-primary: #1E293B;
  --color-text-secondary: #64748B;
  --color-text-muted: #94A3B8;
  --color-border: #E2E8F0;
  --color-border-strong: #CBD5E1;
  --color-success: #22A06B;
  --color-warning: #E9A23B;
  --color-error: #D64545;
  --color-info: #3B82F6;
}
```

## 27. AI Implementation Rules

### MUST

-   Reuse design tokens and existing components.
-   Keep role dashboards genuinely role-specific.
-   Make primary actions obvious.
-   Implement loading, empty and error states.
-   Respect role permissions and tenant isolation.
-   Keep customer UI simpler than internal UI.
-   Make responsive behavior explicit.
-   Use accessible labels and keyboard interactions.
-   Keep mobile tables usable.
-   Keep visual hierarchy consistent.

### MUST NOT

-   Invent random brand colors.
-   Use arbitrary gradients.
-   Use excessive shadows.
-   Use giant rounded containers everywhere.
-   Default to glassmorphism.
-   Add unnecessary animation.
-   Make every card colorful.
-   Use color alone for statuses.
-   Treat frontend hiding as authorization.
-   Duplicate components with slightly different styling.
-   Make every page visually identical.
-   Add widgets without a business purpose.

## 28. Animation

Use subtle functional transitions, typically 150--250ms, for dropdowns,
modals, sidebar transitions, hover states and status updates.

Avoid large entrance animations, constant movement, decorative dashboard
motion or slow page transitions.

## 29. Page Consistency

Every internal page should preserve:

``` text
Same shell
Same typography
Same spacing
Same button hierarchy
Same card treatment
Same status system
Same responsive behavior
```

Content and workflow change by module; the visual language does not.

## 30. Final QA Checklist

### Layout

-   Hierarchy obvious
-   Primary action visible
-   Not overcrowded
-   Consistent spacing

### Branding

-   Correct DarziDesk navy
-   Orange reserved for action/accent
-   Neutral surfaces dominant

### UX

-   Understandable within \~5 seconds
-   Next action obvious
-   Empty/loading/error states present

### Responsive

-   Works at 375px mobile
-   Works on tablet
-   Desktop uses available space correctly

### Accessibility

-   Keyboard navigable
-   Labels present
-   Contrast sufficient
-   Status understandable without color

### Security

-   Unauthorized actions hidden in UI
-   Authorization enforced server-side
-   Tenant data isolated

## 31. Golden Rule

When uncertain between two designs, prefer the one that is:

``` text
Simpler
Clearer
More actionable
Less decorative
More consistent
More accessible
```

DarziDesk should feel like a **professional digital desk for a tailor**,
not a generic analytics dashboard.

## 32. Final AI Instruction

When generating any DarziDesk screen: 1. Identify the user role. 2.
Identify the user's primary task. 3. Identify the most important
information. 4. Use the DarziDesk design tokens. 5. Follow the
established layout and component system. 6. Reuse components before
creating new patterns. 7. Implement all necessary states. 8. Make
responsive behavior explicit. 9. Respect tenant isolation and
permissions. 10. Keep the design operational, simple and accessible. 11.
Do not invent visual patterns that conflict with this document.

### Design personality

**DESI + FRIENDLY + PROFESSIONAL + SIMPLE + MODERN**

### Product personality

**Trustworthy + Fast + Practical + Organized**

### Core promise

> **Run your tailoring shop from one simple desk.**
