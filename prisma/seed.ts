import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const sellerPassword = await bcrypt.hash("Seller@123", 10);
  const buyerPassword = await bcrypt.hash("Buyer@123", 10);

  // Users
  const admin = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@test.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  const seller = await prisma.user.upsert({
    where: { email: "seller@test.com" },
    update: {},
    create: {
      name: "Test Seller",
      email: "seller@test.com",
      password: sellerPassword,
      role: "SELLER",
    },
  });

  const buyer = await prisma.user.upsert({
    where: { email: "buyer@test.com" },
    update: {},
    create: {
      name: "Test Buyer",
      email: "buyer@test.com",
      password: buyerPassword,
      role: "BUYER",
    },
  });

  // Seller Profile
  let sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: seller.id },
  });

  if (!sellerProfile) {
    sellerProfile = await prisma.sellerProfile.create({
      data: {
        userId: seller.id,
        businessName: "AasaMedChem Official Store",
      },
    });

    // Update seller user with sellerId
    await prisma.user.update({
      where: { id: seller.id },
      data: { sellerId: sellerProfile.id },
    });
  }

  // Units
  const units = [
    { code: "kg", name: "Kilogram" },
    { code: "g", name: "Gram" },
    { code: "L", name: "Liter" },
    { code: "mL", name: "Milliliter" },
    { code: "item", name: "Item" },
  ];

  for (const u of units) {
    await prisma.unit.upsert({
      where: { code: u.code },
      update: {},
      create: u,
    });
  }

  console.log("Seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
