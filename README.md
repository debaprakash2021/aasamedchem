# AasaMedChem | Enterprise B2B MedChem Platform

![AasaMedChem Banner](https://img.shields.io/badge/AasaMedChem-Enterprise_B2B_Platform-6366f1?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js_14-black?style=for-the-badge&logo=next.js)
![Prisma](https://img.shields.io/badge/Prisma_ORM-2D3748?style=for-the-badge&logo=prisma)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css)

A robust, full-stack B2B inventory and order management system built for the AasaMedChem Hackathon. Engineered with Next.js 14, Neon PostgreSQL, and Prisma, this platform features a dynamic unit conversion engine, real-time analytics, RBAC, and advanced administrative capabilities designed for the pharmaceutical supply chain.

## 🚀 Live Demo & Deployment
- **Repository:** [GitHub](https://github.com/debaprakash2021/aasamedchem)
- **Deployment:** Automatically deployable via Vercel.

## ✨ Core Features (Production Ready)

### 🏢 Multi-Role Architecture (RBAC)
- **Buyers**: Browse catalogs, dynamic cart calculations across units, place bulk orders, and download PDF invoices.
- **Sellers**: Manage inventory stock, create products with complex base/supported unit mapping, view interactive Sales Analytics (Recharts), and process order quotations.
- **Administrators**: God-mode dashboard. Suspend/Activate users, export global orders to CSV natively, and monitor the entire platform via a chronological Audit Trail.

### 🧪 Advanced Unit Conversion Engine
- MedChem demands precision. The custom built conversion engine dynamically maps Base Units (e.g., `kg`) to Supported Units (e.g., `g`, `mg`, `L`, `mL`).
- **Precision Mathematics**: Solves floating-point arithmetic errors by utilizing PostgreSQL's native `Decimal(19,6)` types for storing multipliers, stock, and unit prices accurately down to the microgram.

### 📊 Interactive Analytics & Dashboards
- Sellers have access to interactive Pie Charts and Line Charts built with `Recharts`, showing real-time revenue breakdowns and daily order velocity.

### 🛡️ Enterprise Security & Admin Tools
- **Global Audit Trail**: Every database action (Inventory updates, Order processing) is logged and viewable in the Admin timeline feed.
- **Account Controls**: Admins can instantly block malicious actors with the User Suspension API. Edge middleware intercepts and denies login attempts to suspended users.
- **Data Exports**: Natively generate CSV exports of global order data utilizing browser Blob tech (no backend dependency bottlenecks).
- **Print-Ready Invoices**: Buyers and Sellers can generate beautifully formatted A4 PDF Invoices instantly using custom `@media print` CSS layouts.

---

## 🔑 Test Credentials (Demo Accounts)

You can register a new account on the live platform, or use the seeded demo accounts:

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@test.com` | `Admin@123` |
| **Seller** | `seller@test.com` | `Seller@123` |
| **Buyer** | `buyer@test.com` | `Buyer@123` |

---

## 🛠 Tech Stack & High-Level Architecture
- **Frontend & Routing**: Next.js 14+ (App Router) with React Server Components.
- **Styling**: Tailwind CSS v4 featuring premium Glassmorphism aesthetics, animated mesh background gradients, and sleek typography (`Outfit` font).
- **Backend**: Next.js Server Actions and API Route Handlers.
- **Database**: Neon PostgreSQL accessed via Prisma ORM v5.
- **Authentication**: NextAuth.js (Credentials Provider) using stateless JWT sessions for ultra-fast edge performance.

### Interaction Flow
1. **Frontend** triggers Server Actions or API routes securely.
2. **Middleware** verifies the NextAuth JWT to enforce strict RBAC before fulfilling requests.
3. **Prisma Client** communicates with the **Neon PostgreSQL** database to fetch or mutate data safely using exact numeric types.

---

## 💾 Database Schema & Data Types

To prevent floating-point arithmetic errors in high-value transactions or micro-measurements, specialized PostgreSQL types are used.

- `numeric(19,6)`: Used for `Product.basePrice`, `Inventory.quantity`, `QuotationItem.orderedQuantity`, and `ConversionFactor.factor`. Handles up to 13 integer digits and 6 decimal places.
- `numeric(19,2)`: Used for `QuotationItem.lineTotal` and `Quotation.totalAmount` to store the final rounded currency amount strictly in INR.

---

## ⚖️ Unit Storage and Conversion Strategy

Handling multiple units (kg, g, L, mL, item) dynamically is the core of this system.

### 1. Internal Storage
- **Base Unit & Base Price:** When a Seller creates a product, they define its fundamental physical measure (e.g., `kg`) and price (e.g., `₹500.00 / kg`).
- **Conversion Factors:** Stored strictly in a dedicated table linking `productId`, `fromUnitId`, and `toUnitId` with a `factor` multiplier.
- **Inventory:** Always strictly stored and decremented in the **Base Unit**.

### 2. The Conversion Engine
When a Buyer orders `500 g` of a product priced at `₹1000/kg`:
1. **Lookup:** The engine fetches the factor bridging `g` -> `kg` which is `1000`.
2. **Pricing Normalization:** `basePrice (1000) / factor (1000) = ₹1.00 per gram`.
3. **Deduction Quantity:** `orderedQuantity (500) / factor (1000) = 0.5 kg` (This is deducted from inventory).
4. **Final Total:** `1.00 INR/g * 500 g = 500.00 INR`.

*This conversion happens exclusively Server-Side via APIs to prevent client-side manipulation.*

---

## ⚙️ Local Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/debaprakash2021/aasamedchem.git
   cd aasamedchem
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://<neon-user>:<neon-pass>@<neon-host>/<db>?sslmode=require"
   NEXTAUTH_SECRET="a-very-secure-random-string"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Initialize the Database**
   ```bash
   npx prisma db push
   npx ts-node prisma/seedProducts.ts
   ```

5. **Run the Development Server**
   ```bash
   npm run dev
   ```

---

## ☁️ Deploying to Vercel

1. Import the GitHub repository into your Vercel Dashboard.
2. Under **Environment Variables**, add:
   - `DATABASE_URL` (Your Neon connection string)
   - `NEXTAUTH_SECRET` (A generated 32-character secret)
   - `NEXTAUTH_URL` (Your Vercel deployment URL, e.g., `https://my-app.vercel.app`)
3. The Prisma build script (`prisma generate`) will run automatically during the build phase.
4. Click **Deploy**.
