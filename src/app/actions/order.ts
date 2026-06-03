"use server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import UnitConversionService from "@/lib/services/UnitConversionService";

export async function placeOrder(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "BUYER") {
    throw new Error("Unauthorized — buyer only");
  }
  const userId = (session.user as any).id as string;
  const productId = formData.get("productId") as string;
  const orderedUnit = formData.get("orderedUnit") as string;
  const orderedQtyStr = formData.get("orderedQuantity") as string;
  if (!productId || !orderedUnit || !orderedQtyStr) {
    throw new Error("Missing required fields: productId, orderedUnit, orderedQuantity");
  }
  const orderedQuantity = parseFloat(orderedQtyStr);
  if (isNaN(orderedQuantity) || orderedQuantity <= 0) {
    throw new Error("Quantity must be a positive number");
  }
  
  const details = await UnitConversionService.getConversionDetails(
    productId,
    orderedQuantity,
    orderedUnit
  );
  
  const invCheck = await UnitConversionService.checkInventory(productId, details.baseQuantity);
  if (!invCheck.canFulfill) {
    throw new Error(
      `Insufficient stock. Available: ${invCheck.available.toFixed(4)} ${details.baseUnit}, Required: ${invCheck.required.toFixed(4)} ${details.baseUnit}`
    );
  }
  
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { sellerId: true, name: true },
  });
  if (!product) throw new Error("Product not found");
  const orderedUnitRecord = await prisma.unit.findUnique({ where: { code: orderedUnit } });
  if (!orderedUnitRecord) throw new Error(`Unit '${orderedUnit}' not found in database`);
  
  const count = await prisma.quotation.count();
  const year = new Date().getFullYear();
  const quotationNumber = `QT-${year}-${String(count + 1).padStart(5, "0")}`;
  
  const quotation = await prisma.$transaction(async (tx) => {
    const quot = await tx.quotation.create({
      data: {
        quotationNumber,
        userId,
        sellerId: product.sellerId,
        status: "SUBMITTED",
        submittedAt: new Date(),
        subtotal: details.lineTotal.toFixed(2),
        taxAmount: details.gstAmount.toFixed(2),
        totalAmount: details.finalTotal.toFixed(2),
        items: {
          create: [
            {
              productId,
              orderedQuantity: details.orderedQuantity.toFixed(6),
              orderedUnitId: orderedUnitRecord.id,
              baseUnit: details.baseUnit,
              baseQuantity: details.baseQuantity.toFixed(6),
              unitPrice: details.unitPrice.toFixed(6),
              lineTotal: details.lineTotal.toFixed(2),
              gstApplied: details.gstAmount.toFixed(2),
            },
          ],
        },
      },
      include: { items: true }
    });
    
    await tx.inventory.updateMany({
      where: { productId },
      data: { quantity: { decrement: details.baseQuantity } },
    });
    return quot;
  });
  
  await prisma.conversionLog.create({
    data: {
      quotationItemId: quotation.items[0].id,
      orderedQuantity: details.orderedQuantity.toFixed(6),
      orderedUnit,
      conversionFactor: details.conversionFactor.toFixed(6),
      baseQuantity: details.baseQuantity.toFixed(6),
      baseUnit: details.baseUnit,
      unitPrice: details.unitPrice.toFixed(6),
      lineTotal: details.lineTotal.toFixed(2),
    },
  });
  
  await prisma.auditLog.create({
    data: {
      userId,
      action: "PLACE_ORDER",
      resourceType: "Quotation",
      resourceId: quotation.id,
      changes: {
        productName: product.name,
        orderedQuantity,
        orderedUnit,
        baseQuantity: details.baseQuantity.toFixed(6),
        baseUnit: details.baseUnit,
        conversionFactor: details.conversionFactor.toString(),
        unitPrice: details.unitPrice.toFixed(6),
        lineTotal: details.lineTotal.toFixed(2),
        gstAmount: details.gstAmount.toFixed(2),
        totalAmount: details.finalTotal.toFixed(2),
      },
    },
  });
  revalidatePath("/buyer/my-orders");
  revalidatePath("/buyer/browse");
  revalidatePath("/seller/orders");
  revalidatePath("/admin/orders");
  revalidatePath("/seller/inventory");
  return {
    quotationNumber,
    totalAmount: details.finalTotal.toFixed(2),
  };
}

export async function updateQuotationStatus(quotationId: string, newStatus: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Not authenticated");
  const role = (session.user as any).role as string;
  if (role !== "SELLER" && role !== "ADMIN") {
    throw new Error("Only sellers or admins can update quotation status");
  }
  const quotation = await prisma.quotation.findUnique({ where: { id: quotationId } });
  if (!quotation) throw new Error("Quotation not found");
  if (role === "SELLER") {
    const sellerId = (session.user as any).sellerId;
    if (quotation.sellerId !== sellerId) {
      throw new Error("You can only update your own quotations");
    }
  }
  const validTransitions: Record<string, string[]> = {
    SUBMITTED: ["REVIEWED", "REJECTED"],
    REVIEWED:  ["APPROVED", "REJECTED"],
    APPROVED:  ["PAID"],
    PAID:      ["COMPLETED"],
  };
  const allowed = validTransitions[quotation.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot transition from ${quotation.status} → ${newStatus}`);
  }
  const updateData: any = { status: newStatus };
  if (newStatus === "APPROVED") updateData.approvedAt = new Date();
  if (newStatus === "COMPLETED") updateData.completedAt = new Date();
  await prisma.quotation.update({
    where: { id: quotationId },
    data: updateData,
  });
  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action: "UPDATE_QUOTATION_STATUS",
      resourceType: "Quotation",
      resourceId: quotationId,
      changes: { from: quotation.status, to: newStatus },
    },
  });
  revalidatePath("/seller/orders");
  revalidatePath("/admin/orders");
  revalidatePath("/buyer/my-orders");
}
