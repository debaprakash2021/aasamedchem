# AasaMedChem Inventory & Order Management System

A robust, full-stack inventory and order management system built with Next.js 14, Neon PostgreSQL, and Prisma. This project features high-precision unit conversions, role-based access control (RBAC), and a dynamic pricing engine designed specifically for the AasaMedChem Hackathon Assignment.

## 🚀 Live Demo & Deployment
- **Repository:** [GitHub](https://github.com/debaprakash2021/aasamedchem)
- **Deployment:** Automatically deployable via Vercel.

## 🔑 Test Credentials (Demo Accounts)
The database is seeded with three testing accounts.
- **Admin**: `admin@test.com` | Password: `Admin@123`
- **Seller**: `seller@test.com` | Password: `Seller@123`
- **Buyer**: `buyer@test.com` | Password: `Buyer@123`

---

## 🛠 Tech Stack & High-Level Architecture
- **Frontend & Routing**: Next.js 14+ (App Router) with React Server Components.
- **Styling**: Tailwind CSS v4 featuring premium Glassmorphism aesthetics and modern typography.
- **Backend**: Next.js Server Actions and API Route Handlers.
- **Database**: Neon PostgreSQL accessed via Prisma ORM v5.
- **Authentication**: NextAuth.js (Credentials Provider) using stateless JWT sessions for ultra-fast edge performance.

### Interaction Flow
1. **Frontend** triggers Server Actions or API routes securely.
2. **Middleware** verifies the NextAuth JWT to enforce strict RBAC before fulfilling requests.
3. **Prisma Client** communicates with the **Neon PostgreSQL** database to fetch or mutate data safely using exact numeric types.

---

## 💾 Database Schema & Data Types

To prevent floating-point arithmetic errors in high-value transactions or micro-measurements (e.g., milligrams), specialized PostgreSQL types are used.

- `numeric(19,6)`: Used for `Product.basePrice`, `Inventory.quantity`, `OrderItem.orderedQuantity`, and `OrderItem.unitPrice`. Handles up to 13 integer digits and 6 decimal places.
- `numeric(19,2)`: Used for `OrderItem.lineTotal` and `Order.totalAmount` to store the final rounded currency amount strictly in INR.
- `JSONB`: Used for `Product.conversionFactors` to allow deeply dynamic multi-unit mappings natively in PostgreSQL.

---

## ⚖️ Unit Storage and Conversion Strategy

Handling multiple units (kg, g, L, mL, item) dynamically is the core of this system.

### 1. Internal Storage
- **Base Unit & Base Price:** When a Seller creates a product, they define its fundamental physical measure (e.g., `kg`) and price (e.g., `₹500.00 / kg`).
- **Conversion Factors (JSONB):** Sellers map supported units via multipliers relative to the base unit.
  *Example:* Base = `kg`. Supported = `g`. The factor saved is `{ "kg": 1, "g": 0.001 }`.
- **Inventory:** Always strictly stored and decremented in the **Base Unit**.

### 2. The Conversion Engine
When a Buyer orders `500 g`:
1. **Lookup:** The engine fetches `conversionFactors['g']` which is `0.001`.
2. **Deduction Quantity:** `orderedQuantity (500) * multiplier (0.001) = 0.5 kg` (This is deducted from inventory).
3. **Pricing:** `basePrice (500) * multiplier (0.001) = 0.5 INR / g`.
4. **Final Total:** `0.5 * 500 = 250.00 INR`.

*This conversion happens exclusively Server-Side via Server Actions/APIs to prevent client-side manipulation.*

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
   npx ts-node prisma/seed.ts
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
