"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { GET } from "@/app/api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

export async function placeOrder(formData: FormData) {
  const session = await getServerSession(GET as any);
  if (!session || (session.user as any).role !== "buyer") {
    throw new Error("Unauthorized");
  }

  const productId = formData.get("productId") as string;
  const orderedUnit = formData.get("orderedUnit") as string;
  const orderedQuantity = parseFloat(formData.get("orderedQuantity") as string);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { inventory: true }
  });

  if (!product) throw new Error("Product not found");

  const conversionFactors = product.conversionFactors as Record<string, number>;
  if (!(orderedUnit in conversionFactors)) throw new Error("Unsupported unit");

  const multiplier = conversionFactors[orderedUnit];
  const baseQty = orderedQuantity * multiplier;

  // Check inventory
  const currentStock = product.inventory ? parseFloat(product.inventory.quantity.toString()) : 0;
  if (baseQty > currentStock) {
    throw new Error("Insufficient inventory for this order. Only " + (currentStock / multiplier).toFixed(2) + " " + orderedUnit + " available.");
  }

  // Calculate pricing
  const basePrice = parseFloat(product.basePrice.toString());
  const unitPrice = basePrice * multiplier;
  const lineTotal = Math.round((orderedQuantity * unitPrice) * 100) / 100;

  // Create Order in transaction
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        buyerId: (session.user as any).id,
        totalAmount: lineTotal,
        status: "confirmed",
        items: {
          create: {
            productId,
            orderedUnit: orderedUnit as any,
            orderedQuantity,
            unitPrice,
            lineTotal
          }
        }
      }
    });

    if (product.inventory) {
      await tx.inventory.update({
        where: { id: product.inventory.id },
        data: { quantity: currentStock - baseQty }
      });
    }
  });

  revalidatePath("/buyer/browse");
  revalidatePath("/buyer/my-orders");
}
