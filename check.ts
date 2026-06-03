import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log("Users in DB:");
  for (const u of users) {
    const isValid = await bcrypt.compare("Admin@123", u.password) || 
                    await bcrypt.compare("Seller@123", u.password) ||
                    await bcrypt.compare("Buyer@123", u.password);
    console.log(`- ${u.email} (Role: ${u.role}, Status: ${u.status}) | Password valid? ${isValid}`);
  }
}

main().finally(() => prisma.$disconnect());
