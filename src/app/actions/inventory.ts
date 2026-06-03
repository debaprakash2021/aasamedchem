"use server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateInventory(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "SELLER") {
    throw new Error("Unauthorized — seller only");
  }
  const sellerId = (session.user as any).sellerId as string;
  const productId = formData.get("productId") as string;
  const quantityStr = formData.get("quantity") as string;
  if (!productId || !quantityStr) throw new Error("productId and quantity are required");
  const quantity = parseFloat(quantityStr);
  if (isNaN(quantity) || quantity < 0) {
    throw new Error("Quantity must be a non-negative number");
  }
  const product = await prisma.product.findFirst({
    where: { id: productId, sellerId },
    include: { baseUnit: true },
  });
  if (!product) throw new Error("Product not found or you don't own it");
  const previousInventory = await prisma.inventory.findUnique({ where: { productId } });
  await prisma.inventory.upsert({
    where: { productId },
    create: {
      productId,
      quantity: quantity.toString(),
      reorderLevel: "0",
      updatedBy: (session.user as any).id,
    },
    update: {
      quantity: quantity.toString(),
      updatedBy: (session.user as any).id,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action: "UPDATE_INVENTORY",
      resourceType: "Inventory",
      resourceId: productId,
      changes: {
        productName: product.name,
        baseUnit: product.baseUnit.code,
        before: previousInventory?.quantity?.toString() ?? "0",
        after: quantity.toString(),
      },
    },
  });
  revalidatePath("/seller/inventory");
  revalidatePath("/buyer/browse");
}
