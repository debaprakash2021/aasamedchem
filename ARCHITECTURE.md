# AasaMedChem - Complete System Architecture
## A Production-Grade Inventory & Order Management Platform

---

## PART 1: SYSTEM OVERVIEW

### 1.1 Mission & Core Pillars
This is a **multi-tenant inventory and order platform** serving three distinct user types with strict role separation:

1. **Buyers/Users** - Browse catalog, place orders, track purchases
2. **Sellers** - Manage product inventory, view analytics, process orders
3. **Admins** - Global oversight, RBAC, seller/user management, dispute resolution

**Core Pillars:**
- **Security First**: RBAC enforced at every layer (route, API, database)
- **Precision**: Unit conversion & pricing validated server-side, never client-calculated
- **Auditability**: All conversions, prices, and changes logged for verification
- **Scalability**: Designed for 10k+ products, 100k+ orders, sub-second conversions

---

## PART 2: ROLE-BASED ACCESS CONTROL (RBAC) - THE FOUNDATION

### 2.1 Role Hierarchy & Permissions Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                   ROLE HIERARCHY                                 │
├─────────────────────────────────────────────────────────────────┤
│ ADMIN (Super)                                                    │
│  ├─ Can access ALL user accounts                                │
│  ├─ Can access ALL seller accounts                              │
│  ├─ Can override any permission                                 │
│  └─ Can manage RBAC roles & permissions                         │
│                                                                  │
│ SELLER (Resource Owner)                                         │
│  ├─ Owns product catalog                                        │
│  ├─ Views only own analytics & orders                           │
│  └─ Cannot access other seller data                             │
│                                                                  │
│ BUYER/USER (Standard)                                           │
│  ├─ Browse public catalog                                       │
│  ├─ Place orders & view own history                            │
│  └─ Cannot access other user data                              │
│                                                                  │
│ GUEST (Unauth)                                                  │
│  └─ View public product listings (read-only)                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Permission Matrix (Detailed Access Control)

| Resource | Buyer | Seller | Admin | Guest |
|----------|-------|--------|-------|-------|
| **Products** | View Own Seller's | View/Edit Own | View/Edit/Delete All | View All (Public) |
| **Inventory** | N/A | View/Adjust Own | View All | N/A |
| **Orders** | View Own | View Own Received | View All | N/A |
| **Quotations** | Create/View Own | View Own Received | View/Modify All | N/A |
| **Users** | View Own Profile | N/A | View/Edit/Ban All | N/A |
| **Analytics** | View Own Purchase Stats | View Own Sales Analytics | View All Analytics | N/A |
| **Payments** | Process Own | Receive Own | View All | N/A |
| **Admin Panel** | N/A | N/A | Full Access | N/A |

### 2.3 RBAC Implementation Strategy

**Database Layer (Role-Aware Queries)**
```
User Table:
├─ id (UUID)
├─ email (unique)
├─ role: enum('ADMIN', 'SELLER', 'BUYER')
├─ sellerId (FK, nullable, non-null only if role=SELLER)
├─ status: enum('ACTIVE', 'SUSPENDED', 'DELETED')
├─ profile: jsonb (name, avatar, phone, address)
└─ createdAt, updatedAt

Seller Table:
├─ id (UUID)
├─ userId (FK) - owner/creator
├─ businessName
├─ registrationNumber
├─ bankDetails: jsonb
├─ analytics: jsonb (cached)
├─ status: enum('APPROVED', 'PENDING', 'SUSPENDED')
└─ products: relation (1-to-many)

Note: Each seller has exactly ONE User owner.
Product.sellerId ensures product belongs to one seller.
```

**Authentication Layer**
```
NextAuth.js Strategy:
├─ JWT + Credentials Provider
├─ Session contains:
│  ├─ user.id
│  ├─ user.email
│  ├─ user.role
│  ├─ user.sellerId (if seller)
│  └─ user.permissions[] (derived from role)
├─ Token expiry: 30 days
└─ Refresh mechanism: Automatic on page load

Middleware Enforcement:
├─ /api/* routes check JWT
├─ Page routes redirect unauthenticated
├─ Layout checks role and restricts access
└─ Server actions validate session in every call
```

**API Authorization Pattern**
```
Every route handler & server action:

1. Extract session from request
2. If no session → return 401 Unauthorized
3. Check user.role against required role(s)
4. For resource-scoped operations:
   - If BUYER: verify resource.userId === session.user.id
   - If SELLER: verify resource.sellerId === session.user.sellerId
   - If ADMIN: allow all (optionally log for audit)
5. Apply role-specific query filters before database
6. Return filtered results or 403 Forbidden

Example (Get user's orders):
  - BUYER sees: WHERE userId = {current_user_id}
  - SELLER sees: WHERE sellerId = {current_seller_id}
  - ADMIN sees: WHERE 1=1 (all, with audit log)
```

---

## PART 3: UNIT CONVERSION & PRICING ENGINE (CRITICAL CORE)

### 3.1 Master Unit System

**Supported Dimensions**
```
WEIGHT:
├─ gram (g) ..................... atomic unit
├─ kilogram (kg) ............... 1,000 g
├─ metric ton (mt) ............ 1,000,000 g
└─ custom units ............... admin-defined

VOLUME:
├─ milliliter (mL) ............ atomic unit
├─ liter (L) .................. 1,000 mL
├─ gallon (imperial) ......... 4,546.09 mL (configurable)
└─ custom units ............... admin-defined

COUNT:
├─ item (unit/count) ......... atomic unit
├─ dozen ..................... 12 items
├─ box ....................... admin-defined
└─ custom units ............... admin-defined

CUSTOM:
├─ Any product-specific unit
├─ Requires explicit conversion factor
└─ Only for that product
```

### 3.2 Unit Conversion Database Schema

```prisma
model UnitCategory {
  id          String @id @default(cuid())
  name        String // 'weight', 'volume', 'count', 'custom'
  dimension   String // For grouping (e.g., "mass", "length")
  units       Unit[]
  products    Product[] @relation("ProductUnitCategory")
}

model Unit {
  id           String @id @default(cuid())
  code         String @unique // 'g', 'kg', 'mL', 'L', 'item'
  name         String // 'gram', 'kilogram'
  symbol       String // 'g', 'kg'
  baseMultiplier  Decimal // How many of this = 1 atomic unit in category
                           // e.g., kg has 1000.0 (1 kg = 1000 g)
  categoryId   String
  category     UnitCategory @relation(fields: [categoryId], references: [id])
  products     Product[] @relation("ProductUnits")
  quotationItems  QuotationItem[]
  
  @@unique([categoryId, code]) // unique within category
}

model Product {
  id              String @id @default(cuid())
  sellerId        String
  seller          Seller @relation(fields: [sellerId], references: [id])
  
  name            String
  description     String?
  sku             String @unique
  categoryId      String?
  category        ProductCategory? @relation(fields: [categoryId], references: [id])
  
  // Unit System (Core)
  baseUnitId      String
  baseUnit        Unit @relation("ProductBaseUnit", fields: [baseUnitId], references: [id])
  supportedUnits  Unit[] @relation("ProductUnits") // junction for supported units
  
  // Pricing
  basePrice       Decimal @db.Numeric(19, 6) // Price per base unit, INR
  
  // Conversion factors (snapshot, computed at creation/edit)
  conversionMatrix ConversionFactor[] // Explicit conversion map
  
  // Inventory
  inventory       Inventory?
  
  // Audit
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([sellerId])
}

model ConversionFactor {
  id          String @id @default(cuid())
  productId   String
  product     Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  fromUnitId  String
  fromUnit    Unit @relation("FromUnit", fields: [fromUnitId], references: [id])
  
  toUnitId    String
  toUnit      Unit @relation("ToUnit", fields: [toUnitId], references: [id])
  
  factor      Decimal @db.Numeric(19, 6) // How many 'toUnit' = 1 'fromUnit'
  
  @@unique([productId, fromUnitId, toUnitId])
  @@index([productId])
}

model Inventory {
  id          String @id @default(cuid())
  productId   String @unique
  product     Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  quantity    Decimal @db.Numeric(19, 6) // Always in base unit
  
  // Audit trail
  lastUpdated DateTime @default(now()) @updatedAt
  updatedBy   String? // userId of admin/seller who updated
}
```

### 3.3 Unit Conversion Algorithm (Server-Side Only)

**Core Principle**: *All conversions happen server-side, client never calculates.*

**Conversion Flow**

```
SCENARIO: Buyer orders 500 grams of Wheat Flour (base unit = kg, basePrice = ₹40/kg)

Step 1: Receive Order Request
  Input: { productId: 'prod_123', orderedQuantity: 500, orderedUnit: 'g' }

Step 2: Fetch Product & Conversion Matrix
  Product {
    baseUnit: 'kg',
    basePrice: 40.00,
    conversionFactors: {
      'g': { factor: 0.001, direction: 'to_base' },
      'kg': { factor: 1, direction: 'to_base' },
      'item': null (unsupported)
    }
  }

Step 3: Validate Order Unit
  if 'g' not in product.conversionFactors.keys() → return 400 error
  else continue

Step 4: Calculate Base Unit Quantity
  baseQty = orderedQuantity × conversionFactors['g'].factor
  baseQty = 500 × 0.001 = 0.5 kg
  Validation: Ensure baseQty ≤ inventory.quantity (0.5 ≤ 10 kg ✓)

Step 5: Calculate Unit Price
  Formula: unitPrice = basePrice × conversionFactor['g'].factor
  unitPrice = 40.00 × 0.001 = ₹0.04 per gram
  
Step 6: Calculate Line Total
  lineTotal = orderedQuantity × unitPrice
  lineTotal = 500 × 0.04 = ₹20.00
  Precision: Round to 2 decimals (INR paise)

Step 7: Store in QuotationItem
  QuotationItem {
    orderedQuantity: 500
    orderedUnit: 'g'
    unitPrice: 0.04 (snapshotted)
    baseQuantity: 0.5 (for reference)
    lineTotal: 20.00
    productId: 'prod_123'
  }
  
Step 8: Return to Client
  { unitPrice: 0.04, lineTotal: 20.00, displayText: '₹20.00 for 500 g' }
```

### 3.4 Precision & Rounding Strategy

```
NUMERIC DATA TYPES (PostgreSQL):

Quantity columns:     numeric(19, 6)
  └─ Supports: 9,999,999,999,999.999999 kg
  └─ Precision: ±0.000001 (microgram level)
  └─ Use for: basePrice, unitPrice, quantities

Final totals:         numeric(19, 2)
  └─ Supports: ₹99,999,999,999,999.99
  └─ Precision: ±0.01 (paise level)
  └─ Use for: lineTotal, quotationTotal, invoiceTotal

Conversion factors:   numeric(19, 6)
  └─ Supports: 9,999,999.999999 ratio
  └─ Use for: kg to g (1000.0), L to mL (1000.0)

ROUNDING RULES:

1. Intermediate Calculations:
   - Keep full numeric(19,6) precision
   - NO rounding until final display
   - PostgreSQL automatic handling prevents drift

2. Line Item Totals (lineTotal):
   lineTotal = ROUND(orderedQty × unitPrice, 2)
   Example: 500 × 0.04 = 20.00 ✓

3. Quotation/Invoice Total:
   quotationTotal = SUM(lineTotal) rounded to 2 decimals
   Example: 20.00 + 15.50 + 10.25 = 45.75 ✓

4. Display Rounding:
   - Database stores exact numeric(19,6)
   - UI rounds for display using toFixed(2) or formatter
   - Price always shows as ₹X.XX
   - Quantity shows with 4 decimal places if needed, or integer

AUDIT TRAIL:
Every conversion logged:
  ConversionLog {
    orderedQty: 500
    orderedUnit: 'g'
    conversionFactor: 0.001
    baseQty: 0.5
    baseUnit: 'kg'
    unitPrice: 0.04
    lineTotal: 20.00
    timestamp: now()
    quotationItemId: 'qi_abc'
  }
```

### 3.5 Pricing Calculation & Snapshotting

**Key Principle**: *Price is snapshotted at order time, immutable thereafter.*

```
Scenario: Admin changes basePrice after order placed

Time T1: Product created
  basePrice = ₹40/kg

Time T2: Buyer orders 1 kg
  Order created: { orderedQty: 1, orderedUnit: 'kg', unitPrice: 40.00 }

Time T3: Admin updates basePrice to ₹50/kg
  Product.basePrice = 50.00
  But: Existing order STILL shows unitPrice: 40.00 (snapshotted)

Reason: Maintains order immutability, audit trail, dispute resolution.

Implementation:
  - QuotationItem.unitPrice is NOT a reference
  - It's a snapshot taken at order creation
  - Product price changes don't affect existing orders
  - Admin can see "original price was ₹40, now ₹50" for reference
```

**Dynamic Price Preview** (Before Order Placed)

```
Endpoint: GET /api/products/[id]/price-preview?unit=g&quantity=500

Response:
{
  "baseUnit": "kg",
  "basePrice": 40.00,
  "orderedUnit": "g",
  "orderedQuantity": 500,
  "conversionFactor": 0.001,
  "baseQuantity": 0.5,
  "unitPrice": 0.04,
  "lineTotal": 20.00,
  "currency": "INR",
  "timestamp": "2026-06-03T10:00:00Z"
}

This is calculated EVERY time, ensuring freshness.
But the order snapshot is taken ONLY when submitted.
```

---

## PART 4: DATA ARCHITECTURE

### 4.1 Complete Data Model (Refined)

```prisma
// ============ USERS & AUTH ============

model User {
  id              String @id @default(cuid())
  email           String @unique
  password        String // bcrypt hashed
  role            Role // enum('ADMIN', 'SELLER', 'BUYER')
  
  // Profile
  name            String
  avatar          String? // URL to image
  phone           String?
  address         String?
  
  // Relations
  seller          Seller? // if role = SELLER, links to Seller
  quotations      Quotation[] // if role = BUYER
  cart            Cart? // shopping cart session
  
  // Status
  status          UserStatus @default(ACTIVE) // enum
  lastLogin       DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Audit
  createdBy       String? // admin who created this user
  
  @@index([email])
  @@index([role])
  @@index([status])
}

enum Role {
  ADMIN
  SELLER
  BUYER
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  DELETED
  PENDING_EMAIL_VERIFICATION
}

// ============ SELLERS ============

model Seller {
  id                  String @id @default(cuid())
  userId              String @unique
  user                User @relation(fields: [userId], references: [id])
  
  // Business Info
  businessName        String
  registrationNumber  String @unique
  taxId               String?
  businessAddress     String
  businessPhone       String
  
  // Bank Details (encrypted in production)
  bankName            String?
  accountNumber       String? // MUST be encrypted
  ifscCode            String?
  
  // Status & Verification
  status              SellerStatus @default(PENDING_APPROVAL) // enum
  verificationStatus  String @default("pending")
  
  // Relations
  products            Product[]
  quotations          Quotation[]
  analytics           SellerAnalytics?
  
  // Metrics (cached, updated periodically)
  totalSales          Decimal @default(0) @db.Numeric(19, 2)
  totalOrders         Int @default(0)
  averageRating       Decimal? @db.Numeric(3, 2)
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  @@index([status])
  @@index([businessName])
}

enum SellerStatus {
  PENDING_APPROVAL
  APPROVED
  SUSPENDED
  REJECTED
  CLOSED
}

model SellerAnalytics {
  id              String @id @default(cuid())
  sellerId        String @unique
  seller          Seller @relation(fields: [sellerId], references: [id])
  
  // Metrics (daily snapshot)
  totalRevenue    Decimal @default(0) @db.Numeric(19, 2)
  totalOrders     Int @default(0)
  totalItems      Decimal @default(0) @db.Numeric(19, 6)
  
  // Breakdown
  ordersByStatus  Json // { 'pending': 5, 'completed': 20, ... }
  topProducts     Json // { [{ productId, quantity, revenue }, ... ] }
  
  // Performance
  conversionRate  Decimal? @db.Numeric(5, 2)
  avgOrderValue   Decimal? @db.Numeric(19, 2)
  
  lastUpdated     DateTime @default(now()) @updatedAt
  
  @@index([sellerId])
}

// ============ PRODUCTS & INVENTORY ============

model ProductCategory {
  id          String @id @default(cuid())
  name        String @unique
  description String?
  icon        String? // emoji or icon code
  
  products    Product[]
  createdAt   DateTime @default(now())
  
  @@index([name])
}

model Product {
  id              String @id @default(cuid())
  
  // Ownership
  sellerId        String
  seller          Seller @relation(fields: [sellerId], references: [id], onDelete: Cascade)
  
  // Basic Info
  name            String
  sku             String
  description     String?
  categoryId      String?
  category        ProductCategory? @relation(fields: [categoryId], references: [id])
  
  // Images (array of URLs)
  images          String[] @default([])
  
  // Unit & Pricing Core
  baseUnitId      String
  baseUnit        Unit @relation("ProductBaseUnit", fields: [baseUnitId], references: [id])
  supportedUnits  Unit[] @relation("ProductUnits")
  
  basePrice       Decimal @db.Numeric(19, 6) // INR per base unit
  
  // HSN/GST (India-specific)
  hsnCode         String?
  gstRate         Decimal? @db.Numeric(5, 2) // e.g., 5.00 for 5%
  
  // Inventory
  inventory       Inventory?
  
  // Conversion Factors
  conversions     ConversionFactor[]
  
  // Orders & Quotations
  quotationItems  QuotationItem[]
  
  // Status
  status          ProductStatus @default(ACTIVE) // enum
  isPublished     Boolean @default(false)
  
  // Audit
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([sku, sellerId]) // SKU unique per seller
  @@index([sellerId])
  @@index([categoryId])
  @@index([status])
}

enum ProductStatus {
  DRAFT
  ACTIVE
  OUT_OF_STOCK
  DISCONTINUED
}

model Inventory {
  id              String @id @default(cuid())
  productId       String @unique
  product         Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  // Quantity in BASE UNIT only
  quantity        Decimal @db.Numeric(19, 6)
  
  // Reorder level (trigger for seller alert)
  reorderLevel    Decimal @db.Numeric(19, 6) @default(0)
  
  // Audit
  lastUpdated     DateTime @default(now()) @updatedAt
  updatedBy       String? // userId of seller/admin
  
  @@index([productId])
}

model Unit {
  id              String @id @default(cuid())
  code            String // 'g', 'kg', 'mL', 'L', 'item'
  name            String // 'gram', 'liter'
  symbol          String // 'g', 'L'
  
  categoryId      String
  category        UnitCategory @relation(fields: [categoryId], references: [id])
  
  // Conversion to atomic unit
  baseMultiplier  Decimal @db.Numeric(19, 6)
  
  // Meta
  isAtomic        Boolean @default(false) // true for g, mL, item
  isActive        Boolean @default(true)
  
  products        Product[] @relation("ProductBaseUnit")
  productSupported Product[] @relation("ProductUnits")
  quotationItems  QuotationItem[]
  
  @@unique([categoryId, code])
  @@index([code])
}

model UnitCategory {
  id              String @id @default(cuid())
  name            String @unique // 'weight', 'volume', 'count'
  dimension       String // 'mass', 'length', 'discrete'
  units           Unit[]
  products        Product[] @relation("ProductUnitCategory")
}

model ConversionFactor {
  id              String @id @default(cuid())
  productId       String
  product         Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  fromUnitId      String
  fromUnit        Unit @relation("ConversionFrom", fields: [fromUnitId], references: [id])
  
  toUnitId        String
  toUnit          Unit @relation("ConversionTo", fields: [toUnitId], references: [id])
  
  factor          Decimal @db.Numeric(19, 6) // 1 fromUnit = ? toUnit
  
  @@unique([productId, fromUnitId, toUnitId])
  @@index([productId])
}

// ============ QUOTATIONS & ORDERS ============

model Quotation {
  id              String @id @default(cuid())
  
  // Quotation/Order details
  quotationNumber String @unique // e.g., "QT-2026-0001"
  
  // User info
  userId          String
  user            User @relation(fields: [userId], references: [id])
  
  // Seller (inferred from items, but cached for filtering)
  // Note: In multi-seller orders, this is the primary seller
  sellerId        String?
  seller          Seller? @relation(fields: [sellerId], references: [id])
  
  // Status flow
  status          QuotationStatus // enum
  statusHistory   QuotationStatusChange[] // audit trail
  
  // Pricing
  subtotal        Decimal @db.Numeric(19, 2) // Before tax/shipping
  taxAmount       Decimal @default(0) @db.Numeric(19, 2)
  shippingCost    Decimal @default(0) @db.Numeric(19, 2)
  totalAmount     Decimal @db.Numeric(19, 2) // Final amount
  
  // Items
  items           QuotationItem[]
  
  // Metadata
  notes           String?
  deliveryAddress String?
  
  // Timestamps
  createdAt       DateTime @default(now())
  submittedAt     DateTime? // When user formally submitted
  approvedAt      DateTime?
  completedAt     DateTime?
  
  updatedAt       DateTime @updatedAt
  
  @@index([userId])
  @@index([sellerId])
  @@index([status])
  @@index([createdAt])
}

enum QuotationStatus {
  DRAFT           // User is editing
  SUBMITTED       // User submitted, awaiting approval
  REVIEWED        // Seller/Admin reviewed
  APPROVED        // Approved, awaiting payment
  PAID            // Payment received
  COMPLETED       // Order fulfilled
  CANCELLED       // User or seller cancelled
  REJECTED        // Seller rejected
}

model QuotationStatusChange {
  id              String @id @default(cuid())
  quotationId     String
  quotation       Quotation @relation(fields: [quotationId], references: [id], onDelete: Cascade)
  
  fromStatus      QuotationStatus
  toStatus        QuotationStatus
  reason          String?
  changedBy       String // userId
  
  timestamp       DateTime @default(now())
  
  @@index([quotationId])
}

model QuotationItem {
  id              String @id @default(cuid())
  quotationId     String
  quotation       Quotation @relation(fields: [quotationId], references: [id], onDelete: Cascade)
  
  // Product reference
  productId       String
  product         Product @relation(fields: [productId], references: [id])
  
  // Order details (SNAPSHOTTED at order time)
  orderedQuantity Decimal @db.Numeric(19, 6)
  orderedUnitId   String
  orderedUnit     Unit @relation(fields: [orderedUnitId], references: [id])
  
  // Calculated & snapshotted values
  baseUnit        String // For reference (e.g., "kg")
  baseQuantity    Decimal @db.Numeric(19, 6) // for audit
  unitPrice       Decimal @db.Numeric(19, 6) // INR per ordered unit, snapshotted
  lineTotal       Decimal @db.Numeric(19, 2) // Total for this line, INR
  
  // For reference
  gstApplied      Decimal @default(0) @db.Numeric(19, 2)
  
  createdAt       DateTime @default(now())
  
  @@index([quotationId])
  @@index([productId])
}

// ============ SHOPPING CART ============

model Cart {
  id              String @id @default(cuid())
  userId          String @unique
  user            User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  items           CartItem[]
  
  lastModified    DateTime @default(now()) @updatedAt
}

model CartItem {
  id              String @id @default(cuid())
  cartId          String
  cart            Cart @relation(fields: [cartId], references: [id], onDelete: Cascade)
  
  productId       String
  quantity        Decimal @db.Numeric(19, 6)
  unitId          String // which unit user selected
  
  // Cached for display (recalculated on retrieval)
  unitPrice       Decimal @db.Numeric(19, 6)
  lineTotal       Decimal @db.Numeric(19, 2)
  
  addedAt         DateTime @default(now())
  
  @@unique([cartId, productId]) // One entry per product
  @@index([cartId])
}

// ============ WISHLIST ============

model Wishlist {
  id              String @id @default(cuid())
  userId          String @unique
  
  items           WishlistItem[]
  createdAt       DateTime @default(now())
}

model WishlistItem {
  id              String @id @default(cuid())
  wishlistId      String
  wishlist        Wishlist @relation(fields: [wishlistId], references: [id], onDelete: Cascade)
  
  productId       String
  
  // Metadata
  addedAt         DateTime @default(now())
  
  @@unique([wishlistId, productId])
}

// ============ AUDIT & COMPLIANCE ============

model AuditLog {
  id              String @id @default(cuid())
  userId          String? // who did it
  action          String // 'CREATE_PRODUCT', 'UPDATE_PRICE', 'SUBMIT_ORDER'
  resourceType    String // 'Product', 'Quotation'
  resourceId      String
  
  changes         Json // before & after values
  ipAddress       String?
  userAgent       String?
  
  timestamp       DateTime @default(now())
  
  @@index([userId])
  @@index([action])
  @@index([timestamp])
}

model ConversionLog {
  id              String @id @default(cuid())
  quotationItemId String
  
  // Conversion details (for audit)
  orderedQuantity Decimal @db.Numeric(19, 6)
  orderedUnit     String
  conversionFactor Decimal @db.Numeric(19, 6)
  baseQuantity    Decimal @db.Numeric(19, 6)
  baseUnit        String
  
  unitPrice       Decimal @db.Numeric(19, 6)
  lineTotal       Decimal @db.Numeric(19, 2)
  
  timestamp       DateTime @default(now())
  
  @@index([quotationItemId])
}
```

### 4.2 Relationships & Constraints (Referential Integrity)

```
User
├─ 1:1 Seller (if role = SELLER)
├─ 1:Many Quotation (buyer)
├─ 1:1 Cart
└─ 1:1 Wishlist

Seller
├─ 1:1 User (owner)
├─ 1:Many Product
├─ 1:1 SellerAnalytics
└─ 1:Many Quotation (received)

Product
├─ N:1 Seller (owner)
├─ N:1 Category
├─ N:1 Unit (baseUnit)
├─ N:Many Unit (supportedUnits)
├─ 1:1 Inventory
├─ 1:Many ConversionFactor
└─ 1:Many QuotationItem

Cart
├─ N:1 User
└─ 1:Many CartItem

Quotation
├─ N:1 User (buyer)
├─ N:1 Seller (optional, multi-seller orders)
├─ 1:Many QuotationItem
└─ 1:Many QuotationStatusChange

ConversionFactor
├─ N:1 Product
├─ N:1 Unit (fromUnit)
└─ N:1 Unit (toUnit)

Cascading Deletes:
Product → Inventory (cascade)
Product → ConversionFactor (cascade)
Product → QuotationItem (set null or keep for history)
Cart → CartItem (cascade)
Quotation → QuotationStatusChange (cascade)
```

---

## PART 5: API LAYER ARCHITECTURE

### 5.1 API Organization

```
/api/
├── auth/
│   ├── [...nextauth]              [ALL] NextAuth routes
│   ├── login                       [POST] Custom login
│   └── logout                      [POST] Sign out
│
├── products/
│   ├── index                       [GET] List/search products
│   ├── [id]/
│   │   ├── route                   [GET] Product details
│   │   ├── update                  [PUT] Update (Admin/Seller-own)
│   │   ├── delete                  [DELETE] Delete (Admin/Seller-own)
│   │   └── preview                 [GET] Price preview (conversion)
│   │
│   └── categories
│       └── index                   [GET] List categories
│
├── inventory/
│   ├── index                       [GET] View all (Admin only)
│   ├── [productId]/update          [PUT] Adjust stock (Seller/Admin)
│   └── analytics                   [GET] Stock insights
│
├── quotations/
│   ├── index                       [GET] List (filtered by role)
│   ├── [id]/
│   │   ├── route                   [GET] Quotation details
│   │   ├── status                  [PATCH] Update status (Seller/Admin)
│   │   └── approve                 [POST] Approve (Admin/Seller)
│   │
│   └── submit                       [POST] Create from cart
│
├── cart/
│   ├── index                       [GET] Get cart
│   ├── add                         [POST] Add item
│   ├── update                      [PATCH] Update quantity
│   ├── remove                      [DELETE] Remove item
│   ├── clear                       [DELETE] Clear all
│   └── preview                     [GET] Cart total (with conversion)
│
├── wishlist/
│   ├── index                       [GET] Get wishlist
│   ├── add                         [POST] Add item
│   ├── remove                      [DELETE] Remove item
│   └── toggle                      [POST] Add/remove toggle
│
├── analytics/
│   ├── seller/
│   │   ├── sales                   [GET] Sales metrics
│   │   ├── products                [GET] Product performance
│   │   ├── revenue                 [GET] Revenue charts
│   │   └── orders                  [GET] Order analytics
│   │
│   └── admin/
│       ├── platform                [GET] Platform-wide stats
│       ├── sellers                 [GET] Seller metrics
│       ├── users                   [GET] User behavior
│       └── conversions             [GET] Unit conversion audit
│
├── users/
│   ├── index                       [GET] List (Admin only)
│   ├── [id]/
│   │   ├── route                   [GET] User details
│   │   ├── suspend                 [POST] Suspend (Admin)
│   │   └── role                    [PATCH] Change role (Admin)
│   │
│   └── profile                     [GET/PUT] Current user
│
└── admin/
    ├── sellers/
    │   ├── index                   [GET] All sellers
    │   ├── [id]/approve            [POST] Approve seller
    │   └── [id]/suspend            [POST] Suspend seller
    │
    ├── products/
    │   └── index                   [GET] All products (admin view)
    │
    └── settings
        └── units                   [GET/POST] Manage unit system
```

### 5.2 Request/Response Patterns

**Standard Response Format**
```typescript
// Success (2xx)
{
  success: true,
  data: { ... },
  timestamp: "2026-06-03T10:00:00Z"
}

// Error (4xx, 5xx)
{
  success: false,
  error: {
    code: "INVALID_UNIT",
    message: "Unit 'xyz' not supported for this product",
    details: { ... }
  },
  timestamp: "2026-06-03T10:00:00Z"
}
```

**Common Query Parameters**
```
/api/products?
  search=flour          [search term]
  category=grains       [category ID or slug]
  unit=kg               [filter by supported unit]
  seller=seller_id      [filter by seller]
  sort=price            [price, name, newest]
  order=asc             [asc, desc]
  page=1                [pagination]
  limit=20              [items per page]
  status=ACTIVE         [product status filter]
```

**Price Preview Endpoint (Critical)**
```
GET /api/products/[id]/price-preview?unit=g&quantity=500

Response:
{
  success: true,
  data: {
    productId: "prod_123",
    productName: "Wheat Flour",
    
    baseUnit: "kg",
    basePrice: 40.00,
    
    orderedUnit: "g",
    orderedQuantity: 500,
    conversionFactor: 0.001,
    baseQuantity: 0.5,
    
    unitPrice: 0.04,     // INR per gram
    lineTotal: 20.00,    // Total in INR
    
    inventory: {
      currentStock: 10,  // in base units (kg)
      canFulfill: true
    },
    
    gst: {
      rate: 5.0,
      amount: 1.00,
      finalTotal: 21.00
    },
    
    currency: "INR"
  }
}
```

---

## PART 6: STATE MANAGEMENT ARCHITECTURE

### 6.1 State Layers

```
┌─────────────────────────────────────────────────────┐
│           CLIENT STATE MANAGEMENT                   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  SESSION CONTEXT (Global)                          │
│  ├─ user: { id, email, role, sellerId }            │
│  ├─ isAuthenticated: boolean                        │
│  └─ permissions: string[]                           │
│                                                      │
│  CART STATE (Client-side, sync to DB)              │
│  ├─ items: CartItem[]                              │
│  ├─ total: number                                   │
│  └─ lastUpdated: timestamp                          │
│                                                      │
│  WISHLIST STATE (Client-side, sync to DB)          │
│  ├─ items: WishlistItem[]                          │
│  └─ count: number                                   │
│                                                      │
│  UI STATE (Local/Zustand)                          │
│  ├─ filters: { category, unit, sort }              │
│  ├─ modalOpen: boolean                              │
│  ├─ isLoading: boolean                              │
│  └─ toast notifications                             │
│                                                      │
│  CACHE (React Query / SWR)                         │
│  ├─ products: (stale-while-revalidate)             │
│  ├─ quotations: (refetch on interval)              │
│  └─ user profile: (long TTL)                        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 6.2 Recommended Tools

```
State Management:
├─ Next.js App Router with Server Components (default state)
├─ Zustand (lightweight client state)
├─ React Query / TanStack Query (server state caching)
└─ Context API (session/auth, avoiding prop drilling)

Form Management:
├─ React Hook Form + Zod (validation)
├─ Server Actions (form submissions)
└─ useFormState (progressive enhancement)

Real-time Updates:
├─ Polling (for analytics, inventory)
├─ SSE / WebSockets (if needed for live notifications)
└─ Revalidation (ISR, revalidateTag)
```

### 6.3 Cart State Flow

```
Buyer adds product to cart:

1. CLIENT TRIGGER
   User clicks "Add to Cart" on ProductCard
   ├─ Show loading state
   └─ Call Server Action addToCart()

2. SERVER ACTION
   addToCart(productId, quantity, unit):
   ├─ Validate session (BUYER role)
   ├─ Validate product exists & is published
   ├─ Validate unit is supported
   ├─ Validate quantity ≤ inventory (optional, can be soft)
   ├─ Create/update Cart & CartItem in DB
   └─ Return success + updated cart data

3. CLIENT UPDATE
   ├─ Update Zustand cart store
   ├─ Show "Added to cart" toast
   ├─ Update cart icon badge
   └─ Optional: Show cart sidebar

4. PERSIST
   ├─ Cart persists in database (survives logout)
   ├─ User can close & reopen browser, cart still there
   └─ Multiple devices: Sync on each login

Cart Preview:
  GET /api/cart/preview
  ├─ Fetch all CartItems
  ├─ For each item: recalculate unitPrice (current product price)
  ├─ Calculate lineTotal = qty × unitPrice
  ├─ Sum all lineTotals → quotationSubtotal
  ├─ Add tax, shipping
  └─ Return preview with current prices (NOT snapshotted)
```

---

## PART 7: FRONTEND COMPONENT ARCHITECTURE

### 7.1 Page/Layout Hierarchy

```
RootLayout (/src/app/layout.tsx)
├─ SessionProvider
├─ GlobalHeader/Navigation
├─ ToastProvider
├─ ThemeProvider
└─ <Outlet>

├─ PUBLIC PAGES
│  ├─ /login (LoginPage)
│  ├─ / (Homepage - product discovery, guest view)
│  └─ /signup (RegisterPage)
│
├─ BUYER PANEL
│  ├─ BuyerLayout
│  │  ├─ Sidebar: Home, Browse, Cart, Wishlist, My Orders
│  │  └─ TopNav: User menu, notifications
│  │
│  ├─ /buyer/browse (ProductCatalog)
│  │  └─ [ProductDetail Modal]
│  ├─ /buyer/cart (ShoppingCart)
│  ├─ /buyer/wishlist (WishlistPage)
│  ├─ /buyer/my-orders (OrderHistory)
│  │  └─ /buyer/my-orders/[quotationId] (OrderDetails)
│  └─ /buyer/profile (UserProfile)
│
├─ SELLER PANEL
│  ├─ SellerLayout
│  │  ├─ Sidebar: Dashboard, Products, Inventory, Orders, Analytics
│  │  └─ TopNav: Seller menu, sales notifications
│  │
│  ├─ /seller/dashboard (SellerDashboard - stats, key metrics)
│  ├─ /seller/products (ProductsList)
│  │  └─ /seller/products/[id]/edit (EditProductForm)
│  │  └─ /seller/products/new (CreateProductForm)
│  ├─ /seller/inventory (InventoryManager)
│  │  └─ Quick adjust stock levels
│  ├─ /seller/orders (IncomingOrders)
│  │  └─ /seller/orders/[quotationId] (OrderReview)
│  ├─ /seller/analytics (AnalyticsPage)
│  │  ├─ Sales charts
│  │  ├─ Top products
│  │  ├─ Revenue trends
│  │  └─ Conversion metrics
│  └─ /seller/profile (SellerProfile)
│
└─ ADMIN PANEL
   ├─ AdminLayout
   │  ├─ Sidebar: Dashboard, Users, Sellers, Products, Quotations, Analytics, Settings
   │  └─ TopNav: Admin menu, system health
   │
   ├─ /admin/dashboard (AdminDashboard - platform stats)
   ├─ /admin/users (UserManagement)
   │  └─ /admin/users/[id] (UserDetails)
   ├─ /admin/sellers (SellerManagement)
   │  └─ /admin/sellers/[id] (SellerApproval)
   ├─ /admin/products (AllProducts)
   ├─ /admin/quotations (AllQuotations)
   ├─ /admin/analytics (PlatformAnalytics)
   ├─ /admin/settings (SystemSettings)
   │  ├─ Units & conversion management
   │  ├─ Tax rates
   │  └─ System-wide configurations
   └─ /admin/audit (AuditLogs)
```

### 7.2 Key Components (Smart & Dumb)

```
Smart Components (Connect to state/API):
├─ ProductSearch
│  ├─ Handles search logic
│  ├─ Calls API to fetch products
│  └─ Updates filters in Zustand
│
├─ ShoppingCart
│  ├─ Manages cart state
│  ├─ Calls addToCart, removeFromCart
│  └─ Calculates total via preview API
│
├─ QuotationForm
│  ├─ Handles submission logic
│  ├─ Validates via server action
│  └─ Redirects to quotation page
│
├─ SellerDashboard
│  ├─ Fetches analytics data
│  ├─ Renders charts
│  └─ Polls for fresh data
│
└─ AdminPanel
   ├─ Manages modal states
   ├─ Calls admin API endpoints
   └─ Updates user/seller statuses

Dumb Components (Presentational):
├─ ProductCard
│  ├─ Props: { product, onAddToCart, onAddToWishlist }
│  ├─ Shows: image, name, price, units, "Add to Cart" button
│  └─ No internal state
│
├─ QuotationItemRow
│  ├─ Props: { item: QuotationItem }
│  ├─ Shows: product name, ordered unit, qty, unitPrice, lineTotal
│  └─ No logic
│
├─ UnitSelector
│  ├─ Props: { units, onSelect, defaultUnit }
│  ├─ Renders dropdown
│  └─ Controlled component
│
├─ PriceDisplay
│  ├─ Props: { amount: number, currency: 'INR' }
│  ├─ Formats as ₹X,XXX.XX
│  └─ No logic
│
└─ StatusBadge
   ├─ Props: { status: QuotationStatus, color }
   └─ Shows color-coded status
```

### 7.3 Component Patterns

**ProductCard (Example)**
```tsx
// Smart wrapper
<ProductCardContainer productId={id} />

// Dumb component
<ProductCard
  id="prod_123"
  name="Wheat Flour"
  image="..."
  basePrice={40.00}
  baseUnit="kg"
  supportedUnits={['g', 'kg']}
  inStock={true}
  onAddToCart={() => {...}}
  onAddToWishlist={() => {...}}
/>
```

**UnitPricePreviewer (Critical Component)**
```tsx
// Handles:
// - Quantity input
// - Unit selection
// - Calls /api/products/[id]/price-preview
// - Shows live price update
// - Debounced API calls (500ms)

<UnitPricePreviewer
  productId="prod_123"
  basePrice={40}
  baseUnit="kg"
  supportedUnits={['g', 'kg']}
  onPriceUpdate={(price, unit, qty) => {...}}
  isLoading={false}
/>
```

**QuotationItemTable**
```tsx
// Shows:
// - Product name
// - Ordered unit & quantity
// - Unit price (snapshotted)
// - Line total
// - Base unit & price (for reference)
// - Conversion factor (for verification)

<QuotationItemTable
  items={quotationItems}
  showConversionDetails={true}  // Admin view
/>
```

---

## PART 8: BUSINESS LOGIC & SERVICE LAYER

### 8.1 Core Services (Server-Side)

```
lib/services/

├── UnitConversionService
│   ├─ convertQuantity(qty, fromUnit, toUnit, conversions)
│   ├─ calculateBaseQuantity(orderedQty, conversionFactor)
│   ├─ calculateUnitPrice(basePrice, conversionFactor)
│   ├─ validateUnitSupport(unit, product)
│   └─ getConversionFactor(product, fromUnit, toUnit)
│
├── PricingService
│   ├─ calculateLineTotal(qty, unitPrice)
│   ├─ calculateQuotationTotal(items)
│   ├─ applyTax(amount, gstRate)
│   ├─ snapshotPrice(basePrice, conversionFactor, at timestamp)
│   └─ validatePrice(amount) // Precision check
│
├── InventoryService
│   ├─ checkStock(productId, baseQuantity)
│   ├─ reserveStock(productId, quantity, quotationId)
│   ├─ releaseStock(quotationId)
│   ├─ fulfillOrder(quotationId)
│   ├─ updateStock(productId, newQuantity, reason)
│   └─ getStockLevel(productId)
│
├── QuotationService
│   ├─ createFromCart(userId)
│   ├─ updateStatus(quotationId, newStatus, reason)
│   ├─ approve(quotationId)
│   ├─ reject(quotationId, reason)
│   ├─ cancel(quotationId)
│   └─ getQuotationWithConversions(quotationId)
│
├── SellerAnalyticsService
│   ├─ calculateTotalSales(sellerId, dateRange)
│   ├─ getTopProducts(sellerId, limit)
│   ├─ getOrderMetrics(sellerId, dateRange)
│   ├─ getRevenueBreakdown(sellerId)
│   └─ getProductPerformance(sellerId, productId)
│
├── AdminAnalyticsService
│   ├─ getPlatformStats()
│   ├─ getSellerMetrics(sellerId)
│   ├─ getUserBehavior()
│   ├─ getConversionAudit(dateRange)
│   └─ getSystemHealth()
│
└── AuthenticationService
    ├─ registerUser(email, password, role)
    ├─ verifyPassword(email, password)
    ├─ hashPassword(password)
    ├─ createSession(user)
    └─ validateRole(session, requiredRole)
```

### 8.2 Critical Service: Unit Conversion

```typescript
// lib/services/UnitConversionService.ts

export class UnitConversionService {
  /**
   * Calculate the quantity in base unit
   * Formula: orderedQty × conversionFactor[orderedUnit]
   */
  static calculateBaseQuantity(
    orderedQuantity: Decimal,
    orderedUnit: string,
    conversionFactors: Record<string, Decimal>
  ): Decimal {
    if (!conversionFactors[orderedUnit]) {
      throw new Error(`Unit ${orderedUnit} not supported`);
    }
    
    const factor = conversionFactors[orderedUnit];
    return orderedQuantity.multiply(factor);
  }

  /**
   * Calculate unit price for ordered unit
   * Formula: basePrice × conversionFactor[orderedUnit]
   * 
   * Why this works:
   *   If 1 gram = 0.001 kg (conversion factor)
   *   And price per kg = ₹40
   *   Then price per gram = 40 × 0.001 = ₹0.04
   */
  static calculateUnitPrice(
    basePrice: Decimal,
    orderedUnit: string,
    conversionFactors: Record<string, Decimal>
  ): Decimal {
    if (!conversionFactors[orderedUnit]) {
      throw new Error(`Unit ${orderedUnit} not supported`);
    }
    
    const factor = conversionFactors[orderedUnit];
    return basePrice.multiply(factor).toDecimalPlaces(6);
  }

  /**
   * Get full conversion details for order placement
   */
  static getConversionDetails(
    orderedQuantity: Decimal,
    orderedUnit: string,
    product: Product & { basePrice: Decimal }
  ) {
    const baseQuantity = this.calculateBaseQuantity(
      orderedQuantity,
      orderedUnit,
      product.conversionFactors
    );

    const unitPrice = this.calculateUnitPrice(
      product.basePrice,
      orderedUnit,
      product.conversionFactors
    );

    const lineTotal = orderedQuantity
      .multiply(unitPrice)
      .toDecimalPlaces(2); // Round to paise

    return {
      baseUnit: product.baseUnit,
      baseQuantity,
      orderedUnit,
      orderedQuantity,
      unitPrice,
      lineTotal,
      conversionFactor: product.conversionFactors[orderedUnit],
      gstRate: product.gstRate || 0
    };
  }

  /**
   * Validate all conversions in a quotation for admin review
   */
  static validateQuotationConversions(
    quotation: Quotation & { items: QuotationItem[] }
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const item of quotation.items) {
      // Check that lineTotal = orderedQty × unitPrice (to 2 decimals)
      const expectedTotal = item.orderedQuantity
        .multiply(item.unitPrice)
        .toDecimalPlaces(2);

      if (!expectedTotal.equals(item.lineTotal)) {
        errors.push(
          `Item ${item.productId}: lineTotal mismatch. ` +
          `Expected ${expectedTotal}, got ${item.lineTotal}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

---

## PART 9: SECURITY & AUTHENTICATION

### 9.1 Authentication Flow

```
┌─────────────────────────────────────────────────────┐
│           AUTHENTICATION FLOW                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│ 1. USER LOGIN                                       │
│    POST /api/auth/signin                           │
│    ├─ Provide: email, password                      │
│    └─ NextAuth handles with CredentialsProvider    │
│                                                      │
│ 2. PASSWORD VERIFICATION                            │
│    ├─ Fetch user from DB                            │
│    ├─ bcrypt.compare(password, hash)               │
│    ├─ If valid: proceed                             │
│    └─ If invalid: return 401                        │
│                                                      │
│ 3. SESSION CREATION                                 │
│    ├─ Generate JWT with claims:                     │
│    │  ├─ sub (user ID)                              │
│    │  ├─ email                                       │
│    │  ├─ role                                        │
│    │  ├─ sellerId (if applicable)                   │
│    │  └─ exp (30 days)                              │
│    └─ Store in httpOnly secure cookie              │
│                                                      │
│ 4. MIDDLEWARE VALIDATION                            │
│    ├─ For every /api/* request:                     │
│    │  ├─ Extract JWT from cookie                    │
│    │  ├─ Verify signature                           │
│    │  └─ Inject user object into request            │
│    ├─ If no token: continue as guest               │
│    └─ If invalid: clear cookie, redirect to login   │
│                                                      │
│ 5. ROUTE AUTHORIZATION                              │
│    ├─ Each route checks session.user.role          │
│    ├─ Compare against required role(s)             │
│    ├─ If allowed: execute handler                   │
│    └─ If denied: return 403 Forbidden               │
│                                                      │
│ 6. SERVER ACTION AUTHORIZATION                      │
│    ├─ Each server action:                           │
│    │  ├─ Call getSession()                          │
│    │  ├─ Validate role                              │
│    │  ├─ Validate resource ownership                │
│    │  └─ Execute action                             │
│    └─ Return result or error                        │
│                                                      │
│ 7. LOGOUT                                           │
│    ├─ Clear JWT cookie                              │
│    ├─ Invalidate session                            │
│    └─ Redirect to login                             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 9.2 Authorization Patterns

```typescript
// Middleware: src/middleware.ts
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('next-auth.session-token');
  const pathname = request.nextUrl.pathname;

  // Public routes (no auth required)
  if (pathname.startsWith('/login') || pathname === '/') {
    return NextResponse.next();
  }

  // Protected routes
  if (pathname.startsWith('/api') || pathname.startsWith('/buyer') || 
      pathname.startsWith('/seller') || pathname.startsWith('/admin')) {
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Verify token & decode
    const decoded = await verifyJWT(token);
    if (!decoded) {
      // Token expired or invalid
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('next-auth.session-token');
      return response;
    }

    // Pass user info to route
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.sub);
    requestHeaders.set('x-user-role', decoded.role);
    
    return NextResponse.next({
      request: { headers: requestHeaders }
    });
  }
}

// API Route Handler Example: /api/quotations
export async function GET(request: NextRequest) {
  const session = await getServerSession();

  // Check authentication
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check authorization (role-based)
  const { role, id, sellerId } = session.user;

  let quotations;

  if (role === 'ADMIN') {
    // Admin sees all
    quotations = await prisma.quotation.findMany({
      include: { items: true, user: true, seller: true }
    });
  } else if (role === 'SELLER') {
    // Seller sees only received orders
    quotations = await prisma.quotation.findMany({
      where: { sellerId },
      include: { items: true, user: true }
    });
  } else if (role === 'BUYER') {
    // Buyer sees only own
    quotations = await prisma.quotation.findMany({
      where: { userId: id },
      include: { items: true, seller: true }
    });
  } else {
    return NextResponse.json({ error: 'Invalid role' }, { status: 403 });
  }

  return NextResponse.json({ success: true, data: quotations });
}

// Server Action Example: src/app/actions/order.ts
'use server'

export async function submitQuotation(cartId: string) {
  const session = await getServerSession();

  // 1. Authentication check
  if (!session || session.user.role !== 'BUYER') {
    throw new Error('Unauthorized: Only buyers can submit quotations');
  }

  const userId = session.user.id;

  // 2. Fetch & validate cart
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { items: true }
  });

  if (!cart || cart.userId !== userId) {
    throw new Error('Cart not found or does not belong to you');
  }

  // 3. Process items & validate conversions
  for (const item of cart.items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId }
    });

    if (!product) {
      throw new Error(`Product ${item.productId} not found`);
    }

    // Validate unit support & calculate price
    const details = UnitConversionService.getConversionDetails(
      item.quantity,
      item.unitId,
      product
    );

    // Validate inventory
    const inventory = await prisma.inventory.findUnique({
      where: { productId: product.id }
    });

    if (!inventory || inventory.quantity < details.baseQuantity) {
      throw new Error(
        `Insufficient stock for ${product.name}. ` +
        `Requested: ${details.baseQuantity} ${details.baseUnit}, ` +
        `Available: ${inventory?.quantity || 0}`
      );
    }
  }

  // 4. Create quotation
  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber: generateQuotationNumber(),
      userId,
      sellerId: cart.items[0].product.sellerId, // Simplified: single seller
      status: 'SUBMITTED',
      items: {
        createMany: {
          data: cart.items.map(item => ({
            productId: item.productId,
            orderedQuantity: item.quantity,
            orderedUnitId: item.unitId,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal
          }))
        }
      }
    }
  });

  // 5. Clear cart
  await prisma.cartItem.deleteMany({ where: { cartId } });

  // 6. Log conversion for audit
  // ... log conversions ...

  return { quotationId: quotation.id, quotationNumber: quotation.quotationNumber };
}
```

### 9.3 Environment Variables & Secrets

```bash
# .env.local (DO NOT COMMIT)

# Database
DATABASE_URL=postgresql://user:password@host/db
DIRECT_URL=postgresql://user:password@host/db  # For migrations

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<very-long-random-string>

# OAuth (Optional, for social login)
GITHUB_ID=...
GITHUB_SECRET=...

# Other
LOG_LEVEL=debug
ANALYTICS_KEY=...

# Production (.env.production or Vercel env vars)
NEXTAUTH_URL=https://yourdomain.com
DATABASE_URL=postgresql://...  # Neon production connection
```

---

## PART 10: DEPLOYMENT ARCHITECTURE

### 10.1 Infrastructure Stack

```
┌──────────────────────────────────────────────────────────┐
│                  PRODUCTION DEPLOYMENT                   │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  CLIENT LAYER                                            │
│  ├─ Domain: yourdomain.com (Vercel)                      │
│  ├─ CDN: Vercel edge network (global)                    │
│  ├─ SSL/TLS: Automatic (Let's Encrypt)                   │
│  └─ DNS: Vercel or Cloudflare                            │
│                                                            │
│  APPLICATION LAYER (Next.js on Vercel)                   │
│  ├─ Automatic deployments from GitHub main branch       │
│  ├─ Preview deployments for pull requests               │
│  ├─ Serverless functions (/api routes)                  │
│  ├─ Edge middleware (authentication)                     │
│  ├─ Image optimization                                   │
│  └─ Analytics & monitoring built-in                      │
│                                                            │
│  DATABASE LAYER (Neon PostgreSQL)                        │
│  ├─ Region: (choose based on users)                      │
│  ├─ Pooling: PgBouncer (connection pooling)              │
│  ├─ Backups: Automatic, daily                            │
│  ├─ Read replicas: For analytics queries                 │
│  ├─ Branching: Dev branch for testing                    │
│  └─ Monitoring: Neon dashboard                           │
│                                                            │
│  STORAGE (Optional)                                      │
│  ├─ Images: Vercel Blob or S3                           │
│  ├─ Files: Cloudinary (for user uploads)                │
│  └─ Analytics data: Neon (warm data)                     │
│                                                            │
│  MONITORING & LOGGING                                    │
│  ├─ Sentry (error tracking)                              │
│  ├─ Vercel Analytics (performance)                       │
│  ├─ Neon Logs (database queries)                         │
│  ├─ Uptime monitoring (StatusPage)                       │
│  └─ Email alerts (SendGrid)                              │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

### 10.2 Deployment Checklist

```
PRE-DEPLOYMENT:
☐ All tests passing (npm test)
☐ No TypeScript errors (npm run build)
☐ Environment variables configured in Vercel
☐ Database migrations tested locally
☐ Seed data loaded to production branch DB
☐ Git history clean (meaningful commits)

INITIAL DEPLOYMENT:
☐ Create GitHub repo (private)
☐ Connect to Vercel project
☐ Set up PostgreSQL cluster on Neon
☐ Copy Neon connection string to Vercel env vars
☐ Configure custom domain in Vercel
☐ Set up SSL certificate
☐ Run migrations: vercel env pull && npx prisma migrate deploy
☐ Seed data: npx prisma db seed (in Vercel Functions)
☐ Test login with test credentials
☐ Test complete order flow (all roles)

MONITORING:
☐ Set up Sentry for error tracking
☐ Configure Vercel Analytics
☐ Enable Neon query insights
☐ Set up daily backup testing
☐ Create runbook for common issues

ONGOING:
☐ Weekly: Check error logs
☐ Weekly: Monitor database performance
☐ Monthly: Review security logs & audit trail
☐ Monthly: Test disaster recovery (restore from backup)
```

---

## PART 11: IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1)
**Goal**: RBAC + Unit System + Authentication

```
Tasks:
├─ Set up database schema (Users, Units, Products, Inventory)
├─ Implement NextAuth with credentials provider
├─ Create middleware for role-based routing
├─ Build Unit & Conversion tables
├─ Implement unit conversion service
├─ Create test users (admin, seller, buyer)
├─ Set up environment variables
├─ Deploy to Vercel (with test DB)

Deliverable: 
  → Admin can log in & create products
  → Seller can log in (but see buyer UI for now)
  → Buyer can log in (but see only login)
```

### Phase 2: Product Catalog (Week 2)
**Goal**: Admin/Seller product management + Buyer browsing

```
Tasks:
├─ Admin panel: Product CRUD (with unit configuration)
├─ Seller panel: My Products (add, edit, delete)
├─ Seller: Inventory management (adjust stock)
├─ Public catalog: Product listing & search
├─ Product detail page with unit selection
├─ Price preview API (/api/products/[id]/price-preview)
├─ Unit dropdown population from conversion factors
├─ Add to cart basic UI

Deliverable:
  → Admin creates products with units & prices
  → Seller views own products & inventory
  → Buyer browses catalog, sees prices in multiple units
```

### Phase 3: Shopping Cart & Quotations (Week 3)
**Goal**: Complete order flow with conversions

```
Tasks:
├─ Cart state management (Zustand)
├─ Add to cart / remove from cart
├─ Cart persistence (database)
├─ Cart preview with current prices
├─ Quotation submission flow (server action)
├─ Quotation DB schema with snapshots
├─ Buyer quotation list & details
├─ Seller quotation list & review
├─ Quotation status updates

Deliverable:
  → Buyer adds items to cart in various units
  → Price calculated correctly in real-time
  → Buyer submits quotation
  → Seller sees incoming quotation with conversion details
  → Status can be changed (reviewed, approved, etc.)
```

### Phase 4: Seller Analytics (Week 4)
**Goal**: Seller dashboard with KPIs

```
Tasks:
├─ SellerAnalytics table & service
├─ Seller dashboard with key metrics
├─ Sales charts (revenue trend, orders over time)
├─ Top products table
├─ Order status breakdown
├─ Conversion rate calculation
├─ Average order value
├─ Real-time sales notification

Deliverable:
  → Seller logs in to dashboard
  → Sees total sales, orders count, revenue
  → Views top 5 products
  → Sees order trend chart
```

### Phase 5: Admin Panel & RBAC Enforcement (Week 5)
**Goal**: Full admin capabilities + security hardening

```
Tasks:
├─ Admin user management (list, view, suspend, delete)
├─ Admin seller approval workflow
├─ Admin quotation override
├─ Admin analytics (platform-wide stats)
├─ Audit log viewing
├─ Conversion validation tool (for manual review)
├─ Permission enforcement (all routes)
├─ Security hardening (CSRF, rate limiting)

Deliverable:
  → Admin sees all users & sellers
  → Can approve/reject sellers
  → Can view all quotations
  → Can override statuses if needed
```

### Phase 6: Wishlist & User Features (Week 6)
**Goal**: Buyer quality-of-life features

```
Tasks:
├─ Wishlist add/remove
├─ Wishlist persistence
├─ Wishlist share link (optional)
├─ User profile page
├─ Order history with filters
├─ Reorder from past quotation
├─ User preferences (language, currency, units)

Deliverable:
  → Buyer can save products to wishlist
  → View order history
  → See historical prices & quantities
```

### Phase 7: Refinement & Testing (Week 7)
**Goal**: Polish + comprehensive testing

```
Tasks:
├─ End-to-end testing (all flows)
├─ Edge case testing (large quantities, many decimals)
├─ Security testing (RBAC bypass attempts)
├─ Performance testing (1000+ products, 100+ quotations)
├─ Load testing (concurrent users)
├─ UI/UX refinement
├─ Accessibility (WCAG 2.1 AA)
├─ Documentation (README, API docs)

Deliverable:
  → System is production-ready
  → All major flows tested
  → Documentation complete
```

### Phase 8: Deployment & Go-Live (Week 8)
**Goal**: Production launch

```
Tasks:
├─ Final security audit
├─ Database backup strategy
├─ Monitoring & alerting setup
├─ Support documentation
├─ Production deployment
├─ Go-live announcement
├─ Post-launch monitoring

Deliverable:
  → Live system at yourdomain.com
  → All monitoring active
  → Team trained
```

---

## PART 12: SUMMARY - HOW IT ALL FITS

```
┌───────────────────────────────────────────────────────────────┐
│        SYSTEM FLOWS: FROM REQUEST TO RESPONSE                  │
├───────────────────────────────────────────────────────────────┤
│                                                                 │
│ SCENARIO 1: Buyer orders 500g of Wheat Flour (kg base)        │
│                                                                 │
│ 1. CLIENT                                                      │
│    User enters: quantity=500, unit=g                           │
│    Clicks "Get Price" → calls /api/products/123/preview       │
│                                                                 │
│ 2. API ROUTE (Server)                                          │
│    ├─ Get session (verify BUYER role) ✓                       │
│    ├─ Fetch product from DB                                   │
│    │   baseUnit: kg, basePrice: 40.00, conversions: {g: 0.001}│
│    ├─ Call UnitConversionService                              │
│    │   baseQty = 500 × 0.001 = 0.5 kg                         │
│    │   unitPrice = 40.00 × 0.001 = 0.04                       │
│    │   lineTotal = 500 × 0.04 = 20.00                         │
│    ├─ Check inventory (0.5 ≤ 10.0) ✓                          │
│    └─ Return { unitPrice: 0.04, lineTotal: 20.00 }            │
│                                                                 │
│ 3. CLIENT DISPLAYS                                             │
│    Price per gram: ₹0.04                                       │
│    Total for 500g: ₹20.00                                      │
│                                                                 │
│ 4. USER SUBMITS QUOTATION                                      │
│    POST /api/quotations/submit                                │
│    └─ Server action: submitQuotation()                         │
│                                                                 │
│ 5. SERVER ACTION (Conversion Snapshotting)                     │
│    ├─ Get session (BUYER) ✓                                   │
│    ├─ For each cart item:                                      │
│    │   ├─ Recalculate conversion (same as preview)            │
│    │   ├─ Take snapshot: unitPrice = 0.04 (immutable)         │
│    │   ├─ Reserve inventory (0.5 kg)                          │
│    │   └─ Create QuotationItem record                         │
│    ├─ Calculate total: ₹20.00                                  │
│    ├─ Create Quotation record (status: SUBMITTED)             │
│    └─ Log conversion for audit                                │
│                                                                 │
│ 6. SELLER RECEIVES NOTIFICATION                                │
│    Sees quotation with:                                        │
│    ├─ Product: Wheat Flour                                     │
│    ├─ Ordered: 500 g                                           │
│    ├─ Base unit: kg (reference)                                │
│    ├─ Base quantity: 0.5 kg (reference)                        │
│    ├─ Unit price: ₹0.04 (snapshotted, immutable)               │
│    ├─ Line total: ₹20.00                                       │
│    ├─ Conversion factor: 0.001 (for verification)              │
│    └─ Can APPROVE, REJECT, or REQUEST MODIFICATION             │
│                                                                 │
│ 7. ADMIN OVERSIGHT (If needed)                                 │
│    Admin can view quotation, verify conversions:               │
│    ConversionValidator.validateQuotationConversions()          │
│    └─ Returns: { valid: true, errors: [] }                    │
│                                                                 │
│ ✓ Complete, transparent, auditable flow                        │
│                                                                 │
├───────────────────────────────────────────────────────────────┤
│                                                                 │
│ SCENARIO 2: Admin suspends seller                              │
│                                                                 │
│ 1. ADMIN ACCESS CHECK                                          │
│    Middleware verifies: session.user.role === 'ADMIN' ✓       │
│                                                                 │
│ 2. AUTHORIZATION CHECK                                         │
│    API endpoint: /api/admin/sellers/[id]/suspend              │
│    └─ Handler checks role again ✓                             │
│                                                                 │
│ 3. RESOURCE OWNERSHIP                                          │
│    Admin can modify ANY seller (no ownership check)             │
│                                                                 │
│ 4. STATE UPDATE                                                │
│    UPDATE sellers SET status = 'SUSPENDED' WHERE id = '...'    │
│                                                                 │
│ 5. AUDIT LOG                                                   │
│    INSERT INTO audit_log:                                      │
│    {action: 'SUSPEND_SELLER', userId, timestamp, changes}      │
│                                                                 │
│ 6. PROPAGATION                                                 │
│    ├─ Seller's products: status → INACTIVE                    │
│    ├─ Pending quotations: notify seller (suspension msg)       │
│    └─ New orders: BLOCKED (seller status check)                │
│                                                                 │
│ ✓ Atomic, logged, propagated correctly                         │
│                                                                 │
└───────────────────────────────────────────────────────────────┘
```

---

## KEY ARCHITECTURAL DECISIONS (JUSTIFIED)

| Decision | Rationale |
|----------|-----------|
| **Server-side conversions only** | Prevents client-side math errors, ensures consistent precision across all users, enables audit trail |
| **Snapshotted prices in quotations** | Immutable order history, dispute resolution, price history tracking |
| **numeric(19,6) for quantities** | Supports sub-microgram precision, avoids floating-point drift, future-proof for scaling |
| **JSONB for conversion factors** | Flexible schema, fast lookups, easy to extend (custom units per product) |
| **One baseUnit per product** | Simplifies conversion logic, prevents circular conversions, clear audit trail |
| **Role-based query filtering** | Database enforces security, reduces API complexity, prevents data leaks |
| **Cart persisted in DB** | Survives logout, enables multi-device sync, server source-of-truth |
| **Audit logs for all conversions** | Compliance, dispute resolution, debugging, transparency |

---

## NEXT STEPS

1. **Review this architecture** with your team
2. **Finalize database schema** (adjust precision, add missing fields)
3. **Set up development environment** (local Neon branch, Vercel project)
4. **Start Phase 1** (RBAC + Unit System)
5. **Document assumptions** in README as you build

---

**Total Architecture Pages**: 12 major sections  
**Estimated Implementation**: 8 weeks  
**Team Size**: 2-3 developers (1 lead)  
**Go-Live Target**: 2 months from start

This architecture balances **production-readiness** with **clear implementation steps**. Every layer is security-hardened, audit-friendly, and scalable.
