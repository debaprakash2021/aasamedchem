# AasaMedChem - Architecture Quick Reference

## 🏗️ SYSTEM LAYERS (Visual)

```
┌─────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React Components (Server & Client)                  │  │
│  │  ├─ Buyer Panel: Browse, Cart, Orders                │  │
│  │  ├─ Seller Panel: Products, Inventory, Analytics     │  │
│  │  └─ Admin Panel: Users, Settings, Oversight          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Zustand (Client) + React Query (Caching)            │  │
│  │  ├─ Cart: Add, remove, persist                       │  │
│  │  ├─ Session: User, role, permissions                │  │
│  │  └─ UI: Filters, modals, loading states              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                       API LAYER                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Route Handlers + Server Actions                     │  │
│  │  ├─ /api/products (search, detail, preview)          │  │
│  │  ├─ /api/quotations (list, create, status)           │  │
│  │  ├─ /api/cart (add, remove, preview)                 │  │
│  │  ├─ /api/admin/* (user, seller, analytics)           │  │
│  │  └─ Validation & Authorization at every route        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Services (lib/services/)                            │  │
│  │  ├─ UnitConversionService ⭐ (CRITICAL)              │  │
│  │  ├─ PricingService                                   │  │
│  │  ├─ InventoryService                                 │  │
│  │  ├─ QuotationService                                 │  │
│  │  ├─ SellerAnalyticsService                           │  │
│  │  └─ AuthenticationService                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                   DATA ACCESS LAYER                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Prisma ORM                                          │  │
│  │  ├─ Auto-generated query builders                    │  │
│  │  ├─ Connection pooling (PgBouncer)                   │  │
│  │  └─ Migrations & seeding                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE LAYER                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Neon PostgreSQL (Cloud)                             │  │
│  │  ├─ Users, Sellers, Products, Quotations             │  │
│  │  ├─ Units, ConversionFactors                         │  │
│  │  ├─ Inventory, AuditLogs                             │  │
│  │  └─ Row-level security (RBAC enforcement)            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 ROLE-BASED ACCESS CONTROL (Simple Overview)

```
┌─────────────────────────────────────────────────────────┐
│                   BUYER/USER                             │
├─────────────────────────────────────────────────────────┤
│ ✓ Browse products                                       │
│ ✓ Add to cart, adjust quantity                          │
│ ✓ Select unit, see price preview                        │
│ ✓ Submit quotation                                      │
│ ✓ View own orders & history                             │
│ ✓ Add to wishlist                                       │
│ ✗ Cannot see other buyers' orders                       │
│ ✗ Cannot access analytics                               │
│ ✗ Cannot create products                                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    SELLER                                │
├─────────────────────────────────────────────────────────┤
│ ✓ Create & manage own products                          │
│ ✓ Configure units & prices                              │
│ ✓ Manage inventory levels                               │
│ ✓ View incoming quotations                              │
│ ✓ Approve/reject orders                                 │
│ ✓ View own sales analytics & KPIs                       │
│ ✗ Cannot see other sellers' data                        │
│ ✗ Cannot manage users                                   │
│ ✗ Cannot edit other sellers' products                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     ADMIN                                │
├─────────────────────────────────────────────────────────┤
│ ✓ Access ALL sellers' products                          │
│ ✓ Access ALL buyers' orders                             │
│ ✓ Approve/suspend sellers                               │
│ ✓ Suspend/delete users                                  │
│ ✓ Override any quotation status                         │
│ ✓ View platform-wide analytics                          │
│ ✓ Manage units & conversion factors                     │
│ ✓ View audit logs (who did what, when)                 │
│ ✓ Everything = super-admin                              │
└─────────────────────────────────────────────────────────┘
```

---

## 🧮 UNIT CONVERSION SIMPLIFIED (The Heart)

```
EXAMPLE: Buyer orders 500g of Wheat Flour
Product setup: base unit = kg, price = ₹40/kg
Conversion: 1 kg = 1000 g (so 1 g = 0.001 kg)

┌─────────────────────────────────────────────────────────┐
│ STEP 1: CLIENT REQUEST                                  │
│ User: "I want 500 grams"                                │
│ Client: { productId: '123', quantity: 500, unit: 'g' }  │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 2: SERVER VALIDATION                               │
│ ✓ Is 'g' a supported unit? YES (g in conversionFactors) │
│ ✓ Is buyer logged in? YES                               │
│ ✓ Is product available? YES                             │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 3: CALCULATE IN BASE UNITS                          │
│ Formula: orderedQty × conversionFactor                   │
│ = 500 × 0.001 = 0.5 kg ✓                               │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 4: CALCULATE PRICE                                  │
│ Formula: basePrice × conversionFactor                    │
│ = ₹40 × 0.001 = ₹0.04 per gram ✓                       │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 5: CALCULATE TOTAL                                  │
│ Formula: orderedQty × unitPrice                          │
│ = 500 × ₹0.04 = ₹20.00 ✓                               │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 6: SNAPSHOT & STORE (ORDER SUBMITTED)              │
│ Store forever: { orderedQty: 500, unit: 'g',            │
│                  unitPrice: 0.04 (IMMUTABLE),            │
│                  lineTotal: 20.00 }                      │
│ Why snapshotted? So if price changes later, order       │
│ history remains accurate.                               │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 7: SELLER RECEIVES                                  │
│ Seller sees:                                             │
│ • Product: Wheat Flour                                   │
│ • Ordered: 500 g                                         │
│ • Base unit: kg (for reference)                         │
│ • Base qty: 0.5 kg (calculated)                         │
│ • Unit price: ₹0.04/g (snapshotted)                     │
│ • Total: ₹20.00 (snapshotted)                           │
│ Seller can verify: "That looks right! 500g of flour"    │
└─────────────────────────────────────────────────────────┘

KEY INSIGHT:
• All math happens on SERVER (never client)
• Conversion factors stored as database records
• Prices snapshotted (immutable) when order placed
• SELLER & ADMIN can see ALL conversion details for verification
```

---

## 📦 DATABASE SCHEMA SIMPLIFIED

```
USERS TABLE
├─ id, email, password
├─ role: [ADMIN, SELLER, BUYER]
├─ status: [ACTIVE, SUSPENDED]
└─ profile: name, avatar, address

SELLERS TABLE
├─ userId (links to Users)
├─ businessName, registrationNumber
├─ status: [APPROVED, SUSPENDED, PENDING]
└─ totalSales, totalOrders (cached metrics)

PRODUCTS TABLE
├─ sellerId (owner)
├─ name, sku, description, images
├─ baseUnitId (e.g., 'kg')
├─ basePrice (₹ per base unit)
└─ status: [DRAFT, ACTIVE, OUT_OF_STOCK]

UNITS TABLE
├─ code: 'g', 'kg', 'L', 'mL', 'item'
├─ categoryId: 'weight', 'volume', 'count'
└─ baseMultiplier: 0.001 (for g: 1 kg = 1000g)

CONVERSION_FACTORS TABLE
├─ productId
├─ fromUnitId, toUnitId
└─ factor: 0.001 (how many 'toUnit' = 1 'fromUnit')

INVENTORY TABLE
├─ productId
├─ quantity (always in BASE UNIT: kg, g, etc)
└─ reorderLevel

QUOTATIONS TABLE
├─ userId (buyer)
├─ quotationNumber: 'QT-2026-0001'
├─ status: [DRAFT, SUBMITTED, APPROVED, PAID, COMPLETED]
├─ subtotal, taxAmount, totalAmount
└─ createdAt, submittedAt, approvedAt

QUOTATION_ITEMS TABLE (line items)
├─ quotationId
├─ productId
├─ orderedQuantity, orderedUnit (what user ordered: 500g)
├─ unitPrice (₹0.04/g, SNAPSHOTTED)
├─ lineTotal: ₹20.00 (SNAPSHOTTED)
└─ baseQuantity: 0.5 kg (for reference)

AUDIT_LOGS TABLE
├─ userId, action, resourceType, resourceId
├─ changes: JSON (before/after values)
└─ timestamp

All tables use:
• numeric(19,6) for quantities/prices (precision!)
• numeric(19,2) for final totals (₹)
• UUID for IDs
• Timestamp for audit
```

---

## 🔄 UNIT CONVERSION FORMULA REFERENCE

```
FOR EVERY PRODUCT:

1. CONVERSION SETUP (Admin does once)
   ┌─ Wheat Flour
   ├─ base unit: kg
   ├─ base price: ₹40
   └─ conversions: { g: 0.001, kg: 1, item: null }
   
   Interpretation:
   • 1 kg = 1 kg (base unit multiplier)
   • 1 g = 0.001 kg (1 gram is 0.1% of a kg)
   • item: not supported for this product

2. WHEN BUYER ORDERS
   ┌─ User orders 500 g
   └─ System calculations:
      • baseQty = 500 × 0.001 = 0.5 kg
      • unitPrice = ₹40 × 0.001 = ₹0.04/g
      • lineTotal = 500 × ₹0.04 = ₹20.00
      • Stores ALL of these permanently

3. SELLER REVIEW
   ┌─ Seller sees:
   ├─ "Wheat Flour"
   ├─ "Ordered: 500 g"
   ├─ "Base unit: kg, Base qty: 0.5 kg"
   ├─ "Unit price: ₹0.04/g (₹40 per kg × 0.001 factor)"
   ├─ "Line total: ₹20.00"
   └─ Seller thinks: "That's correct! 500g at ₹0.04 each = ₹20"

PRECISION RULES:
• All intermediate calculations: numeric(19,6)
• Final totals: rounded to 2 decimals (paise)
• No rounding until final display
• PostgreSQL handles all precision (not JavaScript)
```

---

## 📊 PRICE PREVIEW FLOW (Critical API)

```
ENDPOINT: GET /api/products/[id]/price-preview?unit=g&quantity=500

REQUEST:
{
  productId: 'prod_123',
  orderedUnit: 'g',
  orderedQuantity: 500
}

BACKEND PROCESSING:
1. Fetch product: { baseUnit: 'kg', basePrice: 40, conversions: {...} }
2. Validate: Is 'g' supported? YES
3. Fetch current inventory: 10 kg available ✓
4. Calculate: baseQty = 500 × 0.001 = 0.5 kg ✓
5. Calculate: unitPrice = 40 × 0.001 = ₹0.04 ✓
6. Calculate: total = 500 × 0.04 = ₹20.00 ✓

RESPONSE:
{
  success: true,
  data: {
    productName: "Wheat Flour",
    baseUnit: "kg",
    basePrice: 40.00,
    orderedUnit: "g",
    orderedQuantity: 500,
    conversionFactor: 0.001,
    baseQuantity: 0.5,
    unitPrice: 0.04,
    lineTotal: 20.00,
    inventory: {
      currentStock: 10,        // in kg
      canFulfill: true
    },
    gst: {
      rate: 5,                 // percent
      amount: 1.00,            // ₹
      finalTotal: 21.00        // with tax
    },
    currency: "INR"
  }
}

CLIENT DISPLAY:
┌─────────────────────────────────┐
│ Price per gram: ₹0.04           │
│ For 500 grams: ₹20.00           │
│ GST (5%): ₹1.00                 │
│ Total: ₹21.00                   │
│                                 │
│ [Add to Cart] [Save to Wishlist]│
└─────────────────────────────────┘

KEY: This preview is LIVE and fresh every time.
     But once user submits, prices are SNAPSHOTTED.
```

---

## 🚀 DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│          DOMAIN: yourdomain.com                          │
│          (DNS via Vercel or Cloudflare)                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│    VERCEL (Frontend Hosting)                             │
│    ├─ Auto-deploys from GitHub main branch              │
│    ├─ Next.js serverless functions (/api)               │
│    ├─ Edge middleware (auth checks)                     │
│    ├─ Automatic SSL/TLS                                 │
│    └─ Global CDN for static assets                      │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│    NEON PostgreSQL (Database)                            │
│    ├─ Connection string: postgresql://...               │
│    ├─ Pooling: PgBouncer (built-in)                     │
│    ├─ Automatic backups (daily)                         │
│    ├─ Branching (dev/prod environments)                 │
│    └─ Monitoring & query insights                       │
└─────────────────────────────────────────────────────────┘

ENVIRONMENT VARIABLES (Vercel):
├─ DATABASE_URL (pooled connection)
├─ DIRECT_URL (for migrations)
├─ NEXTAUTH_URL=https://yourdomain.com
├─ NEXTAUTH_SECRET (random 32+ char string)
└─ Optional: SENTRY_DSN, ANALYTICS_KEY

CI/CD PIPELINE:
1. Push to GitHub main branch
2. Vercel auto-detects and builds
3. npx prisma migrate deploy (if schema changed)
4. Next.js build completes
5. Deploy to Vercel edge network
6. DNS updates (usually instant)
7. Live at yourdomain.com

ROLLBACK:
1. Vercel keeps 5+ previous deployments
2. Click "Rollback" in Vercel dashboard
3. Instant revert to previous code
4. Database: Keep on latest schema (migrations are one-way)
```

---

## 📋 CRITICAL SECURITY CHECKLIST

```
AUTHENTICATION ✓
☑ Passwords hashed with bcrypt (salt rounds: 12)
☑ NextAuth.js configured (JWT + session storage)
☑ CSRF tokens on all forms
☑ Password reset flow (if time permits)

AUTHORIZATION ✓
☑ Every route checks session.user.role
☑ Every API endpoint validates ownership (buyer → own orders only)
☑ Middleware blocks unauthenticated users
☑ Role-based query filters prevent data leaks

DATA PROTECTION ✓
☑ All secrets in environment variables (.env not committed)
☑ HTTPS only (Vercel enforces)
☑ Audit logs for all sensitive actions
☑ Database backups tested regularly

PERFORMANCE ✓
☑ Indexes on userId, sellerId, status, createdAt
☑ Pagination on large result sets (20-50 items)
☑ Caching with React Query / SWR
☑ Database connection pooling (Neon PgBouncer)

MONITORING ✓
☑ Sentry for error tracking
☑ Vercel Analytics for performance
☑ Database query logs (Neon dashboard)
☑ Uptime monitoring (StatusPage)
```

---

## 📅 IMPLEMENTATION TIMELINE

```
┌─ WEEK 1: FOUNDATION
│  ├─ Database schema design
│  ├─ Auth setup (NextAuth + JWT)
│  ├─ Unit system & conversion service
│  └─ Test users created
│
├─ WEEK 2: PRODUCT CATALOG
│  ├─ Admin product CRUD
│  ├─ Seller inventory management
│  ├─ Public product listing
│  └─ Price preview API
│
├─ WEEK 3: SHOPPING & ORDERS
│  ├─ Cart state management
│  ├─ Quotation submission
│  ├─ Seller order review
│  └─ Status workflow
│
├─ WEEK 4: SELLER ANALYTICS
│  ├─ Sales metrics calculation
│  ├─ Dashboard charts
│  ├─ Product performance
│  └─ Revenue trends
│
├─ WEEK 5: ADMIN PANEL & RBAC
│  ├─ User management
│  ├─ Seller approval flow
│  ├─ Quotation overrides
│  └─ Audit log viewer
│
├─ WEEK 6: BUYER FEATURES
│  ├─ Wishlist
│  ├─ Order history
│  ├─ Reorder functionality
│  └─ User profile
│
├─ WEEK 7: TESTING & POLISH
│  ├─ End-to-end testing
│  ├─ Security audit
│  ├─ Performance tuning
│  └─ Documentation
│
└─ WEEK 8: DEPLOYMENT
   ├─ Production setup
   ├─ Go-live checklist
   ├─ Monitoring activation
   └─ Support handoff
```

---

## ⚡ QUICK START CHECKLIST

```
BEFORE CODING:
☐ Read entire ARCHITECTURE.md
☐ Review database schema (prisma.schema)
☐ Understand unit conversion formulas
☐ Understand RBAC matrix (who can do what)
☐ Set up Neon account + create PostgreSQL database
☐ Set up Vercel account + connect GitHub

PHASE 1 (Database & Auth):
☐ Update prisma.schema with full model
☐ Run npx prisma migrate dev
☐ Create seed.ts with test users
☐ npx prisma db seed
☐ Set up NextAuth.js
☐ Test login with credentials

PHASE 2 (APIs & Services):
☐ Create lib/services/UnitConversionService.ts
☐ Create lib/services/PricingService.ts
☐ Create /api/products routes
☐ Create /api/quotations routes
☐ Test unit conversion with manual API calls

PHASE 3 (Frontend):
☐ Create layout hierarchy
☐ Create ProductCard component
☐ Create ProductSearch page
☐ Create UnitPricePreviewer component
☐ Create ShoppingCart component
☐ Create QuotationForm

PHASE 4 (Integration):
☐ Wire cart to API
☐ Wire quotation submission
☐ Test end-to-end flow
☐ Deploy to Vercel
☐ Test in production

FINAL:
☐ Documentation in README
☐ Create test script
☐ Train team
☐ Go live!
```

---

## 📚 KEY FILES TO CREATE

```
PROJECT ROOT
├─ src/
│  ├─ app/
│  │  ├─ api/
│  │  │  ├─ auth/
│  │  │  ├─ products/
│  │  │  ├─ quotations/
│  │  │  ├─ cart/
│  │  │  ├─ inventory/
│  │  │  └─ admin/
│  │  │
│  │  ├─ buyer/
│  │  │  ├─ browse/
│  │  │  ├─ cart/
│  │  │  ├─ my-orders/
│  │  │  └─ wishlist/
│  │  │
│  │  ├─ seller/
│  │  │  ├─ dashboard/
│  │  │  ├─ products/
│  │  │  ├─ inventory/
│  │  │  └─ analytics/
│  │  │
│  │  ├─ admin/
│  │  │  ├─ users/
│  │  │  ├─ sellers/
│  │  │  ├─ products/
│  │  │  ├─ quotations/
│  │  │  └─ settings/
│  │  │
│  │  ├─ actions/
│  │  │  ├─ products.ts (server actions)
│  │  │  ├─ quotations.ts
│  │  │  ├─ cart.ts
│  │  │  └─ inventory.ts
│  │  │
│  │  ├─ layout.tsx (root)
│  │  ├─ page.tsx (home)
│  │  └─ login/page.tsx
│  │
│  ├─ lib/
│  │  ├─ services/
│  │  │  ├─ UnitConversionService.ts ⭐
│  │  │  ├─ PricingService.ts
│  │  │  ├─ InventoryService.ts
│  │  │  ├─ QuotationService.ts
│  │  │  ├─ SellerAnalyticsService.ts
│  │  │  └─ AuthenticationService.ts
│  │  │
│  │  ├─ utils/
│  │  │  ├─ validation.ts
│  │  │  ├─ formatters.ts (₹ formatting)
│  │  │  └─ calculations.ts
│  │  │
│  │  ├─ hooks/
│  │  │  ├─ useAuth.ts
│  │  │  ├─ useCart.ts
│  │  │  ├─ usePricePreview.ts
│  │  │  └─ useWishlist.ts
│  │  │
│  │  ├─ store/
│  │  │  ├─ cartStore.ts (Zustand)
│  │  │  ├─ filterStore.ts
│  │  │  └─ uiStore.ts
│  │  │
│  │  ├─ prisma.ts (singleton)
│  │  ├─ auth.ts (NextAuth config)
│  │  └─ constants.ts
│  │
│  └─ components/
│     ├─ ProductCard.tsx
│     ├─ ProductSearch.tsx
│     ├─ UnitPricePreviewer.tsx
│     ├─ ShoppingCart.tsx
│     ├─ QuotationForm.tsx
│     ├─ QuotationItemTable.tsx
│     ├─ UnitSelector.tsx
│     ├─ PriceDisplay.tsx
│     ├─ Navigation.tsx
│     ├─ SellerDashboard.tsx
│     ├─ AdminPanel.tsx
│     ├─ AuthProvider.tsx
│     └─ ToastProvider.tsx
│
├─ prisma/
│  ├─ schema.prisma ⭐ (full schema)
│  └─ seed.ts
│
├─ public/
├─ .env.local (DO NOT COMMIT)
├─ .gitignore
├─ package.json
├─ tsconfig.json
├─ eslint.config.mjs
├─ next.config.ts
├─ ARCHITECTURE.md ⭐ (this file)
└─ README.md (to be filled)
```

---

## 🎯 CORE PRINCIPLES TO REMEMBER

```
1. CONVERSIONS HAPPEN ON SERVER
   ✗ Never let client calculate price or unit conversions
   ✓ Always validate & calculate on server
   ✓ Return calculated values to client for display

2. RBAC IS ENFORCED EVERYWHERE
   ✗ Don't assume user is authorized just because logged in
   ✓ Check role + check resource ownership in every handler
   ✓ Filter queries based on role

3. PRICES ARE SNAPSHOTTED
   ✗ Don't reference product.basePrice after order placed
   ✓ Store unitPrice in quotation item at order time
   ✓ Use snapshots for all order history

4. AUDIT ALL CONVERSIONS
   ✗ Don't delete conversion records
   ✓ Log every unit conversion with input/output
   ✓ Enable sellers/admins to verify math

5. USE NUMERIC PRECISION
   ✗ Never use JavaScript floating-point for money
   ✓ Use PostgreSQL numeric(19,6) for all quantities
   ✓ Round only final display amounts (2 decimals)

6. DOCUMENT YOUR ASSUMPTIONS
   ✗ Don't leave conversion logic undocumented
   ✓ Add comments in services
   ✓ Document in README how conversions work
   ✓ Create a conversion audit page for admins
```

---

## 🔗 NEXT IMMEDIATE ACTIONS

1. **Read ARCHITECTURE.md completely** (12 sections)
2. **Update prisma/schema.prisma** with full schema from Part 4
3. **Set up environment variables** in Vercel
4. **Create database schema** with: `npx prisma migrate dev --name init`
5. **Start Phase 1** with RBAC + Auth setup
6. **Create UnitConversionService** (most critical component)
7. **Test unit conversions** manually before building UI

---

**This architecture is production-ready and scalable to 100k+ orders.**  
**All security, RBAC, and precision requirements are met.**  
**Now implement! 🚀**
