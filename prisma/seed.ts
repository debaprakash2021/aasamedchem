import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log("🌱 Starting database seed...");

  // ============ UNIT SYSTEM SETUP ============
  console.log("📏 Setting up unit system...");

  // Create unit categories
  const weightCategory = await prisma.unitCategory.create({
    data: {
      name: "weight",
      dimension: "mass",
    },
  });

  const volumeCategory = await prisma.unitCategory.create({
    data: {
      name: "volume",
      dimension: "length",
    },
  });

  const countCategory = await prisma.unitCategory.create({
    data: {
      name: "count",
      dimension: "discrete",
    },
  });

  // Create weight units
  const gramUnit = await prisma.unit.create({
    data: {
      code: "g",
      name: "gram",
      symbol: "g",
      categoryId: weightCategory.id,
      baseMultiplier: "1",
      isAtomic: true,
      isActive: true,
    },
  });

  const kgUnit = await prisma.unit.create({
    data: {
      code: "kg",
      name: "kilogram",
      symbol: "kg",
      categoryId: weightCategory.id,
      baseMultiplier: "1000", // 1 kg = 1000 g
      isAtomic: false,
      isActive: true,
    },
  });

  // Create volume units
  const mlUnit = await prisma.unit.create({
    data: {
      code: "mL",
      name: "milliliter",
      symbol: "mL",
      categoryId: volumeCategory.id,
      baseMultiplier: "1",
      isAtomic: true,
      isActive: true,
    },
  });

  const lUnit = await prisma.unit.create({
    data: {
      code: "L",
      name: "liter",
      symbol: "L",
      categoryId: volumeCategory.id,
      baseMultiplier: "1000", // 1 L = 1000 mL
      isAtomic: false,
      isActive: true,
    },
  });

  // Create count unit
  const itemUnit = await prisma.unit.create({
    data: {
      code: "item",
      name: "item",
      symbol: "unit",
      categoryId: countCategory.id,
      baseMultiplier: "1",
      isAtomic: true,
      isActive: true,
    },
  });

  console.log("✅ Unit system created!");

  // ============ TEST USERS SETUP ============
  console.log("👤 Creating test users...");

  // Admin user
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: await hashPassword("Admin@123"),
      role: "ADMIN",
      name: "Admin User",
      status: "ACTIVE",
    },
  });

  // Seller user
  const sellerUserData = await prisma.user.create({
    data: {
      email: "seller@example.com",
      password: await hashPassword("Seller@123"),
      role: "SELLER",
      name: "John Seller",
      status: "ACTIVE",
    },
  });

  // Create seller profile
  const seller = await prisma.seller.create({
    data: {
      userId: sellerUserData.id,
      businessName: "Organic Grains Co.",
      registrationNumber: "REG123456",
      taxId: "TAX789",
      businessAddress: "123 Market Street, Delhi",
      businessPhone: "+91-9876543210",
      status: "APPROVED",
    },
  });

  // Buyer user
  const buyerUser = await prisma.user.create({
    data: {
      email: "buyer@example.com",
      password: await hashPassword("Buyer@123"),
      role: "BUYER",
      name: "Jane Buyer",
      status: "ACTIVE",
    },
  });

  console.log("✅ Test users created!");

  // ============ SAMPLE PRODUCTS WITH UNITS ============
  console.log("🛍️  Creating sample products...");

  // Product 1: Wheat Flour (weight-based, kg base unit)
  const wheatFlour = await prisma.product.create({
    data: {
      name: "Wheat Flour",
      sku: "WF-001",
      description: "Premium whole wheat flour",
      sellerId: seller.id,
      baseUnitId: kgUnit.id,
      basePrice: "40.00",
      hsnCode: "1101",
      gstRate: "5",
      status: "ACTIVE",
      isPublished: true,
      supportedUnits: {
        connect: [{ id: gramUnit.id }, { id: kgUnit.id }],
      },
    },
  });

  // Create conversion factors for Wheat Flour
  await prisma.conversionFactor.create({
    data: {
      productId: wheatFlour.id,
      fromUnitId: kgUnit.id,
      toUnitId: gramUnit.id,
      factor: "0.001", // 1 kg = 0.001 kg per gram
    },
  });

  await prisma.conversionFactor.create({
    data: {
      productId: wheatFlour.id,
      fromUnitId: gramUnit.id,
      toUnitId: kgUnit.id,
      factor: "1000", // 1 g = 1000 g per kg
    },
  });

  // Create inventory for Wheat Flour (10 kg)
  await prisma.inventory.create({
    data: {
      productId: wheatFlour.id,
      quantity: "10", // 10 kg in base unit
      reorderLevel: "2",
    },
  });

  // Product 2: Olive Oil (volume-based, L base unit)
  const oliveOil = await prisma.product.create({
    data: {
      name: "Extra Virgin Olive Oil",
      sku: "OO-001",
      description: "Cold-pressed extra virgin olive oil",
      sellerId: seller.id,
      baseUnitId: lUnit.id,
      basePrice: "500.00", // ₹500 per liter
      hsnCode: "1509",
      gstRate: "5",
      status: "ACTIVE",
      isPublished: true,
      supportedUnits: {
        connect: [{ id: mlUnit.id }, { id: lUnit.id }],
      },
    },
  });

  // Create conversion factors for Olive Oil
  await prisma.conversionFactor.create({
    data: {
      productId: oliveOil.id,
      fromUnitId: lUnit.id,
      toUnitId: mlUnit.id,
      factor: "0.001", // 1 L = 0.001 L per mL
    },
  });

  await prisma.conversionFactor.create({
    data: {
      productId: oliveOil.id,
      fromUnitId: mlUnit.id,
      toUnitId: lUnit.id,
      factor: "1000", // 1 mL = 1000 mL per L
    },
  });

  // Create inventory for Olive Oil (5 liters)
  await prisma.inventory.create({
    data: {
      productId: oliveOil.id,
      quantity: "5", // 5 L in base unit
      reorderLevel: "1",
    },
  });

  // Product 3: Test Tubes (count-based, item base unit)
  const testTubes = await prisma.product.create({
    data: {
      name: "Laboratory Test Tubes",
      sku: "TT-001",
      description: "Standard lab test tubes (15 mL)",
      sellerId: seller.id,
      baseUnitId: itemUnit.id,
      basePrice: "5.00", // ₹5 per item
      hsnCode: "7017",
      gstRate: "5",
      status: "ACTIVE",
      isPublished: true,
      supportedUnits: {
        connect: [{ id: itemUnit.id }],
      },
    },
  });

  // Create inventory for Test Tubes (100 items)
  await prisma.inventory.create({
    data: {
      productId: testTubes.id,
      quantity: "100", // 100 items
      reorderLevel: "20",
    },
  });

  console.log("✅ Sample products created!");

  // ============ CREATE CARTS & WISHLIST ============
  console.log("🛒 Creating cart & wishlist...");

  await prisma.cart.create({
    data: {
      userId: buyerUser.id,
    },
  });

  await prisma.wishlist.create({
    data: {
      userId: buyerUser.id,
    },
  });

  console.log("✅ Cart & wishlist created!");

  // ============ SUMMARY ============
  console.log("\n✨ Database seeding complete!");
  console.log("\n📋 Test Credentials:");
  console.log("─".repeat(50));
  console.log("ADMIN:");
  console.log("  Email: admin@example.com");
  console.log("  Password: Admin@123");
  console.log("─".repeat(50));
  console.log("SELLER:");
  console.log("  Email: seller@example.com");
  console.log("  Password: Seller@123");
  console.log("─".repeat(50));
  console.log("BUYER:");
  console.log("  Email: buyer@example.com");
  console.log("  Password: Buyer@123");
  console.log("─".repeat(50));
  console.log("\n🏭 Sample Products:");
  console.log(`  1. ${wheatFlour.name} (₹${wheatFlour.basePrice}/kg)`);
  console.log(`  2. ${oliveOil.name} (₹${oliveOil.basePrice}/L)`);
  console.log(`  3. ${testTubes.name} (₹${testTubes.basePrice}/item)`);
  console.log("\n✅ Ready to test!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
