"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { GET } from "@/app/api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

export async function createProduct(formData: FormData) {
  const session = await getServerSession(GET as any);
  if (!session || (session.user as any).role !== "seller") {
    throw new Error("Unauthorized");
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const baseUnit = formData.get("baseUnit") as string;
  const basePrice = parseFloat(formData.get("basePrice") as string);
  
  // Parse conversion factors from JSON string
  const conversionFactorsStr = formData.get("conversionFactors") as string;
  let conversionFactors = {};
  try {
    conversionFactors = JSON.parse(conversionFactorsStr);
  } catch (e) {
    conversionFactors = { [baseUnit]: 1 };
  }

  await prisma.product.create({
    data: {
      sellerId: (session.user as any).id,
      name,
      description,
      baseUnit: baseUnit as any,
      basePrice,
      conversionFactors,
    }
  });

  revalidatePath("/seller/my-products");
}
