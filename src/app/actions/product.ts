"use server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createProduct(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "SELLER") {
    throw new Error("Unauthorized — seller only");
  }
  const sellerId = (session.user as any).sellerId as string;
  if (!sellerId) throw new Error("No seller profile found for this account");
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const baseUnitCode = formData.get("baseUnit") as string;
  const basePrice = formData.get("basePrice") as string;
  const cfStr = formData.get("conversionFactors") as string;
  if (!name || !baseUnitCode || !basePrice) {
    throw new Error("Name, base unit, and base price are required");
  }
  const conversionFactors: Record<string, number> = cfStr ? JSON.parse(cfStr) : {};
  const baseUnit = await prisma.unit.findUnique({ where: { code: baseUnitCode } });
  if (!baseUnit) throw new Error(`Unknown unit code: ${baseUnitCode}`);
  const unitCodes = Object.keys(conversionFactors);
  const units = await prisma.unit.findMany({ where: { code: { in: unitCodes } } });
  const existingCount = await prisma.product.count({ where: { sellerId } });
  const skuPrefix = sellerId.slice(0, 4).toUpperCase();
  const sku = `${skuPrefix}-${String(existingCount + 1).padStart(4, "0")}`;
  const product = await prisma.product.create({
    data: {
      name,
      description,
      sku,
      sellerId,
      baseUnitId: baseUnit.id,
      basePrice: parseFloat(basePrice).toFixed(6),
      gstRate: "5.00",
      status: "ACTIVE",
      isPublished: true,
      supportedUnits: {
        connect: units.map((u) => ({ id: u.id })),
      },
    },
  });
  for (const [code, factor] of Object.entries(conversionFactors)) {
    if (code === baseUnitCode) continue;
    const unit = units.find((u) => u.code === code);
    if (!unit || typeof factor !== "number" || isNaN(factor)) continue;
    await prisma.conversionFactor.create({
      data: {
        productId: product.id,
        fromUnitId: baseUnit.id,
        toUnitId: unit.id,
        factor: factor.toString(),
      },
    });
  }
  await prisma.inventory.create({
    data: {
      productId: product.id,
      quantity: "0",
      reorderLevel: "0",
      updatedBy: (session.user as any).id,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action: "CREATE_PRODUCT",
      resourceType: "Product",
      resourceId: product.id,
      changes: { name, baseUnitCode, basePrice, conversionFactors },
    },
  });
  revalidatePath("/seller/my-products");
  revalidatePath("/buyer/browse");
}

export async function deleteProduct(productId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "SELLER") {
    throw new Error("Unauthorized");
  }
  const sellerId = (session.user as any).sellerId as string;
  const product = await prisma.product.findFirst({
    where: { id: productId, sellerId },
  });
  if (!product) throw new Error("Product not found or you don't own it");
  await prisma.product.update({
    where: { id: productId },
    data: { status: "DISCONTINUED", isPublished: false },
  });
  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action: "DELETE_PRODUCT",
      resourceType: "Product",
      resourceId: productId,
      changes: { productId, previousStatus: product.status },
    },
  });
  revalidatePath("/seller/my-products");
  revalidatePath("/buyer/browse");
}
