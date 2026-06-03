import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const sellerPassword = await bcrypt.hash("Seller@123", 10);
  const buyerPassword = await bcrypt.hash("Buyer@123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      email: "admin@test.com",
      name: "Admin User",
      password: adminPassword,
      role: "admin",
    },
  });

  const seller = await prisma.user.upsert({
    where: { email: "seller@test.com" },
    update: {},
    create: {
      email: "seller@test.com",
      name: "Seller User",
      password: sellerPassword,
      role: "seller",
    },
  });

  const buyer = await prisma.user.upsert({
    where: { email: "buyer@test.com" },
    update: {},
    create: {
      email: "buyer@test.com",
      name: "Buyer User",
      password: buyerPassword,
      role: "buyer",
    },
  });

  console.log({ admin, seller, buyer });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
