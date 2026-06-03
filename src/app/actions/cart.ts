"use server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import UnitConversionService from "@/lib/services/UnitConversionService";

async function getOrCreateCart(userId: string) {
  let cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) cart = await prisma.cart.create({ data: { userId } });
  return cart;
}

export async function addToCart(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "BUYER") {
    throw new Error("Buyer only");
  }
  const userId = (session.user as any).id as string;
  const productId = formData.get("productId") as string;
  const unitCode = formData.get("unit") as string;
  const quantityStr = formData.get("quantity") as string;
  const quantity = parseFloat(quantityStr);
  if (isNaN(quantity) || quantity <= 0) throw new Error("Invalid quantity");
  const unit = await prisma.unit.findUnique({ where: { code: unitCode } });
  if (!unit) throw new Error(`Unit '${unitCode}' not found`);
  
  const details = await UnitConversionService.getConversionDetails(productId, quantity, unitCode);
  const cart = await getOrCreateCart(userId);
  
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    create: {
      cartId: cart.id,
      productId,
      quantity: quantity.toString(),
      unitId: unit.id,
      unitPrice: details.unitPrice.toFixed(6),
      lineTotal: details.lineTotal.toFixed(2),
    },
    update: {
      quantity: quantity.toString(),
      unitId: unit.id,
      unitPrice: details.unitPrice.toFixed(6),
      lineTotal: details.lineTotal.toFixed(2),
    },
  });
  revalidatePath("/buyer/cart");
}

export async function removeFromCart(cartItemId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "BUYER") {
    throw new Error("Buyer only");
  }
  const userId = (session.user as any).id as string;
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) throw new Error("Cart not found");
  await prisma.cartItem.deleteMany({
    where: { id: cartItemId, cartId: cart.id },
  });
  revalidatePath("/buyer/cart");
}

export async function checkoutCart() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "BUYER") {
    throw new Error("Buyer only");
  }
  const userId = (session.user as any).id as string;
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: { baseUnit: true, seller: true },
          },
        },
      },
    },
  });
  if (!cart || cart.items.length === 0) throw new Error("Cart is empty");
  
  const bySeller = new Map();
  for (const item of cart.items) {
    const sid = item.product.sellerId;
    if (!bySeller.has(sid)) bySeller.set(sid, []);
    bySeller.get(sid)!.push(item);
  }
  const quotationNumbers: string[] = [];
  
  for (const [sellerId, items] of bySeller.entries()) {
    const resolvedItems = await Promise.all(
      items.map(async (item: any) => {
        const unit = await prisma.unit.findUnique({ where: { id: item.unitId } });
        if (!unit) throw new Error(`Unit not found for cart item`);
        const details = await UnitConversionService.getConversionDetails(
          item.productId,
          parseFloat(item.quantity.toString()),
          unit.code
        );
        const inv = await UnitConversionService.checkInventory(item.productId, details.baseQuantity);
        if (!inv.canFulfill) {
          throw new Error(`Insufficient stock for "${item.product.name}"`);
        }
        return { item, details, unit };
      })
    );
    const subtotal = resolvedItems.reduce(
      (s, { details }) => s + details.lineTotal, 0
    );
    const taxTotal = resolvedItems.reduce(
      (s, { details }) => s + details.gstAmount, 0
    );
    const count = await prisma.quotation.count();
    const year = new Date().getFullYear();
    const qNumber = `QT-${year}-${String(count + quotationNumbers.length + 1).padStart(5, "0")}`;
    
    await prisma.$transaction(async (tx) => {
      await tx.quotation.create({
        data: {
          quotationNumber: qNumber,
          userId,
          sellerId,
          status: "SUBMITTED",
          submittedAt: new Date(),
          subtotal: subtotal.toFixed(2),
          taxAmount: taxTotal.toFixed(2),
          totalAmount: (subtotal + taxTotal).toFixed(2),
          items: {
            create: resolvedItems.map(({ item, details, unit }) => ({
              productId: item.productId,
              orderedQuantity: details.orderedQuantity.toFixed(6),
              orderedUnitId: unit.id,
              baseUnit: details.baseUnit,
              baseQuantity: details.baseQuantity.toFixed(6),
              unitPrice: details.unitPrice.toFixed(6),
              lineTotal: details.lineTotal.toFixed(2),
              gstApplied: details.gstAmount.toFixed(2),
            })),
          },
        },
      });
      for (const { item, details } of resolvedItems) {
        await tx.inventory.updateMany({
          where: { productId: item.productId },
          data: { quantity: { decrement: details.baseQuantity } },
        });
      }
    });
    quotationNumbers.push(qNumber);
  }
  await prisma.cartItem.deleteMany({ where: { cart: { userId } } });
  revalidatePath("/buyer/cart");
  revalidatePath("/buyer/my-orders");
  revalidatePath("/buyer/browse");
  revalidatePath("/seller/orders");
  return quotationNumbers;
}
