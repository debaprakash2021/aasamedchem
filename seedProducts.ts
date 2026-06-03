import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const seller = await prisma.user.findUnique({
    where: { email: "seller@test.com" },
  });

  if (!seller?.sellerId) {
    console.error("Seller not found");
    return;
  }
  
  const sellerId = seller.sellerId;

  const units = await prisma.unit.findMany();
  const getUnit = (code: string) => units.find(u => u.code === code)?.id;

  const kg = getUnit("kg");
  const g = getUnit("g");
  const L = getUnit("L");
  const mL = getUnit("mL");
  const item = getUnit("item");

  if (!kg || !g || !L || !mL || !item) {
    console.error("Units not found! Run prisma/seed.ts first.");
    return;
  }

  // Clear existing products to prevent unique constraints issues if run multiple times
  await prisma.product.deleteMany();

  // 1. Paracetamol
  await prisma.product.create({
    data: {
      name: "Paracetamol API (99% Purity)",
      description: "High quality Active Pharmaceutical Ingredient for manufacturing.",
      sku: "SELL-0001",
      sellerId: sellerId,
      baseUnitId: kg,
      basePrice: "1500.00",
      gstRate: "5.00",
      status: "ACTIVE",
      isPublished: true,
      supportedUnits: { connect: [{ id: kg }, { id: g }] },
      inventory: {
        create: { quantity: "50", reorderLevel: "10", updatedBy: seller.id }
      },
      conversionFactors: {
        create: [
          { fromUnitId: kg, toUnitId: g, factor: "1000.00" },
          { fromUnitId: g, toUnitId: kg, factor: "0.001000" }
        ]
      }
    }
  });

  // 2. Ibuprofen
  await prisma.product.create({
    data: {
      name: "Ibuprofen BP/EP",
      description: "Standard pharmaceutical grade Ibuprofen powder.",
      sku: "SELL-0002",
      sellerId: sellerId,
      baseUnitId: kg,
      basePrice: "2200.00",
      gstRate: "5.00",
      status: "ACTIVE",
      isPublished: true,
      supportedUnits: { connect: [{ id: kg }, { id: g }] },
      inventory: {
        create: { quantity: "120", reorderLevel: "20", updatedBy: seller.id }
      },
      conversionFactors: {
        create: [
          { fromUnitId: kg, toUnitId: g, factor: "1000.00" },
          { fromUnitId: g, toUnitId: kg, factor: "0.001000" }
        ]
      }
    }
  });

  // 3. Lab Beakers
  await prisma.product.create({
    data: {
      name: "Borosilicate Lab Beaker 500ml",
      description: "Heat resistant glass beaker for laboratory use.",
      sku: "SELL-0003",
      sellerId: sellerId,
      baseUnitId: item,
      basePrice: "250.00",
      gstRate: "18.00",
      status: "ACTIVE",
      isPublished: true,
      supportedUnits: { connect: [{ id: item }] },
      inventory: {
        create: { quantity: "200", reorderLevel: "50", updatedBy: seller.id }
      }
    }
  });

  // 4. Isopropyl Alcohol
  await prisma.product.create({
    data: {
      name: "Isopropyl Alcohol (IPA) 99.9%",
      description: "Industrial grade solvent and cleaning agent.",
      sku: "SELL-0004",
      sellerId: sellerId,
      baseUnitId: L,
      basePrice: "350.00",
      gstRate: "18.00",
      status: "ACTIVE",
      isPublished: true,
      supportedUnits: { connect: [{ id: L }, { id: mL }] },
      inventory: {
        create: { quantity: "500", reorderLevel: "100", updatedBy: seller.id }
      },
      conversionFactors: {
        create: [
          { fromUnitId: L, toUnitId: mL, factor: "1000.00" },
          { fromUnitId: mL, toUnitId: L, factor: "0.001000" }
        ]
      }
    }
  });

  console.log("Successfully seeded demo products!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
