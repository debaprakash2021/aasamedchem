"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { GET } from "@/app/api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

export async function updateInventory(formData: FormData) {
  const session = await getServerSession(GET as any);
  if (!session || (session.user as any).role !== "seller") {
    throw new Error("Unauthorized");
  }

  const productId = formData.get("productId") as string;
  const quantity = parseFloat(formData.get("quantity") as string);

  // Verify the product belongs to the seller
  const product = await prisma.product.findUnique({
    where: { id: productId, sellerId: (session.user as any).id }
  });

  if (!product) throw new Error("Product not found");

  await prisma.inventory.upsert({
    where: { productId },
    update: { quantity },
    create: { productId, quantity },
  });

  revalidatePath("/seller/inventory");
}
